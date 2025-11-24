
import { Machine, MachineHistoryLog, TvConfig, WorkHoursConfig, MachineStatus, StopReason, CycleUnit } from "../types";
import { calculateActiveDowntime } from "../utils/timeCalculations";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

const STORAGE_KEY = 'gestao_modeladoras_v2';

// --- MOCK HELPERS (Fallback LocalStorage) ---
const getInitialMachines = (): Machine[] => Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  name: `Modeladora ${i + 1}`,
  status: MachineStatus.RUNNING, 
  reason: null,
  lastUpdated: new Date().toISOString(),
  accumulatedDowntimeMs: 0,
  notes: '',
  lastOperator: 'Sistema',
  productionCount: 0,
  scrapCount: 0,
  cycleTimeValue: 30,
  cycleTimeUnit: CycleUnit.SECONDS
}));

const mockStore = {
  load: () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    return {
      machines: getInitialMachines(),
      history: [],
      workHours: { enabled: true, start: "08:00", end: "18:49" },
      tvConfig: { intervalSeconds: 10 }
    };
  },
  save: (data: any) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
};

// --- API INTERFACE ---

export const api = {
  // 1. Carregar Tudo
  loadFullData: async () => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const [machinesRes, settingsRes, historyRes] = await Promise.all([
          supabase.from('machines').select('*').order('id'),
          supabase.from('settings').select('*').single(),
          supabase.from('history').select('*').order('timestamp', { ascending: true }) // Carregar histórico completo pode ser pesado, ideal filtrar
        ]);

        if (machinesRes.error) throw machinesRes.error;

        // Mapear dados do Supabase (snake_case) para Typescript (camelCase)
        const machines: Machine[] = (machinesRes.data || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          status: m.status as MachineStatus,
          reason: m.reason as StopReason,
          lastUpdated: m.last_updated,
          accumulatedDowntimeMs: m.accumulated_downtime_ms,
          notes: m.notes,
          lastOperator: m.last_operator,
          productionCount: m.production_count,
          scrapCount: m.scrap_count,
          cycleTimeValue: m.cycle_time_value,
          cycleTimeUnit: m.cycle_time_unit as CycleUnit
        }));

        const settings = settingsRes.data || { work_hours: null, tv_config: null };
        
        // Transformar histórico
        const history: MachineHistoryLog[] = (historyRes.data || []).map((h: any) => ({
          id: h.id,
          machineId: h.machine_id,
          previousStatus: h.previous_status,
          newStatus: h.new_status,
          reason: h.reason,
          timestamp: h.timestamp,
          signature: h.signature // Carrega assinatura
        }));

        return {
          machines,
          workHours: settings.work_hours || { enabled: true, start: "08:00", end: "18:49" },
          tvConfig: settings.tv_config || { intervalSeconds: 10 },
          history
        };

      } catch (e) {
        console.error("Supabase error, falling back to local", e);
        return mockStore.load();
      }
    } else {
      return mockStore.load();
    }
  },

  // 2. Atualizar Status
  updateStatus: async (
    machineId: number, 
    status: MachineStatus, 
    reason: StopReason | null, 
    notes: string, 
    operator: string,
    workHours: WorkHoursConfig,
    signature?: string
  ) => {
    if (isSupabaseConfigured() && supabase) {
      // 1. Buscar estado atual para calcular tempo acumulado se necessário
      const { data: currentMachine } = await supabase.from('machines').select('*').eq('id', machineId).single();
      
      if (!currentMachine) return null;

      let newAccumulated = currentMachine.accumulated_downtime_ms;
      
      // CRITICAL: Se estava parada e vai rodar, consolida o tempo.
      if (currentMachine.status === MachineStatus.STOPPED && status === MachineStatus.RUNNING) {
        const addedTime = calculateActiveDowntime(currentMachine.last_updated, workHours, Date.now());
        newAccumulated += addedTime;
      }

      const now = new Date().toISOString();

      // 2. Atualizar Máquina
      const { data: updatedMachine, error: updateError } = await supabase
        .from('machines')
        .update({
          status,
          reason: status === MachineStatus.RUNNING ? null : reason,
          last_updated: now,
          accumulated_downtime_ms: newAccumulated,
          notes: status === MachineStatus.RUNNING ? '' : notes,
          last_operator: operator
        })
        .eq('id', machineId)
        .select()
        .single();

      if (updateError) throw updateError;

      // 3. Inserir Log
      const { data: newLog, error: logError } = await supabase
        .from('history')
        .insert({
          machine_id: machineId,
          previous_status: currentMachine.status,
          new_status: status,
          reason: status === MachineStatus.STOPPED ? reason : null,
          timestamp: now,
          signature: signature // Salva assinatura
        })
        .select()
        .single();

      if (logError) throw logError;

      // Mapear retorno
      return {
        machine: {
          id: updatedMachine.id,
          name: updatedMachine.name,
          status: updatedMachine.status,
          reason: updatedMachine.reason,
          lastUpdated: updatedMachine.last_updated,
          accumulatedDowntimeMs: updatedMachine.accumulated_downtime_ms,
          notes: updatedMachine.notes,
          lastOperator: updatedMachine.last_operator,
          productionCount: updatedMachine.production_count,
          scrapCount: updatedMachine.scrap_count,
          cycleTimeValue: updatedMachine.cycle_time_value,
          cycleTimeUnit: updatedMachine.cycle_time_unit
        },
        log: {
          id: newLog.id,
          machineId: newLog.machine_id,
          previousStatus: newLog.previous_status,
          newStatus: newLog.new_status,
          reason: newLog.reason,
          timestamp: newLog.timestamp,
          signature: newLog.signature
        }
      };

    } else {
      // MOCK LOGIC
      const data = mockStore.load();
      const machine = data.machines.find((m: Machine) => m.id === machineId);
      if (!machine) return null;

      let newAccumulated = machine.accumulatedDowntimeMs;
      
      // CRITICAL: Consolida tempo no Mock
      if (machine.status === MachineStatus.STOPPED && status === MachineStatus.RUNNING) {
        const addedTime = calculateActiveDowntime(machine.lastUpdated, workHours, Date.now());
        newAccumulated += addedTime;
      }

      const updatedMachine = {
        ...machine,
        status,
        reason: status === MachineStatus.RUNNING ? null : reason,
        lastUpdated: new Date().toISOString(),
        accumulatedDowntimeMs: newAccumulated,
        notes: status === MachineStatus.RUNNING ? '' : notes,
        lastOperator: operator
      };

      const newLog: MachineHistoryLog = {
        id: crypto.randomUUID(),
        machineId,
        previousStatus: machine.status,
        newStatus: status,
        reason: status === MachineStatus.STOPPED ? reason : null,
        timestamp: new Date().toISOString(),
        signature: signature
      };

      data.machines = data.machines.map((m: Machine) => m.id === machineId ? updatedMachine : m);
      data.history.push(newLog);
      mockStore.save(data);

      return { machine: updatedMachine, log: newLog };
    }
  },

  // 3. Atualizar Configurações
  updateConfig: async (workHours?: WorkHoursConfig, tvConfig?: TvConfig) => {
    if (isSupabaseConfigured() && supabase) {
      const updates: any = {};
      if (workHours) updates.work_hours = workHours;
      if (tvConfig) updates.tv_config = tvConfig;
      
      await supabase.from('settings').update(updates).eq('id', 1);
    } else {
      const data = mockStore.load();
      if (workHours) data.workHours = workHours;
      if (tvConfig) data.tvConfig = tvConfig;
      mockStore.save(data);
    }
  },

  // 4. Atualizar Tempo Acumulado (Manual)
  updateAccumulatedTime: async (id: number, ms: number) => {
    if (isSupabaseConfigured() && supabase) {
      await supabase
        .from('machines')
        .update({ 
          accumulated_downtime_ms: ms, 
          last_operator: 'Supervisor (Manual)' 
        })
        .eq('id', id);
    } else {
      const data = mockStore.load();
      data.machines = data.machines.map((m: Machine) => 
        m.id === id ? { ...m, accumulatedDowntimeMs: ms, lastOperator: 'Supervisor (Manual)' } : m
      );
      mockStore.save(data);
    }
  },

  // 5. Reset Diário
  resetDaily: async () => {
    if (isSupabaseConfigured() && supabase) {
      // Supabase update all
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('machines')
        .update({
          production_count: 0,
          scrap_count: 0,
          accumulated_downtime_ms: 0,
          last_updated: now
        })
        .neq('id', 0) // Hack para update all sem where clause explicita (se o safe mode estiver on)
        .select();

      if (error) throw error;
      
      // Remapear
      const machines = (data || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          status: m.status,
          reason: m.reason,
          lastUpdated: m.last_updated,
          accumulatedDowntimeMs: m.accumulated_downtime_ms,
          notes: m.notes,
          lastOperator: m.last_operator,
          productionCount: m.production_count,
          scrapCount: m.scrap_count,
          cycleTimeValue: m.cycle_time_value,
          cycleTimeUnit: m.cycle_time_unit
      }));

      return { machines };
    } else {
      const data = mockStore.load();
      data.machines = data.machines.map((m: Machine) => ({
        ...m,
        productionCount: 0,
        scrapCount: 0,
        accumulatedDowntimeMs: 0,
        lastUpdated: new Date().toISOString()
      }));
      mockStore.save(data);
      return { machines: data.machines };
    }
  }
};
