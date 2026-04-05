
import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { TimeRange, BreakdownEvent } from '../types';
import { filterMonthlyData } from '../services/dataService';
import { useAuth } from '../context/AuthContext';
import InverterBreakdownAnalysis from '../components/InverterBreakdownAnalysis';
import BreakdownEntryModal from '../components/BreakdownEntryModal';
import InverterLiveData from '../components/InverterLiveData';
import { useInverter, useProject, useBreakdownEvents, useAddBreakdownEvent, useDeleteBreakdownEvent } from '../services/queries';

const formatIndian = (val: number | undefined) => {
  if (val === undefined || val === null || isNaN(val)) return '-';
  if (val >= 10000000) return `${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `${(val / 100000).toFixed(2)} L`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
  return `${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

const SortIcon = ({ direction }: { direction: 'asc' | 'desc' | null }) => {
  if (!direction) return <span className="text-gray-600 ml-1 opacity-0 group-hover:opacity-50">⇅</span>;
  return <span className="text-solar-accent ml-1">{direction === 'asc' ? '▲' : '▼'}</span>;
};

const InverterDetailsPage: React.FC = () => {
  const { projectCode, inverterId: inverterIdStr } = useParams();
  const inverterId = parseInt(inverterIdStr || '0', 10);
  const { currentUser } = useAuth();

  const [timeRange, setTimeRange] = useState<TimeRange>('12M');
  const [activeTab, setActiveTab] = useState<'performance' | 'breakdown' | 'live'>('performance');
  const [isBreakdownModalOpen, setBreakdownModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<BreakdownEvent | null>(null);
  const [breakdownMonthFilter, setBreakdownMonthFilter] = useState<string>(new Date().toISOString().slice(0, 7));
  const [sortConfig, setSortConfig] = useState<{ key: string, dir: 'asc' | 'desc' }>({ key: 'month', dir: 'desc' });

  const { data: project } = useProject(projectCode || '');
  const { data: inverter } = useInverter(inverterId);
  const { data: events = [] } = useBreakdownEvents(inverterId);
  const addEventMutation = useAddBreakdownEvent(inverterId);
  const deleteEventMutation = useDeleteBreakdownEvent(inverterId);

  const chartData = useMemo(() => {
    if (!project || !project.monthlyData) return [];
    return filterMonthlyData(project.monthlyData, timeRange).map(m => {
      const invIdx = project.inverters.findIndex((inv: any) => inv.id === inverterId);
      const exportVal = invIdx !== -1 ? (m.inverterExportKWh?.[invIdx] || 0) : 0;
      return {
        month: m.month,
        actualEnergy: exportVal,
        theoreticalEnergy: 0,
        pr: 0,
        targetEnergyP50: 0, targetEnergyOM: 0, revenue: 0, targetRevenueP50: 0, targetRevenueOM: 0,
      };
    });
  }, [project, inverterId, timeRange]);

  const role = currentUser?.role?.toLowerCase();
  const canEditBreakdowns = role === 'admin' || role === 'operations';

  if (role === 'viewer') {
    return (
      <div className="p-10 text-center text-white flex flex-col items-center justify-center h-full">
        <h2 className="text-2xl font-bold text-solar-danger mb-4">Access Denied</h2>
        <p className="text-gray-400 mb-6 max-w-md">Viewer role restricted access.</p>
        <Link to={`/project/${projectCode}`} className="bg-solar-accent text-black font-bold px-6 py-2 rounded">← Back</Link>
      </div>
    );
  }

  if (!project || !inverter) return <div className="p-10 text-center text-white">Loading Inverter Details...</div>;

  const handleSaveBreakdown = (event: any) => {
    addEventMutation.mutate(event, { onSuccess: () => setBreakdownModalOpen(false) });
  };

  const handleDeleteBreakdown = (eventId: string | number) => {
    deleteEventMutation.mutate(typeof eventId === 'string' ? parseInt(eventId, 10) : eventId);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <nav className="text-sm text-gray-400 mb-2">
          <Link to="/" className="hover:text-white">Dashboard</Link> &gt;
          <Link to={`/project/${project.projectCode}`} className="hover:text-white"> {project.projectName}</Link> &gt;
          <span className="text-white"> {inverter.serial_number}</span>
        </nav>
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Inverter: {inverter.serial_number}</h1>
          {canEditBreakdowns && activeTab === 'breakdown' && (
            <button onClick={() => { setEditingEvent(null); setBreakdownModalOpen(true); }} className="bg-solar-danger text-white font-bold px-4 py-2 rounded shadow hover:bg-red-500 transition">+ Log Breakdown</button>
          )}
        </div>
      </div>

      <div className="border-b border-solar-border flex items-center gap-4">
        <button onClick={() => setActiveTab('performance')} className={`tab-button ${activeTab === 'performance' ? 'tab-active' : ''}`}>Performance</button>
        <button onClick={() => setActiveTab('breakdown')} className={`tab-button ${activeTab === 'breakdown' ? 'tab-active' : ''}`}>Breakdown Analysis</button>
        <button onClick={() => setActiveTab('live')} className={`tab-button ${activeTab === 'live' ? 'tab-active' : ''}`}>Live Data</button>
      </div>

      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="bg-solar-card p-6 rounded border border-solar-border text-center text-gray-400">
            Historical charts and metrics for this individual inverter will load as more monthly data is synced.
          </div>
        </div>
      )}

      {activeTab === 'breakdown' && (
        <InverterBreakdownAnalysis
          inverter={inverter}
          project={project}
          inverterDcCapacity={inverter.capacity_kw || 50}
          onEditEvent={(ev: any) => { setEditingEvent(ev); setBreakdownModalOpen(true); }}
          onDeleteEvent={handleDeleteBreakdown}
          monthFilter={breakdownMonthFilter}
          onMonthFilterChange={setBreakdownMonthFilter}
          externalEvents={events}
        />
      )}

      {activeTab === 'live' && (
        <InverterLiveData inverter={{ name: inverter.serial_number, deviceSn: inverter.serial_number, kwac: inverter.capacity_kw }} dateOfCommissioning={project.dateOfCommissioning} />
      )}

      {isBreakdownModalOpen && (
        <BreakdownEntryModal
          isOpen={isBreakdownModalOpen}
          onClose={() => setBreakdownModalOpen(false)}
          onSave={handleSaveBreakdown}
          inverterName={inverter.serial_number}
          initialEvent={editingEvent}
        />
      )}

      <style>{`
        .kpi-card { background-color: #1B263B; padding: 1rem; border-radius: 0.5rem; border: 1px solid #415A77; } .kpi-label { color: #A0AEC0; font-size: 0.75rem; text-transform: uppercase; } .kpi-value { font-size: 1.25rem; font-weight: bold; color: white; }
        .tab-button { padding: 0.5rem 1rem; color: #A0AEC0; font-weight: 500; border-bottom: 2px solid transparent; }
        .tab-active { color: #FFD700; border-bottom-color: #FFD700; }
      `}</style>
    </div>
  );
};

export default InverterDetailsPage;
