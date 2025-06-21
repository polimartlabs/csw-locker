import { request } from "@stacks/connect";
import { TransactionResult } from "@stacks/connect/dist/types/methods";

export interface TransactionParams {
   from: string;
   to: string;
   amount: string;
   asset: string;
   assetType: "token" | "nft";
   tokenId?: string;
   contractAddress?: string;
}

export class BlockchainService {
   async sendTransaction(
      params: TransactionParams
   ): Promise<TransactionResult> {
      console.log("Sending transaction with params:", params);

      const data = await request(
         { forceWalletSelect: true },
         "stx_transferSip10Nft",
         {
            asset: params.asset,
            assetId: params.tokenId,
            recipient: params.to,
         }
      );

      return data;
   }

   async getTransactionStatus(txHash: string): Promise<string> {
      console.log("Checking transaction status for:", txHash);

      // Simulate status check
      return new Promise((resolve) => {
         setTimeout(() => {
            const statuses = ["pending", "confirmed", "failed"];
            const randomStatus =
               statuses[Math.floor(Math.random() * statuses.length)];
            resolve(randomStatus);
         }, 1000);
      });
   }
}
