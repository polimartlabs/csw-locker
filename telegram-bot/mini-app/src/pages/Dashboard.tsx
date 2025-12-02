import { useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useTelegram } from '../hooks/useTelegram';
import { Wallet, Plus, Send, ArrowDown, Settings, Shield, Users } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { wallets, currentWallet, loading } = useWallet();
  const { user } = useTelegram();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (wallets.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4">
        <div className="max-w-md mx-auto pt-8">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome, {user?.first_name}!</h1>
          <p className="text-gray-400 mb-8">Create your first smart wallet to get started</p>
          
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-2">Get Started</h2>
            <p className="text-gray-400 text-sm mb-6">
              Create a secure, recoverable smart wallet with guardian-based recovery.
            </p>
            
            <button
              onClick={() => navigate('/create')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Wallet
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-800 rounded-lg p-4">
              <Shield className="w-6 h-6 text-blue-400 mb-2" />
              <div className="text-white font-medium">Secure</div>
              <div className="text-gray-400 text-xs">Guardian recovery</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <Settings className="w-6 h-6 text-blue-400 mb-2" />
              <div className="text-white font-medium">Smart</div>
              <div className="text-gray-400 text-xs">Automated features</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const balance = currentWallet ? parseFloat(currentWallet.balance || '0') : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <div className="max-w-md mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Wallet</h1>
            <p className="text-gray-400 text-sm">{user?.first_name}'s Bitcoin Locker</p>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="p-2 text-gray-400 hover:text-white"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>

        {/* Balance Card */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 mb-6 text-white">
          <div className="text-sm text-blue-100 mb-2">Total Balance</div>
          <div className="text-4xl font-bold mb-1">{balance.toFixed(2)} STX</div>
          <div className="text-blue-100 text-sm">~${(balance * 0.5).toFixed(2)} USD</div>
          {currentWallet && (
            <div className="mt-4 text-xs text-blue-100 break-all">
              {currentWallet.contractAddress}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => navigate('/send')}
            className="bg-gray-800 hover:bg-gray-700 rounded-xl p-4 flex flex-col items-center gap-2"
          >
            <div className="bg-blue-600 rounded-full p-3">
              <Send className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-medium">Send</span>
          </button>
          <button
            onClick={() => navigate('/receive')}
            className="bg-gray-800 hover:bg-gray-700 rounded-xl p-4 flex flex-col items-center gap-2"
          >
            <div className="bg-green-600 rounded-full p-3">
              <ArrowDown className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-medium">Receive</span>
          </button>
        </div>

        {/* Wallet List */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Your Wallets</h2>
            <button
              onClick={() => navigate('/create')}
              className="text-blue-400 text-sm font-medium"
            >
              + Add
            </button>
          </div>
          
          <div className="space-y-3">
            {wallets.map((wallet) => (
              <div
                key={wallet.id}
                onClick={() => navigate(`/wallet/${wallet.contractAddress}`)}
                className={`bg-gray-800 rounded-xl p-4 flex items-center justify-between ${
                  currentWallet?.id === wallet.id ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 rounded-full p-2">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-medium">{wallet.name}</div>
                    <div className="text-gray-400 text-xs">{wallet.balance || '0'} STX</div>
                  </div>
                </div>
                <div className="text-gray-400">
                  →
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/guardians')}
            className="bg-gray-800 hover:bg-gray-700 rounded-xl p-4 flex flex-col items-center gap-2"
          >
            <Users className="w-5 h-5 text-blue-400" />
            <span className="text-white text-sm">Guardians</span>
          </button>
          <button
            onClick={() => navigate('/settings/security')}
            className="bg-gray-800 hover:bg-gray-700 rounded-xl p-4 flex flex-col items-center gap-2"
          >
            <Shield className="w-5 h-5 text-blue-400" />
            <span className="text-white text-sm">Security</span>
          </button>
        </div>
      </div>
    </div>
  );
}

