/**
 * Onglet Catalogue : prestations types et tarifs par défaut, communs à tous les projets.
 * Affichage : Société → Catégorie → Prestations.
 * - tout est classé par ordre alphabétique ;
 * - sociétés et catégories se replient d'un clic sur leur titre (mémorisé dans le navigateur) ;
 * - glisser une prestation (poignée ⠿) dans un autre groupe change sa catégorie et sa société.
 */
import { S } from "../store.js";
import { esc, nstr, opts } from "../utils.js";
import { socColor } from "./recap.js";

const cmp = (a, b) => String(a || "").localeCompare(String(b || ""), "fr", { sensitivity: "base", numeric: true });
const COLS = 6;

/** Prestation du catalogue par son nom (sans tenir compte des majuscules ni des espaces en trop). */
export function findInCatalogue(name) {
  const k = String(name || "").trim().toLowerCase();
  return k ? S.cfg.catalogue.find(c => String(c.prestation || "").trim().toLowerCase() === k) : null;
}

/* ---------- Repli des sociétés / catégories (préférence propre à chaque navigateur) ---------- */
const KEY = "mp.cat.collapsed";
function loadCollapsed() { try { return new Set(JSON.parse(localStorage.getItem(KEY)) || []); } catch (e) { return new Set(); } }
let collapsed = loadCollapsed();
function saveCollapsed() { try { localStorage.setItem(KEY, JSON.stringify([...collapsed])); } catch (e) {} }
const gKey = (soc, cat) => `${soc}|${cat ?? ""}`;   // catégorie : "soc|cat" ; société entière : "soc|*"
export const socKey = soc => `${soc}|*`;
export function isCollapsed(k) { return collapsed.has(k); }
export function setCollapsed(k, on) { on ? collapsed.add(k) : collapsed.delete(k); saveCollapsed(); }
export function setAllCollapsed(on) {
  collapsed = new Set();
  if (on) for (const c of S.cfg.catalogue) if (c.societe) collapsed.add(gKey(c.societe, c.categorie || ""));
  saveCollapsed();
}
export const catKey = gKey;

/** Catalogue trié par ordre alphabétique : société, catégorie, prestation. Lignes vides en bas. */
export function sortedCatalogue(cat = S.cfg.catalogue) {
  const empty = c => !c.societe && !c.prestation;
  return cat.slice().sort((a, b) =>
    (empty(a) - empty(b)) || (!a.societe - !b.societe) || cmp(a.societe, b.societe)
    || (!a.categorie - !b.categorie) || cmp(a.categorie, b.categorie) || cmp(a.prestation, b.prestation));
}

function row(c) {
  // Société / catégorie : choisies au glisser-déposer ; menus affichés seulement tant qu'elles manquent
  const pick = (!c.societe ? `<select class="cell pick" id="k-${c.id}-s" data-f="societe" aria-label="Société">${opts(S.cfg.societes, "", true).replace('<option value=""></option>', '<option value="">Société…</option>')}</select>` : "")
    + (!c.categorie ? `<select class="cell pick" id="k-${c.id}-c" data-f="categorie" aria-label="Catégorie">${opts(S.cfg.categories, "", true).replace('<option value=""></option>', '<option value="">Catégorie…</option>')}</select>` : "");
  return `<tr data-row="catalogue" data-id="${c.id}">
      <td><div class="presta"><span class="drag" title="Glisser vers une autre catégorie ou société" aria-label="Déplacer">⠿</span>
        <input class="cell" id="k-${c.id}-p" data-f="prestation" value="${esc(c.prestation)}" placeholder="Nom de la prestation"></div>${pick ? `<div class="picks">${pick}</div>` : ""}</td>
      <td><textarea class="cell" id="k-${c.id}-d" data-f="description" rows="1">${esc(c.description)}</textarea></td>
      <td style="width:96px"><select class="cell" id="k-${c.id}-u" data-f="unite">${opts(S.cfg.unites, c.unite)}</select></td>
      <td style="width:100px"><input class="cell n" id="k-${c.id}-pu" data-f="pu" data-num="1" inputmode="decimal" value="${nstr(c.pu)}"></td>
      <td style="text-align:center;padding-top:9px"><input type="checkbox" id="k-${c.id}-pr" data-f="presence" ${c.presence ? "checked" : ""} aria-label="Présence sur le planning"></td>
      <td><button class="icon-btn" data-del="catalogue" aria-label="Supprimer la prestation">×</button></td></tr>`;
}

export function renderCatalogue() {
  const cat = S.cfg.catalogue;
  let h = `<section class="sec"><div class="sec-h"><h2>Catalogue des prestations <small>${cat.length} prestations</small></h2>
    <div class="actions"><button class="btn ghost" data-foldall="1">Tout replier</button><button class="btn ghost" data-foldall="0">Tout déplier</button></div></div>
  <p class="note">Classé par ordre alphabétique : société, catégorie, prestation. Cliquez sur le titre d'une société ou d'une catégorie pour la replier ou la déplier. Glissez ⠿ une prestation dans un autre groupe pour changer sa catégorie ou sa société. Tarifs par défaut : les modifier ne change pas les devis déjà faits. « Planning » : la prestation mobilise une personne sur les phases d'équipe.</p>
  <div class="tbl-wrap"><table data-tbl="catalogue"><thead><tr>
    <th style="min-width:300px">Prestation</th><th style="min-width:380px">Description</th>
    <th>Unité</th><th class="num">PU HT</th><th>Planning</th><th></th></tr></thead>`;

  // Regroupement Société → Catégorie, dans l'ordre de tri
  const socs = [];
  for (const c of sortedCatalogue(cat)) {
    const soc = c.societe || "", cg = c.categorie || "";
    let s = socs.find(x => x.soc === soc);
    if (!s) socs.push(s = { soc, cats: [] });
    let g = s.cats.find(x => x.cat === cg);
    if (!g) s.cats.push(g = { cat: cg, items: [] });
    g.items.push(c);
  }

  for (const s of socs) {
    const titre = s.soc || "Nouvelles lignes (choisir société et catégorie)";
    const n = s.cats.reduce((a, g) => a + g.items.length, 0);
    const absentes = S.cfg.categories.filter(x => !s.cats.some(g => g.cat === x));
    const socClosed = s.soc && isCollapsed(socKey(s.soc));
    h += `<tbody class="soc-head" data-soc="${esc(s.soc)}"><tr class="grp"><td colspan="${COLS}"><div class="grp-in">
        ${s.soc ? `<button class="fold" data-fold="${esc(socKey(s.soc))}" aria-expanded="${!socClosed}" aria-label="Replier ou déplier ${esc(s.soc)}"><span class="chev">${socClosed ? "▸" : "▾"}</span>` : ""}
        <i class="dot" style="background:${socColor(s.soc)}"></i><b>${esc(titre)}</b><span class="grp-n">${n}</span>${s.soc ? "</button>" : ""}
        ${s.soc && absentes.length ? `<select class="cell add-cat" data-soc="${esc(s.soc)}" aria-label="Ajouter une catégorie à ${esc(s.soc)}"><option value="">+ Catégorie…</option>${absentes.map(x => `<option>${esc(x)}</option>`).join("")}</select>` : ""}
      </div></td></tr></tbody>`;
    for (const g of s.cats) {
      const k = catKey(s.soc, g.cat), closed = isCollapsed(k);
      const sub = s.soc ? `<tr class="subgrp"><td colspan="${COLS}"><div class="grp-in">
          <button class="fold" data-fold="${esc(k)}" aria-expanded="${!closed}" aria-label="Replier ou déplier ${esc(g.cat || "Sans catégorie")}"><span class="chev">${closed ? "▸" : "▾"}</span>
          <b>${esc(g.cat || "Sans catégorie")}</b><span class="grp-n">${g.items.length}</span></button>
          ${g.cat ? `<button class="btn ghost add-in" data-addin="${esc(s.soc)}|${esc(g.cat)}" title="Ajouter une prestation dans ${esc(g.cat)}">+ Prestation</button>` : ""}
        </div></td></tr>` : "";
      h += `<tbody class="cat-group${closed ? " collapsed" : ""}${socClosed ? " soc-collapsed" : ""}" data-soc="${esc(s.soc)}" data-cat="${esc(g.cat)}" data-fold-key="${esc(k)}">${sub}${g.items.map(row).join("")}</tbody>`;
    }
  }
  if (!cat.length) h += `<tbody><tr><td colspan="${COLS}" class="lbl note">Le catalogue est vide. Ajoutez vos prestations types avec leur tarif.</td></tr></tbody>`;
  return h + `</table></div><div class="add-row"><button class="btn" data-add="catalogue">+ Ajouter une prestation</button></div></section>`;
}
