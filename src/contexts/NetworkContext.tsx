import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWalletConnection } from './WalletConnectionContext';

type Network = 'mainnet' | 'testnet';

interface NetworkContextType {
  network: Network;
  setNetwork: (network: Network) => void;
  isAutoDetected: boolean;
  getApiUrl: () => string;
  getExplorerUrl: (path: string) => string;
}

const STORAGE_KEY = 'selectedNetwork';

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address, isConnected } = useWalletConnection();
  const [network, setNetworkState] = useState<Network>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as Network) || 'mainnet';
  });
  const [isAutoDetected, setIsAutoDetected] = useState(false);

  // Auto-detect network based on connected wallet address
  useEffect(() => {
    if (isConnected && address) {
      const detectedNetwork: Network = 
        address.startsWith('SP') || address.startsWith('SM') ? 'mainnet' : 'testnet';
      
      if (detectedNetwork !== network) {
        setNetworkState(detectedNetwork);
        setIsAutoDetected(true);
        localStorage.setItem(STORAGE_KEY, detectedNetwork);
      }
    }
  }, [isConnected, address]);

  const setNetwork = useCallback((newNetwork: Network) => {
    setNetworkState(newNetwork);
    setIsAutoDetected(false);
    localStorage.setItem(STORAGE_KEY, newNetwork);
  }, []);

  const getApiUrl = useCallback(() => {
    return network === 'mainnet'
      ? 'https://api.mainnet.hiro.so'
      : 'https://api.testnet.hiro.so';
  }, [network]);

  const getExplorerUrl = useCallback((path: string) => {
    const baseUrl = network === 'mainnet'
      ? 'https://explorer.hiro.so'
      : 'https://explorer.hiro.so/?chain=testnet';
    return `${baseUrl}/${path}`;
  }, [network]);

  return (
    <NetworkContext.Provider
      value={{
        network,
        setNetwork,
        isAutoDetected,
        getApiUrl,
        getExplorerUrl,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = (): NetworkContextType => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};