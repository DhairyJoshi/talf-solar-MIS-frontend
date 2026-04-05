import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Project, ChartDataPoint, TimeRange, KPIResult, MonthlyKPI } from '../types';
import { filterMonthlyData } from '../services/dataService';
import { useProject, useKPIs, useTriggerSync, useRecalculateKPIs, useModuleBuilds, useUpdateProject, useDeleteProject } from '../services/queries';
import CombinedPerformanceChart from '../components/CombinedPerformanceChart';
import DataEntryModal from '../components/DataEntryModal';
import ProjectManagementModal from '../components/ProjectManagementModal';
import { useAuth } from '../context/AuthContext';
import InverterComparisonTable from '../components/InverterComparisonTable';
import InverterComparisonChart from '../components/InverterComparisonChart';
import InverterAdditionModal from '../components/InverterAdditionModal';

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
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isInverterModalOpen, setInverterModalOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('12M');

  const { data: project } = useProject(projectCode || '');
  const { data: kpisArray } = useKPIs(projectCode || '');
  const { data: moduleBuilds = [] } = useModuleBuilds();

  const aggregatedKPIs: KPIResult | null = useMemo(() => {
    if (!kpisArray || kpisArray.length === 0) return null;

    const commissioningYearMonth = new Date(project.dateOfCommissioning).toISOString().slice(0, 7);
    const sorted = [...kpisArray].sort((a, b) => a.month.localeCompare(b.month));

    // Determine target months based on timeRange
    let targetMonths = sorted;
    if (timeRange === '6M') targetMonths = sorted.slice(-6);
    else if (timeRange === '12M') targetMonths = sorted.slice(-12);

    if (targetMonths.length === 0) return null;

    const totalExport = targetMonths.reduce((sum, m) => sum + m.total_yield_kwh, 0);
    const totalRevenue = targetMonths.reduce((sum, m) => sum + (m.revenue || 0), 0);
    const totalTargetP50 = targetMonths.reduce((sum, m) => sum + (m.target_p50_kwh || 0), 0);

    // For ratios, we average them (simplification for dashboard)
    const avgPR = targetMonths.filter(m => m.pr_percentage !== null).length > 0
      ? targetMonths.reduce((sum, m) => sum + (m.pr_percentage || 0), 0) / targetMonths.filter(m => m.pr_percentage !== null).length
      : 0;
    const avgCUF = targetMonths.filter(m => m.cuf_percentage !== null).length > 0
      ? targetMonths.reduce((sum, m) => sum + (m.cuf_percentage || 0), 0) / targetMonths.filter(m => m.cuf_percentage !== null).length
      : 0;

    const lastMonth = targetMonths[targetMonths.length - 1];

    return {
      totalCapacityKWac: project.inverters.reduce((sum, inv) => sum + inv.kwac, 0),
      totalCapacityKWdc: project.inverters.reduce((sum, inv) => sum + (inv.moduleCount || 0) * 0.540, 0), // Fallback calculation
      tariff: project.tariff || 4.5,
      totalExport,
      totalImport: 0,
      netEnergy: totalExport,
      revenue: totalRevenue,
      targetRevenue: totalTargetP50 * (project.tariff || 4.5), // Placeholder calculation
      yield: totalExport / (project.inverters.reduce((sum, inv) => sum + (inv.moduleCount || 0) * 0.540, 0) || 1),
      pr: avgPR,
      cuf: avgCUF,
      dcCuf: avgCUF, // Assuming backend cuf_percentage is DC CUF
      co2Reduction: (totalExport / 1000) * 0.7,
      targetP50: totalTargetP50,
      targetOM: totalTargetP50 * 0.95,
      totalDays: targetMonths.length * 30,
      averageDailyYield: (totalExport / (project.inverters.reduce((sum, inv) => sum + (inv.moduleCount || 0) * 0.540, 0) || 1)) / (targetMonths.length * 30),
    };
  }, [kpisArray, timeRange, project]);

  const syncMutation = useTriggerSync(projectCode || '');
  const recalculateMutation = useRecalculateKPIs(projectCode || '');
  const updateProjectMutation = useUpdateProject(projectCode || '');
  const deleteProjectMutation = useDeleteProject();

  const handleUpdateProject = (projectData: Project) => {
    updateProjectMutation.mutate(projectData, {
      onSuccess: () => setEditModalOpen(false),
      onError: (err: any) => alert("Update failed: " + err.message)
    });
  };

  const handleDeleteProject = () => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      deleteProjectMutation.mutate(project?.id as number, {
        onSuccess: () => window.location.href = '/'
      });
    }
  };

  const role = currentUser?.role?.toLowerCase();
  const canEdit = role === 'admin';
  const canUpdateData = role === 'admin' || role === 'operations';

  const chartData: ChartDataPoint[] = useMemo(() => {
    if (!kpisArray || kpisArray.length === 0) return [];

    const sorted = [...kpisArray].sort((a, b) => a.month.localeCompare(b.month));
    let targetMonths = sorted;
    if (timeRange === '6M') targetMonths = sorted.slice(-6);
    else if (timeRange === '12M') targetMonths = sorted.slice(-12);

    return targetMonths.map(m => ({
      month: m.month,
      actualEnergy: m.total_yield_kwh,
      targetEnergyP50: m.target_p50_kwh || 0,
      targetEnergyOM: (m.target_p50_kwh || 0) * 0.95,
      revenue: m.revenue || (m.total_yield_kwh * (project?.tariff || 4.5)),
      targetRevenueP50: (m.target_p50_kwh || 0) * (project?.tariff || 4.5),
      targetRevenueOM: (m.target_p50_kwh || 0) * 0.95 * (project?.tariff || 4.5),
      pr: m.pr_percentage || 0,
      dcCuf: m.cuf_percentage || 0,
    }));
  }, [kpisArray, timeRange, project]);

  if (!project) return <div className="p-10 text-center text-white">Loading Project...</div>;

  const kpis = aggregatedKPIs;
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
                onClick={() => setEditModalOpen(true)}
                className="bg-solar-card text-white border border-solar-border font-bold px-4 py-2 rounded hover:bg-gray-800 transition text-sm flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
                Edit Config
              </button>
              <button
                onClick={handleDeleteProject}
                className="bg-red-500/10 text-red-500 border border-red-500/50 font-bold px-4 py-2 rounded hover:bg-red-500 hover:text-white transition text-sm flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
                Delete
              </button>
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
          <div className="kpi-card"><p className="kpi-label">Capacity (KW DC)</p><p className="kpi-value">{kpis.totalCapacityKWdc?.toLocaleString(undefined, { maximumFractionDigits: 1 })}</p></div>
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
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Inverter Summary</h3>
          {canEdit && (
            <button 
              onClick={() => setInverterModalOpen(true)} 
              className="px-3 py-1 text-xs bg-solar-accent text-solar-bg font-bold rounded hover:bg-yellow-400 transition"
            >
              + Add / Configure Inverters
            </button>
          )}
        </div>
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
      {isEditModalOpen && (
        <ProjectManagementModal 
          isOpen={isEditModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSave={handleUpdateProject}
          initialProject={project}
        />
      )}
      {isInverterModalOpen && (
        <InverterAdditionModal
          isOpen={isInverterModalOpen}
          onClose={() => setInverterModalOpen(false)}
          projectId={project.id as number}
          projectName={project.projectName}
        />
      )}
      <style>{`.kpi-card { background-color: #1B263B; padding: 1rem; border-radius: 0.5rem; border: 1px solid #415A77; } .kpi-label { color: #A0AEC0; font-size: 0.75rem; text-transform: uppercase; } .kpi-value { font-size: 1.25rem; font-weight: bold; color: white; } .link { color: #63B3ED; }`}</style>
    </div>
  );
};

export default ProjectDetailsPage;
