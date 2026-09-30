(function () {
  'use strict';
  const App = window.LocalApp, u = App.utils;
  const base = 'https://openlibrary.org';
  const fields = 'key,title,author_name,author_key,first_publish_year,subject,cover_i,number_of_pages_median,editions,editions.key,editions.publish_date,editions.publisher,editions.number_of_pages';
  const cache = new Map();
  let queue = Promise.resolve(), nextRequest = 0;
  function abort(signal) { if (signal?.aborted) throw new DOMException('Lookup cancelled.', 'AbortError'); }
  function request(path, signal, fresh) {
    const run = queue.catch(function () {}).then(async function () {
      abort(signal);
      if (!fresh && cache.has(path)) return u.clone(cache.get(path));
      await new Promise(function (resolve) { setTimeout(resolve, Math.max(0, nextRequest - Date.now())); });
      abort(signal);
      const controller = new AbortController(), cancel = function () { controller.abort(); };
      signal?.addEventListener('abort', cancel, { once: true });
      const timer = setTimeout(cancel, 12000);
      nextRequest = Date.now() + 1100;
      try {
        const response = await fetch(base + path, { signal: controller.signal, credentials: 'omit', headers: { Accept: 'application/json' } });
        if (response.status === 429) {
          const seconds = Number(response.headers.get('Retry-After'));
          nextRequest = Date.now() + Math.max(30000, Math.min(300000, Number.isFinite(seconds) ? seconds * 1000 : 30000));
          throw new Error('Open Library is busy. Please wait before searching again.');
        }
        if (!response.ok) throw new Error('Open Library lookup failed (' + response.status + '). You can still enter the book manually.');
        const raw = await response.text();
        if (raw.length > 2000000) throw new Error('Open Library returned too much data. Try a more specific search.');
        const data = JSON.parse(raw);
        abort(signal);
        if (cache.size >= 40) cache.delete(cache.keys().next().value);
        cache.set(path, data);
        return u.clone(data);
      } catch (error) {
        abort(signal);
        if (error.name === 'AbortError') throw new Error('Lookup timed out. Your draft is still here.');
        throw error;
      } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
    });
    queue = run;
    return run;
  }
  function classify(subjects) {
    const genres = ['Fantasy', 'Science fiction', 'Mystery', 'Thriller', 'Romance', 'Horror', 'Historical fiction', 'Biography', 'Memoir', 'History', 'Science', 'Philosophy', 'Business', 'Psychology', 'Poetry', 'Classics', 'Travel', 'Cooking', 'Self-help'];
    const lower = subjects.map(function (s) { return String(s).trim().toLowerCase(); });
    const fiction = lower.some(function (s) { return s === 'fiction' || s.endsWith(' fiction'); });
    const nonfiction = lower.some(function (s) { return ['nonfiction','non-fiction'].includes(s); });
    return { kind: fiction && !nonfiction ? 'Fiction' : nonfiction && !fiction ? 'Nonfiction' : 'Unknown', genres: genres.filter(function (g) { return lower.some(function (s) { return s === g.toLowerCase() || s === g.toLowerCase() + ' fiction'; }); }) };
  }
  function fromSearch(raw, isbn) {
    if (!raw || !/^\/?(?:works\/)?OL\d+W$/.test(raw.key) || typeof raw.title !== 'string' || !raw.title.trim()) throw new Error('Open Library returned an invalid book.');
    const workId = raw.key.split('/').pop(), subjects = Array.isArray(raw.subject) ? raw.subject.filter(function (s) { return typeof s === 'string'; }).slice(0, 40).map(function (s) { return u.cleanLine(s, 200); }) : [], tags = classify(subjects);
    const edition = raw.editions?.docs?.[0] || {};
    const first = function (value) { return typeof value === 'string' ? value : Array.isArray(value) ? value.find(function (item) { return typeof item === 'string' && item.trim(); }) || '' : ''; };
    const authorNames = Array.isArray(raw.author_name) ? raw.author_name.slice(0, 100) : [];
    return App.books.catalog({ workId: workId, title: u.cleanLine(raw.title, 500), authors: authorNames.map(function (name, i) { const id = raw.author_key?.[i]; return { name: u.cleanLine(name, 200), id: /^OL\d+A$/.test(id) ? id : '' }; }),
      genres: tags.genres, subjects: subjects, kind: tags.kind, publicationYear: Number.isInteger(raw.first_publish_year) && raw.first_publish_year > 0 && raw.first_publish_year < 10000 ? raw.first_publish_year : null,
      publishDate: u.cleanLine(first(edition.publish_date), 100), publisher: u.cleanLine(first(edition.publisher), 200),
      pages: Number.isSafeInteger(edition.number_of_pages) && edition.number_of_pages > 0 ? edition.number_of_pages : Number.isSafeInteger(raw.number_of_pages_median) && raw.number_of_pages_median > 0 ? raw.number_of_pages_median : null,
      pagesSource: Number.isSafeInteger(edition.number_of_pages) && edition.number_of_pages > 0 ? 'edition' : Number.isSafeInteger(raw.number_of_pages_median) && raw.number_of_pages_median > 0 ? 'work-median' : '',
      coverId: Number.isSafeInteger(raw.cover_i) && raw.cover_i > 0 ? raw.cover_i : null,
      editionId: /^\/books\/OL\d+M$/.test(edition.key) ? edition.key.split('/').pop() : '', isbn: isbn || '', fetchedAt: u.isoNow() });
  }
  async function search(query, mode, signal) {
    query = u.cleanLine(query, 200);
    if (!query) throw new Error('Enter a title, author or ISBN.');
    const isbn = query.replace(/[\s-]/g, '').toUpperCase();
    const isIsbn = /^(?:\d{9}[\dX]|\d{13})$/.test(isbn);
    if (mode === 'isbn' && !isIsbn) throw new Error('Enter a 10- or 13-character ISBN.');
    const param = isIsbn ? 'isbn' : mode === 'author' ? 'author' : 'title';
    const data = await request('/search.json?' + param + '=' + encodeURIComponent(isIsbn ? isbn : query) + '&limit=12&fields=' + encodeURIComponent(fields), signal);
    if (!Array.isArray(data?.docs)) throw new Error('Open Library returned invalid search results.');
    return data.docs.filter(function (raw) { return /^\/?(?:works\/)?OL\d+W$/.test(raw?.key) && typeof raw.title === 'string' && raw.title.trim(); }).map(function (raw) { return fromSearch(raw, isIsbn ? isbn : ''); });
  }
  async function details(candidate, signal, fresh) {
    let result = App.books.catalog(candidate);
    if (!result.workId) throw new Error('Select a book first.');
    let warning = '';
    if (fresh) {
      const data = await request('/search.json?q=' + encodeURIComponent('key:/works/' + result.workId) + '&limit=1&fields=' + encodeURIComponent(fields), signal, true);
      if (!data?.docs?.length) throw new Error('This book could not be refreshed. Saved metadata was kept.');
      const metadata = fromSearch(data.docs[0]);
      if (metadata.workId !== result.workId) throw new Error('Open Library returned a different book.');
      result = Object.assign(metadata, { isbn: result.isbn, editionId: result.editionId || metadata.editionId });
      if (result.editionId) {
        try {
          const edition = await request('/books/' + result.editionId + '.json', signal, true);
          result.publishDate = u.cleanLine(edition.publish_date, 100);
          result.publisher = u.cleanLine(Array.isArray(edition.publishers) ? edition.publishers[0] : '', 200);
          if (Number.isSafeInteger(edition.number_of_pages) && edition.number_of_pages > 0) { result.pages = edition.number_of_pages; result.pagesSource = 'edition'; }
        } catch (error) { abort(signal); warning = 'Selected edition details unavailable. '; }
      }
    }
    try {
      const data = await request('/works/' + result.workId + '/ratings.json', signal, fresh);
      const average = data?.summary?.average, count = data?.summary?.count;
      if (typeof average === 'number' && average >= 1 && average <= 5 && Number.isSafeInteger(count) && count > 0) {
        result.average = average; result.ratingsCount = count; result.ratingsFetchedAt = u.isoNow();
      } else { result.average = null; result.ratingsCount = null; warning += 'No community rating is available for this book.'; }
    } catch (error) { abort(signal); warning += 'Community rating unavailable. ' + error.message; }
    return { catalog: App.books.catalog(result), warning: warning };
  }
  App.openLibrary = { search: search, details: details, fromSearch: fromSearch, classify: classify };
})();
