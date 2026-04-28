import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWalletConnection } from './WalletConnectionContext';
import { useNetwork } from './NetworkContext';
import { SmartWallet, ContractInfoEntry } from '@/services/interfaces';
import { buildScopedStorageKey } from '@/lib/userScope';

interface SmartWalletContextType {
  selectedWallet: (SmartWallet & ContractInfoEntry) | null;
  setSelectedWallet: (wallet: (SmartWallet & ContractInfoEntry) | null) => void;
  smartWallets: (SmartWallet & ContractInfoEntry)[];
  setSmartWallets: (wallets: (SmartWallet & ContractInfoEntry)[]) => void;
  isLoading: boolean;
  hasWallet: boolean;
  refreshWallets: () => Promise<void>;
  addWallet: (wallet: SmartWallet & ContractInfoEntry) => void;
  removeWallet: (walletId: string) => void;
}

const STORAGE_KEY = 'smartWallets';
const SELECTED_WALLET_KEY = 'selectedWallet';

function scopedNetworkKey(baseKey: string, network: string): string {
  return buildScopedStorageKey(`${baseKey}_${network}`);
}

const SmartWalletContext = createContext<SmartWalletContextType | undefined>(undefined);

export const SmartWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address, isConnected } = useWalletConnection();
  const { network } = useNetwork();
  
  const [selectedWallet, setSelectedWalletState] = useState<(SmartWallet & ContractInfoEntry) | null>(null);
  const [smartWallets, setSmartWalletsState] = useState<(SmartWallet & ContractInfoEntry)[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load wallets from localStorage on mount
  useEffect(() => {
    const scopedWalletsKey = scopedNetworkKey(STORAGE_KEY, network);
    const legacyWalletsKey = `${STORAGE_KEY}_${network}`;
    const storedWallets =
      localStorage.getItem(scopedWalletsKey) ??
      (scopedWalletsKey === legacyWalletsKey ? null : localStorage.getItem(legacyWalletsKey));
    if (storedWallets) {
      try {
        const parsed = JSON.parse(storedWallets);
        setSmartWalletsState(parsed);
        if (!localStorage.getItem(scopedWalletsKey)) {
          localStorage.setItem(scopedWalletsKey, storedWallets);
        }
      } catch (e) {
        console.error('Failed to parse stored wallets:', e);
      }
    }

    const scopedSelectedKey = scopedNetworkKey(SELECTED_WALLET_KEY, network);
    const legacySelectedKey = `${SELECTED_WALLET_KEY}_${network}`;
    const storedSelected =
      localStorage.getItem(scopedSelectedKey) ??
      (scopedSelectedKey === legacySelectedKey ? null : localStorage.getItem(legacySelectedKey));
    if (storedSelected) {
      try {
        const parsed = JSON.parse(storedSelected);
        setSelectedWalletState(parsed);
        if (!localStorage.getItem(scopedSelectedKey)) {
          localStorage.setItem(scopedSelectedKey, storedSelected);
        }
      } catch (e) {
        console.error('Failed to parse selected wallet:', e);
      }
    }
  }, [network]);

  // Persist wallets to localStorage
  useEffect(() => {
    if (smartWallets.length > 0) {
      localStorage.setItem(scopedNetworkKey(STORAGE_KEY, network), JSON.stringify(smartWallets));
    }
  }, [smartWallets, network]);

  // Persist selected wallet to localStorage
  useEffect(() => {
    if (selectedWallet) {
      localStorage.setItem(scopedNetworkKey(SELECTED_WALLET_KEY, network), JSON.stringify(selectedWallet));
    } else {
      localStorage.removeItem(scopedNetworkKey(SELECTED_WALLET_KEY, network));
    }
  }, [selectedWallet, network]);

  const setSelectedWallet = useCallback((wallet: (SmartWallet & ContractInfoEntry) | null) => {
    setSelectedWalletState(wallet);
  }, []);

  const setSmartWallets = useCallback((wallets: (SmartWallet & ContractInfoEntry)[]) => {
    setSmartWalletsState(wallets);
  }, []);

  const refreshWallets = useCallback(async () => {
    if (!address) return;
    
    setIsLoading(true);
    try {
      // TODO: Fetch smart wallets from blockchain
      // const wallets = await fetchSmartWallets(address, network);
      // setSmartWalletsState(wallets);
    } catch (error) {
      console.error('Failed to refresh wallets:', error);
    } finally {
      setIsLoading(false);
    }
  }, [address, network]);

  const addWallet = useCallback((wallet: SmartWallet & ContractInfoEntry) => {
    setSmartWalletsState(prev => {
      // Avoid duplicates
      const exists = prev.some(w => w.address === wallet.address);
      if (exists) return prev;
      return [...prev, wallet];
    });
  }, []);

  const removeWallet = useCallback((walletId: string) => {
    setSmartWalletsState(prev => prev.filter(w => w.address !== walletId));
    if (selectedWallet?.address === walletId) {
      setSelectedWalletState(null);
    }
  }, [selectedWallet]);

  // Clear wallets when disconnected
  useEffect(() => {
    if (!isConnected) {
      // Keep wallets but clear selection when disconnected
      setSelectedWalletState(null);
    }
  }, [isConnected]);

  const hasWallet = smartWallets.length > 0;

  return (
    <SmartWalletContext.Provider
      value={{
        selectedWallet,
        setSelectedWallet,
        smartWallets,
        setSmartWallets,
        isLoading,
        hasWallet,
        refreshWallets,
        addWallet,
        removeWallet,
      }}
    >
      {children}
    </SmartWalletContext.Provider>
  );
};

export const useSmartWallet = (): SmartWalletContextType => {
  const context = useContext(SmartWalletContext);
  if (context === undefined) {
    throw new Error('useSmartWallet must be used within a SmartWalletProvider');
  }
  return context;
};