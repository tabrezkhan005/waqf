/**
 * Utility functions for formatting data
 * Handles null vs 0 values properly
 */

/**
 * Format a number for display, handling null and 0 correctly
 * @param value - The value to format (can be number, string, or null)
 * @param options - Formatting options
 * @returns Formatted string or "N/A" for null
 */
export function formatNumber(
  value: number | string | null | undefined,
  options: {
    showCurrency?: boolean;
    showZero?: boolean;
    decimals?: number;
    locale?: string;
  } = {}
): string {
  const {
    showCurrency = false,
    showZero = true,
    decimals,
    locale = 'en-IN',
  } = options;

  // Handle null/undefined
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }

  // Convert to number
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  // Handle NaN
  if (isNaN(numValue)) {
    return 'N/A';
  }

  // Handle zero
  if (numValue === 0 && !showZero) {
    return 'N/A';
  }

  // Format number
  const formatted = decimals !== undefined
    ? numValue.toFixed(decimals)
    : numValue.toLocaleString(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });

  return showCurrency ? `₹${formatted}` : formatted;
}

/**
 * Format currency amount
 * @param value - The amount to format
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number | string | null | undefined,
  options: {
    showZero?: boolean;
    compact?: boolean;
  } = {}
): string {
  const { showZero = true, compact = false } = options;

  if (value === null || value === undefined || value === '') {
    return '₹N/A';
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return '₹N/A';
  }

  if (numValue === 0 && !showZero) {
    return '₹N/A';
  }

  if (compact) {
    if (numValue >= 10000000) {
      return `₹${(numValue / 10000000).toFixed(2)}Cr`;
    }
    if (numValue >= 100000) {
      return `₹${(numValue / 100000).toFixed(2)}L`;
    }
    if (numValue >= 1000) {
      return `₹${(numValue / 1000).toFixed(2)}K`;
    }
  }

  return `₹${numValue.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format date for display
 * @param value - Date string or Date object
 * @returns Formatted date string or "N/A"
 */
export function formatDate(
  value: string | Date | null | undefined
): string {
  if (!value) {
    return 'N/A';
  }

  try {
    const date = typeof value === 'string' ? new Date(value) : value;
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'N/A';
  }
}

/**
 * Display value with null handling
 * @param value - The value to display
 * @param nullText - Text to show for null (default: "N/A")
 * @returns Display string
 */
export function displayValue(
  value: string | number | null | undefined,
  nullText: string = 'N/A'
): string {
  if (value === null || value === undefined || value === '') {
    return nullText;
  }
  return String(value);
}








