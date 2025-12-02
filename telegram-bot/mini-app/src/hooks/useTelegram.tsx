import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

interface TelegramContextType {
  user: TelegramUser | null;
  webApp: typeof window.Telegram.WebApp | null;
  isReady: boolean;
  sendData: (data: string) => void;
  close: () => void;
}

const TelegramContext = createContext<TelegramContextType | undefined>(undefined);

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [webApp, setWebApp] = useState<typeof window.Telegram.WebApp | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      setWebApp(tg);
      
      // Get user info
      if (tg.initDataUnsafe?.user) {
        setUser(tg.initDataUnsafe.user);
      }
      
      setIsReady(true);
      
      // Expand web app
      tg.expand();
    } else {
      // Development mode - create mock user
      setUser({
        id: 123456789,
        first_name: 'Test',
        username: 'testuser'
      });
      setIsReady(true);
    }
  }, []);

  const sendData = (data: string) => {
    if (webApp) {
      webApp.sendData(data);
    }
  };

  const close = () => {
    if (webApp) {
      webApp.close();
    }
  };

  return (
    <TelegramContext.Provider value={{ user, webApp, isReady, sendData, close }}>
      {children}
    </TelegramContext.Provider>
  );
}

export function useTelegram() {
  const context = useContext(TelegramContext);
  if (context === undefined) {
    throw new Error('useTelegram must be used within a TelegramProvider');
  }
  return context;
}

