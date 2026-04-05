import React, { useState, useEffect } from 'react';
import { Project, Inverter, ModuleBuild } from '../types';
import { useModuleBuilds } from '../services/queries';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project) => void;
  initialProject?: Project | null;
}

const ProjectManagementModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialProject }) => {
  const { data: moduleBuilds = [] } = useModuleBuilds();
  const [project, setProject] = useState<Project>({
    name: '',
    location: '',
    projectName: '',
    projectState: '',
    capacity_kw: 0,
    projectCode: '',
    projectOwner: '',
    dateOfCommissioning: new Date().toISOString(),
    tariff: 0,
    inverters: [],
    monthlyData: {}
  });

  const isEdit = !!initialProject;

  useEffect(() => {
    if (isOpen) {
      if (initialProject) {
        setProject(JSON.parse(JSON.stringify(initialProject)));
      } else {
        setProject({
          name: '',
          location: '',
          projectName: '',
          projectState: '',
          capacity_kw: 0,
          projectCode: '',
          projectOwner: '',
          dateOfCommissioning: new Date().toISOString().split('T')[0],
          tariff: 0,
          inverters: [],
          monthlyData: {}
        });
      }
    }
  }, [isOpen, initialProject]);

  const handleAddInverter = () => {
    setProject(prev => ({
      ...prev,
      inverters: [...prev.inverters, { name: `${project.name} Inv ${prev.inverters.length + 1}`, kwac: 0 }]
    }));
  };

  const handleRemoveInverter = (invIndex: number) => {
    const newInverters = [...project.inverters];
    newInverters.splice(invIndex, 1);
    setProject(prev => ({ ...prev, inverters: newInverters }));
  };

  const handleInverterChange = (invIndex: number, field: keyof Inverter, value: string | number) => {
    const newInverters = [...project.inverters];
    (newInverters[invIndex] as any)[field] = value;
    setProject(prev => ({ ...prev, inverters: newInverters }));
  };

  const totalKWac = project.inverters.reduce((sum, inv) => sum + (inv.kwac || 0), 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-solar-bg w-full max-w-6xl m-4 rounded-lg border border-solar-border shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-solar-border flex justify-between items-center">
          <h2 className="text-xl font-bold text-solar-accent">
            {isEdit ? 'Edit Project Configuration' : 'Create New Project'}
          </h2>
          <button onClick={onClose} className="text-2xl text-solar-text hover:text-white">&times;</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Metadata Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div>
              <label className="label">Project Name</label>
              <input
                type="text"
                placeholder="e.g. Solar Park A"
                className="input-field"
                value={project.name}
                onChange={(e) => setProject({ ...project, name: e.target.value, projectName: e.target.value })}
              />
            </div>
            <div>
              <label className="label">State / Location</label>
              <input
                type="text"
                placeholder="e.g. Rajasthan"
                className="input-field"
                value={project.location}
                onChange={(e) => setProject({ ...project, location: e.target.value, projectState: e.target.value })}
              />
            </div>
            <div>
              <label className="label">DC Capacity (kW)</label>
              <input
                type="number"
                className="input-field"
                value={project.capacity_kw}
                onChange={(e) => setProject({ ...project, capacity_kw: parseFloat(e.target.value) })}
              />
            </div>

            {isEdit && (
              <>
                <div>
                  <label className="label text-gray-500">Project Code (System ID)</label>
                  <input type="text" className="input-field bg-gray-900/50 cursor-not-allowed text-gray-500" value={project.projectCode || project.id} disabled />
                </div>
                <div>
                  <label className="label">Commissioning Date</label>
                  <input type="date" className="input-field" value={project.dateOfCommissioning.split('T')[0]} onChange={(e) => setProject({ ...project, dateOfCommissioning: new Date(e.target.value).toISOString() })} />
                </div>
                <div>
                  <label className="label">Fixed Tariff (₹)</label>
                  <input type="number" step="0.001" className="input-field" value={project.tariff} onChange={(e) => setProject({ ...project, tariff: parseFloat(e.target.value) })} />
                </div>
              </>
            )}
          </div>

          <div className="bg-solar-card p-4 rounded border border-solar-border mb-6 flex justify-around">
            <div className="text-center">
              <p className="text-gray-400 text-xs uppercase">Total Current AC Capacity</p>
              <p className="text-xl font-bold text-solar-success">{totalKWac.toLocaleString()} <span className="text-sm font-normal">kWac</span></p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Inverters & Modules</h3>
              <button onClick={handleAddInverter} className="px-4 py-1.5 text-sm bg-solar-accent text-solar-bg font-bold rounded hover:bg-yellow-400 transition shadow-lg shadow-yellow-400/20 underline-none">
                + Add Inverter
              </button>
            </div>
            {project.inverters.map((inv, iIdx) => (
              <div key={iIdx} className="bg-solar-card border border-solar-border rounded-lg p-5 grid grid-cols-1 md:grid-cols-5 gap-4 items-end animate-fadeIn">
                <div className="md:col-span-1">
                  <label className="label-sm">Inverter Name</label>
                  <input type="text" className="input-field-sm" value={inv.name} onChange={(e) => handleInverterChange(iIdx, 'name', e.target.value)} />
                </div>
                <div className="md:col-span-1">
                  <label className="label-sm">Solis SN (for API)</label>
                  <input type="text" className="input-field-sm" value={inv.solisSn || ''} onChange={(e) => handleInverterChange(iIdx, 'solisSn', e.target.value)} />
                </div>
                <div className="md:col-span-1">
                  <label className="label-sm">Module Build</label>
                  <select value={inv.moduleBuildId || ''} onChange={(e) => handleInverterChange(iIdx, 'moduleBuildId', parseInt(e.target.value))} className="input-field-sm w-full">
                    <option value="">Select Build...</option>
                    {moduleBuilds.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.manufacturer} {b.model_name}
                      </option>
                    ))}
                  </select>
                  {moduleBuilds.length === 0 && (
                    <p className="text-[10px] text-red-400 mt-1 leading-tight">No builds found. Add specs in 'Manage Modules' first.</p>
                  )}
                </div>
                <div className="md:col-span-1">
                  <label className="label-sm">Module Count</label>
                  <input type="number" className="input-field-sm" value={inv.moduleCount || ''} onChange={(e) => handleInverterChange(iIdx, 'moduleCount', parseInt(e.target.value, 10))} />
                </div>
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <label className="label-sm">Fixed KWac</label>
                    <input type="number" className="input-field-sm" value={inv.kwac} onChange={(e) => handleInverterChange(iIdx, 'kwac', parseFloat(e.target.value))} />
                  </div>
                  <button onClick={() => handleRemoveInverter(iIdx)} className="text-red-500 hover:text-red-400 text-2xl pb-1" title="Remove inverter">&times;</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-solar-border flex justify-end gap-4 bg-solar-bg/50">
          <button onClick={onClose} className="px-6 py-2 rounded font-semibold text-gray-400 hover:text-white transition">Cancel</button>
          <button onClick={() => onSave(project)} className="px-8 py-2 rounded bg-solar-success text-white font-bold hover:bg-green-600 transition shadow-lg shadow-green-600/20">
            {isEdit ? 'Update Project' : 'Create Project'}
          </button>
        </div>
      </div>
      <style>{`
        .label { display: block; font-size: 0.875rem; color: #a0aec0; margin-bottom: 0.25rem; }
        .label-sm { display: block; font-size: 0.75rem; color: #718096; margin-bottom: 0.25rem; }
        .input-field { width: 100%; background-color: #1B263B; border: 1px solid #415A77; border-radius: 4px; padding: 8px; color: white; outline: none; }
        .input-field-sm { width: 100%; background-color: #0D1B2A; border: 1px solid #415A77; border-radius: 4px; padding: 4px 8px; font-size: 0.875rem; color: white; outline: none; }
        .input-field:focus, .input-field-sm:focus { border-color: #FFD700; }
      `}</style>
    </div>
  );
};

export default ProjectManagementModal;
