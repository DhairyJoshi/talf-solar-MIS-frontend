import React, { useState } from 'react';
import { useModuleBuilds, useAddInverter } from '../services/queries';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  projectName: string;
}

const InverterAdditionModal: React.FC<Props> = ({ isOpen, onClose, projectId, projectName }) => {
  const { data: moduleBuilds = [] } = useModuleBuilds();
  const addInverterMutation = useAddInverter(projectId);

  const [formData, setFormData] = useState({
    serial_number: '',
    vendor_type: 'SOLIS',
    api_key: '',
    api_secret: '',
    module_build_id: ''
  });

  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.serial_number || !formData.module_build_id) {
      setError("Please fill in all required fields.");
      return;
    }

    addInverterMutation.mutate({
      serial_number: formData.serial_number,
      vendor_type: formData.vendor_type,
      api_key: formData.api_key,
      api_secret: formData.api_secret,
      module_build_id: parseInt(formData.module_build_id, 10)
    }, {
      onSuccess: () => {
        onClose();
        setFormData({
          serial_number: '',
          vendor_type: 'SOLIS',
          api_key: '',
          api_secret: '',
          module_build_id: ''
        });
      },
      onError: (err: any) => {
        setError(err.message || "Failed to add inverter.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-solar-bg w-full max-w-md rounded-lg border border-solar-border shadow-2xl animate-fadeIn">
        <div className="p-6 border-b border-solar-border flex justify-between items-center">
          <h2 className="text-xl font-bold text-solar-accent">Add Inverter to {projectName}</h2>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-white">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="label text-xs uppercase font-bold text-gray-400 mb-1 block">Inverter Serial Number *</label>
            <input
              type="text"
              required
              className="input-field w-full"
              value={formData.serial_number}
              onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
              placeholder="e.g. 110D2105123456"
            />
          </div>

          <div>
            <label className="label text-xs uppercase font-bold text-gray-400 mb-1 block">Vendor / API Type</label>
            <select
              className="input-field w-full"
              value={formData.vendor_type}
              onChange={(e) => setFormData({ ...formData, vendor_type: e.target.value })}
            >
              <option value="SOLIS">SolisCloud</option>
              <option value="GROWATT">Growatt (Coming Soon)</option>
              <option value="SUNGROW">Sungrow (Coming Soon)</option>
            </select>
          </div>

          <div>
            <label className="label text-xs uppercase font-bold text-gray-400 mb-1 block">Module Build *</label>
            <select
              required
              className="input-field w-full"
              value={formData.module_build_id}
              onChange={(e) => setFormData({ ...formData, module_build_id: e.target.value })}
            >
              <option value="">Select Module Specification...</option>
              {moduleBuilds.map((build: any) => (
                <option key={build.id} value={build.id}>
                  {build.manufacturer} {build.model_name} ({build.rated_power_wp}Wp)
                </option>
              ))}
            </select>
            {moduleBuilds.length === 0 && (
              <p className="text-[10px] text-red-400 mt-1 italic">No module builds defined. Manage Modules first.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label text-xs uppercase font-bold text-gray-400 mb-1 block">API Key (Optional)</label>
              <input
                type="password"
                className="input-field w-full text-xs"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                placeholder="Key Id"
              />
            </div>
            <div>
              <label className="label text-xs uppercase font-bold text-gray-400 mb-1 block">API Secret (Optional)</label>
              <input
                type="password"
                className="input-field w-full text-xs"
                value={formData.api_secret}
                onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                placeholder="Secret Key"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-solar-border rounded font-semibold text-gray-400 hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addInverterMutation.isPending}
              className="flex-1 py-2 px-4 bg-solar-success text-white font-bold rounded hover:bg-green-600 transition disabled:opacity-50"
            >
              {addInverterMutation.isPending ? 'Adding...' : 'Add Inverter'}
            </button>
          </div>
        </form>
      </div>
      
      <style>{`
        .input-field { 
          background: #1B263B; 
          border: 1px solid #415A77; 
          border-radius: 4px; 
          padding: 10px; 
          color: white; 
          outline: none; 
          transition: border-color 0.2s;
        }
        .input-field:focus { border-color: #FFD700; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default InverterAdditionModal;
