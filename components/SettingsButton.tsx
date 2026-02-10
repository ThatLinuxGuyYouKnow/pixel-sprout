import React from 'react';
import { Settings } from 'lucide-react';

interface SettingsButtonProps {
  onClick: () => void;
  apiStatus: 'ready' | 'missing' | 'error';
}

const SettingsButton: React.FC<SettingsButtonProps> = ({ onClick, apiStatus }) => {
  return (
    <button
      onClick={onClick}
      className={`absolute top-4 right-4 z-30 p-2 rounded-lg border-2 transition-all flex items-center gap-1 ${
        apiStatus === 'ready'
          ? 'bg-green-900/80 border-green-600 hover:bg-green-800 text-green-400'
          : apiStatus === 'error'
          ? 'bg-red-900/80 border-red-600 hover:bg-red-800 text-red-400'
          : 'bg-gray-800/80 border-gray-600 hover:bg-gray-700 text-gray-400'
      }`}
      title={apiStatus === 'ready' ? 'Settings (API Ready)' : apiStatus === 'error' ? 'Settings (API Error)' : 'Settings (Configure API)'}
    >
      <Settings size={20} />
      {apiStatus === 'ready' && <span className="w-2 h-2 bg-green-500 rounded-full"></span>}
    </button>
  );
};

export default SettingsButton;
