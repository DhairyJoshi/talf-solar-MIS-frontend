
import React, { useMemo, useState } from 'react';
import { Project, KPIResult, ChartDataPoint, MonthlyData, TimeRange } from '../types';
import { calculateKPIs } from '../services/dataService';
import CombinedPerformanceChart from '../components/CombinedPerformanceChart';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  projects: Project[];
  onEditProject: (p: Project) => void;
}

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

const Dashboard: React.FC<Props> = ({ projects, onEditProject }) => {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({ key: '', direction: null });
  const [timeRange, setTimeRange] = useState<TimeRange>('12M');

  const isAdmin = currentUser?.role === 'admin';

  const aggregate = useMemo(() => {
    const totalStats: Omit<KPIResult, 'tariff' | 'totalDays'> & { weightedAverageTariff: number; weightedAverageYieldPerDay: number, totalDays: number } = {
      totalCapacityKWac: 0,
      totalCapacityKWdc: 0,
      weightedAverageTariff: 0,
      totalExport: 0,
      totalImport: 0,
      netEnergy: 0,
      revenue: 0,
      targetRevenue: 0,
      yield: 0,
      pr: 0,
      cuf: 0,
      dcCuf: 0,
      co2Reduction: 0,
      targetP50: 0,
      targetOM: 0,
      weightedAverageYieldPerDay: 0,
      totalDays: 0,
      averageDailyYield: 0,
    };

    const projectKPIs = projects.map(p => calculateKPIs(p, timeRange));
    let totalWeightedTariffNumerator = 0;

    projectKPIs.forEach(k => {
      totalStats.totalCapacityKWac += k.totalCapacityKWac;
      totalStats.totalCapacityKWdc += k.totalCapacityKWdc;
      totalStats.netEnergy += k.netEnergy;
      totalStats.revenue += k.revenue;
      totalStats.targetRevenue += k.targetRevenue;
      totalStats.co2Reduction += k.co2Reduction;
      totalStats.targetOM += k.targetOM;
      totalWeightedTariffNumerator += (k.tariff * k.totalCapacityKWac);
    });
    
    totalStats.totalDays = projectKPIs.length > 0 ? projectKPIs[0].totalDays : 0;
    
    const totalCapAc = totalStats.totalCapacityKWac || 1;
    const totalCapDc = totalStats.totalCapacityKWdc || 1;
    
    totalStats.weightedAverageTariff = totalStats.totalCapacityKWac ? totalWeightedTariffNumerator / totalStats.totalCapacityKWac : 0;
    totalStats.pr = projectKPIs.reduce((acc, k) => acc + (k.pr * k.totalCapacityKWac), 0) / totalCapAc;
    totalStats.dcCuf = projectKPIs.reduce((acc, k) => acc + (k.dcCuf * k.totalCapacityKWdc), 0) / totalCapDc;
    totalStats.yield = projectKPIs.reduce((acc, k) => acc + (k.yield * k.totalCapacityKWac), 0) / totalCapAc;
    totalStats.averageDailyYield = (totalStats.totalDays > 0 && totalCapDc > 0) ? (totalStats.netEnergy / totalCapDc / totalStats.totalDays) : 0;
    
    // Legacy support for weightedAverageYieldPerDay, can be removed if not used elsewhere
    totalStats.weightedAverageYieldPerDay = totalStats.averageDailyYield;

    return { total: totalStats, individual: projectKPIs };
  }, [projects, timeRange]);

  const tableData = useMemo(() => {
    return projects.map((p, idx) => {
      const kpi = aggregate.individual[idx];
      return {
        projectCode: p.projectCode,
        projectName: p.projectName,
        projectState: p.projectState,
        capacityKWdc: kpi.totalCapacityKWdc,
        revenue: kpi.revenue,
        targetRevenue: kpi.targetRevenue,
        netEnergy: kpi.netEnergy,
        dcCuf: kpi.dcCuf,
        co2Reduction: kpi.co2Reduction,
        averageDailyYield: kpi.averageDailyYield,
        isAboveTarget: kpi.netEnergy >= kpi.targetOM
      };
    });
  }, [projects, aggregate]);

  const filteredTableData = useMemo(() => {
    return tableData.filter(item => 
      item.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.projectState.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tableData, searchTerm]);

  const sortedTableData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return filteredTableData;

    return [...filteredTableData].sort((a, b) => {
      const valA = (a as any)[sortConfig.key];
      const valB = (b as any)[sortConfig.key];
      if (typeof valA === 'string') {
         return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
    });
  }, [filteredTableData, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const chartData = useMemo(() => {
    const timeMap: Record<string, any> = {};
    
    projects.forEach(p => {
      Object.values(p.monthlyData).forEach((m: MonthlyData) => {
        if (!timeMap[m.month]) {
          timeMap[m.month] = { month: m.month, actualEnergy: 0, targetEnergyOM: 0, revenue: 0, targetRevenueOM: 0, prDenominator: 0, yieldDenominator: 0, dcCufDenominator: 0 };
        }
        
        const monthlyTotalExport = (m.inverterExportKWh || []).reduce((s, v) => s + v, 0);
        const monthlyTotalTargetOM = (m.inverterTargetOMKWh || []).reduce((s, v) => s + v, 0);
        const monthlyTotalDcKW = (m.inverterDcCapacityKW || []).reduce((s, v) => s + v, 0);
        
        const net = monthlyTotalExport - (m.electricityImportedKWh || 0);

        const year = parseInt(m.month.split('-')[0]);
        const monthVal = parseInt(m.month.split('-')[1]);
        const hours = new Date(year, monthVal, 0).getDate() * 24;

        timeMap[m.month].actualEnergy += net;
        timeMap[m.month].targetEnergyOM += monthlyTotalTargetOM;
        timeMap[m.month].revenue += (net * p.tariff);
        timeMap[m.month].targetRevenueOM += (monthlyTotalTargetOM * p.tariff);
        
        const monthlyPrDenominator = (m.inverterIrradiation || []).reduce((sum, irrad, index) => {
          const dcCap = (m.inverterDcCapacityKW || [])[index] || 0;
          return sum + (irrad * dcCap);
        }, 0);

        timeMap[m.month].prDenominator += monthlyPrDenominator;
        timeMap[m.month].yieldDenominator += monthlyTotalDcKW;
        timeMap[m.month].dcCufDenominator += monthlyTotalDcKW * hours;
      });
    });

    const sorted = Object.values(timeMap).sort((a, b) => a.month.localeCompare(b.month));
    
    return sorted.map(curr => ({
      ...curr,
      pr: curr.prDenominator > 0 ? (curr.actualEnergy / curr.prDenominator) * 100 : 0,
      yield: curr.yieldDenominator > 0 ? (curr.actualEnergy / curr.yieldDenominator) : 0,
      dcCuf: curr.dcCufDenominator > 0 ? (curr.actualEnergy / curr.dcCufDenominator) * 100 : 0,
    }));
  }, [projects]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Portfolio Dashboard</h1>
        <p className="text-solar-text">Welcome, {currentUser?.username}. Overview of all {projects.length} projects.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="kpi-card border-l-yellow-400"><h3 className="kpi-label">Total Revenue</h3><p className="kpi-value text-solar-accent">{formatIndian(aggregate.total.revenue, 'curr')}</p></div>
        <div className="kpi-card border-l-green-400"><h3 className="kpi-label">Total Generation</h3><div className="flex items-end gap-2"><p className="kpi-value text-solar-success">{formatIndian(aggregate.total.netEnergy, 'unit')}</p><span className="text-xs text-gray-500 mb-1">kWh</span></div></div>
        <div className="kpi-card border-l-blue-400"><h3 className="kpi-label">Weighted DC CUF</h3><p className="kpi-value text-blue-300">{aggregate.total.dcCuf.toFixed(1)}%</p></div>
        <div className="kpi-card border-l-cyan-400"><h3 className="kpi-label">Avg. Daily Yield</h3><p className="kpi-value text-cyan-300">{aggregate.total.averageDailyYield.toFixed(2)} <span className="text-sm font-normal">kWh/kW/day</span></p></div>
        <div className="kpi-card border-l-teal-400"><h3 className="kpi-label">CO2 Offset</h3><p className="kpi-value text-teal-300">{Math.floor(aggregate.total.co2Reduction).toLocaleString()} <span className="text-sm font-normal">tCO2e</span></p></div>
      </div>

      <CombinedPerformanceChart data={chartData} timeRange={timeRange} onTimeRangeChange={setTimeRange} user={currentUser} />

      <div className="bg-solar-card rounded-lg border border-solar-border shadow-lg flex flex-col">
        <div className="p-4 border-b border-solar-border bg-solar-bg flex justify-between items-center">
          <h3 className="font-bold text-white">Project Summary</h3>
          <input type="text" placeholder="Filter..." className="input-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        
        <div className="overflow-y-auto max-h-[300px] custom-scrollbar">
          <table className="w-full text-left text-sm relative">
            <thead className="table-header">
              <tr>
                <th className="table-cell cursor-pointer" onClick={() => handleSort('projectName')}>Project <SortIcon direction={sortConfig.key === 'projectName' ? sortConfig.direction : null} /></th>
                <th className="table-cell text-right cursor-pointer" onClick={() => handleSort('netEnergy')}>Gen (kWh) <SortIcon direction={sortConfig.key === 'netEnergy' ? sortConfig.direction : null} /></th>
                <th className="table-cell text-right cursor-pointer" onClick={() => handleSort('averageDailyYield')}>Daily Yield <SortIcon direction={sortConfig.key === 'averageDailyYield' ? sortConfig.direction : null} /></th>
                <th className="table-cell text-right cursor-pointer" onClick={() => handleSort('dcCuf')}>DC CUF % <SortIcon direction={sortConfig.key === 'dcCuf' ? sortConfig.direction : null} /></th>
                <th className="table-cell text-right cursor-pointer" onClick={() => handleSort('revenue')}>Revenue <SortIcon direction={sortConfig.key === 'revenue' ? sortConfig.direction : null} /></th>
                {isAdmin && <th className="table-cell text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-solar-border">
              {!searchTerm && (
                 <tr className="bg-[#122033] font-bold text-white">
                  <td className="p-4">ALL PROJECTS</td>
                  <td className="p-4 text-right text-solar-success">{formatIndian(aggregate.total.netEnergy, 'unit')}</td>
                  <td className="p-4 text-right text-cyan-300">{aggregate.total.averageDailyYield.toFixed(2)}</td>
                  <td className="p-4 text-right">{aggregate.total.dcCuf.toFixed(1)}%</td>
                  <td className="p-4 text-right text-solar-accent">{formatIndian(aggregate.total.revenue, 'curr')}</td>
                  {isAdmin && <td className="p-4 text-center"></td>}
                </tr>
              )}
              {sortedTableData.map(row => (
                <tr key={row.projectCode} className="hover:bg-solar-bg">
                  <td className="p-4"><Link to={`/project/${row.projectCode}`} className="link">{row.projectName}</Link><span className="subtext">{row.projectState}</span></td>
                  <td className={`p-4 text-right font-medium ${row.isAboveTarget ? 'text-solar-success' : 'text-red-400'}`}>{formatIndian(row.netEnergy, 'unit')}</td>
                  <td className="p-4 text-right font-mono text-cyan-300">{row.averageDailyYield.toFixed(2)}</td>
                  <td className="p-4 text-right">{row.dcCuf.toFixed(1)}%</td>
                  <td className="p-4 text-right">{formatIndian(row.revenue, 'curr')}</td>
                  {isAdmin && (
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => onEditProject(projects.find(p => p.projectCode === row.projectCode)!)} 
                        className="text-xs bg-solar-border hover:bg-gray-600 text-white px-3 py-1 rounded transition"
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <style>{`
        .kpi-card { background-color: #1B263B; padding: 1rem; border-radius: 0.5rem; border: 1px solid #415A77; }
        .kpi-label { color: #E0E1DD; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .kpi-value { font-size: 1.5rem; font-weight: bold; }
        .input-sm { background-color: #1B263B; border: 1px solid #415A77; border-radius: 0.25rem; padding: 0.25rem 0.75rem; font-size: 0.875rem; color: white; outline: none; }
        .input-sm:focus { border-color: #FFD700; }
        .table-header { background-color: #0D1B2A; color: #A0AEC0; text-transform: uppercase; font-weight: 500; position: sticky; top: 0; z-index: 10; }
        .table-cell { padding: 1rem; }
        .link { color: #63B3ED; font-weight: 500; } .link:hover { text-decoration: underline; color: #90CDF4; }
        .subtext { display: block; font-size: 0.75rem; color: #718096; }
      `}</style>
    </div>
  );
};

export default Dashboard;
