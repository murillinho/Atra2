
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMachines } from '../context/MachineContext';
import { MachineStatus, StopReason } from '../types';
import { calculateActiveDowntime } from '../utils/timeCalculations';
import { Play, Pause, ArrowLeft, AlertOctagon, Wrench, Users, PackageOpen, FileText, Edit2, Save, X, AlertTriangle, Timer, PenTool } from 'lucide-react';
import SignaturePad from '../components/SignaturePad';

const ControlPanel: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getMachineById, updateMachineStatus, updateAccumulatedTime, workHours } = useMachines();
  const machine = getMachineById(Number(id));
  
  // Local state for inputs
  const [selectedReason, setSelectedReason] = useState<StopReason | null>(null);
  const [notes, setNotes] = useState<string>('');
  
  // Manual time edit state
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [manualTimeInput, setManualTimeInput] = useState('');

  // Confirmation Modal State
  const [confirmAction, setConfirmAction] = useState<'STOP' | 'RESUME' | null>(null);
  
  // Signature State
  const [signatureData, setSignatureData] = useState<string | null>(null);

  // Live Timer State
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (machine) {
      if (machine.reason) setSelectedReason(machine.reason);
      if (machine.notes) setNotes(machine.notes);
    }
  }, [machine]);

  if (!machine) {
    return <div className="p-10 text-center text-slate-900 dark:text-white">Modeladora não encontrada.</div>;
  }

  const isRunning = machine.status === MachineStatus.RUNNING;

  // CÁLCULO DE TEMPO AO VIVO
  // Se estiver parada, calcula quanto tempo passou desde a parada até agora (respeitando turnos)
  const currentStopDuration = !isRunning 
    ? calculateActiveDowntime(machine.lastUpdated, workHours, currentTime)
    : 0;

  // O tempo total exibido é: O que já estava salvo (proteção contra null) + O tempo da parada atual
  const safeAccumulated = machine.accumulatedDowntimeMs || 0;
  const totalDisplayTime = safeAccumulated + currentStopDuration;

  const handleStopClick = () => {
    if (!selectedReason) {
      alert('Por favor, selecione um motivo para a parada.');
      return;
    }
    setSignatureData(null); // Reset signature
    setConfirmAction('STOP');
  };

  const handleResumeClick = () => {
    setSignatureData(null); // Reset signature
    setConfirmAction('RESUME');
  };

  const executeAction = () => {
    if (!signatureData) {
      alert("A assinatura é obrigatória.");
      return;
    }

    if (confirmAction === 'STOP') {
      if (selectedReason) {
        updateMachineStatus(machine.id, MachineStatus.STOPPED, selectedReason, notes, 'Operador', signatureData);
      }
    } else if (confirmAction === 'RESUME') {
      updateMachineStatus(machine.id, MachineStatus.RUNNING, null, '', 'Operador', signatureData);
      setSelectedReason(null);
      setNotes('');
    }
    setConfirmAction(null);
    setSignatureData(null);
  };

  const formatDuration = (ms: number) => {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    // Sempre mostrar segundos para garantir que o usuário veja o tempo acumulado mesmo que pequeno
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const openTimeEdit = () => {
    const totalSeconds = Math.floor(totalDisplayTime / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    setManualTimeInput(`${hours}:${minutes.toString().padStart(2, '0')}`);
    setIsEditingTime(true);
  };

  const saveTimeEdit = () => {
    const [h, m] = manualTimeInput.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      const newMs = (h * 3600 * 1000) + (m * 60 * 1000);
      updateAccumulatedTime(machine.id, newMs);
      setIsEditingTime(false);
    } else {
      alert('Formato inválido. Use HH:MM (ex: 12:30)');
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-10 w-full min-h-[calc(100vh-4rem)] relative">
      <button 
        onClick={() => navigate('/overview')}
        className="flex items-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mb-4 sm:mb-6 transition-colors text-sm sm:text-base"
      >
        <ArrowLeft size={20} className="mr-2" />
        Voltar para Visão Geral
      </button>

      <div className="max-w-4xl mx-auto">
        <header className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{machine.name}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">Painel de Controle Operacional</p>
          </div>
          <div className={`self-start sm:self-auto px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border flex items-center gap-2 ${isRunning ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 animate-pulse'}`}>
            <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="font-bold text-sm sm:text-base">{machine.status}</span>
          </div>
        </header>

        {/* STATUS CARDS */}
        <div className="mb-6">
          
          {/* Time Card */}
          <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border p-4 sm:p-6 flex flex-col justify-between transition-colors duration-500 ${!isRunning ? 'border-red-200 dark:border-red-900/50 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-700'}`}>
             <div className="flex justify-between items-start">
                <p className="text-sm text-slate-500 dark:text-slate-400 uppercase font-bold flex items-center gap-2">
                  <Timer size={16} />
                  Tempo Acumulado (Hoje)
                </p>
                {!isEditingTime && (
                  <button onClick={openTimeEdit} className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2 rounded-lg transition-colors" title="Editar Tempo Manualmente">
                    <Edit2 size={16} />
                  </button>
                )}
             </div>
             {isEditingTime ? (
                <div className="flex items-center gap-2 mt-2">
                  <input 
                    type="text" 
                    value={manualTimeInput}
                    onChange={(e) => setManualTimeInput(e.target.value)}
                    className="w-full p-2 text-lg border rounded dark:bg-slate-900 dark:text-white dark:border-slate-600"
                    autoFocus
                  />
                  <button onClick={saveTimeEdit} className="p-2 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"><Save size={16} /></button>
                  <button onClick={() => setIsEditingTime(false)} className="p-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200"><X size={16} /></button>
                </div>
              ) : (
                <p className={`text-4xl sm:text-5xl font-mono font-bold mt-2 tracking-tight tabular-nums ${!isRunning ? 'text-red-600 dark:text-red-500' : 'text-slate-800 dark:text-white'}`}>
                  {formatDuration(totalDisplayTime)}
                </p>
              )}
              {!isRunning && (
                 <p className="text-xs text-red-400 mt-2 font-medium animate-pulse">
                   + Contabilizando parada atual...
                 </p>
              )}
          </div>

        </div>

        {/* CONTROL AREA */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
          <div className="p-4 sm:p-8">
            <h2 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-white mb-4 sm:mb-6">Ações de Controle</h2>

            {isRunning ? (
              <div className="space-y-6">
                <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 text-blue-800 dark:text-blue-300 mb-4 sm:mb-6 text-sm sm:text-base">
                   <p>A máquina está operando normalmente. Para interromper a produção, preencha os dados abaixo e clique em "PARAR".</p>
                </div>

                {/* Seleção de Motivo */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">1. Selecione o Motivo da Parada:</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                    {[StopReason.EMPLOYEE, StopReason.MATERIAL, StopReason.MAINTENANCE].map((reason) => {
                      const icons = {
                        [StopReason.EMPLOYEE]: <Users className="mb-2 w-6 h-6 sm:w-6 sm:h-6" />,
                        [StopReason.MATERIAL]: <PackageOpen className="mb-2 w-6 h-6 sm:w-6 sm:h-6" />,
                        [StopReason.MAINTENANCE]: <Wrench className="mb-2 w-6 h-6 sm:w-6 sm:h-6" />
                      };
                      return (
                        <button
                          key={reason}
                          onClick={() => setSelectedReason(reason)}
                          title={reason}
                          className={`
                            group relative p-3 sm:p-4 rounded-xl border-2 flex flex-row md:flex-col items-center md:justify-center text-left md:text-center transition-all gap-3 md:gap-0
                            ${selectedReason === reason 
                              ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' 
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 text-slate-600 dark:text-slate-400'}
                          `}
                        >
                          {icons[reason]}
                          <span className="font-medium text-sm sm:text-base">{reason}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    2. Observações (Opcional):
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-3 text-slate-400">
                      <FileText size={18} />
                    </div>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Descreva detalhes técnicos, peça necessária ou responsável..."
                      className="w-full pl-10 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none h-24 text-sm sm:text-base"
                    />
                  </div>
                </div>

                <button
                  onClick={handleStopClick}
                  disabled={!selectedReason}
                  className={`w-full py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg flex items-center justify-center gap-2 transition-all
                    ${selectedReason 
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200 dark:shadow-none' 
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'}
                  `}
                >
                  <Pause size={24} />
                  PARAR PRODUÇÃO
                </button>
              </div>
            ) : (
              <div className="space-y-6 sm:space-y-8">
                <div className="flex flex-col items-center justify-center py-6 sm:py-10 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                  <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full mb-4 animate-pulse">
                     <AlertOctagon size={48} className="text-red-600 dark:text-red-400" />
                  </div>
                  
                  <h3 className="text-xl sm:text-2xl font-bold text-red-800 dark:text-red-300 uppercase tracking-wide">Máquina Parada</h3>
                  
                  <div className="mt-4 text-center">
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Duração Atual</p>
                    <p className="text-4xl sm:text-5xl font-black font-mono text-red-600 dark:text-red-400 tabular-nums">
                       {formatDuration(currentStopDuration)}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-col items-center">
                     <p className="text-red-600 dark:text-red-400 text-sm sm:text-base px-2 font-medium">Motivo Selecionado:</p>
                     <div className="mt-1 px-4 py-1 bg-white dark:bg-slate-800 rounded border border-red-200 dark:border-red-800">
                        <span className="font-bold text-lg text-slate-800 dark:text-white">{machine.reason}</span>
                     </div>
                  </div>
                  
                  {machine.notes && (
                    <div className="mt-4 px-6 py-3 bg-white dark:bg-slate-800 rounded border border-red-100 dark:border-red-900/30 max-w-md w-full text-center mx-4 shadow-sm">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Observação do Operador</p>
                      <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 italic">"{machine.notes}"</p>
                    </div>
                  )}

                  <p className="text-slate-400 text-xs mt-6 font-mono">Parada iniciada às: {new Date(machine.lastUpdated).toLocaleTimeString('pt-BR')}</p>
                </div>

                <button
                  onClick={handleResumeClick}
                  className="w-full py-3 sm:py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg sm:text-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 transition-all hover:scale-[1.01]"
                >
                  <Play size={24} fill="currentColor" />
                  RETOMAR OPERAÇÃO
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
            <div className={`flex items-center justify-center w-12 h-12 rounded-full mb-4 mx-auto ${confirmAction === 'STOP' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
              {confirmAction === 'STOP' ? <AlertTriangle size={24} /> : <Play size={24} />}
            </div>
            
            <h3 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-2">
              {confirmAction === 'STOP' ? 'Confirmar Parada' : 'Retomar Produção'}
            </h3>
            
            <p className="text-center text-slate-600 dark:text-slate-400 mb-6">
              {confirmAction === 'STOP' 
                ? `Você está prestes a registrar uma parada por "${selectedReason}".`
                : 'Você está prestes a reiniciar o contador de produção.'
              }
            </p>

            <div className="mb-6 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <SignaturePad onEnd={(data) => setSignatureData(data)} />
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmAction(null)}
                className="flex-1 py-3 rounded-lg font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={executeAction}
                disabled={!signatureData}
                className={`flex-1 py-3 rounded-lg font-bold text-white shadow-md transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                  ${confirmAction === 'STOP' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}
                `}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
