import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Tenta pegar as variáveis de ambiente de diferentes formas (Vite, Create React App, ou Node puro)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

// Cria o cliente apenas se as chaves existirem para evitar Crash na inicialização
export const supabase: SupabaseClient | null = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;