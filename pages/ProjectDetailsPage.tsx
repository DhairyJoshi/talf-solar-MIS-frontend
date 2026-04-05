import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Project, ChartDataPoint, TimeRange, KPIResult } from '../types';
import { filterMonthlyData } from '../services/dataService';
import { useProject, useKPIs, useTriggerSync, useRecalculateKPIs, useModuleBuilds } from '../services/queries';
import CombinedPerformanceChart from '../components/CombinedPerformanceChart';
import DataEntryModal from '../components/DataEntryModal';
import { useAuth } from '../context/AuthContext';
import InverterComparisonTable from '../components/InverterComparisonTable';
import InverterComparisonChart from '../components/InverterComparisonChart';

const formatIndian = (val: number, type: 'curr' | 'unit' = 'unit') => {
  const prefix = type === 'curr' ? '₹' : '';
  if (val === undefined || val === null || isNaN(val)) return '-';
  if (val >= 10000000) return `${prefix}${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `${prefix}${(val / 100000).toFixed(2)} L`;
  if (val >= 1000) return `${prefix}${(val / 1000).toFixed(1)}k`;
  return `${prefix}${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

const ProjectDetailsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { projectCode } = useParams();
  const [isEntryModalOpen, setEntryModalOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('12M');

  const { data: project } = useProject(projectCode || '');
  const { data: kpis } = useKPIs(projectCode || '');
  const { data: moduleBuilds = [] } = useModuleBuilds();
  
  const syncMutation = useTriggerSync(projectCode || '');
  const recalculateMutation = useRecalculateKPIs(projectCode || '');

  const role = currentUser?.role?.toLowerCase();
  const canEdit = role === 'admin';
  const canUpdateData = role === 'admin' || role === 'operations';
  
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (!project || !project.monthlyData) return [];
    
    const monthlyValues = filterMonthlyData(project.monthlyData, timeRange);
    
    return monthlyValues.sort((a, b) => a.month.localeCompare(b.month)).map(m => {
       const exportVal = (m.inverterExportKWh || []).reduce((s, v) => s + v, 0);
       return {
         month: m.month,
         actualEnergy: exportVal - (m.electricityImportedKWh || 0),
         targetEnergyP50: m.targetNetKWhP50 || 0,
         targetEnergyOM: (m.inverterTargetOMKWh || []).reduce((s, v) => s + v, 0),
         revenue: (exportVal - (m.electricityImportedKWh || 0)) * (project.tariff || 4.5),
         targetRevenueP50: (m.targetNetKWhP50 || 0) * (project.tariff || 4.5),
         targetRevenueOM: (m.inverterTargetOMKWh || []).reduce((s, v) => s + v, 0) * (project.tariff || 4.5),
       };
    });
  }, [project, timeRange]);

  if (!project) return <div className="p-10 text-center text-white">Loading Project...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
           <Link to="/" className="text-gray-400 hover:text-white text-sm mb-2 inline-block">← Back to Dashboard</Link>
           <h1 className="text-3xl font-bold text-white">{project.projectName}</h1>
           <p className="text-solar-text text-sm mt-1">{project.projectState} • Code: {projectCode}</p>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center bg-solar-bg rounded-lg border border-solar-border p-1 px-2">
                <span className="text-xs text-gray-400 px-2 uppercase font-bold">Timeline</span>
                {(['6M', '12M', 'ALL'] as TimeRange[]).map(range => (
                    <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 text-xs rounded font-medium transition ${timeRange === range ? 'bg-solar-success text-black' : 'text-gray-300 hover:bg-gray-700'}`}
                    >
                    {range}
                    </button>
                ))}
            </div>
            {canEdit && (
              <div className="flex gap-2">
                <button 
                  onClick={() => recalculateMutation.mutate()} 
                  disabled={recalculateMutation.isPending}
                  className="bg-solar-card text-solar-accent border border-solar-accent font-bold px-4 py-2 rounded hover:bg-solar-accent hover:text-black transition disabled:opacity-50 text-sm"
                >
                  {recalculateMutation.isPending ? 'Recalculating...' : 'Recalculate KPIs'}
                </button>
                <button 
                  onClick={() => syncMutation.mutate()} 
                  disabled={syncMutation.isPending}
                  className={`bg-solar-success/20 text-solar-success border border-solar-success font-bold px-4 py-2 rounded shadow hover:bg-solar-success hover:text-black transition disabled:opacity-50 text-sm`}
                >
                  {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
            )}
            {canUpdateData && <button onClick={() => setEntryModalOpen(true)} className="bg-solar-accent text-black font-bold px-4 py-2 rounded shadow hover:bg-yellow-400 transition">Update Monthly Data</button>}
        </div>
      </div>

      {kpis ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="kpi-card"><p className="kpi-label">Capacity (KW DC)</p><p className="kpi-value">{kpis.totalCapacityKWdc?.toLocaleString(undefined, {maximumFractionDigits: 1})}</p></div>
          <div className="kpi-card"><p className="kpi-label">Fixed Tariff</p><p className="kpi-value text-solar-accent">₹{kpis.tariff?.toFixed(3)}</p></div>
          <div className="kpi-card"><p className="kpi-label">Avg PR</p><p className="kpi-value text-blue-300">{kpis.pr?.toFixed(1)}%</p></div>
          <div className="kpi-card"><p className="kpi-label">Avg DC CUF</p><p className="kpi-value text-teal-300">{kpis.dcCuf?.toFixed(1)}%</p></div>
          <div className="kpi-card"><p className="kpi-label">Avg. Daily Yield</p><p className="kpi-value">{kpis.averageDailyYield?.toFixed(2)} <span className="text-sm font-normal text-gray-400">kWh/kW/day</span></p></div>
        </div>
      ) : (
        <div className="p-4 bg-solar-card border border-solar-border rounded text-center text-gray-400">KPI data is being computed...</div>
      )}

      <div className="bg-solar-card rounded-lg border border-solar-border">
        <div className="p-4 border-b border-solar-border">
          <h3 className="text-lg font-semibold text-white">Project Performance Trends</h3>
        </div>
        <CombinedPerformanceChart data={chartData} height={450} user={currentUser} hasContainer={false} />
        {kpis && (
          <div className="p-6 border-t border-solar-border">
              <h3 className="text-lg font-semibold text-white mb-4">Period Totals ({timeRange})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                <div className="kpi-card text-center">
                  <p className="kpi-label">Revenue</p>
                  <p className="kpi-value text-solar-accent font-mono">{formatIndian(kpis.revenue, 'curr')}</p>
                </div>
                <div className="kpi-card text-center">
                  <p className="kpi-label">Target Rev (O&M)</p>
                  <p className="kpi-value text-orange-400 font-mono">{formatIndian(kpis.targetRevenue, 'curr')}</p>
                </div>
                <div className="kpi-card text-center">
                  <p className="kpi-label">Net Energy</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <p className="kpi-value text-solar-success font-mono">{formatIndian(kpis.netEnergy, 'unit')}</p>
                    <span className="text-sm text-gray-400">kWh</span>
                  </div>
                </div>
                <div className="kpi-card text-center">
                  <p className="kpi-label">Target (O&M)</p>
                   <div className="flex items-baseline justify-center gap-1">
                    <p className="kpi-value font-mono">{formatIndian(kpis.targetOM, 'unit')}</p>
                     <span className="text-sm text-gray-400">kWh</span>
                  </div>
                </div>
                <div className="kpi-card text-center">
                  <p className="kpi-label">CO2 Offset</p>
                  <p className="kpi-value text-teal-300 font-mono">{Math.floor(kpis.co2Reduction || 0)} <span className="text-sm font-normal">Tons</span></p>
                </div>
              </div>
          </div>
        )}
      </div>
      
      <div className="bg-solar-card rounded-lg border border-solar-border p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Inverter Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
            {project.inverters.map((inv: any) => (
              <Link to={`/project/${project.projectCode}/inverter/${inv.id}`} key={inv.id} className="bg-solar-bg p-3 rounded border border-solar-border hover:border-solar-accent hover:scale-105 transition-all duration-200 block">
                <p className="font-semibold text-solar-accent">{inv.name || inv.serial_number}</p>
                <p className="text-sm text-gray-300">{inv.kwac || inv.capacity_kw} <span className="text-xs text-gray-500">KWac</span></p>
                <p className="text-xs text-gray-400 mt-1">SN: {inv.serial_number}</p>
              </Link>
            ))}
          </div>
      </div>

      {isEntryModalOpen && (
        <DataEntryModal 
          isOpen={isEntryModalOpen} 
          onClose={() => setEntryModalOpen(false)} 
          project={project} 
        />
      )}
      <style>{`.kpi-card { background-color: #1B263B; padding: 1rem; border-radius: 0.5rem; border: 1px solid #415A77; } .kpi-label { color: #A0AEC0; font-size: 0.75rem; text-transform: uppercase; } .kpi-value { font-size: 1.25rem; font-weight: bold; color: white; } .link { color: #63B3ED; }`}</style>
    </div>
  );
};

export default ProjectDetailsPage;
