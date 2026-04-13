import {
  Client,
  createClient,
  OperationResponse,
} from "@stacks/blockchain-api-client"; // Import the Stacks client
import { paths } from "@stacks/blockchain-api-client/lib/generated/schema";
import { formatDistanceToNow } from "date-fns";
import { getClientConfig } from "../utils/chain-config";
import { Recipient, TxInfo } from "./interfaces";
import { RecipientStorageService } from "./recipientStorageService";

type StacksTransactionEvent =
  OperationResponse["/extended/v1/address/{principal}/transactions_with_transfers"]["results"][number];

interface PostConditionAsset {
  name: string;
  amount: string;
  asset: string;
  symbol: string;
}

interface TransactionCache {
  [address: string]: {
    transactions: TxInfo[];
    lastFetched: number;
  };
}

interface SwTxCache {
  [address: string]: {
    transactions: TxInfo[];
    lastFetched: number;
  };
}

export class TransactionDataService {
  private client: Client<paths, `${string}/${string}`>; // Declare the client
  private cache: TransactionCache = {};
  private readonly CACHE_TTL = 30000; // 30 seconds cache TTL
  private swTxCache: SwTxCache = {};
  private readonly SW_TX_CACHE_TTL = 30000; // 30 seconds
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 1000; // 1 second minimum between requests

  constructor() {
    const { api } = getClientConfig(); // Get the API config
    this.client = createClient({ baseUrl: api }); // Initialize the client
  }

  private isCacheValid(address: string): boolean {
    const cached = this.cache[address];
    if (!cached) return false;
    return Date.now() - cached.lastFetched < this.CACHE_TTL;
  }

  private isSwTxCacheValid(address: string): boolean {
    const cached = this.swTxCache[address];
    if (!cached) return false;
    return Date.now() - cached.lastFetched < this.SW_TX_CACHE_TTL;
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const delay = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Retrieves transaction data from Hiro API with rate limiting to avoid CORS errors
   * @param walletAddress - The wallet address to fetch transactions for
   * @param offset - The offset for pagination (default: 0)
   * @returns Promise<StacksTransactionEvent[]> - Array of transaction events
   *
   * @example
   * ```typescript
   * const transactionService = new TransactionDataService();
   *
   * // Fetch first 20 transactions
   * const transactions = await transactionService.fetchTransactionsFromAPI('SP123...', 0);
   *
   * // Fetch next 20 transactions (pagination)
   * const nextPage = await transactionService.fetchTransactionsFromAPI('SP123...', 20);
   * ```
   */
  async fetchTransactionsFromAPI(
    walletAddress: string,
    offset: number = 0
  ): Promise<StacksTransactionEvent[]> {
    try {
      // Enforce rate limiting to avoid CORS errors
      await this.enforceRateLimit();

      const response = await this.client.GET(
        "/extended/v1/address/{principal}/transactions_with_transfers",
        {
          params: {
            path: {
              principal: walletAddress,
            },
            query: {
              limit: 20,
              offset: offset,
            },
          },
        }
      );

      if (response.data) {
        return response.data.results
          .filter((tx) => tx.tx.tx_type === "token_transfer")
          .map((tx) => {
            return {
              ...tx,
              tx: {
                ...tx.tx,
              },
              events: {},
            };
          });
      }

      return [];
    } catch (error) {
      console.error(
        `Error fetching transactions for address ${walletAddress}:`,
        error
      );

      // If it's a rate limit error, wait a bit longer before throwing
      if (error.response?.status === 429) {
        console.warn("Rate limit exceeded, waiting 2 seconds before retry...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      throw error;
    }
  }

  public determineTransactionAction(
    txData: StacksTransactionEvent["tx"],
    stxsent: number,
    stxreceived: number,
    pcSender: string | undefined,
    address: string
  ): TxInfo["action"] {
    // deploy smart contract
    if (txData.tx_type === "smart_contract") {
      return "contract_deploy";
    }

    // stacking / delegate-stx
    if (
      txData.tx_type === "contract_call" &&
      // assume txData.contract_call.contract_id === address for now &&
      txData.contract_call.function_name === "extension-call"
    ) {
      if (txData.contract_call.function_args.length > 1) {
        const extension = txData.contract_call.function_args[0].repr?.replace(
          /'/g,
          ""
        );
        const [, extName] = extension.split(".");
        if (extName === "ext-delegate-stx-pox-4") {
          return "delegate_stx";
        }
      }
    }

    // transfer wallet
    if (
      txData.tx_type === "contract_call" &&
      // assume txData.contract_call.contract_id === address for now &&
      txData.contract_call.function_name === "transfer-wallet"
    ) {
      return "transfer_wallet";
    }

    // deposit withdraw from smart contract
    if (txData.tx_type === "token_transfer" && txData.token_transfer) {
      return txData.token_transfer.recipient_address === address
        ? "deposit"
        : "withdraw";
    }
    const isStx = stxsent > 0 || stxreceived > 0;

    if (isStx) {
      return stxsent > 0 ? "sent" : "receive";
    } else {
      if (txData.post_conditions?.length === 0) {
        return "contract_call";
      } else {
        return pcSender === address ? "sent" : "receive";
      }
    }
  }

  public determineActor(
    txData: StacksTransactionEvent["tx"],
    stxsent: number,
    stxreceived: number,
    pcSender: string | undefined
  ): string {
    if (
      txData.tx_type === "contract_call" &&
      // assume txData.contract_call.contract_id === address for now &&
      txData.contract_call.function_name === "transfer-wallet"
    ) {
      return txData.contract_call.function_args[0].repr?.replace("'", "") || "";
    }

    const isStx = stxsent > 0 || stxreceived > 0;

    const txSender =
      txData.tx_type === "contract_call" &&
      txData.contract_call.function_name.startsWith("transfer") &&
      txData.contract_call.function_args.length > 1
        ? txData.contract_call.function_args[1].repr?.replace("'", "")
        : txData.sender_address;
    if (isStx) {
      return stxreceived > 0
        ? txSender
        : stxsent > 0
        ? txSender
        : pcSender ?? txSender;
    } else {
      return txData.post_conditions?.length > 0
        ? pcSender ?? txSender
        : txSender;
    }
  }

  private processTransactionData(
    tx: OperationResponse["/extended/v1/address/{principal}/transactions_with_transfers"]["results"][number],
    address: string
  ): TxInfo {
    const { stx_sent, stx_received, tx: txData } = tx;
    const stxsent = Number(stx_sent);
    const stxreceived = Number(stx_received);
    const normalizedStatus = getNormalizedStatus(txData.tx_status);

    console.log(txData.tx_id, txData?.post_conditions);
    const pcAssetsAndAmounts: PostConditionAsset[] =
      txData?.post_conditions?.length > 0
        ? txData.post_conditions.map((c) => {
            switch (c.type) {
              case "fungible":
                return {
                  name: c.asset.asset_name,
                  amount: c.amount,
                  asset: `${c.asset.contract_address}.${c.asset.contract_name}`,
                  symbol: c.asset.asset_name.replace("-token", ""),
                };
              case "stx": {
                return {
                  name: "Stacks",
                  amount: c.amount,
                  asset: "STX",
                  symbol: "STX",
                };
              }
            }
          })
        : txData?.tx_type === "token_transfer" && txData.token_transfer
        ? [
            {
              name: "Stacks",
              amount: txData.token_transfer.amount,
              asset: "STX",
              symbol: "STX",
            },
          ]
        : [];

    const firstPCPrincipal = txData?.post_conditions?.[0]?.principal;
    const pcSender =
      firstPCPrincipal.type_id === "principal_contract"
        ? `${firstPCPrincipal.address}.${firstPCPrincipal.contract_name}`
        : firstPCPrincipal.type_id === "principal_standard"
        ? firstPCPrincipal.address
        : undefined;

    const action = this.determineTransactionAction(
      txData,
      stxsent,
      stxreceived,
      pcSender,
      address
    );
    const actor = this.determineActor(txData, stxsent, stxreceived, pcSender);

    // Special case: contract_deploy that's not confirmed gets empty assets
    const assets =
      txData.tx_type === "smart_contract" && normalizedStatus !== "confirmed"
        ? []
        : pcAssetsAndAmounts;

    return {
      action,
      actor,
      stamp: formatDistanceToNow(txData.block_time_iso),
      time: txData.block_time_iso,
      assets,
      tx: txData.tx_id,
      tx_status: normalizedStatus,
      tx_type: txData.tx_type,
    };
  }

  async getRecentTransactions(
    walletAddress: string,
    offset = 0
  ): Promise<TxInfo[]> {
    if (this.isCacheValid(walletAddress) && offset === 0) {
      return this.cache[walletAddress].transactions;
    }

    try {
      const results = await this.fetchTransactionsFromAPI(
        walletAddress,
        offset
      );
      const transactions = results.map((tx) =>
        this.processTransactionData(tx, walletAddress)
      );

      if (offset === 0) {
        this.cache[walletAddress] = {
          transactions,
          lastFetched: Date.now(),
        };
      } else if (this.cache[walletAddress]) {
        // Append new transactions to cache if they don't already exist
        const existingTxs = this.cache[walletAddress].transactions;
        const newTxs = transactions.filter(
          (tx) => !existingTxs.some((existing) => existing.tx === tx.tx)
        );
        this.cache[walletAddress].transactions = [...existingTxs, ...newTxs];
      }

      return transactions;
    } catch (error) {
      console.error("Error fetching transactions:", error);
      return [];
    }
  }

  async getRecentRecipients(walletAddress: string): Promise<Recipient[]> {
    try {
      const transactions = await this.getRecentTransactions(walletAddress);
      const recipientMap = new Map<
        string,
        { lastSent: string; frequency: number }
      >();

      transactions
        .filter((tx) => tx.action === "sent")
        .forEach((tx) => {
          tx.assets.forEach((asset) => {
            const existing = recipientMap.get(asset.recipient);
            if (existing) {
              recipientMap.set(asset.recipient, {
                lastSent: tx.stamp,
                frequency: existing.frequency + 1,
              });
            } else {
              recipientMap.set(asset.recipient, {
                lastSent: tx.stamp,
                frequency: 1,
              });
            }
          });
        });

      const apiRecipients = Array.from(recipientMap.entries()).map(
        ([address, data]) => ({
          address,
          lastSent: data.lastSent,
          frequency: data.frequency,
        })
      );

      // Get recipients from localStorage
      const storageRecipients =
        RecipientStorageService.getRecentRecipientsFromStorage();

      // Combine and deduplicate recipients (localStorage takes precedence for frequency)
      const combinedRecipients = new Map();

      // Add API recipients first
      apiRecipients.forEach((recipient) => {
        combinedRecipients.set(recipient.address, recipient);
      });

      // Add/update with localStorage recipients (they have more accurate frequency data)
      storageRecipients.forEach((recipient) => {
        combinedRecipients.set(recipient.address, recipient);
      });

      const allRecipients = Array.from(combinedRecipients.values());

      // Filter out removed recipients using localStorage
      return RecipientStorageService.filterRemovedRecipients(allRecipients);
    } catch (error) {
      console.error("Error fetching recipients:", error);
      return [];
    }
  }

  handleGetSwTx = async (
    address: string,
    offset: number,
    setSwTx: (cb: (prev: TxInfo[]) => TxInfo[]) => TxInfo[]
  ) => {
    if (this.isSwTxCacheValid(address) && offset === 0) {
      setSwTx(
        () => this.swTxCache[address].transactions as unknown as TxInfo[]
      );
      return;
    }

    try {
      const results = await this.fetchTransactionsFromAPI(address, offset);
      if (results) {
        const constructTx = results.map(
          (info: StacksTransactionEvent): TxInfo => {
            return this.processTransactionData(info, address);
          }
        );
        if (offset === 0) {
          this.swTxCache[address] = {
            transactions: constructTx,
            lastFetched: Date.now(),
          };
          setSwTx(() => constructTx);
        } else if (this.swTxCache[address]) {
          const existingTxs = this.swTxCache[address].transactions;
          const newTxs = (constructTx ?? []).filter(
            (tx: TxInfo) =>
              !existingTxs.some((existing) => existing?.tx === tx.tx)
          );
          this.swTxCache[address].transactions = [...existingTxs, ...newTxs];
          setSwTx((prev) => [...prev, ...newTxs]);
        } else {
          setSwTx((prev) => {
            const newTxs = (constructTx ?? []).filter(
              (tx: TxInfo) => !prev.some((existing) => existing?.tx === tx.tx)
            );
            return [...prev, ...newTxs];
          });
        }
      }
    } catch (e) {
      // Handle error silently
      console.log("Error in handleGetSwTx:", e);
    }
  };

  async getTransactionCount(walletAddress: string): Promise<number> {
    try {
      const response = await this.client.GET(
        "/extended/v1/address/{principal}/transactions",
        { params: { path: { principal: walletAddress }, query: { limit: 1 } } }
      );

      return response.data?.total || 0; // Return the total count of transactions
    } catch (error) {
      console.error("Error fetching transaction count:", error);
      return 0;
    }
  }
}

// returns "confirmed" or "failed" (or unchanged value for unknown statuses)
const getNormalizedStatus = (
  status: string
): "pending" | "confirmed" | "failed" => {
  if (status === "success") return "confirmed";
  const failedStatuses = [
    "abort_by_post_condition",
    "abort_by_response",
    "dropped",
    "error",
    "failed",
    "rejected",
    "abort",
  ];
  if (failedStatuses.includes(status)) {
    return "failed";
  }
  return "pending";
};
