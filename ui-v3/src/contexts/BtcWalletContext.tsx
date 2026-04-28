import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useWalletContext } from "@/contexts/WalletContext";
import { useAssetPrices } from "@/contexts/AssetPricesContext";
import { getAddressBalanceSats } from "@/services/btcMempoolService";

/**
 * Bitcoin side of the single Stacks/@stacks/connect wallet session.
 * Addresses come from the main `WalletContext` (populated by `connect()` in `@stacks/connect`),
 * so there is no separate BTC-only wallet session to manage.
 */

type BtcWalletContextValue = {
  /** Kept for compatibility with consumers that track a "dedicated" connection — always null now. */
  satsBtcAddress: string | null;
  /** BTC payment address from the Stacks connect session (e.g. Leather). */
  stacksLinkedBtcAddress: string | null;
  /** Address used for balance, send, and history. */
  activeBtcAddress: string | null;
  connectionLabel: "stacks" | "none";
  balanceSats: number | null;
  usdPrice: number | null;
  loadingBalance: boolean;
  connecting: boolean;
  /** Opens the single `@stacks/connect` flow (STX + BTC in one session). */
  connectBtcWallet: () => Promise<void>;
  /** No-op retained for API compatibility — full disconnect goes through `disconnectWallet`. */
  disconnectDedicatedBtc: () => void;
  refreshBtc: () => Promise<void>;
  /** Taproot (P2TR) when distinct from payment, or from the connect session. */
  taprootAddress: string | null;
};

const BtcWalletContext = createContext<BtcWalletContextValue | null>(null);

export const BtcWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { walletData, isConnecting, connectWallet } = useWalletContext();
  const { btcUsd: btcSpotUsd } = useAssetPrices();
  const stacksLinkedBtc = walletData?.preferredBtc?.address ?? walletData?.addresses.btc[0]?.address ?? null;
  const [balanceSats, setBalanceSats] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const usdPrice = btcSpotUsd;

  const activeBtcAddress = stacksLinkedBtc;
  const taprootAddress = walletData?.taprootBtc?.address ?? null;
  const connectionLabel: "stacks" | "none" = stacksLinkedBtc ? "stacks" : "none";

  const refreshBtc = useCallback(async () => {
    if (!activeBtcAddress) {
      setBalanceSats(null);
      setLoadingBalance(false);
      return;
    }
    setLoadingBalance(true);
    const sats = await getAddressBalanceSats(activeBtcAddress);
    if (sats != null) setBalanceSats(sats);
    setLoadingBalance(false);
  }, [activeBtcAddress]);

  useEffect(() => {
    void refreshBtc();
  }, [refreshBtc]);

  const connectBtcWallet = useCallback(async () => {
    await connectWallet();
  }, [connectWallet]);

  const disconnectDedicatedBtc = useCallback(() => {
    // no-op: full wallet disconnect lives on `WalletContext.disconnectWallet`.
  }, []);

  const value = useMemo<BtcWalletContextValue>(
    () => ({
      satsBtcAddress: null,
      stacksLinkedBtcAddress: stacksLinkedBtc,
      activeBtcAddress,
      connectionLabel,
      balanceSats,
      usdPrice,
      loadingBalance,
      connecting: isConnecting,
      connectBtcWallet,
      disconnectDedicatedBtc,
      refreshBtc,
      taprootAddress,
    }),
    [
      stacksLinkedBtc,
      activeBtcAddress,
      taprootAddress,
      connectionLabel,
      balanceSats,
      btcSpotUsd,
      loadingBalance,
      isConnecting,
      connectBtcWallet,
      disconnectDedicatedBtc,
      refreshBtc,
      usdPrice,
    ]
  );

  return <BtcWalletContext.Provider value={value}>{children}</BtcWalletContext.Provider>;
};

export const useBtcWallet = () => {
  const ctx = useContext(BtcWalletContext);
  if (!ctx) throw new Error("useBtcWallet must be used within BtcWalletProvider");
  return ctx;
};
