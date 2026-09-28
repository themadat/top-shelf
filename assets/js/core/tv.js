(function () {
  "use strict";
  const App = window.LocalApp, u = App.utils;
  const statuses = ['Watching', 'Caught Up', 'Completed', 'Stopped'];
  const modes = ['Show', 'Season', 'Episode'];
  const showLabels = ['Terrible', 'Below Average', 'Average', 'Above Average', 'Elite', 'Legendary'];
  const episodeLabels = ['', 'Did not Finish', 'Wtf did I just watch', 'Horrible', 'Bad', 'Meh', 'Average', 'Good', 'Great', 'Phenomenal', 'Best of the Best'];
  function integer(value, min, max) { return Number.isInteger(value) && value >= min && value <= max; }
  function rating(value, show) {
    if (value === null || value === undefined || value === '') return null;
    if (!integer(value, show ? 0 : 1, show ? 5 : 10)) throw new Error('Invalid TV rating. Use a whole number on the selected scale.');
    return value;
  }
  function providerId(value) { return integer(value, 1, Number.MAX_SAFE_INTEGER) ? value : null; }
  function number(value, min) {
    if (!integer(value, min, 100000)) throw new Error('Invalid season or episode number.');
    return value;
  }
  function collection(value, limit, label) {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > limit) throw new Error(label + ' exceeds the supported collection limit.');
    return value;
  }
  function unique(items, key, label) {
    const seen = new Set();
    items.forEach(function (item) { const id = key(item); if (id === null) return; if (seen.has(id)) throw new Error('Duplicate ' + label + '.'); seen.add(id); });
    return items;
  }
  function date(value) { return App.movies.date(value); }
  function count(value) { return integer(value, 0, 1000000) ? value : null; }
  function average(value) { return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10 ? value : null; }
  function episode(input) {
    const s = u.plainObject(input);
    return { tmdbId: providerId(s.tmdbId), number: number(s.number, 1), title: u.cleanLine(s.title, 300), airDate: date(s.airDate), rating: rating(s.rating), watched: s.watched === true, orphaned: s.orphaned === true };
  }
  function season(input) {
    const s = u.plainObject(input);
    const episodes = collection(s.episodes, 5000, 'Episodes').map(episode);
    unique(episodes, function (e) { return e.tmdbId; }, 'episode ID');
    unique(episodes.filter(function (e) { return !e.orphaned; }), function (e) { return e.number; }, 'episode number');
    return { tmdbId: providerId(s.tmdbId), number: number(s.number, 0), title: u.cleanLine(s.title, 300), airDate: date(s.airDate), episodeCount: integer(s.episodeCount, 0, 100000) ? s.episodeCount : episodes.length,
      rating: rating(s.rating), loaded: s.loaded === true, orphaned: s.orphaned === true, fetchedAt: s.fetchedAt ? u.ensureIso(s.fetchedAt, '') : '', episodes: episodes };
  }
  function normalize(input) {
    const s = u.plainObject(input), id = u.cleanLine(s.id, 100);
    if (id && !/^[a-z0-9_-]+$/i.test(id)) throw new Error('Invalid TV record ID.');
    if (s.deleted) return { id: id || u.uid('tv'), tmdbId: providerId(s.tmdbId), deleted: true };
    const seasons = collection(s.seasons, 500, 'Seasons').map(season);
    unique(seasons, function (s) { return s.tmdbId; }, 'season ID');
    unique(seasons.filter(function (s) { return !s.orphaned; }), function (s) { return s.number; }, 'season number');
    if (seasons.reduce(function (n, s) { return n + s.episodes.length; }, 0) > 30000) throw new Error('A show may contain up to 30,000 loaded episodes.');
    const names = function (value) { return collection(value, 200, 'Metadata').map(function (n) { return u.cleanLine(n, 200); }).filter(Boolean); };
    return { id: id || u.uid('tv'), tmdbId: providerId(s.tmdbId), title: u.cleanLine(s.title, 300) || 'Untitled show', originalTitle: u.cleanLine(s.originalTitle, 300), overview: u.cleanText(s.overview, 5000),
      firstAirDate: date(s.firstAirDate), lastAirDate: date(s.lastAirDate), type: u.cleanLine(s.type, 100), genres: names(s.genres), networks: names(s.networks), companies: names(s.companies),
      numberOfSeasons: count(s.numberOfSeasons), numberOfEpisodes: count(s.numberOfEpisodes), voteAverage: average(s.voteAverage),
      providerStatus: u.cleanLine(s.providerStatus, 100), inProduction: typeof s.inProduction === 'boolean' ? s.inProduction : null,
      fetchedAt: s.fetchedAt ? u.ensureIso(s.fetchedAt, '') : '', status: statuses.includes(s.status) ? s.status : 'Watching', mode: modes.includes(s.mode) ? s.mode : 'Show',
      rating: rating(s.rating, true), notes: u.cleanText(s.notes, 20000), lastWatched: u.cleanLine(s.lastWatched, 100), seasons: seasons };
  }
  function normalizeList(value) {
    const source = collection(value, App.config.controls.maxTvShows, 'TV shows');
    if (source.length && new TextEncoder().encode(JSON.stringify(source)).length > App.config.controls.maxImportBytes) throw new Error('TV data exceeds the supported size limit.');
    if (source.some(function (s) { return !s || typeof s.id !== 'string' || !s.id || (s.tmdbId !== null && s.tmdbId !== undefined && !providerId(s.tmdbId)); })) throw new Error('Invalid saved TV show identity.');
    const list = source.map(normalize);
    unique(list, function (s) { return s.id; }, 'TV record ID');
    unique(list.filter(function (s) { return !s.deleted; }), function (s) { return s.tmdbId; }, 'TMDB TV ID');
    return list;
  }
  function seriesStatus(show) {
    const raw = show.providerStatus;
    if (raw === 'Imported: Active') return 'Active';
    if (['Ended', 'Canceled'].includes(raw)) return show.inProduction === true ? 'Unknown' : raw;
    if (['Returning Series', 'In Production'].includes(raw)) return show.inProduction === false ? 'Unknown' : 'Active';
    if (['Planned', 'Pilot'].includes(raw)) return 'Upcoming';
    return 'Unknown';
  }
  function averages(show) {
    const seasons = show.seasons.filter(function (s) { return s.number !== 0; });
    const aggregate = function (items) { const scores = items.map(function (x) { return x.rating; }).filter(function (r) { return r !== null; }); return { count: scores.length, total: items.length, value: scores.length ? scores.reduce(function (a, b) { return a + b; }, 0) / scores.length : null }; };
    return { seasons: aggregate(seasons), episodes: aggregate(seasons.flatMap(function (s) { return s.episodes; })) };
  }
  function fromTmdb(raw) {
    if (!providerId(raw?.id) || !u.cleanLine(raw.name, 300) || !Array.isArray(raw.seasons)) throw new Error('TMDB returned invalid TV details.');
    const names = function (items) { return (items || []).map(function (x) { return x.name; }); };
    return normalize({ tmdbId: raw.id, title: raw.name, originalTitle: raw.original_name, overview: raw.overview, firstAirDate: raw.first_air_date, lastAirDate: raw.last_air_date, type: raw.type,
      numberOfSeasons: raw.number_of_seasons, numberOfEpisodes: raw.number_of_episodes, voteAverage: raw.vote_average,
      genres: names(raw.genres), networks: names(raw.networks), companies: names(raw.production_companies), providerStatus: raw.status, inProduction: raw.in_production, fetchedAt: u.isoNow(),
      seasons: raw.seasons.map(function (s) { return { tmdbId: s.id, number: s.season_number, title: s.name, airDate: s.air_date, episodeCount: s.episode_count }; }) });
  }
  function seasonFromTmdb(raw) {
    if (!providerId(raw?.id) || !Array.isArray(raw.episodes)) throw new Error('TMDB returned invalid season details.');
    return season({ tmdbId: raw.id, number: raw.season_number, title: raw.name, airDate: raw.air_date, episodeCount: raw.episodes.length, loaded: true, fetchedAt: u.isoNow(),
      episodes: raw.episodes.map(function (e) { return { tmdbId: e.id, number: e.episode_number, title: e.name, airDate: e.air_date }; }) });
  }
  // Stable provider IDs win over numbers. Retain removed entries for explicit review.
  function mergeEntries(old, incoming, merge) {
    const used = new Set();
    const result = incoming.map(function (entry) {
      const prior = old.find(function (p) { return !used.has(p) && entry.tmdbId && p.tmdbId === entry.tmdbId; })
        || old.find(function (p) { return !used.has(p) && (!p.tmdbId || !entry.tmdbId) && p.number === entry.number; });
      if (prior) used.add(prior);
      return prior ? merge(prior, entry) : entry;
    });
    old.filter(function (p) { return !used.has(p); }).forEach(function (p) { result.push(Object.assign({}, p, { orphaned: true })); });
    return result.sort(function (a, b) { return a.number - b.number; });
  }
  function mergeSeason(prior, fresh) {
    return season(Object.assign({}, fresh, { rating: prior.rating, loaded: fresh.loaded || prior.loaded,
      fetchedAt: fresh.loaded ? fresh.fetchedAt : prior.fetchedAt,
      episodes: fresh.loaded ? mergeEntries(prior.episodes, fresh.episodes, function (a, b) { return Object.assign({}, b, { rating: a.rating, watched: a.watched }); }) : prior.episodes }));
  }
  function refresh(prior, fresh) {
    if (prior.tmdbId && prior.tmdbId !== fresh.tmdbId) throw new Error('This response belongs to a different TV show.');
    return normalize(Object.assign({}, fresh, { id: prior.id, status: prior.status, mode: prior.mode, rating: prior.rating, notes: prior.notes, lastWatched: prior.lastWatched, seasons: mergeEntries(prior.seasons, fresh.seasons, mergeSeason) }));
  }
  function content(show) {
    const copy = u.clone(show); delete copy.fetchedAt;
    const byNumber = function (a, b) { return a.number - b.number || (a.tmdbId || 0) - (b.tmdbId || 0); };
    (copy.seasons || []).sort(byNumber).forEach(function (s) { delete s.fetchedAt; s.episodes.sort(byNumber); });
    return copy;
  }
  function searchable(show) { return [show.title, show.originalTitle, show.notes, show.status, seriesStatus(show)].concat(show.genres, show.networks, show.companies).join(' ').toLowerCase(); }
  App.tv = { statuses: statuses, modes: modes, showLabels: showLabels, episodeLabels: episodeLabels, normalize: normalize, normalizeList: normalizeList, rating: rating,
    seriesStatus: seriesStatus, averages: averages, fromTmdb: fromTmdb, seasonFromTmdb: seasonFromTmdb, mergeSeason: mergeSeason, refresh: refresh, content: content, searchable: searchable };
})();
