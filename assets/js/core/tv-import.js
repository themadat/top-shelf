(function () {
  'use strict';
  const App = window.LocalApp, u = App.utils;
  function titleKey(title) { return title.normalize('NFKC').toLocaleLowerCase('en-US').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim(); }
  function rows(input) {
    if (!input || input.format !== 'top-shelf-tv-import' || input.version !== 1 || !Array.isArray(input.shows) || !input.shows.length || input.shows.length > App.config.controls.maxTvShows) throw new Error('Choose a TV import JSON file with format top-shelf-tv-import, version 1, and a nonempty shows array.');
    if (new TextEncoder().encode(JSON.stringify(input)).length > App.config.controls.maxImportBytes) throw new Error('The TV import exceeds the 5 MiB limit.');
    const titles = new Set(), ids = new Set();
    return input.shows.map(function (row, index) {
      const prefix = 'Show ' + (index + 1) + ': ';
      if (!row || typeof row.title !== 'string' || !row.title.trim() || row.title.length > 300) throw new Error(prefix + 'enter a title (up to 300 characters).');
      if (!App.tv.statuses.includes(row.status)) throw new Error(prefix + 'choose a valid viewing status.');
      if (!Object.hasOwn(row, 'rating')) throw new Error(prefix + 'rating must be 0–5 or null for unrated.');
      if (row.rating !== null && (!Number.isInteger(row.rating) || row.rating < 0 || row.rating > 5)) throw new Error(prefix + 'rating must be 0–5 or null for unrated.');
      if (row.notes !== undefined && (typeof row.notes !== 'string' || row.notes.length > 20000)) throw new Error(prefix + 'notes must be text up to 20,000 characters.');
      if (row.tmdbId !== undefined && row.tmdbId !== null && (!Number.isSafeInteger(row.tmdbId) || row.tmdbId < 1)) throw new Error(prefix + 'invalid TMDB TV ID.');
      if (row.seriesStatus !== undefined && !['Active', 'Unknown'].includes(row.seriesStatus)) throw new Error(prefix + 'imported series status must be Active or Unknown.');
      const title = u.cleanLine(row.title, 300), key = titleKey(title);
      if (titles.has(key) || (row.tmdbId && ids.has(row.tmdbId))) throw new Error(prefix + 'duplicate show in the file. Resolve duplicates before importing.');
      titles.add(key); if (row.tmdbId) ids.add(row.tmdbId);
      const id = 'tv-import-' + u.fingerprint(key);
      return App.tv.normalize({ id: id, title: title, tmdbId: row.tmdbId || null, rating: row.rating, status: row.status, mode: 'Show', notes: row.notes || '',
        providerStatus: row.seriesStatus === 'Active' ? 'Imported: Active' : '', inProduction: null });
    });
  }
  function preview(existing, input) {
    const imported = rows(input), keys = new Map(), ids = new Map(), providers = new Map();
    existing.forEach(function (s) { ids.set(s.id, s); if (!s.deleted) keys.set(titleKey(s.title), s); if (s.tmdbId) providers.set(s.tmdbId, s); });
    const entries = imported.map(function (show) {
      const match = ids.get(show.id) || (show.tmdbId && providers.get(show.tmdbId)) || keys.get(titleKey(show.title));
      const link = match && !match.deleted && !match.tmdbId && show.tmdbId;
      return { show: show, matchId: match?.id || '', action: link ? 'link' : match ? 'skip' : 'add', skip: !!match && !link,
        reason: link ? 'Link TMDB ID · keep personal data' : match ? (match.deleted ? 'Previously deleted · skipped' : 'Already in library · kept unchanged') : 'Add' };
    });
    const additions = entries.filter(function (e) { return e.action === 'add'; }).map(function (e) { return e.show; });
    const links = new Map(entries.filter(function (e) { return e.action === 'link'; }).map(function (e) { return [e.matchId, e.show]; }));
    App.tv.normalizeList(existing.map(function (s) { const incoming = links.get(s.id); return incoming ? App.tv.normalize(Object.assign({}, s, { tmdbId: incoming.tmdbId, providerStatus: s.providerStatus || incoming.providerStatus })) : s; }).concat(additions));
    return { entries: entries, snapshot: u.stableJson(existing) };
  }
  function apply(existing, input, snapshot, selectedIds) {
    if (u.stableJson(existing) !== snapshot) throw new Error('TV data changed since this preview. Preview the file again before importing.');
    const result = preview(existing, input), selected = new Set(selectedIds);
    const chosen = result.entries.filter(function (e) { return !e.skip && selected.has(e.show.id); });
    if (!chosen.length) throw new Error('Select at least one show to add or link.');
    const links = new Map(chosen.filter(function (e) { return e.action === 'link'; }).map(function (e) { return [e.matchId, e.show]; }));
    const linked = existing.map(function (s) { const incoming = links.get(s.id); return incoming ? App.tv.normalize(Object.assign({}, s, { tmdbId: incoming.tmdbId, providerStatus: s.providerStatus || incoming.providerStatus })) : s; });
    const added = chosen.filter(function (e) { return e.action === 'add'; }).map(function (e) { return e.show; });
    return { shows: App.tv.normalizeList(linked.concat(added)), count: added.length, linked: links.size };
  }
  App.tvImport = { preview: preview, apply: apply };
})();
