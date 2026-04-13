import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { connect, disconnect, isConnected, getLocalStorage } from "@stacks/connect";
import { useSearchParams } from "react-router-dom";

// Define the wallet data interface based on what @stacks/connect actually returns
interface WalletData {
  addresses: {
    stx: Array<{
      address: string;
      publicKey?: string;
    }>;
    btc: Array<{
      address: string;
      publicKey?: string;
    }>;
  };
  profile?: any;
  publicKey?: string;
}

interface WalletContextType {
  isWalletConnected: boolean;
  walletData: WalletData | null;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWalletContext = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if user is already connected on component mount
    const checkConnection = () => {
      const connected = isConnected();
      if (connected) {
        try {
          const userData = getLocalStorage();
          // Transform the data to match our interface
          if (userData && userData.addresses) {
            const transformedData: WalletData = {
              addresses: {
                stx: Array.isArray(userData.addresses.stx)
                  ? userData.addresses.stx
                  : [],
                btc: Array.isArray(userData.addresses.btc)
                  ? userData.addresses.btc
                  : [],
              },
            };
            setWalletData(transformedData);
            setIsWalletConnected(connected);
          }
        } catch (error) {
          console.error("Error getting wallet data:", error);
        }
      } else {
        setIsWalletConnected(false);
        setWalletData(null);
      }
    };

    checkConnection();

    // Set up an interval to check connection status
    const interval = setInterval(checkConnection, 1000);

    return () => clearInterval(interval);
  }, []);

  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      const response = await connect();
      setIsWalletConnected(true);

      // Transform the response to match our interface
      if (response && response.addresses) {
        const stx = response.addresses.find((addr) => addr.symbol.toLowerCase() === "stx");
        const btc = response.addresses.find((addr) => addr.symbol.toLowerCase() === "btc");
        const transformedData: WalletData = {
          addresses: {
            stx: stx ? [stx] : [],
            btc: btc ? [btc] : [],
          },
        };
        setWalletData(transformedData);
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    disconnect();
    setIsWalletConnected(false);
    setWalletData(null);
    console.log("Wallet disconnected");
  };

  const value: WalletContextType = {
    isWalletConnected,
    walletData,
    isConnecting,
    connectWallet,
    disconnectWallet,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

