/**
 * Onglet Catalogue coûts (interne) : tous les coûts types (salaires chargés, prestataires, locations…).
 * Les lignes de l'onglet Coûts d'un projet viennent d'ici et suivent ce catalogue en direct.
 */
import { nstr, opts } from "../utils.js";
import { S } from "../store.js";
import { makeCatalog } from "./catalog.js";

export const coutsBase = makeCatalog({
  kind: "coutsbase", listKey: "coutsCatalogue", idPrefix: "b", storageKey: "mp.cost.collapsed",
  nameField: "libelle", catField: "nature", catLabel: "Nature", catList: () => S.cfg.natures,
  title: "Catalogue des coûts", countLabel: "coûts", itemLabel: "Coût",
  namePlaceholder: "Libellé du coût (ex. Musicien guitare – salaire chargé)", addLabel: "Coût", addLabelLong: "un coût",
  emptyText: "Aucun coût répertorié. Ajoutez vos coûts types : salaires chargés, prestataires, locations…",
  note: "Interne. Classé par ordre alphabétique : société qui paie, nature de coût, libellé. Le bouton ✎ d'un coût permet de changer sa société ou sa nature. Saisissez les montants réels (salaires déjà chargés). « Interne » : le coût est facturé par une autre société du groupe — indiquez laquelle ; il devient du CA pour elle et s'annule au niveau du groupe. Les projets suivent ce catalogue : un coût modifié ici est mis à jour dans l'onglet Coûts.",
  blank: () => ({ libelle: "", nature: "", description: "", societe: "", unite: "Jour", cout: null, interne: false, factureePar: "" }),
  columns: [
    { th: `<th>Unité</th>`, td: (c, P) => `<td style="width:96px"><select class="cell" id="${P}-${c.id}-u" data-f="unite">${opts(S.cfg.unites, c.unite)}</select></td>` },
    { th: `<th class="num">Coût unit. HT</th>`, td: (c, P) => `<td style="width:110px"><span class="pct-in"><input class="cell n" id="${P}-${c.id}-co" data-f="cout" data-num="1" inputmode="decimal" value="${nstr(c.cout)}" placeholder="à saisir"><span class="suf" aria-hidden="true">€</span></span></td>` },
    { th: `<th>Interne</th>`, td: (c, P) => `<td style="text-align:center;padding-top:9px"><input type="checkbox" id="${P}-${c.id}-i" data-f="interne" ${c.interne ? "checked" : ""} aria-label="Coût interne au groupe"></td>` },
    { th: `<th style="min-width:150px">Facturé par</th>`, td: (c, P) => `<td><select class="cell" id="${P}-${c.id}-fp" data-f="factureePar" ${c.interne ? "" : "disabled"}>${opts(S.cfg.societes, c.factureePar)}</select></td>` }
  ]
});
