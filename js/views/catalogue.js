/** Onglet Catalogue : prestations types et tarifs, communs à tous les projets (le Devis les suit en direct). */
import { esc, nstr, opts } from "../utils.js";
import { S } from "../store.js";
import { makeCatalog } from "./catalog.js";

export const prestations = makeCatalog({
  kind: "catalogue", listKey: "catalogue", idPrefix: "k", storageKey: "mp.cat.collapsed",
  nameField: "prestation", catField: "categorie", catLabel: "Catégorie", catList: () => S.cfg.categories,
  title: "Catalogue des prestations", countLabel: "prestations", itemLabel: "Prestation",
  namePlaceholder: "Nom de la prestation", addLabel: "Prestation", addLabelLong: "une prestation",
  emptyText: "Le catalogue est vide. Ajoutez vos prestations types avec leur tarif.",
  note: "Classé par ordre alphabétique : société, catégorie, prestation. Cliquez sur la ligne d'une société ou d'une catégorie pour la replier ou la déplier. Glissez ⠿ une prestation dans un autre groupe pour changer sa catégorie ou sa société. Les devis suivent ce catalogue : un prix modifié ici est mis à jour dans les devis. « Planning » : la prestation mobilise une personne sur les phases d'équipe.",
  blank: () => ({ prestation: "", categorie: "", description: "", societe: "", unite: "Jour", pu: null, presence: false }),
  columns: [
    { th: `<th>Unité</th>`, td: (c, P) => `<td style="width:96px"><select class="cell" id="${P}-${c.id}-u" data-f="unite">${opts(S.cfg.unites, c.unite)}</select></td>` },
    { th: `<th class="num">PU HT</th>`, td: (c, P) => `<td style="width:100px"><input class="cell n" id="${P}-${c.id}-pu" data-f="pu" data-num="1" inputmode="decimal" value="${nstr(c.pu)}"></td>` },
    { th: `<th>Planning</th>`, td: (c, P) => `<td style="text-align:center;padding-top:9px"><input type="checkbox" id="${P}-${c.id}-pr" data-f="presence" ${c.presence ? "checked" : ""} aria-label="Présence sur le planning"></td>` }
  ]
});

export const findInCatalogue = prestations.find;
export const sortedCatalogue = prestations.sorted;
export const renderCatalogue = prestations.render;
