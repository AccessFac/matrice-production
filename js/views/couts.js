/**
 * Onglet Coûts (interne) : coûts réels du projet, choisis dans le Catalogue coûts.
 * Même fonctionnement que le Devis : lignes regroupées par nature, ordre libre (glisser ⠿),
 * société en carré de couleur, coût unitaire / société / nature / interne repris du catalogue en direct.
 */
import { S, P } from "../store.js";
import { calc, costTotal, groupBy } from "../calc.js";
import { esc, eur, num, nstr, opts } from "../utils.js";
import { socColor, socLegend } from "./recap.js";
import { coutsBase } from "./coutsBase.js";

export const groupCosts = lines => groupBy(lines, "nature");
export const costGroupKey = nat => "cg-" + encodeURIComponent(nat || "_");
export const costGroupTotal = g => g.lines.reduce((a, l) => a + (costTotal(l) || 0), 0);

function ligne(c) {
  const absent = c.libelle && !coutsBase.find(c.libelle);
  const missing = num(c.quantite) !== null && num(c.coutUnitaire) === null;
  return `<tr data-row="couts" data-id="${c.id}">
      <td class="soc-cell" title="${esc(c.societe || "Société non définie")}">${c.societe ? `<i class="dot" style="background:${socColor(c.societe)}" aria-label="${esc(c.societe)}"></i>` : `<i class="dot dot-empty"></i>`}</td>
      <td class="presta-cell"><div class="presta"><span class="drag" title="Glisser pour déplacer la ligne" aria-label="Déplacer">⠿</span>
        <input class="cell" id="c-${c.id}-l" data-f="libelle" list="dl-couts" value="${esc(c.libelle)}" placeholder="Coût…"></div>
        ${c.interne ? `<span class="tag-int">Interne · facturé par ${esc(c.factureePar || "?")}</span>` : ""}
        ${absent ? `<span class="alert">⚠ Coût absent du Catalogue coûts : ajoutez-le pour fixer société, nature et montant.</span>` : ""}
        ${missing && !absent ? `<span class="alert">⚠ Montant à saisir dans le Catalogue coûts.</span>` : ""}</td>
      <td style="width:96px"><select class="cell" id="c-${c.id}-u" data-f="unite">${opts(S.cfg.unites, c.unite)}</select></td>
      <td style="width:70px"><input class="cell n" id="c-${c.id}-q" data-f="quantite" data-num="1" inputmode="decimal" value="${nstr(c.quantite)}"></td>
      <td class="calc locked" style="width:110px" title="Défini par le Catalogue coûts">${c.coutUnitaire === null || c.coutUnitaire === undefined || c.coutUnitaire === "" ? "—" : eur(num(c.coutUnitaire))}</td>
      <td class="calc" data-calc="ct-${c.id}">${eur(costTotal(c))}</td>
      <td><textarea class="cell" id="c-${c.id}-nt" data-f="notes" rows="1">${esc(c.notes || c.commentaire)}</textarea></td>
      <td><button class="icon-btn" data-del="couts" aria-label="Supprimer le coût">×</button></td></tr>`;
}

export function renderCouts() {
  const p = P(), r = calc(p, S.cfg);
  const names = coutsBase.sorted().map(c => c.libelle).filter(Boolean);
  const COLS = 8;
  let h = `<datalist id="dl-couts">${names.map(n => `<option value="${esc(n)}"></option>`).join("")}</datalist>
  <section class="sec"><div class="sec-h"><h2>Coûts du projet <small>${esc(p.nom)}</small></h2><span class="chip bad">Interne · ne pas transmettre au client</span></div>
  <p class="note">Choisissez chaque coût dans le Catalogue coûts : société, nature, montant et refacturation interne en viennent et se mettent à jour quand il change. Glissez ⠿ pour changer l'ordre.</p>
  ${socLegend((p.couts || []).map(c => c.societe))}
  <div class="tbl-wrap"><table data-tbl="couts"><thead><tr>
    <th class="soc-th" title="Société qui paie"></th><th style="min-width:270px">Coût</th>
    <th>Unité</th><th class="num">Qté</th><th class="num">Coût unit. HT</th><th class="num">Total HT</th><th style="min-width:200px">Notes</th><th></th></tr></thead>`;
  const groups = groupCosts(p.couts);
  for (const g of groups) {
    h += `<tbody class="cat-group" data-cat="${esc(g.cat)}">
      <tr class="grp"><td colspan="5"><div class="grp-in"><span class="drag grp-drag" title="Glisser pour déplacer la nature" aria-label="Déplacer">⠿</span>
        <b>${esc(g.cat || "Sans nature")}</b><span class="grp-n">${g.lines.length}</span></div></td>
        <td class="calc grp-total" data-calc="${costGroupKey(g.cat)}">${eur(costGroupTotal(g))}</td><td colspan="2"></td></tr>
      ${g.lines.map(ligne).join("")}
    </tbody>`;
  }
  if (!groups.length) h += `<tbody><tr><td colspan="${COLS}" class="lbl note">Aucun coût pour ce projet. Ajoutez une ligne et choisissez un coût du catalogue.</td></tr></tbody>`;
  return h + `<tfoot><tr><td colspan="5" style="text-align:right">Total coûts HT</td><td class="calc" data-calc="ctot">${eur(r.coutsTotal)}</td><td colspan="2"></td></tr></tfoot></table></div>
  <div class="add-row"><button class="btn" data-add="couts">+ Ajouter un coût</button></div></section>`;
}
