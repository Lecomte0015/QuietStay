import jsPDF from 'jspdf';
import type { Contract, Property, Owner, CompanySettings } from '@/types';

export interface ContractPdfData {
  contract: Contract;
  property: Property;
  owner: Owner;
  company: CompanySettings;
}

export function generateContractPdf(data: ContractPdfData): Buffer {
  const { contract, property, owner, company } = data;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  const fmtCHF = (n: number) =>
    new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(n);
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-CH', { day: '2-digit', month: 'long', year: 'numeric' });
  const nightsCount = Math.ceil(
    (new Date(contract.check_out).getTime() - new Date(contract.check_in).getTime()) / 864e5
  );

  // ── Company header ─────────────────────────────────────────
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name || 'QuietStay', margin, 25);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const companyLines = [
    company.address,
    `${company.postal_code} ${company.city} (${company.canton})`,
    company.phone ? `Tél: ${company.phone}` : '',
    company.email ? `Email: ${company.email}` : '',
  ].filter(Boolean);

  let y = 32;
  companyLines.forEach(line => {
    doc.text(line, margin, y);
    y += 4.5;
  });

  // ── Title ──────────────────────────────────────────────────
  y = 60;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRAT DE LOCATION DE VACANCES', pageWidth / 2, y, { align: 'center' });

  // ── Separator ──────────────────────────────────────────────
  y += 5;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);

  // ── Article 1 : Parties ────────────────────────────────────
  y += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Article 1 — Parties', margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Le Bailleur :', margin, y);
  doc.setFont('helvetica', 'normal');
  y += 5;
  doc.text(`${owner.name}${owner.company ? ` (${owner.company})` : ''}`, margin + 5, y);
  if (owner.email) { y += 4; doc.text(`Email : ${owner.email}`, margin + 5, y); }
  if (owner.phone) { y += 4; doc.text(`Tél : ${owner.phone}`, margin + 5, y); }

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Le Locataire :', margin, y);
  doc.setFont('helvetica', 'normal');
  y += 5;
  doc.text(contract.guest_name, margin + 5, y);
  if (contract.guest_address) { y += 4; doc.text(contract.guest_address, margin + 5, y); }
  if (contract.guest_email) { y += 4; doc.text(`Email : ${contract.guest_email}`, margin + 5, y); }
  if (contract.guest_phone) { y += 4; doc.text(`Tél : ${contract.guest_phone}`, margin + 5, y); }

  // ── Article 2 : Objet ──────────────────────────────────────
  y += 12;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Article 2 — Objet de la location', margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const propertyDesc = [
    `Bien : ${property.name}`,
    `Type : ${property.property_type}`,
    `Adresse : ${property.address}, ${property.postal_code || ''} ${property.city}`,
    `Chambres : ${property.bedrooms} | Capacité max : ${property.max_guests} personnes`,
  ];
  propertyDesc.forEach(line => {
    doc.text(line, margin + 5, y);
    y += 4.5;
  });

  // ── Article 3 : Durée ──────────────────────────────────────
  y += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Article 3 — Durée du séjour', margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Arrivée : ${fmtDate(contract.check_in)}`, margin + 5, y);
  y += 4.5;
  doc.text(`Départ : ${fmtDate(contract.check_out)}`, margin + 5, y);
  y += 4.5;
  doc.text(`Durée : ${nightsCount} nuit${nightsCount > 1 ? 's' : ''}`, margin + 5, y);

  // ── Article 4 : Prix ───────────────────────────────────────
  y += 12;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Article 4 — Prix et conditions de paiement', margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Montant total du séjour : ${fmtCHF(contract.total_amount)}`, margin + 5, y);
  y += 4.5;
  if (contract.deposit_amount > 0) {
    doc.text(`Caution : ${fmtCHF(contract.deposit_amount)}`, margin + 5, y);
    y += 4.5;
    doc.text('La caution sera restituée dans les 7 jours suivant le départ, sous réserve de l\'état des lieux.', margin + 5, y, { maxWidth: contentWidth - 10 });
    y += 8;
  }

  // ── Article 5 : Règlement intérieur ────────────────────────
  y += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Article 5 — Règlement intérieur', margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const rules = [
    'Le locataire s\'engage à occuper les lieux en bon père de famille.',
    'Il est interdit de fumer à l\'intérieur du logement.',
    'Les nuisances sonores sont interdites entre 22h00 et 07h00.',
    'Les animaux de compagnie ne sont pas admis sauf accord préalable du bailleur.',
    'Le nombre d\'occupants ne doit pas dépasser la capacité maximale indiquée.',
    'Le locataire est responsable de tout dommage causé pendant le séjour.',
  ];
  rules.forEach(rule => {
    doc.text(`• ${rule}`, margin + 5, y, { maxWidth: contentWidth - 10 });
    y += 6;
  });

  // ── Article 6 : Responsabilité ─────────────────────────────
  y += 6;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Article 6 — Responsabilité', margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const liability = 'Le bailleur décline toute responsabilité en cas de vol, perte ou dommage aux effets personnels du locataire. Le locataire est tenu de signaler immédiatement tout dysfonctionnement ou dégât constaté dans le logement.';
  doc.text(liability, margin + 5, y, { maxWidth: contentWidth - 10 });

  // Check if we need a new page for signatures
  y += 20;
  if (y > 240) {
    doc.addPage();
    y = 25;
  }

  // ── Notes ──────────────────────────────────────────────────
  if (contract.notes) {
    y += 5;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Remarques', margin, y);
    y += 7;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(contract.notes, margin + 5, y, { maxWidth: contentWidth - 10 });
    y += 12;
  }

  // ── Signatures ─────────────────────────────────────────────
  y += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fait à ${company.city || '_______________'}, le _______________`, margin, y);

  y += 15;
  const sigWidth = (contentWidth - 20) / 2;

  // Left signature: Bailleur
  doc.setFont('helvetica', 'bold');
  doc.text('Le Bailleur', margin, y);
  doc.setFont('helvetica', 'normal');
  y += 5;
  doc.text(owner.name, margin, y);
  y += 20;
  doc.line(margin, y, margin + sigWidth, y);
  doc.text('Signature', margin, y + 4);

  // Right signature: Locataire
  const rightX = margin + sigWidth + 20;
  doc.setFont('helvetica', 'bold');
  doc.text('Le Locataire', rightX, y - 25);
  doc.setFont('helvetica', 'normal');
  doc.text(contract.guest_name, rightX, y - 20);
  doc.line(rightX, y, rightX + sigWidth, y);
  doc.text('Signature', rightX, y + 4);

  // ── Footer ─────────────────────────────────────────────────
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  const footerText = [
    company.name,
    `${company.address}, ${company.postal_code} ${company.city}`,
    company.tva_number ? `TVA: ${company.tva_number}` : '',
  ].filter(Boolean).join(' | ');
  doc.text(footerText, pageWidth / 2, 285, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}
