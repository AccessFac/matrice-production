/**
 * Moteur commun des catalogues (prestations, coûts) : Société → Catégorie → éléments.
 * - classement alphabétique ;
 * - sociétés et catégories repliables d'un clic sur leur ligne de titre (mémorisé dans le navigateur) ;
 * - le bouton ✎ d'une ligne affiche ses menus Société / Catégorie (la ligne se range d'elle-même) ;
 * - « + Catégorie… » sur une société, « + Élément » sur une catégorie.
 *
 * Chaque catalogue est décrit par une « spec » (voir catalogue.js et coutsBase.js).
 */
import { S } from "../store.js";
import { esc, opts } from "../utils.js";
import { socColor } from "./recap.js";

export const cmp = (a, b) => String(a || "").localeCompare(String(b || ""), "fr", { sensitivity: "base", numeric: true });
const norm = s => String(s || "").trim().toLowerCase();

/** Catalogues déclarés, par type (catalogue, coutsbase). */
export const CATALOGS = {};

/** Lignes dont les menus Société / Catégorie sont ouverts (bouton ✎) — conservé entre deux affichages. */
export const editingRows = new Set();

export function makeCatalog(spec) {
  const items = () => S.cfg[spec.listKey] || (S.cfg[spec.listKey] = []);
  const name = c => c[spec.nameField];
  const cat = c => c[spec.catField];

  /* ----- repli (propre au navigateur) ----- */
  const load = () => { try { return new Set(JSON.parse(localStorage.getItem(spec.storageKey)) || []); } catch (e) { return new Set(); } };
  let collapsed = load();
  const save = () => { try { localStorage.setItem(spec.storageKey, JSON.stringify([...collapsed])); } catch (e) {} };
  const catKey = (soc, c) => `${soc}|${c ?? ""}`;
  const socKey = soc => `${soc}|*`;
  const isCollapsed = k => collapsed.has(k);
  const setCollapsed = (k, on) => { on ? collapsed.add(k) : collapsed.delete(k); save(); };
  const setAllCollapsed = on => {
    collapsed = new Set();
    if (on) for (const c of items()) if (c.societe) collapsed.add(catKey(c.societe, cat(c) || ""));
    save();
  };

  function find(n) { const k = norm(n); return k ? items().find(c => norm(name(c)) === k) : null; }

  function sorted(list = items()) {
    const empty = c => !c.societe && !name(c);
    return list.slice().sort((a, b) =>
      (empty(a) - empty(b)) || (!a.societe - !b.societe) || cmp(a.societe, b.societe)
      || (!cat(a) - !cat(b)) || cmp(cat(a), cat(b)) || cmp(name(a), name(b)));
  }

  const P = spec.idPrefix, K = spec.kind, COLS = 3 + spec.columns.length;

  function row(c) {
    const ph = label => `<option value="">${label}…</option>`;
    const missing = !c.societe || !cat(c);
    const picks = `<div class="picks">
        <select class="cell pick" id="${P}-${c.id}-s" data-f="societe" aria-label="Société">${ph("Société") + opts(S.cfg.societes, c.societe, false)}</select>
        <select class="cell pick" id="${P}-${c.id}-c" data-f="${spec.catField}" aria-label="${spec.catLabel}">${ph(spec.catLabel) + opts(spec.catList(), cat(c), false)}</select></div>`;
    return `<tr data-row="${K}" data-id="${c.id}" class="${missing || editingRows.has(c.id) ? "editing" : ""}">
      <td><div class="presta">
        <input class="cell" id="${P}-${c.id}-p" data-f="${spec.nameField}" value="${esc(name(c))}" placeholder="${esc(spec.namePlaceholder)}">
        <button class="icon-btn edit-btn" data-editrow="1" title="Changer la société ou la ${spec.catLabel.toLowerCase()}" aria-label="Changer la société ou la ${spec.catLabel.toLowerCase()}">✎</button></div>${picks}</td>
      <td><textarea class="cell" id="${P}-${c.id}-d" data-f="description" rows="1">${esc(c.description)}</textarea></td>
      ${spec.columns.map(col => col.td(c, P)).join("")}
      <td><button class="icon-btn" data-del="${K}" aria-label="Supprimer">×</button></td></tr>`;
  }

  function render() {
    const list = items();
    let h = `<section class="sec"><div class="sec-h"><h2>${esc(spec.title)} <small>${list.length} ${esc(spec.countLabel)}</small></h2>
      <div class="actions"><button class="btn ghost" data-foldall="1" data-kind="${K}">Tout replier</button><button class="btn ghost" data-foldall="0" data-kind="${K}">Tout déplier</button></div></div>
    <p class="note">${spec.note}</p>
    <div class="tbl-wrap"><table data-tbl="${K}"><thead><tr>
      <th style="min-width:300px">${esc(spec.itemLabel)}</th><th style="min-width:340px">Description</th>
      ${spec.columns.map(col => col.th).join("")}<th></th></tr></thead>`;

    const socs = [];
    for (const c of sorted(list)) {
      const soc = c.societe || "", cg = cat(c) || "";
      let s = socs.find(x => x.soc === soc); if (!s) socs.push(s = { soc, cats: [] });
      let g = s.cats.find(x => x.cat === cg); if (!g) s.cats.push(g = { cat: cg, items: [] });
      g.items.push(c);
    }

    for (const s of socs) {
      const titre = s.soc || `Nouvelles lignes (choisir société et ${spec.catLabel.toLowerCase()})`;
      const n = s.cats.reduce((a, g) => a + g.items.length, 0);
      const absentes = spec.catList().filter(x => !s.cats.some(g => g.cat === x));
      const socClosed = s.soc && isCollapsed(socKey(s.soc));
      h += `<tbody class="soc-head" data-soc="${esc(s.soc)}"><tr class="grp${s.soc ? " foldable" : ""}" ${s.soc ? `data-fold-row="${esc(socKey(s.soc))}" data-kind="${K}"` : ""}><td colspan="${COLS}"><div class="grp-in">
          ${s.soc ? `<span class="chev">${socClosed ? "▸" : "▾"}</span>` : ""}
          <i class="dot" style="background:${socColor(s.soc)}"></i><b>${esc(titre)}</b><span class="grp-n">${n}</span>
          ${s.soc && absentes.length ? `<select class="cell add-cat" data-kind="${K}" data-soc="${esc(s.soc)}" aria-label="Ajouter : ${esc(spec.catLabel)}"><option value="">+ ${esc(spec.catLabel)}…</option>${absentes.map(x => `<option>${esc(x)}</option>`).join("")}</select>` : ""}
        </div></td></tr></tbody>`;
      for (const g of s.cats) {
        const k = catKey(s.soc, g.cat), closed = isCollapsed(k);
        const sub = s.soc ? `<tr class="subgrp foldable" data-fold-row="${esc(k)}" data-kind="${K}"><td colspan="${COLS}"><div class="grp-in">
            <span class="chev">${closed ? "▸" : "▾"}</span><b>${esc(g.cat || "Sans " + spec.catLabel.toLowerCase())}</b><span class="grp-n">${g.items.length}</span>
            ${g.cat ? `<button class="btn ghost add-in" data-addin="${esc(s.soc)}|${esc(g.cat)}" data-kind="${K}">+ ${esc(spec.addLabel)}</button>` : ""}
          </div></td></tr>` : "";
        h += `<tbody class="cat-group${closed ? " collapsed" : ""}${socClosed ? " soc-collapsed" : ""}" data-soc="${esc(s.soc)}" data-cat="${esc(g.cat)}" data-fold-key="${esc(k)}">${sub}${g.items.map(row).join("")}</tbody>`;
      }
    }
    if (!list.length) h += `<tbody><tr><td colspan="${COLS}" class="lbl note">${esc(spec.emptyText)}</td></tr></tbody>`;
    return h + `</table></div><div class="add-row"><button class="btn" data-add="${K}">+ Ajouter ${esc(spec.addLabelLong)}</button></div></section>`;
  }

  /** Nouvel élément (option : société et catégorie déjà choisies). */
  function add(soc, c) {
    const row = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), ...spec.blank(), societe: soc || "", [spec.catField]: c || "" };
    items().push(row);
    if (soc) { setCollapsed(socKey(soc), false); setCollapsed(catKey(soc, c || ""), false); }
    return row;
  }

  /** Élément rangé dans un autre groupe. */
  function move(id, soc, c) {
    const it = items().find(x => x.id === id);
    if (!it || (it.societe === soc && cat(it) === c)) return false;
    it.societe = soc; it[spec.catField] = c;
    return true;
  }

  const api = { spec, items, find, sorted, render, add, move, isCollapsed, setCollapsed, setAllCollapsed, socKey, catKey };
  CATALOGS[K] = api;
  return api;
}
