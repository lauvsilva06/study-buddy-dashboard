import { createClient } from "@supabase/supabase-js";

// User-provided Supabase project (publishable anon key — safe to ship in client code)
const SUPABASE_URL = "https://ujzoytjwpjnwawnlowwg.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqem95dGp3cGpud2F3bmxvd3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MzUxMDUsImV4cCI6MjA5NjMxMTEwNX0._-9XPGF3Z4xjc8XEGbdUpsmqwUJdwc5xWpaOotylDbY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: typeof window !== "undefined",
    autoRefreshToken: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    storageKey: "study-dashboard-auth",
  },
});
