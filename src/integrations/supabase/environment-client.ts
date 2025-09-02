// Simple Supabase client
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://kvctyaldiikbcbtyhkjw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2Y3R5YWxkaWlrYmNidHloa2p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzOTk2MDEsImV4cCI6MjA3MTk3NTYwMX0.Ic_cgeOqoiJcu10KzIUvHvIS1BtXKgoNs0VTjHhZxQI";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});