(function () {
  "use strict";
  const App = window.LocalApp, u = App.utils, model = App.movies;
  const $ = function (selector) { return document.querySelector(selector); };
  const esc = u.escapeHtml;
  let draft = null, lookupController = null, generation = 0;
  let responseController = null, responseGeneration = 0, responses = {};
  const TOKEN_MASK = '••••••••••••';
  function tokenSettings() {
    const configured = !!App.tmdb.token();
    $('#tmdbToken').value = configured ? TOKEN_MASK : '';
    $('#rememberTmdbToken').checked = configured ? App.tmdb.remembered() : true;
    $('#tmdbCredentialStatus').textContent = configured ? 'Token saved in this browser. Enter a replacement to change it.' : 'No token saved. Credentials stay outside backups and sync.';
  }
  function resetResponses() {
    responseGeneration++; responseController?.abort(); responseController = null; responses = {};
    $('#movieResponseStatus').textContent = '';
    renderResponses();
  }
  function jsonTree(value, path, providers) {
    const key = path[path.length - 1], label = key === undefined ? '' : esc(JSON.stringify(key)) + ': ';
    if (value === null || typeof value !== 'object') return '<div class="json-value">' + label + esc(JSON.stringify(value)) + '</div>';
    const entries = Object.entries(value), array = Array.isArray(value);
    const country = providers && path.length === 2 && path[0] === 'results';
    const expanded = providers ? !(country && key !== 'US') && key !== 'rent' && key !== 'buy' : path.length < 2;
    return '<details class="json-node"' + (expanded ? ' open' : '') + '><summary>' + label + (array ? '[' : '{') + ' ' + entries.length + (array ? ' items ]' : ' properties }') + '</summary><div class="json-children">' + entries.map(function (entry) { return jsonTree(entry[1], path.concat(entry[0]), providers); }).join('') + '</div></details>';
  }
  function renderResponses() {
    $('#movieDetailsResponse').innerHTML = responses.details ? jsonTree(responses.details, [], false) : 'No response loaded yet.';
    $('#movieProvidersResponse').innerHTML = responses.providers ? jsonTree(responses.providers, [], true) : 'No response loaded yet.';
  }
  function dateFields() {
    $('#movieForm').querySelectorAll('.movie-date-field input').forEach(function (input) { input.parentElement.classList.toggle('is-empty', !input.value); });
  }
  async function loadResponses(force) {
    if (!draft?.tmdbId) { $('#movieResponseStatus').textContent = 'Choose a movie first.'; return; }
    if (responseController && !force) return;
    responseController?.abort(); responseController = new AbortController();
    const controller = responseController, sequence = ++responseGeneration, id = draft.tmdbId;
    if (force) { responses = {}; renderResponses(); }
    $('#movieResponseStatus').textContent = 'Loading returned data…';
    const results = await Promise.allSettled([
      responses.details ? Promise.resolve(null) : App.tmdb.detailsResponse(id, controller.signal),
      responses.providers ? Promise.resolve(null) : App.tmdb.streamingResponse(id, controller.signal)
    ]);
    if (sequence !== responseGeneration || draft?.tmdbId !== id) return;
    const errors = [];
    results.forEach(function (result, index) { if (result.status === 'fulfilled' && result.value) responses[index === 0 ? 'details' : 'providers'] = result.value.raw; else if (result.status === 'rejected') errors.push(result.reason.message); });
    responseController = null; renderResponses();
    $('#movieResponseStatus').textContent = errors.length ? errors.join(' ') : 'Full TMDB responses shown below.';
  }
  let inlineEdit = null;
  let streamingBusy = false, streamingController = null;
  let filter = "all", query = "", incompleteOnly = false;
  function saved() { return App.storage.getState().workspace.movies.filter(function (movie) { return !movie.deleted; }); }
  function cancelLookup() { generation += 1; lookupController?.abort(); lookupController = null; $("#movieLookupButton").disabled = false; $("#movieLookupResults").removeAttribute("aria-busy"); }
  function fields() { const form = $("#movieForm"); return Object.assign(Object.fromEntries(new FormData(form).entries()), { subgenreReviewed: form.elements.subgenreReviewed.checked, incompleteOverride: form.elements.incompleteOverride.checked }); }
  function statusFields() {
    const watched = $("#movieStatus").value === "watched";
    document.querySelectorAll('[data-editor-state]').forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.editorState === (watched ? 'watched' : 'wishlist'))); });
    $("#wishlistFields").hidden = watched; $("#watchedFields").hidden = !watched;
    ["rating"].forEach(function (name) { $("#movieForm").elements[name].required = watched; });
    const form = $("#movieForm"), historical = form.elements.historicalRating.value;
    form.elements.rating.readOnly = !!historical;
    if (historical) form.elements.rating.value = model.historicalRatings[historical];
    $("#movieRatingPreview").style.background = model.color($("#movieForm").elements.rating.value || 0, false);
    document.querySelectorAll('[data-editor-priority]').forEach(function (button) {
      const selected = button.dataset.editorPriority === form.elements.priority.value;
      button.setAttribute('aria-pressed', String(selected));
      button.style.background = selected ? model.color(Number(button.dataset.editorPriority), true) : '';
      button.style.color = selected ? '#17231b' : '';
    });
    dateFields();
  }
  function metadata() {
    const v = draft || {};
    $("#movieMetadata").innerHTML = [["TMDB ID", v.tmdbId], ["Release Date", v.releaseDate || "Not announced"], ["Genres", (v.genres || []).join(", ")], ["Production Companies", (v.productionCompanies || []).join(", ")], ["Director", (v.directors || []).join(", ")], ["Actors", (v.actors || []).join(", ")], ["Collections", (v.collections || []).join(", ")]].map(function (entry) { return '<div><dt>' + entry[0] + '</dt><dd>' + esc(String(entry[1] || "—")) + '</dd></div>'; }).join("");
    $("#movieMetadata").hidden = !v.tmdbId;
    $("#movieRefreshButton").hidden = !v.tmdbId;
    $("#movieSaveButton").disabled = !v.tmdbId;
  }
  function open(id, trigger, status) {
    cancelLookup(); resetResponses();
    const current = saved().find(function (movie) { return movie.id === id; });
    draft = current ? u.clone(current) : { id: u.uid("movie"), status: status || (filter === "watched" ? "watched" : "wishlist") };
    $("#movieForm").reset();
    Object.entries(draft).forEach(function (entry) { const field = $("#movieForm").elements[entry[0]]; if (field) field.value = entry[1] == null ? "" : entry[1]; });
    $("#movieForm").elements.subgenreReviewed.checked = draft.subgenreReviewed === true;
    $("#movieForm").elements.incompleteOverride.checked = draft.incompleteOverride === true;
    $("#movieDialogTitle").textContent = current ? "Edit Movie" : "Add Movie";
    $("#movieLookupQuery").value = current ? String(current.tmdbId) : "";
    $("#movieLookupResults").innerHTML = ""; $("#movieError").textContent = "";
    $("#movieDeleteButton").hidden = !current;
    tokenSettings();
    $('#movieDetails').open = false;
    $('#movieStreamingStatus').textContent = '';
    $("#tmdbCredentialStatus").textContent = App.tmdb.token() ? "TMDB token is configured in this browser." : "A TMDB API Read Access Token is required for lookup.";
    $("#movieSubgenreOptions").textContent = "(" + (App.subgenres.vocabulary(saved()).join(", ") || "No subgenres defined") + ")";
    metadata(); statusFields();
    if (current && !current.how) fillEditorStreaming(current.tmdbId, generation);
    App.components.openDialog("#movieDialog", { trigger: trigger, focus: current ? "#movieTitle" : "#movieLookupQuery" });
  }
  function lookupSettings(trigger) {
    App.application.openSupport('settings', trigger);
    tokenSettings();
    $('#tmdbSettings').open = true;
    $('#tmdbCredentialStatus').textContent = App.tmdb.token() ? 'TMDB token is configured in this browser.' : 'Add your TMDB API Read Access Token to enable lookups.';
    requestAnimationFrame(function () { $('#tmdbToken').focus(); $('#tmdbSettings').scrollIntoView({ block: 'center' }); });
  }
  async function fillEditorStreaming(id, sequence, refresh) {
    const input = $('#movieForm').elements.how, previous = input.value;
    if (!App.tmdb.token() || (!refresh && previous.trim())) return;
    $('#movieStreamingStatus').textContent = 'Checking US streaming availability…';
    try {
      const result = await App.tmdb.streamingResponse(id, lookupController?.signal);
      if (sequence !== generation || draft?.tmdbId !== id) return;
      let how = result.how;
      if (refresh && !how) {
        const usTheatricalDate = await App.tmdb.theatricalDate(id, lookupController?.signal);
        how = App.streamingRules.predict(Object.assign({}, draft, { how: previous }), { usTheatricalDate: usTheatricalDate }).how;
      }
      if (sequence !== generation || draft?.tmdbId !== id) return;
      responses.providers = result.raw; renderResponses();
      if (input.value === previous) input.value = how;
      $('#movieStreamingStatus').textContent = result.how ? 'US streaming from JustWatch via TMDB. Edit How as needed.' : 'No US streaming listed. Existing How is marked * when no estimate is available. Save Movie to keep changes.';
    } catch (error) { if (sequence === generation) $('#movieStreamingStatus').textContent = error.message; }
  }
  async function lookup(id) {
    cancelLookup(); resetResponses();
    const sequence = generation;
    const queryValue = $("#movieLookupQuery").value.trim();
    if (!id && !queryValue) { $("#movieError").textContent = "Enter a title or TMDB movie ID."; return; }
    lookupController = new AbortController();
    $("#movieLookupButton").disabled = true;
    $("#movieLookupResults").setAttribute("aria-busy", "true");
    $("#movieError").textContent = "";
    try {
      if (id || /^\d+$/.test(queryValue)) {
        const response = await App.tmdb.detailsResponse(id || queryValue, lookupController.signal);
        const data = response.movie;
        if (sequence !== generation) return;
        const duplicate = saved().find(function (movie) { return movie.tmdbId === data.tmdbId && movie.id !== draft.id; });
        if (duplicate) throw new Error('“' + duplicate.title + '” is already in your ' + duplicate.status + ' list. Edit that entry instead.');
        const keepTitle = draft.tmdbId === data.tmdbId && $("#movieForm").elements.title.value.trim();
        Object.assign(draft, data);
        responses.details = response.raw; renderResponses();
        if (!keepTitle) $("#movieForm").elements.title.value = data.title;
        $("#movieLookupResults").innerHTML = '<p class="inline-status">Movie details loaded from TMDB.</p>';
        metadata();
        await fillEditorStreaming(data.tmdbId, sequence, true);
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
    else input.maxLength = field === 'other' ? 4000 : field === 'how' ? 302 : 20000;
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
  function sortPreference() { return model.sortPreference(App.storage.getState().ui.movieSorts?.[filter], filter); }
  function setSort(key, direction) {
    App.storage.mutate(function (next) { next.ui.movieSorts = Object.assign({}, next.ui.movieSorts, { [filter]: { key: key, direction: direction } }); }, { reason: 'movie-sort' });
    App.storage.saveNow();
    render();
  }
  function resizeColumns() {
    const table = $('#movieList .movie-table');
    if (!table) return;
    const headings = Array.from(table.tHead.rows[0].cells);
    const stored = App.storage.getState().ui.movieColumnWidths || {};
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
      App.storage.mutate(function (state) { state.ui.movieColumnWidths[keys[index]] = widths[index]; }, { reason: 'movie-column-width', touch: false });
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
  function render() {
    if (inlineEdit) return;
    $('#wishlistStreaming').hidden = filter !== 'wishlist' && !streamingBusy && !$('#wishlistStreamingStatus').textContent;
    const items = saved(), wishlist = items.filter(function (movie) { return movie.status === "wishlist"; }).length;
    document.querySelectorAll("[data-movie-filter]").forEach(function (button) { const value = button.dataset.movieFilter; button.setAttribute("aria-pressed", String(filter === value)); button.querySelector("small").textContent = value === "all" ? items.length : value === "wishlist" ? wishlist : items.length - wishlist; });
    const visible = items.filter(function (movie) { return (filter === "all" || movie.status === filter) && (!incompleteOnly || model.incomplete(movie)) && model.searchable(movie).includes(query.toLowerCase().trim()); });
    $("#movieIncompleteButton").setAttribute("aria-pressed", String(incompleteOnly));
    const sort = sortPreference();
    visible.sort(function (a, b) { return model.compare(a, b, sort); });
    $("#movieResultsCount").textContent = visible.length + " Shown";
    const cell = function (value, className) { return '<td class="' + (className || '') + '"><span class="movie-cell" title="' + esc(String(value || '')) + '">' + esc(String(value || '—')) + '</span></td>'; };
    const headers = [['#', 'score'], ['Title', 'title'], ['Review/Notes', 'review'], ['How', 'how'], ['Date', 'date'], ['Release', 'release'], ['Other Pivots', 'other'], ['Collections', 'collections'], ['Genres', 'genres'], ['Actors', 'actors'], ['Directors', 'directors'], ['Companies', 'companies']];
    $("#movieList").innerHTML = visible.length ? '<div class="movie-table-scroll" tabindex="0" role="region" aria-label="Movie Spreadsheet"><table class="movie-table"><caption class="visually-hidden">Saved Movies. Wishlist rows are highlighted. Date is the watched date for watched movies and available date for wishlist movies.</caption><thead><tr>' + headers.map(function (column) { const key = column[1] === 'score' ? (filter === 'wishlist' ? 'priority' : 'rating') : column[1], selected = key === sort.key || (key === 'date' && sort.key === 'watched' && filter === 'watched'); return '<th scope="col" class="movie-col-' + column[1] + '" aria-sort="' + (selected ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none') + '"><button type="button" class="movie-column-sort" data-movie-column-sort="' + key + '" aria-label="Sort by ' + (column[1] === 'score' ? key : column[0]) + '">' + column[0] + (selected ? App.icons.markup(sort.direction === 'asc' ? 'sortUp' : 'sortDown') : '') + '</button></th>'; }).join('') + '</tr></thead><tbody>' + visible.map(function (movie) {
      const id = esc(movie.id), watched = movie.status === "watched";
      return '<tr class="' + (watched ? 'movie-watched-row' : 'movie-wishlist-row') + '">' + editable(movie, watched ? 'rating' : 'priority', badge(movie), 'movie-col-score') + '<th scope="row" class="movie-col-title"><button type="button" class="movie-title-link" data-edit-movie="' + id + '" title="Edit ' + esc(movie.title) + '">' + esc(movie.title) + '</button><span class="visually-hidden">' + (watched ? 'Watched' : 'Wishlist') + '</span></th>' + editable(movie, watched ? 'review' : 'notes', esc((watched ? movie.review : movie.notes) || '—'), 'movie-col-review') + editable(movie, 'how', esc(movie.how || '—'), 'movie-col-how') + editable(movie, watched ? 'watchedDate' : 'availableDate', esc((watched ? movie.watchedDate : movie.availableDate) || '—'), 'movie-col-date') + cell(movie.releaseDate, 'movie-col-release') + editable(movie, 'other', esc(movie.other || '—'), 'movie-col-other') + cell(movie.collections.join(', '), 'movie-col-collections') + cell(movie.genres.join(', '), 'movie-col-genres') + cell(movie.actors.join(', '), 'movie-col-actors') + cell(movie.directors.join(', '), 'movie-col-directors') + cell(movie.productionCompanies.join(', '), 'movie-col-companies') + '</tr>';
    }).join('') + '</tbody></table></div>' : '<div class="movie-empty"><h2>' + (items.length ? 'No Movies Match' : 'No Movies Yet') + '</h2><p>' + (items.length ? 'Try another search or movie state.' : 'Build your wishlist or add something you’ve watched.') + '</p></div>';
    resizeColumns();
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
  async function fillStreaming() {
    if (streamingBusy) return;
    if (!App.tmdb.token()) { lookupSettings($('#wishlistStreamingButton')); return; }
    const targets = saved().filter(function (movie) { return movie.status === 'wishlist'; }).map(function (movie) { return u.clone(movie); });
    const status = $('#wishlistStreamingStatus'), button = $('#wishlistStreamingButton');
    $('#wishlistStreaming').hidden = false;
    if (!targets.length) { status.textContent = 'No Wishlist movies to check.'; return; }
    if (!App.storage.saveRecovery('Before updating Wishlist How')) { status.textContent = 'Could not save a recovery copy. No movies were changed.'; return; }
    streamingBusy = true; streamingController = new AbortController(); button.disabled = true; $('#wishlistStreamingCancel').hidden = false;
    const controller = streamingController;
    const results = $('#wishlistStreamingResults'); results.replaceChildren();
    let updated = 0, checked = 0, estimated = 0, unknown = 0, skipped = 0, failure = '';
    try {
      for (const target of targets) {
        if (controller.signal.aborted) break;
        status.textContent = 'Checking US availability ' + (checked + 1) + '/' + targets.length + '…';
        const available = await App.tmdb.streaming(target.tmdbId, controller.signal);
        const usTheatricalDate = available ? '' : await App.tmdb.theatricalDate(target.tmdbId, controller.signal);
        if (controller.signal.aborted) break;
        checked++;
        const current = saved().find(function (movie) { return movie.id === target.id; });
        if (!current || current.status !== 'wishlist' || JSON.stringify(current) !== JSON.stringify(target) || (draft?.id === target.id && $('#movieDialog').open) || inlineEdit?.id === target.id) { skipped++; continue; }
        const prediction = App.streamingRules.predict(current, { available: available, usTheatricalDate: usTheatricalDate });
        const how = prediction.how;
        if (prediction.status === 'ESTIMATE') estimated++;
        else if (prediction.status === 'UNKNOWN') unknown++;
        const item = document.createElement('li');
        item.textContent = current.title + ': ' + how;
        if (prediction.windows.length) {
          const details = document.createElement('details'), summary = document.createElement('summary'), list = document.createElement('ul');
          summary.textContent = 'Subscription Windows'; details.append(summary, list);
          prediction.windows.forEach(function (window) { const row = document.createElement('li'); row.textContent = (window.window || 'Title rights') + ': ' + window.services.join(' / ') + (window.estimatedDates ? ' · estimated ' + window.estimatedDates.join('–') : window.officialDate ? ' · official ' + window.officialDate : ' · timing unknown') + (window.confidence ? ' · ' + window.confidence + ' rights confidence' : '') + (window.notes ? ' · ' + window.notes : ''); list.append(row); });
          item.append(details);
        }
        if (prediction.needsResearch) {
          const link = document.createElement('a');
          link.href = 'https://www.google.com/search?q=' + encodeURIComponent(current.title + ' ' + (current.releaseDate || '').slice(0, 4) + ' US subscription streaming distribution rights official release date');
          link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Research This Title';
          item.append(document.createTextNode(' · ' + prediction.reason + ' '), link);
        }
        results.append(item);
        if (current.how === how) continue;
        App.storage.mutate(function (next) { next.workspace.movies.find(function (movie) { return movie.id === target.id; }).how = how; }, { reason: 'wishlist-streaming' });
        updated++;
        if (!App.storage.saveNow()) { failure = 'Storage unavailable; export a backup before closing.'; break; }
      }
    } catch (error) { if (!controller.signal.aborted) failure = error.message; }
    finally {
      streamingBusy = false; streamingController = null; button.disabled = false; $('#wishlistStreamingCancel').hidden = true;
      status.textContent = 'Checked ' + checked + '/' + targets.length + '; ' + updated + ' updated; ' + estimated + ' estimates; ' + unknown + ' unknown; ' + skipped + ' changed or being edited, skipped.' + (failure ? ' Stopped: ' + failure : controller.signal.aborted ? ' Stopped. Completed updates are saved.' : ' Complete.');
    }
  }
  function howValues() { return Array.from(new Set(saved().map(function (movie) { return movie.how; }).filter(Boolean))).sort(function (a, b) { return a.localeCompare(b); }).join('\n'); }
  function initBulkPivots() {
    let reviewed = null;
    function invalidate() { reviewed = null; $('#bulkPivotApply').disabled = true; $('#bulkPivotPreview').textContent = ''; $('#bulkPivotError').textContent = ''; $('#bulkPivotMovies').removeAttribute('aria-invalid'); }
    function preview() {
      invalidate();
      try {
        const result = model.bulkPivots(saved(), $('#bulkPivotTags').value, $('#bulkPivotMovies').value);
        const issues = result.rows.filter(function (row) { return row.error; });
        const matched = result.rows.filter(function (row) { return !row.error; });
        const issueList = issues.length ? '<section class="bulk-pivot-issues" aria-labelledby="bulkPivotIssuesTitle"><h3 id="bulkPivotIssuesTitle">Needs Attention (' + issues.length + ')</h3><ul>' + issues.map(function (row) {
          const label = row.error.startsWith('Not found') ? 'NOT FOUND' : row.error.startsWith('Multiple matches') ? 'MULTIPLE MATCHES' : 'CANNOT APPLY';
          return '<li><span class="bulk-pivot-issue-label">' + label + '</span><strong>' + esc(row.input) + '</strong><span>' + esc(row.error) + '</span></li>';
        }).join('') + '</ul><p>Correct the movie names or use TMDB IDs in the Movies box, then review again.</p></section>' : '';
        $('#bulkPivotPreview').innerHTML = issueList + '<p>' + result.changes.length + ' movies ' + (issues.length ? 'matched for updates (not applied)' : 'to update') + '.</p>' + (matched.length ? '<details' + (issues.length ? '' : ' open') + '><summary>Matched Movies (' + matched.length + ')</summary><ul>' + matched.map(function (row) {
          return '<li><strong>' + esc(row.title || row.input) + '</strong>: ' + (row.duplicate ? 'Already included above' : row.additions.length ? 'Append ' + esc(row.additions.join(', ')) : 'No change — pivots already present') + '</li>';
        }).join('') + '</ul></details>' : '');
        if (!result.valid) {
          $('#bulkPivotError').textContent = issues.length + ' movie ' + (issues.length === 1 ? 'entry needs' : 'entries need') + ' attention. Nothing can be applied until these are resolved.';
          $('#bulkPivotMovies').setAttribute('aria-invalid', 'true');
          $('#bulkPivotError').focus();
          $('#bulkPivotError').scrollIntoView({ block: 'start' });
        }
        else if (result.changes.length) { reviewed = result; $('#bulkPivotApply').disabled = false; }
      } catch (error) { $('#bulkPivotError').textContent = error.message; }
    }
    $('#bulkPivotsButton').addEventListener('click', function (event) {
      $('#bulkPivotsForm').reset(); invalidate();
      App.components.openDialog('#bulkPivotsDialog', { trigger: event.currentTarget, focus: '#bulkPivotTags' });
    });
    $('#bulkPivotTags').addEventListener('input', invalidate);
    $('#bulkPivotMovies').addEventListener('input', invalidate);
    $('#bulkPivotReview').addEventListener('click', preview);
    $('#bulkPivotsForm').addEventListener('submit', function (event) {
      event.preventDefault();
      if (!reviewed) return;
      try {
        const current = model.bulkPivots(saved(), $('#bulkPivotTags').value, $('#bulkPivotMovies').value);
        if (JSON.stringify(current) !== JSON.stringify(reviewed)) { preview(); $('#bulkPivotError').textContent = 'Movie data changed. Review the refreshed matches before applying.'; return; }
        if (!App.storage.saveRecovery('Before bulk pivot entry')) throw new Error('Could not save a recovery copy. No movies were changed.');
        const changes = new Map(current.changes.map(function (row) { return [row.id, row.after]; }));
        App.storage.mutate(function (next) { next.workspace.movies = next.workspace.movies.map(function (movie) { return changes.has(movie.id) ? model.normalize(Object.assign({}, movie, { other: changes.get(movie.id) })) : movie; }); }, { reason: 'bulk-pivots' });
        const persisted = App.storage.saveNow();
        reviewed = null;
        App.components.closeDialog('#bulkPivotsDialog');
        App.components.toast(persisted ? changes.size + ' movies updated.' : 'Changes kept for this session. Export a backup before closing.', { title: persisted ? 'Pivots appended' : 'Storage unavailable', kind: persisted ? 'success' : 'warning' });
      } catch (error) { $('#bulkPivotError').textContent = error.message; }
    });
  }
  function init() {
    initBulkPivots();
    $('#movieIncompleteButton').addEventListener('click', function () { incompleteOnly = !incompleteOnly; render(); });
    $('#movieHowValuesButton').addEventListener('click', function (event) { $('#movieHowValuesText').value = howValues(); App.components.openDialog('#movieHowValuesDialog', { trigger: event.currentTarget, focus: '#movieHowValuesText' }); });
    $('#movieHowValuesCopy').addEventListener('click', async function () { const input = $('#movieHowValuesText'); input.value = howValues(); try { await navigator.clipboard.writeText(input.value); App.components.toast('How values copied.', { title: 'Copied', kind: 'success' }); } catch (error) { input.focus(); input.select(); App.components.toast('List selected. Copy it using your keyboard.', { title: 'Copy List' }); } });
    document.querySelectorAll('[data-editor-priority]').forEach(function (button) { button.addEventListener('click', function () { const input = $('#movieForm').elements.priority; input.value = input.value === button.dataset.editorPriority ? '' : button.dataset.editorPriority; statusFields(); }); });
    $('#movieForm').querySelectorAll('.movie-date-field input').forEach(function (input) { input.addEventListener('input', dateFields); input.addEventListener('change', dateFields); });
    document.querySelectorAll('[data-editor-state]').forEach(function (button) { button.addEventListener('click', function () { $('#movieStatus').value = button.dataset.editorState; statusFields(); if (button.dataset.editorState === 'watched') $('#movieForm').elements.rating.focus(); else $('[data-editor-priority]').focus(); }); });
    $('#wishlistRulesDate').textContent = 'User-supplied US rules snapshot: ' + App.streamingRules.reviewedOn + '. Timing is estimated from the US theatrical opening (wide, then limited). Rights confidence does not guarantee a date. Older catalog needs title-specific research. Rules and title exceptions are bundled; no automatic web research runs during checks.';
    $('#wishlistRulesList').innerHTML = App.streamingRules.rules.map(function (rule) { return '<li>' + esc(rule.studio) + ' → ' + esc(rule.services.join(' / ')) + ' · ' + esc(rule.window) + ' · typical ' + (rule.typicalDays ? rule.typicalDays.join('–') + ' days' : 'unknown') + ' · min ' + (rule.minDays ? rule.minDays.join('–') : 'unknown') + ' · max ' + (rule.maxDays ? rule.maxDays.join('–') : 'unknown') + ' · ' + esc(rule.confidence) + ' rights confidence. ' + esc(rule.notes) + '</li>'; }).join('');
    $('#wishlistStreamingCancel').addEventListener('click', function () { streamingController?.abort(); });
    $("#wishlistStreamingButton").addEventListener("click", function () { fillStreaming(); });
    $("#movieSearch").addEventListener("input", function (event) { query = event.target.value; render(); });
    $("#moviesWorkspace").addEventListener("click", function (event) {
      const button = event.target.closest("button"); if (!button) return;
      if (button.dataset.movieColumnSort) {
        const key = button.dataset.movieColumnSort, current = sortPreference();
        const selected = current.key === key || (key === 'date' && current.key === 'watched' && filter === 'watched');
        setSort(key, selected ? (current.direction === 'asc' ? 'desc' : 'asc') : ['rating', 'date', 'release', 'watched'].includes(key) ? 'desc' : 'asc');
        document.querySelector('[data-movie-column-sort="' + key + '"]')?.focus();
      }
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
    $('#movieDetails').addEventListener('toggle', function () { if ($('#movieDetails').open) loadResponses(false); });
    $('#movieResponseReload').addEventListener('click', function () { loadResponses(true); });
    $("#movieDialog").addEventListener("close", function () { cancelLookup(); resetResponses(); });
    tokenSettings();
    $('#tmdbSettings').addEventListener('toggle', function () { if ($('#tmdbSettings').open) tokenSettings(); });
    $('#tmdbToken').addEventListener('focus', function () { if ($('#tmdbToken').value === TOKEN_MASK) $('#tmdbToken').select(); });
    $("#saveTmdbToken").addEventListener("click", function () {
      try { App.tmdb.saveToken($("#tmdbToken").value === TOKEN_MASK ? App.tmdb.token() : $("#tmdbToken").value, $("#rememberTmdbToken").checked); tokenSettings(); $("#tmdbCredentialStatus").textContent = "Token saved. Search for a movie to verify the connection."; }
      catch (error) { $("#tmdbCredentialStatus").textContent = error.message; }
    });
    $("#forgetTmdbToken").addEventListener("click", function () { cancelLookup(); try { App.tmdb.forget(); tokenSettings(); $("#tmdbCredentialStatus").textContent = "TMDB token forgotten."; } catch (error) { $("#tmdbCredentialStatus").textContent = error.message; } });
    window.addEventListener("app:statechange", function (event) { if (event.detail?.reason !== "movie-column-width") render(); });
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
