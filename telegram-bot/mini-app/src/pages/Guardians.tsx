import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function Guardians() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentWallet } = useWallet();
  const [address, setAddress] = useState(searchParams.get('address') || '');
  const [guardians] = useState<string[]>([]); // TODO: Fetch from contract

  const isAddMode = window.location.pathname.includes('/add');
  const isRemoveMode = window.location.pathname.includes('/remove');

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
          <h1 className="text-2xl font-bold text-white">Guardians</h1>
        </div>

        {/* Add Guardian Form */}
        {(isAddMode || isRemoveMode) && (
          <div className="bg-gray-800 rounded-xl p-6 mb-6">
            <h2 className="text-white font-medium mb-4">
              {isAddMode ? 'Add Guardian' : 'Remove Guardian'}
            </h2>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="SP..."
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg">
              {isAddMode ? 'Add Guardian' : 'Remove Guardian'}
            </button>
          </div>
        )}

        {/* Guardians List */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-medium">Your Guardians</h2>
            {!isAddMode && (
              <button
                onClick={() => navigate('/guardians/add')}
                className="text-blue-400 text-sm font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            )}
          </div>

          {guardians.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">No guardians configured</p>
              <p className="text-gray-500 text-sm">
                Add guardians to enable recovery if you lose access to your wallet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {guardians.map((guardian) => (
                <div
                  key={guardian}
                  className="bg-gray-700 rounded-lg p-4 flex items-center justify-between"
                >
                  <p className="text-white text-sm break-all font-mono">{guardian}</p>
                  <button className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 bg-blue-900/30 border border-blue-500/50 rounded-lg p-4">
          <p className="text-blue-200 text-sm">
            Guardians can help you recover your wallet if you lose access. 
            Choose trusted friends or family members.
          </p>
        </div>
      </div>
    </div>
  );
}

