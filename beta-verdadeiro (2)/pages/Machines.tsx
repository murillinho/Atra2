
import React, { useState, useEffect } from 'react';
import { useMachines } from '../context/MachineContext';
import { MachineStatus } from '../types';
import { calculateActiveDowntime } from '../utils/timeCalculations';
import { Activity, AlertTriangle, Clock, History, MonitorPlay, Timer } from 'lucide-react';

const Machines: React.FC = () => {
  const { machines, workHours } = useMachines();
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Atualiza o timer a cada segundo para manter os relógios vivos
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper de formatação
  const formatDuration = (ms: number) => {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Cálculos Globais
  const stats = React.useMemo(() => {
    let currentActiveDowntime = 0;
    let totalHistoricalDowntime = 0;

    machines.forEach(m => {
      // Proteção: Garante que accumulatedDowntimeMs seja tratado como 0 se indefinido
      const safeAccumulated = m.accumulatedDowntimeMs || 0;
      totalHistoricalDowntime += safeAccumulated;

      if (m.status === MachineStatus.STOPPED) {
        const duration = calculateActiveDowntime(m.lastUpdated, workHours, currentTime);
        currentActiveDowntime += duration;
      }
    });

    const totalAggregatedDowntime = totalHistoricalDowntime + currentActiveDowntime;

    return {
      currentActiveDowntime,
      totalAggregatedDowntime
    };
  }, [machines, currentTime, workHours]);

  return (
    <div className="p-4 sm:p-6 md:p-10 w-full">
      <header className="mb-8 md:mb-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Monitoramento de Máquinas</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 text-sm sm:text-lg">Status operacional em tempo real (Wallboard View).</p>
        </div>
        <div className="self-start lg:self-auto flex items-center gap-2 text-xs sm:text-sm text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full whitespace-nowrap">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          Atualizado em tempo real
        </div>
      </header>

      {/* Big Indicators */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-12">
        <div className="bg-slate-900 dark:bg-slate-800 rounded-2xl p-5 sm:p-8 text-white shadow-xl relative overflow-hidden group border border-slate-700">
          <div className="absolute right-0 top-0 p-24 sm:p-32 bg-blue-600 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
          <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-4 relative z-10">
            <div className="p-2 sm:p-3 bg-blue-500/20 rounded-lg text-blue-400">
              <History className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <h2 className="text-base sm:text-xl font-medium text-blue-100">Tempo Total Parado (Turno)</h2>
          </div>
          <div className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-mono font-bold tracking-tighter relative z-10 tabular-nums break-all sm:break-normal">
            {formatDuration(stats.totalAggregatedDowntime)}
          </div>
          <p className="text-slate-400 mt-2 sm:mt-4 text-xs sm:text-base relative z-10 border-t border-slate-700 pt-2 sm:pt-4">
            Soma histórica de todas as paradas + paradas ativas.
          </p>
        </div>

        <div className="bg-slate-900 dark:bg-slate-800 rounded-2xl p-5 sm:p-8 text-white shadow-xl relative overflow-hidden group border border-slate-700">
          <div className={`absolute right-0 top-0 p-24 sm:p-32 rounded-full blur-3xl transition-opacity ${stats.currentActiveDowntime > 0 ? 'bg-red-600 opacity-20 animate-pulse' : 'bg-emerald-600 opacity-10'}`}></div>
          <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-4 relative z-10">
            <div className={`p-2 sm:p-3 rounded-lg ${stats.currentActiveDowntime > 0 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
               <Clock className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <h2 className="text-base sm:text-xl font-medium text-slate-100">Tempo Perdido Agora</h2>
          </div>
          <div className={`text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-mono font-bold tracking-tighter relative z-10 tabular-nums break-all sm:break-normal ${stats.currentActiveDowntime > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {formatDuration(stats.currentActiveDowntime)}
          </div>
          <p className="text-slate-400 mt-2 sm:mt-4 text-xs sm:text-base relative z-10 border-t border-slate-700 pt-2 sm:pt-4">
            {stats.currentActiveDowntime > 0 ? 'Soma dos cronômetros ativos.' : 'Todas as máquinas operando normalmente.'}
          </p>
        </div>
      </div>

      {/* Machines Grid (High Visibility) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {machines.map((machine) => {
          const isRunning = machine.status === MachineStatus.RUNNING;
          
          // Cálculos individuais por card
          const currentStopDuration = !isRunning 
            ? calculateActiveDowntime(machine.lastUpdated, workHours, currentTime)
            : 0;
            
          const safeAccumulated = machine.accumulatedDowntimeMs || 0;
          const individualTotal = safeAccumulated + currentStopDuration;

          return (
            <div
              key={machine.id}
              className={`
                relative overflow-hidden rounded-2xl border-4 p-4 sm:p-6 transition-all duration-300 flex flex-col justify-between min-h-[280px] sm:min-h-[320px]
                ${isRunning 
                  ? 'bg-white dark:bg-slate-800 border-emerald-400 dark:border-emerald-600/50' 
                  : 'bg-red-50 dark:bg-slate-800 border-red-500 dark:border-red-500 shadow-lg sm:shadow-2xl shadow-red-500/20'}
              `}
            >
              {/* Top Header: Name & Status Badge */}
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white truncate mr-2">{machine.name}</h3>
                <span className={`text-xs sm:text-sm font-bold px-2 sm:px-3 py-1 rounded-full uppercase tracking-wider border shrink-0 ${isRunning ? 'bg-emerald-100 border-emerald-200 text-emerald-800 dark:bg-emerald-900/40 dark:border-emerald-700 dark:text-emerald-300' : 'bg-red-100 border-red-200 text-red-800 dark:bg-red-900/40 dark:border-red-700 dark:text-red-200 animate-pulse'}`}>
                    {isRunning ? 'ON' : 'OFF'}
                </span>
              </div>

              {/* Middle Section: THE BIG NUMBERS */}
              <div className="flex-1 flex flex-col justify-center items-center text-center space-y-2 sm:space-y-4">
                
                {/* Case 1: STOPPED */}
                {!isRunning && (
                  <>
                    <div className="w-full">
                        <p className="text-[10px] sm:text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-2">
                            <Timer size={14} className="sm:w-4 sm:h-4" />
                            Parada Há
                        </p>
                        <div className="text-4xl sm:text-5xl md:text-6xl font-mono font-black text-red-600 dark:text-red-500 tracking-tighter tabular-nums leading-none">
                            {formatDuration(currentStopDuration)}
                        </div>
                    </div>
                    
                    <div className="bg-red-100 dark:bg-red-900/30 px-3 py-2 sm:px-4 rounded-lg w-full border border-red-200 dark:border-red-800/50">
                        <p className="text-[10px] sm:text-xs uppercase text-red-800 dark:text-red-300 font-bold mb-0.5 sm:mb-1">Motivo</p>
                        <p className="text-base sm:text-lg font-bold text-red-900 dark:text-white leading-tight truncate">
                            {machine.reason}
                        </p>
                    </div>
                  </>
                )}

                {/* Case 2: RUNNING */}
                {isRunning && (
                  <div className="w-full py-2 sm:py-4">
                     <div className="flex flex-col items-center justify-center text-emerald-500 dark:text-emerald-400 opacity-80">
                        <Activity size={48} className="mb-2 animate-pulse sm:w-16 sm:h-16" />
                        <span className="text-lg sm:text-2xl font-bold tracking-widest">OPERANDO</span>
                     </div>
                  </div>
                )}
              </div>

              {/* Footer Section: Historical Total */}
              <div className="mt-4 sm:mt-6 pt-4 border-t-2 border-slate-100 dark:border-slate-700/60">
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 sm:mb-1 flex items-center gap-1">
                            <History size={12} />
                            Total (Hoje)
                        </p>
                        <p className="text-xl sm:text-2xl font-mono font-bold text-slate-600 dark:text-slate-300 tabular-nums leading-none">
                            {formatDuration(individualTotal)}
                        </p>
                    </div>
                    {isRunning && (
                         <div className="p-1.5 sm:p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-full text-emerald-600 dark:text-emerald-400">
                            <MonitorPlay size={16} className="sm:w-5 sm:h-5" />
                         </div>
                    )}
                    {!isRunning && (
                        <div className="p-1.5 sm:p-2 bg-red-100 dark:bg-red-900/20 rounded-full text-red-600 dark:text-red-400 animate-bounce">
                            <AlertTriangle size={16} className="sm:w-5 sm:h-5" />
                        </div>
                    )}
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Machines;
