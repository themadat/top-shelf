(function () {
  "use strict";
  const App = window.LocalApp, u = App.utils, model = App.movies;
  const $ = function (selector) { return document.querySelector(selector); };
  const esc = u.escapeHtml;
  function resizeColumns(filter) {
    const table = $('#movieList .movie-table');
    if (!table) return;
    const headings = Array.from(table.tHead.rows[0].cells);
    const stored = App.storage.getState().ui.movieColumnWidths?.[filter] || {};
    const keys = headings.map(function (cell) { return cell.className.replace('movie-col-', ''); });
    const widths = headings.map(function (cell, index) { return stored[keys[index]] || Math.ceil(cell.getBoundingClientRect().width); });
    const group = document.createElement('colgroup');
    widths.forEach(function () { group.appendChild(document.createElement('col')); });
    table.insertBefore(group, table.tHead);
    table.classList.add('movie-table-resizable');
    function apply(index, width) {
      widths[index] = Math.max(40, Math.min(100000, Math.ceil(width)));
      Array.from(group.children).forEach(function (col, i) { col.style.width = widths[i] + 'px'; });
      table.style.width = widths.reduce(function (sum, value) { return sum + value; }, 0) + 'px';
      headings[index].querySelector('.movie-column-resize')?.setAttribute('aria-valuenow', widths[index]);
    }
    function save(index) {
      App.storage.mutate(function (state) { state.ui.movieColumnWidths[filter][keys[index]] = widths[index]; }, { reason: 'movie-column-width', touch: false });
      App.storage.saveNow();
    }
    function fit(index) {
      let width = 40;
      // Measure natural content independently of clipping and the current column width.
      Array.from(table.rows).forEach(function (row) {
        const cell = row.cells[index], content = cell.querySelector('.movie-cell, .movie-title-link, .movie-column-sort');
        if (!content) return;
        const copy = content.cloneNode(true);
        copy.style.cssText = 'position:fixed;left:-200000px;top:0;width:max-content;min-width:0;max-width:none;white-space:pre;overflow:visible;pointer-events:none';
        cell.appendChild(copy);
        const style = getComputedStyle(cell);
        width = Math.max(width, copy.getBoundingClientRect().width + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + 14);
        copy.remove();
      });
      apply(index, width); save(index);
    }
    headings.forEach(function (cell, index) {
      const handle = document.createElement('span');
      handle.className = 'movie-column-resize';
      handle.tabIndex = 0;
      handle.setAttribute('role', 'separator');
      handle.setAttribute('aria-orientation', 'vertical');
      handle.setAttribute('aria-label', 'Resize ' + cell.textContent.trim() + ' column');
      handle.setAttribute('aria-valuemin', '40');
      handle.setAttribute('aria-valuemax', '100000');
      handle.title = 'Drag to resize; double-click to fit content. Arrow keys resize; Enter fits.';
      cell.appendChild(handle);
      handle.addEventListener('click', function (event) { event.stopPropagation(); });
      handle.addEventListener('dblclick', function (event) { event.preventDefault(); event.stopPropagation(); fit(index); });
      handle.addEventListener('keydown', function (event) {
        if (!['ArrowLeft', 'ArrowRight', 'Enter'].includes(event.key)) return;
        event.preventDefault(); event.stopPropagation();
        if (event.key === 'Enter') fit(index);
        else { apply(index, widths[index] + (event.key === 'ArrowLeft' ? -10 : 10)); save(index); }
      });
      handle.addEventListener('pointerdown', function (event) {
        if (event.button !== 0) return;
        event.preventDefault(); event.stopPropagation();
        const start = event.clientX, initial = widths[index];
        handle.setPointerCapture(event.pointerId);
        function move(e) { apply(index, initial + e.clientX - start); }
        function finish(e) {
          handle.removeEventListener('pointermove', move);
          handle.removeEventListener('pointerup', finish);
          handle.removeEventListener('pointercancel', cancel);
          if (handle.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId);
          if (widths[index] !== initial) save(index);
        }
        function cancel(e) { apply(index, initial); finish(e); }
        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', finish);
        handle.addEventListener('pointercancel', cancel);
      });
      apply(index, widths[index]);
    });
  }
  App.movieColumns = { resize: resizeColumns };
})();
