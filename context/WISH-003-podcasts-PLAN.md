# WISH-003 — Podcast Library and Metadata

## Resume

- Status: **Active — implementation and verification complete; awaiting release cut**. Started at the user's request with the supplied podcast table. No release cut, commit or push requested.
- Confirmed decisions: source Active means personal Listening/Stopped; dollar amounts are annual USD. Source Last and Time remain uninterpreted legacy fields. Membership-only rows are retained separately, duplicates are reviewed/skipped, and personal data stays in ignored `import-preparation/`.
- Implemented: manual podcast/membership library, filters/sorting/search, editor, table/prepared-file import, per-row/batch candidate search, reviewed catalog links, RSS refresh/local file enrichment, legacy-compatible backup/sync, recovery and stale-write guards. Defaults below were used unless superseded here.
- Source route verified: keyless Podcast Index search works with browser-style identification and CORS. Its Apple-compatible IDs are stored as Apple IDs, separate from feed URLs. Candidate choice is explicit; unsafe feed URLs are omitted while retaining safe IDs. Direct RSS remains subject to each host's CORS and the 5 MiB limit.
- Prepared personal file: `import-preparation/podcasts-linked.json`. All 61 source rows retained for review; 60 additions after the duplicate alias skip, 55 distinct linked shows, two membership entries and three unresolved shows. The original 36 Listening and $641/year reconcile. 45 distinct linked feeds were enriched; oversized feeds retain catalog linkage with an audit note. No import into the existing app/cloud library has been performed; the full file was tested in an isolated browser profile.
- Next: on an explicit cut request, run release coverage and the release script. The prepared file is ready for Podcasts → Import Podcasts. Commit/push and writing the actual app/cloud library remain separate actions.
- Current behavior is documented in [PODCASTS.md](../docs/PODCASTS.md); the following sections retain the design context. Implementation uses Unknown/empty fields as automatic fallbacks rather than a separate override map, and per-show feed refresh rather than a background/bulk refresh.

## Outcome and decisions

Build a podcast library, one row per show. Use All / Listening / Stopped views, name/category search, and filters for activity, size, frequency, category and membership. Keep the existing Podcasts icon and shortcut. Add/edit must work without lookup or a network connection. All requested information is visible in the editor; desktop rows show Name, Activity, My Status, Length, Frequency, Categories, Membership, Annual Cost and Website. Use a contained scrolling table on narrow screens and a usable mobile editor.

| Field | Proposed behavior | Automatic coverage |
|---|---|---|
| Name | Required, editable; retain provider ID and public feed URL separately | Catalog or RSS title |
| Show activity | Active / Inactive / Unknown, with optional explanation such as Ended or Possible hiatus; show last episode date | Completed flag is evidence of ending; recency supplies an explicitly labeled estimate |
| My status | Listening / Stopped; proposed default Listening on add | Personal only; refresh never changes it |
| Average length | S under 30 min; M 30–under 60; L 60–under 90; XL 90+; Unknown when unavailable | Arithmetic mean of recent eligible episode durations; show minutes and sample count in details |
| Release frequency | Daily / Several times a week / Weekly / Every two weeks / Monthly / Seasonal / Irregular / Unknown; manual override | Estimate from recent episode dates; seasonal requires publisher/user evidence |
| Categories | Preserve multiple parent categories and their subcategories; editable | RSS hierarchy preferred; flat catalog genres must not acquire invented parents |
| Membership | Yes / No / Unknown, membership URL and optional tier name | A funding link is a lead to check, not proof of a paid membership |
| Yearly cost | Amount, ISO currency, billing basis and checked date; unknown distinct from zero | Manually verified annual price, or monthly amount × 12 labeled Annualized estimate |
| Website | Validated HTTP(S) show website, separate from feed and directory URLs | RSS channel link where available |

Store membership availability, not whether the user personally subscribes. Use one selected tier per show initially. Prefer the actual annual plan price when known; otherwise annualize a monthly tier. Per-episode, donation and variable pricing have no invented yearly total. Never assume an annual discount or convert currencies. Preserve a source URL and checked date so a stale price can be recognized.

## Catalog recommendation and research

Primary sources checked 2026-09-30:

1. [Podcast Index API specification](https://podcastindex-org.github.io/docs-api/pi_api.json): documents keyless `https://api.podcastindex.org/search?term=...` and `/lookup?entity=podcast&id=...` Apple-compatible endpoints. The richer `/api/1.0/` API uses a key and signed authentication and exposes episode, category and funding metadata. Do not assume the keyless response has the same fields or identifiers as the full API. This is the preferred open podcast catalog candidate; its documentation license does not establish unrestricted reuse rights for every publisher's content.
2. [Apple RSS guide](https://help.apple.com/itc/podcasts_connect/en.lproj/itcb54353390.html): documents title, show website, nested categories, completion, episode dates, durations and episode types. These support enrichment and estimates when present; publisher metadata may be incomplete.
3. [Podcast namespace funding specification](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/tags/funding.md): defines funding/donation URLs and descriptive text, with no structured annual price. It cannot reliably answer membership availability or cost by itself.
4. [Apple iTunes Search API](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/Searching.html): an alternative podcast search source, with documented cross-site callback support and an approximate 20 requests/minute limit. It is a public catalog API, not an open database; reassess terms and actual browser behavior before adding a fallback.

Recommended first release: optional keyless Podcast Index discovery plus public RSS enrichment where browser access permits, with complete manual entry and local RSS-file import as the reliable fallback. Keep a small provider adapter so another catalog can be substituted. Do not add an API account requirement, backend, shared embedded secret, public CORS proxy or runtime package. Full authenticated Podcast Index integration is deferred pending a separate decision; optional personal credentials would still need device-only storage and browser verification.

Original research limitation: initial research-tool and sandbox-network requests failed. Implementation subsequently verified keyless search with CORS headers and an actual local-preview browser query. The deployed Pages origin has not been tested yet. RSS servers independently control browser access; even successful discovery cannot guarantee feed enrichment. If keyless discovery fails, retain manual/feed-file entry and report the limitation before selecting an alternative integration.

## Derived metadata rules

- Select up to the 20 most recent eligible full episodes, with missing episode type treated as full. Exclude explicitly marked trailers/bonus entries, duplicate GUIDs (or duplicate enclosure identity when GUID is absent), future dates and invalid values. Imported XML must be size-limited, reject DTD/entity declarations and never render feed HTML or load enclosure media.
- Length uses positive, valid durations in seconds or parsed colon notation. Require at least three durations for an automatic size; otherwise display Unknown with the observed sample count. Use the unrounded mean for the 30/60/90-minute boundaries. A manual size override survives refresh and may be cleared to return to automatic sizing.
- Frequency uses valid publication dates from the same eligible sample, requiring at least four distinct dates. Use median positive inter-release gap: up to 1.5 days Daily, up to 4 Several times a week, up to 9 Weekly, up to 18 Every two weeks, up to 40 Monthly; otherwise Irregular. If fewer than 70% of gaps lie within half to twice the median, use Irregular. Show that this is an estimate and retain sample dates/count; a season break or limited archive can distort it.
- Publisher `itunes:complete=yes` yields Inactive with Ended evidence. Otherwise propose Active (estimated) when the most recent eligible episode is within max(90 days, three median gaps), or Inactive (estimated) beyond that window. Without a usable recent history, use Unknown. Seasonality, delayed publishing and feed relocation are reasons for manual correction. A broken URL, network failure or catalog dead-feed flag alone never means the show ended.
- Keep last successful metadata, provenance and fetch date on request failure; do not replace populated fields with unknowns silently. Never use feed fetch time as the latest episode date. Estimates represent the saved observation, not a silently changing shared record on every render.

## Persistence and safety contract

- Add `workspace.podcasts` with stable local IDs and deletion tombstones. Separate provider snapshots/derived facts from explicit field overrides, personal status and manually verified membership details. Include an override reset control; refresh previews proposed metadata changes and preserves overrides, including deliberate blanks.
- Match duplicates by provider identity or normalized public feed URL, never title alone. Treat redirects/feed moves as identity review, not permission to merge or duplicate records silently. Do not conflate Apple and Podcast Index ID namespaces.
- Add device-local `ui.podcasts` search/view/filter/sort/column-width preferences; full backups include them, content sync does not. Extend all state normalization, legacy import, backup, merge/hash and restore paths. Advance schema/envelope compatibility deliberately so older clients reject unsupported podcast-bearing content; all supported older libraries remain readable.
- Persist before publishing UI success. Preserve recovery before delete/replacement/import application and reject stale drafts, lookup responses or refresh previews when intervening edits occur. Merge conflicts require the existing conflict workflow; timestamps never pick winners.
- Only public feed URLs are supported. Private subscription feed tokens are credentials and must not enter source, logs, backups or sync; reject credential-bearing URLs and explain the public-feed requirement. Do not request account credentials in chat.
- Bound provider text, arrays and responses, escape all displayed text, validate HTTP(S) links and retain accessible labels/focus. Abort lookup on close/change, ignore late results, throttle/cache searches and handle timeout/429/offline without losing edits.

## File map and implementation sequence

1. Provider feasibility spike: establish browser behavior and document verified fields/limitations before promising automatic coverage.
2. New `assets/js/core/podcasts.js`: normalization, overrides, categories, pricing and deterministic estimates. New `tests/podcasts.test.mjs`: boundaries, missing/invalid data and pricing semantics.
3. `assets/js/core/state.js`, `assets/js/core/portability.js`, `assets/js/core/sync.js` where required, and existing foundation/sync/storage tests: schema, migration, backup, merge, recovery and failed-write support. Confirm script load order in test harnesses as well as the app.
4. New `assets/js/podcasts-ui.js`, `assets/js/podcasts-editor.js` and `assets/css/podcasts.css`; update `index.html`, `assets/js/app.js` and `assets/js/config.js`: manual library, editor, filters, table, shelf counts, global search, preference reset and accurate erase-data wording.
5. New `assets/js/core/podcast-catalog.js` and `assets/js/core/podcast-feed.js`, plus focused tests: optional discovery, selection, bounded public RSS fetch/local XML import, source attribution, preview/refresh and safe fallbacks. Keep network code out of the model and UI modules.
6. `sw.js` and asset references: cache every new runtime file. Add `docs/PODCASTS.md` and update relevant persistence/testing contracts during implementation. Use the release script only for a requested release cut; no documentation-only bump.

## Acceptance and verification

- Every requested field can be entered manually, edited offline and retained after reload, full backup round trip and mocked content-sync merge/restore. An empty or legacy library still opens safely; other shelves and Notes are preserved.
- Verify all size boundaries, trailers/bonus exclusion, sparse/irregular/seasonal feeds, ended feeds, invalid dates/durations, duplicate episodes and manual overrides. Include monthly annualization, actual annual price, unknown/zero and non-annualizable pricing cases.
- Provider fixtures cover empty/ambiguous results, response-shape validation, category hierarchy, unsafe text/URLs/XML, unreachable feeds, CORS/network failure, 429, abort and late responses. Missing membership tags remain Unknown. No private feed or credential in fixtures.
- Verify duplicate linking, stale edits/previews, delete recovery, storage failure, schema compatibility and conflicts without timestamp winners. Offline shell must include all new modules.
- Run `node scripts/check.mjs`; focused isolated-browser checks at desktop, 390px and 320px with keyboard focus, Add/Edit/Stopped filtering, URL opening, lookup failure and offline edit/reload. Stop preview servers. Follow `docs/TESTING.md` for a later release cut.
- Earlier planning-task verification: `scripts/check.mjs` passed all 142 tests plus syntax, versions, manifests, assets, offline coverage, symbols and diff checks using the bundled Node executable (Node is absent from the default shell PATH). The in-app browser opened the existing Podcasts starter and showed its expected heading/placeholder. Temporary tab and preview server were closed. Standalone Playwright could not launch under the sandbox, so the focused check used the in-app browser. Provider integration and new UI are not implemented or verified yet.

## Open questions and proposed defaults

- Size boundaries: proposed S <30, M 30–<60, L 60–<90, XL 90+ minutes.
- Meaning of activity: proposed publisher completion plus a visible recency estimate and manual override; inactivity does not claim permanent cancellation.
- Membership cost: proposed one user-selected tier, actual yearly price where available, otherwise monthly ×12 with currency and an estimate label. Currency is required when entering a price; no silent USD assumption.
- Scope is the requested show library. Episode playback, subscription purchasing, individual episode tracking, ratings, pivots and background monitoring are outside this plan unless requested.

## Implementation verification

- `node scripts/check.mjs`: 155 tests passed, including schema/legacy envelope compatibility, import mappings and duplicate protections, price semantics, size/frequency/activity estimates and credential/URL validation. Syntax, version surfaces, manifests, assets, offline shell, symbols and diff checks passed. Used bundled Node because it is absent from the default shell PATH.
- `tests/podcasts.browser.cjs`: isolated Chromium with synthetic data and mocked catalog/RSS passed import/link, feed parsing, repeat import, personal-value preservation, stale editor rejection, failed storage writes, backup/sync round trips, desktop/390/320px layout, offline edit/save/reload and recovery deletion.
- Full prepared file imported and reloaded in a separate temporary profile: 60 entries, 36 Listening, 55 distinct catalog links, $641/year. Desktop and 390/320px had no page overflow. Visual inspection found and corrected narrow-column word wrapping. Screenshot remains in ignored `import-preparation/podcasts-preview.png`.
- Live keyless search in the in-app browser returned nine candidates for a public show query. Public RSS reads enriched 45 distinct feeds; ten exceeded 5 MiB and are documented in the import audit. Three shows remain unlinked rather than taking an uncertain match. Membership prices retain the user's supplied annual USD values and no invented verification date. Planet Money's website is corrected from verified RSS; its original mismatched URL remains in legacy data and the audit records the correction.
- Limitations: actual Pages-origin requests, authenticated GitHub/multi-device sync and a release cut were not performed. Private subscription feeds remain unsupported. Temporary previews are stopped; source data is not in runtime assets or the commit file set.
