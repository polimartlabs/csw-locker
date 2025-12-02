import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useTelegram } from '../hooks/useTelegram';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function CreateWallet() {
  const navigate = useNavigate();
  const { addWallet } = useWallet();
  const { user } = useTelegram();
  const [walletName, setWalletName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!walletName.trim()) {
      setError('Please enter a wallet name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // TODO: Integrate with actual contract deployment
      // For now, create a mock wallet
      // In production, this would:
      // 1. Generate a key pair
      // 2. Deploy the contract
      // 3. Store the wallet info
      
      const mockWallet = {
        id: Date.now().toString(),
        name: walletName,
        contractAddress: `SP${Math.random().toString(36).substring(2, 40).toUpperCase()}.bitcoin-locker`,
        balance: '0',
        network: 'testnet' as const
      };

      addWallet(mockWallet);
      
      // Show success and navigate
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to create wallet');
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-white">Create Wallet</h1>
        </div>

        {/* Form */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <label className="block text-white font-medium mb-2">Wallet Name</label>
          <input
            type="text"
            value={walletName}
            onChange={(e) => setWalletName(e.target.value)}
            placeholder="My Wallet"
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />

          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 mb-6">
            <h3 className="text-blue-300 font-medium mb-2">What you'll get:</h3>
            <ul className="text-blue-200 text-sm space-y-1">
              <li>• Secure smart wallet contract</li>
              <li>• Guardian-based recovery</li>
              <li>• Transaction protection</li>
              <li>• No seed phrase required</li>
            </ul>
          </div>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Wallet'
            )}
          </button>
        </div>

        <p className="text-gray-400 text-sm text-center">
          Note: Wallet creation requires a transaction on the Stacks blockchain.
          You'll need to connect your wallet to deploy.
        </p>
      </div>
    </div>
  );
}

