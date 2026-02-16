import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabaseUrl = "https://asafwfnaulikmudqijns.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYWZ3Zm5hdWxpa211ZHFpam5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNjA2NzQsImV4cCI6MjA4NjYzNjY3NH0.zE-1WR86WJv4g9TmqbOfEzG5F8W2XjNN-9gyQu610bs";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'supabase.auth.token'
  }
});
