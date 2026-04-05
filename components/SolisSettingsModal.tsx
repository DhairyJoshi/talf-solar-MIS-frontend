
import React, { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenModuleBuildsModal: () => void;
}

const SolisSettingsModal: React.FC<Props> = ({ isOpen, onClose, onOpenModuleBuildsModal }) => {
  const [apiKey, setApiKey] = useState('PLATFORM_KEY');
  const [apiSecret, setApiSecret] = useState('****************');
  const [apiBaseUrl, setApiBaseUrl] = useState('https://api.soliscloud.com');

  const handleSave = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
      <div className="bg-solar-bg w-full max-w-md m-4 rounded-lg border border-solar-border shadow-2xl flex flex-col">
        <div className="p-6 border-b border-solar-border flex justify-between items-center">
          <h2 className="text-xl font-bold text-solar-accent">Settings</h2>
          <button onClick={onClose} className="text-2xl text-solar-text hover:text-white">&times;</button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">SolisCloud API</h3>
            <label className="block text-sm text-gray-400 mb-1">API Base URL</label>
            <input
              type="text"
              placeholder="e.g., https://api.soliscloud.com"
              className="w-full bg-solar-card border border-solar-border rounded p-2 text-white focus:border-solar-accent outline-none"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">API Key</label>
            <input
              type="text"
              placeholder="Enter your SolisCloud API Key"
              className="w-full bg-solar-card border border-solar-border rounded p-2 text-white focus:border-solar-accent outline-none"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">API Secret</label>
            <input
              type="password"
              placeholder="Enter your SolisCloud API Secret"
              className="w-full bg-solar-card border border-solar-border rounded p-2 text-white focus:border-solar-accent outline-none"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
            />
          </div>
          <p className="text-xs text-gray-500">
            Find your credentials in SolisCloud under "Account" &rarr; "Basic Settings" &rarr; "API Management". Credentials are stored securely in your browser.
          </p>

          <div className="pt-4 mt-4 border-t border-solar-border">
            <h3 className="text-lg font-semibold text-white mb-2">Technical Data</h3>
            <button onClick={onOpenModuleBuildsModal} className="w-full px-4 py-2 rounded text-white bg-solar-border hover:bg-gray-600 transition">
              Manage Module Builds
            </button>
          </div>
        </div>

        <div className="p-6 border-t border-solar-border flex justify-end gap-4">
          <button onClick={onClose} className="px-4 py-2 rounded text-gray-300 hover:bg-solar-card">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 rounded bg-solar-success text-white font-bold hover:bg-green-600">Save</button>
        </div>
      </div>
    </div>
  );
};

export default SolisSettingsModal;
