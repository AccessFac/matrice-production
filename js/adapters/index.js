/** Choisit l'adaptateur de stockage selon js/config.js et l'environnement. */
import { CONFIG } from "../config.js";
import { createClaudeAdapter } from "./claude.js";
import { createSupabaseAdapter } from "./supabase.js";
import { createLocalAdapter } from "./local.js";

export function pickAdapter() {
  const b = CONFIG.backend;
  const hasClaude = !!(window.claude && window.claude.use);
  const hasSupabase = !!(CONFIG.supabase.url && CONFIG.supabase.anonKey);
  if (b === "supabase" || (b === "auto" && !hasClaude && hasSupabase)) return createSupabaseAdapter(CONFIG.supabase);
  if (b === "local" || (b === "auto" && !hasClaude)) return createLocalAdapter();
  return createClaudeAdapter();
}
