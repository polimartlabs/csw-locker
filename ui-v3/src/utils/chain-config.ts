import { defaultUrlFromNetwork } from '@stacks/network';

function inferNetworkFromAddress(address?: string | null): 'mainnet' | 'testnet' {
  const a = typeof address === 'string' ? address.trim() : '';
  // Stacks: mainnet P4/SM; testnet ST/SN
  if (a.startsWith('SP') || a.startsWith('SM')) return 'mainnet';
  if (a.startsWith('ST') || a.startsWith('SN')) return 'testnet';
  // Native Bitcoin: segwit/taproot/legacy
  if (a.startsWith('bc1') || a.startsWith('1') || a.startsWith('3')) return 'mainnet';
  if (a.startsWith('tb1') || a.startsWith('2') || a.startsWith('m') || a.startsWith('n')) return 'testnet';
  // Default: conservative testnet for unknown
  return 'testnet';
}

export function getClientConfig(address?: string | null) {
  const network = inferNetworkFromAddress(address);
  return {
    network,
    api: defaultUrlFromNetwork(network),
    explorer: (path: string) => `https://explorer.hiro.so/${path}?chain=${network}`,
    chain: network,
  };
}