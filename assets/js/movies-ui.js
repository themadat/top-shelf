(function () {
  "use strict";
  const App = window.LocalApp, u = App.utils, model = App.movies;
  const $ = function (selector) { return document.querySelector(selector); };
  const esc = u.escapeHtml;
  let draft = null, lookupController = null, generation = 0;
  let inlineEdit = null;
  let filter = "all", query = "", sort = "title";
  function saved() { return App.storage.getState().workspace.movies.filter(function (movie) { return !movie.deleted; }); }
  function cancelLookup() { generation += 1; lookupController?.abort(); lookupController = null; $("#movieLookupButton").disabled = false; $("#movieLookupResults").removeAttribute("aria-busy"); }
  function fields() { const form = $("#movieForm"); return Object.fromEntries(new FormData(form).entries()); }
  function statusFields() {
    const watched = $("#movieStatus").value === "watched";
    $("#wishlistFields").hidden = watched; $("#watchedFields").hidden = !watched;
    ["rating"].forEach(function (name) { $("#movieForm").elements[name].required = watched; });
    const form = $("#movieForm"), historical = form.elements.historicalRating.value;
    form.elements.rating.readOnly = !!historical;
    if (historical) form.elements.rating.value = model.historicalRatings[historical];
    $("#movieRatingPreview").style.background = model.color($("#movieForm").elements.rating.value || 0, false);
    $("#moviePriorityPreview").style.background = model.color($("#movieForm").elements.priority.value || 1, true);
  }
  function metadata() {
    const v = draft || {};
    $("#movieMetadata").innerHTML = [["TMDB ID", v.tmdbId], ["Release Date", v.releaseDate || "Not announced"], ["Genres", (v.genres || []).join(", ")], ["Production Companies", (v.productionCompanies || []).join(", ")], ["Director", (v.directors || []).join(", ")], ["Actors", (v.actors || []).join(", ")], ["Collections", (v.collections || []).join(", ")]].map(function (entry) { return '<div><dt>' + entry[0] + '</dt><dd>' + esc(String(entry[1] || "—")) + '</dd></div>'; }).join("");
    $("#movieMetadata").hidden = !v.tmdbId;
    $("#movieRefreshButton").hidden = !v.tmdbId;
    $("#movieSaveButton").disabled = !v.tmdbId;
  }
  function open(id, trigger, status) {
    cancelLookup();
    const current = saved().find(function (movie) { return movie.id === id; });
    draft = current ? u.clone(current) : { id: u.uid("movie"), status: status || (filter === "watched" ? "watched" : "wishlist") };
    $("#movieForm").reset();
    Object.entries(draft).forEach(function (entry) { const field = $("#movieForm").elements[entry[0]]; if (field) field.value = entry[1] == null ? "" : entry[1]; });
    $("#movieDialogTitle").textContent = current ? "Edit Movie" : "Add Movie";
    $("#movieLookupQuery").value = current ? String(current.tmdbId) : "";
    $("#movieLookupResults").innerHTML = ""; $("#movieError").textContent = "";
    $("#movieDeleteButton").hidden = !current;
    $("#tmdbToken").value = "";
    $("#tmdbSettings").open = !App.tmdb.token();
    $("#tmdbCredentialStatus").textContent = App.tmdb.token() ? "TMDB token is configured in this browser." : "A TMDB API Read Access Token is required for lookup.";
    metadata(); statusFields();
    App.components.openDialog("#movieDialog", { trigger: trigger, focus: current ? "#movieTitle" : "#movieLookupQuery" });
  }
  async function lookup(id) {
    cancelLookup();
    const sequence = generation;
    const queryValue = $("#movieLookupQuery").value.trim();
    if (!id && !queryValue) { $("#movieError").textContent = "Enter a title or TMDB movie ID."; return; }
    lookupController = new AbortController();
    $("#movieLookupButton").disabled = true;
    $("#movieLookupResults").setAttribute("aria-busy", "true");
    $("#movieError").textContent = "";
    try {
      if (id || /^\d+$/.test(queryValue)) {
        const data = await App.tmdb.details(id || queryValue, lookupController.signal);
        if (sequence !== generation) return;
        const duplicate = saved().find(function (movie) { return movie.tmdbId === data.tmdbId && movie.id !== draft.id; });
        if (duplicate) throw new Error('“' + duplicate.title + '” is already in your ' + duplicate.status + ' list. Edit that entry instead.');
        const keepTitle = draft.tmdbId === data.tmdbId && $("#movieForm").elements.title.value.trim();
        Object.assign(draft, data);
        if (!keepTitle) $("#movieForm").elements.title.value = data.title;
        $("#movieLookupResults").innerHTML = '<p class="inline-status">Movie details loaded from TMDB.</p>';
        metadata();
      } else {
        const results = await App.tmdb.search(queryValue, lookupController.signal);
        if (sequence !== generation) return;
        $("#movieLookupResults").innerHTML = results.length ? '<p class="movie-muted">Choose the correct movie:</p>' + results.filter(function (movie) { return Number.isSafeInteger(movie.id); }).map(function (movie) {
          return '<button type="button" class="movie-search-result" data-tmdb-id="' + movie.id + '"><strong>' + esc(movie.title || "Untitled") + '</strong><small>' + esc(movie.release_date || "Release Date not announced") + ' · TMDB ' + movie.id + '</small><span>' + esc(u.cleanText(movie.overview, 240)) + '</span></button>';
        }).join("") : '<p class="inline-status">No movies found. Try another title or a TMDB ID.</p>';
      }
    } catch (error) { if (sequence === generation && error.name !== "AbortError") $("#movieError").textContent = error.message; }
    finally { if (sequence === generation) { $("#movieLookupButton").disabled = false; $("#movieLookupResults").removeAttribute("aria-busy"); } }
  }
  function badge(movie) {
    if (movie.status === "watched") {
      const score = Number.isInteger(movie.rating) ? movie.rating.toFixed(1) : String(movie.rating);
      const label = (movie.historicalRating ? movie.historicalRating + ' · ' : '') + score;
      return '<span class="movie-score" aria-label="Rating ' + esc(label) + '" title="Rating ' + esc(label) + '" style="background:' + model.color(movie.rating, false) + '">' + esc(label) + '</span>';
    }
    return movie.priority == null ? '<span aria-label="No Priority">—</span>' : '<span class="movie-priority" aria-label="Priority ' + movie.priority + '" title="Priority ' + movie.priority + '" style="background:' + model.color(movie.priority, true) + '">' + movie.priority + '</span>';
  }
  function editable(movie, field, content, className) {
    return '<td class="' + className + '"><button type="button" class="movie-cell movie-inline-button" data-inline-id="' + esc(movie.id) + '" data-inline-field="' + field + '" aria-label="Edit ' + field + ' for ' + esc(movie.title) + '">' + content + '</button></td>';
  }
  function editCell(button) {
    if (inlineEdit) return;
    const movie = saved().find(function (item) { return item.id === button.dataset.inlineId; });
    if (!movie) return;
    const field = button.dataset.inlineField, score = field === 'rating' || field === 'priority';
    inlineEdit = { id: movie.id, field: field, button: button };
    const form = document.createElement('form');
    form.className = 'movie-inline-form';
    const multiline = ['review', 'notes', 'other'].includes(field);
    form.innerHTML = (multiline ? '<textarea name="value" rows="3"></textarea>' : '<input name="value" type="' + (field.endsWith('Date') ? 'date' : 'text') + '">') + '<div><button type="submit" class="button">Save</button><button type="button" class="button" data-inline-cancel>Cancel</button></div><small role="alert"></small>';
    const input = form.elements.value;
    input.setAttribute('aria-label', button.getAttribute('aria-label'));
    input.value = score && field === 'rating' && movie.historicalRating ? movie.historicalRating : movie[field] ?? '';
    if (score) { input.placeholder = field === 'rating' ? '0–5 or 100!, YES, MEH, NO, RUN' : '1–5'; }
    else input.maxLength = field === 'other' ? 4000 : field === 'how' ? 300 : 20000;
    function restoreFocus() {
      const target = Array.from(document.querySelectorAll('[data-inline-id]')).find(function (item) { return item.dataset.inlineId === movie.id && item.dataset.inlineField === field; });
      (target || $('#movieSearch')).focus();
    }
    function close() { inlineEdit = null; render(); restoreFocus(); }
    form.querySelector('[data-inline-cancel]').addEventListener('click', close);
    form.addEventListener('keydown', function (event) { if (event.isComposing) return; if (event.key === 'Enter' && event.target === input && !event.shiftKey) { event.preventDefault(); event.stopPropagation(); form.requestSubmit(); } if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); } });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      try {
        const current = saved().find(function (item) { return item.id === movie.id; });
        if (!current) throw new Error('This movie has been removed. Cancel to refresh.');
        if (current.status !== movie.status) throw new Error('This movie has changed state. Cancel and reopen the cell.');
        const patch = { [field]: input.value };
        if (field === 'rating') { const historical = input.value.trim().toUpperCase(); patch.historicalRating = Object.hasOwn(model.historicalRatings, historical) ? historical : ''; }
        const updated = model.normalize(Object.assign({}, current, patch));
        inlineEdit = null;
        App.storage.mutate(function (next) { next.workspace.movies = next.workspace.movies.map(function (item) { return item.id === updated.id ? updated : item; }); }, { reason: 'movie-inline-save' });
        const persisted = App.storage.saveNow();
        render();
        restoreFocus();
        App.components.toast(persisted ? 'Movie saved.' : 'Movie kept for this session. Export a backup before closing.', { title: persisted ? 'Saved' : 'Storage unavailable', kind: persisted ? 'success' : 'warning' });
      } catch (error) { form.querySelector('[role="alert"]').textContent = error.message; }
    });
    button.replaceWith(form); input.focus();
  }
  function compareText(a, b) {
    const missing = function (value) { return !value || /^(--|—)$/.test(value.trim()); };
    return Number(missing(a)) - Number(missing(b)) || (a || "").localeCompare(b || "", undefined, { sensitivity: "base", numeric: true });
  }
  function render() {
    if (inlineEdit) return;
    const items = saved(), wishlist = items.filter(function (movie) { return movie.status === "wishlist"; }).length;
    document.querySelectorAll("[data-movie-filter]").forEach(function (button) { const value = button.dataset.movieFilter; button.setAttribute("aria-pressed", String(filter === value)); button.querySelector("small").textContent = value === "all" ? items.length : value === "wishlist" ? wishlist : items.length - wishlist; });
    const visible = items.filter(function (movie) { return (filter === "all" || movie.status === filter) && model.searchable(movie).includes(query.toLowerCase().trim()); });
    visible.sort(function (a, b) {
      if (sort === "other") return compareText(a.other, b.other) || compareText(a.title, b.title);
      if (sort === "rating") return (b.rating ?? -1) - (a.rating ?? -1) || compareText(a.title, b.title);
      if (sort === "priority") return (a.priority ?? 6) - (b.priority ?? 6) || compareText(a.title, b.title);
      if (sort === "release") return (b.releaseDate || "").localeCompare(a.releaseDate || "") || compareText(a.title, b.title);
      if (sort === "watched") return (b.watchedDate || "").localeCompare(a.watchedDate || "") || compareText(a.title, b.title);
      return compareText(a.title, b.title);
    });
    $("#movieResultsCount").textContent = visible.length + " Shown";
    const cell = function (value, className) { return '<td class="' + (className || '') + '"><span class="movie-cell" title="' + esc(String(value || '')) + '">' + esc(String(value || '—')) + '</span></td>'; };
    const headers = [['#', 'score'], ['Title', 'title'], ['Review/Notes', 'review'], ['How', 'how'], ['Date', 'date'], ['Release', 'release'], ['Other Pivots', 'other'], ['Collections', 'collections'], ['Genres', 'genres'], ['Actors', 'actors'], ['Directors', 'directors'], ['Companies', 'companies']];
    $("#movieList").innerHTML = visible.length ? '<div class="movie-table-scroll" tabindex="0" role="region" aria-label="Movie Spreadsheet"><table class="movie-table"><caption class="visually-hidden">Saved Movies. Wishlist rows are highlighted. Date is the watched date for watched movies and available date for wishlist movies.</caption><thead><tr>' + headers.map(function (column) { return '<th scope="col" class="movie-col-' + column[1] + '">' + column[0] + '</th>'; }).join('') + '</tr></thead><tbody>' + visible.map(function (movie) {
      const id = esc(movie.id), watched = movie.status === "watched";
      return '<tr class="' + (watched ? 'movie-watched-row' : 'movie-wishlist-row') + '">' + editable(movie, watched ? 'rating' : 'priority', badge(movie), 'movie-col-score') + '<th scope="row" class="movie-col-title"><button type="button" class="movie-title-link" data-edit-movie="' + id + '" title="Edit ' + esc(movie.title) + '">' + esc(movie.title) + '</button><span class="visually-hidden">' + (watched ? 'Watched' : 'Wishlist') + '</span></th>' + editable(movie, watched ? 'review' : 'notes', esc((watched ? movie.review : movie.notes) || '—'), 'movie-col-review') + editable(movie, 'how', esc(movie.how || '—'), 'movie-col-how') + editable(movie, watched ? 'watchedDate' : 'availableDate', esc((watched ? movie.watchedDate : movie.availableDate) || '—'), 'movie-col-date') + cell(movie.releaseDate, 'movie-col-release') + editable(movie, 'other', esc(movie.other || '—'), 'movie-col-other') + cell(movie.collections.join(', '), 'movie-col-collections') + cell(movie.genres.join(', '), 'movie-col-genres') + cell(movie.actors.join(', '), 'movie-col-actors') + cell(movie.directors.join(', '), 'movie-col-directors') + cell(movie.productionCompanies.join(', '), 'movie-col-companies') + '</tr>';
    }).join('') + '</tbody></table></div>' : '<div class="movie-empty"><h2>' + (items.length ? 'No Movies Match' : 'No Movies Yet') + '</h2><p>' + (items.length ? 'Try another search or movie state.' : 'Build your wishlist or add something you’ve watched.') + '</p></div>';
    const tab = $('[data-shelf="movies"]');
    tab.querySelector("small").textContent = items.length;
    tab.setAttribute("aria-label", "Movies, " + items.length + " movies");
  }
  function save(event) {
    event.preventDefault();
    try {
      const movie = model.normalize(Object.assign({}, draft, fields()));
      const current = App.storage.getState().workspace.movies;
      if (!current.some(function (v) { return v.id === movie.id; }) && current.length >= App.config.controls.maxMovies) throw new Error("The saved movie limit has been reached.");
      model.normalizeList(current.filter(function (v) { return v.id !== movie.id; }).concat(movie));
      App.storage.mutate(function (next) { next.workspace.movies = next.workspace.movies.filter(function (v) { return v.id !== movie.id; }).concat(movie); }, { reason: "movie-save" });
      const persisted = App.storage.saveNow();
      App.components.closeDialog("#movieDialog");
      render();
      App.components.toast(persisted ? movie.title + " saved." : "Movie kept for this session. Export a backup before closing.", { title: persisted ? "Movie saved" : "Storage unavailable", kind: persisted ? "success" : "warning" });
    } catch (error) { $("#movieError").textContent = error.message; }
  }
  async function remove() {
    const id = draft.id, title = draft.title;
    if (!await App.components.confirm({ title: "Delete movie?", message: 'Remove “' + title + '” from your lists? A recovery copy will be saved first.', confirmLabel: "Delete movie", danger: true, trigger: $("#movieDeleteButton") })) return;
    if (!App.storage.saveRecovery("Before deleting " + title)) { $("#movieError").textContent = "Could not save a recovery copy. The movie was kept."; return; }
    App.storage.mutate(function (next) { next.workspace.movies = next.workspace.movies.map(function (movie) { return movie.id === id ? { id: id, deleted: true } : movie; }); }, { reason: "movie-delete" });
    App.storage.saveNow(); App.components.closeDialog("#movieDialog"); render();
  }
  function init() {
    $("#movieSearch").addEventListener("input", function (event) { query = event.target.value; render(); });
    $("#movieSort").addEventListener("change", function (event) { sort = event.target.value; render(); });
    $("#moviesWorkspace").addEventListener("click", function (event) {
      const button = event.target.closest("button"); if (!button) return;
      if (button.hasAttribute("data-movie-filter")) { filter = button.dataset.movieFilter; render(); }
      if (button.hasAttribute("data-add-movie")) open(null, button, button.dataset.addStatus);
      if (button.dataset.inlineId) editCell(button);
      if (button.dataset.editMovie) open(button.dataset.editMovie, button);
      if (button.dataset.watchMovie) { open(button.dataset.watchMovie, button); $("#movieStatus").value = "watched"; statusFields(); $("#movieForm").elements.watchedDate.focus(); }
    });
    $("#movieForm").addEventListener("submit", save);
    $("#movieStatus").addEventListener("change", statusFields);
    $("#movieForm").elements.historicalRating.addEventListener("change", statusFields);
    $("#movieForm").elements.rating.addEventListener("input", statusFields);
    $("#movieForm").elements.priority.addEventListener("input", statusFields);
    $("#movieLookupButton").addEventListener("click", function () { lookup(); });
    $("#movieLookupQuery").addEventListener("input", function () { cancelLookup(); $("#movieLookupResults").innerHTML = ""; });
    $("#movieLookupQuery").addEventListener("keydown", function (event) { if (event.key === "Enter") { event.preventDefault(); lookup(); } });
    $("#movieLookupResults").addEventListener("click", function (event) { const button = event.target.closest("[data-tmdb-id]"); if (button) lookup(button.dataset.tmdbId); });
    $("#movieRefreshButton").addEventListener("click", function () { lookup(draft.tmdbId); });
    $("#movieDeleteButton").addEventListener("click", remove);
    $("#movieDialog").addEventListener("close", cancelLookup);
    $("#saveTmdbToken").addEventListener("click", function () {
      try { App.tmdb.saveToken($("#tmdbToken").value, $("#rememberTmdbToken").checked); $("#tmdbToken").value = ""; $("#tmdbCredentialStatus").textContent = "Token saved. Search for a movie to verify the connection."; }
      catch (error) { $("#tmdbCredentialStatus").textContent = error.message; }
    });
    $("#forgetTmdbToken").addEventListener("click", function () { cancelLookup(); try { App.tmdb.forget(); $("#tmdbToken").value = ""; $("#tmdbCredentialStatus").textContent = "TMDB token forgotten."; } catch (error) { $("#tmdbCredentialStatus").textContent = error.message; } });
    window.addEventListener("app:statechange", function () { render(); });
    const measure = function () {
      document.documentElement.style.setProperty('--app-header-height', $('.app-header').getBoundingClientRect().height + 'px');
      document.documentElement.style.setProperty('--movie-toolbar-height', $('#movieToolbar').getBoundingClientRect().height + 'px');
      if (!$('#moviePivotsView').hidden) {
        const top = Math.max($('#pivotGrid').getBoundingClientRect().top, $('#movieToolbar').getBoundingClientRect().bottom + 3);
        document.documentElement.style.setProperty('--pivot-available-height', Math.max(180, window.innerHeight - top - 8) + 'px');
      }
    };
    new ResizeObserver(measure).observe($('.app-header'));
    new ResizeObserver(measure).observe($('#movieToolbar'));
    ['#whatsNewBanner', '#contextHint'].forEach(function (selector) { new ResizeObserver(measure).observe($(selector)); });
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });
    document.querySelectorAll('[data-movie-view]').forEach(function (button) { button.addEventListener('click', function () { requestAnimationFrame(measure); }); });
    measure();
    render();
  }
  App.moviesUI = { init: init, render: render, open: open };
})();
