
import React, { useState, useMemo } from 'react';
import { Project, Inverter, BreakdownEvent, BreakdownReason, BreakdownStats } from '../types';
import { calculateBreakdownStats } from '../services/dataService';
import { useAuth } from '../context/AuthContext';

interface Props {
  project: Project;
  inverter: Inverter;
  inverterDcCapacity: number;
  onEditEvent: (event: BreakdownEvent) => void;
  onDeleteEvent: (eventId: string | number) => void;
  monthFilter: string;
  onMonthFilterChange: (month: string) => void;
  externalEvents?: BreakdownEvent[];
}

const formatMinutes = (mins: number) => {
  if (isNaN(mins) || mins < 0) return '00:00';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const SortIcon = ({ direction }: { direction: 'asc' | 'desc' | null }) => {
  if (!direction) return <span className="text-gray-600 ml-1 opacity-0 group-hover:opacity-50">⇅</span>;
  return <span className="text-solar-accent ml-1">{direction === 'asc' ? '▲' : '▼'}</span>;
};


const InverterBreakdownAnalysis: React.FC<Props> = ({ project, inverter, inverterDcCapacity, onEditEvent, onDeleteEvent, monthFilter, onMonthFilterChange, externalEvents }) => {
  const { currentUser } = useAuth();
  const [sortConfig, setSortConfig] = useState<{ key: keyof BreakdownEvent, dir: 'asc' | 'desc' }>({ key: 'start_date', dir: 'desc' });

  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'operations';
  const { filteredEvents, stats, daysInMonth } = useMemo(() => {
    const dataSource = externalEvents || project.breakdownEvents || [];
    const events = dataSource
      .filter(e => e.start_date.startsWith(monthFilter));

    const [year, month] = monthFilter.split('-').map(Number);
    const d = new Date(year, month, 0).getDate();

    const calculatedStats = calculateBreakdownStats(events, inverterDcCapacity, d);
    return { filteredEvents: events, stats: calculatedStats, daysInMonth: d };
  }, [project.breakdownEvents, monthFilter, inverterDcCapacity, externalEvents]);

  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => {
      const valA = a[sortConfig.key] || '';
      const valB = b[sortConfig.key] || '';
      let comparison = 0;
      if (valA > valB) comparison = 1;
      else if (valA < valB) comparison = -1;
      return sortConfig.dir === 'desc' ? -comparison : comparison;
    });
  }, [filteredEvents, sortConfig]);

  const handleSort = (key: keyof BreakdownEvent) => {
    setSortConfig(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
  };

  const getDurationMinutes = (start: string, end: string) => {
    return (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60);
  }

  const formatShortDate = (iso: string) => new Date(iso).toLocaleDateString([], { day: '2-digit', month: 'short' });
  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6">
      <div className="bg-solar-card p-4 rounded-lg border border-solar-border">
        <label htmlFor="month-filter" className="text-sm text-gray-400 mr-2">Select Month:</label>
        <input
          type="month"
          id="month-filter"
          value={monthFilter}
          onChange={(e) => onMonthFilterChange(e.target.value)}
          className="bg-solar-bg border border-solar-border rounded p-2 text-white"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="kpi-card"><p className="kpi-label">Total Downtime</p><p className="kpi-value text-solar-danger">{formatMinutes(stats.totalBreakdownDurationMinutes)}</p></div>
        <div className="kpi-card"><p className="kpi-label">Generation Loss</p><p className="kpi-value text-orange-400">{stats.totalGenerationLossKwh.toFixed(1)} <span className="text-sm font-normal">kWh</span></p></div>
        <div className="kpi-card"><p className="kpi-label">Availability</p><p className="kpi-value text-solar-success">{stats.availabilityPercent.toFixed(2)}%</p></div>
        <div className="kpi-card"><p className="kpi-label">Incidents</p><p className="kpi-value">{filteredEvents.length}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-solar-card rounded-lg border border-solar-border">
          <h3 className="p-4 font-bold text-white border-b border-solar-border">Breakdown by Description</h3>
          <div className="p-4 space-y-2">
            {Object.entries(stats.byReason).map(([reason, data]) => {
              const reasonData = data as { count: number; durationMinutes: number; };
              return (
                <div key={reason}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-gray-300 truncate max-w-[200px]">{reason} ({reasonData.count})</span>
                    <span className="text-gray-400">{formatMinutes(reasonData.durationMinutes)}</span>
                  </div>
                  <div className="w-full bg-solar-bg rounded-full h-2.5">
                    <div className="bg-solar-danger h-2.5 rounded-full" style={{ width: `${(reasonData.durationMinutes / (stats.totalBreakdownDurationMinutes || 1)) * 100}%` }}></div>
                  </div>
                </div>
              );
            })}
            {Object.keys(stats.byReason).length === 0 && <p className="text-sm text-gray-500 text-center py-4">No breakdown events recorded for this month.</p>}
          </div>
        </div>
        <div className="bg-solar-card rounded-lg border border-solar-border">
          <h3 className="p-4 font-bold text-white border-b border-solar-border">Impact by Description</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-400 uppercase"><tr><th className="px-4 py-2">Description</th><th className="px-4 py-2 text-right">Gen Loss (kWh)</th></tr></thead>
              <tbody className="divide-y divide-solar-border">
                {Object.entries(stats.byReason).map(([reason, data]) => {
                  const reasonData = data as { generationLossKwh: number; };
                  return (
                    <tr key={reason}><td className="p-3 font-medium text-gray-300 truncate max-w-[150px]">{reason}</td><td className="p-3 text-right text-orange-400">{reasonData.generationLossKwh.toFixed(1)}</td></tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-solar-card rounded-lg border border-solar-border">
        <h3 className="p-4 font-bold text-white border-b border-solar-border">Event Log</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm"><thead className="table-header"><tr>
            <th className="table-cell cursor-pointer" onClick={() => handleSort('start_date')}>Start <SortIcon direction={sortConfig.key === 'start_date' ? sortConfig.dir : null} /></th>
            <th className="table-cell">End</th>
            <th className="table-cell">Duration</th>
            <th className="table-cell">Description</th>
            <th className="table-cell text-right">Gen Loss (kWh)</th>
            {canEdit && <th className="table-cell text-center">Actions</th>}
          </tr></thead>
            <tbody className="divide-y divide-solar-border">
              {sortedEvents.map((event) => (
                <tr key={event.id} className="hover:bg-solar-bg">
                  <td className="p-3 font-mono whitespace-nowrap">{formatShortDate(event.start_date)} {formatTime(event.start_date)}</td>
                  <td className="p-3 font-mono whitespace-nowrap">{formatShortDate(event.end_date)} {formatTime(event.end_date)}</td>
                  <td className="p-3">{formatMinutes(getDurationMinutes(event.start_date, event.end_date))}</td>
                  <td className="p-3 italic text-gray-400 truncate max-w-[200px]">{event.description}</td>
                  <td className="p-3 text-right text-orange-400 font-mono">{event.loss_kwh?.toFixed(1)}</td>
                  {canEdit && <td className="p-3 text-center whitespace-nowrap">
                    <button onClick={() => onEditEvent(event)} className="text-xs text-blue-400 hover:text-blue-300">Edit</button> | <button onClick={() => onDeleteEvent(event.id!)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
          {sortedEvents.length === 0 && <p className="text-center py-8 text-gray-500">No events for the selected month.</p>}
        </div>
      </div>
      <style>{`
        .table-header { background-color: #0D1B2A; color: #A0AEC0; text-transform: uppercase; font-weight: 500; position: sticky; top: 0; z-index: 10; } .table-cell { padding: 0.75rem 1rem; }
        .kpi-card { background-color: #1B263B; padding: 1rem; border-radius: 0.5rem; border: 1px solid #415A77; } .kpi-label { color: #A0AEC0; font-size: 0.75rem; text-transform: uppercase; } .kpi-value { font-size: 1.25rem; font-weight: bold; }
      `}</style>
    </div>
  );
};

export default InverterBreakdownAnalysis;
