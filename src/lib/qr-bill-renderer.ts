// ============================================================
// QuietStay Ops — Swiss QR-Bill PDF Renderer (jsPDF)
// ============================================================

import type jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { generateSwissQRPayload, type QRPayloadParams } from './swiss-qr-payload';

export interface QRBillParams {
  creditorIban: string;
  creditorName: string;
  creditorAddress: string;
  creditorPostalCode: string;
  creditorCity: string;
  amount: number;
  currency: string;
  debtorName: string;
  debtorAddress: string;
  debtorPostalCode: string;
  debtorCity: string;
  invoiceNumber: string;
}

const fmtAmount = (n: number) =>
  new Intl.NumberFormat('fr-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export async function renderQRBill(doc: jsPDF, params: QRBillParams): Promise<void> {
  const pageH = doc.internal.pageSize.getHeight(); // 297mm
  const pageW = doc.internal.pageSize.getWidth();  // 210mm

  // QR-bill starts 105mm from bottom
  const billY = pageH - 105;
  const receiptW = 62;
  const paymentX = receiptW;

  // ── Separation line (horizontal dashed) ──────────────────
  doc.setDrawColor(0);
  doc.setLineDashPattern([1, 1], 0);
  doc.setLineWidth(0.3);
  doc.line(0, billY, pageW, billY);

  // Vertical dashed line between receipt and payment
  doc.line(receiptW, billY, receiptW, pageH);

  // Reset line style
  doc.setLineDashPattern([], 0);

  // ── Scissors indicators ──────────────────────────────────
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text('✂', 3, billY - 1);
  doc.text('✂', receiptW - 3, billY + 5, { angle: 90 });
  doc.setTextColor(0, 0, 0);

  // ── Generate QR code ─────────────────────────────────────
  const qrPayload = generateSwissQRPayload({
    creditorIban: params.creditorIban,
    creditorName: params.creditorName,
    creditorAddress: params.creditorAddress,
    creditorPostalCode: params.creditorPostalCode,
    creditorCity: params.creditorCity,
    amount: params.amount,
    debtorName: params.debtorName,
    debtorAddress: params.debtorAddress,
    debtorPostalCode: params.debtorPostalCode,
    debtorCity: params.debtorCity,
    message: `Facture ${params.invoiceNumber}`,
  } as QRPayloadParams);

  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: 'M',
    margin: 0,
    width: 460,
    color: { dark: '#000000', light: '#FFFFFF' },
  });

  // ── RECEIPT SECTION (left, 62mm wide) ────────────────────
  let ry = billY + 5;
  const rm = 5; // receipt margin

  // Title
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Récépissé', rm, ry);
  ry += 7;

  // Account / Payable to
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('Compte / Payable à', rm, ry);
  ry += 3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(formatIban(params.creditorIban), rm, ry);
  ry += 3.5;
  doc.text(params.creditorName, rm, ry, { maxWidth: receiptW - rm * 2 });
  ry += 3.5;
  doc.text(`${params.creditorPostalCode} ${params.creditorCity}`, rm, ry);
  ry += 6;

  // Payable by
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('Payable par', rm, ry);
  ry += 3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(params.debtorName, rm, ry, { maxWidth: receiptW - rm * 2 });
  ry += 3.5;
  doc.text(params.debtorAddress, rm, ry, { maxWidth: receiptW - rm * 2 });
  ry += 3.5;
  doc.text(`${params.debtorPostalCode} ${params.debtorCity}`, rm, ry);
  ry += 8;

  // Amount
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('Monnaie', rm, ry);
  doc.text('Montant', rm + 20, ry);
  ry += 3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(params.currency, rm, ry);
  doc.text(fmtAmount(params.amount), rm + 20, ry);

  // Acceptance point
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('Point de dépôt', rm, pageH - 5);

  // ── PAYMENT SECTION (right, 148mm wide) ──────────────────
  let py = billY + 5;
  const pm = paymentX + 5; // payment margin

  // Title
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Section paiement', pm, py);
  py += 7;

  // QR Code (46x46mm)
  const qrSize = 46;
  const qrX = pm;
  const qrY = py;
  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

  // Swiss cross overlay (white square with cross in center of QR)
  const crossSize = 7;
  const crossX = qrX + (qrSize - crossSize) / 2;
  const crossY = qrY + (qrSize - crossSize) / 2;
  doc.setFillColor(255, 255, 255);
  doc.rect(crossX, crossY, crossSize, crossSize, 'F');
  doc.setFillColor(0, 0, 0);
  doc.rect(crossX + 0.5, crossY + 0.5, crossSize - 1, crossSize - 1, 'F');
  // White cross
  doc.setFillColor(255, 255, 255);
  const armW = 1.2;
  const armH = 3.8;
  const cx = crossX + crossSize / 2;
  const cy = crossY + crossSize / 2;
  doc.rect(cx - armW / 2, cy - armH / 2, armW, armH, 'F'); // vertical
  doc.rect(cx - armH / 2, cy - armW / 2, armH, armW, 'F'); // horizontal

  // Right column (next to QR code)
  const infoX = pm + qrSize + 8;
  let iy = qrY + 2;

  // Currency and amount
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('Monnaie', infoX, iy);
  doc.text('Montant', infoX + 20, iy);
  iy += 3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(params.currency, infoX, iy);
  doc.text(fmtAmount(params.amount), infoX + 20, iy);
  iy += 7;

  // Account / Payable to
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('Compte / Payable à', infoX, iy);
  iy += 3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(formatIban(params.creditorIban), infoX, iy);
  iy += 3.5;
  doc.text(params.creditorName, infoX, iy, { maxWidth: 60 });
  iy += 3.5;
  doc.text(`${params.creditorPostalCode} ${params.creditorCity}`, infoX, iy);
  iy += 7;

  // Additional info
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('Informations supplémentaires', infoX, iy);
  iy += 3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Facture ${params.invoiceNumber}`, infoX, iy);
  iy += 7;

  // Payable by
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('Payable par', infoX, iy);
  iy += 3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(params.debtorName, infoX, iy, { maxWidth: 60 });
  iy += 3.5;
  doc.text(params.debtorAddress, infoX, iy, { maxWidth: 60 });
  iy += 3.5;
  doc.text(`${params.debtorPostalCode} ${params.debtorCity}`, infoX, iy);
}

function formatIban(iban: string): string {
  const clean = iban.replace(/\s/g, '').toUpperCase();
  return clean.replace(/(.{4})/g, '$1 ').trim();
}
