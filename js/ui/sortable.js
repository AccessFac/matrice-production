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

/**
 * Glisser-déposer du catalogue : une prestation déposée dans un autre groupe
 * → onMoveRow(id, société, catégorie). Le classement reste alphabétique.
 */
export function initCatalogueSortable(root, { onMoveRow }) {
  const Sortable = window.Sortable;
  const table = root.querySelector('table[data-tbl="catalogue"]');
  if (!Sortable || !table) return;
  const common = { animation: 150, ghostClass: "drag-ghost", chosenClass: "drag-chosen" };

  table.querySelectorAll("tbody.cat-group").forEach(tb => {
    new Sortable(tb, {
      ...common, draggable: "tr[data-row]", handle: ".drag",
      group: { name: "cat-rows", pull: true, put: to => !!(to.el.dataset.soc && to.el.dataset.cat) },
      onEnd: evt => {
        if (evt.to === evt.from) { onMoveRow(null); return; }   // même groupe : l'ordre reste alphabétique
        onMoveRow(evt.item.dataset.id, evt.to.dataset.soc, evt.to.dataset.cat);
      }
    });
  });
}
