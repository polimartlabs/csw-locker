import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWalletContext } from "@/contexts/WalletContext";

/**
 * App entry point for wallet state: same source as `useWalletContext`, plus redirect home on disconnect.
 */
export const useWalletConnection = () => {
  const { isWalletConnected, walletData, isConnecting, connectWallet, disconnectWallet: ctxDisconnect } =
    useWalletContext();
  const navigate = useNavigate();

  const disconnectWallet = useCallback(() => {
    ctxDisconnect();
    navigate("/");
  }, [ctxDisconnect, navigate]);

  return {
    isWalletConnected,
    walletData,
    isConnecting,
    connectWallet,
    disconnectWallet,
  };
};

// Backward-compatible alias used by newer UI components.
export const useUserWalletConnection = () => {
  const { isWalletConnected, walletData, isConnecting, connectWallet, disconnectWallet } =
    useWalletConnection();

  return {
    isWalletConnected,
    userData: walletData,
    isConnecting,
    connectWallet,
    disconnectWallet,
  };
};
