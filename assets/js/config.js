(function () {
  "use strict";

  window.LocalApp = window.LocalApp || {};

  const CONFIG = {
    "identity": {
      "name": "Top Shelf",
      "shortName": "Top Shelf",
      "description": "A collection of personal rating lists across movies, TV, books, podcasts, restaurants, scotches, and more, starting with movies and TV.",
      "version": "0.0.1.8",
      "buildId": "0.0.1.8",
      "repository": {
        "label": "App repository",
        "url": "https://github.com/themadat/top-shelf"
      },
      "support": [
        {
          "label": "Report a problem",
          "url": "https://github.com/themadat/top-shelf/issues/new"
        },
        {
          "label": "View documentation",
          "url": "https://github.com/themadat/top-shelf#readme"
        }
      ],
      "assets": {
        "favicon": "assets/icons/favicon.svg",
        "appIconLight": "assets/icons/app-icon-light.svg",
        "appIconDark": "assets/icons/app-icon-dark.svg",
        "manifestLight": "manifest.webmanifest",
        "manifestDark": "manifest-dark.webmanifest"
      }
    },
    "shelves": [
      {
        "id": "movies",
        "label": "Movies",
        "symbol": "shelfMovies",
        "shortcut": "1"
      },
      {
        "id": "tv",
        "label": "TV",
        "symbol": "shelfTV",
        "shortcut": "2"
      },
      {
        "id": "books",
        "label": "Books",
        "symbol": "shelfBooks",
        "shortcut": "3"
      },
      {
        "id": "podcasts",
        "label": "Podcasts",
        "symbol": "shelfPodcasts",
        "shortcut": "4"
      },
      {
        "id": "music",
        "label": "Music",
        "symbol": "shelfMusic",
        "shortcut": "5"
      },
      {
        "id": "restaurants",
        "label": "Restaurants",
        "symbol": "shelfRestaurants",
        "shortcut": "6"
      },
      {
        "id": "food",
        "label": "Food",
        "symbol": "shelfFood",
        "shortcut": "7"
      },
      {
        "id": "scotches",
        "label": "Scotches",
        "symbol": "shelfScotches",
        "shortcut": "8"
      }
    ],
    "schemaVersion": 5,
    "storage": {
      "stateKey": "topShelf.state.v5",
      "legacyKeys": ["topShelf.state.v4"],
      "recoveryKey": "topShelf.recovery.v1",
      "secretKey": "topShelf.githubToken.v1",
      "tmdbSecretKey": "topShelf.tmdbToken.v1",
      "sessionSecretKey": "topShelf.githubToken.session.v1"
    },
    "cloudSync": {
      "owner": "themadat",
      "repo": "app-data",
      "branch": "main",
      "path": "data/top-shelf.json"
    },
    "features": {
      "records": false,
      "documents": true,
      "cloudSync": true,
      "roadmap": true,
      "developerTools": true,
      "hints": true,
      "demoData": false
    },
    "controls": {
      "shortcutHintModifier": "ShiftControlOption",
      "autosaveDelayMs": 180,
      "syncCheckIntervalMs": 300000,
      "whatsNewAutoDismissMs": 20000,
      "maxImportBytes": 5242880,
      "maxRecords": 5000,
      "maxMovies": 5000,
      "maxDocuments": 500,
      "maxTextLength": 20000,
      "maxDocumentHtmlLength": 250000
    },
    "statuses": [
      {
        "id": "active",
        "label": "Active",
        "icon": "●",
        "color": "#2f7d68"
      },
      {
        "id": "paused",
        "label": "Paused",
        "icon": "Ⅱ",
        "color": "#a86a1f"
      },
      {
        "id": "complete",
        "label": "Complete",
        "icon": "✓",
        "color": "#4f6f52"
      },
      {
        "id": "idea",
        "label": "Idea",
        "icon": "◇",
        "color": "#7058a3"
      }
    ],
    "themeDefaults": {
      "accent": "#008080",
      "accent2": "#ff7f50",
      "success": "#4f745f",
      "warning": "#9b6a24",
      "danger": "#a74747"
    },
    "releases": [
      {"version": "0.0.1.8", "date": "2026-09-14T12:00:00.000Z", "title": "Smaller category icons", "summary": "Top-bar category symbols are 25% smaller on desktop and mobile.", "features": [], "improvements": ["More compact category icons with existing tab touch targets retained"], "fixes": [], "knownIssues": []},
      {"version": "0.0.1.7", "date": "2026-09-14T12:00:00.000Z", "title": "Movie database info", "summary": "Movie database background has a dedicated Info section below Data Sync.", "features": ["Info tab with the supplied square information icon"], "improvements": ["Background, preferences, historical ratings, and reference links grouped in Info"], "fixes": [], "knownIssues": []},
      {"version": "0.0.1.6", "date": "2026-09-14T12:00:00.000Z", "title": "Top-bar sync and updates", "summary": "Keep sync and app updates in the top bar, with a shorter configurable What\u2019s New banner.", "features": ["Cloud sync status and actions in the top bar", "Update button checks, installs, and force refreshes; ready updates show a red icon", "What\u2019s New dismissal setting: 1\u2013300 seconds, default 20"], "improvements": ["Update availability no longer opens a pop-up notification"], "fixes": [], "knownIssues": []},
      {"version": "0.0.1.5", "date": "2026-09-13T23:30:00.000Z", "title": "Movie pivots", "summary": "Explore every watched movie with counts and average ratings.", "features": ["Pivots for genres, ratings, years, collections, actors, directors, and production companies", "Independent sorting and minimum movie counts for each table", "Switch between release year and watched year"], "improvements": ["Includes historical ratings and groups missing metadata or dates", "Dashboard updates from saved movies and works offline"], "fixes": [], "knownIssues": ["Actor pivots use the saved cast, currently up to ten actors per movie."]},
      {"version": "0.0.1.4", "date": "2026-09-13T23:00:00.000Z", "title": "Movie history and preferences", "summary": "Keep historical ratings and movies with unknown watch dates, with spreadsheet reference information organized in Settings.", "features": ["Historical ratings: 100!, YES, MEH, NO, RUN map to 5\u20131", "Unknown watched dates", "Movie preferences, reference links, backlog, and legacy spreadsheet history in Settings"], "improvements": ["Historical rating labels survive backups and sync"], "fixes": [], "knownIssues": ["Update all copies to 0.0.1.4 before syncing."]},
      {"version": "0.0.1.3", "date": "2026-09-13T20:00:00.000Z", "title": "Your movie lists", "summary": "Keep a wishlist, rate watched movies, and fill movie details from TMDB.", "features": ["Wishlist and Watched lists with editing, filtering, and sorting", "TMDB title search and ID lookup with movie metadata", "Teal and coral accents, dark rating colors, and light priority colors"], "improvements": ["Movies included in backups, recovery, and GitHub Sync", "TMDB credentials stored separately on each browser"], "fixes": [], "knownIssues": ["TMDB lookup needs an internet connection and an API Read Access Token.", "Update all copies to 0.0.1.3 before syncing movie data."]},
      {"version": "0.0.1.2", "date": "2026-09-13T18:00:00.000Z", "title": "Rating-list navigation", "summary": "Eight top-bar tabs with supplied artwork, counts, and keyboard navigation.", "features": ["Movies, TV, Books, Podcasts, Music, Restaurants, Food, and Scotches tabs"], "improvements": ["Number keys 1\u20138 switch shelves; selection stays on this device", "Compact icon, label, and count layout inspired by My Stuff"], "fixes": [], "knownIssues": ["Rating-list entry and scoring are not implemented yet."]},
      {
        "version": "0.0.1.1",
        "date": "2026-09-13T12:00:00.000Z",
        "title": "Top Shelf foundation",
        "summary": "A local-first foundation for personal rating lists, with movies and TV planned first.",
        "features": [
          "Notes with local autosave",
          "Appearance settings, JSON backups, and recovery",
          "Optional GitHub Sync and offline support"
        ],
        "improvements": [],
        "fixes": [],
        "knownIssues": [
          "GitHub Sync requires a configured data file and fine-grained token."
        ]
      }
    ],
    "roadmap": [{"id": "movie-people-lookup", "title": "Look up movies by actor or director", "description": "From the spreadsheet backlog: look up movies by actors and directors and sort the results.", "state": "wishlist", "priority": 2, "target": "Unscheduled", "effort": 2, "createdAt": "2026-09-13"}, {"id": "movie-selection-link", "title": "Open a TMDB search for selected text", "description": "From the spreadsheet backlog: add a lookup button that opens a TMDB link using the current text.", "state": "wishlist", "priority": 2, "target": "Unscheduled", "effort": 1, "createdAt": "2026-09-13"}],
    "help": [
      {"id": "movie-pivots", "title": "Movie pivots", "section": "Features", "keywords": "dashboard statistics pivots counts average ratings genres years collections actors directors companies", "html": "<p>Choose Movies \u2192 Pivots to explore every watched movie. Wishlist and deleted movies are excluded; movie-list filters do not limit the dashboard. Each table shows movie counts and average numeric ratings, including mapped historical ratings. Change its minimum count or sort by count, average, or name. Years can group by release year or watched year; unknown years have their own group. Movies count once per matching group, so a movie with several genres appears in each. Missing metadata has a separate group. Actor results use the saved cast, currently up to ten actors per movie. Pivots are computed locally and work offline.</p>"},
      {"id": "movies", "title": "Movie lists and TMDB", "section": "Features", "keywords": "movies watched wishlist priority rating how other tmdb token review", "html": "<p>Add a movie to Wishlist or Watched. Search TMDB by title and choose a match, or enter its numeric movie ID. Release date, genres, production companies, directors, top ten actors, and collection are filled automatically. How and Other are free text. Wishlist allows an optional available date, priority 1\u20135, and Notes. Watched requires a rating 1\u20135 and review; leave its date blank when unknown. Historical ratings preserve their label and map to scores: 100! = 5, YES = 4, MEH = 3, NO = 2, RUN = 1. Mark watched opens the editor. Dark ratings run red to green on a 0\u20135 scale; light priorities run green (1) to red (5). Movie lookup settings in the editor stores the TMDB API Read Access Token separately from backups and sync. Saved movie editing works offline. Update all app copies before syncing the new movie format.</p><p><img src=\"assets/icons/tmdb.svg\" class=\"tmdb-logo\" alt=\"TMDB\">This product uses the TMDB API but is not endorsed or certified by TMDB.</p><p><a href=\"https://www.themoviedb.org\" target=\"_blank\" rel=\"noopener noreferrer\">The Movie Database</a></p>"},
      {
        "id": "start",
        "title": "Getting started",
        "section": "Basics",
        "keywords": "start top shelf movies tv ratings lists search",
        "html": "<p>Top Shelf is the foundation for personal rating lists across different domains, starting with movies and TV. Choose a shelf in the top bar or press 1–8. Movies supports Wishlist and Watched lists. Add movies by TMDB title search or ID; other shelves remain starter views. Use Notes to collect ideas, Settings to adjust appearance, and <kbd>/</kbd> to search Notes and application support.</p>"
      },
      {
        "id": "notes",
        "title": "Working with Notes",
        "section": "Features",
        "keywords": "notes text edit modal autosave",
        "html": "<p>Open Notes from the top bar or press <kbd>N</kbd>. The single plain-text editor saves locally and is included in backup and synchronization data.</p>"
      },
      {
        "id": "backup",
        "title": "Backup and restore",
        "section": "Data",
        "keywords": "json export import backup restore recovery",
        "html": "<p>Export a JSON backup from Settings. Imports are parsed, migrated, sanitized, summarized, and confirmed before replacement. The current copy is saved as a recovery snapshot first.</p>"
      },
      {
        "id": "sync",
        "title": "GitHub synchronization",
        "section": "Data",
        "keywords": "github cloud sync token conflict merge",
        "html": "<p>GitHub Sync is optional. This app uses <code>themadat/app-data/main/data/top-shelf.json</code>. Create that file with <code>{}</code>, then create a fine-grained token restricted to <strong>app-data</strong> with <strong>Contents: Read and write</strong>. Enter it only in Settings → Data Sync, choose whether to remember it, then Test and Save. Sync Notes and movies with Sync Now and verify them on another configured browser. The JSON preview shows the upload content; appearance and settings stay on each device. Conflicts ask which copy to keep. Full JSON backups also preserve settings.</p>"
      },
      {
        "id": "install",
        "title": "Install the application",
        "section": "Installation",
        "keywords": "install add home screen iphone ipad android mac windows pwa offline update refresh shortcut",
        "html": "<p>Use your browser’s Install app, Add to Home Screen, or Add to Dock command. There is no in-app installation dialog. Once the application shell has loaded, core local features continue to work offline. When a new version is ready, press <kbd>R</kbd> to Force Refresh or <kbd>X</kbd> to close its notice.</p>"
      },
      {
        "id": "app-icon",
        "title": "App icon controls",
        "section": "Appearance",
        "keywords": "icon theme dark light beta developer mode hold press shortcut pipe",
        "html": "<p>Click or tap the app icon, or press <kbd>T</kbd>, to switch between light and dark themes. Press and hold the icon, or press <kbd>|</kbd> or <kbd>D</kbd>, to enable or disable Developer Mode. The Beta pill appears automatically on a <code>/beta/</code> URL or when <code>?beta=1</code> is present.</p>"
      },
      {
        "id": "privacy",
        "title": "Privacy and local data",
        "section": "Data",
        "keywords": "privacy local storage token secret",
        "html": "<p>Notes and movies remain in browser storage unless you export them or explicitly use GitHub Sync. Tokens are stored separately per device and excluded from backups and diagnostics.</p>"
      },
      {
        "id": "shortcuts",
        "title": "Keyboard access",
        "section": "Accessibility",
        "keywords": "keyboard shortcuts slash escape alt option shift control hints hover version update refresh developer countdown",
        "html": "<p>Press <kbd>/</kbd> for search, <kbd>N</kbd> for Notes, <kbd>V</kbd> for What’s New, <kbd>T</kbd> for theme, <kbd>|</kbd> or <kbd>D</kbd> for Developer Mode, <kbd>,</kbd> for Settings, <kbd>1</kbd>–<kbd>8</kbd> for shelves, <kbd>S</kbd> for sync, <kbd>E</kbd> for backup export, and <kbd>H</kbd> or <kbd>?</kbd> for Help. What’s New closes after 20 seconds by default or with <kbd>X</kbd>; change its duration in Settings → Notifications. Use Update in the top bar to check and force refresh. Its icon turns red when a new version is ready. Hold Shift–Control–Option to reveal available shortcut badges. Escape closes dialogs.</p>"
      }
    ]
  };

  window.LocalApp.config = Object.freeze(CONFIG);
})();
