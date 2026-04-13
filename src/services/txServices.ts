import { getClientConfig } from "@/utils/chain-config";
import { formatDecimals } from "@/utils/numbers";
import { isConnected, request } from "@stacks/connect";
import {
  CallContractParams,
  DeployContractParams,
  TransactionResult,
  TransferStxParams,
} from "@stacks/connect/dist/types/methods";
import {
  Cl,
  cvToValue,
  fetchCallReadOnlyFunction,
  Pc,
  serializeCV,
} from "@stacks/transactions";
import { hexToBytes } from "@noble/hashes/utils";
import { StacksNetworkName } from "@stacks/network";

export interface TransactionParams {
  from: string;
  to: string;
  amount: string;
  asset: string;
  assetType: "ft" | "nft";
  tokenId?: string;
  contractAddress?: string;
}

export type ExtensionCallParams = {
  action: string;
  extension: string;
  "amount-ustx": number;
  decimal: number;
  "delegate-to": string;
  "until-burn-ht": number;
  "pox-addr": {
    version: string;
    hashbytes: string;
  };
};

export class TxServices {
  async callExtensionContract(
    walletId: `${string}.${string}`,
    params: ExtensionCallParams
  ) {
    const delegateAmount =
      +params["amount-ustx"] * Math.pow(10, params.decimal);
    const postConditions = [
      Pc.principal(walletId).willSendLte(delegateAmount).ustx(),
      Pc.principal(walletId).willSendLte(1).ft(walletId, "ect"),
    ];

    let serializedPayload: any;
    if (params?.["pox-addr"]?.version && params?.["pox-addr"]?.hashbytes) {
      serializedPayload = hexToBytes(
        serializeCV(
          Cl.tuple({
            action: Cl.stringAscii(params.action),
            "amount-ustx": Cl.uint(delegateAmount),
            "delegate-to": Cl.principal(params["delegate-to"]),
            "until-burn-ht": Cl.none(),
            "pox-addr": Cl.tuple({
              version: Cl.bufferFromAscii(params["pox-addr"].version),
              hashbytes: Cl.bufferFromAscii(params["pox-addr"].hashbytes),
            }),
          })
        )
      );
    } else {
      serializedPayload = hexToBytes(
        serializeCV(
          Cl.tuple({
            action: Cl.stringAscii(params.action),
            "amount-ustx": Cl.uint(delegateAmount),
            "delegate-to": Cl.principal(params["delegate-to"]),
            "until-burn-ht": Cl.none(),
            "pox-addr": Cl.none(),
          })
        )
      );
    }
    const txoptions: CallContractParams = {
      contract: walletId,
      functionName: "extension-call",
      functionArgs: [
        Cl.principal(params.extension),
        Cl.buffer(serializedPayload),
      ],
      postConditions,
      postConditionMode: "deny",
    };
    await request("stx_callContract", txoptions)
      .then((tx) => tx)
      .catch((e) => {
        /* Handle error silently */
      });
  }
  // Handles contract deploys
  async deployContract(params: DeployContractParams) {
    if (isConnected()) {
      return await request("stx_deployContract", params)
        .then((tx) => tx)
        .catch((e) => {
          /* Handle error silently */
        });
    } else {
      throw new Error("Wallet not connected");
    }
  }

  async sendTransaction(params: TransactionParams): Promise<TransactionResult> {
    const [cswAddress, cswName] = params.from.split(".");
    const [assetAddress, assetName] = params.contractAddress.split("::");
    let txOption: CallContractParams,
      txConditions = [];

    if (params.assetType === "nft") {
      txConditions = [
        Pc.principal(params.from)
          .willSendAsset()
          .nft(
            `${assetAddress.split(".")[0]}.${assetAddress.split(".")[1]}`,
            params?.asset?.split("::")[1],
            Cl.uint(params.tokenId)
          ),
      ];
      txOption = {
        contract: `${cswAddress}.${cswName}`,
        functionName: "sip009-transfer",
        functionArgs: [
          Cl.uint(params.tokenId),
          Cl.principal(params.to),
          Cl.contractPrincipal(
            assetAddress.split(".")[0],
            assetAddress.split(".")[1]
          ),
        ],
        postConditions: txConditions,
      };
    } else {
      if (params.asset === "stx") {
        txConditions = [
          Pc.principal(params.from).willSendLte(params.amount).ustx(),
        ];
        txOption = {
          contract: `${cswAddress}.${cswName}`,
          functionName: "stx-transfer",
          functionArgs: [
            Cl.uint(params.amount),
            Cl.principal(params.to),
            Cl.none(),
          ],
          postConditions: txConditions,
        };
      } else {
        txConditions = [
          Pc.principal(params.from)
            .willSendLte(params.amount)
            .ft(
              `${assetAddress.split(".")[0]}.${assetAddress.split(".")[1]}`,
              assetName
            ),
        ];
        txOption = {
          contract: `${cswAddress}.${cswName}`,
          functionName: "sip010-transfer",
          functionArgs: [
            Cl.uint(+params.amount),
            Cl.principal(params.to),
            Cl.none(),
            Cl.contractPrincipal(
              assetAddress.split(".")[0],
              assetAddress.split(".")[1]
            ),
          ],
          postConditions: txConditions,
        };
      }
    }
    const txData = await request("stx_callContract", txOption);
    return txData;
  }

  async addAdmin(params: {
    contractAddress: string;
    adminAddress: string;
  }): Promise<TransactionResult> {
    const [address, contractName] = params.contractAddress.split(".");
    const network = getClientConfig(address).network;
    const data = await request("stx_callContract", {
      contract: `${address}.${contractName}`,
      functionName: "enable-admin",
      functionArgs: [Cl.principal(params.adminAddress), Cl.bool(true)],
      network,
    });
    return data;
  }

  async transferOwnership(params: {
    contractAddress: string;
    newOwnerAddress: string;
  }): Promise<TransactionResult> {
    const [address, contractName] = params.contractAddress.split(".");
    const network = getClientConfig(address).network;
    const data = await request("stx_callContract", {
      contract: `${address}.${contractName}`,
      functionName: "transfer-wallet",
      functionArgs: [Cl.principal(params.newOwnerAddress)],
      network,
    });
    return data;
  }

  async deposit(params: {
    from: string;
    to: string;
    amount: string;
    asset: string;
    assetType: "ft" | "nft";
    tokenId?: string;
    contractAddress?: string;
    decimal: number;
  }): Promise<{ txid: string }> {
    const [assetAddress, assetName] = params.contractAddress.split("::");
    const [assetContract, assetContractName] = assetAddress.split(".");
    let txOption: CallContractParams | TransferStxParams,
      txConditions = [];
    const txAmount =
      +params.decimal > 0
        ? +params.amount * Math.pow(10, params.decimal)
        : +params.amount;

    if (params.assetType === "nft") {
      txConditions = [
        Pc.principal(params.from)
          .willSendAsset()
          .nft(
            `${assetAddress.split(".")[0]}.${assetAddress.split(".")[1]}`,
            assetName,
            Cl.uint(params.tokenId)
          ),
      ];
      txOption = {
        contract: `${assetContract}.${assetContractName}`,
        functionName: "transfer",
        functionArgs: [
          Cl.uint(params.tokenId),
          Cl.principal(params.to),
          Cl.contractPrincipal(
            assetAddress.split(".")[0],
            assetAddress.split(".")[1]
          ),
        ],
        postConditions: txConditions,
      };
    } else {
      if (params.asset === "stx") {
        txConditions = [Pc.principal(params.from).willSendLte(txAmount).ustx()];
        txOption = {
          recipient: params.to,
          amount: Number(txAmount),
          postConditions: txConditions,
          network: getClientConfig(params.from).network,
        };
      } else {
        txConditions = [
          Pc.principal(params.from)
            .willSendLte(txAmount)
            .ft(
              `${assetAddress.split(".")[0]}.${assetAddress.split(".")[1]}`,
              assetName
            ),
        ];
        txOption = {
          contract: `${assetContract}.${assetContractName}`,
          functionName: "transfer",
          functionArgs: [
            Cl.uint(txAmount),
            Cl.principal(params.from),
            Cl.principal(params.to),
            Cl.none(),
          ],
          postConditions: txConditions,
        };
      }
    }
    const data = await request(
      params.asset === "stx" ? "stx_transferStx" : "stx_callContract",
      txOption
    );
    return { txid: data.txid };
  }

  async isAdmin(address: string, contractId: string): Promise<boolean> {
    const contractAddress = contractId.split(".")[0];
    const contractName = contractId.split(".")[1];
    const functionName = "is-admin-calling";

    const response = await fetchCallReadOnlyFunction({
      contractAddress,
      contractName,
      functionName,
      functionArgs: [],
      senderAddress: address,
      network: getClientConfig(address).network as StacksNetworkName,
    });

    const res = cvToValue(response).value as boolean;
    return res;
  }
}
