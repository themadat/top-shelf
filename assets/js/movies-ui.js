(function () {
  "use strict";
  const App = window.LocalApp, u = App.utils, model = App.movies;
  const $ = function (selector) { return document.querySelector(selector); };
  const esc = u.escapeHtml;
  let draft = null, lookupController = null, generation = 0;
  let filter = "all", query = "", sort = "title";
  function saved() { return App.storage.getState().workspace.movies.filter(function (movie) { return !movie.deleted; }); }
  function cancelLookup() { generation += 1; lookupController?.abort(); lookupController = null; $("#movieLookupButton").disabled = false; $("#movieLookupResults").removeAttribute("aria-busy"); }
  function fields() { const form = $("#movieForm"); return Object.fromEntries(new FormData(form).entries()); }
  function statusFields() {
    const watched = $("#movieStatus").value === "watched";
    $("#wishlistFields").hidden = watched; $("#watchedFields").hidden = !watched;
    ["rating", "review"].forEach(function (name) { $("#movieForm").elements[name].required = watched; });
    const form = $("#movieForm"), historical = form.elements.historicalRating.value;
    form.elements.rating.readOnly = !!historical;
    if (historical) form.elements.rating.value = model.historicalRatings[historical];
    $("#movieRatingPreview").style.background = model.color($("#movieForm").elements.rating.value || 1, false);
    $("#moviePriorityPreview").style.background = model.color($("#movieForm").elements.priority.value || 1, true);
  }
  function metadata() {
    const v = draft || {};
    $("#movieMetadata").innerHTML = [["TMDB ID", v.tmdbId], ["Release date", v.releaseDate || "Not announced"], ["Genres", (v.genres || []).join(", ")], ["Production companies", (v.productionCompanies || []).join(", ")], ["Director", (v.directors || []).join(", ")], ["Actors", (v.actors || []).join(", ")], ["Collections", (v.collections || []).join(", ")]].map(function (entry) { return '<div><dt>' + entry[0] + '</dt><dd>' + esc(String(entry[1] || "—")) + '</dd></div>'; }).join("");
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
    $("#movieDialogTitle").textContent = current ? "Edit movie" : "Add movie";
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
          return '<button type="button" class="movie-search-result" data-tmdb-id="' + movie.id + '"><strong>' + esc(movie.title || "Untitled") + '</strong><small>' + esc(movie.release_date || "Release date not announced") + ' · TMDB ' + movie.id + '</small><span>' + esc(u.cleanText(movie.overview, 240)) + '</span></button>';
        }).join("") : '<p class="inline-status">No movies found. Try another title or a TMDB ID.</p>';
      }
    } catch (error) { if (sequence === generation && error.name !== "AbortError") $("#movieError").textContent = error.message; }
    finally { if (sequence === generation) { $("#movieLookupButton").disabled = false; $("#movieLookupResults").removeAttribute("aria-busy"); } }
  }
  function badge(movie) {
    if (movie.status === "watched") return '<span class="movie-score" style="background:' + model.color(movie.rating, false) + '">' + (movie.historicalRating ? esc(movie.historicalRating) + ' · ' : 'Rating ') + (Number.isInteger(movie.rating) ? movie.rating.toFixed(1) : String(movie.rating)) + '</span>';
    return movie.priority == null ? '' : '<span class="movie-priority" style="background:' + model.color(movie.priority, true) + '">Priority ' + movie.priority + '</span>';
  }
  function render() {
    const items = saved(), wishlist = items.filter(function (movie) { return movie.status === "wishlist"; }).length;
    $("#movieTotal").textContent = items.length + (items.length === 1 ? " movie" : " movies");
    document.querySelectorAll("[data-movie-filter]").forEach(function (button) { const value = button.dataset.movieFilter; button.setAttribute("aria-pressed", String(filter === value)); button.querySelector("small").textContent = value === "all" ? items.length : value === "wishlist" ? wishlist : items.length - wishlist; });
    const visible = items.filter(function (movie) { return (filter === "all" || movie.status === filter) && model.searchable(movie).includes(query.toLowerCase().trim()); });
    visible.sort(function (a, b) {
      if (sort === "rating") return (b.rating ?? -1) - (a.rating ?? -1) || a.title.localeCompare(b.title);
      if (sort === "priority") return (a.priority ?? 6) - (b.priority ?? 6) || a.title.localeCompare(b.title);
      if (sort === "release") return (b.releaseDate || "").localeCompare(a.releaseDate || "") || a.title.localeCompare(b.title);
      if (sort === "watched") return (b.watchedDate || "").localeCompare(a.watchedDate || "") || a.title.localeCompare(b.title);
      return a.title.localeCompare(b.title);
    });
    $("#movieResultsCount").textContent = visible.length + " shown";
    $("#movieList").innerHTML = visible.length ? visible.map(function (movie) {
      const details = [["How", movie.how], ["Other", movie.other], ["Genres", movie.genres.join(", ")], ["Production companies", movie.productionCompanies.join(", ")], ["Director", movie.directors.join(", ")], ["Actors", movie.actors.join(", ")], ["Collections", movie.collections.join(", ")]];
      return '<article class="movie-card"><div class="movie-card-top"><span class="movie-state">' + (movie.status === "watched" ? "Watched" : "Wishlist") + '</span>' + badge(movie) + '</div><h2>' + esc(movie.title) + '</h2><p class="movie-muted">Released ' + esc(movie.releaseDate || "TBA") + ' · <a href="https://www.themoviedb.org/movie/' + movie.tmdbId + '" target="_blank" rel="noopener noreferrer">TMDB ' + movie.tmdbId + '</a></p><p class="movie-date">' + (movie.status === "watched" ? (movie.watchedDate ? 'Watched ' + esc(movie.watchedDate) : 'Watch date unknown') : movie.availableDate ? 'Available ' + esc(movie.availableDate) : 'No availability date set') + '</p>' + (movie.status === "watched" ? '<p class="movie-review">' + esc(movie.review) + '</p>' : movie.notes ? '<p class="movie-review">' + esc(movie.notes) + '</p>' : '') + '<details><summary>Movie details</summary><dl class="movie-details">' + details.map(function (entry) { return '<div><dt>' + entry[0] + '</dt><dd>' + esc(entry[1] || "—") + '</dd></div>'; }).join("") + '</dl></details><footer><button class="button" type="button" data-edit-movie="' + esc(movie.id) + '">Edit movie</button>' + (movie.status === "wishlist" ? '<button type="button" class="button primary" data-watch-movie="' + esc(movie.id) + '">Mark watched</button>' : '') + '</footer></article>';
    }).join("") : '<div class="movie-empty"><span aria-hidden="true">' + App.icons.markup("shelfMovies") + '</span><h2>' + (items.length ? "No movies match" : "Make room for a great movie") + '</h2><p>' + (items.length ? "Try another search or movie state." : "Build your wishlist or add something you’ve already watched.") + '</p><button type="button" class="button primary" data-add-movie>Add movie</button></div>';
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
      if (button.hasAttribute("data-add-movie")) open(null, button);
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
    render();
  }
  App.moviesUI = { init: init, render: render, open: open };
})();
