/**
 * Renommer une valeur de l'onglet Listes partout où elle est utilisée :
 * catalogues (prestations, coûts), lignes de devis et de coûts de tous les projets, planning.
 * Renvoie les identifiants des projets modifiés (à enregistrer).
 */
import { S } from "./store.js";

const FIELDS = {
  societes:   { catalogue: ["societe"], coutsCatalogue: ["societe", "factureePar"], lignes: ["societe"], couts: ["societe", "factureePar"] },
  categories: { catalogue: ["categorie"], lignes: ["categorie"] },
  natures:    { coutsCatalogue: ["nature"], couts: ["nature"] },
  unites:     { catalogue: ["unite"], coutsCatalogue: ["unite"], lignes: ["unite"], couts: ["unite"] },
  phases:     { planning: ["phase"] }
};

export function renameEverywhere(listKey, before, after) {
  const map = FIELDS[listKey];
  if (!map || !before || before === after) return [];
  const swap = (rows, fields) => {
    let n = 0;
    for (const r of rows || []) for (const f of fields) if (r[f] === before) { r[f] = after; n++; }
    return n;
  };
  if (map.catalogue) swap(S.cfg.catalogue, map.catalogue);
  if (map.coutsCatalogue) swap(S.cfg.coutsCatalogue, map.coutsCatalogue);
  const changed = [];
  for (const [id, p] of Object.entries(S.projets)) {
    let n = 0;
    for (const key of ["lignes", "couts", "planning"]) if (map[key]) n += swap(p[key], map[key]);
    if (n) changed.push(id);
  }
  return changed;
}
