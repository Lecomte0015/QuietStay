import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase-server';

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
    const body = await request.json();
    const {
      booking_id,
      property_id,
      owner_id,
      guest_name,
      guest_email,
      guest_phone,
      guest_address,
      check_in,
      check_out,
      total_amount,
      deposit_amount,
      notes,
    } = body;

    if (!booking_id || !property_id || !owner_id || !guest_name || !check_in || !check_out) {
      return NextResponse.json(
        { error: 'Champs requis manquants (booking_id, property_id, owner_id, guest_name, check_in, check_out)' },
        { status: 400 }
      );
    }

    // 3. Insert via service client (bypasses RLS)
    const serviceClient = createServiceClient();

    const { data, error } = await serviceClient
      .from('contracts')
      .insert({
        booking_id,
        property_id,
        owner_id,
        guest_name,
        guest_email: guest_email || null,
        guest_phone: guest_phone || null,
        guest_address: guest_address || null,
        check_in,
        check_out,
        total_amount: total_amount || 0,
        deposit_amount: deposit_amount || 0,
        notes: notes || null,
        status: 'draft',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Contract creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) {
    console.error('Contract create error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
