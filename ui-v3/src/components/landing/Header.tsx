import { Button } from "@/components/ui/button";
import { MenuIcon, Wallet, XIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import GreenButton from "../ui/green-button";
import SecondaryButton from "../ui/secondary-button";
import PrimaryButton from "../ui/primary-button";
import { useState } from "react";

const Header = () => {
  const { isWalletConnected, connectWallet, disconnectWallet, isConnecting, walletData } = useWalletConnection();
  const [mobileMenue, setMobileMenue] = useState<boolean>(false)

  const handleWalletAction = () => {
    if (isWalletConnected) {
      disconnectWallet();
    } else {
      connectWallet();
    }
  };

  const getButtonText = () => {
    if (isConnecting) return "Connecting...";
    if (isWalletConnected) {
      console.log({walletData})
      const address = walletData.addresses.stx[0].address;
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
    return "Connect Wallet";
  };

  const scrollToFeatures = () => {
    const featuresSection = document.getElementById('features-section');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="h-8 w-8 text-purple-400" />
            <span className="text-xl font-bold text-white">Smart Wallet</span>
          </div>

          <div className="hidden md:flex items-center space-x-6">
            <button
              onClick={scrollToFeatures}
              className="text-slate-300 hover:text-white transition-colors"
            >
              Features
            </button>
            <Link to="/products" className="text-slate-300 hover:text-white transition-colors">Products</Link>
            <Link to="/about" className="text-slate-300 hover:text-white transition-colors">About</Link>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <SecondaryButton
              asChild
            >
              <a
                href="https://polimartlabs.gitbook.io/smart-wallet/overview/why-smart-wallet"
                target="_blank"
                rel="noopener noreferrer"
              >
                Docs
              </a>
            </SecondaryButton>
            {isWalletConnected ? (
              <div className="flex items-center space-x-2">
                <GreenButton asChild >
                  <Link to="/wallet-selector">My Wallets</Link>
                </GreenButton>
                <SecondaryButton
                  onClick={handleWalletAction}

                  disabled={isConnecting}
                >
                  {getButtonText()}
                </SecondaryButton>
              </div>
            ) : (
              <PrimaryButton
                onClick={handleWalletAction}
                disabled={isConnecting}
              >
                {getButtonText()}
              </PrimaryButton>
            )}
          </div>

          <div className="flex md:hidden items-center space-x-4">
            <SecondaryButton onClick={() => setMobileMenue(!mobileMenue)}>
              {mobileMenue ? <XIcon /> : <MenuIcon />}
            </SecondaryButton>
          </div>

          {/* Mobile Menu Panel */}
          {mobileMenue && (
            <div className="absolute top-16 left-0 w-full bg-white shadow-md z-50 p-4 md:hidden">
              <nav className="flex flex-col space-y-4">
                <SecondaryButton
                  asChild
                >
                  <a
                    href="https://polimartlabs.gitbook.io/smart-wallet/overview/why-smart-wallet"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Docs
                  </a>
                </SecondaryButton>
                {isWalletConnected ? (
                  <div className="w-full flex flex-col items-center">
                    <GreenButton asChild >
                      <Link to="/wallet-selector">My Wallets</Link>
                    </GreenButton>
                    <SecondaryButton
                      onClick={handleWalletAction}
                      disabled={isConnecting}
                    >
                      {getButtonText()}
                    </SecondaryButton>
                  </div>
                ) : (
                  <PrimaryButton
                    onClick={handleWalletAction}
                    disabled={isConnecting}
                  >
                    {getButtonText()}
                  </PrimaryButton>
                )}
              </nav>
            </div>
          )}

        </nav>
      </div>
    </header>
  );
};

export default Header;
