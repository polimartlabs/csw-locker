import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { ArrowLeft, Send, ArrowDown, Settings, History } from 'lucide-react';

export default function WalletPage() {
  const { address } = useParams();
  const navigate = useNavigate();
  const { wallets } = useWallet();
  
  const wallet = wallets.find(w => w.contractAddress === address);

  if (!wallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-white">Wallet not found</div>
      </div>
    );
  }

  const balance = parseFloat(wallet.balance || '0');

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
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">{wallet.name}</h1>
            <p className="text-gray-400 text-xs break-all">{wallet.contractAddress}</p>
          </div>
        </div>

        {/* Balance */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 mb-6 text-white">
          <div className="text-sm text-blue-100 mb-2">Balance</div>
          <div className="text-4xl font-bold mb-1">{balance.toFixed(2)} STX</div>
          <div className="text-blue-100 text-sm">~${(balance * 0.5).toFixed(2)} USD</div>
        </div>

        {/* Actions */}
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

        {/* Options */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/settings')}
            className="w-full bg-gray-800 hover:bg-gray-700 rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-gray-400" />
              <span className="text-white font-medium">Settings</span>
            </div>
            <span className="text-gray-400">→</span>
          </button>
          <button
            onClick={() => {}}
            className="w-full bg-gray-800 hover:bg-gray-700 rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-gray-400" />
              <span className="text-white font-medium">Transaction History</span>
            </div>
            <span className="text-gray-400">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

