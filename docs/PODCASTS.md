# Podcasts

Podcasts is a local library of shows and optional membership-only entries. It supports name, Listening/Stopped status, publishing activity, S/M/L/XL length, release frequency, parent categories and subcategories, membership availability/tier/price, and website. Search includes saved and catalog names, publisher, categories and membership tier. Filters and sort direction are device-local; full backups retain them, content sync excludes them.

## Personal values and catalog metadata

The saved fields and `catalog` snapshot are separate. Linking or reading RSS never overwrites a supplied name, listening status, category, length, frequency, website or membership price. Unknown size/activity/frequency and empty categories/website use catalog values when available; setting Unknown or clearing those fields returns them to automatic display. The editor explains this behavior. Manual activity is independent of personal listening status.

Categories use one editor line per parent: `Technology > Software, Hardware`. Multiple parents are supported. Flat catalog genres remain parent labels; RSS preserves the published hierarchy. Membership availability is Yes/No/Unknown. A funding URL alone never sets Yes, and a missing price never becomes zero. Price includes a currency and Annual/Monthly/Variable/Unknown billing basis. Annual prices display directly, monthly prices display ×12 as an estimate, and variable or unknown billing has no guessed annual total. The optional checked date records manual price verification. The source import's prices are not verified against current offers.

S is under 30 minutes; M 30–under 60; L 60–under 90; XL 90 or more. RSS estimates use up to 20 most recent dated full episodes, excluding explicit trailer/bonus entries, duplicate identities, invalid dates and future episodes. At least three positive valid durations are needed for the arithmetic mean. Four distinct dates are needed for frequency: median gaps through 1.5/4/9/18/40 days map to Daily/Several times a week/Weekly/Every two weeks/Monthly; longer or inconsistent gaps are Irregular. Seasonal remains a manual option.

A publisher completion flag yields Inactive with an explanation. Otherwise four dated episodes permit a recency estimate: Active within max(90 days, three median gaps), Inactive beyond that window. Sparse history stays Unknown. Recency estimates do not establish permanent cancellation. Last episode and sample details are visible in the editor. A partial feed retains previously usable observations; failed requests preserve the entire prior snapshot.

## Discovery and public feeds

`core/podcast-catalog.js` uses Podcast Index's keyless Apple-compatible search/lookup endpoints. The numeric `appleId` is an Apple catalog ID returned by Podcast Index, not a Podcast Index feed ID. Feed URL is a separate identity. Requests omit credentials, serialize at least 1.2 seconds apart, time out after 15 seconds and back off for a minute after 429. Search caches are transient. Search results require an explicit title/publisher choice; no runtime title-only auto-linking. Stop, close and query changes cancel requests, and stale responses cannot replace edited drafts.

Live browser search was verified from the local preview. Public endpoints can change or become unavailable. RSS servers independently control CORS; when direct refresh fails, a downloaded public RSS XML file can be read locally. Responses/files are limited to 5 MiB. XML DTD/entity declarations are rejected, feed HTML is never rendered, and episode audio is never downloaded. HTTP(S) URLs with embedded credentials or credential query keys are rejected; public RSS URLs only, with restricted query parameters. Unusable feed URLs are omitted from catalog candidates while preserving their safe catalog identity. Private subscription feeds are unsupported.

References: [Podcast Index API](https://podcastindex-org.github.io/docs-api/), [RSS fields](https://help.apple.com/itc/podcasts_connect/en.lproj/itcb54353390.html), [funding tags](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/tags/funding.md). Apple-compatible search `releaseDate` is deliberately not used as a show's latest publication date; feed episode dates provide that evidence.

## Supplied-table importer

Podcasts → Import Podcasts accepts the supplied 11-column Markdown or tab-separated table, pasted or loaded from a file. It also accepts a prepared JSON envelope: `{format: "top-shelf-podcasts-import", version: 1, podcasts: [...], audit: [...]}`. This is a podcast-table importer, not an arbitrary spreadsheet or full-app restore.

- Active TRUE/FALSE maps to Listening/Stopped, as confirmed by the user. It never sets publishing activity.
- Len. preserves S/M/L/XL. Couple maps to Several times a week, Every Other to Every two weeks, Random to Irregular. Original recurrence text, Last, Time, source name and source URL remain in `legacy`; Last and Time have no invented semantics.
- Costs are the supplied annual USD amounts. Blank/— values mean unknown. A named membership or supplied price records availability; membership-only rows with membership/plus URLs remain separate entries.
- Blank/footer/totals rows are ignored with audit messages. Invalid columns, values, URLs, duplicate row IDs and oversized inputs fail before application. Markdown bold, `<br>`, nonbreaking-space entities and Markdown links are handled without rendering HTML.
- IDs/source keys derive from the source name for repeatable imports. Preview shows values, candidate matches, selected additions/links and explicit skip reasons. Matching can be searched per row with an editable query or for selected unlinked shows, and stopped. Existing catalog IDs/feed URLs cannot be assigned twice.
- Reimporting an existing unlinked source entry attaches only catalog metadata. Existing personal edits, linked rows and tombstones are kept. Reused IDs for unrelated names and same-name entries without matching source identity are skipped for review rather than silently merged.
- Application saves recovery, checks the preview and browser storage for intervening edits, validates the final library and persists before reporting success. Cancelling/closing during recovery prevents application. Failed writes retain live data and the editable preview.

Personal source, candidate results, prepared JSON and feed downloads belong in ignored `import-preparation/`. They are never bundled, seeded automatically, or committed as runtime assets. Importing and optional GitHub Sync remain separate actions.

## Persistence and verification

Local schema 10 adds `workspace.podcasts`; supported older local schemas migrate with an empty podcast library. Cloud v10/schema 14 includes podcasts and rejects unsupported content in older envelopes. All v1–v9 cloud formats remain readable, including v9 formatted Notes. The storage key stays compatible. Full backup/restore, content hashing, merge, import counts, preference reset and recovery include podcasts. Conflicting records or duplicate linked identities require a choice; timestamps do not choose winners. Delete saves recovery before creating a tombstone. Editor and import guards reject concurrent changes.

Run `node scripts/check.mjs`. With Playwright available, serve the preview and run `node tests/podcasts.browser.cjs` (optional `PODCAST_TEST_URL`). The isolated browser suite uses synthetic data and mocked providers, checking import/link, RSS enrichment, repeat imports, stale drafts, failed writes, backup/content round trips, desktop/390/320px layout, offline edit/reload and recovery deletion. No runtime dependency is added. Real multi-device/authenticated GitHub Sync requires separate verification.
