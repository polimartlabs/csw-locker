import { ContractTypes } from "@/lib/const";
import { defaultUrlFromNetwork, StacksNetworkName } from "@stacks/network";
import axios from "axios";
import { useSearchParams } from "react-router-dom";

export interface SmartWallet {
  label: string;
  id: number;
  name: string;
  contractId: string;
  stxHolding: number;
  btcHolding: number;
  extensions: string[];
  createdAt: string;
}
export interface WalletActivity {
  id: string;
  type: "send" | "receive" | "stacking";
  asset: string;
  amount: string;
  timestamp: string;
  description: string;
}

export type WalletType = {
  label: string;
  id: number;
  name: string;
  contractId: string;
  stxHolding: number;
  btcHolding: number;
  extensions: string[];
  createdAt: string;
};

export const smartWalletName = "smart-wallet";
export const handleGetClientConfig = (
  address: string | undefined,
  searchParams: URLSearchParams
) => {
  const network: StacksNetworkName =
    searchParams.get("network") || address?.startsWith("SP")
      ? "mainnet"
      : "testnet";
  const api: string | undefined =
    searchParams.get("api") || defaultUrlFromNetwork(network);
  const chain: string | undefined = searchParams.get("chain") || network;
  const explorer: string | undefined =
    searchParams.get("explorer") || "https://explorer.hiro.so/";
  return { network, chain, api, explorer };
};
export const handleCCS = async (
  address: string | undefined,
  contractId: string,
  txinfo: boolean,
  searchParams: URLSearchParams
) => {
  let contractInfo;
  try {
    const { api } = handleGetClientConfig(address, searchParams);
    contractInfo = (
      await axios.get(
        `${api}/extended/v2/smart-contracts/status?contract_id=${contractId}`
      )
    ).data;
    contractInfo = contractInfo?.[contractId];
    if (contractInfo?.result && txinfo) {
      const tx_info = (
        await axios.get(`${api}/extended/v1/tx/${contractInfo?.result?.tx_id}`)
      ).data;
      contractInfo = { ...contractInfo, ...tx_info };
    }
  } catch (error) {
    console.log({ error });
  }
  return contractInfo;
};

export class SmartWalletContractService {
  async getSmartWallets(
    walletAddress: string,
    searchParams: URLSearchParams
  ): Promise<SmartWallet[]> {
    const allDeployedWallets: WalletType[] = (
      await Promise.all(
        ContractTypes.map(async (wallets) => {
          const wr = await handleCCS(
            walletAddress,
            `${walletAddress}.${smartWalletName}`,
            true,
            searchParams
          );
          if (!wr?.found) return null;

          const w: WalletType = {
            id: wr.tx_index,
            name: wr.smart_contract.contract_id.split(".")[1],
            contractId: wr.smart_contract.contract_id,
            stxHolding: 0,
            btcHolding: 0,
            ...wallets,
            createdAt: wr.block_time_iso,
          };
          return w;
        })
      )
    ).filter(Boolean) as WalletType[]; // Remove nulls

    // {
    //   id: "SP1ABC...XYZ123.smart-wallet-v1",
    //     name: "Personal Wallet",
    //       contractId: "SP1ABC...XYZ123.smart-wallet-v1",
    //         balance: "1,234.56 STX",
    //           usdValue: "$2,469.12",
    //             extensions: ["Multi-sig", "Time-lock"],
    //               createdAt: "2024-01-15"
    // }

    return allDeployedWallets;
  }

  async getWalletActivity(walletAddress: string): Promise<WalletActivity[]> {
    console.log("Fetching wallet activity for:", walletAddress);

    // Mock activity data
    return [
      {
        id: "1",
        type: "send",
        asset: "STX",
        amount: "-100",
        timestamp: "2 hours ago",
        description: "Sent STX",
      },
      {
        id: "2",
        type: "receive",
        asset: "STX",
        amount: "+500",
        timestamp: "1 day ago",
        description: "Received STX",
      },
      {
        id: "3",
        type: "stacking",
        asset: "STX",
        amount: "+25",
        timestamp: "3 days ago",
        description: "Stacking Reward",
      },
    ];
  }
}
