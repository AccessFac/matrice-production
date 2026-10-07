/**
 * Colonnes redimensionnables : poignée sur le bord droit de chaque en-tête.
 * Glisser pour changer la largeur, double-clic pour revenir à la largeur par défaut.
 * Les largeurs sont mémorisées dans le navigateur de chaque utilisateur.
 */
const MIN_W = 56;
const key = (tbl, i) => `mp.w.${tbl}.${i}`;

function setW(th, w) { th.style.width = th.style.minWidth = th.style.maxWidth = w + "px"; }

/** À appeler après chaque rendu : ajoute les poignées et réapplique les largeurs mémorisées. */
export function enhanceTables(root) {
  root.querySelectorAll("table[data-tbl]").forEach(t => {
    const cells = t.tHead ? Array.from(t.tHead.rows[0].cells) : [];
    cells.forEach((th, i) => {
      if (i === cells.length - 1 && !th.textContent.trim()) return; // colonne du bouton supprimer
      const h = document.createElement("span");
      h.className = "rz";
      h.title = "Glisser pour élargir · double-clic pour réinitialiser";
      h.dataset.tbl = t.dataset.tbl; h.dataset.i = i;
      th.appendChild(h);
      let w = null;
      try { w = parseInt(localStorage.getItem(key(t.dataset.tbl, i)), 10); } catch (e) {}
      if (w > 0) setW(th, w);
    });
  });
}

/** Branche les événements une seule fois au démarrage. */
export function initResize() {
  let drag = null;
  document.addEventListener("pointerdown", e => {
    const h = e.target.closest(".rz");
    if (!h) return;
    e.preventDefault();
    const th = h.parentElement;
    drag = { h, th, x: e.clientX, w: th.getBoundingClientRect().width };
    h.classList.add("on"); document.body.classList.add("resizing");
    try { h.setPointerCapture(e.pointerId); } catch (_) {}
  });
  document.addEventListener("pointermove", e => {
    if (drag) setW(drag.th, Math.max(MIN_W, Math.round(drag.w + e.clientX - drag.x)));
  });
  document.addEventListener("pointerup", () => {
    if (!drag) return;
    try { localStorage.setItem(key(drag.h.dataset.tbl, drag.h.dataset.i), parseInt(drag.th.style.width, 10)); } catch (_) {}
    drag.h.classList.remove("on"); document.body.classList.remove("resizing");
    drag = null;
  });
  document.addEventListener("dblclick", e => {
    const h = e.target.closest(".rz");
    if (!h) return;
    const th = h.parentElement;
    th.style.width = th.style.minWidth = th.style.maxWidth = "";
    try { localStorage.removeItem(key(h.dataset.tbl, h.dataset.i)); } catch (_) {}
  });
}
