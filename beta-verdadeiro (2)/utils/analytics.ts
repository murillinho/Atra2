
import { Machine, MachineHistoryLog, MachineStatus, StopReason, WorkHoursConfig, CycleUnit } from "../types";
import { calculateActiveDowntime, getElapsedShiftTimeTodayMs } from "./timeCalculations";

// Tipos auxiliares para retorno das métricas
export interface MachineMetrics {
  machineId: number;
  machineName: string;
  totalDowntimeMs: number;
  failureCount: number;
  mtbf: number; // em horas
  mttr: number; // em minutos
  availability: number; // percentual
  performance: number; // percentual
  quality: number; // percentual
  oee: number; // percentual global
}

export interface ParetoItem {
  reason: string;
  count: number;
  durationMs: number;
  accumulatedPercent?: number;
}

/**
 * Helper para converter ciclo configurado (min/hora) sempre para SEGUNDOS para padronizar calculo
 */
const getCycleTimeInSeconds = (val: number, unit: CycleUnit): number => {
  if (!val || val <= 0) return 30; // Fallback seguro
  switch (unit) {
    case CycleUnit.MINUTES: return val * 60;
    case CycleUnit.HOURS: return val * 3600;
    case CycleUnit.SECONDS: default: return val;
  }
};

/**
 * Processa o histórico de logs para calcular intervalos de parada.
 */
const getDowntimeIntervals = (
  history: MachineHistoryLog[], 
  machines: Machine[],
  workHours: WorkHoursConfig,
  filterStart?: Date
) => {
  const sortedLogs = [...history].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const intervals: { machineId: number; reason: string; start: number; end: number; duration: number }[] = [];
  const activeStops: Record<number, { start: number; reason: string }> = {};

  sortedLogs.forEach(log => {
    const ts = new Date(log.timestamp).getTime();
    if (filterStart && ts < filterStart.getTime()) return;

    if (log.newStatus === MachineStatus.STOPPED) {
      activeStops[log.machineId] = { 
        start: ts, 
        reason: log.reason || 'Desconhecido' 
      };
    } else if (log.newStatus === MachineStatus.RUNNING && activeStops[log.machineId]) {
      const start = activeStops[log.machineId].start;
      const duration = ts - start; 
      intervals.push({
        machineId: log.machineId,
        reason: activeStops[log.machineId].reason,
        start,
        end: ts,
        duration
      });
      delete activeStops[log.machineId];
    }
  });

  const now = Date.now();
  machines.forEach(m => {
    if (m.status === MachineStatus.STOPPED && activeStops[m.id]) {
       const start = activeStops[m.id].start;
       const duration = calculateActiveDowntime(new Date(start).toISOString(), workHours, now);
       intervals.push({
         machineId: m.id,
         reason: activeStops[m.id].reason,
         start,
         end: now,
         duration
       });
    }
  });

  return intervals;
};

/**
 * Calcula métricas principais por máquina (MTBF, MTTR, OEE)
 * CORREÇÃO: OEE agora é calculado baseado no Tempo Decorrido do Turno de HOJE.
 */
export const calculateFleetMetrics = (
  machines: Machine[],
  history: MachineHistoryLog[],
  workHours: WorkHoursConfig
): MachineMetrics[] => {
  const intervals = getDowntimeIntervals(history, machines, workHours);
  
  // Tempo de Planejado de Produção HOJE (ex: Se começou as 8:00 e agora são 10:00, é 2h)
  // Se ainda não começou o turno, OEE será 0.
  const plannedProductionTimeMs = getElapsedShiftTimeTodayMs(workHours);
  
  // Para MTBF/MTTR usamos uma janela histórica maior (30 dias) pois são estatísticas de longo prazo
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  return machines.map(machine => {
    // 1. Cálculos de MTBF/MTTR (Janela Histórica Longa)
    const machineIntervalsAll = intervals.filter(i => i.machineId === machine.id);
    const totalDowntimeHistorical = machineIntervalsAll.reduce((acc, curr) => acc + curr.duration, 0);
    const failureCount = machineIntervalsAll.length;
    
    const mttrMinutes = failureCount > 0 
      ? (totalDowntimeHistorical / failureCount) / 1000 / 60 
      : 0;
    const uptimeHistorical = THIRTY_DAYS_MS - totalDowntimeHistorical;
    const mtbfHours = failureCount > 0 
      ? (uptimeHistorical / failureCount) / 1000 / 3600 
      : (uptimeHistorical / 1000 / 3600);


    // 2. Cálculos de OEE (Focado no Turno Atual / Hoje)
    // Usamos o 'accumulatedDowntimeMs' da máquina que já é resetado diariamente e soma paradas ativas
    const currentStopDuration = machine.status === MachineStatus.STOPPED
        ? calculateActiveDowntime(machine.lastUpdated, workHours)
        : 0;
    
    const downtimeTodayMs = machine.accumulatedDowntimeMs + currentStopDuration;
    
    // Tempo Operacional Real = Tempo do Turno (até agora) - Tempo Parado (hoje)
    const runTimeMs = Math.max(0, plannedProductionTimeMs - downtimeTodayMs);

    // --- AVAILABILITY ---
    // (Tempo Rodando / Tempo Planejado)
    const availability = plannedProductionTimeMs > 0 
      ? (runTimeMs / plannedProductionTimeMs) * 100 
      : 0;

    // --- PERFORMANCE ---
    // (Total Produzido / Meta Teorica)
    // Meta = Tempo Rodando / Ciclo Ideal
    const cycleTimeSeconds = getCycleTimeInSeconds(machine.cycleTimeValue, machine.cycleTimeUnit);
    const runTimeSeconds = runTimeMs / 1000;
    const theoreticalMaxProduction = cycleTimeSeconds > 0 
      ? runTimeSeconds / cycleTimeSeconds 
      : 0;
    
    const totalProduced = machine.productionCount + machine.scrapCount;
    
    const performance = theoreticalMaxProduction > 0 
      ? (totalProduced / theoreticalMaxProduction) * 100 
      : 0;

    // --- QUALITY ---
    // (Peças Boas / Total Produzido)
    const quality = totalProduced > 0 
      ? (machine.productionCount / totalProduced) * 100 
      : 100; // Se não produziu nada, a qualidade tecnicamente não foi comprometida ainda (starta em 100 ou 0, padrão 100 em industria)

    const oee = (availability / 100) * (performance / 100) * (quality / 100) * 100;

    return {
      machineId: machine.id,
      machineName: machine.name,
      totalDowntimeMs: downtimeTodayMs, // Exibe o tempo parado de HOJE nas tabelas
      failureCount,
      mtbf: Math.round(mtbfHours * 10) / 10,
      mttr: Math.round(mttrMinutes),
      availability: Math.min(100, Math.max(0, Math.round(availability * 10) / 10)),
      performance: Math.min(100, Math.max(0, Math.round(performance * 10) / 10)), // Pode passar de 100% se o operador for ninja
      quality: Math.min(100, Math.max(0, Math.round(quality * 10) / 10)),
      oee: Math.min(100, Math.max(0, Math.round(oee * 10) / 10))
    };
  });
};

export const calculatePareto = (
  machines: Machine[], 
  history: MachineHistoryLog[],
  workHours: WorkHoursConfig
): ParetoItem[] => {
  const intervals = getDowntimeIntervals(history, machines, workHours);
  
  const grouped: Record<string, { count: number; duration: number }> = {};

  intervals.forEach(i => {
    if (!grouped[i.reason]) grouped[i.reason] = { count: 0, duration: 0 };
    grouped[i.reason].count += 1;
    grouped[i.reason].duration += i.duration;
  });

  const totalDuration = Object.values(grouped).reduce((acc, curr) => acc + curr.duration, 0);

  let sorted = Object.keys(grouped)
    .map(reason => ({
      reason,
      count: grouped[reason].count,
      durationMs: grouped[reason].duration,
    }))
    .sort((a, b) => b.durationMs - a.durationMs);

  let accumulated = 0;
  return sorted.map(item => {
    const percent = totalDuration > 0 ? (item.durationMs / totalDuration) * 100 : 0;
    accumulated += percent;
    return { ...item, accumulatedPercent: Math.round(accumulated) };
  });
};

export const calculateTimeTotals = (
  machines: Machine[], 
  history: MachineHistoryLog[],
  workHours: WorkHoursConfig
) => {
  const intervals = getDowntimeIntervals(history, machines, workHours);
  const now = new Date();
  
  const startOfDay = new Date(now.setHours(0,0,0,0)).getTime();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).getTime(); 
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

  const sumDuration = (filterTime: number) => 
    intervals
      .filter(i => i.end >= filterTime)
      .reduce((acc, curr) => acc + curr.duration, 0);

  return {
    dailyMs: sumDuration(startOfDay),
    weeklyMs: sumDuration(startOfWeek),
    monthlyMs: sumDuration(startOfMonth)
  };
};

export const generateAIInsights = (
  metrics: MachineMetrics[], 
  pareto: ParetoItem[]
): string[] => {
  const insights: string[] = [];
  const avgOEE = metrics.reduce((acc, m) => acc + m.oee, 0) / (metrics.length || 1);
  if (avgOEE < 60) {
    insights.push(`OEE Crítico: A média da frota está em ${avgOEE.toFixed(1)}%. O padrão industrial busca > 85%.`);
  }
  const worstMachine = [...metrics].sort((a,b) => a.oee - b.oee)[0];
  if (worstMachine && worstMachine.oee < 70) {
    insights.push(`Gargalo Identificado: ${worstMachine.machineName} tem o pior desempenho (OEE: ${worstMachine.oee}%).`);
  }
  if (pareto.length > 0) {
    const topReason = pareto[0];
    insights.push(`Causa Principal: "${topReason.reason}" corresponde a maior perda de tempo.`);
  }
  return insights;
};
