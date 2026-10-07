/**
 * Adaptateur local : données dans le navigateur (localStorage) uniquement.
 * Pratique pour tester en ouvrant index.html via un petit serveur local ; rien n'est partagé.
 */
import { browserDownload } from "./supabase.js";

const KEY = "mp.local.db";
const listeners = new Set();

function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
function save(all) { try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) {} listeners.forEach(f => f()); }

export function createLocalAdapter() {
  return {
    name: "local",
    async init() { return { online: true, readOnly: false, canDownload: true, localOnly: true }; },

    watchDoc(col, id, next) {
      const f = () => next((load()[col] || {})[id] ?? null);
      listeners.add(f); f();
      return () => listeners.delete(f);
    },

    watchCollection(col, next) {
      const f = () => next(Object.entries(load()[col] || {}).map(([id, data]) => ({ id, data })));
      listeners.add(f); f();
      return () => listeners.delete(f);
    },

    async set(col, id, data) { const all = load(); (all[col] = all[col] || {})[id] = data; save(all); },
    async remove(col, id) { const all = load(); if (all[col]) delete all[col][id]; save(all); },
    isReadOnlyError() { return false; },
    download(filename, text) { browserDownload(filename, text); }
  };
}
