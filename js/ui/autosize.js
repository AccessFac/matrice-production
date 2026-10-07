/** Cases de texte (descriptions, notes) qui s'agrandissent pour afficher tout leur contenu. */
export function fit(el) {
  if (!el || el.tagName !== "TEXTAREA" || !el.offsetParent) return;
  el.style.height = "auto";
  el.style.height = el.scrollHeight + 2 + "px";
}

export function autosizeAll(root = document) {
  root.querySelectorAll("textarea.cell").forEach(fit);
}

/** À appeler une fois : suit la saisie et les changements de largeur. */
export function initAutosize() {
  document.addEventListener("input", e => { if (e.target.matches && e.target.matches("textarea.cell")) fit(e.target); });
  let t = null;
  const later = () => { clearTimeout(t); t = setTimeout(() => autosizeAll(), 120); };
  window.addEventListener("resize", later);
  document.addEventListener("pointerup", later);   // après un redimensionnement de colonne
}
