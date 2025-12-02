import { useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { ArrowLeft, Shield, Lock, AlertTriangle } from 'lucide-react';

export default function Security() {
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
          <h1 className="text-2xl font-bold text-white">Security</h1>
        </div>

        {/* Security Status */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-6 h-6 text-green-400" />
            <h2 className="text-white font-medium">Security Status</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Spending Limits</span>
              <span className="text-green-400">Enabled</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Guardian Recovery</span>
              <span className="text-green-400">Enabled</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Security Level</span>
              <span className="text-white">Standard</span>
            </div>
          </div>
        </div>

        {/* Security Options */}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => {}}
            className="w-full bg-gray-800 hover:bg-gray-700 rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-blue-400" />
              <span className="text-white font-medium">Spending Limits</span>
            </div>
            <span className="text-gray-400">→</span>
          </button>

          <button
            onClick={() => {}}
            className="w-full bg-gray-800 hover:bg-gray-700 rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-blue-400" />
              <span className="text-white font-medium">Withdrawal Delays</span>
            </div>
            <span className="text-gray-400">→</span>
          </button>
        </div>

        {/* Emergency Actions */}
        <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <h2 className="text-white font-medium">Emergency Actions</h2>
          </div>
          <button className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg">
            Freeze Wallet
          </button>
          <p className="text-red-200 text-sm mt-3">
            Freezing your wallet will block all transactions. Use only in case of emergency.
          </p>
        </div>
      </div>
    </div>
  );
}

