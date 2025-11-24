
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMachines } from '../context/MachineContext';
import { MachineStatus, StopReason } from '../types';
import { calculateActiveDowntime } from '../utils/timeCalculations';
import { 
  Wrench, Users, PackageOpen, AlertOctagon, ArrowRight, Timer, Activity, Zap
} from 'lucide-react';

const Overview: React.FC = () => {
  const { machines, workHours, isLoading } = useMachines();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getReasonIcon = (reason: StopReason | null) => {
    switch (reason) {
      case StopReason.EMPLOYEE: return <Users className="w-5 h-5" />;
      case StopReason.MATERIAL: return <PackageOpen className="w-5 h-5" />;
      case StopReason.MAINTENANCE: return <Wrench className="w-5 h-5" />;
      default: return <AlertOctagon className="w-5 h-5" />;
    }
  };

  // --- SKELETON LOADER ---
  const MachineCardSkeleton = () => (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 h-[340px] flex flex-col">
       <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/50 dark:via-slate-800/50 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
       
       <div className="flex justify-between items-start mb-10">
          <div className="space-y-3">
             <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
             <div className="h-10 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
          </div>
          <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
       </div>

       <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="space-y-3 w-full flex flex-col items-center">
             <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
             <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
          </div>
       </div>

       <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
          <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
       </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 md:p-10 w-full min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
      <header className="mb-8 md:mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white transition-colors">Visão Geral das Modeladoras</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm sm:text-base">Monitoramento em tempo real do chão de fábrica.</p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
           <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-amber-400 animate-bounce' : 'bg-emerald-500 animate-pulse'}`}></div>
           <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
             {isLoading ? 'Sincronizando...' : 'Sistema Online'}
           </span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* Loading State */}
        {isLoading && Array.from({ length: 4 }).map((_, i) => <MachineCardSkeleton key={i} />)}

        {!isLoading && machines.map((machine) => {
          const isRunning = machine.status === MachineStatus.RUNNING;
          const stoppedDuration = !isRunning 
            ? calculateActiveDowntime(machine.lastUpdated, workHours, currentTime)
            : 0;

          return (
            <div
              key={machine.id}
              onClick={() => navigate(`/control/${machine.id}`)}
              className={`
                group relative overflow-hidden rounded-3xl cursor-pointer flex flex-col h-[340px] 
                transition-all duration-500 ease-out transform hover:-translate-y-1 hover:shadow-2xl
                ${isRunning 
                  ? 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-400/30' 
                  : 'bg-gradient-to-br from-red-600 to-red-800 border border-red-500 shadow-lg shadow-red-900/20'}
              `}
            >
              {isRunning ? (
                 <>
                   <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-emerald-500/10"></div>
                   <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -ml-5 -mb-5"></div>
                 </>
              ) : (
                <>
                  <div className="absolute inset-0 opacity-10 pointer-events-none" 
                       style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 10px, transparent 10px, transparent 20px)' }}>
                  </div>
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500"></div>
                </>
              )}

              {/* Header */}
              <div className="relative z-10 px-6 pt-6 flex justify-between items-start">
                <div>
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 block ${isRunning ? 'text-slate-400' : 'text-red-200/80'}`}>
                    Modeladora
                  </span>
                  <h3 className={`text-4xl font-black tabular-nums leading-none ${isRunning ? 'text-slate-800 dark:text-white' : 'text-white'}`}>
                    {String(machine.id).padStart(2, '0')}
                  </h3>
                </div>

                <div className={`
                   px-3 py-1 rounded-full flex items-center gap-2 shadow-sm border transition-all duration-300
                   ${isRunning 
                     ? 'bg-emerald-50/80 border-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-400' 
                     : 'bg-white/20 border-white/30 text-white backdrop-blur-md'}
                `}>
                   <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-500' : 'bg-white animate-ping'}`} />
                   <span className="text-[10px] font-bold uppercase tracking-wider">
                     {isRunning ? 'Ativa' : 'Parada'}
                   </span>
                </div>
              </div>

              {/* Body */}
              <div className="relative z-10 flex-1 px-6 flex flex-col justify-center">
                {isRunning ? (
                  <div className="flex flex-col items-center gap-4 opacity-70 group-hover:opacity-100 transition-opacity duration-500">
                     <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                        <Activity size={42} className="stroke-[1.5]" />
                     </div>
                     <div className="text-center">
                        <p className="text-emerald-600 dark:text-emerald-400 font-bold text-sm tracking-wide">PRODUÇÃO NORMAL</p>
                        <p className="text-slate-400 text-xs mt-1">Sem paradas recentes</p>
                     </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center animate-in zoom-in-95 duration-300">
                    <div className="w-full text-center mb-6">
                       <p className="text-[10px] text-red-100 font-bold uppercase tracking-widest mb-2 flex items-center justify-center gap-1">
                          <Timer size={12} /> Tempo Decorrido
                       </p>
                       <div className="bg-black/20 rounded-lg py-2 px-1 border border-white/10 backdrop-blur-sm shadow-inner">
                         <span className="text-5xl font-mono font-bold text-white tracking-tighter tabular-nums drop-shadow-md">
                            {formatDuration(stoppedDuration)}
                         </span>
                       </div>
                    </div>
                    <div className="w-full bg-white/10 rounded-xl p-3 border border-white/20 backdrop-blur-md flex items-center gap-3 shadow-lg hover:bg-white/20 transition-colors">
                       <div className="p-2 bg-white/20 rounded-lg text-white shrink-0 shadow-sm">
                          {getReasonIcon(machine.reason)}
                       </div>
                       <div className="overflow-hidden">
                          <p className="text-[9px] text-red-100 font-bold uppercase tracking-widest opacity-80">Motivo da Parada</p>
                          <p className="font-bold text-sm text-white truncate leading-tight">{machine.reason}</p>
                       </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className={`
                 relative z-10 px-6 py-4 mt-auto flex justify-between items-center border-t text-[11px] font-bold uppercase tracking-wider transition-colors duration-300
                 ${isRunning 
                    ? 'border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 group-hover:text-blue-600' 
                    : 'border-white/10 bg-black/20 text-red-100 group-hover:bg-black/30 group-hover:text-white'}
              `}>
                 <span className="flex items-center gap-2">
                   {isRunning ? <Zap size={14} /> : <Wrench size={14} />}
                   {isRunning ? 'Gerenciar' : 'Resolver Problema'}
                 </span>
                 <div className={`
                    p-1.5 rounded-full transition-all duration-300 group-hover:translate-x-1 
                    ${isRunning ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-600 dark:text-slate-300' : 'bg-white/20 text-white'}
                 `}>
                    <ArrowRight size={14} />
                 </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Overview;
