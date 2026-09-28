(function () {
  "use strict";
  const App = window.LocalApp, u = App.utils, tv = App.tv, esc = u.escapeHtml;
  const $ = function (selector) { return document.querySelector(selector); };
  let draft = null, baseline = '', initial = '', existing = false, controller = null, generation = 0;
  const openSeasons = new Set(), pages = new Map();
  function saved(id) { return App.storage.getState().workspace.tvShows.find(function (s) { return s.id === id && !s.deleted; }); }
  function status(message) { $('#tvEditorStatus').textContent = message; }
  function stop() { generation++; controller?.abort(); controller = null; $('#tvForm').removeAttribute('aria-busy'); }
  function seasonKey(s) { return s.tmdbId ? 'id-' + s.tmdbId : 'number-' + s.number; }
  function seasonByKey(key) { return draft?.seasons.find(function (s) { return seasonKey(s) === key; }); }
  function episodeKey(e) { return e.tmdbId ? 'id-' + e.tmdbId : 'number-' + e.number; }
  function options(values, selected) { return values.map(function (s) { return '<option' + (s === selected ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join(''); }
  function ratingButtons(value, show, attributes) {
    const labels = show ? tv.showLabels : tv.episodeLabels;
    return labels.map(function (label, score) {
      if (!label) return '';
      return '<button type="button" class="tv-rating-button" ' + attributes + ' data-score="' + score + '" aria-pressed="' + (value === score) + '" title="' + esc(label) + '"><strong>' + score + '</strong><small>' + esc(label) + '</small></button>';
    }).join('') + '<button type="button" class="button small" ' + attributes + ' data-score="" aria-label="Clear rating">Clear</button>';
  }
  function episodeRating(value) {
    return '<option value="">— Unrated</option>' + tv.episodeLabels.map(function (label, score) { return label ? '<option value="' + score + '"' + (value === score ? ' selected' : '') + '>' + score + ' · ' + esc(label) + '</option>' : ''; }).join('');
  }
  function averages() {
    const a = tv.averages(draft);
    const text = function (label, value) { return label + ': ' + (value.count ? value.value.toFixed(2) + '/10 · ' + value.count + ' rated of ' + value.total + ' saved' : 'unrated'); };
    $('#tvAverages').textContent = text('Season average', a.seasons) + '  |  ' + text('Episode average', a.episodes);
  }
  function metadata() {
    $('#tvMetadata').innerHTML = '<p><strong>Series: ' + esc(tv.seriesStatus(draft)) + '</strong> · ' + esc(draft.firstAirDate || 'Unknown first air date') + (draft.lastAirDate ? ' – ' + esc(draft.lastAirDate) : '') + '</p>'
      + (draft.tmdbId ? '<small>TMDB TV ' + draft.tmdbId + ' · Provider status: ' + esc(draft.providerStatus || 'Unknown') + ' · Last checked: ' + esc(draft.fetchedAt ? new Date(draft.fetchedAt).toLocaleString() : 'Not checked on this device') + '</small>' : '<small>Manual entry · Link a TMDB result to fetch metadata.</small>')
      + '<p>' + esc([draft.genres.join(', '), draft.networks.join(', '), draft.companies.join(', ')].filter(Boolean).join(' · ')) + '</p>'
      + (draft.overview ? '<details><summary>Show overview</summary><p>' + esc(draft.overview) + '</p></details>' : '');
    $('#tvRefreshOne').hidden = !draft.tmdbId;
    averages();
  }
  function seasonContent(s) {
    const key = seasonKey(s), count = pages.get(key) || 50;
    let html = '<fieldset class="tv-rating-field"><legend>Season rating · 1–10</legend><div class="tv-rating-buttons">' + ratingButtons(s.rating, false, 'data-season-rating="' + key + '"') + '</div></fieldset>';
    html += '<div class="tv-season-tools">' + (draft.tmdbId && !s.orphaned ? '<button type="button" class="button small" data-load-season="' + key + '">' + (s.loaded ? 'Refresh episodes' : 'Load episodes') + '</button>' : '')
      + '<small>' + (s.loaded ? 'Episode details saved for offline use.' : 'Episode details have not been fetched.') + '</small></div>';
    if (s.episodes.length) {
      html += '<div class="tv-table-scroll"><table class="tv-episodes"><thead><tr><th>Episode</th><th>Air date</th><th>Watched</th><th>Rating · 1–10</th></tr></thead><tbody>';
      html += s.episodes.slice(0, count).map(function (e) {
        const attr = ' data-season="' + key + '" data-episode="' + episodeKey(e) + '"';
        return '<tr><td><strong>' + e.number + '</strong> · ' + esc(e.title || 'Untitled episode') + (e.orphaned ? '<small class="tv-orphan">Retained · missing from latest response</small>' : '') + '</td><td>' + esc(e.airDate || '—') + '</td><td><input type="checkbox" data-episode-watched' + attr + (e.watched ? ' checked' : '') + ' aria-label="Watched episode ' + e.number + '"></td><td><select data-episode-rating' + attr + ' aria-label="Rating for episode ' + e.number + '">' + episodeRating(e.rating) + '</select></td></tr>';
      }).join('') + '</tbody></table></div>';
      if (count < s.episodes.length) html += '<button type="button" class="button small" data-more-episodes="' + key + '">Show next 50 episodes (' + count + '/' + s.episodes.length + ')</button>';
    }
    html += '<div class="tv-manual-row"><label>Episode number<input type="number" min="1" max="100000" value="' + (Math.max(0, ...s.episodes.map(function (e) { return e.number; })) + 1) + '" data-new-episode="' + key + '"></label><button type="button" class="button small" data-add-episode="' + key + '">Add episode manually</button></div>';
    return html;
  }
  function renderSeasons() {
    $('#tvSeasons').innerHTML = draft.seasons.map(function (s) {
      const key = seasonKey(s);
      return '<details class="tv-season" data-season-key="' + key + '"' + (openSeasons.has(key) ? ' open' : '') + '><summary>' + esc(s.number === 0 ? 'Specials' : 'Season ' + s.number) + (s.title && s.title !== 'Season ' + s.number ? ' · ' + esc(s.title) : '') + ' <small>' + s.episodeCount + ' episodes · ' + (s.rating === null ? 'Unrated' : s.rating + '/10') + (s.orphaned ? ' · Retained: missing from latest response' : '') + '</small></summary><div class="tv-season-body">' + (openSeasons.has(key) ? seasonContent(s) : '') + '</div></details>';
    }).join('') || '<p>No seasons saved. Fetch show details or add a season manually.</p>';
  }
  function readFields() {
    if (!draft) return;
    draft.title = $('#tvName').value.trim(); draft.status = $('#tvStatus').value; draft.mode = $('#tvMode').value;
    draft.lastWatched = $('#tvLastWatched').value; draft.notes = $('#tvNotes').value;
  }
  function fill() {
    $('#tvName').value = draft.title; $('#tvStatus').innerHTML = options(tv.statuses, draft.status); $('#tvMode').innerHTML = options(tv.modes, draft.mode);
    $('#tvLastWatched').value = draft.lastWatched; $('#tvNotes').value = draft.notes;
    $('#tvShowRating').innerHTML = ratingButtons(draft.rating, true, 'data-show-rating');
    metadata(); renderSeasons();
  }
  function open(id, trigger) {
    stop(); openSeasons.clear(); pages.clear();
    const show = id ? saved(id) : null;
    if (id && !show) return;
    existing = !!show; baseline = show ? u.stableJson(show) : '';
    draft = tv.normalize(show || { title: 'New show' });
    if (!show) draft.title = '';
    const first = draft.seasons.find(function (s) { return s.number > 0; }) || draft.seasons[0];
    if (draft.mode !== 'Show' && first) openSeasons.add(seasonKey(first));
    initial = u.stableJson(draft);
    $('#tvDialogTitle').textContent = show ? 'Edit TV Show' : 'Add TV Show';
    $('#tvLookup').open = !show; $('#tvLookupQuery').value = ''; $('#tvLookupResults').innerHTML = '';
    $('#tvDelete').hidden = !show; status(''); fill();
    App.components.openDialog('#tvDialog', { trigger: trigger, focus: show ? '#tvName' : '#tvLookupQuery' });
    if (draft.mode === 'Episode' && first && !first.loaded && !first.orphaned && draft.tmdbId) loadSeason(seasonKey(first));
  }
  async function close() {
    readFields();
    if (draft && u.stableJson(draft) !== initial && !await App.components.confirm({ title: 'Discard TV changes?', message: 'Your unsaved changes to this show will be discarded.', confirmLabel: 'Discard', cancelLabel: 'Keep editing' })) return;
    App.components.closeDialog('#tvDialog');
  }
  function guard() {
    if (existing && u.stableJson(saved(draft.id)) !== baseline) throw new Error('This show changed elsewhere while you were editing. Your draft is still here. Copy any notes you need, then reopen the saved show.');
  }
  function save(event) {
    event.preventDefault(); readFields();
    try {
      guard();
      if (!draft.title) throw new Error('Enter a show title.');
      const show = tv.normalize(draft), all = App.storage.getState().workspace.tvShows;
      const next = existing ? all.map(function (s) { return s.id === show.id ? show : s; }) : all.concat(show);
      tv.normalizeList(next);
      App.storage.mutate(function (state) { state.workspace.tvShows = next; }, { reason: 'tv-save' });
      App.storage.saveNow(); App.components.closeDialog('#tvDialog');
    } catch (error) { status(error.message); }
  }
  async function remove() {
    if (!await App.components.confirm({ title: 'Delete this show?', message: 'The show and its season/episode ratings will be removed. A recovery copy is saved first.', confirmLabel: 'Delete', danger: true })) return;
    try {
      guard();
      if (!App.storage.saveRecovery('Before deleting TV show')) throw new Error('Could not save recovery. The show was not deleted.');
      App.storage.mutate(function (state) { state.workspace.tvShows = state.workspace.tvShows.map(function (s) { return s.id === draft.id ? { id: s.id, tmdbId: s.tmdbId, deleted: true } : s; }); }, { reason: 'tv-delete' });
      App.storage.saveNow(); App.components.closeDialog('#tvDialog');
    } catch (error) { status(error.message); }
  }
  async function request(action) {
    stop(); const sequence = generation, id = draft?.id;
    controller = new AbortController(); const signal = controller.signal;
    status('Loading from TMDB…'); $('#tvForm').setAttribute('aria-busy', 'true');
    try { await action(signal, function () { return generation === sequence && draft?.id === id && $('#tvDialog').open; }); }
    catch (error) { if (generation === sequence && error.name !== 'AbortError') status(error.message); }
    finally { if (generation === sequence) { controller = null; $('#tvForm').removeAttribute('aria-busy'); } }
  }
  function search() {
    const query = $('#tvLookupQuery').value.trim(); if (!query) return;
    $('#tvLookupResults').innerHTML = '';
    request(async function (signal, current) {
      const matches = /^\d+$/.test(query) ? [await App.tmdb.tvDetails(query, signal)].map(function (s) { return { id: s.tmdbId, name: s.title, original_name: s.originalTitle, first_air_date: s.firstAirDate }; }) : await App.tmdb.searchTv(query, signal);
      if (!current()) return;
      $('#tvLookupResults').innerHTML = matches.filter(function (s) { return Number.isSafeInteger(s.id) && s.id > 0; }).map(function (s) {
        return '<button class="button" type="button" data-tv-match="' + s.id + '">' + esc(s.name) + (s.original_name && s.original_name !== s.name ? ' · ' + esc(s.original_name) : '') + ' (' + esc(String(s.first_air_date || '').slice(0, 4) || 'Unknown year') + ')</button>';
      }).join('');
      status(matches.length ? 'Choose the matching show to link it.' : 'No matches. You can enter the show manually.');
    });
  }
  async function link(id) {
    if (draft.tmdbId && draft.tmdbId !== id) { status('This show is already linked. Add a separate show for a different series.'); return; }
    const confirmed = await App.components.confirm({ title: 'Link this TV show?', message: 'Use the selected TMDB show’s title and metadata? Your ratings, viewing status, and notes will stay.', confirmLabel: 'Link show', cancelLabel: 'Keep searching' });
    if (!confirmed || !draft) return;
    request(async function (signal, current) {
      const fresh = await App.tmdb.tvDetails(id, signal); if (!current()) return;
      if (App.storage.getState().workspace.tvShows.some(function (s) { return !s.deleted && s.tmdbId === id && s.id !== draft.id; })) throw new Error('This TV show is already in your library.');
      readFields(); draft = tv.refresh(draft, fresh); fill(); $('#tvLookup').open = false; status('Details loaded. Save Show to keep your changes.');
    });
  }
  function refresh() {
    request(async function (signal, current) {
      const fresh = await App.tmdb.tvDetails(draft.tmdbId, signal); if (!current()) return;
      readFields(); draft = tv.refresh(draft, fresh); fill(); status('Show metadata refreshed. Saved episode lists are preserved; refresh a season to update its episodes.');
    });
  }
  function loadSeason(key) {
    const s = seasonByKey(key); if (!s || !draft.tmdbId || s.orphaned) return;
    request(async function (signal, current) {
      const fresh = await App.tmdb.tvSeason(draft.tmdbId, s.number, signal); if (!current()) return;
      const latest = seasonByKey(key); if (!latest) return;
      if (latest.tmdbId && latest.tmdbId !== fresh.tmdbId) throw new Error('The season identity changed. Refresh the show first; your saved ratings are preserved.');
      const merged = tv.mergeSeason(latest, fresh);
      draft.seasons[draft.seasons.indexOf(latest)] = merged;
      openSeasons.delete(key); openSeasons.add(seasonKey(merged)); renderSeasons(); averages(); status('Episodes loaded. Save Show to keep them offline.');
    });
  }
  function init() {
    $('#tvForm').addEventListener('submit', save);
    ['#tvClose', '#tvCancel'].forEach(function (s) { $(s).addEventListener('click', close); });
    $('#tvDialog').addEventListener('cancel', function (event) { event.preventDefault(); close(); });
    $('#tvDialog').addEventListener('keydown', function (event) { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); } });
    $('#tvDialog').addEventListener('close', function () { stop(); draft = null; });
    $('#tvLookupButton').addEventListener('click', search);
    $('#tvLookupQuery').addEventListener('keydown', function (event) { if (event.key === 'Enter') { event.preventDefault(); search(); } });
    $('#tvDelete').addEventListener('click', remove); $('#tvRefreshOne').addEventListener('click', refresh);
    $('#tvMode').addEventListener('change', function () {
      readFields(); openSeasons.clear();
      const first = draft.seasons.find(function (s) { return s.number > 0; }) || draft.seasons[0];
      if (draft.mode !== 'Show' && first) openSeasons.add(seasonKey(first));
      renderSeasons();
      if (draft.mode === 'Episode' && first && !first.loaded && !first.orphaned && draft.tmdbId) loadSeason(seasonKey(first));
    });
    $('#tvAddSeason').addEventListener('click', function () {
      const number = Number($('#tvSeasonNumber').value);
      if ($('#tvSeasonNumber').value === '' || !Number.isInteger(number) || number < 0 || number > 100000 || draft.seasons.some(function (s) { return s.number === number; })) { status('Enter an unused season number (0 for specials).'); return; }
      try { draft = tv.normalize(Object.assign({}, draft, { seasons: draft.seasons.concat({ number: number, title: number ? 'Season ' + number : 'Specials' }) })); }
      catch (error) { status(error.message); return; }
      openSeasons.add('number-' + number); renderSeasons(); averages(); $('#tvSeasonNumber').value = number + 1;
    });
    $('#tvSeasons').addEventListener('toggle', function (event) {
      const details = event.target.closest('[data-season-key]'); if (!details || !details.isConnected || !draft) return;
      const key = details.dataset.seasonKey;
      if (!details.open) { openSeasons.delete(key); return; }
      openSeasons.add(key);
      const body = details.querySelector('.tv-season-body'), season = seasonByKey(key);
      if (!body.innerHTML) { body.innerHTML = seasonContent(season); if (draft.mode === 'Episode' && !season.loaded && draft.tmdbId && !controller) loadSeason(key); }
    }, true);
    $('#tvForm').addEventListener('click', function (event) {
      const button = event.target.closest('button'); if (!button || !draft) return;
      if (button.hasAttribute('data-show-rating')) {
        draft.rating = button.dataset.score === '' ? null : Number(button.dataset.score);
        $('#tvShowRating').querySelectorAll('[data-score]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.score !== '' && Number(b.dataset.score) === draft.rating)); });
      } else if (button.dataset.seasonRating) {
        const s = seasonByKey(button.dataset.seasonRating); s.rating = button.dataset.score === '' ? null : Number(button.dataset.score);
        button.parentElement.querySelectorAll('[data-score]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.score !== '' && Number(b.dataset.score) === s.rating)); });
        const summary = button.closest('details').querySelector('summary small'); summary.textContent = s.episodeCount + ' episodes · ' + (s.rating === null ? 'Unrated' : s.rating + '/10') + (s.orphaned ? ' · Retained' : ''); averages();
      } else if (button.dataset.tvMatch) link(Number(button.dataset.tvMatch));
      else if (button.dataset.loadSeason) loadSeason(button.dataset.loadSeason);
      else if (button.dataset.moreEpisodes) { const key = button.dataset.moreEpisodes; pages.set(key, (pages.get(key) || 50) + 50); renderSeasons(); }
      else if (button.dataset.addEpisode) {
        const key = button.dataset.addEpisode, s = seasonByKey(key), input = button.parentElement.querySelector('input'), number = Number(input.value);
        if (!Number.isInteger(number) || number < 1 || number > 100000 || s.episodes.some(function (e) { return e.number === number; })) { status('Enter an unused episode number.'); return; }
        const next = u.clone(draft), target = next.seasons.find(function (x) { return seasonKey(x) === key; });
        target.episodes.push({ number: number, title: 'Episode ' + number }); target.episodeCount = Math.max(target.episodeCount, target.episodes.length);
        try { draft = tv.normalize(next); pages.set(key, s.episodes.length + 1); renderSeasons(); averages(); } catch (error) { status(error.message); }
      }
    });
    $('#tvSeasons').addEventListener('change', function (event) {
      const el = event.target, s = seasonByKey(el.dataset.season); if (!s) return;
      const e = s.episodes.find(function (e) { return episodeKey(e) === el.dataset.episode; }); if (!e) return;
      if (el.hasAttribute('data-episode-watched')) e.watched = el.checked;
      if (el.hasAttribute('data-episode-rating')) { e.rating = el.value === '' ? null : Number(el.value); if (e.rating !== null) { e.watched = e.rating > 1; el.closest('tr').querySelector('input').checked = e.watched; } }
      averages();
    });
  }
  App.tvEditor = { init: init, open: open, isEditing: function (id) { return draft?.id === id && $('#tvDialog').open; } };
})();
