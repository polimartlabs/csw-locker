import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wallet, User, Globe, Settings, ChevronDown, Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import SecondaryButton from "./ui/secondary-button";

interface WalletHeaderProps {
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
   currentWallet,
   selectedNetwork,
   onNetworkSwitch,
   onMobileMenuToggle,
}: WalletHeaderProps) => {
   const { walletData, disconnectWallet } = useWalletConnection();

   const getConnectedWalletAddress = () => {
      if (walletData?.addresses?.stx && walletData.addresses.stx.length > 0) {
         const address = walletData.addresses.stx[0].address;
         return `${address.slice(0, 6)}...${address.slice(-4)}`;
      }
      return "Not Connected";
   };

   const handleNetworkSwitch = (network: "mainnet" | "testnet") => {
      onNetworkSwitch(network);
   };

   return (
      <header className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
         <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
               <div className="flex items-center space-x-4">
                  <Link to="/" className="flex items-center space-x-2">
                     <Wallet className="h-6 w-6 md:h-8 md:w-8 text-purple-400" />
                     <span className="text-lg md:text-xl font-bold text-white">
                        Smart Wallet
                     </span>
                  </Link>

                  {/* Wallet Name - Hidden on mobile */}
                  <div className="hidden lg:block">
                     <div className="text-sm text-slate-400">
                        Current Wallet
                     </div>
                     <div className="text-white font-medium">
                        {currentWallet.name}
                     </div>
                  </div>
               </div>

               <div className="flex items-center space-x-2 md:space-x-4">
                  {/* Balance Card - Responsive */}
                  <Card className="bg-slate-800/50 border-slate-700 hidden sm:block">
                     <CardContent className="px-3 py-2 md:px-4">
                        <div className="flex items-center space-x-2 md:space-x-4">
                           <div className="text-right">
                              <div className="text-xs md:text-sm text-slate-400">
                                 Balance
                              </div>
                              <div className="text-sm md:text-lg font-bold text-white">
                                 {currentWallet.balance}
                              </div>
                           </div>
                           <div className="text-right hidden md:block">
                              <div className="text-sm text-slate-400">
                                 USD Value
                              </div>
                              <div className="text-lg font-bold text-green-400">
                                 {currentWallet.usdValue}
                              </div>
                           </div>
                        </div>
                     </CardContent>
                  </Card>

                  {/* Mobile Navigation Trigger */}
                  <div className="lg:hidden">
                     <SecondaryButton size="sm" onClick={onMobileMenuToggle}>
                        <Menu className="h-4 w-4" />
                     </SecondaryButton>
                  </div>

                  {/* Desktop User Menu */}
                  <div className="hidden md:flex items-center space-x-2">
                     {/* Connected Wallet Profile Menu */}
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           <SecondaryButton size="sm">
                              <User className="mr-2 h-4 w-4" />
                              <span className="hidden lg:inline">
                                 {getConnectedWalletAddress()}
                              </span>
                              <ChevronDown className="ml-2 h-4 w-4" />
                           </SecondaryButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 bg-slate-800 border-slate-700 text-white">
                           <DropdownMenuLabel>
                              Connected Wallet
                           </DropdownMenuLabel>
                           <DropdownMenuSeparator className="bg-slate-700" />
                           <DropdownMenuItem className="hover:bg-slate-700 focus:bg-slate-700">
                              <User className="mr-2 h-4 w-4" />
                              View Profile
                           </DropdownMenuItem>
                           <DropdownMenuItem
                              className="hover:bg-slate-700 focus:bg-slate-700"
                              asChild
                           >
                              <Link to="/wallet-selector">
                                 <Wallet className="mr-2 h-4 w-4" />
                                 Switch Wallet
                              </Link>
                           </DropdownMenuItem>
                           <DropdownMenuItem className="hover:bg-slate-700 focus:bg-slate-700">
                              <Settings className="mr-2 h-4 w-4" />
                              Wallet Settings
                           </DropdownMenuItem>
                        </DropdownMenuContent>
                     </DropdownMenu>

                     {/* Network Switcher */}
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           <SecondaryButton size="sm">
                              <Globe className="mr-2 h-4 w-4" />
                              <span className="hidden lg:inline">
                                 {selectedNetwork}
                              </span>
                              <ChevronDown className="ml-2 h-4 w-4" />
                           </SecondaryButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-48 bg-slate-800 border-slate-700 text-white">
                           <DropdownMenuLabel>Select Network</DropdownMenuLabel>
                           <DropdownMenuSeparator className="bg-slate-700" />
                           <DropdownMenuItem
                              className="hover:bg-slate-700 focus:bg-slate-700"
                              onClick={() => handleNetworkSwitch("mainnet")}
                           >
                              <div className="flex items-center justify-between w-full">
                                 <span>Mainnet</span>
                                 {selectedNetwork === "mainnet" && (
                                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
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
                                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                 )}
                              </div>
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
