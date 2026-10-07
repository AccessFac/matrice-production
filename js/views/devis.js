/** Onglet Devis : infos projet, planning, lignes de prestations, totaux et récaps. */
import { S, P } from "../store.js";
import { calc, lineTotal, lineGross, dayAlert } from "../calc.js";
import { esc, eur, num, nstr, opts } from "../utils.js";
import { recapSoc, recapCat, socColor } from "./recap.js";
import { sortedCatalogue, findInCatalogue } from "./catalogue.js";

/** Contenu de la cellule « Total HT » d'une ligne (avec le montant avant remise s'il y en a une). */
export function lineTotalCell(l) {
  const g = lineGross(l);
  return eur(lineTotal(l)) + (num(l.remise) && g !== null
    ? `<div class="note" style="font-family:var(--f-body);font-weight:400">avant remise ${eur(g)}</div>` : "");
}

function projectFields(p) {
  const tva = nstr(Math.round((num(p.tva) ?? 0.2) * 1000) / 10);
  return `<section class="sec"><div class="sec-h"><h2>Projet</h2></div>
    <div class="fields">
      <div class="field"><label for="f-client">Client / production</label><input id="f-client" data-p="client" value="${esc(p.client)}"></div>
      <div class="field"><label for="f-nom">Projet</label><input id="f-nom" data-p="nom" value="${esc(p.nom)}"></div>
      <div class="field"><label for="f-date">Date du show</label><input id="f-date" data-p="dateShow" value="${esc(p.dateShow)}" placeholder="jj/mm/aaaa"></div>
      <div class="field"><label for="f-tva">TVA (%)</label><input id="f-tva" data-p="tva" data-pct="1" inputmode="decimal" value="${tva}"></div>
    </div></section>`;
}

function planning(p, r) {
  let h = `<section class="sec"><div class="sec-h"><h2>Planning <small>Jours d'équipe : <b data-calc="jeq">${nstr(r.joursEquipe)}</b> · toutes phases : <span data-calc="jall">${nstr(r.joursTous)}</span></small></h2></div>
    <div class="tbl-wrap"><table data-tbl="planning"><thead><tr><th>Phase</th><th title="Musiciens / techniciens présents">Équipe</th><th class="num">Jours</th><th>Dates / remarques</th><th></th></tr></thead><tbody>`;
  for (const ph of p.planning || []) {
    h += `<tr data-row="planning" data-id="${ph.id}">
      <td style="min-width:200px"><input class="cell" id="pl-${ph.id}-p" data-f="phase" value="${esc(ph.phase)}"></td>
      <td style="text-align:center;padding-top:9px"><input type="checkbox" id="pl-${ph.id}-e" data-f="equipe" ${ph.equipe ? "checked" : ""} aria-label="Équipe sur place"></td>
      <td style="width:76px"><input class="cell n" id="pl-${ph.id}-j" data-f="jours" data-num="1" inputmode="decimal" value="${nstr(ph.jours)}"></td>
      <td style="min-width:160px"><input class="cell" id="pl-${ph.id}-r" data-f="remarques" value="${esc(ph.remarques)}"></td>
      <td><button class="icon-btn" data-del="planning" aria-label="Supprimer la phase">×</button></td></tr>`;
  }
  return h + `</tbody></table></div>
    <div class="add-row"><button class="btn ghost" data-add="planning">+ Ajouter une phase</button></div>
    <p class="note">Cochez « Équipe » pour les phases où musiciens et techniciens sont présents. Une alerte apparaît sur le devis si une ligne au jour dépasse ce total.</p>
  </section>`;
}

function lignes(p, r) {
  const names = sortedCatalogue().map(c => c.prestation).filter(Boolean);
  let h = `<datalist id="dl-presta">${names.map(n => `<option value="${esc(n)}"></option>`).join("")}</datalist>
  <section class="sec"><div class="sec-h"><h2>Prestations</h2><span class="note">Choisissez une prestation du catalogue : catégorie, société et prix HT viennent du catalogue et ne se modifient pas ici.</span></div>
  <div class="tbl-wrap"><table data-tbl="lignes"><thead><tr>
    <th style="min-width:250px">Prestation</th><th style="min-width:150px">Catégorie</th><th style="min-width:150px">Société</th>
    <th>Unité</th><th class="num">Qté</th><th class="num">PU HT</th><th class="num" title="Remise en % sur la ligne">Remise</th>
    <th class="num">Total HT</th><th style="min-width:200px">Notes</th><th></th></tr></thead><tbody>`;
  for (const l of p.lignes || []) {
    const al = dayAlert(l, r);
    const rem = num(l.remise) ? nstr(Math.round(num(l.remise) * 1000) / 10) : "";
    h += `<tr data-row="lignes" data-id="${l.id}">
      <td><input class="cell" id="l-${l.id}-p" data-f="prestation" list="dl-presta" value="${esc(l.prestation)}" placeholder="Prestation…">${al ? `<span class="alert">⚠ ${esc(al)}</span>` : ""}${l.prestation && !findInCatalogue(l.prestation) ? `<span class="alert">⚠ Prestation absente du catalogue : ajoutez-la au catalogue pour fixer catégorie, société et prix.</span>` : ""}</td>
      <td class="lbl locked" title="Défini par le catalogue">${esc(l.categorie) || "—"}</td>
      <td class="lbl locked" title="Défini par le catalogue">${l.societe ? `<i class="dot" style="background:${socColor(l.societe)}"></i>${esc(l.societe)}` : "—"}</td>
      <td style="width:96px"><select class="cell" id="l-${l.id}-u" data-f="unite">${opts(S.cfg.unites, l.unite)}</select></td>
      <td style="width:70px"><input class="cell n" id="l-${l.id}-q" data-f="quantite" data-num="1" inputmode="decimal" value="${nstr(l.quantite)}"></td>
      <td class="calc locked" style="width:100px" title="Défini par le catalogue">${l.pu === null || l.pu === undefined || l.pu === "" ? "—" : eur(num(l.pu))}</td>
      <td style="width:88px"><span class="pct-in"><input class="cell n" id="l-${l.id}-r" data-f="remise" data-pctf="1" inputmode="decimal" value="${rem}" placeholder="—" aria-label="Remise en %"><span class="suf" aria-hidden="true">%</span></span></td>
      <td class="calc" data-calc="lt-${l.id}">${lineTotalCell(l)}</td>
      <td><textarea class="cell" id="l-${l.id}-nt" data-f="notes" rows="1">${esc(l.notes)}</textarea></td>
      <td><button class="icon-btn" data-del="lignes" aria-label="Supprimer la ligne">×</button></td></tr>`;
  }
  if (!(p.lignes || []).length) h += `<tr><td colspan="10" class="lbl note">Aucune ligne. Ajoutez une prestation pour commencer le devis.</td></tr>`;
  return h + `</tbody></table></div>
  <div class="add-row"><button class="btn" data-add="lignes">+ Ajouter une prestation</button></div>
  <div class="totals">
    <div class="k">Total HT</div><div class="v big" data-calc="ht">${eur(r.ht)}</div>
    <div class="k">TVA</div><div class="v" data-calc="tva">${eur(r.tva)}</div>
    <div class="k">Total TTC</div><div class="v" data-calc="ttc">${eur(r.ttc)}</div>
  </div></section>`;
}

export function renderDevis() {
  const p = P(), r = calc(p, S.cfg);
  return `<div class="grid2">${projectFields(p)}${planning(p, r)}</div>
    ${lignes(p, r)}
    <div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))">
      <section class="sec"><h2>CA HT par société</h2><div class="recap" data-calc="recap-soc">${recapSoc(r)}</div></section>
      <section class="sec"><h2>CA HT par catégorie</h2><div class="recap" data-calc="recap-cat">${recapCat(r)}</div></section>
    </div>`;
}
