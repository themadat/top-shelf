(function () {
  'use strict';
  const App = window.LocalApp;
  // US first-subscription-window research snapshot. Company matches are clues,
  // not proof of territory-specific distribution rights. Never infer a date.
  const reviewedOn = '2026-09-21';
  const rules = [
    { studio: 'Universal / Focus / Illumination / DreamWorks Animation', companies: ['Universal Pictures', 'Focus Features', 'Illumination', 'Illumination Entertainment', 'DreamWorks Animation'], service: 'Peacock', from: 2022, through: 2026, source: 'https://www.nbcuniversal.com/article/peacock-showcases-powerhouse-slate-todays-nbcuniversal-upfront' },
    { studio: 'Sony Pictures', companies: ['Columbia Pictures', 'TriStar Pictures', 'Screen Gems', 'Sony Pictures', 'Sony Pictures Animation', 'Sony Pictures Classics', '3000 Pictures'], service: 'Netflix', from: 2022, through: 2026, source: 'https://www.sonypictures.com/corp/press_releases/2026/0115' },
    { studio: 'Paramount Pictures', companies: ['Paramount Pictures', 'Paramount Animation', 'Paramount Players'], service: 'Paramount+', from: 2024, through: 2026, source: 'https://ir.paramount.com/news-releases/news-release-details/viacomcbs-unveils-new-company-name-global-content-slate-and' },
    { studio: 'A24', companies: ['A24'], service: 'HBO Max', from: 2024, through: 2026, source: 'https://press.wbd.com/us/ca/media-release/hbo-max-and-a24-renew-multi-year-us-pay-1-output-and-library-deal?language_content_entity=en' },
    { studio: 'Lionsgate / Summit', companies: ['Lionsgate', 'Lionsgate Films', 'Summit Entertainment'], service: 'STARZ', from: 2023, through: 2028, source: 'https://www.sec.gov/Archives/edgar/data/929351/000092935126000022/starz2025transitionannualr.pdf' }
  ];
  function describe(movie, available, today) {
    if (available) return available;
    const unknown = 'No US streaming listed; destination unknown';
    const date = App.movies.date(movie.releaseDate);
    if (!date) return unknown;
    const now = today || new Date().toISOString().slice(0, 10);
    // Older films can have changed licensees; first-window deals cannot predict them.
    if (Date.parse(now) - Date.parse(date) > 365 * 86400000) return unknown;
    const year = Number(date.slice(0, 4));
    const companies = new Set((movie.productionCompanies || []).map(function (name) { return name.toLowerCase().trim(); }));
    const matches = rules.filter(function (rule) { return year >= rule.from && year <= rule.through && rule.companies.some(function (name) { return companies.has(name.toLowerCase()); }); });
    const services = Array.from(new Set(matches.map(function (rule) { return rule.service; })));
    if (services.length !== 1) return unknown;
    return 'Likely ' + services[0] + ' (US; company-based estimate; date unannounced)';
  }
  App.streamingRules = { reviewedOn: reviewedOn, rules: rules, describe: describe };
})();
