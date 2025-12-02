import { 
  StacksNetwork, 
  StacksTestnet, 
  StacksMainnet,
  makeContractDeploy,
  broadcastTransaction,
  anchorMode,
  PostConditionMode,
  TransactionVersion
} from '@stacks/transactions';
import { getAddressFromPrivateKey } from '@stacks/wallet-sdk';

export interface DeployContractOptions {
  contractName: string;
  contractCode: string;
  senderKey: string;
  network?: 'testnet' | 'mainnet';
  apiUrl?: string;
}

export async function deployBitcoinLockerContract(options: DeployContractOptions) {
  const networkType = options.network || 'testnet';
  const network = networkType === 'mainnet' ? new StacksMainnet() : new StacksTestnet();
  const apiUrl = options.apiUrl || (networkType === 'mainnet' 
    ? 'https://api.hiro.so' 
    : 'https://api.testnet.hiro.so');
  
  const senderAddress = getAddressFromPrivateKey(
    options.senderKey,
    networkType === 'mainnet' ? TransactionVersion.Mainnet : TransactionVersion.Testnet
  );

  const txOptions = {
    contractName: options.contractName,
    codeBody: options.contractCode,
    senderKey: options.senderKey,
    network,
    anchorMode: anchorMode.Any,
    postConditionMode: PostConditionMode.Deny,
    fee: 500000n, // Higher fee for contract deployment
    nonce: 0n
  };

  const transaction = await makeContractDeploy(txOptions);
  const broadcastResponse = await broadcastTransaction(transaction, network);
  
  if (broadcastResponse.error) {
    throw new Error(`Transaction failed: ${broadcastResponse.error}`);
  }

  const contractAddress = `${senderAddress}.${options.contractName}`;
  
  return {
    contractAddress,
    txId: broadcastResponse.txid,
    network: networkType
  };
}

