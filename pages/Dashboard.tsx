
import React, { useMemo, useState } from 'react';
import { Project, KPIResult, MonthlyData, TimeRange } from '../types';
import { calculateKPIs } from '../services/dataService';
import CombinedPerformanceChart from '../components/CombinedPerformanceChart';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProjects, useModuleBuilds } from '../services/queries';

const SortIcon = ({ direction }: { direction: 'asc' | 'desc' | null }) => {
  if (!direction) return <span className="text-gray-600 ml-1 opacity-0 group-hover:opacity-50">⇅</span>;
  return <span className="text-solar-accent ml-1">{direction === 'asc' ? '▲' : '▼'}</span>;
};

const formatIndian = (n: number, type: 'curr' | 'unit' = 'unit') => {
    const prefix = type === 'curr' ? '₹' : '';
    if (n === undefined || n === null || isNaN(n)) return '-';
    if (n >= 10000000) return `${prefix}${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `${prefix}${(n / 100000).toFixed(2)} L`;
    if (n >= 1000) return `${prefix}${(n / 1000).toFixed(1)}k`;
    return `${prefix}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { data: projects = [], isLoading } = useProjects();
  const { data: moduleBuilds = [] } = useModuleBuilds();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({ key: '', direction: null });
  const [timeRange, setTimeRange] = useState<TimeRange>('12M');

  const role = currentUser?.role?.toLowerCase();
  const isAdmin = role === 'admin';

  const aggregate = useMemo(() => {
    if (projects.length === 0) return { total: null, individual: [] };
    
    const totalStats = {
      totalCapacityKWac: 0, totalCapacityKWdc: 0, netEnergy: 0, revenue: 0, targetRevenue: 0,
      co2Reduction: 0, targetOM: 0, prUnit: 0, yieldUnit: 0, dcCufUnit: 0, totalDays: 0, averageDailyYield: 0
    };

    const projectKPIs = projects.map(p => calculateKPIs(p, timeRange, moduleBuilds));
    projectKPIs.forEach(k => {
      totalStats.totalCapacityKWac += k.totalCapacityKWac;
      totalStats.totalCapacityKWdc += k.totalCapacityKWdc;
      totalStats.netEnergy += k.netEnergy;
      totalStats.revenue += k.revenue;
      totalStats.targetRevenue += k.targetRevenue;
      totalStats.co2Reduction += k.co2Reduction;
      totalStats.targetOM += k.targetOM;
    });
    
    totalStats.totalDays = projectKPIs[0]?.totalDays || 0;
    const totalCapDc = totalStats.totalCapacityKWdc || 1;
    totalStats.averageDailyYield = (totalStats.totalDays > 0) ? (totalStats.netEnergy / totalCapDc / totalStats.totalDays) : 0;
    totalStats.dcCufUnit = projectKPIs.reduce((acc, k) => acc + (k.dcCuf * k.totalCapacityKWdc), 0) / totalCapDc;

    return { total: totalStats, individual: projectKPIs };
  }, [projects, timeRange]);

  const filteredTableData = useMemo(() => {
    return projects.map((p, idx) => {
      const kpi = aggregate.individual[idx];
      return {
        projectCode: p.projectCode,
        projectName: p.projectName,
        projectState: p.projectState,
        capacityKWdc: kpi?.totalCapacityKWdc || 0,
        revenue: kpi?.revenue || 0,
        netEnergy: kpi?.netEnergy || 0,
        dcCuf: kpi?.dcCuf || 0,
        averageDailyYield: kpi?.averageDailyYield || 0,
        isAboveTarget: (kpi?.netEnergy || 0) >= (kpi?.targetOM || 0)
      };
    }).filter(item => 
      item.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.projectState.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [projects, aggregate, searchTerm]);

  const sortedTableData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return filteredTableData;
    return [...filteredTableData].sort((a, b) => {
      const valA = (a as any)[sortConfig.key];
      const valB = (b as any)[sortConfig.key];
      const res = typeof valA === 'string' ? valA.localeCompare(valB) : valA - valB;
      return sortConfig.direction === 'asc' ? res : -res;
    });
  }, [filteredTableData, sortConfig]);

  const chartData = useMemo(() => {
    const timeMap: Record<string, any> = {};
    projects.forEach(p => {
      Object.values(p.monthlyData || {}).forEach((m: MonthlyData) => {
        if (!timeMap[m.month]) timeMap[m.month] = { month: m.month, actualEnergy: 0, targetEnergyOM: 0, revenue: 0, prDenominator: 0, yieldDenominator: 0, dcCufDenominator: 0 };
        const monthlyExport = (m.inverterExportKWh || []).reduce((s, v) => s + v, 0);
        const monthlyTarget = (m.inverterTargetOMKWh || []).reduce((s, v) => s + v, 0);
        const net = monthlyExport - (m.electricityImportedKWh || 0);
        timeMap[m.month].actualEnergy += net;
        timeMap[m.month].targetEnergyOM += monthlyTarget;
        timeMap[m.month].revenue += (net * p.tariff);
      });
    });
    return Object.values(timeMap).sort((a: any, b: any) => a.month.localeCompare(b.month));
  }, [projects]);

  if (isLoading) return <div className="p-10 text-center text-white">Loading Portfolio...</div>;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Portfolio Dashboard</h1>
        <p className="text-gray-400">Overview of all {projects.length} solar assets.</p>
      </header>

      {aggregate.total && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="kpi-card border-l-yellow-400"><h3 className="kpi-label">Revenue</h3><p className="kpi-value text-solar-accent">{formatIndian(aggregate.total.revenue, 'curr')}</p></div>
          <div className="kpi-card border-l-green-400"><h3 className="kpi-label">Generation</h3><p className="kpi-value text-solar-success">{formatIndian(aggregate.total.netEnergy, 'unit')} <span className="text-xs font-normal">kWh</span></p></div>
          <div className="kpi-card border-l-blue-400"><h3 className="kpi-label">Wtd. DC CUF</h3><p className="kpi-value text-blue-300">{aggregate.total.dcCufUnit.toFixed(1)}%</p></div>
          <div className="kpi-card border-l-cyan-400"><h3 className="kpi-label">Avg. Yield</h3><p className="kpi-value text-cyan-300">{aggregate.total.averageDailyYield.toFixed(2)}</p></div>
          <div className="kpi-card border-l-teal-400"><h3 className="kpi-label">CO2 Offset</h3><p className="kpi-value text-teal-300">{Math.floor(aggregate.total.co2Reduction).toLocaleString()} <span className="text-sm font-normal">t</span></p></div>
        </div>
      )}

      <CombinedPerformanceChart data={chartData} timeRange={timeRange} onTimeRangeChange={setTimeRange} user={currentUser} />

      <div className="bg-solar-card rounded-lg border border-solar-border overflow-hidden">
        <div className="p-4 bg-solar-bg flex justify-between items-center">
          <h3 className="font-bold text-white">Project Summary</h3>
          <input type="text" placeholder="Search..." className="bg-solar-card border border-solar-border px-3 py-1 rounded text-sm text-white focus:border-solar-accent outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0D1B2A] text-gray-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-4 cursor-pointer" onClick={() => setSortConfig({key: 'projectName', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>Project</th>
                <th className="p-4 text-right">Gen (kWh)</th>
                <th className="p-4 text-right">Yield</th>
                <th className="p-4 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-solar-border">
              {sortedTableData.map(row => (
                <tr key={row.projectCode} className="hover:bg-white/5 transition">
                  <td className="p-4"><Link to={`/project/${row.projectCode}`} className="text-blue-400 font-semibold hover:underline">{row.projectName}</Link><span className="block text-[10px] text-gray-500">{row.projectState}</span></td>
                  <td className={`p-4 text-right ${row.isAboveTarget ? 'text-solar-success' : 'text-red-400'}`}>{formatIndian(row.netEnergy)}</td>
                  <td className="p-4 text-right text-cyan-300 font-mono">{row.averageDailyYield.toFixed(2)}</td>
                  <td className="p-4 text-right">{formatIndian(row.revenue, 'curr')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <style>{`
        .kpi-card { background: #1B263B; padding: 1.25rem; border-radius: 0.5rem; border: 1px solid #415A77; border-left-width: 4px; }
        .kpi-label { color: #A0AEC0; font-size: 0.7rem; text-transform: uppercase; margin-bottom: 0.5rem; font-weight: 600; }
        .kpi-value { font-size: 1.25rem; font-weight: bold; color: white; }
      `}</style>
    </div>
  );
};

export default Dashboard;
