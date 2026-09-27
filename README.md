# Top Shelf 1.0

A static, local-first movie library with Wishlist, Watched, Notes and eight pivot views. The remaining shelves are starter views. No build step, backend, account or runtime dependency.

## Use

Serve the repository with `python3 -m http.server 8000`, then open `http://localhost:8000`. Stop with Control-C. Ordinary static hosting works; installation and offline caching require HTTPS or localhost.

- Add movies by title or TMDB ID; select the correct result explicitly.
- Click table cells to edit priority/rating, notes, How, dates and Other Pivots. Enter saves; Escape cancels.
- Wishlist shows TMDB average ratings beside Priority. Update Ratings refreshes scores; Update How checks US availability and bundled streaming estimates.
- Pivots summarize watched movies. Search each panel, adjust minimums, sort, resize columns and star people/companies/collections into Other Pivots.
- Notes autosaves. Settings offers backup/recovery, appearance, sync, movie-name/details exports and How values.
- Subgenre Review exports a request for an LLM and previews additive result imports before applying them.

Personal ratings use 0–5; priority 1 is highest. Ave uses TMDB's 0–10 scale with seven bands spanning 3–10. Unknown values remain blank/neutral. Streaming estimates are labelled and do not set Available Date. See [bundled rules](docs/STREAMING-RULES.md).

## TMDB

Enter your **TMDB API Read Access Token** in **Settings → Movie Lookup Settings**, choosing device or session storage. Lookup needs internet; saved movies remain usable offline. Tokens never enter source, backups, diagnostics or cloud content. Raw responses are available in the movie editor's collapsible TMDB Details.

This product uses the TMDB API but is not endorsed or certified by TMDB. Streaming availability comes from JustWatch through TMDB; rentals/purchases are excluded from subscription predictions.

## Storage and sync

Browser storage holds movies, Notes and local preferences. Export regular full JSON backups in Settings. Recovery copies precede destructive replacements. Local schema is 6; cloud format is top-shelf-app-data v5/schema 9. Prior formats remain readable. Update all devices before syncing so older clients do not drop newer optional movie fields.

GitHub Sync targets `themadat/app-data/main/data/top-shelf.json`. To provision it:

1. Create `data/top-shelf.json` containing `{}` in [the app-data repository](https://github.com/themadat/app-data/tree/main/data).
2. Create a [fine-grained token](https://github.com/settings/personal-access-tokens) restricted to app-data with **Contents: Read and write**.
3. Enter it only in **Settings → Data Sync**, then Test and Save. Configure each browser separately.
4. Verify a Notes upload/download round trip. Divergent edits require an explicit choice; timestamps do not choose winners.

Movie column widths are independent per All/Wishlist/Watched. Pivot widths and local sorting stay on each device, appear in full backups, and are excluded from content sync. Credentials are always excluded. More setup detail: [RESET](docs/RESET.md).

## Development

Run `node scripts/check.mjs` for tests, syntax, versions, manifests, assets, offline cache coverage and diff checks. It prints one summary on success and details on failure. See [testing](docs/TESTING.md) for focused browser checks.

Batch related edits, then run `node scripts/release.mjs --title "Release title" --summary "User-facing result"`. Add `--version 1.1.0` for a promotion or `--dry-run` to preview. The script updates version surfaces and preserves release history; it never commits or pushes. No version bump is needed for documentation/tooling-only changes.

[AGENTS.md](AGENTS.md) contains the short default instructions. The [reference index](context/LLM_HANDOFF.md) points to topic docs to read only when relevant. Historical release data is separate from config; movie styles and movie batch/column/tools code have focused files. Use a fresh task for unrelated work to avoid carrying completed conversation history.
