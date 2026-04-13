import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";
import {
    X,
    Wallet,
    ExternalLink,
    LogOut
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import GreenButton from "./ui/green-button";
import SecondaryButton from "./ui/secondary-button";
import PrimaryButton from "./ui/primary-button";
import RedButton from "./ui/red-button";
import { DOCS_URL, getNavItemsWithStacking } from "@/lib/const";
import { Star, Package, Info, FileText, Home } from "lucide-react";
import { UnifiedHeaderProps, WalletManagementHeaderProps } from "./UnifiedHeader";

interface SmartWalletInfo {
    name?: string;
    contractId?: string;
    address?: string;
    balance?: string;
    usdValue?: string;
    extensions?: string[];
}

interface UnifiedMobileDrawerProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;

    // Header context information
    variant: "default" | "landing" | "wallet-selector" | "wallet-management";

    props: UnifiedHeaderProps;
    // Wallet selector props
    totalBalance?: string;
    usdValue?: string;

    // Wallet management props
    currentSmartWallet?: {
        name: string;
        contractId: string;
        balance: string;
        usdValue: string;
    };

    // Wallet connection state
    isWalletConnected: boolean;
    onWalletConnect?: () => void;
    onWalletDisconnect?: () => void;
    isConnecting?: boolean;
    connectButtonText?: string;
    userData?: any;
}

const UnifiedMobileDrawer = ({
    isOpen,
    onOpenChange,
    variant,
    isWalletConnected,
    onWalletConnect,
    onWalletDisconnect,
    isConnecting = false,
    userData,
    props
}: UnifiedMobileDrawerProps) => {
    const location = useLocation();
    const currentSmartWallet = variant === "wallet-management" ? (props as WalletManagementHeaderProps).currentWallet : undefined;

    // Create navigation items based on context
    const getNavItems = () => {
        switch (variant) {
            case "landing":
                const scrollToFeatures = () => {
                    const featuresSection = document.getElementById('features-section');
                    if (featuresSection) {
                        featuresSection.scrollIntoView({ behavior: 'smooth' });
                    }
                    onOpenChange(false);
                };

                return [
                    {
                        label: "Features",
                        icon: Star,
                        action: scrollToFeatures,
                        isButton: true
                    },
                    {
                        path: "/products",
                        label: "Products",
                        icon: Package
                    },
                    {
                        path: "/about",
                        label: "About",
                        icon: Info
                    },
                    {
                        href: DOCS_URL,
                        label: "Docs",
                        icon: FileText,
                        external: true
                    },
                ];

            case "wallet-selector":
                return [
                    { path: "/", label: "Home", icon: Home },
                    { path: "/products", label: "Products", icon: Package },
                    { path: "/about", label: "About", icon: Info },
                    { href: DOCS_URL, label: "Docs", icon: FileText, external: true },
                ];

            case "wallet-management":
                // Extract wallet ID from path or use a default
                const walletId = window.location.pathname.split('/')[2] || 'default';
                // For now, assume no stacking - this could be enhanced to detect from wallet extensions
                const isStackingActive = false;
                return getNavItemsWithStacking(walletId, isStackingActive);

            default:
                return [
                    { path: "/", label: "Home", icon: Home },
                    { path: "/products", label: "Products", icon: Package },
                    { path: "/about", label: "About", icon: Info },
                    { href: DOCS_URL, label: "Docs", icon: FileText, external: true },
                ];
        }
    };

    // Get wallet info based on context
    const getWalletInfo = (): SmartWalletInfo | undefined => {
        if (variant === "wallet-management" && currentSmartWallet) {
            return {
                name: currentSmartWallet.name,
                contractId: currentSmartWallet.contractId,
                balance: currentSmartWallet.balance,
                usdValue: currentSmartWallet.usdValue,
            };
        }
        return undefined;
    };


    const navItems = getNavItems();
    const walletInfo = getWalletInfo();
    const userAddress = userData?.addresses?.stx?.[0]?.address || "";
    const showBalance = variant === "wallet-management";

    const handleWalletAction = () => {
        if (isWalletConnected && onWalletDisconnect) {
            onWalletDisconnect();
        } else if (!isWalletConnected && onWalletConnect) {
            onWalletConnect();
        }
        onOpenChange(false);
    };

    const getButtonText = () => {
        if (isConnecting) return "Connecting...";
        if (isWalletConnected && userAddress) {
            return `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
        }
        if (isWalletConnected) return "Connected";
        return "Connect Wallet";
    };

    const formatAddress = (address: string) => {
        return `${address.slice(0, 4)}...${address.slice(-20)}`;
    };

    const formatContractId = (contractId: string) => {
        return `${contractId.slice(0, 4)}...${contractId.slice(-20)}`;
    };

    return (
        <Drawer open={isOpen} onOpenChange={onOpenChange}>
            <DrawerContent className="bg-slate-800 border-slate-700">
                <DrawerHeader className="border-b border-slate-700">
                    <div className="flex items-center justify-between">
                        <DrawerTitle className="text-white flex items-center">
                            <Wallet className="h-5 w-5 text-purple-400 mr-2" />
                            Smart Wallet
                        </DrawerTitle>
                        <DrawerClose asChild>
                            <SecondaryButton variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                                <X className="h-4 w-4" />
                            </SecondaryButton>
                        </DrawerClose>
                    </div>
                </DrawerHeader>

                <div className="p-4 space-y-4">
                    {/* Wallet Info Card */}
                    {isWalletConnected && walletInfo && (
                        <div className="bg-slate-700/50 rounded-lg p-3">
                            <div className="text-sm text-slate-400">
                                Current Wallet
                            </div>
                            <div className="text-white font-medium">
                                {walletInfo.name || "Wallet Connected"}
                            </div>
                            <div className="text-xs text-slate-400 mt-1 font-mono break-all">
                                {walletInfo.contractId
                                    ? formatContractId(walletInfo.contractId)
                                    : walletInfo.address
                                        ? formatAddress(walletInfo.address)
                                        : null
                                }
                            </div>
                        </div>
                    )}

                    {/* Balance Card - Mobile Only */}
                    {showBalance && isWalletConnected && walletInfo?.balance && walletInfo?.usdValue && (
                        <div className="bg-slate-700/50 rounded-lg p-3 sm:hidden">
                            <div className="flex justify-between">
                                <div>
                                    <div className="text-sm text-slate-400">Balance</div>
                                    <div className="text-lg font-bold text-white">{walletInfo.balance}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-slate-400">USD Value</div>
                                    <div className="text-lg font-bold text-green-400">{walletInfo.usdValue}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation Items */}
                    <div className="space-y-2">
                        {navItems.map((item, index) => {
                            const Icon = item.icon;
                            const isActive = item.path ? location.pathname === item.path : false;

                            // Handle button actions (like scroll to features)
                            if (item.isButton && item.action) {
                                return (
                                    <SecondaryButton
                                        key={`${item.label}-${index}`}
                                        onClick={item.action}
                                        variant="ghost"
                                        className="w-full justify-start font-medium text-slate-200 hover:bg-slate-700/60 hover:text-white"
                                    >
                                        <Icon className="mr-2 h-4 w-4" />
                                        {item.label}
                                    </SecondaryButton>
                                );
                            }

                            // Handle external links
                            if (item.external && item.href) {
                                return (
                                    <SecondaryButton
                                        key={`${item.label}-${index}`}
                                        asChild
                                        variant="ghost"
                                        className="w-full justify-start font-medium text-slate-200 hover:bg-slate-700/60 hover:text-white"
                                    >
                                        <a
                                            href={item.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center"
                                        >
                                            <Icon className="mr-2 h-4 w-4" />
                                            {item.label}
                                            <ExternalLink className="ml-auto h-3 w-3 text-slate-400" />
                                        </a>
                                    </SecondaryButton>
                                );
                            }

                            // Handle internal navigation
                            if (item.path) {
                                return (
                                    <DrawerClose key={`${item.label}-${index}`} asChild>
                                        <SecondaryButton
                                            asChild
                                            variant={isActive ? "secondary" : "ghost"}
                                            className={`w-full justify-start font-medium ${isActive
                                                ? "bg-purple-600/30 text-purple-200 border border-purple-600/50"
                                                : "text-slate-200 hover:bg-slate-700/60 hover:text-white"
                                                }`}
                                        >
                                            <Link to={item.path}>
                                                <Icon className="mr-2 h-4 w-4" />
                                                {item.label}
                                            </Link>
                                        </SecondaryButton>
                                    </DrawerClose>
                                );
                            }

                            return null;
                        })}
                    </div>

                    {/* Wallet Actions */}
                    <div className="pt-4 border-t border-slate-700">
                        {isWalletConnected ? (
                            <div className="space-y-3">
                                {/* Primary Action Button (e.g., "My Wallets") */}
                                {variant === "landing" &&
                                    <GreenButton asChild className="w-full">
                                        <Link to="/wallet-selector" onClick={() => onOpenChange(false)}>
                                            <Wallet className="mr-2 h-4 w-4" />
                                            My Wallets
                                        </Link>
                                    </GreenButton>
                                }
                                {variant === "wallet-selector" &&
                                    <GreenButton asChild className="w-full">
                                        <Link to="/create-wallet" onClick={() => onOpenChange(false)}>
                                            <Wallet className="mr-2 h-4 w-4" />
                                            Create New Wallet
                                        </Link>
                                    </GreenButton>
                                }


                                {/* Wallet Connection Status Button */}
                                <SecondaryButton
                                    disabled
                                    className="w-full"
                                >
                                    {getButtonText()}
                                </SecondaryButton>
                                {variant === "wallet-management" && (
                                    <SecondaryButton asChild
                                        className="w-full"
                                    >
                                        <Link to="/wallet-selector" onClick={() => onOpenChange(false)}>
                                            Switch Wallet
                                        </Link>
                                    </SecondaryButton>
                                )}

                                {/* Logout/Disconnect Button */}
                                {onWalletDisconnect && (
                                    <RedButton
                                        onClick={() => {
                                            onWalletDisconnect();
                                            onOpenChange(false);
                                        }}
                                        className="w-full"
                                    >
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Disconnect Wallet
                                    </RedButton>
                                )}
                            </div>
                        ) : (
                            <PrimaryButton
                                onClick={handleWalletAction}
                                disabled={isConnecting}
                                className="w-full"
                            >
                                {getButtonText()}
                            </PrimaryButton>
                        )}
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
};

export default UnifiedMobileDrawer;