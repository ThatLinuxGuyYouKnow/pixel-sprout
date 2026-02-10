import React, { useState, useEffect } from 'react';
import { Settings, X, Copy, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiStatus: 'ready' | 'missing' | 'error';
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, apiStatus }) => {
  const [apiKey, setApiKey] = useState('');
  const [displayKey, setDisplayKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [copied, setCopied] = useState(false);

  // Load API key on mount
  useEffect(() => {
    const saved = localStorage.getItem('GEMINI_API_KEY');
    if (saved) {
      setApiKey(saved);
      setDisplayKey(saved.substring(0, 8) + '...' + saved.substring(saved.length - 4));
    }
  }, [isOpen]);

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
      return;
    }

    setSaveStatus('saving');
    // Simulate brief save delay
    setTimeout(() => {
      localStorage.setItem('GEMINI_API_KEY', apiKey.trim());
      setDisplayKey(apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4));
      setSaveStatus('saved');
      
      // Trigger a page reload to use the new key
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }, 300);
  };

  const handleCopyKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClearKey = () => {
    if (confirm('Are you sure you want to clear your API key?')) {
      localStorage.removeItem('GEMINI_API_KEY');
      setApiKey('');
      setDisplayKey('');
      setSaveStatus('saved');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 p-4">
      <div className="bg-gray-900 border-4 border-purple-600 rounded-lg w-full max-w-md shadow-2xl">
        
        {/* Header */}
        <div className="bg-gray-800 p-4 border-b-4 border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-xl uppercase tracking-widest">
            <Settings size={24} />
            Settings
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* API Status Section */}
          <div>
            <h3 className="text-purple-400 font-bold mb-2 uppercase tracking-wide">API Status</h3>
            <div className={`p-3 rounded border-2 ${
              apiStatus === 'ready' 
                ? 'bg-green-900/40 border-green-600 text-green-300'
                : apiStatus === 'error'
                ? 'bg-red-900/40 border-red-600 text-red-300'
                : 'bg-yellow-900/40 border-yellow-600 text-yellow-300'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  apiStatus === 'ready' ? 'bg-green-500' : apiStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                }`}></div>
                <span className="font-mono text-sm">
                  {apiStatus === 'ready' 
                    ? 'API Key Active - Dynamic Dialogue Enabled' 
                    : apiStatus === 'error'
                    ? 'API Error - Using Hardcoded Hints'
                    : 'No API Key - Using Hardcoded Hints'}
                </span>
              </div>
            </div>
          </div>

          {/* API Key Input */}
          <div>
            <label className="text-purple-400 font-bold uppercase tracking-wide text-sm block mb-2">
              Gemini API Key
            </label>
            <p className="text-gray-400 text-xs mb-3">
              Get your free API key from <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">Google AI Studio</a>. Your key is stored locally and never sent to our servers.
            </p>
            
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setSaveStatus('idle');
                }}
                placeholder="sk-proj-xxxxxxxxxxxxxxxxxxxxx"
                className="w-full bg-gray-800 border-2 border-gray-600 text-white px-3 py-2 rounded font-mono text-xs focus:border-purple-500 outline-none"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showKey ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>

            {apiKey && (
              <div className="mt-2 text-xs text-gray-400">
                Key: {displayKey}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={handleSaveApiKey}
              disabled={!apiKey.trim() || saveStatus === 'saving' || saveStatus === 'saved'}
              className={`w-full py-2 rounded font-bold uppercase text-sm tracking-wider transition-all ${
                saveStatus === 'saved'
                  ? 'bg-green-700 text-white border-2 border-green-600'
                  : apiKey.trim()
                  ? 'bg-purple-700 hover:bg-purple-600 text-white border-2 border-purple-600'
                  : 'bg-gray-700 text-gray-500 border-2 border-gray-600 cursor-not-allowed'
              }`}
            >
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? '✓ Saved' : 'Save API Key'}
            </button>

            {apiKey && (
              <button
                onClick={handleCopyKey}
                className="w-full py-2 rounded font-bold uppercase text-sm tracking-wider bg-gray-700 hover:bg-gray-600 text-gray-300 border-2 border-gray-600 transition-all flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check size={16} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy Key
                  </>
                )}
              </button>
            )}

            {displayKey && (
              <button
                onClick={handleClearKey}
                className="w-full py-2 rounded font-bold uppercase text-sm tracking-wider bg-red-900 hover:bg-red-800 text-red-300 border-2 border-red-700 transition-all"
              >
                Clear Saved Key
              </button>
            )}
          </div>

          {/* Info Box */}
          <div className="p-3 bg-blue-900/40 border-l-4 border-blue-500 rounded">
            <p className="text-blue-200 text-xs leading-relaxed">
              <span className="font-bold">ℹ️ About:</span> With a Gemini API key, NPCs will provide unique, contextual dialogue instead of generic hints. The model is Google's Gemini 2.5 Flash.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-800 p-4 border-t-4 border-gray-700 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded font-bold uppercase text-sm bg-gray-700 hover:bg-gray-600 text-white border-2 border-gray-600 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
