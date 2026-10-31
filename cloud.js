// cloud.js — Cliente de Supabase con CARGA DIFERIDA
//
// Antes: `import ... from "https://cdn.jsdelivr.net/..."` estático. Si esa descarga
// fallaba (sin red y sin caché), TODO el árbol de módulos fallaba y la app no abría,
// aunque solo uses el modo local.
// Ahora: la librería se importa solo cuando hace falta (login / sincronizar) y si
// falla, la app sigue funcionando en local.
//
// OPCIONAL (recomendado): para no depender del CDN, guarda supabase-js en
// ./vendor/supabase.js (instrucciones en CAMBIOS.md) y pon USAR_VENDOR = true.

const supabaseUrl = "https://asafwfnaulikmudqijns.supabase.co";
// La anon key es pública por diseño; la seguridad real depende de RLS en la tabla.
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYWZ3Zm5hdWxpa211ZHFpam5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNjA2NzQsImV4cCI6MjA4NjYzNjY3NH0.zE-1WR86WJv4g9TmqbOfEzG5F8W2XjNN-9gyQu610bs";

export const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const USAR_VENDOR = false;
const SUPABASE_VENDOR = "./vendor/supabase.js";

let _clientePromise = null;

export function getSupabase() {
  if (!_clientePromise) {
    _clientePromise = (async () => {
      const mod = await import(USAR_VENDOR ? SUPABASE_VENDOR : SUPABASE_CDN);
      return mod.createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage,
          storageKey: 'supabase.auth.token'
        }
      });
    })().catch(err => {
      _clientePromise = null; // permitir reintento más tarde (p. ej. al volver la conexión)
      throw err;
    });
  }
  return _clientePromise;
}
