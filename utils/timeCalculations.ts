import { WorkHoursConfig } from "../types";

// Helper para converter "HH:MM" em minutos absolutos (0 a 1440)
const getMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Verifica se um timestamp está dentro do horário de turno.
 */
const isWithinShift = (date: Date, workHours: WorkHoursConfig): boolean => {
  if (!workHours.enabled) return true;
  
  const currentMins = date.getHours() * 60 + date.getMinutes();
  const startMins = getMinutes(workHours.start);
  const endMins = getMinutes(workHours.end);

  if (startMins <= endMins) {
    // Turno Diurno (ex: 08:00 as 17:00)
    return currentMins >= startMins && currentMins <= endMins;
  } else {
    // Turno Noturno (ex: 22:00 as 05:00)
    // É válido se for >= 22:00 OU <= 05:00
    return currentMins >= startMins || currentMins <= endMins;
  }
};

/**
 * CALCULA O TEMPO DE PARADA ATIVA (EM MS)
 * Esta função deve ser usada para mostradores "ao vivo".
 * 
 * Lógica:
 * 1. Pega a data da última atualização (quando parou).
 * 2. Pega a data atual (agora).
 * 3. Se o controle de turno estiver desligado, retorna a diferença simples.
 * 4. Se estiver ligado, calcula apenas os minutos que intersectam com o turno ativo.
 */
export const calculateActiveDowntime = (
  lastUpdatedStr: string, 
  workHours: WorkHoursConfig,
  currentTimeMs: number = Date.now()
): number => {
  const start = new Date(lastUpdatedStr).getTime();
  const end = currentTimeMs;

  if (isNaN(start) || start >= end) return 0;

  // Modo Simples (Sem Turno)
  if (!workHours.enabled) {
    return end - start;
  }

  // Modo Com Turno (Cálculo Preciso)
  // Iteramos minuto a minuto para garantir precisão em viradas de turno/dia
  // Nota: Para paradas muito longas (dias), isso pode ser otimizado, 
  // mas para uso diário (dashboard), iterar minutos é extremamente rápido e seguro.
  
  let activeMs = 0;
  const cursor = new Date(start);
  
  // Arredonda cursor para o próximo minuto cheio para facilitar loop, 
  // mas guarda os segundos iniciais para precisão
  const startSecondsOffset = cursor.getSeconds() * 1000 + cursor.getMilliseconds();
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1); // Avança para o próximo minuto cheio

  // Se a parada for no mesmo minuto, retorna diferença simples
  if (end < cursor.getTime()) {
     return isWithinShift(new Date(start), workHours) ? (end - start) : 0;
  }

  // Adiciona o pedaço do primeiro minuto (se dentro do turno)
  if (isWithinShift(new Date(start), workHours)) {
    activeMs += (60000 - startSecondsOffset);
  }

  // Loop pelos minutos cheios
  while (cursor.getTime() + 60000 <= end) {
    if (isWithinShift(cursor, workHours)) {
      activeMs += 60000;
    }
    cursor.setTime(cursor.getTime() + 60000);
  }

  // Adiciona o pedaço do último minuto (se dentro do turno)
  if (isWithinShift(cursor, workHours)) {
    activeMs += (end - cursor.getTime());
  }

  return activeMs;
};

/**
 * Calcula quanto tempo do turno já passou HOJE (para o OEE).
 */
export const getElapsedShiftTimeTodayMs = (workHours: WorkHoursConfig): number => {
  const now = new Date();
  
  if (!workHours.enabled) {
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    return now.getTime() - startOfDay.getTime();
  }

  const startMins = getMinutes(workHours.start);
  const endMins = getMinutes(workHours.end);
  const nowMins = now.getHours() * 60 + now.getMinutes();

  // Cria objetos Date para hoje
  const shiftStart = new Date();
  shiftStart.setHours(Math.floor(startMins / 60), startMins % 60, 0, 0);
  
  const shiftEnd = new Date();
  shiftEnd.setHours(Math.floor(endMins / 60), endMins % 60, 0, 0);

  // Se agora é antes do início do turno
  if (now < shiftStart) return 0;

  // Se agora é depois do fim do turno (e não é turno noturno virado)
  if (startMins < endMins && now > shiftEnd) {
    return shiftEnd.getTime() - shiftStart.getTime();
  }

  // Estamos durante o turno
  return now.getTime() - shiftStart.getTime();
};