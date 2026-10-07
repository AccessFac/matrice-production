/**
 * Point d'entrée : affichage général (barre du haut, onglets), recalculs en direct et événements.
 * Pour modifier un onglet, voir js/views/<onglet>.js ; pour un calcul, js/calc.js.
 */
import { S, P, initStore, touch, newProject, deleteProject, sortedIds, savePrefs, isSaving, getAdapter } from "./store.js";
import { TABS, BLANK } from "./defaults.js";
import { calc, costTotal } from "./calc.js";
import { esc, eur, num, nstr, uid } from "./utils.js";
import { renderDevis, lineTotalCell } from "./views/devis.js";
import { renderCouts } from "./views/couts.js";
import { renderResultat } from "./views/resultat.js";
import { renderCatalogue } from "./views/catalogue.js";
import { renderListes } from "./views/listes.js";
import { renderLogin, renderNoAccess } from "./views/auth.js";
import { recapSoc, recapCat } from "./views/recap.js";
import { enhanceTables, initResize } from "./ui/resize.js";
import { exportCsv } from "./export.js";

const $ = id => document.getElementById(id);
let confirmDelete = false;
let pendingRender = false;
let loginMessage = "";

/* ---------- Statut d'enregistrement ---------- */
function refreshStatus() {
  const el = $("status");
  const set = (s, t) => { el.dataset.s = s; el.querySelector("span").textContent = t; };
  if (!S.online) set("err", S.error || "Hors ligne · modifications non enregistrées");
  else if (S.auth && S.auth.needsAuth) set("idle", "Non connecté");
  else if (S.readOnly) set("ro", "Lecture seule");
  else if (isSaving()) set("saving", "Enregistrement…");
  else if (S.error) set("err", S.error);
  else set("ok", S.auth && S.auth.localOnly ? "Enregistré sur cet appareil" : "Enregistré");
}

/* ---------- Barre du haut ---------- */
function renderTop() {
  const sel = $("projSel"), ids = sortedIds();
  sel.innerHTML = ids.length
    ? ids.map(id => `<option value="${id}" ${id === S.currentId ? "selected" : ""}>${esc(S.projets[id].nom || "Sans nom")}${S.projets[id].client ? " · " + esc(S.projets[id].client) : ""}</option>`).join("")
    : `<option>Aucun projet</option>`;
  sel.disabled = !ids.length;

  const a = $("projActions");
  if (confirmDelete && P()) {
    a.innerHTML = `<span class="confirm">Supprimer « ${esc(P().nom)} » ? <button class="btn danger" data-act="del-yes">Supprimer</button><button class="btn ghost" data-act="del-no">Annuler</button></span>`;
  } else {
    a.innerHTML = (S.readOnly ? "" : `<button class="btn primary" data-act="new">Nouveau projet</button>
      <button class="btn" data-act="dup" ${P() ? "" : "disabled"}>Dupliquer</button>
      <button class="btn ghost" data-act="del" ${P() ? "" : "disabled"}>Supprimer</button>`)
      + (S.canDownload && P() ? `<button class="btn ghost" data-act="csv">Export CSV</button>` : "")
      + (S.auth && S.auth.user ? `<span class="who">${esc(S.auth.user.email)}</span><button class="btn ghost" data-act="logout">Déconnexion</button>` : "");
  }
  $("tabs").innerHTML = TABS.map(t => `<button class="tab" role="tab" aria-selected="${t.id === S.tab}" data-tab="${t.id}">${t.label}${t.internal ? '<span class="tag">interne</span>' : ""}</button>`).join("");
  refreshStatus();
}

/* ---------- Rendu principal ---------- */
function render() {
  renderTop();
  const m = $("main");
  document.body.classList.toggle("ro", S.readOnly);
  let h = "";
  if (S.auth && S.auth.needsAuth) { m.innerHTML = renderLogin(loginMessage); return; }
  if (S.auth && S.auth.noAccess) { m.innerHTML = renderNoAccess(); return; }
  if (S.readOnly) h += `<div class="banner">Vous consultez cette matrice en lecture seule : vos modifications ne seraient pas enregistrées.</div>`;
  if (!S.online) h += `<div class="banner">Le stockage n'est pas disponible${S.error ? " (" + esc(S.error) + ")" : ""}. Vérifiez la connexion ou la configuration dans js/config.js.</div>`;
  if (S.auth && S.auth.localOnly) h += `<div class="banner info">Mode local : les données restent dans ce navigateur. Configurez Supabase dans js/config.js pour les partager.</div>`;

  if (S.tab === "catalogue") h += renderCatalogue();
  else if (S.tab === "listes") h += renderListes();
  else if (!P()) h += `<div class="empty"><h2>Aucun projet pour l'instant</h2><p>Un projet regroupe le devis client, le planning, les coûts et le résultat par société. Commencez par en créer un : le catalogue préremplira les prix.</p>${S.readOnly || !S.online ? "" : `<button class="btn primary" data-act="new">Créer un projet</button>`}</div>`;
  else if (S.tab === "devis") h += renderDevis();
  else if (S.tab === "couts") h += renderCouts();
  else if (S.tab === "resultat") h += renderResultat();
  m.innerHTML = h;
  enhanceTables(m);
}

/** Ne pas reconstruire la page pendant une saisie : on attend que le champ perde le focus. */
function isTyping() {
  const a = document.activeElement;
  return a && a.closest && a.closest("#main") && /INPUT|TEXTAREA|SELECT/.test(a.tagName);
}
function requestRender() { if (isTyping()) { pendingRender = true; return; } render(); }
document.addEventListener("focusout", () => setTimeout(() => {
  if (pendingRender && !isTyping()) { pendingRender = false; render(); }
}, 0));

/* ---------- Recalcul en direct (sans reconstruire les champs) ---------- */
function refreshCalc() {
  const p = P();
  if (!p) return;
  const r = calc(p, S.cfg);
  const set = (k, v) => { const el = document.querySelector(`[data-calc="${k}"]`); if (el) el.innerHTML = v; };
  for (const l of p.lignes || []) set("lt-" + l.id, lineTotalCell(l));
  for (const c of p.couts || []) set("ct-" + c.id, eur(costTotal(c)));
  set("ht", eur(r.ht)); set("tva", eur(r.tva)); set("ttc", eur(r.ttc));
  set("jeq", nstr(r.joursEquipe)); set("jall", nstr(r.joursTous));
  set("ctot", eur(r.coutsTotal));
  set("recap-soc", recapSoc(r)); set("recap-cat", recapCat(r));
}

/* ---------- Clics ---------- */
document.addEventListener("click", e => {
  const t = e.target.closest("button");
  if (!t) return;
  if (t.dataset.tab) { S.tab = t.dataset.tab; savePrefs(); render(); return; }

  const act = t.dataset.act;
  if (act === "new") { newProject(); render(); return; }
  if (act === "dup") { if (P()) { newProject(P()); render(); } return; }
  if (act === "del") { confirmDelete = true; renderTop(); return; }
  if (act === "del-no") { confirmDelete = false; renderTop(); return; }
  if (act === "del-yes") { deleteProject(); confirmDelete = false; render(); return; }
  if (act === "csv") { exportCsv(); return; }
  if (act === "logout") { const a = getAdapter(); if (a && a.signOut) a.signOut(); return; }
  if (S.readOnly) return;

  if (t.dataset.add) {
    const k = t.dataset.add;
    if (k === "catalogue") { S.cfg.catalogue.push({ id: uid(), ...BLANK.catalogue() }); touch("cfg"); }
    else { const p = P(); (p[k] = p[k] || []).push({ id: uid(), ...BLANK[k]() }); touch(S.currentId); }
    render();
    const rows = document.querySelectorAll(`tr[data-row="${k}"]`), last = rows[rows.length - 1];
    if (last) { const f = last.querySelector("input.cell,select.cell"); if (f) f.focus(); }
    return;
  }
  if (t.dataset.del) {
    const k = t.dataset.del, id = t.closest("tr").dataset.id;
    if (k === "catalogue") { S.cfg.catalogue = S.cfg.catalogue.filter(x => x.id !== id); touch("cfg"); }
    else { const p = P(); p[k] = p[k].filter(x => x.id !== id); touch(S.currentId); }
    render(); return;
  }
  if (t.dataset.ladd) {
    const k = t.dataset.ladd;
    if (k === "phases") S.cfg.phases.push({ nom: "", equipe: false }); else S.cfg[k].push("");
    touch("cfg"); render(); return;
  }
  if (t.dataset.ldel) { S.cfg[t.dataset.ldel].splice(+t.dataset.i, 1); touch("cfg"); render(); }
});

/* ---------- Saisie ---------- */
function readVal(el) {
  if (el.type === "checkbox") return el.checked;
  if (el.dataset.pctf) { const v = num(el.value); return v === null ? null : Math.min(100, Math.max(0, v)) / 100; }
  if (el.dataset.num) return num(el.value);
  return el.value;
}

document.addEventListener("input", e => {
  const el = e.target;
  if (S.readOnly || !el.closest("#main")) return;
  if (el.dataset.p) {                                   // champs du projet
    const p = P(); if (!p) return;
    p[el.dataset.p] = el.dataset.pct ? (num(el.value) ?? 0) / 100 : el.value;
    touch(S.currentId); refreshCalc();
    if (el.dataset.p === "nom" || el.dataset.p === "client") renderTop();
    return;
  }
  if (el.dataset.list) { S.cfg[el.dataset.list][+el.dataset.i] = el.value; touch("cfg"); return; }
  if (el.dataset.phase !== undefined && el.dataset.pf) { S.cfg.phases[+el.dataset.phase][el.dataset.pf] = readVal(el); touch("cfg"); return; }

  const tr = el.closest("tr[data-row]");
  if (!tr || !el.dataset.f) return;
  const k = tr.dataset.row, id = tr.dataset.id;
  if (k === "catalogue") { const c = S.cfg.catalogue.find(x => x.id === id); if (c) { c[el.dataset.f] = readVal(el); touch("cfg"); } return; }
  const row = (P()[k] || []).find(x => x.id === id);
  if (!row) return;
  row[el.dataset.f] = readVal(el);
  touch(S.currentId);
  if (el.type !== "checkbox" && el.tagName !== "SELECT") refreshCalc();
});

document.addEventListener("change", e => {
  const el = e.target;
  if (el.id === "projSel") { S.currentId = el.value; confirmDelete = false; savePrefs(); render(); return; }
  if (S.readOnly || !el.closest("#main")) return;
  const tr = el.closest("tr[data-row]");
  // Choisir une prestation du catalogue remplit la ligne
  if (tr && tr.dataset.row === "lignes" && el.dataset.f === "prestation") {
    const item = S.cfg.catalogue.find(c => c.prestation === el.value);
    const row = P().lignes.find(x => x.id === tr.dataset.id);
    if (item && row) {
      Object.assign(row, { prestation: item.prestation, categorie: item.categorie, description: item.description, societe: item.societe, unite: item.unite, pu: item.pu, presence: !!item.presence });
      if (row.quantite === null || row.quantite === undefined) row.quantite = 1;
      touch(S.currentId); render();
      const q = $(`l-${row.id}-q`); if (q) { q.focus(); q.select(); }
    }
    return;
  }
  if (el.tagName === "SELECT" || el.type === "checkbox") {
    if (S.tab !== "devis" || el.type === "checkbox" || el.dataset.f === "unite") render(); else refreshCalc();
  }
});

document.addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.matches("input.cell")) { e.preventDefault(); e.target.blur(); }
});

/* ---------- Connexion (Supabase) ---------- */
document.addEventListener("submit", async e => {
  if (e.target.id !== "login-form") return;
  e.preventDefault();
  const email = $("login-email").value.trim();
  const password = $("login-password").value;
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "Connexion…";
  try { await getAdapter().signIn(email, password); loginMessage = ""; }
  catch (err) {
    const m = String((err && err.message) || err);
    loginMessage = /invalid login credentials/i.test(m) ? "E-mail ou mot de passe incorrect." : "La connexion a échoué : " + m;
    render();
    const f = $("login-email"); if (f) f.value = email;
    const p = $("login-password"); if (p) p.focus();
  }
});

/* ---------- Démarrage ---------- */
initResize();
render();
initStore(kind => (kind === "status" ? refreshStatus() : requestRender()));
