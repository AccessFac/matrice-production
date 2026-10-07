/**
 * Glisser-déposer des lignes du devis (SortableJS, chargé dans index.html).
 * - une catégorie entière se déplace par sa poignée ⠿ de titre ;
 * - une ligne se déplace à l'intérieur de sa catégorie par sa poignée ⠿.
 * Après chaque dépôt, onReorder(ids) reçoit les identifiants des lignes dans le nouvel ordre.
 */
export function initSortable(root, onReorder) {
  const Sortable = window.Sortable;
  const table = root.querySelector('table[data-tbl="lignes"]');
  if (!Sortable || !table) return;
  const done = () => onReorder([...table.querySelectorAll("tbody.cat-group tr[data-row]")].map(tr => tr.dataset.id));
  const common = { animation: 150, ghostClass: "drag-ghost", chosenClass: "drag-chosen", forceFallback: false, onEnd: done };
  new Sortable(table, { ...common, draggable: "tbody.cat-group", handle: ".grp-drag", group: { name: "cats", pull: false, put: false } });
  table.querySelectorAll("tbody.cat-group").forEach((tb, i) => {
    new Sortable(tb, { ...common, draggable: "tr[data-row]", handle: ".drag:not(.grp-drag)", group: { name: "lignes-" + i, pull: false, put: false } });
  });
}
