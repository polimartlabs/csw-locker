import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function Send() {
  const navigate = useNavigate();
  const { currentWallet } = useWallet();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!recipient.trim()) {
      setError('Please enter recipient address');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!currentWallet) {
      setError('No wallet selected');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // TODO: Implement actual transaction
      // This would use Stacks Connect or sign transaction
      console.log('Sending:', { recipient, amount, memo });
      
      // Simulate transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to send transaction');
    } finally {
      setLoading(false);
    }
  };

  const balance = currentWallet ? parseFloat(currentWallet.balance || '0') : 0;

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
          <h1 className="text-2xl font-bold text-white">Send STX</h1>
        </div>

        {/* Form */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <div className="mb-4">
            <label className="block text-white font-medium mb-2">Recipient Address</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="SP..."
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-white font-medium">Amount (STX)</label>
              <span className="text-gray-400 text-sm">Balance: {balance.toFixed(2)} STX</span>
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.000001"
              min="0"
              max={balance.toString()}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              onClick={() => setAmount(balance.toString())}
              className="mt-2 text-blue-400 text-sm hover:text-blue-300"
            >
              Use Max
            </button>
          </div>

          <div className="mb-6">
            <label className="block text-white font-medium mb-2">Memo (Optional)</label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Add a note..."
              maxLength={34}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={loading || !recipient || !amount}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending...
              </>
            ) : (
              'Send'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

