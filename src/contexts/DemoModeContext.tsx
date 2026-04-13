import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

interface DemoModeContextType {
  isDemoMode: boolean;
  setDemoMode: (demo: boolean) => void;
  toggleDemoMode: () => void;
  demoAddress: string;
}

const STORAGE_KEY = 'demoMode';
const DEMO_ADDRESS = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7.demo-wallet';

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

export const DemoModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchParams] = useSearchParams();
  const [isDemoMode, setIsDemoModeState] = useState(() => {
    // Check URL param first
    const urlDemo = searchParams.get('demo');
    if (urlDemo === 'true') return true;
    
    // Then check localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  });

  // Sync with URL params
  useEffect(() => {
    const urlDemo = searchParams.get('demo');
    if (urlDemo === 'true' && !isDemoMode) {
      setIsDemoModeState(true);
    }
  }, [searchParams]);

  const setDemoMode = useCallback((demo: boolean) => {
    setIsDemoModeState(demo);
    localStorage.setItem(STORAGE_KEY, String(demo));
  }, []);

  const toggleDemoMode = useCallback(() => {
    setDemoMode(!isDemoMode);
  }, [isDemoMode, setDemoMode]);

  return (
    <DemoModeContext.Provider
      value={{
        isDemoMode,
        setDemoMode,
        toggleDemoMode,
        demoAddress: DEMO_ADDRESS,
      }}
    >
      {children}
    </DemoModeContext.Provider>
  );
};

export const useDemoMode = (): DemoModeContextType => {
  const context = useContext(DemoModeContext);
  if (context === undefined) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
};