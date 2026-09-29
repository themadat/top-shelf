# Top Shelf

A static, local-first movie, TV and book library with Wishlist, Watched, Notes and eight movie pivot views. Boardgames and the other shelves remain starter views. No build step, backend, account or runtime dependency.

## Use

Serve the repository with `python3 -m http.server 8000`, then open `http://localhost:8000`. Stop with Control-C. Ordinary static hosting works; installation and offline caching require HTTPS or localhost.

- Add movies by title or TMDB ID; select the correct result explicitly.
- Click table cells to edit priority/rating, notes, How, dates and Other Pivots. Enter saves; Escape cancels.
- Wishlist shows TMDB average ratings beside Priority. Update Ratings refreshes scores; Update How checks US availability and bundled streaming estimates.
- Pivots summarize watched movies. Search each panel, adjust minimums, sort, resize columns and star people/companies/collections into Other Pivots.
- TV → Import Shows previews additive TV import JSON files; existing shows are preserved.
- TV tracks Want to Watch, Watching, Caught Up, Completed and Stopped separately from series activity. Rate shows 0–5, seasons 1–10 and episodes 1–10 with half-points. Episode notes, compact tables and separate Type/Genres/Networks pivot cards remain usable offline.
- Books supports Open Library title/author/ISBN lookup, optional community ratings, year read, ownership, Ebook/Audiobook/Audible, reviews, notes, a prioritized wishlist and author/genre/year-read pivots. No lookup key is needed. See [Books](docs/BOOKS.md).
- Notes autosaves. Settings offers backup/recovery, appearance, sync, movie-name/details exports and How values.
- Subgenre Review exports a request for an LLM and previews additive result imports before applying them.

Personal ratings use 0–5; priority 1 is highest. Ave uses TMDB's 0–10 scale with seven bands spanning 3–10. Unknown values remain blank/neutral. Streaming estimates are labelled and do not set Available Date. See [bundled rules](docs/STREAMING-RULES.md).

## TMDB

Enter your **TMDB API Read Access Token** in **Settings → TMDB Lookup Settings**, choosing device or session storage. Lookup needs internet; saved movies and TV shows remain usable offline. TV searches require selecting a match; season episode lists load on demand. Refresh Show Data checks all linked shows, preserves personal ratings/notes, and skips shows being edited. Tokens never enter source, backups, diagnostics or cloud content. Raw responses are available in the movie editor's collapsible TMDB Details.

This product uses the TMDB API but is not endorsed or certified by TMDB. Streaming availability comes from JustWatch through TMDB; rentals/purchases are excluded from subscription predictions.

## Storage and sync

Browser storage holds movies, TV shows, books, Notes and local preferences. Export regular full JSON backups in Settings. Recovery copies precede destructive replacements. Local schema is 8; cloud format is top-shelf-app-data v7/schema 11. Prior formats remain readable. Update all devices before syncing; older clients reject the Books format.

GitHub Sync targets `themadat/app-data/main/data/top-shelf.json`. To provision it:

1. Create `data/top-shelf.json` containing `{}` in [the app-data repository](https://github.com/themadat/app-data/tree/main/data).
2. Create a [fine-grained token](https://github.com/settings/personal-access-tokens) restricted to app-data with **Contents: Read and write**.
3. Enter it only in **Settings → Data Sync**, then Test and Save. Configure each browser separately.
4. Verify a Notes upload/download round trip. Divergent edits require an explicit choice; timestamps do not choose winners.

Movie column widths are independent per All/Wishlist/Watched. TV has separate local widths, sorting and filters. Pivot widths and local sorting stay on each device, appear in full backups, and are excluded from content sync. Credentials are always excluded. More setup detail: [RESET](docs/RESET.md).

## Development

Use [AGENTS.md](AGENTS.md) for the short working instructions, [WORKFLOWS.md](docs/WORKFLOWS.md) for release commands, and [TESTING.md](docs/TESTING.md) for verification. The optional [handoff index](context/LLM_HANDOFF.md) maps tasks to code and focused contracts. Current version and history come from the app's release files, not this README.
