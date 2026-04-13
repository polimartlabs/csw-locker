import {
  AddressBalanceResponse,
  StxResponseBalance,
  FtResponseBalance,
  NftResponseBalance,
  FungibleType,
  AccountBalanceType,
  ftInfoType,
  nftInfoType,
  metaDataType,
  nftAssetType,
  NftMetadataResponse,
  GetFungibleTokenMeta,
  GetNoneFungibleTokenMeta,
} from "../types";

interface ApiConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export class MockAccountBalanceService {
  private defaultConfig: ApiConfig = {
    baseUrl: "https://api.hiro.so",
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
    },
  };

  constructor(config?: Partial<ApiConfig>) {
    if (config) {
      this.defaultConfig = { ...this.defaultConfig, ...config };
    }
  }

  /**
   * Mock function to simulate API delay
   */
  private async delay(ms: number = 1000): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generic function to get mock balance data
   */
  private async getBalance<T>(
    address: string,
    config?: Partial<ApiConfig>
  ): Promise<T | null> {
    await this.delay(500); // Simulate API delay

    // Return mock data that matches the API schema
    return this.getMockBalanceData() as T;
  }

  /**
   * Get mock STX balance for an address
   */
  async getStxBalance(
    address: string,
    config?: Partial<ApiConfig>
  ): Promise<StxResponseBalance | null> {
    const balanceData = await this.getBalance<AddressBalanceResponse>(
      address,
      config
    );
    return balanceData?.stx || null;
  }

  /**
   * Get mock Fungible Token balances for an address
   */
  async getFtBalance(
    address: string,
    config?: Partial<ApiConfig>
  ): Promise<FtResponseBalance[]> {
    const balanceData = await this.getBalance<AddressBalanceResponse>(
      address,
      config
    );

    if (!balanceData?.fungible_tokens) {
      return [];
    }

    return Object.keys(balanceData.fungible_tokens).map((key) => ({
      ...balanceData.fungible_tokens[key],
      asset_identifier: key,
    }));
  }

  /**
   * Get mock Non-Fungible Token balances for an address
   */
  async getNftBalance(
    address: string,
    config?: Partial<ApiConfig>
  ): Promise<NftResponseBalance[]> {
    const balanceData = await this.getBalance<AddressBalanceResponse>(
      address,
      config
    );

    if (!balanceData?.non_fungible_tokens) {
      return [];
    }

    return Object.keys(balanceData.non_fungible_tokens).map((key) => ({
      ...balanceData.non_fungible_tokens[key],
      asset_identifier: key,
    }));
  }

  /**
   * Get complete mock account balances (STX, FT, NFT)
   */
  async getAccountBalances(
    address: string,
    config?: Partial<ApiConfig>
  ): Promise<AccountBalanceType | null> {
    if (!address) return null;

    await this.delay(800); // Simulate API delay

    const balanceData = await this.getBalance<AddressBalanceResponse>(
      address,
      config
    );

    if (!balanceData) {
      return null;
    }

    const ftBalance = await this.getFtBalance(address, config);
    const nftBalance = await this.getNftBalance(address, config);
    const stxBalance = this.constructStxBalance(balanceData.stx);

    // Find sBTC balance if it exists
    const sbtcToken = ftBalance.find(
      (token) =>
        token.asset_identifier ===
        "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token::sbtc-token"
    );
    const sBtcBalance = sbtcToken
      ? await this.constructFtBalance(address, sbtcToken, config)
      : null;

    return {
      raw: balanceData,
      ft: ftBalance,
      nft: nftBalance,
      stx: stxBalance,
      sbtc: sBtcBalance,
    };
  }

  /**
   * Format decimal values
   */
  private formatDecimals(
    value: number | string,
    decimals: number,
    isUmicro: boolean
  ): string {
    if (isUmicro) {
      return (Number(value) * 10 ** decimals).toFixed(0);
    } else {
      return (Number(value) / 10 ** decimals).toFixed(4);
    }
  }

  /**
   * Construct STX balance object
   */
  private constructStxBalance(stxRes: StxResponseBalance): FungibleType {
    return {
      umicro: stxRes.balance,
      balance: this.formatDecimals(stxRes.balance, 6, false),
      decimal: 6,
      name: "Stacks",
      symbol: "STX",
      icon: "/icons/stx.png",
      contract: ".stacks",
      asset_identifier: ".stacks::stx",
    };
  }

  /**
   * Get mock FT metadata
   */
  private async handleGetFtMeta(
    address: string,
    assetIdentifier: string,
    config?: Partial<ApiConfig>
  ): Promise<GetFungibleTokenMeta> {
    await this.delay(200);

    // Return mock FT metadata
    return {
      name: "Bitcoin",
      symbol: "BTC",
      decimals: 8,
      total_supply: "21000000",
      token_uri: "https://example.com/btc-metadata",
      description: "Bitcoin token",
      image_uri: "https://example.com/btc.png",
      image_canonical_uri: "https://example.com/btc.png",
      tx_id: "mock-tx-id",
      sender_address: "mock-sender",
      symbol_key: "btc",
      image_thumbnail_uri: "https://example.com/btc-thumb.png",
      metadata_uri: "https://example.com/btc-metadata",
      metadata_hash: "mock-hash",
      asset_identifier: assetIdentifier,
    };
  }

  /**
   * Get mock NFT metadata
   */
  private async handleGetNftMeta(
    address: string,
    assetIdentifier: string,
    id: number,
    config?: Partial<ApiConfig>
  ): Promise<GetNoneFungibleTokenMeta> {
    await this.delay(200);

    // Return mock NFT metadata
    return {
      count: "5",
      token_uri: "https://example.com/nft-metadata",
      metadata: {
        name: "Mock NFT",
        description: "A mock NFT for testing",
        image: "https://example.com/nft.png",
        attributes: [
          {
            trait_type: "Rarity",
            value: "Common",
          },
        ],
      },
      assets: Promise.resolve([
        {
          asset_identifier: assetIdentifier,
          value: {
            hex: "0x01",
            repr: "1",
          },
          block_height: 12345,
          tx_id: "mock-nft-tx-id",
        },
      ]),
    };
  }

  /**
   * Construct FT balance object
   */
  private async constructFtBalance(
    address: string,
    ftRes: FtResponseBalance,
    config?: Partial<ApiConfig>
  ): Promise<FungibleType | null> {
    const tokenMeta = await this.handleGetFtMeta(
      address,
      ftRes.asset_identifier.split("::")[0],
      config
    );

    if (!tokenMeta) {
      return null;
    }

    return {
      umicro: ftRes.balance,
      balance: this.formatDecimals(ftRes.balance, tokenMeta.decimals, false),
      decimal: tokenMeta.decimals,
      name: tokenMeta.name,
      symbol: tokenMeta.symbol,
      icon: tokenMeta.image_thumbnail_uri,
      contract: tokenMeta.asset_identifier.split("::")[0],
      asset_identifier: tokenMeta.asset_identifier,
    };
  }

  /**
   * Construct NFT balance object
   */
  private async constructNftBalance(
    address: string,
    nftRes: NftResponseBalance,
    config?: Partial<ApiConfig>
  ): Promise<nftInfoType | null> {
    const nftMeta = await this.handleGetNftMeta(
      address,
      nftRes.asset_identifier.split("::")[0],
      1,
      config
    );

    if (!nftMeta) {
      return null;
    }

    return {
      count: nftRes.count,
      token_uri: nftMeta.token_uri,
      metadata: nftMeta.metadata,
      assets: nftMeta.assets,
    };
  }

  /**
   * Clear cache (no-op for mock service)
   */
  clearCache(): void {
    // No cache in mock service, this is a no-op
  }

  /**
   * Fetch all metadata for FT and NFT tokens
   */
  async fetchAllMetadata(
    ftTokens: FtResponseBalance[],
    nftTokens: NftResponseBalance[],
    address: string,
    config?: Partial<ApiConfig>
  ): Promise<{
    ftMetadata: Record<string, ftInfoType | null>;
    nftMetadata: Record<string, NftMetadataResponse>;
  }> {
    await this.delay(300);

    // Return mock metadata
    const ftMetadata: Record<string, ftInfoType | null> = {};
    const nftMetadata: Record<string, NftMetadataResponse> = {};

    for (const ft of ftTokens) {
      ftMetadata[ft.asset_identifier] = await this.handleGetFtMeta(
        address,
        ft.asset_identifier,
        config
      );
    }

    for (const nft of nftTokens) {
      nftMetadata[nft.asset_identifier] = await this.handleGetNftMeta(
        address,
        nft.asset_identifier,
        1,
        config
      );
    }

    return { ftMetadata, nftMetadata };
  }

  /**
   * Fetch NFT holdings for specific assets
   */
  async fetchNftHoldings(
    walletAddress: string,
    assetIdentifiers: string[],
    offset: number = 0,
    limit: number = 50,
    config?: Partial<ApiConfig>
  ): Promise<{ results: nftAssetType[]; total: number } | null> {
    await this.delay(400);

    // Return mock NFT holdings
    return {
      results: assetIdentifiers
        .slice(offset, offset + limit)
        .map((assetId, index) => ({
          asset_identifier: assetId,
          value: {
            hex: `0x${(offset + index + 1).toString(16)}`,
            repr: `${offset + index + 1}`,
          },
          block_height: 12345 + index,
          tx_id: `mock-nft-tx-${offset + index}`,
        })),
      total: assetIdentifiers.length,
    };
  }

  /**
   * Fetch metadata for NFT items
   */
  async fetchNftItemsMetadata(
    nftItems: nftAssetType[],
    config?: Partial<ApiConfig>
  ): Promise<
    (nftAssetType & { metadata?: metaDataType; metadataLoading: boolean })[]
  > {
    await this.delay(300);

    // Return mock items with metadata
    return nftItems.map((item) => ({
      ...item,
      metadata: {
        name: `Mock NFT #${item.value?.repr || "1"}`,
        description: "A mock NFT item",
        image: "https://example.com/nft.png",
        attributes: [],
      },
      metadataLoading: false,
    }));
  }

  /**
   * Fetch metadata for a single NFT item
   */
  async fetchSingleNftItemMetadata(
    item: nftAssetType,
    config?: Partial<ApiConfig>
  ): Promise<
    nftAssetType & { metadata?: metaDataType; metadataLoading: boolean }
  > {
    await this.delay(200);

    // Return item with metadata
    return {
      ...item,
      metadata: {
        name: `Mock NFT #${item.value?.repr || "1"}`,
        description: "A mock NFT item",
        image: "https://example.com/nft.png",
        attributes: [],
      },
      metadataLoading: false,
    };
  }

  /**
   * Generate mock balance data that matches the API schema
   */
  private getMockBalanceData(): AddressBalanceResponse {
    return {
      stx: {
        balance: "10000000000", // 10,000 STX in micro-STX
        estimated_balance: "10000000000",
        pending_balance_inbound: "0",
        pending_balance_outbound: "0",
        total_sent: "5000000000",
        total_received: "15000000000",
        total_fees_sent: "1000000",
        total_miner_rewards_received: "500000000",
        lock_tx_id: "",
        locked: "0",
        lock_height: 0,
        burnchain_lock_height: 0,
        burnchain_unlock_height: 0,
      },
      fungible_tokens: {
        "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token::sbtc-token": {
          balance: "25000000", // 0.25 sBTC in satoshis
          total_sent: "10000000",
          total_received: "35000000",
        },
        "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7.example-token::example-token":
          {
            balance: "1000000000", // 10 tokens
            total_sent: "500000000",
            total_received: "1500000000",
          },
      },
      non_fungible_tokens: {
        "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7.example-nft::example-nft": {
          count: "5",
          total_sent: "2",
          total_received: "7",
        },
        "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7.another-nft::another-nft": {
          count: "3",
          total_sent: "1",
          total_received: "4",
        },
      },
      token_offering_locked: {
        total_locked: "1000000000",
        total_unlocked: "500000000",
        unlock_schedule: [
          {
            amount: "500000000",
            block_height: 100000,
          },
        ],
      },
    };
  }
}
