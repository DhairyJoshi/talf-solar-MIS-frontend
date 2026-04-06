import React, { useState, useEffect } from 'react';
import { Project } from '../types';
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

          <div className="mt-4 p-4 bg-solar-accent/5 border border-solar-accent/20 rounded text-center">
            <p className="text-sm text-gray-400">
              <span className="text-solar-accent font-bold">Note:</span> Inverters and Module specifications can be added and managed from the <span className="italic">Project Details</span> page after the project is created.
            </p>
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
        .input-field { width: 100%; background-color: #1B263B; border: 1px solid #415A77; border-radius: 4px; padding: 8px; color: white; outline: none; }
        .input-field:focus { border-color: #FFD700; }
      `}</style>
    </div>
  );
};

export default ProjectManagementModal;
