import React, { useMemo, useState, useEffect, ReactElement } from 'react';
import { useMachines } from '../context/MachineContext';
import { calculateFleetMetrics, calculatePareto, generateAIInsights } from '../utils/analytics';
import Timeline from '../components/Timeline';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ComposedChart, Line, Cell
} from 'recharts';
import { 
  TrendingDown, TrendingUp, Clock, AlertTriangle, Settings, 
  BarChart3, Activity, Database, Sparkles, BrainCircuit, Gauge, Target, Layers
} from 'lucide-react';
import { calculateActiveDowntime } from '../utils/timeCalculations';

const COLORS = {
  primary: '#3b82f6', // Blue
  success: '#10b981', // Emerald
  danger: '#ef4444', // Red
  warning: '#f59e0b', // Amber
  slate: '#64748b',
  darkBg: '#1e293b'
};

const Dashboard: React.FC = () => {
  const { machines, history, workHours, generateMockData } = useMachines();
  const [currentTime, setCurrentTime] = useState(Date.now());

  // ATUALIZAÇÃO EM TEMPO REAL (1 SEGUNDO)
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // --- Calculations ---
  // Recalcula métricas toda vez que currentTime muda (a cada segundo)
  const fleetMetrics = useMemo(() => calculateFleetMetrics(machines, history, workHours), [machines, history, workHours, currentTime]);
  const paretoData = useMemo(() => calculatePareto(machines, history, workHours), [machines, history, workHours, currentTime]);
  
  // AI Generation
  const aiInsights = useMemo(() => generateAIInsights(fleetMetrics, paretoData), [fleetMetrics, paretoData]);

  // Global Averages
  const globalOEE = fleetMetrics.reduce((a, b) => a + b.oee, 0) / (fleetMetrics.length || 1);
  const globalPerf = fleetMetrics.reduce((a, b) => a + b.performance, 0) / (fleetMetrics.length || 1);
  const globalQuality = fleetMetrics.reduce((a, b) => a + b.quality, 0) / (fleetMetrics.length || 1);
  const globalAvail = fleetMetrics.reduce((a, b) => a + b.availability, 0) / (fleetMetrics.length || 1);
  const globalMTBF = fleetMetrics.reduce((a,b) => a + b.mtbf, 0) / (fleetMetrics.length || 1);

  // Sorting for Ranking
  const topDowntimeMachines = [...fleetMetrics].sort((a, b) => b.totalDowntimeMs - a.totalDowntimeMs).slice(0, 8);
  const isEmpty = history.length === 0;

  const formatHours = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
  };

  // Custom Tooltip for Charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs text-white">
          <p className="font-bold mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
              {entry.unit || ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 w-full transition-colors duration-300">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <BarChart3 className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" />
            Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
            Monitoramento Ao Vivo
          </p>
        </div>
        
        {isEmpty && (
          <button 
            onClick={generateMockData}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-900/20 animate-pulse transition-transform active:scale-95"
          >
            <Database size={20} />
            Gerar Dados de Teste
          </button>
        )}
      </div>

      {/* --- BENTO GRID LAYOUT --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

        {/* 1. AI INSIGHTS BANNER (Full Width) */}
        {!isEmpty && (
          <div className="col-span-1 md:col-span-2 xl:col-span-4 relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 p-0.5 shadow-lg">
             <div className="bg-white/10 backdrop-blur-sm rounded-[14px] p-6 flex flex-col md:flex-row items-start md:items-center gap-6 h-full text-white">
                <div className="p-3 bg-white/20 rounded-full shrink-0 shadow-inner">
                  <Sparkles className="w-6 h-6 text-yellow-300" />
                </div>
                <div className="flex-1">
                   <h2 className="text-lg font-bold flex items-center gap-2 mb-2">
                     <BrainCircuit className="w-5 h-5 text-indigo-200" />
                     Insights da IA
                   </h2>
                   <div className="grid gap-2">
                      {aiInsights.slice(0, 3).map((insight, idx) => (
                        <div key={idx} className="flex items-start gap-2 bg-white/5 rounded px-3 py-1.5 border border-white/10">
                           <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-300 shadow-[0_0_5px_currentColor]" />
                           <p className="text-sm md:text-base opacity-95">{insight}</p>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* 2. KPI ROW (4 Cards Top) */}
        
        {/* OEE Main Card */}
        <div className="col-span-1 md:col-span-1 xl:col-span-1 h-32 md:h-40">
           <KPICard 
              title="OEE Global" 
              value={globalOEE} 
              icon={<Gauge />} 
              color="blue" 
              trend={globalOEE > 70 ? 'up' : 'down'}
              highlight
           />
        </div>

        {/* Availability */}
        <div className="col-span-1 md:col-span-1 xl:col-span-1 h-32 md:h-40">
           <KPICard title="Disponibilidade" value={globalAvail} icon={<TrendingUp />} color="emerald" />
        </div>

        {/* Performance */}
        <div className="col-span-1 md:col-span-1 xl:col-span-1 h-32 md:h-40">
           <KPICard title="Performance" value={globalPerf} icon={<Activity />} color="indigo" />
        </div>

        {/* Quality */}
        <div className="col-span-1 md:col-span-1 xl:col-span-1 h-32 md:h-40">
           <KPICard title="Qualidade" value={globalQuality} icon={<Target />} color="amber" />
        </div>


        {/* 3. CHARTS ROW */}

        {/* Pareto Chart (Large) */}
        <DashboardCard 
          className="col-span-1 md:col-span-2 xl:col-span-2 min-h-[400px]" 
          title="Pareto de Paradas (Causas)" 
          icon={<AlertTriangle className="text-amber-500"/>}
          subtitle="Impacto acumulado por motivo de parada"
        >
           <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={paretoData} margin={{top: 20, right: 20, bottom: 20, left: 0}}>
                <defs>
                  <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.05} vertical={false} />
                <XAxis dataKey="reason" fontSize={11} tick={{fill: '#94a3b8'}} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis yAxisId="left" orientation="left" tick={{fill: '#94a3b8', fontSize: 11}} unit="ms" tickFormatter={(val) => `${(val/60000).toFixed(0)}m`}/>
                <YAxis yAxisId="right" orientation="right" tick={{fill: '#94a3b8', fontSize: 11}} unit="%" domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Bar yAxisId="left" dataKey="durationMs" name="Duração" fill="url(#colorDuration)" barSize={40} radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="accumulatedPercent" name="% Acumulado" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#1e293b', strokeWidth: 2}} activeDot={{r: 6}} />
              </ComposedChart>
            </ResponsiveContainer>
        </DashboardCard>

        {/* Ranking Chart (Large) */}
        <DashboardCard 
          className="col-span-1 md:col-span-2 xl:col-span-2 min-h-[400px]" 
          title="Ranking de Indisponibilidade" 
          icon={<TrendingDown className="text-red-500"/>}
          subtitle="Máquinas com maior tempo de parada hoje"
        >
           <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topDowntimeMachines} layout="vertical" margin={{ left: 0, right: 20, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.1} />
                <XAxis type="number" hide />
                <YAxis dataKey="machineName" type="category" width={100} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 500}} />
                <Tooltip 
                   cursor={{fill: 'rgba(255,255,255,0.05)'}}
                   content={<CustomTooltip />}
                />
                <Bar dataKey="totalDowntimeMs" name="Tempo Parado" radius={[0, 4, 4, 0]} barSize={24}>
                  {topDowntimeMachines.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index < 3 ? COLORS.danger : COLORS.slate} opacity={index < 3 ? 0.9 : 0.4} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
        </DashboardCard>

        {/* 4. TIMELINE (Full Width) */}
        <DashboardCard 
          className="col-span-1 md:col-span-2 xl:col-span-4" 
          title="Linha do Tempo (Últimas 12h)" 
          icon={<Clock className="text-blue-500"/>}
        >
            <Timeline machines={machines} history={history} />
        </DashboardCard>

        {/* 6. DATA TABLE (Full Width) */}
        <div className="col-span-1 md:col-span-2 xl:col-span-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
               <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                 <Layers className="text-slate-500" />
                 Detalhamento por Máquina
               </h3>
               <span className="text-xs font-mono text-slate-400">Atualizado: {new Date(currentTime).toLocaleTimeString()}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4">Máquina</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-center">OEE</th>
                    <th className="px-6 py-4 text-center">Disp.</th>
                    <th className="px-6 py-4 text-center">Perf.</th>
                    <th className="px-6 py-4 text-center">Qual.</th>
                    <th className="px-6 py-4 text-right">Tempo Parado (Total)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {fleetMetrics.map((m) => {
                     const machine = machines.find(mac => mac.id === m.machineId);
                     const isRunning = machine?.status === 'FUNCIONANDO';
                     return (
                      <tr key={m.machineId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-white flex items-center gap-3">
                           <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${isRunning ? 'bg-emerald-500 text-emerald-500' : 'bg-red-500 text-red-500'}`} />
                           {m.machineName}
                        </td>
                        <td className="px-6 py-4 text-center">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${isRunning ? 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400' : 'bg-red-50 border-red-100 text-red-700 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-400'}`}>
                              {isRunning ? 'Ativa' : 'Parada'}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`font-black ${m.oee >= 85 ? 'text-emerald-500' : m.oee >= 65 ? 'text-amber-500' : 'text-red-500'}`}>
                             {m.oee.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-400">{m.availability.toFixed(1)}%</td>
                        <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-400">{m.performance.toFixed(1)}%</td>
                        <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-400">{m.quality.toFixed(1)}%</td>
                        <td className="px-6 py-4 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                          {formatHours(m.totalDowntimeMs)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
        </div>

      </div>
    </div>
  );
};

// --- Custom Components ---

const DashboardCard: React.FC<{ title: string; subtitle?: string; icon: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, subtitle, icon, children, className = '' }) => (
  <div className={`bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col ${className}`}>
    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800/50">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shadow-inner">
          {React.cloneElement(icon as ReactElement<any>, { size: 20 })}
        </div>
        <div>
           <h3 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">{title}</h3>
           {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
    <div className="flex-1 min-h-0 relative">
      {children}
    </div>
  </div>
);

const KPICard: React.FC<{title: string; value: number; icon: React.ReactNode; color: string; highlight?: boolean; trend?: 'up' | 'down'}> = ({ title, value, icon, color, highlight, trend }) => {
  const getColor = (c: string) => {
    switch(c) {
      case 'blue': return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20';
      case 'emerald': return 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20';
      case 'indigo': return 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-900/20';
      case 'amber': return 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  const cssColor = getColor(color);

  return (
    <div className={`
      relative h-full rounded-2xl p-5 border flex flex-col justify-between transition-all hover:shadow-md
      ${highlight 
        ? 'bg-blue-600 text-white border-blue-500 shadow-blue-900/20' 
        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'}
    `}>
       <div className="flex justify-between items-start">
          <div>
             <p className={`text-xs font-bold uppercase tracking-wider ${highlight ? 'text-blue-100' : 'text-slate-400'}`}>{title}</p>
          </div>
          <div className={`p-2 rounded-lg ${highlight ? 'bg-white/20 text-white' : cssColor}`}>
             {React.cloneElement(icon as ReactElement<any>, { size: 18 })}
          </div>
       </div>

       <div className="mt-2">
          <p className={`text-4xl font-black tracking-tighter ${highlight ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
            {value.toFixed(0)}<span className={`text-lg font-medium ${highlight ? 'text-blue-200' : 'text-slate-400'}`}>%</span>
          </p>
          
          {/* Progress Bar */}
          <div className={`w-full h-1.5 mt-3 rounded-full overflow-hidden ${highlight ? 'bg-black/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
             <div 
               className={`h-full rounded-full transition-all duration-1000 ${highlight ? 'bg-white' : color === 'emerald' ? 'bg-emerald-500' : color === 'amber' ? 'bg-amber-500' : 'bg-indigo-500'}`} 
               style={{ width: `${value}%` }} 
             />
          </div>
       </div>
    </div>
  );
};

export default Dashboard;