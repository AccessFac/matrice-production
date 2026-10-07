/**
 * État de l'application et enregistrement automatique.
 *
 * Deux types de documents dans la base :
 *   config/main     → listes (sociétés, unités…), phases de planning, catalogue
 *   projets/<id>    → un projet : infos, planning, lignes de devis, coûts
 *
 * Toute modification passe par touch(key) : l'écriture part après une pause de saisie.
 */
import { CONFIG } from "./config.js";
import { DEFAULT_CFG, TABS } from "./defaults.js";
import { clone, uid } from "./utils.js";
import { pickAdapter } from "./adapters/index.js";

export const S = {
  cfg: clone(DEFAULT_CFG),
  projets: {},          // id → données du projet
  currentId: null,
  tab: "devis",
  online: false,
  readOnly: false,
  canDownload: false,
  auth: null,           // { needsAuth, noAccess, user } pour Supabase
  backend: "",
  error: ""
};

let adapter = null;
let onChange = () => {};
const dirty = {}, pending = {}, timers = {}, chains = {};

export function getAdapter() { return adapter; }
export function P() { return S.currentId ? S.projets[S.currentId] : null; }
export function sortedIds() {
  return Object.keys(S.projets).sort((a, b) => (S.projets[b].createdAt || "").localeCompare(S.projets[a].createdAt || ""));
}
export function isSaving() { return Object.values(dirty).some(Boolean); }

/* ---------- Préférences locales (onglet, projet ouvert) ---------- */
function loadPrefs() {
  try {
    S.tab = localStorage.getItem("mp.tab") || "devis";
    S.currentId = localStorage.getItem("mp.proj") || null;
  } catch (e) {}
  if (!TABS.some(t => t.id === S.tab)) S.tab = "devis";
}
export function savePrefs() {
  try { localStorage.setItem("mp.tab", S.tab); localStorage.setItem("mp.proj", S.currentId || ""); } catch (e) {}
}

/* ---------- Démarrage ---------- */
export async function initStore(changed) {
  onChange = changed;
  loadPrefs();
  adapter = pickAdapter();
  S.backend = adapter.name;
  let info;
  try { info = await adapter.init(); }
  catch (e) { S.online = false; S.error = String(e.message || e); onChange(); return; }
  S.online = !!info.online;
  S.readOnly = !!info.readOnly;
  S.canDownload = !!info.canDownload;
  S.auth = { needsAuth: !!info.needsAuth, noAccess: !!info.noAccess, user: info.user || null, localOnly: !!info.localOnly };
  onChange();
  if (!S.online || info.needsAuth || info.noAccess) return;

  adapter.watchDoc("config", "main", data => {
    if (dirty.cfg) return;                       // ne pas écraser une saisie en cours
    S.cfg = Object.assign(clone(DEFAULT_CFG), data ? clone(data) : {});
    onChange();
  }, () => { S.online = false; onChange(); });

  adapter.watchCollection("projets", docs => {
    const seen = new Set();
    for (const d of docs) { seen.add(d.id); if (!dirty[d.id]) S.projets[d.id] = clone(d.data); }
    for (const id of Object.keys(S.projets)) if (!seen.has(id) && !dirty[id]) delete S.projets[id];
    if (!S.currentId || !S.projets[S.currentId]) S.currentId = sortedIds()[0] || null;
    onChange();
  }, () => { S.online = false; onChange(); });
}

/* ---------- Enregistrement ---------- */
/** Signale une modification de "cfg" ou d'un projet (son id). */
export function touch(key) {
  pending[key] = true; dirty[key] = true;
  clearTimeout(timers[key]);
  onChange("status");
  if (!S.online || S.readOnly || !adapter) return;
  timers[key] = setTimeout(() => { pending[key] = false; flush(key); }, CONFIG.saveDelayMs);
}

function flush(key) {
  chains[key] = (chains[key] || Promise.resolve()).then(async () => {
    const body = key === "cfg" ? S.cfg : S.projets[key];
    if (!body) { dirty[key] = false; return; }
    const col = key === "cfg" ? "config" : "projets", id = key === "cfg" ? "main" : key;
    try {
      await adapter.set(col, id, clone(body));
      if (!pending[key]) dirty[key] = false;
    } catch (e) {
      if (adapter.isReadOnlyError(e)) { S.readOnly = true; dirty[key] = false; onChange(); return; }
      // une nouvelle tentative après un court délai
      await new Promise(r => setTimeout(r, 600 + Math.random() * 800));
      try { await adapter.set(col, id, clone(body)); dirty[key] = false; }
      catch (e2) { S.error = "Échec d'enregistrement · réessayez"; }
    }
    onChange("status");
  });
}

/* ---------- Projets ---------- */
export function newProject(base) {
  const id = uid();
  let p;
  if (base) {
    p = clone(base);
    p.nom = (base.nom || "Projet") + " (copie)";
    for (const k of ["planning", "lignes", "couts"]) (p[k] || []).forEach(x => (x.id = uid()));
  } else {
    p = {
      client: "", nom: "Nouveau projet", dateShow: "", tva: 0.2,
      planning: S.cfg.phases.map(ph => ({ id: uid(), phase: ph.nom, equipe: !!ph.equipe, jours: null, remarques: "" })),
      lignes: [], couts: []
    };
  }
  p.createdAt = new Date().toISOString();
  S.projets[id] = p;
  S.currentId = id;
  savePrefs();
  touch(id);
}

export function deleteProject() {
  const id = S.currentId;
  if (!id) return;
  delete S.projets[id];
  dirty[id] = false; pending[id] = false; clearTimeout(timers[id]);
  if (adapter && S.online && !S.readOnly) adapter.remove("projets", id).catch(() => {});
  S.currentId = sortedIds()[0] || null;
  savePrefs();
}
