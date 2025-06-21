import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';

export interface Transaction {
  id: string;
  action: 'sent' | 'receive' | string;
  from: string;
  to: string;
  amount: string;
  asset: string;
  assetType: 'token' | 'nft';
  timestamp: string;
  status: 'pending' | 'confirmed' | 'failed';
  txHash: string;
}

interface StacksTransactionEvent {
  events: Record<string, unknown>;
  stx_received: string;
  stx_sent: string;
  tx: {
    token_transfer?: {
      amount: string;
    };
    tx_id: string;
    tx_status: string;
    tx_type: string;
    block_time_iso: string;
    sender_address: string;
    contract_call?: {
      function_name: string;
      function_args: Array<{
        repr: string;
      }>;
    };
    post_conditions: Array<{
      asset?: {
        asset_name: string;
        contract_address: string;
        contract_name: string;
      };
      amount?: string;
      principal: {
        address: string;
        contract_name?: string;
      };
    }>;
  };
}

interface PostConditionAsset {
  name: string;
  amount: string;
  asset: string;
  symbol: string;
}

export interface Recipient {
  address: string;
  lastSent: string;
  frequency: number;
}

interface TransactionCache {
  [address: string]: {
    transactions: Transaction[];
    lastFetched: number;
  };
}

export class TransactionDataService {
  private cache: TransactionCache = {};
  private readonly CACHE_TTL = 30000; // 30 seconds cache TTL

  private getClientConfig(address: string) {
    // Automatic detection based on address prefix
    // Mainnet: SP, SM; Testnet: ST, SN
    if (/^(ST|SN)/i.test(address)) {
      return {
        api: 'https://api.testnet.hiro.so',
        chain: 'testnet'
      };
    } else {
      return {
        api: 'https://api.mainnet.hiro.so', // fixed mainnet endpoint
        chain: 'mainnet'
      };
    }
  }

  private isCacheValid(address: string): boolean {
    const cached = this.cache[address];
    if (!cached) return false;
    return Date.now() - cached.lastFetched < this.CACHE_TTL;
  }

  private processTransactionData(tx: StacksTransactionEvent): Transaction {
    const { stx_sent, stx_received, tx: txData } = tx;
    const stxsent = Number(stx_sent);
    const stxreceived = Number(stx_received);

    const pcAssetsAndAmounts: PostConditionAsset[] = txData?.post_conditions?.length > 0
      ? txData.post_conditions.map((c) => ({
          name: c?.asset?.asset_name ?? 'Stacks',
          amount: c.amount ?? '0',
          asset: c?.asset?.contract_address
            ? `${c.asset.contract_address}.${c.asset.contract_name}`
            : 'STX',
          symbol: c?.asset?.asset_name?.replace('-token', '') ?? 'STX'
        }))
      : txData?.tx_type === "token_transfer" && txData.token_transfer
        ? [{
            name: 'Stacks',
            amount: txData.token_transfer.amount,
            asset: 'STX',
            symbol: 'STX'
          }]
        : [];

    const pcSender = txData?.post_conditions?.[0]?.principal?.contract_name 
      ? `${txData.post_conditions[0].principal.address}.${txData.post_conditions[0].principal.contract_name}`
      : txData.post_conditions?.[0]?.principal?.address;
    
    const txSender = txData?.contract_call?.function_args?.[1]?.repr?.replace("'", '') ?? txData.sender_address;

    // Normalize status: treat 'success' as 'confirmed', and failed-like statuses as 'failed'
    let normalizedStatus = txData.tx_status;
    if (normalizedStatus === 'success') normalizedStatus = 'confirmed';
    const failedStatuses = [
      'abort_by_post_condition',
      'abort_by_response',
      'dropped',
      'error',
      'failed',
      'rejected',
      'abort',
    ];
    if (failedStatuses.includes(normalizedStatus)) {
      normalizedStatus = 'failed';
    }
    return {
      id: txData.tx_id,
      action: stxsent > 0 ? 'sent' : stxreceived > 0 ? 'receive' : txData?.contract_call?.function_name ?? txData.tx_type,
      from: txSender,
      to: pcSender ?? '',
      amount: pcAssetsAndAmounts[0]?.amount ?? '0',
      asset: pcAssetsAndAmounts[0]?.symbol ?? 'STX',
      assetType: 'token',
      timestamp: formatDistanceToNow(new Date(txData.block_time_iso)),
      status: normalizedStatus as 'pending' | 'confirmed' | 'failed',
      txHash: txData.tx_id
    };
  }

  async getRecentTransactions(walletAddress: string, offset = 0): Promise<Transaction[]> {
    if (this.isCacheValid(walletAddress) && offset === 0) {
      return this.cache[walletAddress].transactions;
    }

    try {
      const { api } = this.getClientConfig(walletAddress);
      const response = await axios.get<{ results: StacksTransactionEvent[] }>(
        `${api}/extended/v2/addresses/${walletAddress}/transactions?limit=20&offset=${offset}`
      );

      if (response?.data?.results) {
        const transactions = response.data.results.map(tx => this.processTransactionData(tx));
        
        if (offset === 0) {
          this.cache[walletAddress] = {
            transactions,
            lastFetched: Date.now()
          };
        } else if (this.cache[walletAddress]) {
          // Append new transactions to cache if they don't already exist
          const existingTxs = this.cache[walletAddress].transactions;
          const newTxs = transactions.filter(
            tx => !existingTxs.some(existing => existing.id === tx.id)
          );
          this.cache[walletAddress].transactions = [...existingTxs, ...newTxs];
        }

        return transactions;
      }
      return [];
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }

  async getRecentRecipients(walletAddress: string): Promise<Recipient[]> {
    try {
      const transactions = await this.getRecentTransactions(walletAddress);
      const recipientMap = new Map<string, { lastSent: string; frequency: number }>();

      transactions
        .filter(tx => tx.action === 'sent')
        .forEach(tx => {
          const existing = recipientMap.get(tx.to);
          if (existing) {
            recipientMap.set(tx.to, {
              lastSent: tx.timestamp,
              frequency: existing.frequency + 1
            });
          } else {
            recipientMap.set(tx.to, {
              lastSent: tx.timestamp,
              frequency: 1
            });
          }
        });

      return Array.from(recipientMap.entries()).map(([address, data]) => ({
        address,
        lastSent: data.lastSent,
        frequency: data.frequency
      }));
    } catch (error) {
      console.error('Error fetching recipients:', error);
      return [];
    }
  }
}
