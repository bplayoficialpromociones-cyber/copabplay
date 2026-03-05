import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface RankingPlayer {
  id: string;
  player_name: string;
  province: string | null;
  usuario_bplay: string;
  points: number;
  position: number;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface HistoricalPlayer {
  id: string;
  player_name: string;
  usuario_bplay: string;
  province: string;
  first_participated_month: string | null;
  first_participated_year: number | null;
  last_participated_month: string | null;
  last_participated_year: number | null;
  total_participations: number;
  created_at: string;
  updated_at: string;
}
