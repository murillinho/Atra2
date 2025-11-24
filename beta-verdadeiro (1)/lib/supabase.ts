
import { createClient } from '@supabase/supabase-js';

// Tenta pegar das variáveis de ambiente.
// O uso de (import.meta as any) evita erros de lint se o TS não estiver configurado para Vite
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

// Só inicializa o cliente se as chaves existirem e forem válidas
// Isso evita o erro "supabaseUrl is required" que causa a tela branca
export const supabase = (supabaseUrl && supabaseKey && supabaseUrl.startsWith('http'))
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export const isSupabaseConfigured = () => {
  return !!supabase;
};
