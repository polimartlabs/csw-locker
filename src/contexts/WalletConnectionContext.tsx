import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  connect,
  disconnect,
  isConnected,
  getLocalStorage,
  StorageData,
} from "@stacks/connect";
import { AddressEntry } from "@stacks/connect/dist/types/methods";

interface WalletData extends StorageData {
  profile?: Record<string, unknown>;
}

interface WalletConnectionContextType {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  walletData: WalletData | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletConnectionContext = createContext<
  WalletConnectionContextType | undefined
>(undefined);

export const WalletConnectionProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [walletData, setWalletData] = useState<WalletData | null>(null);

  // Helper to transform connect response to WalletData
  const transformAddresses = (addresses: AddressEntry[]): WalletData => {
    const stx = addresses.find((addr) => addr.symbol?.toLowerCase() === "stx");
    const btc = addresses.find((addr) => addr.symbol?.toLowerCase() === "btc");

    return {
      addresses: {
        stx: stx ? [{ address: stx.address }] : [],
        btc: btc ? [{ address: btc.address }] : [],
      },
      version: "1",
    };
  };

  // Check connection status and load wallet data
  const checkConnection = useCallback(() => {
    const connected = isConnected();

    if (connected) {
      try {
        const storedData = getLocalStorage();

        if (storedData?.addresses) {
          setWalletData(storedData);
          setAddress(storedData.addresses.stx[0]?.address || null);
          setIsWalletConnected(true);
        }
      } catch (error) {
        console.error("Error getting wallet data:", error);
        setIsWalletConnected(false);
        setWalletData(null);
        setAddress(null);
      }
    } else {
      setIsWalletConnected(false);
      setWalletData(null);
      setAddress(null);
    }
  }, []);

  // Check if user is already connected on mount
  useEffect(() => {
    checkConnection();

    // Set up an interval to check connection status
    // This handles cases where wallet state changes externally
    const interval = setInterval(checkConnection, 2000);

    return () => clearInterval(interval);
  }, [checkConnection]);

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const response = await connect();

      if (response?.addresses) {
        const transformedData = transformAddresses(response.addresses);

        setWalletData(transformedData);
        setAddress(transformedData.addresses.stx[0]?.address || null);
        setIsWalletConnected(true);
      }
    } catch (error) {
      console.error("Connection error:", error);
      // User may have cancelled - don't treat as error
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    disconnect();
    setIsWalletConnected(false);
    setWalletData(null);
    setAddress(null);
    console.log("Wallet disconnected");
  }, []);

  return (
    <WalletConnectionContext.Provider
      value={{
        isConnected: isWalletConnected,
        isConnecting,
        address,
        walletData,
        connect: handleConnect,
        disconnect: handleDisconnect,
      }}
    >
      {children}
    </WalletConnectionContext.Provider>
  );
};

export const useWalletConnection = (): WalletConnectionContextType => {
  const context = useContext(WalletConnectionContext);
  if (context === undefined) {
    throw new Error(
      "useWalletConnection must be used within a WalletConnectionProvider"
    );
  }
  return context;
};

export default WalletConnectionProvider;
