// ============================================================
// QuietStay Ops — Export CSV (compatible Bexio)
// ============================================================

import type { Invoice, Booking, Owner, Property } from '@/types';

const BOM = '\uFEFF';
const SEP = ';';

function escapeField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(SEP) || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function fmtAmount(n: number): string {
  return n.toFixed(2);
}

function fmtDateCSV(d: string): string {
  return new Date(d).toLocaleDateString('fr-CH');
}

function toCSV(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeField).join(SEP);
  const bodyLines = rows.map(row => row.map(escapeField).join(SEP));
  return BOM + [headerLine, ...bodyLines].join('\n');
}

// ─── Journal Comptable ──────────────────────────────────────
export function generateJournalComptable(
  invoices: Invoice[],
  owners: Owner[],
): string {
  const headers = ['Date', 'N° pièce', 'Compte débit', 'Compte crédit', 'Montant', 'Texte', 'Devise'];
  const rows: string[][] = [];

  for (const inv of invoices) {
    const owner = owners.find(o => o.id === inv.owner_id);
    const date = fmtDateCSV(inv.period_end);
    const num = `QS-${inv.period_start.slice(0, 4)}${inv.period_start.slice(5, 7)}-${inv.id.slice(0, 6).toUpperCase()}`;
    const ownerName = owner?.name || 'Propriétaire';

    // Revenu brut
    if (inv.total_revenue > 0) {
      rows.push([date, num, '1100', '3400', fmtAmount(inv.total_revenue), `Revenu réservations - ${ownerName}`, 'CHF']);
    }
    // Commission
    if (inv.commission_amount > 0) {
      rows.push([date, num, '3400', '1020', fmtAmount(inv.commission_amount), `Commission gestion - ${ownerName}`, 'CHF']);
    }
    // Frais ménage
    if (inv.cleaning_costs > 0) {
      rows.push([date, num, '6100', '1020', fmtAmount(inv.cleaning_costs), `Frais ménage - ${ownerName}`, 'CHF']);
    }
    // Versement net
    if (inv.net_amount > 0) {
      rows.push([date, num, '2000', '1020', fmtAmount(inv.net_amount), `Versement propriétaire - ${ownerName}`, 'CHF']);
    }
  }

  return toCSV(headers, rows);
}

// ─── Relevé Propriétaire ────────────────────────────────────
export function generateReleveProprietaire(
  invoices: Invoice[],
  owners: Owner[],
): string {
  const headers = ['Période', 'Propriétaire', 'Entreprise', 'Revenu brut', 'Commission', 'Frais ménage', 'Autres frais', 'Montant net', 'IBAN'];
  const rows: string[][] = [];

  for (const inv of invoices) {
    const owner = owners.find(o => o.id === inv.owner_id);
    const period = `${fmtDateCSV(inv.period_start)} – ${fmtDateCSV(inv.period_end)}`;

    rows.push([
      period,
      owner?.name || '',
      owner?.company || '',
      fmtAmount(inv.total_revenue),
      fmtAmount(inv.commission_amount),
      fmtAmount(inv.cleaning_costs),
      fmtAmount(inv.other_costs),
      fmtAmount(inv.net_amount),
      owner?.iban || '',
    ]);
  }

  return toCSV(headers, rows);
}

// ─── Export Réservations ────────────────────────────────────
export function generateExportReservations(
  bookings: Booking[],
  properties: Property[],
): string {
  const headers = ['N°', 'Propriété', 'Plateforme', 'Guest', 'Check-in', 'Check-out', 'Nuitées', 'Montant', 'Commission %', 'Statut'];
  const rows: string[][] = [];

  const STATUS_FR: Record<string, string> = {
    pending: 'En attente', confirmed: 'Confirmée', checked_in: 'En cours',
    checked_out: 'Terminée', cancelled: 'Annulée',
  };

  const PLATFORM_FR: Record<string, string> = {
    airbnb: 'Airbnb', booking: 'Booking.com', direct: 'Direct', other: 'Autre',
  };

  for (const b of bookings) {
    const prop = properties.find(p => p.id === b.property_id);
    const nightsCount = Math.ceil(
      (new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 864e5
    );

    rows.push([
      b.id.slice(0, 8).toUpperCase(),
      prop?.name || '',
      PLATFORM_FR[b.platform] || b.platform,
      b.guest_name,
      fmtDateCSV(b.check_in),
      fmtDateCSV(b.check_out),
      String(nightsCount),
      b.total_amount !== null ? fmtAmount(b.total_amount) : '',
      String(b.commission_rate),
      STATUS_FR[b.status] || b.status,
    ]);
  }

  return toCSV(headers, rows);
}
