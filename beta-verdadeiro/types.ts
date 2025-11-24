
export enum MachineStatus {
  RUNNING = 'FUNCIONANDO',
  STOPPED = 'PARADA',
}

export enum StopReason {
  EMPLOYEE = 'Falta de funcionário',
  MATERIAL = 'Falta de tapete',
  MAINTENANCE = 'Manutenção',
}

export enum CycleUnit {
  SECONDS = 'segundos',
  MINUTES = 'minutos',
  HOURS = 'horas'
}

export interface Machine {
  id: number;
  name: string;
  status: MachineStatus;
  reason: StopReason | null;
  lastUpdated: string; // ISO Date string
  accumulatedDowntimeMs: number; // Tempo total acumulado em milissegundos
  notes?: string; // Observações opcionais
  lastOperator?: string; // Nome do operador ou supervisor que realizou a última ação
  
  // Novos campos para OEE
  productionCount: number; // Peças boas produzidas
  scrapCount: number;      // Peças rejeitadas (refugo)
  
  // Configuração flexível de ciclo
  cycleTimeValue: number; 
  cycleTimeUnit: CycleUnit;
}

export interface MachineHistoryLog {
  id: string;
  machineId: number;
  previousStatus: MachineStatus;
  newStatus: MachineStatus;
  reason?: StopReason | null;
  timestamp: string; // ISO Date
  signature?: string; // Base64 image string da assinatura
}

export interface DashboardStats {
  totalStopped: number;
  totalRunning: number;
  operationRate: number;
  reasonsCount: Record<StopReason, number>;
}

export interface WorkHoursConfig {
  enabled: boolean;
  start: string; // "08:00"
  end: string;   // "18:49"
}

export interface TvConfig {
  intervalSeconds: number;
}

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface MachineContextType {
  machines: Machine[];
  workHours: WorkHoursConfig;
  history: MachineHistoryLog[];
  tvConfig: TvConfig;
  isLoading: boolean;
  getMachineById: (id: number) => Machine | undefined;
  updateMachineStatus: (id: number, status: MachineStatus, reason?: StopReason | null, notes?: string, operator?: string, signature?: string) => void;
  updateAccumulatedTime: (id: number, newTimeMs: number) => void;
  updateProductionData: (id: number, production: number, scrap: number) => void;
  updateCycleConfig: (id: number, value: number, unit: CycleUnit) => void;
  updateWorkHours: (config: WorkHoursConfig) => void;
  updateTvConfig: (config: TvConfig) => void;
  resetSystem: () => void;
  exportData: () => string;
  importData: (json: string) => boolean;
  generateMockData: () => void;
  showNotification: (message: string, type?: NotificationType) => void;
}
