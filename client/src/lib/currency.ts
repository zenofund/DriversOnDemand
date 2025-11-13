/**
 * Currency formatting utilities for Nigerian Naira (₦)
 * Handles null/undefined values and ensures consistent formatting across the app
 */

/**
 * Coerce any value to a number, defaulting to 0 for null/undefined/NaN
 */
export function coerceAmount(amount?: number | string | null): number {
  if (amount === null || amount === undefined) {
    return 0;
  }
  
  const parsed = typeof amount === 'string' ? Number.parseFloat(amount) : amount;
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Format a value as Nigerian Naira currency
 * @param amount - The amount to format (can be number, string, null, or undefined)
 * @param options - Optional formatting options
 * @returns Formatted currency string (e.g., "₦1,000" or "₦0")
 */
export function formatCurrency(
  amount?: number | string | null,
  options?: Intl.NumberFormatOptions & { 
    fallback?: string;
    withSymbol?: boolean;
  }
): string {
  const { fallback, withSymbol = true, ...numberFormatOptions } = options || {};
  const numericAmount = coerceAmount(amount);
  
  // If amount is 0 and a fallback is provided, use it
  if (numericAmount === 0 && fallback !== undefined) {
    return fallback;
  }
  
  // Format with Intl.NumberFormat for proper localization
  const formatted = new Intl.NumberFormat('en-NG', {
    style: withSymbol ? 'currency' : 'decimal',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...numberFormatOptions,
  }).format(numericAmount);
  
  // Intl may return NGN symbol or ₦ depending on environment
  // Ensure we always use ₦
  return formatted.replace(/NGN\s?/, '₦');
}

/**
 * Quick helper to format with just the ₦ symbol
 */
export function formatNaira(amount?: number | string | null): string {
  const numericAmount = coerceAmount(amount);
  return `₦${numericAmount.toLocaleString()}`;
}
