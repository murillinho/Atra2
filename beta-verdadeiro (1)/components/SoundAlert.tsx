
import React, { useEffect, useRef, useState } from 'react';
import { useMachines } from '../context/MachineContext';
import { MachineStatus } from '../types';
import { Volume2, VolumeX } from 'lucide-react';

const SoundAlert: React.FC = () => {
  const { machines } = useMachines();
  const [enabled, setEnabled] = useState(false);
  
  // Mapeia o estado anterior de cada máquina: { [id]: 'FUNCIONANDO' | 'PARADA' }
  const prevMachineStates = useRef<Record<number, MachineStatus>>({});
  
  // Função para tocar sons industriais
  const playSound = (type: 'ALARM' | 'SUCCESS') => {
    if (!enabled) return;

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const now = ctx.currentTime;
      const gainMain = ctx.createGain();
      gainMain.connect(ctx.destination);

      if (type === 'ALARM') {
        // --- SOM DE ALARME (Industrial Buzzer/Siren) ---
        // Usa dois osciladores levemente desafinados (detuned) para criar um som áspero de alerta
        
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        // Onda Quadrada para som "buzina"
        osc1.type = 'square';
        osc2.type = 'square';

        // Frequências baixas e dissonantes (efeito beat)
        osc1.frequency.setValueAtTime(140, now);
        osc2.frequency.setValueAtTime(146, now); // 6hz de diferença cria o "vibrato" natural

        // Queda de tom (pitch drop) simulando desligamento de motor
        osc1.frequency.linearRampToValueAtTime(100, now + 1.2);
        osc2.frequency.linearRampToValueAtTime(104, now + 1.2);

        // Filtro Lowpass para tirar o agudo irritante da onda quadrada
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 600;

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        // Envelope de volume
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.2);
        osc2.stop(now + 1.2);

      } else {
        // --- SOM DE SUCESSO (Harmonic Chime - Acorde Maior) ---
        // Toca 3 notas simultâneas (Acorde de Dó Maior Invertido) com decay longo
        // Notas: G4 (392), C5 (523), E5 (659)
        const chord = [392.00, 523.25, 659.25]; 
        
        chord.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sine'; // Onda senoidal pura para som de "sino" ou "vidro"
          osc.frequency.value = freq;
          
          const duration = 2.0;

          // Envelope ADSR simples (Ataque rápido, Release longo)
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.1, now + 0.05); // Attack
          gain.gain.exponentialRampToValueAtTime(0.001, now + duration); // Release longo
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(now);
          osc.stop(now + duration);
        });
      }

    } catch (e) {
      console.error("Erro ao tocar áudio:", e);
    }
  };

  useEffect(() => {
    // Inicializa o ref na primeira carga sem disparar som
    if (Object.keys(prevMachineStates.current).length === 0 && machines.length > 0) {
      machines.forEach(m => {
        prevMachineStates.current[m.id] = m.status;
      });
      return;
    }

    // Verifica mudanças de estado
    let alarmTriggered = false;
    let successTriggered = false;

    machines.forEach(m => {
      const prevState = prevMachineStates.current[m.id];
      
      // Se não tinha estado anterior registrado, registra e ignora
      if (!prevState) {
        prevMachineStates.current[m.id] = m.status;
        return;
      }

      // Detecção de mudança
      if (m.status !== prevState) {
        if (m.status === MachineStatus.STOPPED) {
          alarmTriggered = true;
        } else if (m.status === MachineStatus.RUNNING) {
          successTriggered = true;
        }
        // Atualiza o estado anterior
        prevMachineStates.current[m.id] = m.status;
      }
    });

    // Prioriza o alarme se ambos acontecerem ao mesmo tempo
    if (alarmTriggered) {
      playSound('ALARM');
    } else if (successTriggered) {
      playSound('SUCCESS');
    }

  }, [machines, enabled]);

  return (
    <button 
      onClick={() => setEnabled(!enabled)}
      className={`fixed bottom-4 right-4 z-[9999] p-3 rounded-full shadow-xl transition-all border-2 flex items-center gap-2 group ${enabled ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-400' : 'bg-slate-200 text-slate-500 hover:bg-slate-300 border-slate-300'}`}
      title={enabled ? "Silenciar Alertas (Ativo)" : "Ativar Alertas Sonoros (Inativo)"}
    >
      {enabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
      <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap text-sm font-bold">
        {enabled ? 'Sons Ativos' : 'Sons Desligados'}
      </span>
    </button>
  );
};

export default SoundAlert;
