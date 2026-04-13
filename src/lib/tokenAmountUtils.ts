/**
 * Converts a human-readable amount to micro units (on-chain format).
 * @param amount The amount as string or number (e.g. '1.23')
 * @param decimals The number of decimals for the token (e.g. 6 for STX)
 * @returns The amount in micro units as a string
 */
export function toMicroAmount(amount: string | number, decimals: number = 6): string {
  try {
    const num = typeof amount === 'string' ? Number(amount) : amount;
    if (isNaN(num)) return '0';
    return (num * Math.pow(10, decimals)).toFixed(0);
  } catch {
    return '0';
  }
}

/**
 * Converts a micro amount (on-chain format) to human-readable string.
 * @param amount The micro amount as string or number
 * @param decimals The number of decimals for the token
 * @returns The human-readable amount as a string
 */
export function fromMicroAmount(amount: string | number, decimals: number = 6): string {
  try {
    const num = typeof amount === 'string' ? Number(amount) : amount;
    if (isNaN(num)) return '0';
    return (num / Math.pow(10, decimals)).toString();
  } catch {
    return '0';
  }
}
