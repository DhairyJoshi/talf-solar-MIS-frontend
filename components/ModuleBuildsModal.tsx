
import React, { useState } from 'react';
import { ModuleBuild } from '../types';
import { useModuleBuilds, useCreateModuleBuild, useDeleteModuleBuild } from '../services/queries';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const emptyBuild: Omit<ModuleBuild, 'id'> = {
  manufacturer: '',
  model_name: '',
  rated_power_wp: 0,
  degradation_rate_pct: 0.5,
};

const ModuleBuildsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { data: builds = [] } = useModuleBuilds();
  const createMutation = useCreateModuleBuild();
  const deleteMutation = useDeleteModuleBuild();
  const [editingBuild, setEditingBuild] = useState<Partial<ModuleBuild> | null>(null);

  const handleSave = () => {
    if (!editingBuild || !editingBuild.manufacturer || !editingBuild.model_name) return;
    createMutation.mutate(editingBuild, {
      onSuccess: () => setEditingBuild(null)
    });
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this module build?")) {
      deleteMutation.mutate(id);
    }
  };

  const startNew = () => setEditingBuild({ ...emptyBuild });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
      <div className="bg-solar-bg w-full max-w-4xl m-4 rounded-lg border border-solar-border shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-solar-border flex justify-between items-center">
          <h2 className="text-xl font-bold text-solar-accent">Manage Module Builds</h2>
          <button onClick={onClose} className="text-2xl text-solar-text hover:text-white">&times;</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* List View */}
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-white">Existing Database</h3>
              <button onClick={startNew} className="text-sm bg-solar-accent text-black px-3 py-1 rounded font-bold hover:bg-yellow-300 transition">+ New</button>
            </div>
            <div className="space-y-2 overflow-y-auto pr-2">
              {builds.map(build => (
                <div key={build.id} className="bg-solar-card border border-solar-border p-3 rounded flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-white">{build.manufacturer} <span className="text-solar-accent">{build.model_name}</span></p>
                    <p className="text-xs text-gray-400">{build.rated_power_wp} Wp · {build.degradation_rate_pct}% p.a. degradation</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingBuild(build)} className="text-xs text-blue-400 hover:text-blue-300">Edit</button>
                    <button onClick={() => handleDelete(build.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                  </div>
                </div>
              ))}
              {builds.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No module builds configured.</p>}
            </div>
          </div>

          {/* Form View */}
          <div>
            {editingBuild ? (
              <div className="space-y-4 bg-solar-card p-4 rounded-lg border border-solar-border">
                <h3 className="font-semibold text-white">{editingBuild.id ? 'Edit Build' : 'New Build'}</h3>
                <div>
                  <label className="label">Manufacturer</label>
                  <input type="text" value={editingBuild.manufacturer} onChange={e => setEditingBuild(p => ({ ...p, manufacturer: e.target.value }))} className="input-field" placeholder="e.g. Jinko Solar" />
                </div>
                <div>
                  <label className="label">Model Name</label>
                  <input type="text" value={editingBuild.model_name} onChange={e => setEditingBuild(p => ({ ...p, model_name: e.target.value }))} className="input-field" placeholder="e.g. Tiger Pro 550" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Rated Power (Wp)</label><input type="number" value={editingBuild.rated_power_wp} onChange={e => setEditingBuild(p => ({ ...p, rated_power_wp: parseFloat(e.target.value) }))} className="input-field" /></div>
                  <div><label className="label">Degradation (% p.a.)</label><input type="number" step="0.01" value={editingBuild.degradation_rate_pct} onChange={e => setEditingBuild(p => ({ ...p, degradation_rate_pct: parseFloat(e.target.value) }))} className="input-field" /></div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button onClick={() => setEditingBuild(null)} className="px-3 py-1 text-sm rounded text-gray-300 hover:bg-solar-border">Cancel</button>
                  <button onClick={handleSave} className="px-3 py-1 text-sm rounded bg-solar-success text-white font-bold hover:bg-green-600">Save</button>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 pt-10">Select a build to edit or create a new one.</div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-solar-border flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded bg-solar-border text-white font-bold hover:bg-gray-600">Close</button>
        </div>
      </div>
      <style>{`
        .label { display: block; font-size: 0.875rem; color: #a0aec0; margin-bottom: 0.25rem; }
        .input-field { width: 100%; background-color: #0D1B2A; border: 1px solid #415A77; border-radius: 4px; padding: 8px; color: white; outline: none; }
        .input-field:focus { border-color: #FFD700; }
      `}</style>
    </div>
  );
};

export default ModuleBuildsModal;
