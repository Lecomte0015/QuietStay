import ical, { VEvent } from 'node-ical';
import type { Platform } from '@/types';

export interface ParsedBookingEvent {
  ical_uid: string;
  check_in: string;   // YYYY-MM-DD
  check_out: string;  // YYYY-MM-DD
  guest_name: string;
  summary: string;
  is_cancelled: boolean;
  platform: Platform;
}

/**
 * Fetch and parse an iCal URL, returning structured booking events.
 */
export async function fetchAndParseIcal(
  url: string,
  platform: 'airbnb' | 'booking'
): Promise<ParsedBookingEvent[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let response: Response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'QuietStay-Ops/1.0' },
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const icsText = await response.text();

  if (!icsText.includes('BEGIN:VCALENDAR')) {
    throw new Error('Format iCal invalide : pas de VCALENDAR');
  }

  const parsed = ical.parseICS(icsText);
  const events: ParsedBookingEvent[] = [];

  for (const [key, component] of Object.entries(parsed)) {
    if (!component || component.type !== 'VEVENT') continue;

    const vevent = component as VEvent;
    const startDate = vevent.start;
    const endDate = vevent.end;

    if (!startDate || !endDate) continue;

    const checkIn = formatDateToISO(startDate);
    const checkOut = formatDateToISO(endDate);

    if (checkIn >= checkOut) continue;

    const rawSummary = vevent.summary;
    const summary = (typeof rawSummary === 'string' ? rawSummary : rawSummary?.val || '').trim();
    const guestName = extractGuestName(summary, platform);
    const isCancelled = detectCancellation(vevent);

    events.push({
      ical_uid: vevent.uid || key,
      check_in: checkIn,
      check_out: checkOut,
      guest_name: guestName,
      summary,
      is_cancelled: isCancelled,
      platform,
    });
  }

  return events;
}

function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function extractGuestName(summary: string, platform: 'airbnb' | 'booking'): string {
  if (platform === 'airbnb') {
    if (summary === 'Reserved' || summary === 'Airbnb (Not available)' || !summary) {
      return 'Voyageur Airbnb';
    }
    return summary.replace(/ - Reserved$/i, '').trim() || 'Voyageur Airbnb';
  }

  if (platform === 'booking') {
    const match = summary.match(/^CLOSED\s*-\s*(.+)$/i);
    if (match) {
      const name = match[1].trim();
      if (name === 'Not available' || name === '') {
        return 'Voyageur Booking.com';
      }
      return name;
    }
    return summary || 'Voyageur Booking.com';
  }

  return summary || 'Voyageur inconnu';
}

function detectCancellation(vevent: VEvent): boolean {
  const status = (vevent as Record<string, unknown>).status;
  if (typeof status === 'string' && status.toUpperCase() === 'CANCELLED') {
    return true;
  }

  const rawSummary = vevent.summary;
  const summary = (typeof rawSummary === 'string' ? rawSummary : rawSummary?.val || '').toLowerCase();
  if (summary.includes('cancelled') || summary.includes('annulé')) {
    return true;
  }

  return false;
}

/**
 * Lightweight test: fetch and validate without full parsing.
 */
export async function testIcalConnection(url: string): Promise<{
  valid: boolean;
  eventCount: number;
  message: string;
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'QuietStay-Ops/1.0' },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return { valid: false, eventCount: 0, message: `HTTP ${response.status}` };
    }

    const text = await response.text();
    if (!text.includes('BEGIN:VCALENDAR')) {
      return { valid: false, eventCount: 0, message: 'Format iCal invalide' };
    }

    const parsed = ical.parseICS(text);
    const eventCount = Object.values(parsed).filter(c => c && c.type === 'VEVENT').length;

    return {
      valid: true,
      eventCount,
      message: `Calendrier valide : ${eventCount} événement(s)`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    if (message.includes('abort')) {
      return { valid: false, eventCount: 0, message: 'Timeout : le serveur ne répond pas' };
    }
    return { valid: false, eventCount: 0, message };
  }
}
