import { SmartWallet, WalletActivity } from "../interfaces";
import { SmartWalletContractInfo } from "../smartWalletContractService";

export class MockSmartWalletContractService {
  async getSmartWallets(walletAddress: string): Promise<SmartWallet[]> {
    // Demo smart wallet data
    return [
      {
        id: 1,
        label: "Personal Wallet",
        name: "demo-smart-wallet",
        contractId:
          "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7.demo-smart-wallet",
        ext: false,
        stxHolding: 10000,
        btcHolding: 0,
        extensions: ["Multi-sig", "Time-lock", "Treasury"],
        createdAt: "2024-06-19",
      },
      {
        id: 2,
        label: "Business Smart Wallet",
        name: "business-smart-wallet",
        contractId: "SP3ABC...DEMO456.business-smart-wallet",
        ext: false,
        stxHolding: 25500,
        btcHolding: 0,
        extensions: ["Multi-sig", "Governance", "Stacking"],
        createdAt: "2024-05-15",
      },
    ];
  }

  async getWalletActivity(walletAddress: string): Promise<WalletActivity[]> {
    // Demo activity data with higher amounts
    return [
      {
        id: "demo-1",
        type: "send",
        asset: "STX",
        amount: "-500",
        timestamp: "Demo transaction",
        status: "confirmed",
        txHash: "0xdemo1",
      },
      {
        id: "demo-2",
        type: "receive",
        asset: "STX",
        amount: "+2,000",
        timestamp: "Demo transaction",
        status: "confirmed",
        txHash: "0xdemo2",
      },
      {
        id: "demo-3",
        type: "staking",
        asset: "STX",
        amount: "+75",
        timestamp: "Demo transaction",
        status: "confirmed",
        txHash: "0xdemo3",
      },
    ];
  }

  async validateSmartContract(
    contractAddress: string
  ): Promise<SmartWallet | null> {
    // In demo mode, always return a valid contract
    return {
      id: 999,
      label: "Demo Smart Wallet",
      name: "demo-smart-wallet",
      contractId: contractAddress,
      ext: false,
      stxHolding: 0,
      btcHolding: 0,
      extensions: [],
      createdAt: new Date().toISOString(),
    };
  }
}
