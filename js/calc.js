/** Tous les calculs : totaux de lignes, CA par société, coûts, résultat, contrôles. Aucun affichage ici. */
import { num, nstr } from "./utils.js";

/** Total HT d'une ligne de devis = quantité × PU × (1 − remise). */
export function lineTotal(l) {
  const q = num(l.quantite), p = num(l.pu);
  if (q === null || p === null) return null;
  return q * p * (1 - (num(l.remise) || 0));
}

/** Montant avant remise (affiché sous le total quand une remise existe). */
export function lineGross(l) {
  const q = num(l.quantite), p = num(l.pu);
  return q === null || p === null ? null : q * p;
}

export function costTotal(c) {
  const q = num(c.quantite), p = num(c.coutUnitaire);
  return q === null || p === null ? null : q * p;
}

/** Calcule tout ce qu'affichent le Devis, les récaps et le Résultat pour un projet. */
export function calc(p, cfg) {
  const r = { ht: 0, bySoc: {}, byCat: {}, joursEquipe: 0, joursTous: 0 };

  for (const l of p.lignes || []) {
    const t = lineTotal(l);
    if (t === null) continue;
    r.ht += t;
    const s = l.societe || "Sans société";
    r.bySoc[s] = (r.bySoc[s] || 0) + t;
    const c = l.categorie || "Sans catégorie";
    r.byCat[c] = (r.byCat[c] || 0) + t;
  }
  const tva = num(p.tva) ?? 0.2;
  r.tva = r.ht * tva;
  r.ttc = r.ht + r.tva;

  for (const ph of p.planning || []) {
    const j = num(ph.jours) || 0;
    r.joursTous += j;
    if (ph.equipe) r.joursEquipe += j;
  }

  // Résultat par société : CA client + CA interne (refacturations reçues) − coûts supportés
  const socs = cfg.societes.slice();
  for (const s of Object.keys(r.bySoc)) if (s !== "Sans société" && !socs.includes(s)) socs.push(s);
  r.soc = socs.map(s => {
    const caClient = r.bySoc[s] || 0;
    let caInterne = 0, couts = 0;
    for (const c of p.couts || []) {
      const t = costTotal(c);
      if (t === null) continue;
      if (c.societe === s) couts += t;
      if (c.interne && c.factureePar === s) caInterne += t;
    }
    const ca = caClient + caInterne, res = ca - couts;
    return { s, caClient, caInterne, ca, couts, res, marge: ca ? res / ca : null };
  });

  // Consolidé groupe : les coûts internes s'annulent avec le CA interne
  r.coutsTotal = 0; r.coutsExt = 0; r.nonChiffres = 0;
  for (const c of p.couts || []) {
    const t = costTotal(c);
    if (num(c.quantite) !== null && num(c.coutUnitaire) === null) r.nonChiffres++;
    if (t === null) continue;
    r.coutsTotal += t;
    if (!c.interne) r.coutsExt += t;
  }
  r.resGroupe = r.ht - r.coutsExt;
  r.sumRes = r.soc.reduce((a, x) => a + x.res, 0) + (r.bySoc["Sans société"] || 0);
  r.coherent = Math.abs(r.resGroupe - r.sumRes) < 0.01;
  r.sansSociete = (p.lignes || []).filter(l => lineTotal(l) && !l.societe).length;
  return r;
}

/** Alerte quand une ligne « au jour » mobilisant une personne dépasse les jours d'équipe du planning. */
export function dayAlert(l, r) {
  if (!l.presence || (l.unite || "") !== "Jour") return "";
  const q = num(l.quantite);
  if (q === null || r.joursEquipe === 0 || q <= r.joursEquipe) return "";
  return `${nstr(q)} j facturés pour ${nstr(r.joursEquipe)} j d'équipe au planning`;
}

/**
 * Aligne les lignes d'un projet sur le catalogue : société, catégorie, prix HT, description,
 * présence planning — et le nom si la prestation a été renommée dans le catalogue.
 * Lien par identifiant (catId) une fois établi, sinon par nom (sans tenir compte des majuscules).
 * Renvoie true si quelque chose a changé (le projet doit alors être enregistré).
 */
export function syncFromCatalogue(p, catalogue) {
  if (!p || !Array.isArray(p.lignes)) return false;
  const byId = new Map(catalogue.map(c => [c.id, c]));
  const byName = new Map(catalogue.filter(c => c.prestation).map(c => [String(c.prestation).trim().toLowerCase(), c]));
  let changed = false;
  for (const l of p.lignes) {
    const item = (l.catId && byId.get(l.catId)) || byName.get(String(l.prestation || "").trim().toLowerCase());
    if (!item) continue;
    const next = { catId: item.id, prestation: item.prestation, societe: item.societe || "", categorie: item.categorie || "",
                   pu: item.pu ?? null, description: item.description || "", presence: !!item.presence };
    for (const [k, v] of Object.entries(next)) if (l[k] !== v) { l[k] = v; changed = true; }
  }
  return changed;
}
