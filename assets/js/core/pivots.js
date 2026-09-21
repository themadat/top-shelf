(function () {
  "use strict";
  const App = window.LocalApp;
  const dimensions = [
    { id: "ratings", title: "Ratings", missing: "Unrated" },
    { id: "years", title: "Years", missing: "????" },
    { id: "genres", title: "Genres", missing: "No Genre Listed" },
    { id: "other", title: "Other Pivots", missing: "No Other Pivots" },
    { id: "collections", title: "Collections", missing: "No Collection Listed" },
    { id: "actors", title: "Actors", missing: "No Actors Listed" },
    { id: "directors", title: "Directors", missing: "No Director Listed" },
    { id: "productionCompanies", title: "Companies", missing: "No Company Listed" }
  ];
  const sections = ["Others", "Subgenres", "Collections"];
  function otherTags(movie) {
    return (movie.other || '').split(/\n/).filter(function (line) { return !line.trim().startsWith('Original availability note:'); }).join(',').split(',').map(function (value) {
      const tag = value.trim(), match = /^Subgenre(?:\s*:\s*|\s+)(.+)$/i.exec(tag);
      return { name: match ? match[1].trim() : tag, section: match ? 'Subgenres' : 'Others' };
    }).filter(function (tag) { return tag.name; });
  }
  function build(movies, yearBasis) {
    const watched = movies.filter(function (movie) { return !movie.deleted && movie.status === "watched"; });
    const ratings = watched.map(function (movie) { return movie.rating; }).filter(Number.isFinite);
    const groups = {};
    const collectionNames = new Set(watched.flatMap(function (movie) { return movie.starredCollections || []; }).map(function (name) { return name.toLocaleLowerCase(); }));
    dimensions.forEach(function (dimension) {
      const buckets = new Map(), otherNames = new Map();
      watched.forEach(function (movie) {
        let values;
        if (dimension.id === "ratings") values = Number.isFinite(movie.rating) ? [String(movie.rating)] : [];
        else if (dimension.id === "years") { const date = movie[yearBasis !== "release" ? "watchedDate" : "releaseDate"]; values = date ? [date.slice(0, 4)] : []; }
        else if (dimension.id === "other" || dimension.id === "genres") {
          const tags = otherTags(movie);
          const entries = dimension.id === "genres"
            ? (movie.genres || []).map(function (name) { return { name: name, section: '' }; }).concat(tags.filter(function (tag) { return tag.section === 'Subgenres'; }).map(function (tag) { return { name: tag.name + ' *', section: '' }; }))
            : tags.concat((movie.starredCollections || []).map(function (name) { return { name: name, section: 'Collections' }; }));
          values = Array.from(new Set(entries.map(function (tag) {
            const name = tag.name.trim(), section = tag.section === 'Others' && collectionNames.has(name.toLocaleLowerCase()) ? 'Collections' : tag.section;
            const key = section + ':' + name.toLocaleLowerCase();
            if (!otherNames.has(key)) otherNames.set(key, { name: name, section: section });
            return key;
          })));
        }
        else values = Array.from(new Set((movie[dimension.id] || []).map(function (v) { return v.trim(); }).filter(Boolean)));
        if (!values.length) values = [null];
        values.forEach(function (value) {
          const tag = otherNames.get(value);
          if (!buckets.has(value)) buckets.set(value, { name: value === null ? dimension.missing : tag ? tag.name : value, section: tag?.section || '', missing: value === null, count: 0, rated: 0, sum: 0 });
          const row = buckets.get(value); row.count += 1;
          if (Number.isFinite(movie.rating)) { row.rated += 1; row.sum += movie.rating; }
        });
      });
      groups[dimension.id] = Array.from(buckets.values(), function (row) { return { name: row.name, section: row.section, missing: row.missing, value: !row.missing && ["ratings", "years"].includes(dimension.id) ? Number(row.name) : null, count: row.count, average: row.rated ? row.sum / row.rated : null }; });
    });
    return { count: watched.length, average: ratings.length ? ratings.reduce(function (sum, value) { return sum + value; }, 0) / ratings.length : null, unknownDates: watched.filter(function (movie) { return !movie.watchedDate; }).length, groups: groups };
  }
  function rows(values, minimum, sort, direction) {
    const order = direction === "asc" ? -1 : 1;
    const threshold = Math.max(1, Number(minimum) || 1);
    return values.filter(function (row) { return row.count >= threshold; }).sort(function (a, b) {
      const sectionOrder = sections.indexOf(a.section) - sections.indexOf(b.section);
      if (sectionOrder) return sectionOrder;
      const byName = function () { return Number(a.missing || /^(--|—)$/.test(a.name.trim())) - Number(b.missing || /^(--|—)$/.test(b.name.trim())) || (a.value !== null && b.value !== null ? a.value - b.value : a.name.localeCompare(b.name, undefined, { numeric: true })); };
      if (sort === "category") return Number(a.missing || /^(--|—)$/.test(a.name.trim())) - Number(b.missing || /^(--|—)$/.test(b.name.trim())) || (a.value !== null && b.value !== null ? b.value - a.value : b.name.localeCompare(a.name, undefined, { numeric: true })) * order;
      if (sort === "name") return byName();
      if (sort === "name-desc") return Number(a.missing || /^(--|—)$/.test(a.name.trim())) - Number(b.missing || /^(--|—)$/.test(b.name.trim())) || (a.value !== null && b.value !== null ? b.value - a.value : b.name.localeCompare(a.name, undefined, { numeric: true }));
      if (sort === "average") return (a.average === null && b.average === null ? 0 : a.average === null ? 1 : b.average === null ? -1 : ((b.average - a.average) * order)) || b.count - a.count || byName();
      return (b.count - a.count) * order || (b.average ?? -1) - (a.average ?? -1) || byName();
    });
  }
  App.pivots = { dimensions: dimensions, build: build, rows: rows };
})();
