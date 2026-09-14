(function () {
  "use strict";
  const App = window.LocalApp, u = App.utils;
  const historicalRatings = Object.freeze({ "100!": 5, YES: 4, MEH: 3, NO: 2, RUN: 1 });
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
      how: u.cleanLine(v.how, 300), other: u.cleanText(v.other, 4000),
      genres: list(v.genres), productionCompanies: list(v.productionCompanies), directors: list(v.directors), actors: list(v.actors).slice(0, 10), collections: list(v.collections),
      status: v.status === "watched" ? "watched" : "wishlist",
      availableDate: date(v.availableDate), priority: number(v.priority), notes: u.cleanText(v.notes, 20000),
      watchedDate: date(v.watchedDate), historicalRating: historicalRating, rating: historicalRating ? historicalRatings[historicalRating] : number(v.rating), review: u.cleanText(v.review, 20000)
    };
    const errors = validate(movie);
    if (errors.length) throw new Error(errors.join(" "));
    return movie;
  }
  function validate(movie) {
    const errors = [];
    if (!movie.id || !movie.title || !Number.isSafeInteger(movie.tmdbId) || movie.tmdbId < 1) errors.push("Choose a movie from TMDB and enter its title.");
    if (movie.priority !== null && (!Number.isInteger(movie.priority) || movie.priority < 1 || movie.priority > 5)) errors.push("Priority must be a whole number from 1 to 5.");
    if (movie.rating !== null && (!Number.isFinite(movie.rating) || movie.rating < 1 || movie.rating > 5)) errors.push("Rating must be between 1 and 5.");
    if (movie.status === "watched" && (movie.rating === null || !movie.review.trim())) errors.push("Watched movies need a rating and review. The watch date may be unknown.");
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
      tmdbId: data.id, title: data.title, releaseDate: date(data.release_date),
      genres: list((data.genres || []).map(function (v) { return v.name; })),
      productionCompanies: list((data.production_companies || []).map(function (v) { return v.name; })),
      directors: list(data.credits.crew.filter(function (v) { return v.job === "Director"; }).map(function (v) { return v.name; })),
      actors: list(data.credits.cast.slice().sort(function (a, b) { return a.order - b.order; }).slice(0, 10).map(function (v) { return v.name; })),
      collections: data.belongs_to_collection ? list([data.belongs_to_collection.name]) : []
    };
  }
  function color(value, priority) {
    const fraction = priority ? (5 - Number(value)) / 4 : Number(value) / 5;
    return "hsl(" + Math.round(Math.max(0, Math.min(1, fraction)) * 120) + " 52% " + (priority ? "88%" : "25%") + ")";
  }
  function searchable(movie) { return [movie.title, movie.tmdbId, movie.how, movie.other, movie.notes, movie.review, movie.historicalRating].concat(movie.genres, movie.productionCompanies, movie.directors, movie.actors, movie.collections).join(" ").toLowerCase(); }
  App.movies = { historicalRatings: historicalRatings, normalize: normalize, normalizeList: normalizeList, validate: validate, fromTmdb: fromTmdb, color: color, searchable: searchable, date: date };
})();
