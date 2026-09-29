(function () {
  "use strict";
  const App = window.LocalApp, u = App.utils, tv = App.tv, esc = u.escapeHtml;
  const $ = function (selector) { return document.querySelector(selector); };
  let draft = null, baseline = '', initial = '', existing = false, controller = null, generation = 0;
  let compactEpisodes = false;
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
    return '<option value="">— Unrated</option>' + Array.from({ length: 19 }, function (_, i) {
      const score = 1 + i / 2, label = tv.episodeLabels[score] || 'Between ' + Math.floor(score) + ' and ' + Math.ceil(score);
      return '<option value="' + score + '"' + (value === score ? ' selected' : '') + '>' + score + ' · ' + esc(label) + '</option>';
    }).join('');
  }
  function averages() {
    const a = tv.averages(draft);
    const text = function (label, value) { return label + ': ' + (value.count ? value.value.toFixed(2) + '/10 · ' + value.count + ' rated of ' + value.total + ' saved' : 'unrated'); };
    const all = draft.seasons.flatMap(function (s) { return s.episodes; }).filter(function (e) { return e.rating !== null; });
    const includingSpecials = draft.seasons.some(function (s) { return s.number === 0 && s.episodes.some(function (e) { return e.rating !== null; }); }) && all.length ? '  |  Including specials: ' + (all.reduce(function (n, e) { return n + e.rating; }, 0) / all.length).toFixed(1) + '/10' : '';
    $('#tvAverages').textContent = text('Season average', a.seasons) + '  |  ' + text('Episode average', a.episodes) + includingSpecials;
  }
  function metadata() {
    $('#tvMetadata').innerHTML = '<p><strong>Series: ' + esc(tv.seriesStatus(draft)) + '</strong> · ' + esc(draft.firstAirDate || 'Unknown first air date') + (draft.lastAirDate ? ' – ' + esc(draft.lastAirDate) : '') + '</p>'
      + (draft.tmdbId ? '<small>TMDB TV ' + draft.tmdbId + ' · ' + (draft.providerStatus === 'Imported: Active' ? 'Active per imported list; TMDB details not fetched' : 'Provider status: ' + esc(draft.providerStatus || 'Unknown')) + ' · Last checked: ' + esc(draft.fetchedAt ? new Date(draft.fetchedAt).toLocaleString() : 'Not checked on this device') + '</small>' : '<small>' + (draft.providerStatus === 'Imported: Active' ? 'Active per imported list · ' : '') + 'Manual entry · Link a TMDB result to fetch metadata.</small>')
      + '<p>In production: ' + (draft.inProduction === null ? 'Unknown' : draft.inProduction ? 'Yes' : 'No') + '</p>'
      + '<p>' + esc([draft.genres.join(', '), draft.networks.join(', '), draft.companies.join(', ')].filter(Boolean).join(' · ')) + '</p>'
      + (draft.overview ? '<details><summary>Show overview</summary><p>' + esc(draft.overview) + '</p></details>' : '');
    $('#tvRefreshOne').hidden = !draft.tmdbId;
    averages();
  }
  const episodeColumns = ['episode', 'rating', 'notes'];
  function episodeWidths() {
    const saved = App.storage.getState().ui.tv.episodeWidths || {};
    return episodeColumns.map(function (key, i) { return saved[key] || [240, 64, 650][i]; });
  }
  function resizeEpisodeColumn(index, width, persist) {
    const widths = episodeWidths(); widths[index] = Math.round(Math.max(index === 1 ? 45 : 100, Math.min(2000, width)));
    document.querySelectorAll('.tv-episodes').forEach(function (table) {
      table.style.width = widths.reduce(function (a, b) { return a + b; }, 0) + 'px';
      table.querySelectorAll('col').forEach(function (col, i) { col.style.width = widths[i] + 'px'; });
      table.querySelectorAll('[data-episode-resize]').forEach(function (handle, i) { handle.setAttribute('aria-valuenow', widths[i]); });
    });
    if (persist) App.storage.mutate(function (state) { state.ui.tv.episodeWidths = Object.assign({}, state.ui.tv.episodeWidths, { [episodeColumns[index]]: widths[index] }); }, { reason: 'tv-episode-width', touch: false });
  }
  function seasonContent(s) {
    const key = seasonKey(s), count = pages.get(key) || 50, widths = episodeWidths();
    let tools = '<fieldset class="tv-rating-field"><legend>Season rating · 1–10</legend><div class="tv-rating-buttons">' + ratingButtons(s.rating, false, 'data-season-rating="' + key + '"') + '</div></fieldset>';
    tools += '<label class="tv-notes-label">Season notes<textarea data-season-notes="' + key + '" maxlength="20000">' + esc(s.notes) + '</textarea></label>';
    tools += '<div class="tv-season-tools">' + (draft.tmdbId && !s.orphaned ? '<button type="button" class="button small" data-load-season="' + key + '">' + (s.loaded ? 'Refresh episodes' : 'Load episodes') + '</button>' : '')
      + '<small>' + (s.loaded ? 'Episode details saved for offline use.' : 'Episode details have not been fetched.') + '</small></div>';
    let html = '';
    if (s.episodes.length) {
      html += '<div class="tv-table-scroll"><table class="tv-episodes" style="width:' + widths.reduce(function (a, b) { return a + b; }, 0) + 'px"><colgroup>' + widths.map(function (width) { return '<col style="width:' + width + 'px">'; }).join('') + '</colgroup><thead><tr>' + ['Episode', '#', 'Notes'].map(function (label, i) { return '<th scope="col">' + label + '<span class="pivot-resizer" role="separator" tabindex="0" data-episode-resize="' + i + '" aria-orientation="vertical" aria-label="Resize ' + episodeColumns[i] + ' column" aria-valuenow="' + widths[i] + '" title="Drag or use arrow keys to resize">' + '</span></th>'; }).join('') + '</tr></thead><tbody>';
      html += s.episodes.slice(0, count).map(function (e) {
        const attr = ' data-season="' + key + '" data-episode="' + episodeKey(e) + '"';
        return '<tr><td><strong>' + e.number + '</strong> · ' + esc(e.title || 'Untitled episode') + (e.orphaned ? '<small class="tv-orphan">Retained · missing from latest response</small>' : '') + '</td><td><span class="tv-episode-score"><span class="movie-score" style="background:' + (e.rating === null ? 'var(--surface-2)' : App.movies.color(e.rating / 2, false)) + ';color:' + (e.rating === null ? 'var(--text)' : '#fff') + '" aria-hidden="true">' + (e.rating ?? '—') + '</span><select data-episode-rating' + attr + ' aria-label="Rating for episode ' + e.number + '">' + episodeRating(e.rating) + '</select></span></td><td><textarea class="tv-episode-note-input" rows="1" maxlength="20000" data-episode-notes' + attr + ' aria-label="Notes for episode ' + e.number + '" placeholder="Add notes…">' + esc(e.notes) + '</textarea></td></tr>' ;
      }).join('') + '</tbody></table></div>';
      if (count < s.episodes.length) html += '<button type="button" class="button small" data-more-episodes="' + key + '">Show next 50 episodes (' + count + '/' + s.episodes.length + ')</button>';
    }
    tools += '<div class="tv-manual-row"><label>Episode number<input type="number" min="1" max="100000" value="' + (Math.max(0, ...s.episodes.map(function (e) { return e.number; })) + 1) + '" data-new-episode="' + key + '"></label><button type="button" class="button small" data-add-episode="' + key + '">Add episode manually</button></div>';
    return compactEpisodes ? html + '<details class="tv-season-edit-tools"><summary>Season rating, notes &amp; episode tools</summary>' + tools + '</details>' : tools + html;
  }
  function renderSeasons() {
    $('#tvDialog').classList.toggle('tv-compact-dialog', compactEpisodes);
    $('#tvSeasons').classList.toggle('tv-compact-episodes', compactEpisodes);
    $('#tvEpisodeView').textContent = compactEpisodes ? 'Detailed view' : 'Compact view';
    $('#tvEpisodeView').setAttribute('aria-pressed', String(compactEpisodes));
    $('#tvSeasons').innerHTML = draft.seasons.map(function (s) {
      const key = seasonKey(s);
      const rated = s.episodes.filter(function (e) { return e.rating !== null; });
      const average = rated.length ? ' · Episode average ' + (rated.reduce(function (n, e) { return n + e.rating; }, 0) / rated.length).toFixed(1) + '/10' : '';
      return '<details class="tv-season" data-season-key="' + key + '"' + (openSeasons.has(key) ? ' open' : '') + '><summary>' + esc(s.number === 0 ? 'Specials' : 'Season ' + s.number) + (s.title && s.title !== 'Season ' + s.number ? ' · ' + esc(s.title) : '') + ' <small>' + s.episodeCount + ' episodes · ' + (s.rating === null ? 'Unrated' : s.rating + '/10') + average + (s.orphaned ? ' · Retained: missing from latest response' : '') + '</small></summary><div class="tv-season-body">' + (openSeasons.has(key) ? seasonContent(s) : '') + '</div></details>';
    }).join('') || '<p>No seasons saved. Fetch show details or add a season manually.</p>';
  }
  function readFields() {
    if (!draft) return;
    draft.title = $('#tvName').value.trim(); draft.status = $('#tvStatus').value;
    draft.lastWatched = $('#tvLastWatched').value; draft.notes = $('#tvNotes').value; draft.seasonRanking = $('#tvSeasonRanking').value;
  }
  function fill() {
    $('#tvName').value = draft.title; $('#tvStatus').innerHTML = options(tv.statuses, draft.status);
    $('#tvLastWatched').value = draft.lastWatched; $('#tvNotes').value = draft.notes; $('#tvSeasonRanking').value = draft.seasonRanking;
    $('#tvShowRating').innerHTML = ratingButtons(draft.rating, true, 'data-show-rating');
    $('#tvShowDetails').open = !compactEpisodes;
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
    const episodes = draft.seasons.flatMap(function (s) { return s.episodes; });
    compactEpisodes = episodes.length > 0 && episodes.every(function (e) { return e.rating !== null; }) && draft.seasons.every(function (s) { return s.episodes.length >= s.episodeCount; }) && (draft.numberOfEpisodes === null || episodes.length >= draft.numberOfEpisodes) && (draft.numberOfSeasons === null || draft.seasons.filter(function (s) { return s.number > 0 && !s.orphaned; }).length >= draft.numberOfSeasons);
    if (compactEpisodes) draft.seasons.forEach(function (s) { openSeasons.add(seasonKey(s)); });
    if (draft.mode !== 'Show' && first) openSeasons.add(seasonKey(first));
    initial = u.stableJson(draft);
    $('#tvDialogTitle').textContent = show ? 'Edit TV Show' : 'Add TV Show';
    $('#tvLookup').open = !show; $('#tvLookupQuery').value = ''; $('#tvLookupResults').innerHTML = '';
    $('#tvDelete').hidden = !show; status(''); fill();
    App.components.openDialog('#tvDialog', { trigger: trigger, focus: show ? '#tvName' : '#tvLookupQuery' });

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
      if (!body.innerHTML) body.innerHTML = seasonContent(season);
    }, true);
    $('#tvForm').addEventListener('click', function (event) {
      const button = event.target.closest('button'); if (!button || !draft) return;
      if (button.hasAttribute('data-show-rating')) {
        draft.rating = button.dataset.score === '' ? null : Number(button.dataset.score);
        $('#tvShowRating').querySelectorAll('[data-score]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.score !== '' && Number(b.dataset.score) === draft.rating)); });
      } else if (button.dataset.seasonRating) {
        const s = seasonByKey(button.dataset.seasonRating); s.rating = button.dataset.score === '' ? null : Number(button.dataset.score);
        button.parentElement.querySelectorAll('[data-score]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.score !== '' && Number(b.dataset.score) === s.rating)); });
        const summary = button.closest('.tv-season').querySelector('summary small'); summary.textContent = s.episodeCount + ' episodes · ' + (s.rating === null ? 'Unrated' : s.rating + '/10') + (s.orphaned ? ' · Retained' : ''); averages();
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
    $('#tvSeasons').addEventListener('keydown', function (event) {
      const handle = event.target.closest('[data-episode-resize]');
      if (!handle || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault(); const index = Number(handle.dataset.episodeResize);
      resizeEpisodeColumn(index, episodeWidths()[index] + (event.key === 'ArrowRight' ? 12 : -12), true);
    });
    $('#tvSeasons').addEventListener('pointerdown', function (event) {
      const handle = event.target.closest('[data-episode-resize]'); if (!handle || event.button !== 0) return;
      event.preventDefault(); const index = Number(handle.dataset.episodeResize), start = event.clientX, width = episodeWidths()[index]; let next = width;
      handle.setPointerCapture(event.pointerId);
      const move = function (e) { next = width + e.clientX - start; resizeEpisodeColumn(index, next, false); };
      const end = function () { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', end); handle.removeEventListener('pointercancel', end); resizeEpisodeColumn(index, next, true); };
      handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', end); handle.addEventListener('pointercancel', end);
    });
    $('#tvEpisodeView').addEventListener('click', function () { compactEpisodes = !compactEpisodes; $('#tvShowDetails').open = !compactEpisodes; draft.seasons.forEach(function (s) { openSeasons.add(seasonKey(s)); }); renderSeasons(); });
    $('#tvSeasons').addEventListener('change', function (event) {
      const el = event.target;
      if (el.dataset.seasonNotes) { const season = seasonByKey(el.dataset.seasonNotes); if (season) season.notes = el.value; return; }
      const s = seasonByKey(el.dataset.season); if (!s) return;
      const e = s.episodes.find(function (e) { return episodeKey(e) === el.dataset.episode; }); if (!e) return;
      if (el.hasAttribute('data-episode-notes')) e.notes = el.value;
      if (el.hasAttribute('data-episode-watched')) e.watched = el.checked;
      if (el.hasAttribute('data-episode-rating')) { e.rating = el.value === '' ? null : Number(el.value); if (e.rating !== null) e.watched = e.rating > 1; const badge = el.parentElement.querySelector('.movie-score'); badge.textContent = e.rating ?? '—'; badge.style.background = e.rating === null ? 'var(--surface-2)' : App.movies.color(e.rating / 2, false); badge.style.color = e.rating === null ? 'var(--text)' : '#fff'; }
      averages();
    });
  }
  App.tvEditor = { init: init, open: open, isEditing: function (id) { return draft?.id === id && $('#tvDialog').open; } };
})();
