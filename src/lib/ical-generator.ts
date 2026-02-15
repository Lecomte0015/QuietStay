// ============================================================
// QuietStay Ops — iCal Feed Generator (RFC 5545)
// ============================================================

import type { Booking } from '@/types';

function formatDateValue(dateStr: string): string {
  return dateStr.replace(/-/g, '');
}

function escapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function generateICalFeed(propertyName: string, bookings: Booking[]): string {
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const events = bookings
    .filter(b => b.status !== 'cancelled')
    .map(b => {
      const dtStart = formatDateValue(b.check_in);
      const dtEnd = formatDateValue(b.check_out);
      const summary = escapeText(b.guest_name || 'Réservation');
      const uid = `${b.id}@quietstay-ops`;

      return [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${dtStart}`,
        `DTEND;VALUE=DATE:${dtEnd}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${escapeText(`Plateforme: ${b.platform} | Guests: ${b.guest_count}`)}`,
        `STATUS:CONFIRMED`,
        'END:VEVENT',
      ].join('\r\n');
    });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//QuietStay Ops//Calendar//FR',
    `X-WR-CALNAME:${escapeText(propertyName)}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}
