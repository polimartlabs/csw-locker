/**
 * Validate a Stacks address format
 */
export function validateStacksAddress(address: string): boolean {
  // Stacks addresses start with SP (mainnet) or ST (testnet) and are 41 chars
  return /^[SP][0-9A-Z]{38}$/.test(address);
}

/**
 * Extract address and contract name from contract identifier
 */
export function parseContractAddress(contractAddress: string): {
  address: string;
  contractName: string;
} | null {
  const parts = contractAddress.split('.');
  if (parts.length !== 2) {
    return null;
  }

  const [address, contractName] = parts;
  
  if (!validateStacksAddress(address)) {
    return null;
  }

  return { address, contractName };
}

/**
 * Format STX amount from microstacks
 */
export function formatSTX(microstacks: bigint | string | number): string {
  const amount = typeof microstacks === 'string' 
    ? BigInt(microstacks) 
    : typeof microstacks === 'number'
    ? BigInt(microstacks)
    : microstacks;
  
  const stx = Number(amount) / 1_000_000;
  return stx.toFixed(6).replace(/\.?0+$/, '');
}

/**
 * Convert STX to microstacks
 */
export function stxToMicrostacks(stx: number | string): bigint {
  const amount = typeof stx === 'string' ? parseFloat(stx) : stx;
  return BigInt(Math.floor(amount * 1_000_000));
}

