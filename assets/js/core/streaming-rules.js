(function () {
  'use strict';
  const App = window.LocalApp;
  // User-supplied US rules snapshot; confidence describes rights, not date certainty.
  const reviewedOn = '2026-09';
  const rules = [
    {"studio": "Sony Pictures", "companies": ["Columbia Pictures", "TriStar Pictures", "Screen Gems", "Sony Pictures Animation"], "services": ["Netflix"], "window": "Pay-1", "minDays": [90], "typicalDays": [120], "maxDays": [180], "confidence": "HIGH", "notes": "Netflix has exclusive US Pay-1 rights after theatrical and home-entertainment windows."},
    {"studio": "Sony Pictures", "companies": ["Columbia Pictures", "TriStar Pictures", "Screen Gems"], "services": ["Disney+", "Hulu"], "window": "Pay-2", "minDays": null, "typicalDays": null, "maxDays": null, "confidence": "MEDIUM", "notes": "Applies to eligible Sony 2022-2026 theatrical slate after Netflix Pay-1. Do not use as initial streaming destination."},
    {"studio": "Universal Pictures", "companies": ["Universal Pictures"], "services": ["Peacock"], "window": "Pay-1A", "minDays": [90], "typicalDays": [120], "maxDays": null, "confidence": "HIGH", "notes": "Peacock receives opening portion of split Pay-1 window."},
    {"studio": "Universal Pictures", "companies": ["Universal Pictures"], "services": ["Netflix"], "window": "Pay-1B", "minDays": null, "typicalDays": [240], "maxDays": null, "confidence": "HIGH", "notes": "Netflix receives 10-month exclusive middle portion of Pay-1; begins no later than 8 months after theatrical release under expanded agreement."},
    {"studio": "Universal Pictures", "companies": ["Universal Pictures"], "services": ["Peacock"], "window": "Pay-1C", "minDays": null, "typicalDays": null, "maxDays": null, "confidence": "HIGH", "notes": "Returns to Peacock for final portion of Pay-1 after Netflix."},
    {"studio": "Focus Features", "companies": ["Focus Features"], "services": ["Peacock"], "window": "Pay-1A", "minDays": [90], "typicalDays": [120], "maxDays": null, "confidence": "HIGH", "notes": "Follows Universal split-window structure."},
    {"studio": "Focus Features", "companies": ["Focus Features"], "services": ["Netflix"], "window": "Pay-1B", "minDays": null, "typicalDays": [240], "maxDays": null, "confidence": "HIGH", "notes": "Netflix middle Pay-1 window under Universal agreement."},
    {"studio": "Focus Features", "companies": ["Focus Features"], "services": ["Peacock"], "window": "Pay-1C", "minDays": null, "typicalDays": null, "maxDays": null, "confidence": "HIGH", "notes": "Final Pay-1 portion."},
    {"studio": "DreamWorks Animation", "companies": ["DreamWorks Animation"], "services": ["Peacock"], "window": "Pay-1A", "minDays": null, "typicalDays": [120], "maxDays": null, "confidence": "HIGH", "notes": "Universal-owned animation; opening Pay-1 portion."},
    {"studio": "DreamWorks Animation", "companies": ["DreamWorks Animation"], "services": ["Netflix"], "window": "Pay-1B", "minDays": null, "typicalDays": [120, 240], "maxDays": null, "confidence": "HIGH", "notes": "Netflix receives middle Pay-1 animation window."},
    {"studio": "DreamWorks Animation", "companies": ["DreamWorks Animation"], "services": ["Peacock"], "window": "Pay-1C", "minDays": null, "typicalDays": null, "maxDays": null, "confidence": "HIGH", "notes": "Returns to Peacock."},
    {"studio": "Illumination", "companies": ["Illumination"], "services": ["Peacock"], "window": "Pay-1A", "minDays": null, "typicalDays": [120], "maxDays": null, "confidence": "HIGH", "notes": "Universal-owned animation; opening Pay-1 portion."},
    {"studio": "Illumination", "companies": ["Illumination"], "services": ["Netflix"], "window": "Pay-1B", "minDays": null, "typicalDays": [120, 240], "maxDays": null, "confidence": "HIGH", "notes": "Netflix receives middle Pay-1 animation window."},
    {"studio": "Illumination", "companies": ["Illumination"], "services": ["Peacock"], "window": "Pay-1C", "minDays": null, "typicalDays": null, "maxDays": null, "confidence": "HIGH", "notes": "Returns to Peacock."},
    {"studio": "Warner Bros. Pictures", "companies": ["Warner Bros. Pictures", "New Line Cinema", "DC Studios"], "services": ["HBO Max"], "window": "Pay-1", "minDays": null, "typicalDays": [70, 90], "maxDays": null, "confidence": "MEDIUM", "notes": "No fixed public streaming-day rule. Estimate from recent release patterns; title-specific exceptions expected."},
    {"studio": "A24", "companies": ["A24"], "services": ["HBO Max"], "window": "Pay-1", "minDays": null, "typicalDays": [90, 150], "maxDays": null, "confidence": "HIGH", "notes": "Exclusive US Pay-1 output deal renewed in 2026. Timing varies by title."},
    {"studio": "Paramount Pictures", "companies": ["Paramount Pictures"], "services": ["Paramount+"], "window": "Pay-1", "minDays": [45], "typicalDays": [45, 90], "maxDays": null, "confidence": "HIGH", "notes": "Paramount has committed to at least 45 days of theatrical exclusivity. Streaming date remains title-specific."},
    {"studio": "Legendary Entertainment", "companies": ["Legendary Entertainment"], "services": ["VARIABLE"], "window": "VARIABLE", "minDays": [45], "typicalDays": null, "maxDays": null, "confidence": "LOW", "notes": "Paramount theatrical distribution agreement does not guarantee Paramount+ streaming rights. Resolve rights per title."},
    {"studio": "Walt Disney Studios", "companies": ["Walt Disney Pictures"], "services": ["Disney+"], "window": "Pay-1", "minDays": null, "typicalDays": [90], "maxDays": [60, 120], "confidence": "MEDIUM", "notes": "Disney controls streaming destination but does not publish a universal fixed window."},
    {"studio": "Walt Disney Animation Studios", "companies": ["Walt Disney Animation Studios"], "services": ["Disney+"], "window": "Pay-1", "minDays": null, "typicalDays": [90], "maxDays": [60, 120], "confidence": "MEDIUM", "notes": "Estimate based on Disney release patterns."},
    {"studio": "Pixar", "companies": ["Pixar Animation Studios"], "services": ["Disney+"], "window": "Pay-1", "minDays": null, "typicalDays": [90], "maxDays": [60, 120], "confidence": "MEDIUM", "notes": "Estimate based on Disney release patterns."},
    {"studio": "Marvel Studios", "companies": ["Marvel Studios"], "services": ["Disney+"], "window": "Pay-1", "minDays": null, "typicalDays": [90], "maxDays": [60, 120], "confidence": "MEDIUM", "notes": "Estimate based on Disney release patterns."},
    {"studio": "Lucasfilm", "companies": ["Lucasfilm"], "services": ["Disney+"], "window": "Pay-1", "minDays": null, "typicalDays": [90], "maxDays": [60, 120], "confidence": "MEDIUM", "notes": "Estimate based on Disney release patterns."},
    {"studio": "20th Century Studios", "companies": ["20th Century Studios"], "services": ["Hulu", "Disney+"], "window": "Pay-1", "minDays": null, "typicalDays": [60, 120], "maxDays": null, "confidence": "MEDIUM", "notes": "Destination may be Hulu, Disney+, or integrated Hulu/Disney+ distribution depending on title and current service structure."},
    {"studio": "Searchlight Pictures", "companies": ["Searchlight Pictures"], "services": ["Hulu", "Disney+"], "window": "Pay-1", "minDays": null, "typicalDays": [60, 120], "maxDays": null, "confidence": "MEDIUM", "notes": "Destination and timing vary by title."},
    {"studio": "NEON", "companies": ["NEON"], "services": ["Hulu"], "window": "Pay-1", "minDays": null, "typicalDays": [90, 150], "maxDays": null, "confidence": "HIGH", "notes": "Hulu has first-window output relationship with NEON. Timing varies by title."},
    {"studio": "Lionsgate", "companies": ["Lionsgate"], "services": ["Starz"], "window": "Pay-1", "minDays": null, "typicalDays": [90, 180], "maxDays": null, "confidence": "HIGH", "notes": "Starz receives first portion of Lionsgate Pay-1 window; output relationship extends through at least 2030."},
    {"studio": "Summit Entertainment", "companies": ["Summit Entertainment"], "services": ["Starz"], "window": "Pay-1", "minDays": null, "typicalDays": [90, 180], "maxDays": null, "confidence": "HIGH", "notes": "Treat as Lionsgate for Pay-1 streaming."},
    {"studio": "Amazon MGM Studios", "companies": ["Amazon MGM Studios", "MGM"], "services": ["Prime Video"], "window": "OwnedPlatform", "minDays": null, "typicalDays": [60, 180], "maxDays": null, "confidence": "MEDIUM", "notes": "Vertically integrated. No universal public theatrical-to-streaming window; use title-specific date when available."},
    {"studio": "Apple Original Films", "companies": ["Apple Original Films"], "services": ["Apple TV"], "window": "OwnedPlatform", "minDays": null, "typicalDays": [30, 90], "maxDays": null, "confidence": "MEDIUM", "notes": "Apple controls streaming destination; theatrical strategy and window vary substantially by title."}
  ];
  // Curated US title exceptions keyed by TMDB ID. Add only verified information with a source.
  // {123: {source: 'https://…', services: ['Service'], officialDate: 'YYYY-MM-DD', distributor: 'Studio'}}
  // officialDate must be a subscription release, never a digital rental/purchase date.
  const titleOverrides = {};
  function dayRange(days, date) {
    if (!days || !date) return null;
    return days.map(function (day) { return new Date(Date.parse(date) + day * 86400000).toISOString().slice(0, 10); });
  }
  function unresolved(movie, reason) {
    const previous = App.movies.cleanHow(movie.how).replace(/^\*+\s*/, '');
    return { status: 'UNKNOWN', how: previous ? '* ' + previous : '', windows: [], needsResearch: true, reason: reason };
  }
  function predict(movie, options) {
    const input = options || {}, title = input.titleRights || titleOverrides[movie.tmdbId];
    const officialDate = App.movies.date(title?.officialDate);
    const services = title?.source && Array.isArray(title.services) ? title.services.filter(Boolean) : [];
    // Verified title information precedes generic company rules. Live availability is an observation,
    // not a studio prediction, and is used when no official title release date is provided.
    if (services.length && officialDate) return { status: 'OFFICIAL', how: services.join(' / ') + ' (US; official ' + officialDate + ')', windows: [{ services: services, officialDate: officialDate }], needsResearch: false };
    if (input.available) return { status: 'AVAILABLE', how: input.available, windows: [], needsResearch: false };
    if (services.length) return { status: 'RIGHTS', how: services.join(' / ') + ' (US; confirmed rights; date unannounced)', windows: [{ services: services }], needsResearch: false };
    const date = App.movies.date(input.usTheatricalDate);
    const today = input.today || new Date().toISOString().slice(0, 10);
    const ageDate = date || App.movies.date(movie.releaseDate);
    if (ageDate && Date.parse(today) - Date.parse(ageDate) > 365 * 86400000) return unresolved(movie, 'Older catalog needs title-specific rights research.');
    const distributor = title?.source ? title.distributor : input.distributor;
    const names = (distributor ? [distributor] : movie.productionCompanies || []).map(function (name) { return name.trim().toLowerCase(); });
    const matches = rules.filter(function (rule) { return [rule.studio].concat(rule.companies).some(function (name) { return names.includes(name.toLowerCase()); }); });
    const first = matches.filter(function (rule) { return ['Pay-1', 'Pay-1A', 'OwnedPlatform', 'VARIABLE'].includes(rule.window); });
    if (!first.length || first.some(function (rule) { return rule.services.includes('VARIABLE'); })) return unresolved(movie, 'No reliable initial subscription destination; research title-specific rights.');
    const destinations = new Set(first.map(function (rule) { return rule.services.join(' / '); }));
    if (destinations.size !== 1) return unresolved(movie, 'Conflicting company rights; research the US distributor.');
    // Preserve each matched studio’s sequential windows. Pay-2 is never the initial destination.
    const windows = matches.filter(function (rule) { return rule.window !== 'Pay-2' || (date && Number(date.slice(0, 4)) >= 2022 && Number(date.slice(0, 4)) <= 2026); }).map(function (rule) {
      return Object.assign({}, rule, { estimatedDates: dayRange(rule.typicalDays, date) });
    });
    const initial = windows.filter(function (rule) { return ['Pay-1', 'Pay-1A', 'OwnedPlatform'].includes(rule.window); });
    // Multiple compatible labels may have different timing. Use the union, not an arbitrary label.
    const dates = initial.flatMap(function (rule) { return rule.estimatedDates || []; }).sort();
    const estimate = dates.length ? dates[0] === dates[dates.length - 1] ? dates[0] : dates[0] + '–' + dates[dates.length - 1] : 'date unknown (no US theatrical date)';
    return { status: 'ESTIMATE', how: App.movies.cleanHow('Likely ' + Array.from(destinations)[0] + ' (US; estimated ' + estimate + '; ' + (distributor ? 'distributor' : 'company') + '-based)'), windows: windows, needsResearch: !date, reason: date ? '' : 'US theatrical release date needed for timing.' };
  }
  function describe(movie, available, today, usTheatricalDate) { return predict(movie, { available: available, today: today, usTheatricalDate: usTheatricalDate }).how; }
  App.streamingRules = { reviewedOn: reviewedOn, rules: rules, titleOverrides: titleOverrides, predict: predict, describe: describe };
})();
