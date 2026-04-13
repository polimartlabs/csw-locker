import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProviders } from "@/contexts/AppProviders";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";

// Pages
import About from "@/pages/About";
import ActionHistory from "@/pages/ActionHistory";
import ContractActions from "@/pages/ContractActions";
import ContractDetails from "@/pages/ContractDetails";
import CreateWallet from "@/pages/CreateWallet";
import Dashboard from "@/pages/Dashboard";
import GenericActions from "@/pages/GenericActions";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import Privacy from "@/pages/Privacy";
import Products from "@/pages/Products";
import ReceiveAssets from "@/pages/ReceiveAssets";
import SendAssets from "@/pages/SendAssets";
import Stacking from "@/pages/Stacking";
import Terms from "@/pages/Terms";
import WalletDetails from "@/pages/WalletDetails";
import WalletSelector from "@/pages/WalletSelector";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AppProviders>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/wallet-selector" element={<WalletSelector />} />
            <Route path="/create-wallet" element={<CreateWallet />} />
            <Route path="/dashboard/:walletId" element={<Dashboard />} />
            <Route path="/send/:walletId" element={<SendAssets />} />
            <Route path="/receive/:walletId" element={<ReceiveAssets />} />
            <Route path="/history/:walletId" element={<ActionHistory />} />
            <Route path="/contract/:walletId" element={<ContractDetails />} />
            <Route
              path="/contract-actions/:walletId"
              element={<ContractActions />}
            />
            <Route path="/wallet/:walletId" element={<WalletDetails />} />
            <Route path="/actions/:walletId" element={<GenericActions />} />
            <Route path="/stacking/:walletId" element={<Stacking />} />
            <Route path="/about" element={<About />} />
            <Route path="/products" element={<Products />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppProviders>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
