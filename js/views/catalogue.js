/** Onglet Catalogue : prestations types et tarifs par défaut, communs à tous les projets. */
import { S } from "../store.js";
import { esc, nstr, opts } from "../utils.js";
import { socColor } from "./recap.js";

const cmp = (a, b) => String(a || "").localeCompare(String(b || ""), "fr", { sensitivity: "base", numeric: true });

/** Prestation du catalogue par son nom (sans tenir compte des majuscules ni des espaces en trop). */
export function findInCatalogue(name) {
  const k = String(name || "").trim().toLowerCase();
  return k ? S.cfg.catalogue.find(c => String(c.prestation || "").trim().toLowerCase() === k) : null;
}

/** Catalogue trié par société, puis catégorie, puis prestation ; les lignes encore vides restent en bas. */
export function sortedCatalogue(cat = S.cfg.catalogue) {
  const empty = c => !c.societe && !c.prestation;
  return cat.slice().sort((a, b) =>
    (empty(a) - empty(b)) || (!a.societe - !b.societe) || cmp(a.societe, b.societe)
    || (!a.categorie - !b.categorie) || cmp(a.categorie, b.categorie) || cmp(a.prestation, b.prestation));
}

export function renderCatalogue() {
  const cat = S.cfg.catalogue;
  let h = `<section class="sec"><div class="sec-h"><h2>Catalogue des prestations <small>${cat.length} prestations</small></h2></div>
  <p class="note">Classé par société, puis catégorie, puis prestation. Changer la catégorie ou la société d'une ligne la range automatiquement au bon endroit. Tarifs par défaut, communs à tous les projets. Modifier un tarif ici ne change pas les devis déjà faits. « Planning » : la prestation mobilise une personne sur les phases d'équipe (alerte si la quantité dépasse les jours d'équipe).</p>
  <div class="tbl-wrap"><table data-tbl="catalogue"><thead><tr>
    <th style="min-width:250px">Prestation</th><th style="min-width:160px">Catégorie</th><th style="min-width:340px">Description</th>
    <th style="min-width:150px">Société par défaut</th><th>Unité</th><th class="num">PU HT</th><th>Planning</th><th></th></tr></thead><tbody>`;
  const socOf = x => x.societe || (x.prestation ? "Sans société" : "Nouvelles lignes");
  const catOf = x => x.categorie || "Sans catégorie";
  let group = null, sub = null;
  for (const c of sortedCatalogue(cat)) {
    const g = socOf(c);
    if (g !== group) {
      group = g; sub = null;
      const n = cat.filter(x => socOf(x) === g).length;
      h += `<tr class="grp"><td colspan="8"><i class="dot" style="background:${socColor(c.societe)}"></i>${esc(g)} <span>${n}</span></td></tr>`;
    }
    const k = catOf(c);
    if (k !== sub && g !== "Nouvelles lignes") {
      sub = k;
      const n = cat.filter(x => socOf(x) === g && catOf(x) === k).length;
      h += `<tr class="subgrp"><td colspan="8"><b>${esc(k)}</b> <span>${n}</span></td></tr>`;
    }
    h += `<tr data-row="catalogue" data-id="${c.id}">
      <td><input class="cell" id="k-${c.id}-p" data-f="prestation" value="${esc(c.prestation)}"></td>
      <td><select class="cell" id="k-${c.id}-c" data-f="categorie">${opts(S.cfg.categories, c.categorie)}</select></td>
      <td><textarea class="cell" id="k-${c.id}-d" data-f="description" rows="1">${esc(c.description)}</textarea></td>
      <td><select class="cell" id="k-${c.id}-s" data-f="societe">${opts(S.cfg.societes, c.societe)}</select></td>
      <td style="width:96px"><select class="cell" id="k-${c.id}-u" data-f="unite">${opts(S.cfg.unites, c.unite)}</select></td>
      <td style="width:100px"><input class="cell n" id="k-${c.id}-pu" data-f="pu" data-num="1" inputmode="decimal" value="${nstr(c.pu)}"></td>
      <td style="text-align:center;padding-top:9px"><input type="checkbox" id="k-${c.id}-pr" data-f="presence" ${c.presence ? "checked" : ""} aria-label="Présence sur le planning"></td>
      <td><button class="icon-btn" data-del="catalogue" aria-label="Supprimer la prestation">×</button></td></tr>`;
  }
  if (!cat.length) h += `<tr><td colspan="8" class="lbl note">Le catalogue est vide. Ajoutez vos prestations types avec leur tarif.</td></tr>`;
  return h + `</tbody></table></div><div class="add-row"><button class="btn" data-add="catalogue">+ Ajouter une prestation</button></div></section>`;
}
