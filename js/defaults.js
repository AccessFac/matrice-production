/** Valeurs par défaut (structure seulement : les données réelles viennent de la base). */

export const DEFAULT_CFG = {
  societes: ["Playback Solutions", "AccessFlow", "AccessFactory"],
  unites: ["Jour", "Semaine", "Mois", "Heure", "Forfait", "Unité"],
  categories: [],
  natures: ["Salaire chargé", "Facture prestataire", "Location", "Transport", "Défraiements / repas", "Refacturation interne", "Achat / consommable", "Autre"],
  phases: [],
  catalogue: []
};

/** Onglets de l'application. internal: true → marqué « interne ». */
export const TABS = [
  { id: "devis", label: "Devis" },
  { id: "couts", label: "Coûts", internal: true },
  { id: "resultat", label: "Résultat", internal: true },
  { id: "catalogue", label: "Catalogue" },
  { id: "listes", label: "Listes" }
];

/** Couleur de chaque société, dans l'ordre de la liste « Sociétés ». */
export const SOC_COLORS = ["var(--soc1)", "var(--soc2)", "var(--soc3)", "var(--soc4)", "var(--soc5)"];

/** Modèles de lignes vides ajoutées par les boutons « + Ajouter ». */
export const BLANK = {
  lignes: () => ({ prestation: "", categorie: "", description: "", societe: "", unite: "", quantite: null, pu: null, remise: null, notes: "", presence: false }),
  couts: () => ({ societe: "", nature: "Salaire chargé", libelle: "", ligneLiee: "", quantite: null, coutUnitaire: null, interne: false, factureePar: "", commentaire: "" }),
  planning: () => ({ phase: "", equipe: false, jours: null, remarques: "" }),
  catalogue: () => ({ prestation: "", categorie: "", description: "", societe: "", unite: "Jour", pu: null, presence: false })
};
