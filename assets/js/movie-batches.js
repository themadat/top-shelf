(function () {
  "use strict";
  const App = window.LocalApp, u = App.utils, model = App.movies;
  const $ = function (selector) { return document.querySelector(selector); };
  const esc = u.escapeHtml;
  App.createMovieBatches = function ({ saved, lookupSettings, isEditing }) {
    let streamingBusy = false, streamingController = null;
    async function updateWishlistRatings() {
      if (streamingBusy) return;
      const button = $('#wishlistRatingsButton'), status = $('#wishlistStreamingStatus');
      if (!App.tmdb.token()) { lookupSettings(button); return; }
      const targets = saved().filter(function (movie) { return movie.status === 'wishlist'; }).map(function (movie) { return u.clone(movie); });
      $('#wishlistStreaming').hidden = false;
      if (!targets.length) { status.textContent = 'No Wishlist movies to update.'; return; }
      if (!App.storage.saveRecovery('Before updating Wishlist TMDB ratings')) { status.textContent = 'Could not save a recovery copy. No ratings were changed.'; return; }
      streamingBusy = true; streamingController = new AbortController(); button.disabled = true; $('#wishlistStreamingButton').disabled = true; $('#wishlistStreamingCancel').hidden = false;
      const controller = streamingController;
      let updated = 0, checked = 0, failure = '';
      try {
        for (const target of targets) {
          if (controller.signal.aborted) break;
          status.textContent = 'Fetching TMDB ratings ' + (checked + 1) + '/' + targets.length + '…';
          const details = await App.tmdb.details(target.tmdbId, controller.signal);
          if (controller.signal.aborted) break;
          checked++;
          const current = saved().find(function (movie) { return movie.id === target.id; });
          if (!current || JSON.stringify(current) !== JSON.stringify(target) || isEditing(target.id)) continue;
          App.storage.mutate(function (next) { next.workspace.movies.find(function (movie) { return movie.id === target.id; }).tmdbAverage = details.tmdbAverage; }, { reason: 'tmdb-ratings' });
          updated++;
          if (!App.storage.saveNow()) { failure = 'Storage unavailable; export a backup before closing.'; break; }
        }
      } catch (error) { if (!controller.signal.aborted) failure = error.message; }
      finally {
        streamingBusy = false; streamingController = null; button.disabled = false; $('#wishlistStreamingButton').disabled = false; $('#wishlistStreamingCancel').hidden = true;
        status.textContent = 'TMDB ratings: ' + updated + ' updated; ' + checked + '/' + targets.length + ' checked.' + (failure ? ' Stopped: ' + failure : controller.signal.aborted ? ' Stopped; completed updates saved.' : ' Complete.');
      }
    }
    async function fillStreaming() {
      if (streamingBusy) return;
      if (!App.tmdb.token()) { lookupSettings($('#wishlistStreamingButton')); return; }
      const targets = saved().filter(function (movie) { return movie.status === 'wishlist'; }).map(function (movie) { return u.clone(movie); });
      const status = $('#wishlistStreamingStatus'), button = $('#wishlistStreamingButton');
      $('#wishlistStreaming').hidden = false;
      if (!targets.length) { status.textContent = 'No Wishlist movies to check.'; return; }
      if (!App.storage.saveRecovery('Before updating Wishlist How')) { status.textContent = 'Could not save a recovery copy. No movies were changed.'; return; }
      streamingBusy = true; streamingController = new AbortController(); button.disabled = true; $('#wishlistStreamingCancel').hidden = false;
      const controller = streamingController;
      const results = $('#wishlistStreamingResults'); results.replaceChildren();
      let updated = 0, checked = 0, estimated = 0, unknown = 0, skipped = 0, failure = '';
      try {
        for (const target of targets) {
          if (controller.signal.aborted) break;
          status.textContent = 'Checking US availability ' + (checked + 1) + '/' + targets.length + '…';
          const available = await App.tmdb.streaming(target.tmdbId, controller.signal);
          const usTheatricalDate = available ? '' : await App.tmdb.theatricalDate(target.tmdbId, controller.signal);
          if (controller.signal.aborted) break;
          checked++;
          const current = saved().find(function (movie) { return movie.id === target.id; });
          if (!current || current.status !== 'wishlist' || JSON.stringify(current) !== JSON.stringify(target) || isEditing(target.id)) { skipped++; continue; }
          const prediction = App.streamingRules.predict(current, { available: available, usTheatricalDate: usTheatricalDate });
          const how = prediction.how;
          if (prediction.status === 'ESTIMATE') estimated++;
          else if (prediction.status === 'UNKNOWN') unknown++;
          const item = document.createElement('li');
          item.textContent = current.title + ': ' + how;
          if (prediction.windows.length) {
            const details = document.createElement('details'), summary = document.createElement('summary'), list = document.createElement('ul');
            summary.textContent = 'Subscription Windows'; details.append(summary, list);
            prediction.windows.forEach(function (window) { const row = document.createElement('li'); row.textContent = (window.window || 'Title rights') + ': ' + window.services.join(' / ') + (window.estimatedDates ? ' · estimated ' + window.estimatedDates.join('–') : window.officialDate ? ' · official ' + window.officialDate : ' · timing unknown') + (window.confidence ? ' · ' + window.confidence + ' rights confidence' : '') + (window.notes ? ' · ' + window.notes : ''); list.append(row); });
            item.append(details);
          }
          if (prediction.needsResearch) {
            const link = document.createElement('a');
            link.href = 'https://www.google.com/search?q=' + encodeURIComponent(current.title + ' ' + (current.releaseDate || '').slice(0, 4) + ' US subscription streaming distribution rights official release date');
            link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Research This Title';
            item.append(document.createTextNode(' · ' + prediction.reason + ' '), link);
          }
          results.append(item);
          if (current.how === how) continue;
          App.storage.mutate(function (next) { next.workspace.movies.find(function (movie) { return movie.id === target.id; }).how = how; }, { reason: 'wishlist-streaming' });
          updated++;
          if (!App.storage.saveNow()) { failure = 'Storage unavailable; export a backup before closing.'; break; }
        }
      } catch (error) { if (!controller.signal.aborted) failure = error.message; }
      finally {
        streamingBusy = false; streamingController = null; button.disabled = false; $('#wishlistStreamingCancel').hidden = true;
        status.textContent = 'Checked ' + checked + '/' + targets.length + '; ' + updated + ' updated; ' + estimated + ' estimates; ' + unknown + ' unknown; ' + skipped + ' changed or being edited, skipped.' + (failure ? ' Stopped: ' + failure : controller.signal.aborted ? ' Stopped. Completed updates are saved.' : ' Complete.');
      }
    }
    return { ratings: updateWishlistRatings, how: fillStreaming, busy: function () { return streamingBusy; }, cancel: function () { streamingController?.abort(); } };
  };
})();
