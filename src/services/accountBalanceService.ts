import { getClientConfig } from "@/utils/chain-config";
import axios from "axios";
import {
  AccountBalanceType,
  AddressBalanceResponse,
  FtResponseBalance,
  FungibleType,
  nftInfoType,
  NftMetadataResponse,
  NftResponseBalance,
  StxResponseBalance,
} from "./types";

/**
 * Configuration interface for API requests
 * @interface ApiConfig
 */
interface ApiConfig {
  baseUrl: string; // Base URL for the API (e.g., https://api.hiro.so)
  timeout?: number; // Request timeout in milliseconds (default: 10000)
  headers?: Record<string, string>; // Additional headers for requests
}

/**
 * Service class for fetching and managing account balance data from Stacks blockchain
 * Handles STX, FT (Fungible Token), and NFT (Non-Fungible Token) balances
 * Includes metadata fetching for enhanced token information
 */
export class AccountBalanceService {
  // Default configuration for API requests
  private defaultConfig: ApiConfig = {
    baseUrl: "https://api.hiro.so", // Default to Hiro API
    timeout: 10000, // 10 second timeout
    headers: {
      "Content-Type": "application/json",
    },
  };

  // Cache for metadata to avoid duplicate requests
  private metadataCache = new Map<string, any>();

  // Rate limiting configuration
  private readonly MAX_CONCURRENT_REQUESTS = 3;
  private readonly REQUEST_DELAY_MS = 200; // 200ms delay between requests
  private activeRequests = 0;

  /**
   * Constructor to initialize the service with custom configuration
   * @param config - Optional configuration to override defaults
   */
  constructor(config?: Partial<ApiConfig>) {
    if (config) {
      this.defaultConfig = { ...this.defaultConfig, ...config };
    }
  }

  /**
   * Rate limiting helper - wait if too many requests are active
   */
  private async waitForRateLimit(): Promise<void> {
    while (this.activeRequests >= this.MAX_CONCURRENT_REQUESTS) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.REQUEST_DELAY_MS)
      );
    }
  }

  /**
   * Delay helper for spacing out requests
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get cached metadata or null if not cached
   */
  private getCachedMetadata(key: string): any | null {
    return this.metadataCache.get(key) || null;
  }

  /**
   * Cache metadata
   */
  private setCachedMetadata(key: string, data: any): void {
    this.metadataCache.set(key, data);
  }

  /**
   * Clear metadata cache
   */
  public clearCache(): void {
    this.metadataCache.clear();
  }

  /**
   * Generic function to fetch balance data from the Stacks API
   * @param address - The wallet address to fetch balances for
   * @param config - Optional configuration override
   * @returns Promise resolving to balance data or null if failed
   */
  private async getBalance<T>(
    address: string,
    config?: Partial<ApiConfig>
  ): Promise<T | null> {
    const apiConfig = { ...this.defaultConfig, ...config };

    try {
      const response = await axios.get(
        `${apiConfig.baseUrl}/extended/v1/address/${address}/balances`,
        {
          timeout: apiConfig.timeout,
          headers: apiConfig.headers,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Failed to fetch balance data:", error);
      return null;
    }
  }

  /**
   * Fetches STX (Stacks) balance for a given address
   * @param address - The wallet address to fetch STX balance for
   * @param config - Optional configuration override
   * @returns Promise resolving to STX balance data or null if failed
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
   * Fetches all Fungible Token (FT) balances for a given address
   * @param address - The wallet address to fetch FT balances for
   * @param config - Optional configuration override
   * @returns Promise resolving to array of FT balance data
   */
  async getFtBalance(
    address: string,
    config?: Partial<ApiConfig>
  ): Promise<FtResponseBalance[]> {
    const balanceData = await this.getBalance<AddressBalanceResponse>(
      address,
      config
    );

    // Return empty array if no fungible tokens found
    if (!balanceData?.fungible_tokens) {
      return [];
    }

    // Transform the fungible_tokens object into an array with asset_identifier
    return Object.keys(balanceData.fungible_tokens).map((key) => ({
      ...balanceData.fungible_tokens[key],
      asset_identifier: key, // Add the asset identifier for easier access
    }));
  }

  /**
   * Fetches all Non-Fungible Token (NFT) balances for a given address
   * @param address - The wallet address to fetch NFT balances for
   * @param config - Optional configuration override
   * @returns Promise resolving to array of NFT balance data
   */
  async getNftBalance(
    address: string,
    config?: Partial<ApiConfig>
  ): Promise<NftResponseBalance[]> {
    const balanceData = await this.getBalance<AddressBalanceResponse>(
      address,
      config
    );

    // Return empty array if no non-fungible tokens found
    if (!balanceData?.non_fungible_tokens) {
      return [];
    }

    // Transform the non_fungible_tokens object into an array with asset_identifier
    return Object.keys(balanceData.non_fungible_tokens).map((key) => ({
      ...balanceData.non_fungible_tokens[key],
      asset_identifier: key, // Add the asset identifier for easier access
    }));
  }

  /**
   * Get complete account balances (STX, FT, NFT)
   */
  async getAccountBalances(
    address: string,
    config?: Partial<ApiConfig>
  ): Promise<AccountBalanceType | null> {
    if (!address) return null;

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
    const sbtcAsset =
      getClientConfig(address).network === "mainnet"
        ? "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token::sbtc-token"
        : "SN69P7RZRKK8ERQCCABHT2JWKB2S4DHH9H74231T.sbtc-token::sbtc-token";
    const sbtcToken = ftBalance.find(
      (token) => token.asset_identifier === sbtcAsset
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
   * Get complete account balances with metadata (STX, FT, NFT)
   * @deprecated Use getAccountBalances() and fetchMetadata() separately for better performance
   */
  async getAccountBalancesWithMetadata(
    address: string,
    config?: Partial<ApiConfig>
  ): Promise<{
    balances: AccountBalanceType | null;
    nftMetadata: Record<string, NftMetadataResponse>;
    ftMetadata: Record<string, any>;
  }> {
    if (!address) {
      return {
        balances: null,
        nftMetadata: {},
        ftMetadata: {},
      };
    }

    // Get balances first
    const balances = await this.getAccountBalances(address, config);

    if (!balances) {
      return {
        balances: null,
        nftMetadata: {},
        ftMetadata: {},
      };
    }

    // Limit the number of tokens to process to avoid overwhelming the API
    const MAX_TOKENS_TO_PROCESS = 10;
    const limitedFtTokens = balances.ft.slice(0, MAX_TOKENS_TO_PROCESS);
    const limitedNftTokens = balances.nft.slice(0, MAX_TOKENS_TO_PROCESS);

    // Fetch metadata sequentially to avoid rate limiting
    const nftMetadata = await this.fetchAllNftMetadata(
      limitedNftTokens,
      address,
      config
    );
    const ftMetadata = await this.fetchAllFtMetadata(
      limitedFtTokens,
      address,
      config
    );

    return {
      balances,
      nftMetadata,
      ftMetadata,
    };
  }

  /**
   * Fetch metadata for FT tokens separately
   * @param fts - Array of FT tokens to fetch metadata for
   * @param address - Wallet address (for context)
   * @param config - Optional configuration override
   * @returns Promise resolving to FT metadata object
   */
  async fetchFtMetadata(
    fts: FtResponseBalance[],
    address: string,
    config?: Partial<ApiConfig>
  ): Promise<Record<string, any>> {
    return this.fetchAllFtMetadata(fts, address, config);
  }

  /**
   * Fetch metadata for NFT tokens separately
   * @param nfts - Array of NFT tokens to fetch metadata for
   * @param address - Wallet address (for context)
   * @param config - Optional configuration override
   * @returns Promise resolving to NFT metadata object
   */
  async fetchNftMetadata(
    nfts: NftResponseBalance[],
    address: string,
    config?: Partial<ApiConfig>
  ): Promise<Record<string, NftMetadataResponse>> {
    return this.fetchAllNftMetadata(nfts, address, config);
  }

  /**
   * Fetch NFT holdings for a specific asset with pagination
   * @param principal - The wallet address to fetch holdings for
   * @param assetIdentifiers - Array of asset identifiers to fetch holdings for
   * @param offset - Pagination offset (default: 0)
   * @param limit - Number of results per page (default: 50)
   * @param config - Optional configuration override
   * @returns Promise resolving to NFT holdings data
   */
  async fetchNftHoldings(
    principal: string,
    assetIdentifiers: string[],
    offset: number = 0,
    limit: number = 50,
    config?: Partial<ApiConfig>
  ): Promise<any> {
    if (!principal || !assetIdentifiers || assetIdentifiers.length === 0) {
      return null;
    }

    const apiConfig = { ...this.defaultConfig, ...config };

    try {
      // Join asset identifiers with comma for the API
      const assetIdentifiersParam = assetIdentifiers.join(",");

      const response = await axios.get(
        `${apiConfig.baseUrl}/extended/v1/tokens/nft/holdings?principal=${principal}&asset_identifiers=${assetIdentifiersParam}&offset=${offset}&limit=${limit}`,
        {
          timeout: apiConfig.timeout,
          headers: apiConfig.headers,
        }
      );

      return response.data;
    } catch (error) {
      console.error("Failed to fetch NFT holdings:", error);
      return null;
    }
  }

  /**
   * Fetch metadata for individual NFT items
   * @param nftItems - Array of NFT items with asset_identifier and value
   * @param config - Optional configuration override
   * @returns Promise resolving to NFT items with metadata
   */
  async fetchNftItemsMetadata(
    nftItems: any[],
    config?: Partial<ApiConfig>
  ): Promise<any[]> {
    if (!nftItems || nftItems.length === 0) {
      return [];
    }

    const apiConfig = { ...this.defaultConfig, ...config };
    const itemsWithMetadata = [];

    for (let i = 0; i < nftItems.length; i++) {
      const item = nftItems[i];

      // Add delay between requests to avoid rate limiting
      if (i > 0) {
        await this.delay(this.REQUEST_DELAY_MS);
      }

      try {
        // Extract principal and token ID from the item
        const principal = item.asset_identifier?.split("::")[0];
        const tokenId = item.value?.repr?.replace("u", "");

        if (!principal || !tokenId) {
          itemsWithMetadata.push({
            ...item,
            metadata: null,
          });
          continue;
        }

        // Check cache first
        const cacheKey = `nft_item_${principal}_${tokenId}`;
        const cachedData = this.getCachedMetadata(cacheKey);

        if (cachedData) {
          itemsWithMetadata.push({
            ...item,
            metadata: cachedData,
          });
          continue;
        }

        // Wait for rate limit
        await this.waitForRateLimit();
        this.activeRequests++;

        const response = await axios.get(
          `${apiConfig.baseUrl}/metadata/v1/nft/${principal}/${tokenId}`,
          {
            timeout: apiConfig.timeout,
            headers: apiConfig.headers,
          }
        );

        // Cache the result
        this.setCachedMetadata(cacheKey, response.data);

        itemsWithMetadata.push({
          ...item,
          metadata: response.data,
        });
      } catch (error) {
        itemsWithMetadata.push({
          ...item,
          metadata: null,
        });
      } finally {
        this.activeRequests--;
      }
    }

    return itemsWithMetadata;
  }

  /**
   * Fetch metadata for a single NFT item
   * @param item - NFT item with asset_identifier and value
   * @param config - Optional configuration override
   * @returns Promise resolving to NFT item with metadata
   */
  async fetchSingleNftItemMetadata(
    item: any,
    config?: Partial<ApiConfig>
  ): Promise<any> {
    if (!item) {
      return null;
    }

    const apiConfig = { ...this.defaultConfig, ...config };

    try {
      // Extract principal and token ID from the item
      const principal = item.asset_identifier?.split("::")[0];
      const tokenId = item.value?.repr?.replace("u", "");

      if (!principal || !tokenId) {
        return {
          ...item,
          metadata: null,
        };
      }

      // Check cache first
      const cacheKey = `nft_item_${principal}_${tokenId}`;
      const cachedData = this.getCachedMetadata(cacheKey);

      if (cachedData) {
        return {
          ...item,
          metadata: cachedData,
        };
      }

      // Add delay before making the request
      await this.delay(this.REQUEST_DELAY_MS);

      // Wait for rate limit
      await this.waitForRateLimit();
      this.activeRequests++;

      const response = await axios.get(
        `${apiConfig.baseUrl}/metadata/v1/nft/${principal}/${tokenId}`,
        {
          timeout: apiConfig.timeout,
          headers: apiConfig.headers,
        }
      );

      // Cache the result
      this.setCachedMetadata(cacheKey, response.data);

      return {
        ...item,
        metadata: response.data,
      };
    } catch (error) {
      return {
        ...item,
        metadata: null,
      };
    } finally {
      this.activeRequests--;
    }
  }

  /**
   * Fetch metadata for both FT and NFT tokens
   * @param fts - Array of FT tokens to fetch metadata for
   * @param nfts - Array of NFT tokens to fetch metadata for
   * @param address - Wallet address (for context)
   * @param config - Optional configuration override
   * @returns Promise resolving to both FT and NFT metadata objects
   */
  async fetchAllMetadata(
    fts: FtResponseBalance[],
    nfts: NftResponseBalance[],
    address: string,
    config?: Partial<ApiConfig>
  ): Promise<{
    ftMetadata: Record<string, any>;
    nftMetadata: Record<string, NftMetadataResponse>;
  }> {
    // Limit the number of tokens to process to avoid overwhelming the API
    const MAX_TOKENS_TO_PROCESS = 10;
    const limitedFtTokens = fts.slice(0, MAX_TOKENS_TO_PROCESS);
    const limitedNftTokens = nfts.slice(0, MAX_TOKENS_TO_PROCESS);

    // Fetch metadata sequentially to avoid rate limiting
    const [nftMetadata, ftMetadata] = await Promise.all([
      this.fetchAllNftMetadata(limitedNftTokens, address, config),
      this.fetchAllFtMetadata(limitedFtTokens, address, config),
    ]);

    return {
      ftMetadata,
      nftMetadata,
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
   * Get FT metadata from Hiro API
   */
  private async handleGetFtMeta(
    address: string,
    assetIdentifier: string,
    config?: Partial<ApiConfig>
  ): Promise<any | null> {
    const apiConfig = { ...this.defaultConfig, ...config };

    try {
      const response = await axios.get(
        `${apiConfig.baseUrl}/metadata/v1/ft/${
          assetIdentifier?.split("::")[0]
        }`,
        {
          timeout: apiConfig.timeout,
          headers: apiConfig.headers,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Failed to fetch FT metadata:", error);
      return null;
    }
  }

  /**
   * Fetch metadata for all NFT collections with rate limiting and caching
   */
  private async fetchAllNftMetadata(
    nfts: NftResponseBalance[],
    address: string,
    config?: Partial<ApiConfig>
  ): Promise<Record<string, NftMetadataResponse>> {
    if (!nfts || nfts.length === 0) return {};

    const apiConfig = { ...this.defaultConfig, ...config };
    const results: Record<string, NftMetadataResponse> = {};

    // Process NFTs in batches to avoid overwhelming the API
    for (let i = 0; i < nfts.length; i++) {
      const nft = nfts[i];

      // Safety check for asset_identifier
      if (!nft.asset_identifier) {
        continue;
      }

      // Check cache first
      const cacheKey = `nft_${nft.asset_identifier}`;
      const cachedData = this.getCachedMetadata(cacheKey);
      if (cachedData) {
        results[nft.asset_identifier] = cachedData;
        continue;
      }

      // Wait for rate limit
      await this.waitForRateLimit();
      this.activeRequests++;

      try {
        const principal = nft.asset_identifier?.split("::")[0];
        const response = await axios.get(
          `${apiConfig.baseUrl}/metadata/v1/nft/${principal}/1`,
          {
            timeout: apiConfig.timeout,
            headers: apiConfig.headers,
          }
        );

        // Cache the result
        this.setCachedMetadata(cacheKey, response.data);
        results[nft.asset_identifier] = response.data;
      } catch (error) {
        // Handle specific error types
        if (error.response?.status === 429) {
        } else if (
          error.code === "ERR_NETWORK" ||
          error.message?.includes("CORS")
        ) {
        } else {
          console.error(
            `Failed to fetch NFT metadata for ${nft.asset_identifier}:`,
            error
          );
        }
        results[nft.asset_identifier] = null;
      } finally {
        this.activeRequests--;

        // Add delay between requests to avoid rate limiting
        if (i < nfts.length - 1) {
          await this.delay(this.REQUEST_DELAY_MS);
        }
      }
    }

    return results;
  }

  /**
   * Fetch metadata for all FT tokens with rate limiting and caching
   */
  private async fetchAllFtMetadata(
    fts: FtResponseBalance[],
    address: string,
    config?: Partial<ApiConfig>
  ): Promise<Record<string, any>> {
    if (!fts || fts.length === 0) return {};

    const apiConfig = { ...this.defaultConfig, ...config };
    const results: Record<string, any> = {};

    // Process tokens in batches to avoid overwhelming the API
    for (let i = 0; i < fts.length; i++) {
      const ft = fts[i];

      // Safety check for asset_identifier
      if (!ft.asset_identifier || ft.asset_identifier === ".stacks::stx") {
        continue;
      }

      // Check cache first
      const cacheKey = `ft_${ft.asset_identifier}`;
      const cachedData = this.getCachedMetadata(cacheKey);
      if (cachedData) {
        results[ft.asset_identifier] = cachedData;
        continue;
      }

      // Wait for rate limit
      await this.waitForRateLimit();
      this.activeRequests++;

      try {
        const principal = ft.asset_identifier?.split("::")[0];
        const response = await axios.get(
          `${apiConfig.baseUrl}/metadata/v1/ft/${principal}`,
          {
            timeout: apiConfig.timeout,
            headers: apiConfig.headers,
          }
        );

        // Cache the result
        this.setCachedMetadata(cacheKey, response.data);
        results[ft.asset_identifier] = response.data;
      } catch (error) {
        // Handle specific error types
        if (error.response?.status === 429) {
        } else if (
          error.code === "ERR_NETWORK" ||
          error.message?.includes("CORS")
        ) {
        } else {
          console.error(
            `Failed to fetch FT metadata for ${ft.asset_identifier}:`,
            error
          );
        }
        results[ft.asset_identifier] = null;
      } finally {
        this.activeRequests--;

        // Add delay between requests to avoid rate limiting
        if (i < fts.length - 1) {
          await this.delay(this.REQUEST_DELAY_MS);
        }
      }
    }

    return results;
  }

  /**
   * Get NFT metadata from Hiro API
   */
  private async handleGetNftMeta(
    principal: string,
    tokenId: string,
    config?: Partial<ApiConfig>
  ): Promise<NftMetadataResponse | null> {
    const apiConfig = { ...this.defaultConfig, ...config };

    try {
      const response = await axios.get(
        `${apiConfig.baseUrl}/metadata/v1/nft/${principal}/${tokenId}`,
        {
          timeout: apiConfig.timeout,
          headers: apiConfig.headers,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Failed to fetch NFT metadata:", error);
      return null;
    }
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
      ftRes.asset_identifier,
      config
    );
    return {
      umicro: ftRes?.balance || "0",
      balance: this.formatDecimals(
        ftRes?.balance || 0,
        +tokenMeta?.decimals || 0,
        false
      ),
      decimal:
        ftRes.asset_identifier === ".stacks" ? 6 : tokenMeta?.decimals || 0,
      name: tokenMeta?.name || ftRes?.asset_identifier?.split("::")[1],
      symbol: tokenMeta?.symbol || ftRes?.asset_identifier?.split("::")[1],
      icon: tokenMeta?.image_thumbnail_uri || tokenMeta?.image_uri || "",
      contract: tokenMeta?.asset_identifier?.split("::")[0],
      asset_identifier: tokenMeta?.asset_identifier,
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
    const apiConfig = { ...this.defaultConfig, ...config };

    // Extract principal (contract address) from asset_identifier
    const principal = nftRes.asset_identifier?.split("::")[0];

    // For now, we'll use token_id "1" as a default, but this should be dynamic
    // based on the actual NFT holdings
    const nftMeta = await this.handleGetNftMeta(principal, "1", config);
    if (!nftMeta) {
      return null;
    }

    try {
      const assetsResponse = await axios.get(
        `${apiConfig.baseUrl}/extended/v1/tokens/nft/holdings?principal=${address}&asset_identifiers=${nftRes.asset_identifier}&offset=0`,
        {
          timeout: apiConfig.timeout,
          headers: apiConfig.headers,
        }
      );

      return {
        count: nftRes.count,
        token_uri: nftMeta.token_uri,
        metadata: {
          name: nftMeta.metadata?.name,
          description: nftMeta.metadata?.description || "",
          image:
            nftMeta.metadata?.cached_image || nftMeta.metadata?.image || "",
          attributes: nftMeta.metadata?.attributes || [],
        },
        assets: Promise.resolve(assetsResponse.data),
      };
    } catch (error) {
      console.error("Failed to fetch NFT assets:", error);
      return null;
    }
  }
}
