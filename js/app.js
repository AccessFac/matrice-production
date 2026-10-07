/**
 * Point d'entrée : affichage général (barre du haut, onglets), recalculs en direct et événements.
 * Pour modifier un onglet, voir js/views/<onglet>.js ; pour un calcul, js/calc.js.
 */
import { S, P, initStore, touch, newProject, deleteProject, sortedIds, savePrefs, isSaving, getAdapter } from "./store.js";
import { TABS, BLANK } from "./defaults.js";
import { calc, costTotal, syncFromCatalogue, syncCostsFromBase } from "./calc.js";
import { esc, eur, num, nstr, uid } from "./utils.js";
import { renderDevis, lineTotalCell, groupLines, groupKey, groupTotal } from "./views/devis.js";
import { renderCouts, groupCosts, costGroupKey, costGroupTotal } from "./views/couts.js";
import { renderResultat } from "./views/resultat.js";
import { renderCatalogue, findInCatalogue } from "./views/catalogue.js";
import { coutsBase } from "./views/coutsBase.js";
import { CATALOGS } from "./views/catalog.js";
import { renameEverywhere } from "./rename.js";
import { renderListes } from "./views/listes.js";
import { renderLogin, renderNoAccess } from "./views/auth.js";
import { recapSoc, recapCat } from "./views/recap.js";
import { enhanceTables, initResize } from "./ui/resize.js";
import { autosizeAll, initAutosize } from "./ui/autosize.js";
import { initSortable, initCatalogueSortable } from "./ui/sortable.js";
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
  const authScreen = !!(S.auth && (S.auth.needsAuth || S.auth.noAccess));
  // Le mode lecture seule désactive les champs : jamais sur l'écran de connexion
  document.body.classList.toggle("ro", S.readOnly && !authScreen);
  let h = "";
  if (S.auth && S.auth.needsAuth) { m.innerHTML = renderLogin(loginMessage); return; }
  if (S.auth && S.auth.noAccess) { m.innerHTML = renderNoAccess(); return; }
  if (S.readOnly) h += `<div class="banner">Vous consultez cette matrice en lecture seule : vos modifications ne seraient pas enregistrées.</div>`;
  if (!S.online) h += `<div class="banner">Le stockage n'est pas disponible${S.error ? " (" + esc(S.error) + ")" : ""}. Vérifiez la connexion ou la configuration dans js/config.js.</div>`;
  if (S.auth && S.auth.localOnly) h += `<div class="banner info">Mode local : les données restent dans ce navigateur. Configurez Supabase dans js/config.js pour les partager.</div>`;

  // Le devis suit le catalogue (prix, société, catégorie…) : mise à jour et enregistrement si besoin
  if (P() && !S.readOnly) {
    const a = syncFromCatalogue(P(), S.cfg.catalogue), b = syncCostsFromBase(P(), S.cfg.coutsCatalogue);
    if (a || b) touch(S.currentId);
  }
  if (S.tab === "catalogue") h += renderCatalogue();
  else if (S.tab === "coutsbase") h += coutsBase.render();
  else if (S.tab === "listes") h += renderListes();
  else if (!P()) h += `<div class="empty"><h2>Aucun projet pour l'instant</h2><p>Un projet regroupe le devis client, le planning, les coûts et le résultat par société. Commencez par en créer un : le catalogue préremplira les prix.</p>${S.readOnly || !S.online ? "" : `<button class="btn primary" data-act="new">Créer un projet</button>`}</div>`;
  else if (S.tab === "devis") h += renderDevis();
  else if (S.tab === "couts") h += renderCouts();
  else if (S.tab === "resultat") h += renderResultat();
  m.innerHTML = h;
  enhanceTables(m);
  autosizeAll(m);
  if (S.tab === "devis" && P() && !S.readOnly) initSortable(m, ids => reorder("lignes", ids));
  if (S.tab === "couts" && P() && !S.readOnly) initSortable(m, ids => reorder("couts", ids), "couts");
  if (CATALOGS[S.tab] && !S.readOnly) initCatalogueSortable(m, { onMoveRow: (id, soc, cat) => { if (id && CATALOGS[S.tab].move(id, soc, cat)) touch("cfg"); render(); } }, S.tab);
}

/** Catalogue (prestations ou coûts) : nouvel élément, éventuellement déjà rangé. */
function addCatalogRow(kind, soc, cat) {
  const C = CATALOGS[kind]; if (!C) return;
  const row = C.add(soc, cat);
  touch("cfg"); render();
  const f = $(`${C.spec.idPrefix}-${row.id}-p`); if (f) f.focus();
}

/** Nouvel ordre des lignes (devis ou coûts) après un glisser-déposer. */
function reorder(key, ids) {
  const p = P(); if (!p) return;
  const pos = new Map(ids.map((id, i) => [id, i]));
  const before = (p[key] || []).map(l => l.id).join();
  p[key] = (p[key] || []).slice().sort((a, b) => (pos.get(a.id) ?? 1e9) - (pos.get(b.id) ?? 1e9));
  if (p[key].map(l => l.id).join() === before) return;
  touch(S.currentId);
  render();
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
  for (const g of groupLines(p.lignes)) set(groupKey(g.cat), eur(groupTotal(g)));
  for (const g of groupCosts(p.couts)) set(costGroupKey(g.cat), eur(costGroupTotal(g)));
  set("ht", eur(r.ht)); set("tva", eur(r.tva)); set("ttc", eur(r.ttc));
  set("jeq", nstr(r.joursEquipe)); set("jall", nstr(r.joursTous));
  set("ctot", eur(r.coutsTotal));
  set("recap-soc", recapSoc(r)); set("recap-cat", recapCat(r));
}

/* ---------- Repli des sociétés / catégories d'un catalogue ---------- */
function toggleFold(tr) {
  const C = CATALOGS[tr.dataset.kind]; if (!C) return;
  const k = tr.dataset.foldRow, on = !C.isCollapsed(k);
  C.setCollapsed(k, on);
  const chev = tr.querySelector(".chev"); if (chev) chev.textContent = on ? "▸" : "▾";
  const table = tr.closest("table");
  table.querySelectorAll("tbody.cat-group").forEach(tb => {
    if (k.endsWith("|*")) { if (C.socKey(tb.dataset.soc) === k) tb.classList.toggle("soc-collapsed", on); }
    else if (tb.dataset.foldKey === k) tb.classList.toggle("collapsed", on);
  });
}

/* ---------- Clics ---------- */
document.addEventListener("click", e => {
  // Ligne de titre de société / catégorie d'un catalogue : toute la ligne replie / déplie
  const fr = e.target.closest("tr.foldable");
  if (fr && !e.target.closest("button, select, input")) { toggleFold(fr); return; }
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

  if (t.dataset.foldall) { const C = CATALOGS[t.dataset.kind]; if (C) { C.setAllCollapsed(t.dataset.foldall === "1"); render(); } return; }
  if (t.dataset.addin) { const [soc, cat] = t.dataset.addin.split("|"); addCatalogRow(t.dataset.kind, soc, cat); return; }
  if (t.dataset.add) {
    const k = t.dataset.add;
    if (CATALOGS[k]) { addCatalogRow(k); return; }
    else { const p = P(); (p[k] = p[k] || []).push({ id: uid(), ...BLANK[k]() }); touch(S.currentId); }
    render();
    const rows = document.querySelectorAll(`tr[data-row="${k}"]`), last = rows[rows.length - 1];
    if (last) { const f = last.querySelector("input.cell,select.cell"); if (f) f.focus(); }
    return;
  }
  if (t.dataset.del) {
    const k = t.dataset.del, id = t.closest("tr").dataset.id;
    if (CATALOGS[k]) { const L = CATALOGS[k].spec.listKey; S.cfg[L] = S.cfg[L].filter(x => x.id !== id); touch("cfg"); }
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
  if (CATALOGS[k]) { const c = CATALOGS[k].items().find(x => x.id === id); if (c) { c[el.dataset.f] = readVal(el); touch("cfg"); } return; }
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
  // Listes : une valeur renommée est remplacée partout (catalogues, devis, coûts, planning) en quittant le champ
  if ((el.dataset.list || (el.dataset.phase !== undefined && el.dataset.pf === "nom")) && el.dataset.orig !== undefined) {
    const key = el.dataset.list || "phases", before = el.dataset.orig, after = el.value;
    if (before && after && before !== after) { renameEverywhere(key, before, after).forEach(id => touch(id)); touch("cfg"); render(); }
    el.dataset.orig = after;
    return;
  }
  if (el.classList.contains("add-cat")) { if (el.value) addCatalogRow(el.dataset.kind, el.dataset.soc, el.value); return; }
  const tr = el.closest("tr[data-row]");
  // Choisir une prestation du catalogue remplit la ligne
  if (tr && tr.dataset.row === "lignes" && el.dataset.f === "prestation") {
    const item = findInCatalogue(el.value);
    const row = P().lignes.find(x => x.id === tr.dataset.id);
    if (item && row) {
      Object.assign(row, { catId: item.id, prestation: item.prestation, categorie: item.categorie, description: item.description, societe: item.societe, unite: item.unite, pu: item.pu, presence: !!item.presence });
      if (row.quantite === null || row.quantite === undefined) row.quantite = 1;
      touch(S.currentId); render();
      const q = $(`l-${row.id}-q`); if (q) { q.focus(); q.select(); }
    }
    return;
  }
  // Choisir un coût du Catalogue coûts remplit la ligne de coût
  if (tr && tr.dataset.row === "couts" && el.dataset.f === "libelle") {
    const item = coutsBase.find(el.value);
    const row = P().couts.find(x => x.id === tr.dataset.id);
    if (item && row) {
      row.costId = item.id; row.unite = item.unite || row.unite;
      syncCostsFromBase(P(), S.cfg.coutsCatalogue);
      if (row.quantite === null || row.quantite === undefined) row.quantite = 1;
      touch(S.currentId); render();
      const q = $(`c-${row.id}-q`); if (q) { q.focus(); q.select(); }
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

/* ---------- Champs chiffrés : tout le contenu est sélectionné au clic ---------- */
let justFocused = null;
document.addEventListener("focusin", e => {
  const el = e.target;
  if (el.dataset && (el.dataset.list || el.dataset.pf === "nom") && el.dataset.orig === undefined) el.dataset.orig = el.value;
  if (!el.matches || !el.matches('input[data-num], input[data-pctf], input[data-pct], input[inputmode="decimal"]')) return;
  justFocused = el;
  const sel = () => { try { el.setSelectionRange(0, el.value.length); } catch (_) { el.select(); } };
  sel(); setTimeout(sel, 0);                     // Safari / iPhone sélectionnent après le focus
});
document.addEventListener("mouseup", e => {      // éviter que le clic ne remette le curseur au milieu
  if (justFocused && e.target === justFocused) e.preventDefault();
  justFocused = null;
}, true);

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
initAutosize();
render();
initStore(kind => (kind === "status" ? refreshStatus() : requestRender()));
