/** Onglet Listes : valeurs des menus déroulants et modèle de planning. */
import { S } from "../store.js";
import { esc } from "../utils.js";

function box(key, title) {
  const items = S.cfg[key].map((v, i) => `<div class="li">
      <input class="cell" id="ls-${key}-${i}" data-list="${key}" data-i="${i}" value="${esc(v)}">
      <button class="icon-btn" data-ldel="${key}" data-i="${i}" aria-label="Retirer">×</button></div>`).join("");
  return `<div class="list-box"><h3>${title}</h3>${items}
    <div class="add-row"><button class="btn ghost" data-ladd="${key}">+ Ajouter</button></div></div>`;
}

function phases() {
  const items = S.cfg.phases.map((ph, i) => `<div class="li">
      <input type="checkbox" id="ph-${i}-e" data-phase="${i}" data-pf="equipe" ${ph.equipe ? "checked" : ""} aria-label="Équipe">
      <input class="cell" id="ph-${i}-n" data-phase="${i}" data-pf="nom" value="${esc(ph.nom)}">
      <button class="icon-btn" data-ldel="phases" data-i="${i}" aria-label="Retirer">×</button></div>`).join("");
  return `<div class="list-box"><h3>Phases du planning</h3>
    <p class="note">Modèle utilisé pour chaque nouveau projet. Cochez les phases avec équipe sur place.</p>${items}
    <div class="add-row"><button class="btn ghost" data-ladd="phases">+ Ajouter</button></div></div>`;
}

export function renderListes() {
  return `<section class="sec"><div class="sec-h"><h2>Listes</h2></div>
    <p class="note">Ces listes alimentent les menus de toutes les feuilles. Renommer une valeur ne modifie pas les lignes déjà saisies.</p>
    <div class="lists">${box("societes", "Sociétés")}${box("categories", "Catégories")}${box("unites", "Unités")}${box("natures", "Natures de coût")}${phases()}</div></section>`;
}
