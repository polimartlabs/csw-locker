import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useTelegram } from './useTelegram';

interface Wallet {
  id: string;
  name: string;
  contractAddress: string;
  balance: string;
  network: 'testnet' | 'mainnet';
}

interface WalletContextType {
  wallets: Wallet[];
  currentWallet: Wallet | null;
  setCurrentWallet: (wallet: Wallet | null) => void;
  addWallet: (wallet: Wallet) => void;
  updateWalletBalance: (address: string, balance: string) => void;
  loading: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { user } = useTelegram();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [currentWallet, setCurrentWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      // Load wallets from backend API
      loadWallets();
    }
  }, [user]);

  const loadWallets = async () => {
    setLoading(true);
    try {
      // TODO: Fetch from backend API
      // For now, use localStorage
      const stored = localStorage.getItem(`wallets_${user?.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setWallets(parsed);
        if (parsed.length > 0) {
          setCurrentWallet(parsed[0]);
        }
      }
    } catch (error) {
      console.error('Error loading wallets:', error);
    } finally {
      setLoading(false);
    }
  };

  const addWallet = (wallet: Wallet) => {
    const updated = [...wallets, wallet];
    setWallets(updated);
    setCurrentWallet(wallet);
    localStorage.setItem(`wallets_${user?.id}`, JSON.stringify(updated));
  };

  const updateWalletBalance = (address: string, balance: string) => {
    const updated = wallets.map(w => 
      w.contractAddress === address ? { ...w, balance } : w
    );
    setWallets(updated);
    if (currentWallet?.contractAddress === address) {
      setCurrentWallet({ ...currentWallet, balance });
    }
    localStorage.setItem(`wallets_${user?.id}`, JSON.stringify(updated));
  };

  return (
    <WalletContext.Provider value={{
      wallets,
      currentWallet,
      setCurrentWallet,
      addWallet,
      updateWalletBalance,
      loading
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

