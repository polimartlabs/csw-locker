import React from 'react';
import { WalletConnectionProvider } from './WalletConnectionContext';
import { NetworkProvider } from './NetworkContext';
import { SmartWalletProvider } from './SmartWalletContext';
import { DemoModeProvider } from './DemoModeContext';

interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * Combines all app providers in the correct order.
 * Order matters: 
 * 1. WalletConnection (no dependencies)
 * 2. Network (depends on WalletConnection for auto-detection)
 * 3. SmartWallet (depends on WalletConnection and Network)
 * 4. DemoMode (no dependencies, but placed last for override capability)
 */
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <WalletConnectionProvider>
      <NetworkProvider>
        <SmartWalletProvider>
          <DemoModeProvider>
            {children}
          </DemoModeProvider>
        </SmartWalletProvider>
      </NetworkProvider>
    </WalletConnectionProvider>
  );
};

export default AppProviders;