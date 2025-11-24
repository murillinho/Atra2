
import React, { useState, useEffect, useMemo } from 'react';
import { useMachines } from '../context/MachineContext';
import { MachineStatus, StopReason, Machine, MachineHistoryLog } from '../types';
import { calculateActiveDowntime } from '../utils/timeCalculations';
import { 
  Lock, Unlock, Clock, User, AlertTriangle, MoreVertical, 
  ShieldAlert, History, Edit2, CheckCircle, Snowflake, Flame, FileSignature, X,
  ArrowRight
} from 'lucide-react';

const Supervisor: React.FC = () => {
  const { machines, workHours, history, updateAccumulatedTime, updateMachineStatus } = useMachines();
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  // Modal State
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [modalMode, setModalMode] = useState<'TIME' | 'REASON' | null>(null);
  const [manualTimeInput, setManualTimeInput] = useState('');
  const [overrideReason, setOverrideReason] = useState<StopReason | null>(null);
  const [viewSignature, setViewSignature] = useState<{ url: string; title: string } | null>(null);

  // Ticker
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper: Format Duration
  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Helper: Find paired stop log for a resume log
  const getPairedStopLog = (resumeLog: MachineHistoryLog, allHistory: MachineHistoryLog[]) => {
    // Procura o log de parada imediatamente anterior a este log de retomada para a mesma máquina
    // Assumindo que o array 'history' está em ordem cronológica (mais antigo -> mais novo)
    
    // Filtra logs dessa máquina e que são anteriores ao log atual
    const machineLogs = allHistory
      .filter(h => h.machineId === resumeLog.machineId && new Date(h.timestamp) < new Date(resumeLog.timestamp))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Decrescente (Mais novo primeiro)

    // O primeiro que encontrarmos deve ser o par de parada
    return machineLogs.find(h => h.newStatus === MachineStatus.STOPPED);
  };

  // Helper: Detect Repeated Issues (3+ same reasons in last 10 events)
  const repeatedIssues = useMemo(() => {
    const issues: Record<number, { reason: string, count: number }> = {};
    
    machines.forEach(m => {
      const machineHistory = history
        .filter(h => h.machineId === m.id && h.newStatus === MachineStatus.STOPPED && h.reason)
        .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);
      
      const reasonCounts: Record<string, number> = {};
      machineHistory.forEach(h => {
        if (h.reason) reasonCounts[h.reason] = (reasonCounts[h.reason] || 0) + 1;
      });

      Object.entries(reasonCounts).forEach(([reason, count]) => {
        if (count >= 3) {
          issues[m.id] = { reason, count };
        }
      });
    });
    return issues;
  }, [history, machines]);

  // Helper: Detect Frozen State
  const getFrozenState = (machine: Machine) => {
    if (machine.status !== MachineStatus.STOPPED || !workHours.enabled) return null;
    
    const now = new Date(currentTime);
    const [endH, endM] = workHours.end.split(':').map(Number);
    const workEnd = new Date(now);
    workEnd.setHours(endH, endM, 0);
    
    if (now > workEnd) {
      return workHours.end; // Frozen time
    }
    return null;
  };

  // Actions
  const handleUnlock = (m: Machine) => {
    if (window.confirm(`Forçar desbloqueio da ${m.name}?`)) {
      updateMachineStatus(m.id, MachineStatus.RUNNING, null, 'Desbloqueio Supervisor', 'SUPERVISOR (Admin)');
    }
  };

  const handleSaveTime = () => {
    if (!selectedMachine) return;
    const [h, m] = manualTimeInput.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      const newMs = (h * 3600 * 1000) + (m * 60 * 1000);
      updateAccumulatedTime(selectedMachine.id, newMs);
      setModalMode(null);
    } else {
      alert("Formato inválido (HH:MM)");
    }
  };

  const handleOverrideReason = () => {
    if (!selectedMachine || !overrideReason) return;
    updateMachineStatus(selectedMachine.id, MachineStatus.STOPPED, overrideReason, selectedMachine.notes, 'SUPERVISOR (Correção)');
    setModalMode(null);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 w-full bg-slate-100 dark:bg-slate-950 min-h-screen">
      <header className="mb-8 flex items-center gap-3">
        <div className="bg-slate-800 p-2 rounded-lg">
          <ShieldAlert className="text-white w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Modo Supervisor</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-mono">Monitoramento Avançado & Auditoria</p>
        </div>
      </header>

      {/* SECTION 1: Admin Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {machines.map(m => {
          const isRunning = m.status === MachineStatus.RUNNING;
          const activeDowntime = !isRunning ? calculateActiveDowntime(m.lastUpdated, workHours, currentTime) : 0;
          const frozenTime = getFrozenState(m);
          const isRepeated = repeatedIssues[m.id];

          return (
            <div key={m.id} className={`
              relative bg-white dark:bg-slate-900 rounded-xl p-4 border-l-4 shadow-sm
              ${isRunning ? 'border-l-emerald-500' : 'border-l-red-500'}
            `}>
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">{m.name}</h3>
                <div className="flex gap-1">
                  {isRepeated && (
                    <span title="Problema Recorrente" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 p-1 rounded text-xs font-bold flex items-center gap-1">
                      <Flame size={12} /> {isRepeated.count}x
                    </span>
                  )}
                  {frozenTime && (
                    <span title={`Congelado às ${frozenTime}`} className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 p-1 rounded text-xs font-bold flex items-center gap-1">
                      <Snowflake size={12} /> {frozenTime}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                <div className="col-span-2 flex items-center gap-2 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded">
                  <User size={14} />
                  <span className="font-medium truncate">{m.lastOperator || 'N/A'}</span>
                </div>
                
                <div className="col-span-2 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-2 rounded">
                  <span className="text-xs text-slate-500 uppercase font-bold">Status</span>
                  <span className={`font-bold text-xs uppercase px-2 py-0.5 rounded ${isRunning ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'}`}>
                    {m.status}
                  </span>
                </div>

                {!isRunning && (
                  <div className="col-span-2 flex justify-between items-center bg-red-50 dark:bg-red-900/10 p-2 rounded border border-red-100 dark:border-red-900/20">
                    <span className="text-xs text-red-500 uppercase font-bold">Tempo Atual</span>
                    <span className="font-mono font-bold text-red-600 dark:text-red-400">
                      {formatDuration(activeDowntime)}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                 <button 
                   onClick={() => { setSelectedMachine(m); setModalMode('TIME'); setManualTimeInput('00:00'); }}
                   className="flex-1 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded font-bold flex items-center justify-center gap-1"
                 >
                   <Clock size={12} /> Ajustar
                 </button>
                 
                 {!isRunning && (
                    <button 
                      onClick={() => { setSelectedMachine(m); setModalMode('REASON'); }}
                      className="flex-1 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded font-bold flex items-center justify-center gap-1"
                    >
                      <Edit2 size={12} /> Motivo
                    </button>
                 )}

                 {!isRunning && (
                   <button 
                     onClick={() => handleUnlock(m)}
                     className="flex-1 py-1.5 text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded font-bold flex items-center justify-center gap-1"
                     title="Forçar Desbloqueio"
                   >
                     <Unlock size={12} /> Liberar
                   </button>
                 )}
              </div>
            </div>
          );
        })}
      </div>

      {/* SECTION 2: Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Unresolved Issues */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 bg-red-50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/20 flex items-center gap-2">
            <AlertTriangle className="text-red-600" size={20} />
            <h3 className="font-bold text-red-900 dark:text-red-300">Pendências Ativas</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {machines.filter(m => m.status === MachineStatus.STOPPED).length === 0 ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                <CheckCircle size={40} className="mb-2 text-emerald-500" />
                <p>Todas as máquinas operando normalmente.</p>
              </div>
            ) : (
              machines.filter(m => m.status === MachineStatus.STOPPED).map(m => (
                <div key={m.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-slate-800 dark:text-white">{m.name}</span>
                    <span className="text-xs font-mono text-slate-500">{new Date(m.lastUpdated).toLocaleTimeString('pt-BR')}</span>
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-1">{m.reason}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <User size={12} />
                    <span>Pausado por: <span className="font-semibold text-slate-700 dark:text-slate-300">{m.lastOperator}</span></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity / Audit */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <History className="text-slate-600" size={20} />
            <h3 className="font-bold text-slate-800 dark:text-white">Últimas Ações (Log)</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[400px] overflow-y-auto">
            {history.slice(-15).reverse().map(log => {
               const isResume = log.newStatus === MachineStatus.RUNNING;
               const stopLogPair = isResume ? getPairedStopLog(log, history) : null;
               
               // Verifica se existe algum log MAIS RECENTE para esta mesma máquina.
               // Se existir, significa que este log de parada é "histórico" e já foi resolvido por um evento posterior.
               // Portanto, não devemos mostrar o botão de assinatura aqui, pois ele aparecerá no log de Retomada (ou novo Status).
               const hasNewerEvent = history.some(h => 
                  h.machineId === log.machineId && 
                  new Date(h.timestamp).getTime() > new Date(log.timestamp).getTime()
               );

               return (
                <div key={log.id} className="p-3 text-sm flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex-1">
                      <span className="font-bold text-slate-700 dark:text-slate-300 block">Modeladora {log.machineId}</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        {log.previousStatus === MachineStatus.RUNNING ? 'PAROU' : 'RETOMOU'} 
                        {' -> '} 
                        <span className={log.newStatus === MachineStatus.RUNNING ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>{log.newStatus}</span>
                      </span>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div className="mr-2">
                        <span className="block text-xs font-mono text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                        </span>
                        {log.reason && <span className="text-xs text-red-500 block truncate max-w-[120px]">{log.reason}</span>}
                    </div>
                    
                    {/* ASSINATURA LÓGICA DE EXIBIÇÃO */}
                    <div className="flex gap-1">
                        {/* 
                           Se for PARADA:
                           Só mostra a assinatura se NÃO houver evento mais novo (ou seja, a máquina ainda está parada neste estado).
                           Se houver evento mais novo, a assinatura desta parada aparecerá no log de Retomada correspondente.
                        */}
                        {!isResume && log.signature && !hasNewerEvent && (
                          <button 
                            onClick={() => setViewSignature({ url: log.signature!, title: `Assinatura de Parada (Log #${log.machineId})` })}
                            className="p-1.5 rounded bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors"
                            title="Assinatura da Parada (Ativa)"
                          >
                            <FileSignature size={16} />
                          </button>
                        )}

                        {/* Se for RETOMADA, mostra ambos se existirem */}
                        {isResume && (
                           <>
                             {/* 1. Assinatura da Parada (Entrada do problema) */}
                             {stopLogPair && stopLogPair.signature && (
                                <button 
                                  onClick={() => setViewSignature({ url: stopLogPair.signature!, title: `Assinatura de Abertura/Parada` })}
                                  className="p-1.5 rounded bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors flex items-center gap-1"
                                  title="Assinatura de Abertura (Parada)"
                                >
                                  <FileSignature size={14} />
                                  <span className="text-[10px] font-bold">ABR</span>
                                </button>
                             )}

                             {/* Seta indicando fluxo */}
                             {stopLogPair && log.signature && <ArrowRight size={12} className="text-slate-300" />}

                             {/* 2. Assinatura da Retomada (Saída do problema) */}
                             {log.signature && (
                                <button 
                                  onClick={() => setViewSignature({ url: log.signature!, title: `Assinatura de Fechamento/Retomada` })}
                                  className="p-1.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 transition-colors flex items-center gap-1"
                                  title="Assinatura de Fechamento (Retomada)"
                                >
                                  <FileSignature size={14} />
                                  <span className="text-[10px] font-bold">FEC</span>
                                </button>
                             )}
                           </>
                        )}
                    </div>
                  </div>
                </div>
               );
            })}
          </div>
        </div>

      </div>

      {/* Modals */}
      {modalMode === 'TIME' && selectedMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Ajustar Tempo Acumulado</h3>
            <p className="text-sm text-slate-500 mb-4">Altere manualmente o contador total da {selectedMachine.name}.</p>
            
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Novo Tempo (HH:MM)</label>
            <input 
              type="text" 
              className="w-full p-3 rounded-lg border text-xl font-mono text-center mb-6 bg-slate-50 dark:bg-slate-900 dark:text-white dark:border-slate-700"
              placeholder="HH:MM"
              value={manualTimeInput}
              onChange={(e) => setManualTimeInput(e.target.value)}
            />
            
            <div className="flex gap-3">
              <button onClick={() => setModalMode(null)} className="flex-1 py-3 rounded-lg font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">Cancelar</button>
              <button onClick={handleSaveTime} className="flex-1 py-3 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-700">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {modalMode === 'REASON' && selectedMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Corrigir Motivo</h3>
            <div className="space-y-2 mb-6">
              {[StopReason.EMPLOYEE, StopReason.MATERIAL, StopReason.MAINTENANCE].map(r => (
                <button
                  key={r}
                  onClick={() => setOverrideReason(r)}
                  className={`w-full p-3 rounded-lg text-left font-medium text-sm transition-colors ${overrideReason === r ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'}`}
                >
                  {r}
                </button>
              ))}
            </div>
             <div className="flex gap-3">
              <button onClick={() => setModalMode(null)} className="flex-1 py-3 rounded-lg font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">Cancelar</button>
              <button onClick={handleOverrideReason} disabled={!overrideReason} className="flex-1 py-3 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">Confirmar</button>
            </div>
           </div>
        </div>
      )}

      {/* Signature Modal */}
      {viewSignature && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
           <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 w-full max-w-md shadow-2xl relative animate-in zoom-in-95">
             <button onClick={() => setViewSignature(null)} className="absolute top-2 right-2 p-2 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-slate-200 text-slate-500">
               <X size={20} />
             </button>
             <h3 className="text-center font-bold text-slate-800 dark:text-white mb-4">{viewSignature.title}</h3>
             <div className="bg-white rounded-xl border border-slate-200 p-2">
               <img src={viewSignature.url} alt="Assinatura" className="w-full h-auto" />
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Supervisor;
