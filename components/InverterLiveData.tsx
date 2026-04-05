import React, { useState, useEffect, useMemo } from 'react';
import { Inverter, ProxyLiveStatus, ProxyDayCurve } from '../types';
import { useProxyData } from '../services/queries';
import DailyGenerationChart from './DailyGenerationChart';
import { apiClient } from '../services/apiClient';

interface Props {
  inverter: Inverter;
  dateOfCommissioning: string;
}

const HISTORICAL_COLORS = ['#34D399', '#63B3ED', '#A78BFA', '#F472B6'];

const getStatusConfig = (status: string): { text: string; color: string } => {
  const s = status?.toUpperCase() || 'UNKNOWN';
  if (s === 'ONLINE') return { text: "Online / Running", color: "text-solar-success" };
  if (s === 'OFFLINE') return { text: "Offline", color: "text-gray-500" };
  if (s === 'ERROR') return { text: "System Fault", color: "text-solar-danger" };
  if (s === 'UNREACHABLE') return { text: "Unreachable", color: "text-red-400" };
  return { text: s, color: "text-gray-400" };
};

const LiveDataCard: React.FC<{ label: string; value: string; unit?: string; color?: string }> = ({ label, value, unit, color = "text-white" }) => (
  <div className="bg-solar-card p-4 rounded-lg border border-solar-border text-center">
    <p className="text-sm text-gray-400 uppercase tracking-wider mb-1">{label}</p>
    <p className={`text-2xl font-bold ${color}`}>
      {value} <span className="text-base font-normal text-gray-300">{unit}</span>
    </p>
  </div>
);

const InverterLiveData: React.FC<Props> = ({ inverter, dateOfCommissioning }) => {
  const invId = inverter.id || 0;
  const { data: proxyData, error: proxyError, isLoading: isLiveLoading } = useProxyData(invId);
  const [comparisonChartData, setComparisonChartData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingCurves, setIsLoadingCurves] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [visibleYears, setVisibleYears] = useState<string[]>(['Today']);
  const [chartSeries, setChartSeries] = useState<any[]>([]);

  // Periodically update lastUpdated when new data arrives
  useEffect(() => {
    if (proxyData) setLastUpdated(new Date());
  }, [proxyData]);

  useEffect(() => {
    if (proxyError) setError((proxyError as Error).message);
  }, [proxyError]);

  useEffect(() => {
    const commissioningYear = new Date(dateOfCommissioning).getFullYear();
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = currentYear - 1; y >= commissioningYear; y--) {
      years.push(y);
    }
    setAvailableYears(years);

    const fetchAllCurves = async () => {
      if (!invId) return;
      try {
        setIsLoadingCurves(true);
        setError(null);
        const todayStr = new Date().toISOString().split('T')[0];
        
        const promises = [
          apiClient<ProxyDayCurve>(`/proxy/inverters/${invId}/day-curve?date=${todayStr}`)
        ];

        years.forEach(year => {
          const histDate = new Date();
          histDate.setFullYear(year);
          promises.push(apiClient<ProxyDayCurve>(`/proxy/inverters/${invId}/day-curve?date=${histDate.toISOString().split('T')[0]}`));
        });

        const results = await Promise.all(promises);
        
        // Use the first (Today) curve as base for time axis
        const todayCurve = results[0]?.data_points || [];
        const mergedData = todayCurve.map(p => ({
          time: new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
          'Today': p.value,
        }));

        results.slice(1).forEach((res, index) => {
          const year = years[index];
          const curve = res?.data_points || [];
          curve.forEach((point, i) => {
            if (mergedData[i]) {
              mergedData[i][year] = point.value;
            }
          });
        });

        setComparisonChartData(mergedData);
      } catch (err: any) {
        setError("Error fetching comparison curves: " + err.message);
      } finally {
        setIsLoadingCurves(false);
      }
    };

    fetchAllCurves();
  }, [invId, dateOfCommissioning]);

  useEffect(() => {
    const series = [];
    if (visibleYears.includes('Today')) {
      series.push({ key: 'Today', name: 'Today', color: '#FFD700', type: 'area' });
    }
    availableYears.forEach((year, i) => {
      if (visibleYears.includes(String(year))) {
        series.push({ key: String(year), name: String(year), color: HISTORICAL_COLORS[i % HISTORICAL_COLORS.length], type: 'line' });
      }
    });
    setChartSeries(series);
  }, [visibleYears, availableYears]);

  const handleYearToggle = (year: string) => {
    setVisibleYears(prev => prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]);
  };

  const statusDisplay = useMemo(() => getStatusConfig(proxyData?.status || 'OFFLINE'), [proxyData]);

  if (isLiveLoading || isLoadingCurves) {
    return (
      <div className="text-center p-20 bg-solar-card rounded-xl border border-solar-border">
        <div className="w-12 h-12 border-4 border-solar-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400 font-medium">Communicating with Inverter Proxy...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-end">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Real-Time Performance</h3>
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-solar-success animate-pulse"></span>
            Normalized Feed • {proxyData?.vendor || 'Multi-Vendor'} Inverter
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Last Telemetry</p>
          <p className="text-sm font-mono text-gray-300">{lastUpdated?.toLocaleTimeString() || 'Waiting...'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <LiveDataCard label="System Status" value={statusDisplay.text} color={statusDisplay.color} />
        <LiveDataCard label="Current Power" value={(proxyData?.power_output_kw || 0).toFixed(2)} unit="kW" color="text-solar-accent" />
        <LiveDataCard label="Daily Yield" value={(proxyData?.daily_yield_kwh || 0).toFixed(1)} unit="kWh" color="text-solar-success" />
        <LiveDataCard label="Vendor" value={proxyData?.vendor || '-'} color="text-blue-400" />
      </div>

      <div className="bg-solar-card rounded-xl border border-solar-border overflow-hidden shadow-lg">
        <div className="p-5 border-b border-solar-border flex justify-between items-center bg-white/5">
          <h4 className="font-bold text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-solar-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Power Generation Trend (Today)
          </h4>
          <div className="flex items-center gap-2">
            <button onClick={() => setVisibleYears(['Today'])} className="text-[10px] uppercase font-bold text-solar-accent hover:underline">Reset</button>
          </div>
        </div>
        <div className="p-6">
          {comparisonChartData.length > 0 ? (
            <>
              <DailyGenerationChart data={comparisonChartData} series={chartSeries} />
              <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest w-full text-center mb-1">Historical Comparison</span>
                <button
                  onClick={() => handleYearToggle('Today')}
                  className={`px-4 py-1.5 text-xs rounded-full font-bold transition-all border ${visibleYears.includes('Today') ? 'bg-solar-accent text-black border-solar-accent' : 'bg-transparent text-gray-400 border-solar-border hover:border-gray-500'}`}
                >
                  Today
                </button>
                {availableYears.map(year => (
                  <button
                    key={year}
                    onClick={() => handleYearToggle(String(year))}
                    className={`px-4 py-1.5 text-xs rounded-full font-bold transition-all border ${visibleYears.includes(String(year)) ? 'bg-solar-success text-black border-solar-success' : 'bg-transparent text-gray-400 border-solar-border hover:border-gray-500'}`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-20 flex flex-col items-center gap-3 grayscale opacity-50">
               <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
               <p className="text-gray-500 font-medium">No power data has been recorded for the current inverter yet.</p>
            </div>
          )}
        </div>
      </div>
      
      {error && (
        <div className="bg-solar-danger/10 border border-solar-danger p-4 rounded-lg flex items-center gap-3">
          <svg className="w-5 h-5 text-solar-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}
    </div>
  );
};

export default InverterLiveData;
