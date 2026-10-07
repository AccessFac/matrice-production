/** Onglet Résultat (interne) : marge par société et consolidé groupe. */
import { S, P } from "../store.js";
import { calc } from "../calc.js";
import { esc, eur, pct } from "../utils.js";
import { socColor } from "./recap.js";

export function renderResultat() {
  const p = P(), r = calc(p, S.cfg);
  let cards = "";
  for (const x of r.soc) {
    if (!x.ca && !x.couts && !S.cfg.societes.includes(x.s)) continue;
    const cls = x.res > 0 ? "pos" : x.res < 0 ? "neg" : "";
    cards += `<div class="card" style="--c:${socColor(x.s)}"><h3>${esc(x.s)}</h3><div class="kv">
      <span class="k">CA client</span><span class="v">${eur(x.caClient)}</span>
      <span class="k">CA interne groupe</span><span class="v">${eur(x.caInterne)}</span>
      <span class="k">Coûts</span><span class="v">−${eur(x.couts)}</span>
      <span class="sep"></span>
      <span class="k res">Résultat</span><span class="v res ${cls}">${eur(x.res)}</span>
      <span class="k">Marge</span><span class="v">${pct(x.marge)}</span></div></div>`;
  }
  const checks = [
    r.coherent ? `<span class="chip ok">Consolidé = somme des sociétés</span>`
               : `<span class="chip bad">Écart entre consolidé et sociétés : vérifiez les lignes internes (société qui facture manquante)</span>`,
    r.nonChiffres ? `<span class="chip warn">${r.nonChiffres} coût(s) sans montant : les marges sont surestimées</span>`
                  : `<span class="chip ok">Tous les coûts sont chiffrés</span>`,
    r.sansSociete ? `<span class="chip warn">${r.sansSociete} ligne(s) de devis sans société</span>` : ""
  ].join("");
  return `<section class="sec"><div class="sec-h"><h2>Résultat par société <small>${esc(p.nom)}</small></h2><span class="chip bad">Interne</span></div>
    <p class="note">Marge sur le projet, hors frais fixes des sociétés. Le CA interne correspond aux refacturations reçues d'autres sociétés du groupe.</p>
    <div class="cards">${cards}</div></section>
  <section class="sec"><h2>Consolidé groupe <small>flux internes éliminés</small></h2>
    <div class="group">
      <div><div class="k">CA client HT</div><div class="v">${eur(r.ht)}</div></div>
      <div><div class="k">Coûts externes HT</div><div class="v">${eur(r.coutsExt)}</div></div>
      <div><div class="k">Résultat groupe HT</div><div class="v">${eur(r.resGroupe)}</div></div>
      <div><div class="k">Marge groupe</div><div class="v">${pct(r.ht ? r.resGroupe / r.ht : null)}</div></div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px">${checks}</div></section>`;
}
