import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase-server';
import { generateContractPdf } from '@/lib/generate-contract-pdf';
import type { Contract, Property, Owner, CompanySettings } from '@/types';

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
    const { contract_id } = await request.json();
    if (!contract_id) {
      return NextResponse.json({ error: 'contract_id requis' }, { status: 400 });
    }

    // 3. Fetch data
    const serviceClient = createServiceClient();

    const [contractRes, companyRes] = await Promise.all([
      serviceClient.from('contracts').select('*').eq('id', contract_id).single(),
      serviceClient.from('company_settings').select('*').limit(1).single(),
    ]);

    if (!contractRes.data) {
      return NextResponse.json({ error: 'Contrat introuvable' }, { status: 404 });
    }
    if (!companyRes.data) {
      return NextResponse.json({ error: 'Paramètres entreprise non configurés' }, { status: 400 });
    }

    const contract = contractRes.data as Contract;
    const company = companyRes.data as CompanySettings;

    const [propertyRes, ownerRes] = await Promise.all([
      serviceClient.from('properties').select('*').eq('id', contract.property_id).single(),
      serviceClient.from('owners').select('*').eq('id', contract.owner_id).single(),
    ]);

    if (!propertyRes.data) {
      return NextResponse.json({ error: 'Propriété introuvable' }, { status: 404 });
    }
    if (!ownerRes.data) {
      return NextResponse.json({ error: 'Propriétaire introuvable' }, { status: 404 });
    }

    // 4. Generate PDF
    const pdfBuffer = generateContractPdf({
      contract,
      property: propertyRes.data as Property,
      owner: ownerRes.data as Owner,
      company,
    });

    // 5. Return PDF
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="contrat-${contract_id.slice(0, 8)}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Contract PDF generation error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
