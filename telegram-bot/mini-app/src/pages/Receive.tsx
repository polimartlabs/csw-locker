import { useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function Receive() {
  const navigate = useNavigate();
  const { currentWallet } = useWallet();
  const [copied, setCopied] = useState(false);

  const address = currentWallet?.contractAddress || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <h1 className="text-2xl font-bold text-white">Receive STX</h1>
        </div>

        {!currentWallet ? (
          <div className="bg-gray-800 rounded-xl p-6 text-center">
            <p className="text-gray-400">No wallet selected</p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="text-center mb-6">
              <div className="bg-white rounded-xl p-4 inline-block mb-4">
                {/* QR Code placeholder */}
                <div className="w-48 h-48 bg-gray-200 rounded flex items-center justify-center">
                  <span className="text-gray-500 text-sm">QR Code</span>
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-2">Send STX to this address</p>
            </div>

            <div className="bg-gray-700 rounded-lg p-4 mb-4">
              <p className="text-white text-sm break-all font-mono">{address}</p>
            </div>

            <button
              onClick={handleCopy}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy Address
                </>
              )}
            </button>

            <div className="mt-6 bg-blue-900/30 border border-blue-500/50 rounded-lg p-4">
              <p className="text-blue-200 text-sm">
                ⚠️ Only send STX and SIP-010 tokens to this address. 
                Sending other assets may result in permanent loss.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

