import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://asafwfnaulikmudqijns.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYWZ3Zm5hdWxpa211ZHFpam5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNjA2NzQsImV4cCI6MjA4NjYzNjY3NH0.zE-1WR86WJv4g9TmqbOfEzG5F8W2XjNN-9gyQu610bs"; // 👈 CAMBIA ESTO por tu anon key real

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function saveUserToCloud(uid, data) {
  const { error } = await supabase.from("usuarios").upsert({
    id: uid,
    data,
    updated_at: new Date().toISOString()
  });
  
  if (error) {
    console.error("Error guardando en cloud:", error);
    throw error;
  }
}

export async function loadUserFromCloud(uid) {
  const { data, error } = await supabase
    .from("usuarios")
    .select("data")
    .eq("id", uid)
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116 = no encontrado (primera vez)
    console.error("Error cargando de cloud:", error);
    return null;
  }
  
  return data?.data || null;
}
