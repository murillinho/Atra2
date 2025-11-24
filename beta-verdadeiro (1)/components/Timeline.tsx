
import React from 'react';
import { Machine, MachineHistoryLog, MachineStatus } from '../types';

interface TimelineProps {
  machines: Machine[];
  history: MachineHistoryLog[];
}

const Timeline: React.FC<TimelineProps> = ({ machines, history }) => {
  // Define o intervalo de tempo: Últimas 12h ou 24h
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 12 * 60 * 60 * 1000); // 12 horas atrás

  // Função para determinar a posição (%) de um evento na linha do tempo
  const getPosition = (date: string) => {
    const time = new Date(date).getTime();
    const start = startTime.getTime();
    const total = endTime.getTime() - start;
    return Math.max(0, Math.min(100, ((time - start) / total) * 100));
  };

  // Gera marcas de tempo (horas)
  const hours = [];
  for (let i = 0; i <= 12; i++) {
    const d = new Date(startTime.getTime() + i * 60 * 60 * 1000);
    hours.push({ label: d.getHours().toString().padStart(2, '0') + ':00', percent: (i / 12) * 100 });
  }

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="min-w-[600px]">
        
        {/* Header das Horas */}
        <div className="flex h-6 relative mb-2 text-xs text-slate-400 border-b border-slate-200 dark:border-slate-700">
          {hours.map((h, i) => (
            <div 
                key={i} 
                className="absolute bottom-0 transform -translate-x-1/2 border-l border-slate-300 dark:border-slate-700 h-2 pl-1"
                style={{ left: `${h.percent}%` }}
            >
                {h.label}
            </div>
          ))}
        </div>

        {/* Linhas das Máquinas */}
        <div className="space-y-3">
          {machines.map((machine) => {
            // Filtrar logs dessa máquina dentro do range
            const machineLogs = history
              .filter(h => h.machineId === machine.id && new Date(h.timestamp) > startTime)
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            
            // Criar segmentos visuais
            // Assumimos que o estado inicial (antes do primeiro log da janela) é RUNNING se não tivermos info, 
            // ou buscamos o log imediatamente anterior.
            const segments: { start: number, end: number, status: MachineStatus }[] = [];
            
            let currentStatus = MachineStatus.RUNNING; // Padrão
            // Tenta achar o ultimo status antes da janela
            const lastLogBefore = history
                .filter(h => h.machineId === machine.id && new Date(h.timestamp) <= startTime)
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
            
            if (lastLogBefore) currentStatus = lastLogBefore.newStatus;

            let cursor = 0; // 0%

            // Processa os logs dentro da janela
            machineLogs.forEach(log => {
               const pos = getPosition(log.timestamp);
               // Adiciona segmento do cursor até este evento
               segments.push({ start: cursor, end: pos, status: currentStatus });
               // Atualiza status e cursor
               currentStatus = log.newStatus;
               cursor = pos;
            });

            // Adiciona segmento final até "agora" (100%)
            segments.push({ start: cursor, end: 100, status: currentStatus });

            return (
              <div key={machine.id} className="flex items-center gap-4 h-8">
                <div className="w-24 shrink-0 text-xs font-bold text-slate-600 dark:text-slate-400 text-right truncate">
                  {machine.name}
                </div>
                <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-800 rounded-full relative overflow-hidden">
                   {segments.map((seg, idx) => (
                     <div
                       key={idx}
                       className={`absolute h-full top-0 transition-all ${seg.status === MachineStatus.RUNNING ? 'bg-emerald-500' : 'bg-red-500'}`}
                       style={{ 
                         left: `${seg.start}%`, 
                         width: `${seg.end - seg.start}%`
                       }}
                       title={`${seg.status}`}
                     />
                   ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Timeline;
