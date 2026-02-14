import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase-server';
import { generateInvoicePdf } from '@/lib/generate-invoice-pdf';
import type { Invoice, Owner, CompanySettings } from '@/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // 2. Parse body
    const { invoice_id } = await request.json();
    if (!invoice_id) {
      return NextResponse.json({ error: 'invoice_id requis' }, { status: 400 });
    }

    // 3. Fetch data
    const serviceClient = createServiceClient();

    const [invoiceRes, companyRes] = await Promise.all([
      serviceClient.from('invoices').select('*').eq('id', invoice_id).single(),
      serviceClient.from('company_settings').select('*').limit(1).single(),
    ]);

    if (!invoiceRes.data) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
    }
    if (!companyRes.data) {
      return NextResponse.json({ error: 'Paramètres entreprise non configurés. Allez dans Paramètres.' }, { status: 400 });
    }

    const invoice = invoiceRes.data as Invoice;
    const company = companyRes.data as CompanySettings;

    const { data: owner } = await serviceClient
      .from('owners')
      .select('*')
      .eq('id', invoice.owner_id)
      .single();
    if (!owner) {
      return NextResponse.json({ error: 'Propriétaire introuvable' }, { status: 404 });
    }

    // 4. Get owner address from first property (optional)
    const { data: firstProperty } = await serviceClient
      .from('properties')
      .select('address, postal_code, city')
      .eq('owner_id', owner.id)
      .limit(1)
      .single();

    const ownerAddress = firstProperty
      ? `${firstProperty.address}, ${firstProperty.postal_code} ${firstProperty.city}`
      : undefined;

    // 5. Generate PDF
    const pdfBuffer = generateInvoicePdf({
      invoice,
      owner: owner as Owner,
      company,
      ownerAddress,
    });

    // 6. Return PDF
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="facture-${invoice_id.slice(0, 8)}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
