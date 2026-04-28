import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wallet, User, Globe, Settings, ChevronDown, Menu, LogOut, Copy, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { useBtcWallet } from "@/contexts/BtcWalletContext";
import SecondaryButton from "./ui/secondary-button";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { formatBtcFromSats, formatNumber } from "@/utils/numbers";
import { isTaprootBtcAddress } from "@/lib/walletSession";
import { HeaderAssetBalanceStrip } from "./HeaderAssetBalanceStrip";

interface WalletHeaderProps {
  mode?: "smart-wallet" | "btc-vault";
  currentWallet: {
    name: string;
    contractId: string;
    balance: string;
    usdValue: string;
  };
  selectedNetwork: "mainnet" | "testnet";
  onNetworkSwitch: (network: "mainnet" | "testnet") => void;
  onMobileMenuToggle: () => void;
}

const WalletHeader = ({
  mode = "smart-wallet",
  currentWallet,
  selectedNetwork,
  onNetworkSwitch,
  onMobileMenuToggle,
}: WalletHeaderProps) => {
  const { walletData, disconnectWallet } = useWalletConnection();
  const {
    activeBtcAddress,
    satsBtcAddress,
    balanceSats,
    usdPrice: btcUsd,
    loadingBalance: btcLoading,
    connectBtcWallet,
    connecting: btcConnecting,
    disconnectDedicatedBtc,
    taprootAddress,
  } = useBtcWallet();
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<"stx" | "btc" | "taproot" | null>(null);

  const stx = walletData?.preferredStx?.address ?? walletData?.addresses.stx[0]?.address;

  const truncateAddr = (addr: string) =>
    addr.length > 16 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;

  const copyAddress = (field: "stx" | "btc" | "taproot", value: string) => {
    void navigator.clipboard.writeText(value);
    setCopiedField(field);
    const desc =
      field === "stx" ? "STX address" : field === "taproot" ? "Taproot (P2TR) address" : "Bitcoin address";
    toast({ title: "Copied", description: desc });
    setTimeout(() => setCopiedField(null), 1500);
  };

  const showSeparateTaprootRow =
    Boolean(taprootAddress) && activeBtcAddress != null && taprootAddress !== activeBtcAddress;
  const showTaprootAsBitcoinSubtype =
    (Boolean(activeBtcAddress) && taprootAddress != null && taprootAddress === activeBtcAddress) ||
    (Boolean(activeBtcAddress) && isTaprootBtcAddress(activeBtcAddress));

  const handleNetworkSwitch = (network: "mainnet" | "testnet") => {
    onNetworkSwitch(network);
  };

  const btcDisplay = balanceSats != null ? formatBtcFromSats(balanceSats) : "—";
  const btcUsdDisplay =
    balanceSats != null && btcUsd != null
      ? `$${formatNumber((balanceSats / 1e8) * btcUsd, 2)}`
      : "—";

  return (
    <header className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
      <div className="container mx-auto px-3 sm:px-4 py-1.5 sm:py-2">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0 min-w-0">
            <Link to="/" className="flex items-center gap-1 shrink-0">
              <Wallet className="h-5 w-5 text-purple-400" />
              <span className="text-xs sm:text-sm font-bold text-white leading-none">Smart Wallet</span>
            </Link>
            {currentWallet.name && (
              <div
                className="hidden min-[400px]:flex min-w-0 max-w-[5.5rem] sm:max-w-[8rem] border-l border-slate-600/80 pl-1.5"
                title={currentWallet.name}
              >
                <span className="text-[10px] text-slate-500 leading-tight truncate">{currentWallet.name}</span>
              </div>
            )}
          </div>

          <HeaderAssetBalanceStrip
            showStxCell={mode !== "btc-vault"}
            stxBalance={currentWallet.balance}
            stxUsd={currentWallet.usdValue}
            stxAddress={stx ?? null}
            onCopyStx={() => stx && copyAddress("stx", stx)}
            copiedStx={copiedField === "stx"}
            btcBtcDisplay={btcDisplay}
            btcUsd={btcUsdDisplay}
            btcAddress={activeBtcAddress}
            onCopyBtc={() => activeBtcAddress && copyAddress("btc", activeBtcAddress)}
            copiedBtc={copiedField === "btc"}
            btcLoading={btcLoading}
            onConnectBtc={() => void connectBtcWallet()}
            btcConnecting={btcConnecting}
            showBtcAddressRow={Boolean(activeBtcAddress)}
            onUnlinkBtc={satsBtcAddress ? () => disconnectDedicatedBtc() : undefined}
            showUnlink={Boolean(satsBtcAddress)}
          />

          <div className="flex shrink-0 items-center gap-1">
            <div className="md:hidden">
              <SecondaryButton size="sm" onClick={onMobileMenuToggle} className="h-8 w-8 p-0" aria-label="Open menu">
                <Menu className="h-4 w-4" />
              </SecondaryButton>
            </div>
            <div className="hidden md:flex items-center gap-1.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SecondaryButton
                    size="sm"
                    className="h-8 px-2 text-xs"
                    aria-label={`Switch network (currently ${selectedNetwork})`}
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span className="ml-1 hidden sm:inline capitalize">{selectedNetwork}</span>
                    <ChevronDown className="h-3 w-3 ml-0.5 hidden sm:inline opacity-70" />
                  </SecondaryButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 bg-slate-800 border-slate-700 text-white text-sm">
                  <DropdownMenuLabel>Select Network</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-700" />
                  <DropdownMenuItem
                    className="hover:bg-slate-700 focus:bg-slate-700"
                    onClick={() => handleNetworkSwitch("mainnet")}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>Mainnet</span>
                      {selectedNetwork === "mainnet" && (
                        <div className="w-2 h-2 bg-green-400 rounded-full" />
                      )}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="hover:bg-slate-700 focus:bg-slate-700"
                    onClick={() => handleNetworkSwitch("testnet")}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>Testnet</span>
                      {selectedNetwork === "testnet" && (
                        <div className="w-2 h-2 bg-green-400 rounded-full" />
                      )}
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SecondaryButton
                    size="sm"
                    className="h-8 min-h-8 text-xs max-w-[9rem] md:max-w-[15rem] md:min-h-8 md:py-1"
                  >
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <div className="hidden md:flex flex-col min-w-0 text-left text-[11px] max-w-[14rem] leading-tight">
                      {stx ? (
                        <>
                          <span className="font-mono text-slate-200 truncate" title={stx}>
                            {truncateAddr(stx)}
                          </span>
                          {activeBtcAddress ? (
                            <span className="font-mono text-amber-200/85 truncate" title={activeBtcAddress}>
                              {truncateAddr(activeBtcAddress)}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span>Not Connected</span>
                      )}
                    </div>
                    <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-70" />
                  </SecondaryButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-72 max-w-[min(100vw-1rem,20rem)] bg-slate-800 border-slate-700 text-white text-sm">
                  <DropdownMenuLabel>Accounts</DropdownMenuLabel>
                  {stx && (
                    <div className="px-2 py-2 text-slate-300 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs text-slate-500 uppercase tracking-wide">STX</div>
                        <div className="font-mono text-xs leading-relaxed text-white break-all mt-0.5">{stx}</div>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 p-1 rounded hover:bg-slate-700"
                        onClick={() => copyAddress("stx", stx)}
                        aria-label="Copy STX address"
                      >
                        {copiedField === "stx" ? (
                          <Check className="h-4 w-4 text-green-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  )}
                  {activeBtcAddress && (
                    <div className="px-2 py-2 text-slate-300 flex items-start justify-between gap-2 border-b border-slate-700/80 pb-2 mb-1">
                      <div className="min-w-0">
                        <div className="text-xs text-slate-500 uppercase tracking-wide">
                          {showTaprootAsBitcoinSubtype
                            ? "Bitcoin · Taproot (P2TR)"
                            : "Bitcoin (payment)"}
                        </div>
                        <div className="font-mono text-xs leading-relaxed text-white break-all mt-0.5">
                          {activeBtcAddress}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 p-1 rounded hover:bg-slate-700"
                        onClick={() => copyAddress("btc", activeBtcAddress)}
                        aria-label="Copy Bitcoin address"
                      >
                        {copiedField === "btc" ? (
                          <Check className="h-4 w-4 text-green-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  )}
                  {showSeparateTaprootRow && taprootAddress && (
                    <div className="px-2 py-2 text-slate-300 flex items-start justify-between gap-2 border-b border-slate-700/80 pb-2 mb-1">
                      <div className="min-w-0">
                        <div className="text-xs text-slate-500 uppercase tracking-wide">Taproot (P2TR)</div>
                        <div className="font-mono text-xs leading-relaxed text-white break-all mt-0.5">
                          {taprootAddress}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 p-1 rounded hover:bg-slate-700"
                        onClick={() => copyAddress("taproot", taprootAddress)}
                        aria-label="Copy Taproot address"
                      >
                        {copiedField === "taproot" ? (
                          <Check className="h-4 w-4 text-green-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  )}
                  <DropdownMenuSeparator className="bg-slate-700" />
                  <DropdownMenuItem className="hover:bg-slate-700 focus:bg-slate-700" asChild>
                    <Link to="/wallet-selector">
                      <Wallet className="mr-2 h-4 w-4" />
                      Wallets
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="hover:bg-slate-700 focus:bg-slate-700">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-700" />
                  <DropdownMenuItem className="hover:bg-slate-700 focus:bg-slate-700" onClick={disconnectWallet}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default WalletHeader;
