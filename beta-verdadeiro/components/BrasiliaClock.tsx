
import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const BrasiliaClock: React.FC = () => {
  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date);
  };

  return (
    <div className="flex items-center">
      <div className="relative overflow-hidden bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 flex items-center gap-3 shadow-sm group hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300">
        
        {/* Animated Glow Effect on Hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>

        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-inner group-hover:scale-110 transition-transform duration-300">
          <Clock size={20} strokeWidth={2.5} />
        </div>

        <div className="flex flex-col items-start justify-center">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none mb-1">
            Horário de Brasília
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-800 dark:text-white leading-none tracking-tight tabular-nums font-mono">
              {formatTime(time)}
            </span>
            <span className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-1 py-0.5 rounded text-center leading-none">
              BRT
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrasiliaClock;
