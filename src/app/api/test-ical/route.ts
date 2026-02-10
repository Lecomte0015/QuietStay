import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { testIcalConnection } from '@/lib/ical-parser';

export const runtime = 'nodejs';

// POST /api/test-ical — test an iCal URL validity
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ valid: false, message: 'Non autorisé' }, { status: 401 });
  }

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await anonClient.auth.getUser(token);

  if (error || !user) {
    return NextResponse.json({ valid: false, message: 'Token invalide' }, { status: 401 });
  }

  const body = await request.json();
  const { ical_url } = body;

  if (!ical_url || typeof ical_url !== 'string') {
    return NextResponse.json({ valid: false, message: 'URL requise' }, { status: 400 });
  }

  try {
    new URL(ical_url);
  } catch {
    return NextResponse.json({ valid: false, message: 'URL invalide' }, { status: 400 });
  }

  const result = await testIcalConnection(ical_url);
  return NextResponse.json(result);
}
