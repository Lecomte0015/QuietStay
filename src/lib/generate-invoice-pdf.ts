import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Invoice, Owner, CompanySettings } from '@/types';
import { renderQRBill } from './qr-bill-renderer';

export interface InvoicePdfData {
  invoice: Invoice;
  owner: Owner;
  company: CompanySettings;
  ownerAddress?: string;
}

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  const { invoice, owner, company } = data;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  const fmtCHF = (n: number) =>
    new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(n);

  // ── Company header (top-left) ──────────────────────────────
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name || 'QuietStay', margin, 25);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const companyLines = [
    company.address,
    `${company.postal_code} ${company.city} (${company.canton})`,
    company.phone ? `Tél: ${company.phone}` : '',
    company.email ? `Email: ${company.email}` : '',
    company.tva_number ? `N° TVA: ${company.tva_number}` : '',
  ].filter(Boolean);

  let y = 32;
  companyLines.forEach(line => {
    doc.text(line, margin, y);
    y += 4.5;
  });

  // ── Owner address block (top-right) ────────────────────────
  const rightX = pageWidth - margin - 70;
  let ownerY = 40;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(owner.name, rightX, ownerY);
  ownerY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (owner.company) {
    doc.text(owner.company, rightX, ownerY);
    ownerY += 5;
  }
  if (data.ownerAddress) {
    doc.text(data.ownerAddress, rightX, ownerY);
  }

  // ── Invoice title + metadata ───────────────────────────────
  y = 75;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURE', margin, y);

  const invoiceNumber = `QS-${invoice.period_start.slice(0, 4)}${invoice.period_start.slice(5, 7)}-${invoice.id.slice(0, 6).toUpperCase()}`;
  const periodStart = new Date(invoice.period_start).toLocaleDateString('fr-CH');
  const periodEnd = new Date(invoice.period_end).toLocaleDateString('fr-CH');
  const issueDate = new Date().toLocaleDateString('fr-CH');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  y += 8;
  doc.text(`N° facture : ${invoiceNumber}`, margin, y);
  doc.text(`Date d'émission : ${issueDate}`, margin, y + 5);
  doc.text(`Période : ${periodStart} – ${periodEnd}`, margin, y + 10);

  // ── Invoice details table ──────────────────────────────────
  y += 20;

  const bodyRows: [string, string][] = [
    ['Revenu brut des réservations', fmtCHF(invoice.total_revenue)],
    ['Commission de gestion', `- ${fmtCHF(invoice.commission_amount)}`],
    ['Frais de ménage', `- ${fmtCHF(invoice.cleaning_costs)}`],
  ];
  if (invoice.other_costs > 0) {
    bodyRows.push(['Autres frais', `- ${fmtCHF(invoice.other_costs)}`]);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Description', 'Montant']],
    body: bodyRows,
    foot: [['Net à verser au propriétaire', fmtCHF(invoice.net_amount)]],
    headStyles: { fillColor: [41, 37, 36], textColor: [255, 255, 255], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    footStyles: { fillColor: [245, 245, 244], textColor: [41, 37, 36], fontStyle: 'bold', fontSize: 10 },
    columnStyles: { 1: { halign: 'right' } },
    theme: 'grid',
  });

  // ── Payment details ────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY || y + 60;
  let payY = finalY + 15;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Coordonnées de paiement', margin, payY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  payY += 7;

  if (owner.iban) {
    doc.text(`IBAN propriétaire : ${owner.iban}`, margin, payY);
    payY += 5;
  }
  doc.text(`Titulaire : ${owner.name}`, margin, payY);
  payY += 5;
  doc.text(`Référence : ${invoiceNumber}`, margin, payY);

  // ── Notes ──────────────────────────────────────────────────
  if (invoice.notes) {
    payY += 12;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(`Notes : ${invoice.notes}`, margin, payY, { maxWidth: pageWidth - 2 * margin });
  }

  // ── Footer ─────────────────────────────────────────────────
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  const footerText = [
    company.name,
    `${company.address}, ${company.postal_code} ${company.city}`,
    company.tva_number ? `TVA: ${company.tva_number}` : '',
  ].filter(Boolean).join(' | ');
  doc.text(footerText, pageWidth / 2, 285, { align: 'center' });

  // ── QR-Bill (if owner has IBAN) ──────────────────────────
  if (owner.iban) {
    // Check if we need a new page (QR-bill needs 105mm from bottom = starts at Y=192)
    if (payY > 177) {
      doc.addPage();
    }

    const invoiceNumber = `QS-${invoice.period_start.slice(0, 4)}${invoice.period_start.slice(5, 7)}-${invoice.id.slice(0, 6).toUpperCase()}`;

    await renderQRBill(doc, {
      creditorIban: owner.iban,
      creditorName: owner.name,
      creditorAddress: owner.company || '',
      creditorPostalCode: '',
      creditorCity: '',
      amount: invoice.net_amount,
      currency: 'CHF',
      debtorName: company.name || 'QuietStay',
      debtorAddress: company.address || '',
      debtorPostalCode: company.postal_code || '',
      debtorCity: company.city || '',
      invoiceNumber,
    });
  }

  return Buffer.from(doc.output('arraybuffer'));
}
