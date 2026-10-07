/** Export CSV du devis (format Excel français : point-virgule, virgule décimale). */
import { S, P, getAdapter } from "./store.js";
import { calc, lineTotal } from "./calc.js";
import { num } from "./utils.js";

export function exportCsv() {
  const p = P(), adapter = getAdapter();
  if (!p || !adapter) return;
  const r = calc(p, S.cfg);
  const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const n = v => (v === null || v === undefined ? "" : String(v).replace(".", ","));
  const pctN = v => (num(v) ? n(Math.round(num(v) * 1000) / 10) : "");
  const L = [];
  L.push([q("Client"), q(p.client)].join(";"));
  L.push([q("Projet"), q(p.nom)].join(";"));
  L.push([q("Date du show"), q(p.dateShow)].join(";"));
  L.push("");
  L.push(["Phase", "Équipe", "Jours", "Remarques"].map(q).join(";"));
  for (const ph of p.planning || []) L.push([q(ph.phase), q(ph.equipe ? "Oui" : "Non"), n(ph.jours), q(ph.remarques)].join(";"));
  L.push("");
  L.push(["Catégorie", "Prestation", "Description", "Société", "Unité", "Quantité", "Prix unitaire HT", "Remise %", "Total HT", "Notes"].map(q).join(";"));
  for (const l of p.lignes || []) {
    L.push([q(l.categorie), q(l.prestation), q(l.description), q(l.societe), q(l.unite), n(l.quantite), n(l.pu), pctN(l.remise), n(lineTotal(l)), q(l.notes)].join(";"));
  }
  L.push("");
  L.push([q("Total HT"), n(r.ht)].join(";"));
  L.push([q("TVA"), n(r.tva)].join(";"));
  L.push([q("Total TTC"), n(r.ttc)].join(";"));
  const name = ("Devis " + (p.client ? p.client + " - " : "") + (p.nom || "projet")).replace(/[\\/:*?"<>|]/g, "-") + ".csv";
  return adapter.download(name, "﻿" + L.join("\r\n"));
}
