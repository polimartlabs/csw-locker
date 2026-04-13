import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNetwork } from "@/contexts/NetworkContext";
import { useSmartWallet } from "@/contexts/SmartWalletContext";
import { useWalletConnection } from "@/contexts/WalletConnectionContext";
import { Globe, Loader2, Wallet, X } from "lucide-react";
import React from "react";

/**
 * Example component showing how to use split wallet contexts
 * Each context only triggers re-renders for its specific state changes
 */
export const WalletStatus: React.FC = () => {
  // Connection-related state
  const {
    isConnected,
    isConnecting,
    address,
    connect,
    walletData,
    disconnect,
  } = useWalletConnection();

  // Network-related state
  const { network, isAutoDetected } = useNetwork();

  // Smart wallet state
  const { hasWallet, smartWallets } = useSmartWallet();

  // Derive addresses from userData
  const stxAddress =
    address || walletData?.profile?.stxAddress?.[network] || null;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Wallet Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <div className="flex items-center gap-2">
            {isConnecting && <Loader2 className="h-4 w-4 animate-spin" />}
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                isConnected
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {isConnecting
                ? "Connecting..."
                : isConnected
                ? "Connected"
                : "Disconnected"}
            </span>
          </div>
        </div>

        {/* Network Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Network:</span>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-slate-400" />
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                network === "mainnet"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-orange-100 text-orange-800"
              }`}
            >
              {network}
              {isAutoDetected && " (auto)"}
            </span>
          </div>
        </div>

        {/* Wallet Data Display */}
        {isConnected && (
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">STX Address:</span>
              <div className="text-xs text-gray-600 font-mono break-all">
                {stxAddress || "Not available"}
              </div>
            </div>
            {hasWallet && (
              <div className="text-sm">
                <span className="font-medium">Smart Wallets:</span>
                <div className="text-xs text-gray-600">
                  {smartWallets.length} wallet(s) found
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!isConnected ? (
            <Button
              onClick={connect}
              disabled={isConnecting}
              className="flex-1"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                "Connect Wallet"
              )}
            </Button>
          ) : (
            <Button
              onClick={disconnect}
              variant="destructive"
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          )}
        </div>

        {/* Debug Info */}
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer">Debug Info</summary>
          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
            {JSON.stringify(
              {
                // Connection context
                isConnected,
                isConnecting,
                address,
                // Network context
                network,
                isAutoDetected,
                // Smart wallet context
                hasWallet,
                smartWalletsCount: smartWallets.length,
                // Derived
                stxAddress,
              },
              null,
              2
            )}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
};

export default WalletStatus;
