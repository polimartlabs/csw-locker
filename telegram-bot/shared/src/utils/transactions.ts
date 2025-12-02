import { TransactionStatus } from '@stacks/transactions';

export interface TransactionInfo {
  txId: string;
  status: 'pending' | 'success' | 'failed';
  blockHeight?: number;
  blockTime?: number;
}

/**
 * Wait for transaction confirmation
 */
export async function waitForTransaction(
  txId: string,
  apiUrl: string,
  timeoutMs: number = 300000 // 5 minutes
): Promise<TransactionInfo> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(`${apiUrl}/extended/v1/tx/${txId}`);
      const data = await response.json();
      
      if (data.tx_status === 'success') {
        return {
          txId,
          status: 'success',
          blockHeight: data.block_height,
          blockTime: data.burn_block_time
        };
      }
      
      if (data.tx_status === 'abort_by_response' || data.tx_status === 'abort_by_post_condition') {
        return {
          txId,
          status: 'failed'
        };
      }
      
      // Still pending
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    } catch (error) {
      console.error('Error checking transaction:', error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  return {
    txId,
    status: 'pending'
  };
}

/**
 * Get transaction URL for explorer
 */
export function getTransactionUrl(
  txId: string,
  network: 'testnet' | 'mainnet'
): string {
  const explorerBase = network === 'mainnet'
    ? 'https://explorer.stacks.co/txid'
    : 'https://explorer.stacks.co/?chain=testnet#/txid';
  
  return `${explorerBase}/${txId}`;
}

