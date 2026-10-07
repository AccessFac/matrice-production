/** Récapitulatifs à barres (CA par société, CA par catégorie) affichés sous le devis. */
import { S } from "../store.js";
import { SOC_COLORS, SOC_COLOR_BY_NAME } from "../defaults.js";
import { esc, eur, pct } from "../utils.js";

export function socColor(s) {
  const key = String(s || "").toLowerCase().replace(/\s+/g, "");
  if (SOC_COLOR_BY_NAME[key]) return SOC_COLOR_BY_NAME[key];
  const others = S.cfg.societes.filter(x => !SOC_COLOR_BY_NAME[String(x).toLowerCase().replace(/\s+/g, "")]);
  const i = others.indexOf(s);
  return i < 0 ? "var(--faint)" : SOC_COLORS[i % SOC_COLORS.length];
}

function barRow(name, v, total, color) {
  const w = total ? Math.max(0, Math.min(100, (v / total) * 100)) : 0;
  return `<div class="bar-row"><span class="name"><i class="dot" style="background:${color}"></i>${esc(name)}</span>
    <span class="amt">${eur(v)}<em>${pct(total ? v / total : null)}</em></span>
    <div class="bar"><b style="width:${w}%;background:${color}"></b></div></div>`;
}

export function recapSoc(r) {
  const rows = r.soc.filter(x => x.caClient || S.cfg.societes.includes(x.s));
  let h = rows.map(x => barRow(x.s, x.caClient, r.ht, socColor(x.s))).join("");
  if (r.bySoc["Sans société"]) h += barRow("Sans société", r.bySoc["Sans société"], r.ht, "var(--faint)");
  const chip = r.sansSociete
    ? `<span class="chip warn">${r.sansSociete} ligne(s) sans société</span>`
    : `<span class="chip ok">cohérent</span>`;
  return h + `<div class="recap-foot"><span>Total ${chip}</span><span class="amt">${eur(r.ht)}</span></div>`;
}

export function recapCat(r) {
  const cats = Object.entries(r.byCat).sort((a, b) => b[1] - a[1]);
  if (!cats.length) return `<p class="note">Le récapitulatif apparaît dès qu'une ligne a un total.</p>`;
  return cats.map(([c, v]) => barRow(c, v, r.ht, "var(--accent)")).join("")
    + `<div class="recap-foot"><span>Total</span><span class="amt">${eur(r.ht)}</span></div>`;
}
