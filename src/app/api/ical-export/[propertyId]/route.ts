import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { generateICalFeed } from '@/lib/ical-generator';
import type { Booking } from '@/types';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  try {
    const { propertyId } = params;
    const serviceClient = createServiceClient();

    // Fetch property name
    const { data: property } = await serviceClient
      .from('properties')
      .select('name')
      .eq('id', propertyId)
      .single();

    if (!property) {
      return new NextResponse('Property not found', { status: 404 });
    }

    // Fetch confirmed bookings for this property
    const { data: bookings } = await serviceClient
      .from('bookings')
      .select('*')
      .eq('property_id', propertyId)
      .in('status', ['confirmed', 'checked_in', 'pending'])
      .order('check_in', { ascending: true });

    const icalContent = generateICalFeed(
      property.name,
      (bookings || []) as Booking[]
    );

    return new NextResponse(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${property.name.replace(/[^a-zA-Z0-9]/g, '_')}.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('iCal export error:', error);
    return new NextResponse('Server error', { status: 500 });
  }
}
