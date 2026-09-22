(function () {
  "use strict";
  const App = window.LocalApp, u = App.utils;
  const historicalRatings = Object.freeze({ "100!": 5, YES: 4, MEH: 3, NO: 2, RUN: 1 });
  // Normalize known provider labels while preserving personal How notes.
  const howAliases = {"amazon prime video": "Prime", "amazon prime video with ads": "Prime", "amazon prime video free with ads": "Prime", "prime video": "Prime", "kanopy": "Kanopy", "hoopla": "Hoopla", "youtube free": "YouTube", "tubi tv": "Tubi", "amc plus apple tv channel": "AMC+", "amc+ amazon channel": "AMC+", "amc+ roku premium channel": "AMC+", "starz apple tv channel": "Starz", "starz amazon channel": "Starz", "apple tv amazon channel": "Apple TV", "cinemax amazon channel": "Cinemax", "cinemax apple tv channel": "Cinemax", "fawesome": "Fawesome", "plex": "Plex", "plex channel": "Plex", "mgm+ amazon channel": "MGM+", "mgm plus roku premium channel": "MGM+", "mgm plus": "MGM+", "the roku channel": "Roku", "hbo max amazon channel": "HBO Max", "lionsgate+ amazon channels": "Lionsgate+", "moviesphere+ amazon channel": "MovieSphere+", "vix": "VIX", "netflix standard with ads": "Netflix", "paramount plus premium": "Paramount+", "paramount plus essential": "Paramount+", "paramount+ amazon channel": "Paramount+", "paramount+ roku premium channel": "Paramount+", "peacock premium": "Peacock", "peacock premium plus": "Peacock"};
  const howGroups = [["green", ["Apple TV", "HBO Max", "Hulu", "Prime", "Paramount+", "Peacock", "Plex", "Roku", "Pluto", "TBS", "TNT", "tru TV", "Tubi", "YouTube", "Kanopy", "Hoopla", "Fawesome", "Cineverse", "Fandango", "Filmzie", "JustWatch TV", "Mometu"]], ["yellow", ["Disney+", "Netflix"]], ["red", ["AMC+", "Cinemax", "fuboTV", "BBC America", "Brewhouse", "History Vault", "Howdy", "IndieFlix", "Lionsgate+", "MGM+", "MovieSphere+", "Philo", "Shout!", "Showtime", "Sony", "Starz", "Sundance Now", "YouTube TV"]]];
  Object.assign(howAliases, {"apple tv+": "Apple TV", "appletv+": "Apple TV", "max": "HBO Max", "pluto tv": "Pluto", "trutv": "tru TV", "fandango at home free": "Fandango", "howdy amazon channel": "Howdy", "indieflix shorts amazon channel": "IndieFlix", "shout! factory amazon channel": "Shout!", "sony pictures core amazon channel": "Sony"});
  const howProviders = new Map();
  howGroups.forEach(function (group) { group[1].forEach(function (name) { howAliases[name.toLowerCase()] = name; howProviders.set(name.toLowerCase(), { name: name, color: group[0], rank: howProviders.size }); }); });
  function howProvider(value) {
    const name = value.trim().replace(/^\*+\s*/, '').replace(/^Likely /, '').replace(/ \(.*$/, '').toLowerCase();
    return howProviders.get((Object.prototype.hasOwnProperty.call(howAliases, name) ? howAliases[name] : name).toLowerCase()) || { color: 'neutral', rank: howProviders.size };
  }
  function howRank(value) { return Math.min.apply(null, String(value || '').split(/,| \/ /).map(function (part) { return howProvider(part).rank; })); }
  function compareHow(a, b) { return howRank(a) - howRank(b) || a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }); }
  function cleanHow(value) {
    let text = u.cleanLine(value, 2000);
    if (text.replace(/^\*\s*/, '') === 'No US streaming listed; destination unknown') return '';
    text = text.replace(/\(US; estimated (.*?); (?:company|distributor)-based\)/g, '(~ $1)')
      .replace(/(\d{4}-\d{2}-\d{2})–(\d{4}-\d{2}-\d{2})/g, function (_, start, end) { return start + ' to ' + (start.slice(0, 4) === end.slice(0, 4) ? end.slice(5) : end); })
      .replace('date unknown (no US theatrical date)', 'date unknown');
    const marker = /^\*/.test(text) ? '* ' : '';
    const likely = /^(?:\*+\s*)?Likely /.test(text) ? 'Likely ' : '';
    const suffix = text.match(/ \(~ .*\)$/)?.[0] || '';
    if (suffix) text = text.slice(0, -suffix.length);
    text = text.replace(/^(\*+\s*)?Likely /, '$1');
    text = text.replace(/^\*+\s*/, '');
    const seen = new Set();
    return marker + likely + text.split(',').map(function (part) {
      return part.trim().split(' / ').map(function (item) {
        const match = /^(Likely )?(.*?)( \(~ .*\))?$/.exec(item);
        const name = match[2].replace(/ \((?:free|ads)\)$/, '');
        return (match[1] || '') + (Object.prototype.hasOwnProperty.call(howAliases, name.toLowerCase()) ? howAliases[name.toLowerCase()] : match[2]) + (match[3] || '');
      }).sort(function (a, b) { return howRank(a) - howRank(b); }).join(' / ');
    }).filter(function (part) { const key = part.toLowerCase(); if (!part || seen.has(key)) return false; seen.add(key); return true; }).sort(function (a, b) { return howRank(a) - howRank(b); }).join(', ') + suffix;
  }
  function date(value) {
    const text = u.cleanLine(value, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(text)) && new Date(text).toISOString().slice(0, 10) === text ? text : "";
  }
  function number(value) { return value === "" || value == null ? null : Number(value); }
  function list(value) { return Array.from(new Set((Array.isArray(value) ? value : []).map(function (item) { return u.cleanLine(item, 160); }).filter(Boolean))).slice(0, 100); }
  function normalize(input) {
    const v = u.plainObject(input);
    const id = u.cleanLine(v.id, 100);
    if (v.deleted === true) {
      if (!id) throw new Error("A deleted movie is missing its identifier.");
      return { id: id, deleted: true };
    }
    if (!["wishlist", "watched"].includes(v.status)) throw new Error("A movie must be Wishlist or Watched.");
    ["releaseDate", "availableDate", "watchedDate"].forEach(function (field) { if (v[field] && !date(v[field])) throw new Error("Invalid movie date: " + field); });
    const historicalRating = u.cleanLine(v.historicalRating, 20);
    if (historicalRating && !Object.hasOwn(historicalRatings, historicalRating)) throw new Error("Invalid historical rating.");
    const movie = {
      id: id, tmdbId: Number(v.tmdbId), title: u.cleanLine(v.title, 200), releaseDate: date(v.releaseDate),
      subgenreReviewed: v.subgenreReviewed === true,
      incompleteOverride: v.incompleteOverride === true,
      how: u.cleanLine(cleanHow(v.how), 302), other: u.cleanText(v.other, 4000),
      starredActors: list(v.starredActors).filter(function (name) { return list(v.actors).slice(0, 10).includes(name); }),
      starredDirectors: list(v.starredDirectors).filter(function (name) { return list(v.directors).includes(name); }),
      starredCompanies: list(v.starredCompanies).filter(function (name) { return list(v.productionCompanies).includes(name); }),
      genres: list(v.genres), productionCompanies: list(v.productionCompanies), directors: list(v.directors), actors: list(v.actors).slice(0, 10), collections: list(v.collections), starredCollections: list(v.starredCollections).filter(function (name) { return list(v.collections).includes(name); }),
      status: v.status === "watched" ? "watched" : "wishlist",
      availableDate: date(v.availableDate), priority: number(v.priority), notes: u.cleanText(v.notes, 20000),
      watchedDate: date(v.watchedDate), historicalRating: historicalRating, rating: historicalRating ? historicalRatings[historicalRating] : number(v.rating), review: u.cleanText(v.review, 20000)
    };
    if (v.tmdbAverage !== undefined) movie.tmdbAverage = typeof v.tmdbAverage === 'number' && Number.isFinite(v.tmdbAverage) && v.tmdbAverage >= 0 && v.tmdbAverage <= 10 ? v.tmdbAverage : null;
    const errors = validate(movie);
    if (errors.length) throw new Error(errors.join(" "));
    return movie;
  }
  function validate(movie) {
    const errors = [];
    if (!movie.id || !movie.title || !Number.isSafeInteger(movie.tmdbId) || movie.tmdbId < 1) errors.push("Choose a movie from TMDB and enter its title.");
    if (movie.priority !== null && (!Number.isInteger(movie.priority) || movie.priority < 1 || movie.priority > 5)) errors.push("Priority must be a whole number from 1 to 5.");
    if (movie.rating !== null && (!Number.isFinite(movie.rating) || movie.rating < 0 || movie.rating > 5)) errors.push("Rating must be between 0 and 5.");
    if (movie.status === "watched" && movie.rating === null) errors.push("Watched movies need a rating. Review and watch date are optional.");
    return errors;
  }
  function normalizeList(value) {
    if (value == null) return [];
    if (!Array.isArray(value) || value.length > App.config.controls.maxMovies) throw new Error("The movie collection is invalid or too large.");
    const ids = new Set(), tmdbIds = new Set();
    return value.map(function (v) {
      const movie = normalize(v);
      if (ids.has(movie.id) || (!movie.deleted && tmdbIds.has(movie.tmdbId))) throw new Error("The movie collection contains duplicate identifiers.");
      ids.add(movie.id); if (!movie.deleted) tmdbIds.add(movie.tmdbId);
      return movie;
    }).sort(function (a, b) { return a.id.localeCompare(b.id); });
  }
  function fromTmdb(data) {
    if (!data || !Number.isSafeInteger(data.id) || !data.title || !Array.isArray(data.credits?.cast) || !Array.isArray(data.credits?.crew)) throw new Error("TMDB returned incomplete movie details. Please retry.");
    return {
      tmdbAverage: data.vote_count > 0 && typeof data.vote_average === 'number' && data.vote_average >= 0 && data.vote_average <= 10 ? data.vote_average : null,
      tmdbId: data.id, title: data.title, releaseDate: date(data.release_date),
      genres: list((data.genres || []).map(function (v) { return v.name; })),
      productionCompanies: list((data.production_companies || []).map(function (v) { return v.name; })),
      directors: list(data.credits.crew.filter(function (v) { return v.job === "Director"; }).map(function (v) { return v.name; })),
      actors: list(data.credits.cast.slice().sort(function (a, b) { return a.order - b.order; }).slice(0, 10).map(function (v) { return v.name; })),
      collections: data.belongs_to_collection ? list([data.belongs_to_collection.name]) : []
    };
  }
  function bulkPivots(movies, pivots, targets) {
    const unique = function (values) { const seen = new Set(); return values.filter(function (value) { const key = value.toLocaleLowerCase(); if (!value || seen.has(key)) return false; seen.add(key); return true; }); };
    const tags = unique(String(pivots).split(/[,\n]/).map(function (tag) { return tag.trim(); }));
    const lines = unique(String(targets).split(/\r?\n/).map(function (line) { return line.trim(); }));
    if (!tags.length) throw new Error('Enter at least one pivot.');
    if (!lines.length) throw new Error('Enter at least one movie title or TMDB ID, one per line.');
    if (lines.length > App.config.controls.maxMovies) throw new Error('Too many movie entries.');
    const active = movies.filter(function (movie) { return !movie.deleted; }), seen = new Set();
    const key = function (text) { return text.trim().replace(/\s+/g, ' ').toLocaleLowerCase(); };
    const rows = lines.map(function (line) {
      const id = /^(?:tmdb:\s*)?(\d+)$/i.exec(line);
      const matches = active.filter(function (movie) { return id ? movie.tmdbId === Number(id[1]) : key(movie.title) === key(line); });
      if (matches.length !== 1) return { input: line, error: matches.length ? 'Multiple matches — use a TMDB ID: ' + matches.map(function (movie) { return movie.tmdbId; }).join(', ') : 'Not found in saved movies' };
      const movie = matches[0];
      if (seen.has(movie.id)) return { input: line, title: movie.title, duplicate: true };
      seen.add(movie.id);
      const existing = new Set((movie.other || '').split(/[,\n]/).map(function (tag) { return tag.trim().toLocaleLowerCase(); }));
      const additions = tags.filter(function (tag) { return !existing.has(tag.toLocaleLowerCase()); });
      const other = movie.other + (movie.other && additions.length ? '\n' : '') + additions.join(', ');
      if (other.length > 4000) return { input: line, error: movie.title + ': adding these pivots would exceed the 4,000-character limit' };
      return { input: line, id: movie.id, title: movie.title, before: movie.other, after: other, additions: additions };
    });
    return { rows: rows, changes: rows.filter(function (row) { return row.additions?.length; }), valid: rows.every(function (row) { return !row.error; }) };
  }
  const sortFields = ['tmdbAverage', 'rating', 'priority', 'title', 'review', 'how', 'date', 'release', 'other', 'collections', 'genres', 'actors', 'directors', 'companies', 'watched'];
  function sortPreference(value, tab) {
    const source = u.plainObject(value);
    return { key: sortFields.includes(source.key) ? source.key : tab === 'wishlist' ? 'priority' : tab === 'watched' ? 'watched' : 'rating', direction: ['asc', 'desc'].includes(source.direction) ? source.direction : tab === 'wishlist' ? 'asc' : 'desc' };
  }
  function compare(a, b, preference) {
    const value = function (movie, key) {
      if (key === 'review') return movie.status === 'watched' ? movie.review : movie.notes;
      if (key === 'date') return movie.status === 'watched' ? movie.watchedDate : movie.availableDate;
      const field = { release: 'releaseDate', watched: 'watchedDate', companies: 'productionCompanies' }[key] || key;
      return Array.isArray(movie[field]) ? movie[field].join(', ') : movie[field];
    };
    const missing = function (v) { return v == null || v === '' || (typeof v === 'string' && /^(--|—)$/.test(v.trim())); };
    const av = value(a, preference.key), bv = value(b, preference.key);
    return Number(missing(av)) - Number(missing(bv)) || (missing(av) && missing(bv) ? 0 : (preference.key === 'how' ? compareHow(String(av), String(bv)) : typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), undefined, { sensitivity: 'base', numeric: true })) * (preference.direction === 'asc' ? 1 : -1)) || a.title.localeCompare(b.title);
  }
  function averageBand(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 'neutral';
    return ['purple', 'red', 'orange', 'yellow', 'yellow-green', 'green', 'dark-green'][Math.min(6, Math.max(0, Math.floor(value * 7 / 10)))];
  }
  function color(value, priority) {
    const fraction = priority ? (5 - Number(value)) / 4 : Number(value) / 5;
    return "hsl(" + Math.round(Math.max(0, Math.min(1, fraction)) * 120) + " 52% " + (priority ? "88%" : "25%") + ")";
  }
  function searchable(movie) { return [movie.title, movie.tmdbId, movie.how, movie.other, movie.notes, movie.review, movie.historicalRating].concat(movie.genres, movie.productionCompanies, movie.directors, movie.actors, movie.collections).join(" ").toLowerCase(); }
  function incomplete(movie) { return !movie.incompleteOverride && (!movie.releaseDate || ["genres", "actors", "directors", "productionCompanies"].some(function (field) { return !movie[field]?.length; })); }
  function analysisText(movies) {
    const entries = movies.filter(function (movie) { return !movie.deleted; }).map(normalize).sort(function (a, b) { return a.title.localeCompare(b.title, undefined, { numeric: true }) || a.tmdbId - b.tmdbId; });
    return JSON.stringify({
      description: 'All saved Wishlist and Watched movies, independent of search and filters. Empty fields mean unknown or not entered. Ratings use a 0–5 scale; priority 1 is highest. Legacy ratings map to numeric scores as listed below. Actor lists contain up to ten saved cast members.',
      legacyRatings: historicalRatings,
      movieCount: entries.length,
      movies: entries
    }, null, 2);
  }
  App.movies = { averageBand: averageBand, howProvider: howProvider, howRank: howRank, analysisText: analysisText, cleanHow: cleanHow, incomplete: incomplete, bulkPivots: bulkPivots, sortPreference: sortPreference, compare: compare, historicalRatings: historicalRatings, normalize: normalize, normalizeList: normalizeList, validate: validate, fromTmdb: fromTmdb, color: color, searchable: searchable, date: date };
})();
