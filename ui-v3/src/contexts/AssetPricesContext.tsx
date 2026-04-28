import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchAllAssetSpotUsd } from "@/lib/assetUsd";

type AssetPricesValue = {
  stxUsd: number | null;
  btcUsd: number | null;
  /** True until first successful fetch (even if prices are null) */
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AssetPricesValue | null>(null);
const STALE_MS = 120_000;

export const AssetPricesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stxUsd, setStxUsd] = useState<number | null>(null);
  const [btcUsd, setBtcUsd] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setError(null);
    try {
      const { stxUsd: s, btcUsd: b } = await fetchAllAssetSpotUsd();
      setStxUsd(s);
      setBtcUsd(b);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Price fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const t = setInterval(() => void refresh(), STALE_MS);
    return () => clearInterval(t);
  }, [refresh]);

  const value = useMemo<AssetPricesValue>(
    () => ({
      stxUsd,
      btcUsd,
      loading,
      error,
      refresh,
    }),
    [stxUsd, btcUsd, loading, error, refresh]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useAssetPrices(): AssetPricesValue {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAssetPrices must be used within AssetPricesProvider");
  return c;
}
