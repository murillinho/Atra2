
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMachines } from '../context/MachineContext';
import { MachineStatus } from '../types';
import { calculateActiveDowntime } from '../utils/timeCalculations';
import { 
  AlertTriangle, Clock, Loader2, WifiOff, X, Maximize, Minimize, 
  Activity, ArrowRight, Factory, Timer
} from 'lucide-react';

const LOGO_URL = `data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 80'%3E%3Cpath d='M40 15 C 15 15 5 40 5 40 C 5 40 15 65 40 65 C 65 65 75 40 75 40 C 75 40 65 15 40 15 Z' fill='none' stroke='%23002d72' stroke-width='4' /%3E%3Ccircle cx='40' cy='40' r='10' fill='%23002d72' /%3E%3Ctext x='85' y='52' font-family='Arial, sans-serif' font-weight='bold' font-size='42' fill='%23002d72'%3Eatrasorb%3C/text%3E%3Ctext x='88' y='72' font-family='Arial, sans-serif' font-size='12' fill='%23000'%3EAbsorvedores de CO%E2%82%82%3C/text%3E%3C/svg%3E`;

const TVMode: React.FC = () => {
  const { tvConfig, machines, workHours, isLoading } = useMachines();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isVisible, setIsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const navigate = useNavigate();

  // --- CONTROLS VISIBILITY ON MOUSE MOVE ---
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 4000);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeout);
    };
  }, []);

  // --- KEYBOARD CONTROLS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleExit();
      if (e.key === 'ArrowRight') manualNext();
      if (e.key === 'ArrowLeft') manualPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [machines]);

  // --- CLOCK TICK ---
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // --- ROTATION LOGIC ---
  useEffect(() => {
    if (machines.length <= 1) return;

    const rotationTimeMs = (tvConfig?.intervalSeconds || 15) * 1000;
    const transitionDurationMs = 600;

    const cycle = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % machines.length);
        setIsVisible(true);
      }, transitionDurationMs);
    }, rotationTimeMs);

    return () => clearInterval(cycle);
  }, [machines.length, tvConfig?.intervalSeconds]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => console.log(e));
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const handleExit = () => {
    if (document.fullscreenElement) {
       document.exitFullscreen().catch(() => {});
    }
    navigate('/');
  };

  const manualNext = () => {
    setIsVisible(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % machines.length);
      setIsVisible(true);
    }, 300);
  };

  const manualPrev = () => {
    setIsVisible(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + machines.length) % machines.length);
      setIsVisible(true);
    }, 300);
  };

  const formatDuration = (ms: number) => {
    if (typeof ms !== 'number' || isNaN(ms) || ms < 0) return "00:00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-16 h-16 animate-spin text-blue-500 mb-4" />
        <h2 className="text-2xl font-bold tracking-widest uppercase animate-pulse">Carregando Sistema...</h2>
      </div>
    );
  }

  if (!machines || machines.length === 0) {
    return (
      <div className="fixed inset-0 z-[200] bg-slate-900 flex flex-col items-center justify-center text-white p-10 text-center">
        <WifiOff className="w-24 h-24 text-slate-700 mb-6" />
        <h1 className="text-4xl font-bold mb-4">Aguardando Dados</h1>
        <p className="text-slate-400 max-w-md mx-auto text-lg">Nenhuma máquina conectada. Verifique a conexão com o servidor.</p>
        <button onClick={handleExit} className="mt-10 px-8 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold border border-slate-700 transition-colors">Voltar ao Menu</button>
      </div>
    );
  }

  const machine = machines[currentIndex] || machines[0];
  const nextMachine = machines[(currentIndex + 1) % machines.length] || machines[0];
  const isRunning = machine.status === MachineStatus.RUNNING;
  const activeDowntime = !isRunning ? calculateActiveDowntime(machine.lastUpdated, workHours, currentTime) : 0;
  const bgColor = isRunning ? 'bg-slate-950' : 'bg-red-950';

  return (
    <div className={`fixed inset-0 z-[150] ${bgColor} text-white flex flex-col overflow-hidden font-sans select-none transition-colors duration-1000`}>
      
      {/* --- HEADER --- */}
      <header className="h-24 px-6 md:px-10 flex justify-between items-center z-20 border-b border-white/10 bg-black/20 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-6 md:gap-8">
           <div className="bg-white p-2 rounded-xl h-14 w-32 md:h-16 md:w-40 flex items-center justify-center shadow-lg">
              <img src={LOGO_URL} alt="Logo" className="max-h-full max-w-full" />
           </div>
           <div className="hidden md:block h-10 w-px bg-white/10"></div>
           <div className="hidden md:block">
             <h1 className="text-xs md:text-sm text-slate-400 font-bold uppercase tracking-[0.2em] mb-1">Painel de Produção</h1>
             <div className="flex items-center gap-2 text-white/80 text-sm">
                <Factory size={16} />
                <span className="font-medium">Unidade Principal • Turno A</span>
             </div>
           </div>
        </div>
        
        <div className="text-right">
           <span className="block text-3xl md:text-4xl font-mono font-bold leading-none tabular-nums text-white drop-shadow-lg">
             {new Date(currentTime).toLocaleTimeString('pt-BR')}
           </span>
           <span className="text-[10px] md:text-xs font-bold text-blue-400 uppercase tracking-widest mt-1 block">
             Horário de Brasília
           </span>
        </div>
      </header>

      {/* --- FLOATING CONTROLS --- */}
      <div className={`fixed top-8 right-8 z-50 flex gap-3 transition-all duration-500 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
        <button onClick={toggleFullscreen} className="p-3 bg-slate-800/90 hover:bg-slate-700 text-white rounded-full border border-slate-600 backdrop-blur" title="Tela Cheia">
          {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>
        <button onClick={handleExit} className="p-3 bg-red-600/90 hover:bg-red-500 text-white rounded-full shadow-lg backdrop-blur" title="Sair">
          <X size={20} />
        </button>
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 flex items-center justify-center relative w-full overflow-hidden p-4">
        
        {/* Animated Wrapper */}
        <div 
          className={`
            w-full h-full flex flex-col items-center justify-center transition-all duration-700 ease-in-out transform
            ${isVisible ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-95 blur-sm'}
          `}
        >
            {/* Machine Name Badge */}
            <div className="flex flex-col items-center mb-6 md:mb-10 w-full text-center">
              <div className={`
                 px-4 py-1.5 md:px-6 md:py-2 rounded-full border border-white/20 text-xs md:text-sm font-bold uppercase tracking-[0.3em] mb-4 md:mb-8
                 ${isRunning ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}
              `}>
                {isRunning ? 'Linha Operacional' : 'Interrupção Crítica'}
              </div>
              <h2 className="text-5xl md:text-7xl lg:text-9xl font-black text-white tracking-tight leading-none uppercase drop-shadow-2xl max-w-5xl truncate">
                {machine.name}
              </h2>
            </div>

            {/* STATUS DISPLAY */}
            {isRunning ? (
              // === RUNNING LAYOUT ===
              <div className="flex justify-center items-center flex-1">
                 <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500 blur-[80px] opacity-30 animate-pulse"></div>
                    <div className="relative w-[40vmin] h-[40vmin] max-w-xs max-h-xs md:max-w-md md:max-h-md rounded-full border-[6px] md:border-[8px] border-emerald-400 bg-emerald-900/40 flex items-center justify-center shadow-[0_0_60px_rgba(16,185,129,0.3)] animate-[spin_10s_linear_infinite_reverse]">
                       <Activity className="w-1/2 h-1/2 text-emerald-400 animate-[spin_10s_linear_infinite]" />
                    </div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-emerald-500 text-slate-900 px-8 py-2 md:px-12 md:py-4 rounded-full font-black uppercase tracking-[0.2em] text-xl md:text-3xl shadow-xl whitespace-nowrap">
                      Produzindo
                    </div>
                 </div>
              </div>
            ) : (
              // === STOPPED LAYOUT ===
              <div className="flex flex-col items-center justify-center w-full max-w-5xl relative z-10 flex-1">
                 
                 {/* Giant Timer Box */}
                 <div className="w-full bg-red-600 rounded-[2rem] md:rounded-[3rem] p-1 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                    <div className="bg-gradient-to-b from-red-600 to-red-700 rounded-[1.8rem] md:rounded-[2.8rem] border-[3px] border-white/20 px-6 py-8 md:px-24 md:py-16 flex flex-col items-center relative overflow-hidden">
                       
                       {/* Background Pattern */}
                       <div className="absolute inset-0 opacity-10 pointer-events-none" 
                            style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 20px, transparent 20px, transparent 40px)' }}>
                       </div>

                       <div className="relative z-10 flex items-center gap-2 md:gap-4 text-red-100 uppercase tracking-[0.25em] font-bold text-sm md:text-2xl mb-2 md:mb-6 animate-pulse">
                          <Timer className="w-4 h-4 md:w-8 md:h-8" /> Tempo Parado
                       </div>

                       <div className="relative z-10 text-[18vw] md:text-[14vw] leading-[0.9] font-black font-mono text-white tabular-nums tracking-tighter drop-shadow-2xl">
                          {formatDuration(activeDowntime)}
                       </div>
                    </div>
                 </div>

                 {/* Reason Badge */}
                 <div className="mt-6 md:mt-10 flex items-center gap-4 md:gap-6 bg-black/40 backdrop-blur-xl border border-white/10 px-6 md:px-10 py-4 rounded-2xl animate-in slide-in-from-bottom-10 fade-in duration-700 delay-200 max-w-full">
                    <div className="hidden md:flex bg-white text-red-600 w-16 h-16 rounded-xl items-center justify-center shadow-lg shrink-0">
                       <AlertTriangle size={36} />
                    </div>
                    <div className="text-center md:text-left overflow-hidden">
                       <p className="text-red-300 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-1">Motivo da Parada</p>
                       <p className="text-2xl md:text-4xl font-black text-white uppercase truncate">{machine.reason}</p>
                    </div>
                 </div>
              </div>
            )}
        </div>
      </main>

      {/* --- FOOTER --- */}
      <footer className="h-20 md:h-24 bg-slate-900 border-t border-white/10 flex items-center justify-between px-6 md:px-10 z-20 shrink-0 relative">
         
         {/* Next Machine Preview */}
         <div className="flex items-center gap-4 md:gap-6 group">
            <span className="hidden md:block text-xs font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-400 transition-colors">
              Próxima Tela
            </span>
            <div className="flex items-center gap-3 md:gap-4 bg-slate-800/50 px-4 py-2 md:px-5 md:py-3 rounded-xl border border-white/5">
               <div className={`w-2 h-2 rounded-full ${nextMachine.status === MachineStatus.RUNNING ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse'}`}></div>
               <span className="text-lg md:text-xl font-bold text-white max-w-[150px] md:max-w-xs truncate">{nextMachine?.name}</span>
               {nextMachine?.status === MachineStatus.STOPPED && (
                 <span className="hidden md:inline-block px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded font-bold uppercase border border-red-500/30">Parada</span>
               )}
               <ArrowRight size={18} className="text-slate-600 group-hover:text-white transition-colors ml-2" />
            </div>
         </div>

         {/* Pagination Indicators */}
         <div className="flex items-center gap-2 md:gap-3">
            {machines.map((_, idx) => (
              <div 
                key={idx} 
                className={`
                  h-1.5 md:h-2 rounded-full transition-all duration-500 
                  ${idx === currentIndex ? 'w-8 md:w-12 bg-white shadow-[0_0_10px_white]' : 'w-1.5 md:w-2 bg-slate-700 opacity-50'}
                `}
              />
            ))}
         </div>

         {/* Animated Progress Line */}
         <div className="absolute bottom-0 left-0 w-full h-1 md:h-1.5 bg-slate-800">
            <div 
              key={currentIndex} // Reinicia animação quando troca
              className={`h-full ${isRunning ? 'bg-emerald-500' : 'bg-red-500'} origin-left`}
              style={{
                width: '100%',
                animation: `tvProgress ${tvConfig?.intervalSeconds || 15}s linear forwards`
              }}
            />
         </div>
      </footer>

      <style>{`
        @keyframes tvProgress {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
};

export default TVMode;
