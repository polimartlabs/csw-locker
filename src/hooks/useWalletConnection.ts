import {
  connect,
  disconnect,
  getLocalStorage,
  isConnected,
} from "@stacks/connect";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// Define the wallet data interface based on what @stacks/connect actually returns
interface UserWalletData {
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

export const useUserWalletConnection = () => {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [userData, setUserData] = useState<UserWalletData | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    // Check if user is already connected on component mount
    const connected = isConnected();
    if (connected) {
      try {
        const userData = getLocalStorage();
        // Transform the data to match our interface
        if (userData && userData.addresses) {
          const transformedData: UserWalletData = {
            addresses: {
              stx: Array.isArray(userData.addresses.stx)
                ? userData.addresses.stx
                : [],
              btc: Array.isArray(userData.addresses.btc)
                ? userData.addresses.btc
                : [],
            },
          };
          setUserData(transformedData);
          setIsWalletConnected(connected);
        }
      } catch (error) {}
    }
  }, [isConnected()]);

  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      const response = await connect();
      setIsWalletConnected(true);

      // Transform the response to match our interface
      if (response && response.addresses) {
        const stx = response.addresses.find(
          (addr) => addr.symbol.toLowerCase() === "stx"
        );
        const btc = response.addresses.find(
          (addr) => addr.symbol.toLowerCase() === "btc"
        );
        const transformedData: UserWalletData = {
          addresses: {
            stx: [stx],
            btc: [btc],
          },
        };
        setUserData(transformedData);
      }
    } catch (error) {
    } finally {
      setIsConnecting(false);
    }
  };
  const disconnectWallet = () => {
    disconnect();
    setIsWalletConnected(isConnected());
    setUserData(null);
    nav("/");
  };

  return {
    isWalletConnected,
    userData,
    isConnecting,
    connectWallet,
    disconnectWallet,
  };
};
