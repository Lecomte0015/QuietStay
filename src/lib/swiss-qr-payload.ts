// ============================================================
// QuietStay Ops — Swiss QR Payment Standard (ISO 20022)
// ============================================================

export interface QRPayloadParams {
  creditorIban: string;
  creditorName: string;
  creditorAddress: string;
  creditorPostalCode: string;
  creditorCity: string;
  amount: number;
  debtorName: string;
  debtorAddress: string;
  debtorPostalCode: string;
  debtorCity: string;
  message?: string;
}

function cleanIban(iban: string): string {
  return iban.replace(/\s/g, '').toUpperCase();
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen) : str;
}

export function generateSwissQRPayload(params: QRPayloadParams): string {
  const iban = cleanIban(params.creditorIban);
  const amount = params.amount.toFixed(2);

  const lines = [
    'SPC',                                    // QR Type
    '0200',                                   // Version
    '1',                                      // Coding (UTF-8)
    iban,                                     // Creditor IBAN
    'S',                                      // Creditor address type (Structured)
    truncate(params.creditorName, 70),        // Creditor name
    truncate(params.creditorAddress, 70),     // Creditor street
    '',                                       // Creditor building number
    truncate(params.creditorPostalCode, 16),  // Creditor postal code
    truncate(params.creditorCity, 35),        // Creditor city
    'CH',                                     // Creditor country
    '',                                       // Ultimate creditor (7 empty fields)
    '',
    '',
    '',
    '',
    '',
    '',
    amount,                                   // Amount
    'CHF',                                    // Currency
    'S',                                      // Debtor address type (Structured)
    truncate(params.debtorName, 70),          // Debtor name
    truncate(params.debtorAddress, 70),       // Debtor street
    '',                                       // Debtor building number
    truncate(params.debtorPostalCode, 16),    // Debtor postal code
    truncate(params.debtorCity, 35),          // Debtor city
    'CH',                                     // Debtor country
    'NON',                                    // Reference type (NON = no reference)
    '',                                       // Reference
    params.message ? truncate(params.message, 140) : '', // Unstructured message
    'EPD',                                    // Trailer
  ];

  return lines.join('\r\n');
}
