/**
 * Indonesian Number & Currency Formatting Utilities
 * Uses dot (.) as thousand separator and comma (,) or dot (.) for decimals
 */

/**
 * Format a number or numeric string to Indonesian dot-separated format (e.g. 20000 -> "20.000")
 */
export function formatNumberWithDots(value: number | string | null | undefined, allowDecimal: boolean = false): string {
  if (value === null || value === undefined || value === '') return '';

  const str = String(value).trim();
  if (str === '') return '';

  if (allowDecimal) {
    // Normalise comma to dot for parsing
    const normalized = str.replace(/,/g, '.');
    // If it ends with dot/comma while typing, keep it
    const hasTrailingDecimal = str.endsWith('.') || str.endsWith(',');
    const parts = normalized.split('.');

    const intPart = parts[0].replace(/\D/g, '');
    const formattedInt = intPart ? Number(intPart).toLocaleString('id-ID') : '0';

    if (parts.length > 1) {
      const decPart = parts.slice(1).join('').replace(/\D/g, '');
      return `${formattedInt},${decPart}`;
    }

    if (hasTrailingDecimal) {
      return `${formattedInt},`;
    }

    return formattedInt;
  }

  // Integer only
  const cleanDigits = str.replace(/\D/g, '');
  if (!cleanDigits) return '';
  return Number(cleanDigits).toLocaleString('id-ID');
}

/**
 * Parse a dot-formatted string back to a pure numeric value
 * e.g. "20.000" -> 20000, "1.500,25" -> 1500.25, "0,25" -> 0.25
 */
export function parseNumberFromDots(formattedStr: string): number {
  if (!formattedStr) return 0;

  // Replace dots (thousand separators) and replace comma with dot
  const clean = formattedStr
    .toString()
    .replace(/\./g, '')
    .replace(/,/g, '.');

  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format pure number to Rupiah string, e.g. 15000 -> "Rp 15.000"
 */
export function formatRupiah(value: number | null | undefined): string {
  const val = Number(value || 0);
  return `Rp ${val.toLocaleString('id-ID')}`;
}
