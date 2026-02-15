import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase-server';
import { generateInvoicePdf } from '@/lib/generate-invoice-pdf';
import nodemailer from 'nodemailer';
import type { Invoice, Owner, CompanySettings } from '@/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 401 });
    }

    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ success: false, message: 'Token invalide' }, { status: 401 });
    }

    // 2. Validate SMTP config
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
      return NextResponse.json({
        success: false,
        message: 'Configuration SMTP manquante. Définir SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM dans les variables d\'environnement.',
      }, { status: 500 });
    }

    // 3. Parse body
    const { invoice_id } = await request.json();
    if (!invoice_id) {
      return NextResponse.json({ success: false, message: 'invoice_id requis' }, { status: 400 });
    }

    // 4. Fetch data
    const serviceClient = createServiceClient();

    const [invoiceRes, companyRes] = await Promise.all([
      serviceClient.from('invoices').select('*').eq('id', invoice_id).single(),
      serviceClient.from('company_settings').select('*').limit(1).single(),
    ]);

    if (!invoiceRes.data) {
      return NextResponse.json({ success: false, message: 'Facture introuvable' }, { status: 404 });
    }
    if (!companyRes.data) {
      return NextResponse.json({ success: false, message: 'Paramètres entreprise non configurés' }, { status: 400 });
    }

    const invoice = invoiceRes.data as Invoice;
    const company = companyRes.data as CompanySettings;

    const { data: owner } = await serviceClient
      .from('owners')
      .select('*')
      .eq('id', invoice.owner_id)
      .single();
    if (!owner) {
      return NextResponse.json({ success: false, message: 'Propriétaire introuvable' }, { status: 404 });
    }
    if (!owner.email) {
      return NextResponse.json({ success: false, message: 'Propriétaire sans adresse email' }, { status: 400 });
    }

    // 5. Owner address from first property
    const { data: firstProperty } = await serviceClient
      .from('properties')
      .select('address, postal_code, city')
      .eq('owner_id', owner.id)
      .limit(1)
      .single();

    const ownerAddress = firstProperty
      ? `${firstProperty.address}, ${firstProperty.postal_code} ${firstProperty.city}`
      : undefined;

    // 6. Generate PDF
    const pdfBuffer = await generateInvoicePdf({
      invoice,
      owner: owner as Owner,
      company,
      ownerAddress,
    });

    // 7. Build invoice metadata
    const invoiceNumber = `QS-${invoice.period_start.slice(0, 4)}${invoice.period_start.slice(5, 7)}-${invoice.id.slice(0, 6).toUpperCase()}`;
    const periodStart = new Date(invoice.period_start).toLocaleDateString('fr-CH');
    const periodEnd = new Date(invoice.period_end).toLocaleDateString('fr-CH');

    const fmtCHF = (n: number) =>
      new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(n);

    // 8. Send email
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT, 10),
      secure: parseInt(SMTP_PORT, 10) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    await transporter.sendMail({
      from: SMTP_FROM,
      to: owner.email,
      subject: `${company.name || 'QuietStay'} – Facture ${invoiceNumber} (${periodStart} – ${periodEnd})`,
      html: `
        <div style="font-family: -apple-system, sans-serif; color: #1c1917; max-width: 600px;">
          <p>Bonjour ${owner.name},</p>
          <p>Veuillez trouver ci-joint votre facture pour la période du <strong>${periodStart}</strong> au <strong>${periodEnd}</strong>.</p>
          <table style="margin: 16px 0; border-collapse: collapse; width: 100%;">
            <tr><td style="padding: 6px 12px 6px 0; color: #78716c;">Revenu brut</td><td style="text-align: right;">${fmtCHF(invoice.total_revenue)}</td></tr>
            <tr><td style="padding: 6px 12px 6px 0; color: #78716c;">Commission</td><td style="text-align: right; color: #dc2626;">- ${fmtCHF(invoice.commission_amount)}</td></tr>
            <tr><td style="padding: 6px 12px 6px 0; color: #78716c;">Frais de ménage</td><td style="text-align: right; color: #dc2626;">- ${fmtCHF(invoice.cleaning_costs)}</td></tr>
            <tr style="font-weight: bold; border-top: 2px solid #e7e5e4;">
              <td style="padding: 10px 12px 6px 0;">Net à verser</td>
              <td style="text-align: right; padding-top: 10px;">${fmtCHF(invoice.net_amount)}</td>
            </tr>
          </table>
          <p style="color: #78716c; font-size: 13px;">Cordialement,<br>${company.name || 'QuietStay'}</p>
        </div>
      `,
      attachments: [{
        filename: `facture-${invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    });

    // 9. Update invoice status to "sent"
    await serviceClient
      .from('invoices')
      .update({ status: 'sent' })
      .eq('id', invoice_id);

    return NextResponse.json({
      success: true,
      message: `Facture envoyée à ${owner.email}`,
    });
  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Erreur serveur',
    }, { status: 500 });
  }
}
