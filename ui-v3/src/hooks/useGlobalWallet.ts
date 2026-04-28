import { useWalletContext } from "@/contexts/WalletContext";

/**
 * Access global wallet state with convenient getters (preferred STX / BTC from normalized session).
 */
export const useGlobalWallet = () => {
  const context = useWalletContext();

  return {
    isWalletConnected: context.isWalletConnected,
    isConnecting: context.isConnecting,
    walletData: context.walletData,
    connectWallet: context.connectWallet,
    disconnectWallet: context.disconnectWallet,

    get stxAddress() {
      return context.walletData?.preferredStx?.address ?? null;
    },

    get btcAddress() {
      return context.walletData?.preferredBtc?.address ?? null;
    },

    get hasWallet() {
      return context.isWalletConnected && context.walletData !== null;
    },
  };
};
