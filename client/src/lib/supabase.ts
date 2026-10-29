import { createClient } from "@supabase/supabase-js";

const fallbackUrl = "https://mixlupweuzshctnldeyl.supabase.co";
const fallbackAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1peGx1cHdldXpzaGN0bmxkZXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxOTk2MTYsImV4cCI6MjEwNDc3NTYxNn0.eFL2jLImt1BS6qIAKr4fy1n28UoQvt_cSTUsxyx8kzk";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fallbackUrl;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || fallbackAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
