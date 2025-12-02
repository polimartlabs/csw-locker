import { StacksNetwork, StacksTestnet, StacksMainnet } from '@stacks/network';
import { callReadOnlyFunction, cvToJSON } from '@stacks/transactions';
import { getAddressFromPrivateKey } from '@stacks/wallet-sdk';

const API_URL = process.env.STACKS_API_URL || 'https://api.testnet.hiro.so';
const networkName = (process.env.STACKS_NETWORK || 'testnet') as 'testnet' | 'mainnet';

export function getNetwork(): StacksNetwork {
  return networkName === 'mainnet' ? new StacksMainnet() : new StacksTestnet();
}

export interface WalletBalance {
  stx: string;
  usd: string;
}

export async function getWalletBalance(contractAddress: string): Promise<WalletBalance> {
  const network = getNetwork();
  
  try {
    // Get STX balance from the contract
    const response = await fetch(`${API_URL}/v2/accounts/${contractAddress}`);
    const data = await response.json();
    
    const stxBalance = (parseInt(data.balance || '0', 16) / 1_000_000).toFixed(2);
    
    // TODO: Get USD value from price API
    const usdValue = (parseFloat(stxBalance) * 0.5).toFixed(2); // Placeholder
    
    return {
      stx: stxBalance,
      usd: usdValue
    };
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return {
      stx: '0',
      usd: '0'
    };
  }
}

export async function getContractAdmins(contractAddress: string): Promise<string[]> {
  const network = getNetwork();
  const [address, contractName] = contractAddress.split('.');
  
  try {
    // Read admins from contract - this is a simplified version
    // In reality, you'd need to call a read-only function on the contract
    // For now, return empty array as admins map is not directly readable
    // This would require contract modifications to expose admin list
    return [];
  } catch (error) {
    console.error('Error fetching contract admins:', error);
    return [];
  }
}

export async function getSecurityLevel(contractAddress: string): Promise<number> {
  const network = getNetwork();
  const [address, contractName] = contractAddress.split('.');
  
  try {
    // Call read-only function to get security level
    // This only works for bitcoin-locker-with-rules contract
    const result = await callReadOnlyFunction({
      network,
      contractAddress: address,
      contractName: contractName,
      functionName: 'get-security-level',
      functionArgs: [],
      senderAddress: address
    });
    
    if (result.okay && result.value) {
      const json = cvToJSON(result.value);
      return parseInt(json.value, 10);
    }
    
    return 0; // Default to no rules if not available
  } catch (error) {
    console.error('Error fetching security level:', error);
    return 0;
  }
}

export async function validateStacksAddress(address: string): Promise<boolean> {
  // Basic validation - Stacks addresses start with SP or ST and are 40 chars
  return /^[SP][0-9A-Z]{38}$/.test(address);
}

