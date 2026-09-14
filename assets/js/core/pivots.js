(function () {
  "use strict";
  const App = window.LocalApp;
  const dimensions = [
    { id: "genres", title: "Genres", missing: "No genre listed" },
    { id: "ratings", title: "Ratings", missing: "Unrated" },
    { id: "years", title: "Years", missing: "Unknown year" },
    { id: "collections", title: "Collections", missing: "No collection listed" },
    { id: "actors", title: "Actors", missing: "No actors listed" },
    { id: "directors", title: "Directors", missing: "No director listed" },
    { id: "productionCompanies", title: "Production companies", missing: "No company listed" }
  ];
  function build(movies, yearBasis) {
    const watched = movies.filter(function (movie) { return !movie.deleted && movie.status === "watched"; });
    const ratings = watched.map(function (movie) { return movie.rating; }).filter(Number.isFinite);
    const groups = {};
    dimensions.forEach(function (dimension) {
      const buckets = new Map();
      watched.forEach(function (movie) {
        let values;
        if (dimension.id === "ratings") values = Number.isFinite(movie.rating) ? [String(movie.rating)] : [];
        else if (dimension.id === "years") { const date = movie[yearBasis === "watched" ? "watchedDate" : "releaseDate"]; values = date ? [date.slice(0, 4)] : []; }
        else values = Array.from(new Set((movie[dimension.id] || []).map(function (v) { return v.trim(); }).filter(Boolean)));
        if (!values.length) values = [null];
        values.forEach(function (value) {
          if (!buckets.has(value)) buckets.set(value, { name: value === null ? dimension.missing : value, missing: value === null, count: 0, rated: 0, sum: 0 });
          const row = buckets.get(value); row.count += 1;
          if (Number.isFinite(movie.rating)) { row.rated += 1; row.sum += movie.rating; }
        });
      });
      groups[dimension.id] = Array.from(buckets.values(), function (row) { return { name: row.name, missing: row.missing, value: !row.missing && ["ratings", "years"].includes(dimension.id) ? Number(row.name) : null, count: row.count, average: row.rated ? row.sum / row.rated : null }; });
    });
    return { count: watched.length, average: ratings.length ? ratings.reduce(function (sum, value) { return sum + value; }, 0) / ratings.length : null, unknownDates: watched.filter(function (movie) { return !movie.watchedDate; }).length, groups: groups };
  }
  function rows(values, minimum, sort) {
    const threshold = Math.max(1, Number(minimum) || 1);
    return values.filter(function (row) { return row.count >= threshold; }).sort(function (a, b) {
      const byName = function () { return Number(a.missing) - Number(b.missing) || (a.value !== null && b.value !== null ? a.value - b.value : a.name.localeCompare(b.name, undefined, { numeric: true })); };
      if (sort === "name") return byName();
      if (sort === "name-desc") return Number(a.missing) - Number(b.missing) || (a.value !== null && b.value !== null ? b.value - a.value : b.name.localeCompare(a.name, undefined, { numeric: true }));
      if (sort === "average") return (b.average ?? -1) - (a.average ?? -1) || b.count - a.count || byName();
      return b.count - a.count || (b.average ?? -1) - (a.average ?? -1) || byName();
    });
  }
  App.pivots = { dimensions: dimensions, build: build, rows: rows };
})();
