/**
 * SPD (Short Payment Descriptor) QR payment string builder.
 * Czech standard for QR bank payments.
 *
 * Format: SPD*1.0*ACC:IBAN*AM:amount*CC:currency*X-VS:vs*MSG:message
 */

export interface SpdParams {
  /** IBAN účtu příjemce */
  iban: string;
  /** Částka k úhradě */
  amount: number;
  /** Měna (default CZK) */
  currency?: string;
  /** Variabilní symbol (jen číslice) */
  vs?: string;
  /** Zpráva pro příjemce */
  message?: string;
}

/**
 * Sanitize SPD value — remove asterisks and truncate.
 */
function sanitizeSpdValue(value: string, maxLen = 140): string {
  return value.replace(/\*/g, "").substring(0, maxLen);
}

/**
 * Extract only digits from a string (for VS).
 */
export function extractDigits(str: string): string {
  return str.replace(/[^\d]/g, "");
}

/**
 * Build SPD payment string for QR code.
 *
 * @example
 * buildSpdString({
 *   iban: "CZ6508000000192000145399",
 *   amount: 2500,
 *   vs: "2024001",
 *   message: "Proforma 2024001",
 * })
 * // => "SPD*1.0*ACC:CZ6508000000192000145399*AM:2500.00*CC:CZK*X-VS:2024001*MSG:Proforma 2024001"
 */
export function buildSpdString({
  iban,
  amount,
  currency = "CZK",
  vs,
  message,
}: SpdParams): string {
  const parts: string[] = [
    "SPD*1.0",
    `ACC:${sanitizeSpdValue(iban.replace(/\s/g, ""))}`,
    `AM:${amount.toFixed(2)}`,
    `CC:${sanitizeSpdValue(currency, 3)}`,
  ];

  if (vs) {
    const digits = extractDigits(vs);
    if (digits) {
      parts.push(`X-VS:${digits.substring(0, 10)}`);
    }
  }

  if (message) {
    parts.push(`MSG:${sanitizeSpdValue(message, 60)}`);
  }

  return parts.join("*");
}

/**
 * Default IBAN z env, nebo fallback.
 */
export function getCompanyIban(): string {
  return (
    process.env.NEXT_PUBLIC_BANK_IBAN ??
    // Fallback — nahradit reálným IBAN firmy
    "CZ0000000000000000000000"
  );
}
