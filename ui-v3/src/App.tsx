
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { WalletProvider } from "@/contexts/WalletContext";
import { BtcWalletProvider } from "@/contexts/BtcWalletContext";
import { AssetPricesProvider } from "@/contexts/AssetPricesContext";
import { WalletConnectionProvider } from "@/contexts/WalletConnectionContext";
import { DemoModeProvider } from "@/contexts/DemoModeContext";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import WalletSelector from "./pages/WalletSelector";
import CreateBtcVault from "./pages/CreateBtcVault";
import BtcVaultPolicies from "./pages/BtcVaultPolicies";
import BtcVaultSettings from "./pages/BtcVaultSettings";
import BtcVaultSignatures from "./pages/BtcVaultSignatures";
import BtcVaultSend from "./pages/BtcVaultSend";
import CreateWallet from "./pages/CreateWallet";
import WalletDetails from "./pages/WalletDetails";
import SendAssets from "./pages/SendAssets";
import ReceiveAssets from "./pages/ReceiveAssets";
import Stacking from "./pages/Stacking";
import GenericActions from "./pages/GenericActions";
import ContractActions from "./pages/ContractActions";
import ActionHistory from "./pages/ActionHistory";
import ContractDetails from "./pages/ContractDetails";
import Terms from "./pages/Terms";
import About from "./pages/About";
import Products from "./pages/Products";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import Locks from "./pages/Locks";

const VaultsToLocksRedirect = () => {
  const { walletId } = useParams<{ walletId: string }>();
  if (!walletId) return <Navigate to="/" replace />;
  return <Navigate to={`/locks/${walletId}`} replace />;
};

const LegacyBtcVaultDashboardRedirect = () => {
  const { vaultId } = useParams<{ vaultId: string }>();
  if (!vaultId) return <Navigate to="/wallet-selector" replace />;
  return <Navigate to={`/dashboard/${vaultId}`} replace />;
};

const LegacyBtcVaultPolicyRedirect = () => {
  const { vaultId } = useParams<{ vaultId: string }>();
  if (!vaultId) return <Navigate to="/wallet-selector" replace />;
  return <Navigate to={`/btc-vault/${vaultId}/policies`} replace />;
};

const LegacyBtcVaultSettingsRedirect = () => {
  const { vaultId } = useParams<{ vaultId: string }>();
  if (!vaultId) return <Navigate to="/wallet-selector" replace />;
  return <Navigate to={`/btc-vault/${vaultId}/settings`} replace />;
};

const LegacyBtcVaultSignaturesRedirect = () => {
  const { vaultId } = useParams<{ vaultId: string }>();
  if (!vaultId) return <Navigate to="/wallet-selector" replace />;
  return <Navigate to={`/btc-vault/${vaultId}/signatures`} replace />;
};

const LegacyBtcVaultSendRedirect = () => {
  const { vaultId } = useParams<{ vaultId: string }>();
  if (!vaultId) return <Navigate to="/wallet-selector" replace />;
  return <Navigate to={`/btc-vault/${vaultId}/send`} replace />;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <WalletConnectionProvider>
          <DemoModeProvider>
            <WalletProvider>
              <AssetPricesProvider>
                <BtcWalletProvider>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/onboarding" element={<Onboarding />} />
                    <Route path="/wallet-selector" element={<WalletSelector />} />
                    <Route path="/create-btc-vault" element={<CreateBtcVault />} />
                    <Route path="/btc-vault/:vaultId" element={<LegacyBtcVaultDashboardRedirect />} />
                    <Route path="/btc-vault/:vaultId/policies" element={<BtcVaultPolicies />} />
                    <Route path="/btc-vault/:vaultId/settings" element={<BtcVaultSettings />} />
                    <Route path="/btc-vault/:vaultId/signatures" element={<BtcVaultSignatures />} />
                    <Route path="/btc-vault/:vaultId/send" element={<BtcVaultSend />} />
                    <Route path="/btcvault/:vaultId/policy" element={<LegacyBtcVaultPolicyRedirect />} />
                    <Route path="/btcvault/:vaultId/settings" element={<LegacyBtcVaultSettingsRedirect />} />
                    <Route path="/btcvault/:vaultId/signatures" element={<LegacyBtcVaultSignaturesRedirect />} />
                    <Route path="/btcvault/:vaultId/send" element={<LegacyBtcVaultSendRedirect />} />
                    <Route path="/create-wallet" element={<CreateWallet />} />
                    <Route path="/wallet-details/:walletId" element={<WalletDetails />} />
                    <Route path="/dashboard/:walletId" element={<Dashboard />} />
                    <Route path="/send/:walletId?" element={<SendAssets />} />
                    <Route path="/receive/:walletId?" element={<ReceiveAssets />} />
                    <Route path="/stacking/:walletId?" element={<Stacking />} />
                    <Route path="/history/:walletId?" element={<ActionHistory />} />
                    <Route path="/actions/:walletId?" element={<GenericActions />} />
                    <Route path="/contract-actions/:walletId?" element={<ContractActions />} />
                    <Route path="/contract-details/:walletId?" element={<ContractDetails />} />
                    <Route path="/vaults/:walletId" element={<VaultsToLocksRedirect />} />
                    <Route path="/locks/:walletId?" element={<Locks />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BtcWalletProvider>
              </AssetPricesProvider>
            </WalletProvider>
          </DemoModeProvider>
        </WalletConnectionProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
