import { createClient } from "@supabase/supabase-js";

// User-provided Supabase project (publishable anon key — safe to ship in client code)
const SUPABASE_URL = "https://hzrblgympraverzcddyf.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6cmJsZ3ltcHJhdmVyemNkZHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MjAyNjMsImV4cCI6MjA5Nzk5NjI2M30.79G5yhUrHZ7z0_rCGvj0X1RKJngI4FJXCBZ75vQViWg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: typeof window !== "undefined",
    autoRefreshToken: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    storageKey: "study-dashboard-auth",
  },
});
