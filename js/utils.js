/** Petits outils partagés : identifiants, échappement HTML, nombres et formats français. */

export function clone(o) { return JSON.parse(JSON.stringify(o)); }

export function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/** Lit un nombre saisi (accepte la virgule et les espaces). Renvoie null si vide ou invalide. */
export function num(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/\s/g, "").replace(",", "."));
  return isFinite(n) ? n : null;
}

const fmtE = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 2 });
export function eur(n) { return n === null || n === undefined || n === "" ? "" : fmtE.format(n); }

const fmtP = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 });
export function pct(n) { return n === null || !isFinite(n) ? "—" : fmtP.format(n); }

/** Nombre → texte avec virgule décimale, pour remplir un champ. */
export function nstr(n) { return n === null || n === undefined ? "" : String(n).replace(".", ","); }

/** Options d'un <select> ; ajoute la valeur courante si elle n'est plus dans la liste. */
export function opts(list, val, blank = true) {
  let h = blank ? `<option value=""></option>` : "";
  const l = list.slice();
  if (val && !l.includes(val)) l.push(val);
  for (const x of l) h += `<option ${x === val ? "selected" : ""}>${esc(x)}</option>`;
  return h;
}
