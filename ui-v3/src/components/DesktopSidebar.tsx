import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { Wallet, Send, History, ArrowDown, ArrowUp, CheckSquare, Puzzle, ScrollText, Lock, ShieldCheck, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

type NavEntry = { path: string; label: string; icon: LucideIcon };

interface DesktopSidebarProps {
  mode?: "smart-wallet" | "btc-vault";
  currentWallet: {
    name: string;
    contractId: string;
    balance: string;
    usdValue: string;
    extensions?: string[];
  };
  walletId?: string;
}

const DesktopSidebar = ({ mode = "smart-wallet", currentWallet, walletId }: DesktopSidebarProps) => {
  const location = useLocation();
  const withWallet = (segment: string) => (walletId ? `/${segment}/${walletId}` : "/wallet-selector");
  const currentPathWithHash = `${location.pathname}${location.hash}`;

  const isStackingActive = currentWallet.extensions?.some(
    (ext) => ext.toLowerCase().includes("stacking") || ext.toLowerCase().includes("stack")
  );
  const isVaultMode = mode === "btc-vault";

  const afterCore: NavEntry[] = [
    { path: withWallet("locks"), label: "Locks", icon: Lock },
    { path: withWallet("actions"), label: "Extensions", icon: Puzzle },
    { path: withWallet("contract-actions"), label: "Contract Actions", icon: CheckSquare },
    { path: withWallet("history"), label: "History", icon: History },
    { path: withWallet("contract-details"), label: "Contract Details", icon: ScrollText },
  ];

  const core: NavEntry[] = [
    { path: withWallet("dashboard"), label: "Dashboard", icon: Wallet },
    { path: withWallet("send"), label: "Send", icon: Send },
    { path: withWallet("receive"), label: "Receive", icon: ArrowDown },
  ];

  const vaultBasePath = walletId ? `/dashboard/${walletId}` : "/wallet-selector";
  const vaultNavItems: NavEntry[] = [
    { path: vaultBasePath, label: "Dashboard", icon: Wallet },
    { path: walletId ? `/btc-vault/${walletId}/send` : "/wallet-selector", label: "Send", icon: Send },
    { path: withWallet("receive"), label: "Receive", icon: ArrowDown },
    { path: withWallet("history"), label: "History", icon: History },
    { path: walletId ? `/locks/${walletId}` : "/locks", label: "Vault Locks", icon: Lock },
    { path: walletId ? `/btc-vault/${walletId}/policies` : "/wallet-selector", label: "Policies", icon: ShieldCheck },
    { path: walletId ? `/btc-vault/${walletId}/settings` : "/wallet-selector", label: "Settings", icon: Settings },
  ];

  const navItems: NavEntry[] = isVaultMode
    ? vaultNavItems
    : isStackingActive
      ? [...core, { path: withWallet("stacking"), label: "Stacking", icon: ArrowUp }, ...afterCore]
      : [...core, ...afterCore];

  return (
    <div className="lg:col-span-1 hidden lg:block">
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="mb-4 pb-4 border-b border-slate-700">
            <div className="text-sm text-slate-400">{isVaultMode ? "Vault Address" : "Smart Contract"}</div>
            <div className="text-white font-mono text-xs break-all">{currentWallet.contractId || "—"}</div>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isDashboardRoot = isVaultMode && item.label === "Dashboard" && item.path === location.pathname;
              const isActive = isDashboardRoot || currentPathWithHash === item.path;
              return (
                <Button
                  key={`${item.path}-${item.label}`}
                  asChild
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start font-medium transition-all duration-200",
                    isActive
                      ? "bg-purple-600/30 text-purple-200 border border-purple-600/50 hover:bg-purple-600/40 hover:text-purple-100 shadow-lg shadow-purple-600/20"
                      : "text-slate-200 hover:bg-slate-700/60 hover:text-white hover:border hover:border-slate-600/50 hover:shadow-md"
                  )}
                >
                  <Link to={item.path}>
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </nav>
        </CardContent>
      </Card>
    </div>
  );
};

export default DesktopSidebar;
