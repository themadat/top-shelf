(function () {
  'use strict';
  const App = window.LocalApp, esc = App.utils.escapeHtml;
  function render(books, pref) {
    document.querySelector('#booksPivotCount').textContent = books.filter(function (b) { return b.status === 'Read'; }).length + ' completed books';
    document.querySelector('#booksPivotCards').innerHTML = [['authors','Authors'],['genres','Genres'],['yearRead','Year Read']].map(function (entry) {
      const groups = App.books.pivots(books, entry[0]).filter(function (g) { return g.count >= pref.minimum && g.label.toLowerCase().includes(pref.pivotQuery.toLowerCase()); });
      groups.sort(function (a, b) {
        const x = a[pref.pivotSort], y = b[pref.pivotSort];
        if (x === null || y === null) return x === y ? a.label.localeCompare(b.label) : x === null ? 1 : -1;
        const diff = typeof x === 'number' ? x - y : x.localeCompare(y, undefined, { numeric: true });
        return diff * (pref.pivotDirection === 'asc' ? 1 : -1) || a.label.localeCompare(b.label);
      });
      return '<section class="books-pivot-card"><h2>' + entry[1] + '</h2><table><thead><tr><th scope="col">' + entry[1] + '</th><th scope="col">Books</th><th scope="col">Rated</th><th scope="col">My avg.</th></tr></thead><tbody>' + groups.map(function (g) {
        return '<tr><th scope="row"><button type="button" class="book-title" data-book-group="' + entry[0] + '" data-group-key="' + esc(g.key) + '" data-group-label="' + esc(g.label) + '">' + esc(g.label) + '</button></th><td>' + g.count + '</td><td>' + g.rated + '</td><td>' + (g.average === null ? '—' : g.average.toFixed(2)) + '</td></tr>';
      }).join('') + '</tbody></table>' + (groups.length ? '' : '<p class="setting-note">No completed books match these group settings.</p>') + '</section>';
    }).join('');
  }
  App.booksPivotsUI = { render: render };
})();
