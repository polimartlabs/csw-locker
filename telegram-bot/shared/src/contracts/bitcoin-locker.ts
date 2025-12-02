import { 
  StacksNetwork, 
  StacksTestnet, 
  StacksMainnet,
  callReadOnlyFunction,
  makeContractCall,
  broadcastTransaction,
  anchorMode,
  PostConditionMode,
  stringUtf8CV,
  uintCV,
  principalCV,
  someCV,
  noneCV,
  bufferCV,
  cvToJSON,
  getAddressFromPrivateKey,
  TransactionVersion
} from '@stacks/transactions';

export interface BitcoinLockerConfig {
  network?: 'testnet' | 'mainnet';
  apiUrl?: string;
}

export class BitcoinLockerContract {
  private network: StacksNetwork;
  private apiUrl: string;

  constructor(config: BitcoinLockerConfig = {}) {
    const networkType = config.network || 'testnet';
    this.network = networkType === 'mainnet' ? new StacksMainnet() : new StacksTestnet();
    this.apiUrl = config.apiUrl || (networkType === 'mainnet' 
      ? 'https://api.hiro.so' 
      : 'https://api.testnet.hiro.so');
  }

  /**
   * Transfer STX from the locker
   */
  async transferSTX(
    contractAddress: string,
    senderKey: string,
    amount: bigint,
    recipient: string,
    memo?: string
  ) {
    const [address, contractName] = contractAddress.split('.');
    
    const txOptions = {
      contractAddress: address,
      contractName: contractName,
      functionName: 'stx-transfer',
      functionArgs: [
        uintCV(amount.toString()),
        principalCV(recipient),
        memo ? someCV(stringUtf8CV(memo)) : noneCV()
      ],
      senderKey,
      network: this.network,
      anchorMode: anchorMode.Any,
      postConditionMode: PostConditionMode.Deny,
      fee: 1000n
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, this.network);
    return broadcastResponse;
  }

  /**
   * Add an admin (guardian)
   */
  async enableAdmin(
    contractAddress: string,
    senderKey: string,
    adminAddress: string,
    enabled: boolean
  ) {
    const [address, contractName] = contractAddress.split('.');
    
    const txOptions = {
      contractAddress: address,
      contractName: contractName,
      functionName: 'enable-admin',
      functionArgs: [
        principalCV(adminAddress),
        enabled
      ],
      senderKey,
      network: this.network,
      anchorMode: anchorMode.Any,
      postConditionMode: PostConditionMode.Deny,
      fee: 1000n
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, this.network);
    return broadcastResponse;
  }

  /**
   * Set security level (for bitcoin-locker-with-rules)
   */
  async setSecurityLevel(
    contractAddress: string,
    senderKey: string,
    level: number
  ) {
    const [address, contractName] = contractAddress.split('.');
    
    const txOptions = {
      contractAddress: address,
      contractName: contractName,
      functionName: 'set-security-level',
      functionArgs: [
        uintCV(level)
      ],
      senderKey,
      network: this.network,
      anchorMode: anchorMode.Any,
      postConditionMode: PostConditionMode.Deny,
      fee: 1000n
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, this.network);
    return broadcastResponse;
  }

  /**
   * Call an extension
   */
  async callExtension(
    contractAddress: string,
    senderKey: string,
    extensionAddress: string,
    payload: Buffer
  ) {
    const [address, contractName] = contractAddress.split('.');
    const [extAddress, extName] = extensionAddress.split('.');
    
    const txOptions = {
      contractAddress: address,
      contractName: contractName,
      functionName: 'extension-call',
      functionArgs: [
        {
          address: extAddress,
          contractName: extName
        },
        bufferCV(payload)
      ],
      senderKey,
      network: this.network,
      anchorMode: anchorMode.Any,
      postConditionMode: PostConditionMode.Deny,
      fee: 1000n
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, this.network);
    return broadcastResponse;
  }

  /**
   * Get contract balance
   */
  async getBalance(contractAddress: string): Promise<bigint> {
    try {
      const response = await fetch(`${this.apiUrl}/v2/accounts/${contractAddress}`);
      const data = await response.json();
      return BigInt(data.balance || '0');
    } catch (error) {
      console.error('Error fetching balance:', error);
      return 0n;
    }
  }
}

