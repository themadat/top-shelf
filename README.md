# Top Shelf

Top Shelf is a collection of personal rating lists across movies, TV, books, podcasts, restaurants, scotches, and future domains. Movies and TV are the first planned areas.

Version **0.0.1.9** includes the Movies shelf with Wishlist and Watched states, TMDB lookup, local editing, filtering, sorting, and teal/coral accents. Other shelves retain their starter views. The shell keeps Notes, Settings, backup/recovery, optional GitHub Sync, and offline support.

## Movies

Choose **Add movie**, search by title and select the correct match, or enter a numeric TMDB ID. Lookup fills release date, TMDB ID, genres, production companies, directors, the top ten cast members, and collection. Title can be edited; How and Other are free text. TMDB sometimes has no release date or collection, which is shown explicitly.

- **Wishlist:** optional available date, whole-number priority 1–5, and Notes.
- **Watched:** optional watched date (blank means unknown), required decimal rating 0–5 or mapped historical rating, and optional review.
- Add in either state, edit existing movies, or use Mark watched. One active entry per TMDB movie is allowed. Original Wishlist extras remain stored when you change state.
- Ratings use dark colors from red at 0 to green at 5; entry accepts 0–5. Priorities use light colors from green at 1 to red at 5. Labels and numbers keep the meaning available without color.

In **Add movie → Movie lookup settings**, enter your **TMDB API Read Access Token** once per browser and choose device or tab storage. Tokens never appear in source, backups, diagnostics, or cloud content. Lookup needs internet; existing movies can be read and edited offline. The provided read token was verified in a temporary test browser; configure it in your own app browser before lookup.

TMDB search deliberately requires selecting a result instead of guessing the first title. Credits are fetched with details using [append_to_response](https://developer.themoviedb.org/docs/append-to-response). The checked-in logo comes from [TMDB’s attribution page](https://www.themoviedb.org/about/logos-attribution). This product uses the TMDB API but is not endorsed or certified by TMDB.

## Run locally

This is static HTML, CSS, and JavaScript with no build step or runtime dependency. Serve this directory with `python3 -m http.server 8000`, then open http://localhost:8000. Stop the server with Control-C. An ordinary static host also works. Install and service-worker features need HTTPS or localhost.

## Data and GitHub Sync

Movies and Notes save in browser storage under a Top Shelf namespace. Export full JSON backups in Settings; import and recovery preserve a copy before replacing local data. Credentials stay outside backups, sync payloads, and diagnostics. Cloud data carries movies (including deletion markers), Notes, and any nonempty legacy record content; settings remain on each device.

GitHub Sync is enabled and fixed to `themadat/app-data/main/data/top-shelf.json`. The external file and token still need user setup:

1. In [app-data/data](https://github.com/themadat/app-data/tree/main/data), create `top-shelf.json` on `main` containing `{}` and commit it.
2. Create a [fine-grained token](https://github.com/settings/personal-access-tokens) named Top Shelf, resource owner `themadat`, **Only select repositories → app-data**, **Contents → Read and write**.
3. Enter the token only in **Settings → Data Sync**, select whether to remember it, then **Test** and **Save**. Never paste the token into chat or source.
4. Use **Sync Now**, configure another browser, and confirm a Notes upload/download round trip. Configure credentials separately on each device.

The target is configured locally; file existence, token permissions, and a real round trip remain unverified until this checklist is completed. See [reset/setup checklist](docs/RESET.md).

Update all app copies to **0.0.1.4** before syncing movies. Local state/backups now use schema v5, cloud content uses format v3/schema v7, and prior local/cloud content remains readable. Older builds reject the new format. A merge combines disjoint movies but requires a choice for differing edits or deletion conflicts. Full replacement/import saves recovery first.

## Artwork and hosting

`assets/icons/top-shelf.svg` is the supplied editable star-and-shelf artwork. Light and dark variants share that source. Maskable assets scale the complete foreground to 70% on a full-bleed blue canvas for circular crop safety. Install, touch, favicon, and splash assets are checked in.

The [repository](https://github.com/themadat/top-shelf) retains its GitHub Pages Actions workflow. Set Pages Source to GitHub Actions for a single deployment path. No repository creation, commits, push, or deployment is part of this reset.

See [architecture](docs/ARCHITECTURE.md), [components](docs/COMPONENTS.md), [customization](docs/CUSTOMIZATION.md), [testing](docs/TESTING.md), and [two-laptop Git setup](docs/GIT-SETUP.md). Agent lifecycle contracts live in [the handoff](context/LLM_HANDOFF.md).

Historical ratings preserve their labels and map to numeric scores: 100! = 5, YES = 4, MEH = 3, NO = 2, RUN = 1. Leave a watched date blank when unknown. Settings includes the original movie database background, favorites, and reference links; Roadmap and What’s New retain its backlog and spreadsheet history.

### Movie pivots

Choose **Movies → Pivots** for counts and average ratings across genres, ratings, years, collections, actors, directors, and production companies. All watched movies are included, regardless of list filters. Each table has a minimum movie count and sorting by count, average, or name/value. Switch years between release year and watched year. Unknown dates and missing metadata get their own groups. Historical scores are included; averages display two decimal places. A movie can count in several groups, once per group. Actor pivots use the saved cast (up to ten actors per movie). Dashboard controls last for the current session; results update automatically and work offline.

The top bar includes combined storage/cloud-sync status and an Update button. Update checks for a new worker, saves current data, and force-refreshes; ready updates change its icon to red without an availability pop-up. Settings → Notifications controls What’s New dismissal from 1–300 seconds (default 20), stored in local preferences and full backups, excluded from content sync.
