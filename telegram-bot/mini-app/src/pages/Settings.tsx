import { useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { ArrowLeft, Shield, Users, Bell, Globe } from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const { currentWallet } = useWallet();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <div className="max-w-md mx-auto p-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
        </div>

        {/* Settings Options */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/guardians')}
            className="w-full bg-gray-800 hover:bg-gray-700 rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-400" />
              <span className="text-white font-medium">Guardians</span>
            </div>
            <span className="text-gray-400">→</span>
          </button>

          <button
            onClick={() => navigate('/settings/security')}
            className="w-full bg-gray-800 hover:bg-gray-700 rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-blue-400" />
              <span className="text-white font-medium">Security</span>
            </div>
            <span className="text-gray-400">→</span>
          </button>

          <button
            onClick={() => {}}
            className="w-full bg-gray-800 hover:bg-gray-700 rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-blue-400" />
              <span className="text-white font-medium">Notifications</span>
            </div>
            <span className="text-gray-400">→</span>
          </button>

          <button
            onClick={() => {}}
            className="w-full bg-gray-800 hover:bg-gray-700 rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-blue-400" />
              <span className="text-white font-medium">Network</span>
            </div>
            <span className="text-gray-400 text-sm">{currentWallet?.network || 'testnet'} →</span>
          </button>
        </div>

        {/* Wallet Info */}
        {currentWallet && (
          <div className="mt-6 bg-gray-800 rounded-xl p-4">
            <h3 className="text-white font-medium mb-2">Current Wallet</h3>
            <p className="text-gray-400 text-sm break-all">{currentWallet.contractAddress}</p>
          </div>
        )}
      </div>
    </div>
  );
}

