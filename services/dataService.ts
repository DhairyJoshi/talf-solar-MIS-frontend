import { Project, KPIResult, MonthlyData, TimeRange, ModuleBuild, Inverter, InverterKPIResult, BreakdownEvent, BreakdownReason, BreakdownStats } from '../types';
import { CO2_FACTOR, SYSTEM_EFFICIENCY } from '../constants';

export const calculateProjectStaticCapacity = (project: Project) => {
  const totalKWac = (project.inverters || []).reduce((sum, inv) => sum + inv.kwac, 0);
  return { totalKWac };
};

export const filterMonthlyData = (monthlyData: Record<string, MonthlyData>, range: TimeRange): MonthlyData[] => {
  const sorted = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
  if (range === 'ALL') return sorted;
  if (sorted.length === 0) return [];
  if (range === '6M') return sorted.slice(-6);
  if (range === '12M') return sorted.slice(-12);
  return sorted;
};

export const calculateKPIs = (project: Project, timeRange: TimeRange = 'ALL', moduleBuilds: ModuleBuild[] = []): KPIResult => {
  const moduleBuildMap = new Map(moduleBuilds.map(b => [b.id, b]));
  const { totalKWac } = calculateProjectStaticCapacity(project);

  let totalExport = 0;
  let totalImport = 0;
  let totalTargetP50 = 0;
  let totalTargetOM = 0;
  let totalDays = 0;
  let prDenominator = 0;
  let dcCufDenominator = 0;
  let acCufDenominator = 0;

  const months = filterMonthlyData(project.monthlyData, timeRange);
  const commissioningDate = new Date(project.dateOfCommissioning);

  months.forEach(m => {
    const year = parseInt(m.month.split('-')[0]);
    const month = parseInt(m.month.split('-')[1]);
    const daysInMonth = new Date(year, month, 0).getDate();
    const hours = daysInMonth * 24;
    totalDays += daysInMonth;

    const monthlyTotalDcKW = (m.inverterDcCapacityKW || []).reduce((sum, dc) => sum + dc, 0);
    const monthlyTotalExport = (m.inverterExportKWh || []).reduce((sum, exp) => sum + exp, 0);
    const monthlyTotalTargetOM = (m.inverterTargetOMKWh || []).reduce((sum, om) => sum + om, 0);

    totalExport += monthlyTotalExport;
    totalImport += m.electricityImportedKWh || 0;
    totalTargetP50 += m.targetNetKWhP50 || 0;
    totalTargetOM += monthlyTotalTargetOM;

    const monthDate = new Date(m.month + '-02');
    const monthsDiff = monthDate.getMonth() - commissioningDate.getMonth() + 12 * (monthDate.getFullYear() - commissioningDate.getFullYear());

    const monthlyPrDenominator = project.inverters.reduce((sum, inv, index) => {
      const build = inv.moduleBuildId ? moduleBuildMap.get(inv.moduleBuildId) : undefined;
      const irradiation = (m.inverterIrradiation || [])[index] || 0;

      if (build && inv.moduleCount && irradiation > 0) {
        const annualDegradation = build.degradation_rate_pct / 100;
        const yearsSinceCommissioning = Math.max(0, monthsDiff / 12);
        const totalDegradationFactor = Math.max(0, 1 - (yearsSinceCommissioning * annualDegradation));

        // Standard PR formula: Actual_Energy / (Irradiation * Cap_stc / G_stc)
        // Cap_stc = moduleCount * rated_power_wp
        const degradedCapacityKW = (inv.moduleCount * build.rated_power_wp * totalDegradationFactor) / 1000;

        return sum + (irradiation * degradedCapacityKW);
      }
      return sum;
    }, 0);

    prDenominator += monthlyPrDenominator;
    dcCufDenominator += monthlyTotalDcKW * hours;
    acCufDenominator += totalKWac * hours;
  });

  const netEnergy = totalExport - totalImport;
  const tariff = project.tariff || 0;
  const revenue = netEnergy * tariff;
  const targetRevenue = totalTargetOM * tariff;
  const co2Reduction = (netEnergy / 1000) * CO2_FACTOR;

  let latestTotalKWdc = 0;
  if (months.length > 0) {
    const lastMonth = months[months.length - 1];
    latestTotalKWdc = (lastMonth.inverterDcCapacityKW || []).reduce((sum, dc) => sum + dc, 0);
  }

  const yieldVal = latestTotalKWdc > 0 ? (netEnergy / latestTotalKWdc) : 0;
  const averageDailyYield = (latestTotalKWdc > 0 && totalDays > 0) ? (netEnergy / latestTotalKWdc / totalDays) : 0;
  const pr = prDenominator > 0 ? (netEnergy / prDenominator) * 100 : 0;
  const cuf = acCufDenominator > 0 ? (netEnergy / acCufDenominator) * 100 : 0;
  const dcCuf = dcCufDenominator > 0 ? (netEnergy / dcCufDenominator) * 100 : 0;

  return {
    totalCapacityKWac: totalKWac,
    totalCapacityKWdc: latestTotalKWdc,
    tariff: tariff,
    totalExport,
    totalImport,
    netEnergy,
    revenue,
    targetRevenue,
    yield: yieldVal,
    pr,
    cuf,
    dcCuf,
    co2Reduction,
    targetP50: totalTargetP50,
    targetOM: totalTargetOM,
    totalDays,
    averageDailyYield,
  };
};

export const calculateInverterKPIs = (project: Project, inverter: Inverter, inverterIndex: number, timeRange: TimeRange = 'ALL', moduleBuilds: ModuleBuild[] = []): InverterKPIResult => {
  const moduleBuildMap = new Map(moduleBuilds.map(b => [b.id, b]));
  let totalExport = 0;
  let totalTargetOM = 0;
  let totalTheoreticalEnergy = 0;
  let totalDays = 0;
  let prDenominator = 0;
  let dcCufDenominator = 0;
  let acCufDenominator = 0;

  const months = filterMonthlyData(project.monthlyData, timeRange);
  const commissioningDate = new Date(project.dateOfCommissioning);

  months.forEach(m => {
    const year = parseInt(m.month.split('-')[0]);
    const month = parseInt(m.month.split('-')[1]);
    const daysInMonth = new Date(year, month, 0).getDate();
    const hours = daysInMonth * 24;
    totalDays += daysInMonth;

    const monthlyDcKW = (m.inverterDcCapacityKW || [])[inverterIndex] || 0;
    const monthlyExport = (m.inverterExportKWh || [])[inverterIndex] || 0;
    const monthlyTargetOM = (m.inverterTargetOMKWh || [])[inverterIndex] || 0;
    const irradiation = (m.inverterIrradiation || [])[inverterIndex] || 0;

    totalExport += monthlyExport;
    totalTargetOM += monthlyTargetOM;
    totalTheoreticalEnergy += irradiation * monthlyDcKW * SYSTEM_EFFICIENCY;

    const monthDate = new Date(m.month + '-02');
    const monthsDiff = monthDate.getMonth() - commissioningDate.getMonth() + 12 * (monthDate.getFullYear() - commissioningDate.getFullYear());

    const build = inverter.moduleBuildId ? moduleBuildMap.get(inverter.moduleBuildId) : undefined;

    if (build && inverter.moduleCount && irradiation > 0) {
      const annualDegradation = build.degradation_rate_pct / 100;
      const yearsSinceCommissioning = Math.max(0, monthsDiff / 12);
      const totalDegradationFactor = Math.max(0, 1 - (yearsSinceCommissioning * annualDegradation));

      const degradedCapacityKW = (inverter.moduleCount * build.rated_power_wp * totalDegradationFactor) / 1000;
      prDenominator += irradiation * degradedCapacityKW;
    }

    dcCufDenominator += monthlyDcKW * hours;
    acCufDenominator += inverter.kwac * hours;
  });

  let latestTotalKWdc = 0;
  if (months.length > 0) {
    const lastMonth = months[months.length - 1];
    latestTotalKWdc = (lastMonth.inverterDcCapacityKW || [])[inverterIndex] || 0;
  }

  const yieldVal = latestTotalKWdc > 0 ? (totalExport / latestTotalKWdc) : 0;
  const averageDailyYield = (latestTotalKWdc > 0 && totalDays > 0) ? (totalExport / latestTotalKWdc / totalDays) : 0;
  const pr = prDenominator > 0 ? (totalExport / prDenominator) * 100 : 0;
  const cuf = acCufDenominator > 0 ? (totalExport / acCufDenominator) * 100 : 0;
  const dcCuf = dcCufDenominator > 0 ? (totalExport / dcCufDenominator) * 100 : 0;

  return {
    totalCapacityKWac: inverter.kwac,
    totalCapacityKWdc: latestTotalKWdc,
    tariff: project.tariff || 0,
    totalExport,
    revenue: totalExport * (project.tariff || 0),
    targetRevenue: totalTargetOM * (project.tariff || 0),
    yield: yieldVal,
    pr,
    cuf,
    dcCuf,
    co2Reduction: (totalExport / 1000) * CO2_FACTOR,
    targetOM: totalTargetOM,
    totalTheoreticalEnergy,
    totalDays,
    averageDailyYield,
  };
};

export const calculateBreakdownStats = (events: BreakdownEvent[], inverterDcCapacity: number, periodDays: number): BreakdownStats => {
  const stats: BreakdownStats = { totalBreakdownDurationMinutes: 0, totalGenerationLossKwh: 0, totalGiiLoss: 0, availabilityPercent: 100, byReason: {} };
  events.forEach(event => {
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);

    if (durationMinutes < 0) return;
    const generationLossKwh = event.loss_kwh || 0;
    stats.totalBreakdownDurationMinutes += durationMinutes;
    stats.totalGenerationLossKwh += generationLossKwh;

    const reason = event.description || 'Other';
    if (!stats.byReason[reason]) stats.byReason[reason] = { durationMinutes: 0, giiLoss: 0, generationLossKwh: 0, count: 0 };
    const reasonStats = stats.byReason[reason]!;
    reasonStats.durationMinutes += durationMinutes;
    reasonStats.generationLossKwh += generationLossKwh;
    reasonStats.count += 1;
  });
  const totalPeriodMinutes = periodDays * 24 * 60;
  if (totalPeriodMinutes > 0) stats.availabilityPercent = ((totalPeriodMinutes - stats.totalBreakdownDurationMinutes) / totalPeriodMinutes) * 100;
  return stats;
};

