import React, { useState, useEffect } from 'react';
import { Project, MonthlyData } from '../types';
import { useAuth } from '../context/AuthContext';
import { useAddMonthlyData, useUploadMonthlyCSV } from '../services/queries';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

const DataEntryModal: React.FC<Props> = ({ isOpen, onClose, project }) => {
  const { currentUser } = useAuth();
  const [localData, setLocalData] = useState<Record<string, MonthlyData>>({});
  const [tableRows, setTableRows] = useState<string[]>([]);
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const addMonthlyDataMutation = useAddMonthlyData(project.projectCode);
  const csvUploadMutation = useUploadMonthlyCSV(project.projectCode);

  const role = currentUser?.role?.toLowerCase();
  const isViewer = role === 'viewer';
  const isAdmin = role === 'admin';
  const isOps = role === 'operations';
  const canModify = isAdmin || isOps;

  useEffect(() => {
    if (isOpen && project) {
      setLocalData(JSON.parse(JSON.stringify(project.monthlyData || {})));
      const startDate = new Date(project.dateOfCommissioning);
      const endDate = new Date();
      const rows: string[] = [];
      const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      while (current <= endDate) {
        rows.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
        current.setMonth(current.getMonth() + 1);
      }
      setTableRows(rows.reverse());
      if (rows.length > 0) setOpenMonth(rows[0]);
    }
  }, [isOpen, project]);

  const handleInverterDataChange = (month: string, invIdx: number, field: keyof MonthlyData, value: number) => {
    setLocalData(prev => {
      const monthData = prev[month] || { month, electricityImportedKWh:0, targetNetKWhP50:0, inverterExportKWh:[], inverterTargetOMKWh:[], inverterIrradiation:[], inverterDcCapacityKW:[] };
      const arr = [...((monthData[field] as number[]) || project.inverters.map(() => 0))];
      arr[invIdx] = value;
      return { ...prev, [month]: { ...monthData, [field]: arr } };
    });
  };

  const handleManualSave = (month: string) => {
    const data = localData[month];
    if (data) {
      addMonthlyDataMutation.mutate(data, { onSuccess: () => alert(`Saved data for ${month}`) });
    }
  };

  const handleCSVUpload = () => {
    if (file) {
      csvUploadMutation.mutate(file, { onSuccess: () => { alert("Bulk CSV Upload Successful!"); onClose(); } });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-solar-bg w-full max-w-5xl h-[90vh] rounded-lg border border-solar-border shadow-2xl flex flex-col">
        <div className="p-6 border-b border-solar-border flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Ingest Performance Data: {project.projectName}</h2>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-white">&times;</button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* CSV Bulk Section */}
          <div className="bg-solar-card p-6 rounded-lg border border-solar-border border-dashed">
            <h3 className="text-solar-accent font-bold mb-2 uppercase text-xs tracking-wider">Bulk CSV Ingestion</h3>
            <p className="text-sm text-gray-400 mb-4">Upload a .csv file with columns: `month (YYYY-MM), energy_kwh`... or complete dataset.</p>
            <div className="flex items-center gap-4">
              <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-solar-border file:text-white hover:file:bg-gray-600" />
              <button disabled={!file || csvUploadMutation.isPending || !canModify} onClick={handleCSVUpload} className="px-4 py-2 rounded bg-solar-success text-white font-bold disabled:opacity-50 text-sm">
                {csvUploadMutation.isPending ? 'Uploading...' : 'Upload & Process'}
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-solar-border to-transparent" />
            <h3 className="text-center text-xs font-bold text-gray-500 uppercase py-4">Or Individual Monthly Adjustment</h3>
          </div>

          {tableRows.map(month => {
            const isExpanded = openMonth === month;
            const data = localData[month] || { month, inverterExportKWh: [] };
            return (
              <div key={month} className="bg-solar-card border border-solar-border rounded-lg overflow-hidden mb-2">
                <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition" onClick={() => setOpenMonth(isExpanded ? null : month)}>
                  <span className="font-mono text-solar-accent font-bold">{month}</span>
                  <div className="flex gap-4 items-center">
                    <span className="text-xs text-gray-500">{isExpanded ? 'Click to collapse' : 'Click to adjust details'}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleManualSave(month); }} 
                      disabled={isViewer || addMonthlyDataMutation.isPending || !canModify}
                      className="text-xs bg-solar-success/20 text-solar-success border border-solar-success px-2 py-1 rounded hover:bg-solar-success hover:text-black transition"
                    >
                       Save Month
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="p-4 bg-solar-bg border-t border-solar-border grid grid-cols-2 md:grid-cols-4 gap-4">
                    {project.inverters.map((inv: any, idx: number) => (
                      <div key={inv.serial_number} className="space-y-1">
                        <label className="text-[10px] text-gray-500 uppercase">{inv.name || inv.serial_number}</label>
                        <input 
                          type="number" 
                          value={data.inverterExportKWh?.[idx] || ''} 
                          onChange={(e) => handleInverterDataChange(month, idx, 'inverterExportKWh', parseFloat(e.target.value))}
                          disabled={isViewer || !canModify}
                          className="w-full bg-solar-card border border-solar-border rounded px-2 py-1 text-sm text-right focus:border-solar-accent outline-none"
                          placeholder="Export kWh"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-6 border-t border-solar-border flex justify-end bg-solar-card">
          <button onClick={onClose} className="px-6 py-2 bg-solar-border text-white font-bold rounded hover:bg-gray-600 transition">Close</button>
        </div>
      </div>
    </div>
  );
};

export default DataEntryModal;