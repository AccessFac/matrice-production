/**
 * Configuration de l'application.
 *
 * backend :
 *   "auto"     → Claude (si la page est ouverte dans claude.ai), sinon Supabase si configuré, sinon local
 *   "supabase" → base Supabase (voir README.md, section « Base de données »)
 *   "local"    → stockage dans le navigateur uniquement (tests, aucune synchronisation)
 *
 * La clé "anon" de Supabase est publique par conception : la sécurité repose sur les
 * règles d'accès (RLS) définies dans supabase/schema.sql. Ne jamais mettre ici la clé "service_role".
 */
export const CONFIG = {
  backend: "auto",
  supabase: {
    url: "https://tlnlgqrusxukkhjuuvas.supabase.co",
    // clé « anon » publique (Project Settings → API) — jamais la clé service_role
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsbmxncXJ1c3h1a2toanV1dmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzNzE2MTAsImV4cCI6MjEwNjk0NzYxMH0.E2ifCIsUxmTuic_zWcJUZrv1Ma5I6nqC9mi0yags4os"
  },
  saveDelayMs: 900   // délai avant enregistrement après une saisie
};
