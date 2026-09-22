(function () {
  "use strict";
  const App = window.LocalApp;
  function token() { try { return localStorage.getItem(App.config.storage.tmdbSecretKey) || sessionStorage.getItem(App.config.storage.tmdbSecretKey) || ""; } catch (error) { return ""; } }
  function saveToken(value, remember) {
    const clean = String(value || "").trim();
    if (!clean || clean.length > 2000 || /\s/.test(clean)) throw new Error("Enter a valid TMDB API Read Access Token.");
    try {
      (remember ? localStorage : sessionStorage).setItem(App.config.storage.tmdbSecretKey, clean);
      (remember ? sessionStorage : localStorage).removeItem(App.config.storage.tmdbSecretKey);
    } catch (error) { throw new Error("This browser could not store the TMDB token."); }
  }
  function forget() { try { localStorage.removeItem(App.config.storage.tmdbSecretKey); sessionStorage.removeItem(App.config.storage.tmdbSecretKey); } catch (error) { throw new Error("This browser could not forget the TMDB token."); } }
  async function request(path, params, signal) {
    if (!token()) throw new Error("Add your TMDB API Read Access Token in Settings → Movie Lookup Settings.");
    if (navigator.onLine === false) throw new Error("TMDB lookup needs an internet connection. Saved movies remain available offline.");
    const url = new URL("https://api.themoviedb.org/3/" + path);
    Object.entries(Object.assign({ language: "en-US" }, params)).forEach(function (entry) { url.searchParams.set(entry[0], entry[1]); });
    const controller = new AbortController();
    const abort = function () { controller.abort(); };
    if (signal?.aborted) controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, 15000);
    try {
      const response = await fetch(url.href, { headers: { accept: "application/json", Authorization: "Bearer " + token() }, signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "TMDB rejected this token. Check your API Read Access Token." : response.status === 429 ? "TMDB is busy. Wait a moment and try again." : response.status === 404 ? "No movie was found for that TMDB ID." : "TMDB is unavailable. Please retry.");
      return await response.json();
    } catch (error) {
      if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
      if (controller.signal.aborted) throw new Error("TMDB lookup timed out. Please retry.");
      if (error instanceof TypeError || error instanceof SyntaxError) throw new Error("Could not read TMDB data. Check your connection and retry.");
      throw error;
    } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); }
  }
  async function search(query, signal) {
    const data = await request("search/movie", { query: query, include_adult: "false" }, signal);
    if (!Array.isArray(data.results)) throw new Error("TMDB returned invalid search results.");
    return data.results.slice(0, 20);
  }
  async function detailsResponse(id, signal) {
    if (!/^\d+$/.test(String(id)) || Number(id) < 1) throw new Error("Enter a numeric TMDB movie ID.");
    const raw = await request("movie/" + id, { append_to_response: "credits" }, signal);
    return { movie: App.movies.fromTmdb(raw), raw: raw };
  }
  async function details(id, signal) { return (await detailsResponse(id, signal)).movie; }
  function remembered() { try { return !!localStorage.getItem(App.config.storage.tmdbSecretKey); } catch (error) { return false; } }
  function streamingNames(data) {
    if (!data || !data.results || typeof data.results !== 'object' || Array.isArray(data.results)) throw new Error('TMDB returned invalid availability data.');
    const us = data.results.US;
    if (!us) return '';
    const seen = new Set(), names = [];
    [['flatrate', ''], ['free', ' (free)'], ['ads', ' (ads)']].forEach(function (entry) {
      if (us[entry[0]] !== undefined && !Array.isArray(us[entry[0]])) throw new Error('TMDB returned invalid availability data.');
      (us[entry[0]] || []).forEach(function (provider) {
        const name = App.utils.cleanLine(provider?.provider_name, 160);
        if (!name) return;
        const key = name.toLocaleLowerCase();
        if (!seen.has(key)) { seen.add(key); names.push(name + entry[1]); }
      });
    });
    const value = App.movies.cleanHow(names.join(', '));
    if (value.length > 300) throw new Error('Provider list exceeds the How field limit. Enter providers manually.');
    return value;
  }
  async function streamingResponse(id, signal) {
    if (!/^\d+$/.test(String(id)) || Number(id) < 1) throw new Error('Enter a numeric TMDB movie ID.');
    const raw = await request('movie/' + id + '/watch/providers', {}, signal);
    return { how: streamingNames(raw), raw: raw };
  }
  function usTheatricalDate(data) {
    if (!Array.isArray(data?.results)) throw new Error('TMDB returned invalid release-date data.');
    const us = data.results.find(function (region) { return region.iso_3166_1 === 'US'; });
    if (!us) return '';
    if (!Array.isArray(us.release_dates)) throw new Error('TMDB returned invalid release-date data.');
    // Prefer the nationwide theatrical opening; limited theatrical is the fallback.
    for (const type of [3, 2]) {
      const dates = us.release_dates.filter(function (entry) { return entry.type === type; }).map(function (entry) { return App.movies.date(String(entry.release_date || '').slice(0, 10)); }).filter(Boolean).sort();
      if (dates.length) return dates[0];
    }
    return '';
  }
  async function theatricalDate(id, signal) {
    if (!/^\d+$/.test(String(id)) || Number(id) < 1) throw new Error('Enter a numeric TMDB movie ID.');
    return usTheatricalDate(await request('movie/' + id + '/release_dates', {}, signal));
  }
  async function streaming(id, signal) { return (await streamingResponse(id, signal)).how; }
  App.tmdb = { theatricalDate: theatricalDate, usTheatricalDate: usTheatricalDate, remembered: remembered, detailsResponse: detailsResponse, streamingResponse: streamingResponse, streaming: streaming, streamingNames: streamingNames, token: token, saveToken: saveToken, forget: forget, search: search, details: details };
})();
