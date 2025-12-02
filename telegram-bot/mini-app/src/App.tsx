import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TelegramProvider } from './hooks/useTelegram';
import { WalletProvider } from './hooks/useWallet';
import Dashboard from './pages/Dashboard';
import WalletPage from './pages/WalletPage';
import CreateWallet from './pages/CreateWallet';
import Send from './pages/Send';
import Receive from './pages/Receive';
import Settings from './pages/Settings';
import Guardians from './pages/Guardians';
import Security from './pages/Security';

function App() {
  return (
    <TelegramProvider>
      <WalletProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/wallet/:address" element={<WalletPage />} />
            <Route path="/create" element={<CreateWallet />} />
            <Route path="/send" element={<Send />} />
            <Route path="/receive" element={<Receive />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/security" element={<Security />} />
            <Route path="/guardians" element={<Guardians />} />
            <Route path="/guardians/add" element={<Guardians />} />
            <Route path="/guardians/remove" element={<Guardians />} />
          </Routes>
        </BrowserRouter>
      </WalletProvider>
    </TelegramProvider>
  );
}

export default App;

