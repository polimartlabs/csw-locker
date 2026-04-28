import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useSelectedWallet } from "@/hooks/useSelectedWallet";
import WalletHeader from "./WalletHeader";
import MobileNavigationDrawer from "./MobileNavigationDrawer";
import DesktopSidebar from "./DesktopSidebar";
import { useAccountBalanceService } from "@/hooks/useAccountBalanceService";
import { formatNumber } from "@/utils/numbers";
import { useAssetPrices } from "@/contexts/AssetPricesContext";
import {
   loadNetworkPreference,
   saveNetworkPreference,
   NETWORK_CHANGED_EVENT,
   type NetworkPreference,
} from "@/lib/networkPreference";
import { isOnboardingComplete } from "@/lib/onboardingStorage";
import { useWalletConnection } from "@/hooks/useWalletConnection";

interface WalletLayoutProps {
   mode?: "smart-wallet" | "btc-vault";
   vaultMeta?: {
      id: string;
      name: string;
      address: string;
   };
   children: ReactNode;
}

function inferNetworkFromWalletId(walletId: string | undefined): NetworkPreference {
   if (!walletId) return "mainnet";
   return walletId.startsWith("SP") || walletId.startsWith("SM") ? "mainnet" : "testnet";
}

const WalletLayout = ({ mode = "smart-wallet", vaultMeta, children }: WalletLayoutProps) => {
   const navigate = useNavigate();
   const { walletId } = useParams();
   const { selectedWallet } = useSelectedWallet();
   const [selectedNetwork, setSelectedNetwork] = useState<NetworkPreference>(
      () => loadNetworkPreference() ?? inferNetworkFromWalletId(walletId)
   );
   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
   const [, setNetworkParams] = useSearchParams();
   // Track the last wallet id we auto-synced from so we only overwrite a user choice
   // when the wallet itself actually changes — not on every re-render.
   const syncedWalletIdRef = useRef<string | undefined>(undefined);
   const { isWalletConnected } = useWalletConnection();

   const isVaultMode = mode === "btc-vault";
   const { stxBalance, loading } = useAccountBalanceService(isVaultMode ? "" : (walletId ?? ""));
   const { stxUsd: stxUsdPerUnit } = useAssetPrices();

   const handleNetworkSwitch = (network: NetworkPreference) => {
      setSelectedNetwork(network);
      saveNetworkPreference(network);
      setNetworkParams({ network });
   };

   const handleMobileMenuToggle = () => {
      setIsMobileMenuOpen(!isMobileMenuOpen);
   };

   // Auto-detect network on first mount *for a given walletId* only when the user has
   // not already expressed a preference. This preserves manual overrides across navigations.
   useEffect(() => {
      if (walletId == null || walletId === "") return;
      if (syncedWalletIdRef.current === walletId) return;
      syncedWalletIdRef.current = walletId;
      const stored = loadNetworkPreference();
      if (stored != null) {
         setSelectedNetwork(stored);
         setNetworkParams({ network: stored });
         return;
      }
      const inferred = inferNetworkFromWalletId(walletId);
      setSelectedNetwork(inferred);
      setNetworkParams({ network: inferred });
   }, [walletId, setNetworkParams]);

   // Tight first-time UX: once a wallet is connected, route any wallet-layout page
   // through onboarding until completion is recorded.
   useEffect(() => {
      if (!isWalletConnected || isVaultMode) return;
      if (isOnboardingComplete()) return;
      navigate("/onboarding", { replace: true });
   }, [isWalletConnected, navigate, isVaultMode]);

   // Listen for external preference changes (other tabs, other components).
   useEffect(() => {
      const onChange = (e: Event) => {
         const ce = e as CustomEvent<NetworkPreference | null>;
         if (ce.detail === "mainnet" || ce.detail === "testnet") {
            setSelectedNetwork(ce.detail);
         }
      };
      window.addEventListener(NETWORK_CHANGED_EVENT, onChange);
      return () => window.removeEventListener(NETWORK_CHANGED_EVENT, onChange);
   }, []);

   const effectiveWalletId = isVaultMode
      ? (vaultMeta?.id ?? "")
      : (walletId ?? selectedWallet?.contractId ?? selectedWallet?.address ?? "");

   const currentWallet = {
      name: isVaultMode ? (vaultMeta?.name ?? "BTC vault") : selectedWallet?.name,
      contractId: isVaultMode
         ? (vaultMeta?.address ?? effectiveWalletId ?? "")
         : (selectedWallet?.contractId ?? effectiveWalletId ?? ""),
      balance: isVaultMode
         ? "—"
         : loading && !stxBalance ? "—" : stxBalance ? formatNumber(Math.abs(+stxBalance.balance), 2) : "0.00",
      usdValue: isVaultMode
         ? "—"
         : !stxBalance
         ? "—"
         : stxUsdPerUnit != null
           ? `$${formatNumber(+stxBalance.balance * stxUsdPerUnit, 2)}`
           : "—",
   };

   return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
         <WalletHeader
            mode={mode}
            currentWallet={currentWallet}
            selectedNetwork={selectedNetwork}
            onNetworkSwitch={handleNetworkSwitch}
            onMobileMenuToggle={handleMobileMenuToggle}
         />

         <MobileNavigationDrawer
            mode={mode}
            isOpen={isMobileMenuOpen}
            onOpenChange={setIsMobileMenuOpen}
            currentWallet={currentWallet}
            walletId={effectiveWalletId || undefined}
         />

         <div className="container mx-auto px-4 py-8">
            <div className="grid lg:grid-cols-4 gap-8">
               <DesktopSidebar
                  mode={mode}
                  currentWallet={currentWallet}
                  walletId={effectiveWalletId || undefined}
               />

               {/* Main Content */}
               <div className="lg:col-span-3">{children}</div>
            </div>
         </div>
      </div>
   );
};

export default WalletLayout;
