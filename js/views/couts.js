/** Onglet Coûts (interne) : coûts réels du projet par société. */
import { S, P } from "../store.js";
import { calc, costTotal } from "../calc.js";
import { esc, eur, num, nstr, opts } from "../utils.js";

export function renderCouts() {
  const p = P(), r = calc(p, S.cfg);
  const lignesNames = (p.lignes || []).map(l => l.prestation).filter(Boolean);
  let h = `<section class="sec"><div class="sec-h"><h2>Coûts du projet <small>${esc(p.nom)}</small></h2><span class="chip bad">Interne · ne pas transmettre au client</span></div>
  <p class="note">Saisissez les montants réels, salaires déjà chargés. Cochez « Interne » quand le coût est facturé par une autre société du groupe, et indiquez laquelle : ce montant devient du CA pour elle et s'annule au niveau du groupe.</p>
  <div class="tbl-wrap"><table data-tbl="couts"><thead><tr>
    <th style="min-width:150px">Société qui paie</th><th style="min-width:150px">Nature</th><th style="min-width:190px">Libellé</th>
    <th style="min-width:190px">Ligne de devis liée</th><th class="num">Qté</th><th class="num">Coût unit. HT</th><th class="num">Total HT</th>
    <th>Interne</th><th style="min-width:150px">Facturé par</th><th style="min-width:160px">Commentaire</th><th></th></tr></thead><tbody>`;
  for (const c of p.couts || []) {
    const need = num(c.quantite) !== null && num(c.coutUnitaire) === null;
    h += `<tr data-row="couts" data-id="${c.id}">
      <td><select class="cell" id="c-${c.id}-s" data-f="societe">${opts(S.cfg.societes, c.societe)}</select></td>
      <td><select class="cell" id="c-${c.id}-n" data-f="nature">${opts(S.cfg.natures, c.nature)}</select></td>
      <td><input class="cell" id="c-${c.id}-l" data-f="libelle" value="${esc(c.libelle)}"></td>
      <td><select class="cell" id="c-${c.id}-ll" data-f="ligneLiee">${opts(lignesNames, c.ligneLiee)}</select></td>
      <td style="width:70px"><input class="cell n" id="c-${c.id}-q" data-f="quantite" data-num="1" inputmode="decimal" value="${nstr(c.quantite)}"></td>
      <td style="width:110px"><input class="cell n ${need ? "need" : ""}" id="c-${c.id}-cu" data-f="coutUnitaire" data-num="1" inputmode="decimal" value="${nstr(c.coutUnitaire)}" placeholder="à saisir"></td>
      <td class="calc" data-calc="ct-${c.id}">${eur(costTotal(c))}</td>
      <td style="text-align:center;padding-top:9px"><input type="checkbox" id="c-${c.id}-i" data-f="interne" ${c.interne ? "checked" : ""} aria-label="Coût interne au groupe"></td>
      <td><select class="cell" id="c-${c.id}-fp" data-f="factureePar" ${c.interne ? "" : "disabled"}>${opts(S.cfg.societes, c.factureePar)}</select></td>
      <td><input class="cell" id="c-${c.id}-cm" data-f="commentaire" value="${esc(c.commentaire)}"></td>
      <td><button class="icon-btn" data-del="couts" aria-label="Supprimer le coût">×</button></td></tr>`;
  }
  if (!(p.couts || []).length) h += `<tr><td colspan="11" class="lbl note">Aucun coût saisi. Ajoutez les salaires, factures prestataires, locations…</td></tr>`;
  return h + `</tbody><tfoot><tr><td colspan="6" style="text-align:right">Total coûts HT</td><td class="calc" data-calc="ctot">${eur(r.coutsTotal)}</td><td colspan="4"></td></tr></tfoot></table></div>
  <div class="add-row"><button class="btn" data-add="couts">+ Ajouter un coût</button></div></section>`;
}
