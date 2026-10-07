/**
 * Onglet Catalogue : prestations types et tarifs par défaut, communs à tous les projets.
 * Affichage : Société → Catégorie → Prestations.
 * - l'ordre des catégories se règle par glisser-déposer, société par société (cfg.catOrder) ;
 * - glisser une prestation dans un autre groupe change sa catégorie et sa société ;
 * - les prestations restent classées par ordre alphabétique dans leur catégorie.
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

/** Position d'une catégorie dans l'ordre choisi pour une société (les autres viennent après, par ordre alphabétique). */
function catRank(soc, cat) {
  const order = (S.cfg.catOrder && S.cfg.catOrder[soc]) || [];
  const i = order.indexOf(cat);
  return i < 0 ? 1e6 : i;
}

/** Catalogue trié : société (alphabétique), catégorie (ordre choisi), prestation (alphabétique). Lignes vides en bas. */
export function sortedCatalogue(cat = S.cfg.catalogue) {
  const empty = c => !c.societe && !c.prestation;
  return cat.slice().sort((a, b) =>
    (empty(a) - empty(b)) || (!a.societe - !b.societe) || cmp(a.societe, b.societe)
    || (!a.categorie - !b.categorie) || (catRank(a.societe, a.categorie) - catRank(b.societe, b.categorie))
    || cmp(a.categorie, b.categorie) || cmp(a.prestation, b.prestation));
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
  let h = `<section class="sec"><div class="sec-h"><h2>Catalogue des prestations <small>${cat.length} prestations</small></h2></div>
  <p class="note">Classé par société, puis catégorie, puis prestation. Glissez ⠿ un titre de catégorie pour changer l'ordre des catégories ; glissez ⠿ une prestation dans un autre groupe pour changer sa catégorie ou sa société. Tarifs par défaut : les modifier ne change pas les devis déjà faits. « Planning » : la prestation mobilise une personne sur les phases d'équipe.</p>
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
    h += `<tbody class="soc-head" data-soc="${esc(s.soc)}"><tr class="grp"><td colspan="${COLS}"><div class="grp-in">
        <i class="dot" style="background:${socColor(s.soc)}"></i><b>${esc(titre)}</b><span class="grp-n">${n}</span>
        ${s.soc && absentes.length ? `<select class="cell add-cat" data-soc="${esc(s.soc)}" aria-label="Ajouter une catégorie à ${esc(s.soc)}"><option value="">+ Catégorie…</option>${absentes.map(x => `<option>${esc(x)}</option>`).join("")}</select>` : ""}
      </div></td></tr></tbody>`;
    for (const g of s.cats) {
      const sub = s.soc ? `<tr class="subgrp"><td colspan="${COLS}"><div class="grp-in">
          ${g.cat ? `<span class="drag cat-drag" title="Glisser pour ranger la catégorie" aria-label="Déplacer la catégorie">⠿</span>` : ""}
          <b>${esc(g.cat || "Sans catégorie")}</b><span class="grp-n">${g.items.length}</span>
          ${g.cat ? `<button class="btn ghost add-in" data-addin="${esc(s.soc)}|${esc(g.cat)}" title="Ajouter une prestation dans ${esc(g.cat)}">+ Prestation</button>` : ""}
        </div></td></tr>` : "";
      h += `<tbody class="cat-group" data-soc="${esc(s.soc)}" data-cat="${esc(g.cat)}">${sub}${g.items.map(row).join("")}</tbody>`;
    }
  }
  if (!cat.length) h += `<tbody><tr><td colspan="${COLS}" class="lbl note">Le catalogue est vide. Ajoutez vos prestations types avec leur tarif.</td></tr></tbody>`;
  return h + `</table></div><div class="add-row"><button class="btn" data-add="catalogue">+ Ajouter une prestation</button></div></section>`;
}
