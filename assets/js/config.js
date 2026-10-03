(function () {
  "use strict";

  window.LocalApp = window.LocalApp || {};

  const CONFIG = {
    "identity": {
      "name": "Top Shelf",
      "shortName": "Top Shelf",
      "description": "A collection of personal rating lists across movies, TV, books, podcasts, restaurants, scotches, and more, with Movies, TV, Books and Podcasts available.",
      "version": "2.0.0.14",
      "buildId": "2.0.0.14",
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
      },
      {
        "id": "boardgames",
        "label": "Boardgames",
        "symbol": "shelfBoardgames",
        "shortcut": "9"
      }
    ],
    "schemaVersion": 11,
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
      "maxTvShows": 2000,
      "maxBooks": 5000,
      "maxPodcasts": 5000,
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
      {"version":"2.0.0.14","date":"2026-10-03T12:00:00.000Z","title":"Podcast property locks and aligned sort arrows","summary":"Lock individual podcast properties against feed updates and keep sort arrows right-aligned beside column names.","features":[],"improvements":[],"fixes":[],"knownIssues":[]}
    ],
    "roadmap": [{"id": "movie-people-lookup", "title": "Look Up Movies By Actor Or Director", "description": "From the spreadsheet backlog: look up movies by actors and directors and sort the results.", "state": "wishlist", "priority": 2, "target": "Unscheduled", "effort": 2, "createdAt": "2026-09-13"}, {"id": "movie-selection-link", "title": "Open A TMDB Search For Selected Text", "description": "From the spreadsheet backlog: add a lookup button that opens a TMDB link using the current text.", "state": "wishlist", "priority": 2, "target": "Unscheduled", "effort": 1, "createdAt": "2026-09-13"}],
    "help": [
      {"id": "podcasts", "title": "Podcasts and Table Import", "section": "Features", "keywords": "podcasts ratings pivots listening stopped active membership annual cost podcast index rss table import", "html": "<p>Use Podcast List for compact rows with inline 1–5 ratings, colored Listening/Stopped status, publisher and last episode. Search shows matching entry counts; press <kbd>.</kbd> to focus it. Pivots group matching entries by category, status, length, frequency, membership and publisher, with counts, personal averages and weighted scores. Select a group to filter the list.</p><p>Add podcasts manually or import your podcast table/prepared JSON file. Active in the table maps to Listening/Stopped; show publishing activity is separate. Imported prices are annual USD. Preview entries, review catalog matches, and apply selected changes. Reimporting preserves personal edits and can link existing unlinked entries.</p><p>Use the editor to search Podcast Index, choose a show, and refresh its public RSS feed. Your supplied classifications and prices are kept; unknown fields use available feed facts. Length sizes are S under 30 minutes, M 30–under 60, L 60–under 90, and XL 90+. Annual costs show $ plus the amount; hover for the stored currency and monthly annualization details. Unknown costs display an em dash. Saved editing works offline. If a feed blocks browser access, load a downloaded public RSS file. Update all app copies before syncing podcast data.</p>"},
      {"id": "books", "title": "Books, Wishlist and Pivots", "section": "Features", "keywords": "books authors genres year read audible ebook ownership open library rating review notes wishlist priority refresh", "html": "<p>Add books manually or search Open Library by title, author or ISBN and choose a match. Track Reading Status, Year Read, a 0–5 personal rating with half points, Ownership and multiple Formats. The Own column shows YES, NO or unknown. Priority 1 is highest; blank means unprioritized. Author uses one line; separate multiple authors with semicolons. Genres use commas. Short reviews and longer notes are separate plain-text fields.</p><p>Open Library averages are optional and link from the Ave column. Catalog information also shows Subjects, Publish Date, Publisher and Pages when available. Refresh Book Data updates linked books after saving recovery, while preserving personal fields and bibliographic corrections. Save Book keeps your draft locally. Saved books work offline; lookup and new covers need a connection. Pivots group completed books by author, genre and year read, with counts and averages of your own ratings. Update all app copies before syncing Books data.</p>"},
      {"id": "tv", "title": "TV Shows and Ratings", "section": "Features", "keywords": "tv television seasons episodes rating completed stopped active tmdb", "html": "<p>Add TV shows manually or search TMDB and choose a match. My Status (Watching, Caught Up, Want to Watch, Completed, Stopped) stays separate from TMDB series activity. Want to Watch uses priority 1–5 (1 highest) in the # column; other statuses use your show rating. Priority and rating stay separate when status changes. Show ratings use 0–5 with half-points; season and episode ratings use 1–10 with 1 = Did not Finish. Episodes also support half-points and plain-text notes. Blank means unrated. Your show score stays independent of calculated season/episode averages; specials are excluded from averages.</p><p>S and E badges beside a show rating indicate saved season rankings/ratings and episode ratings. Open a show to edit either level. Season details load on demand and stay available offline. Refresh Show Data updates all linked shows, regardless of filters, and preserves personal data. Refresh episodes inside a season to update its list. Save Show commits editor changes. Widths and sorting stay local to TV. Update all app copies before syncing TV data.</p>"},
      {"id": "movie-pivots", "title": "Movie Pivots", "section": "Features", "keywords": "dashboard statistics pivots counts average ratings genres years collections actors directors companies", "html": "<p>Choose Movies \u2192 Pivots to explore every watched movie. Wishlist and deleted movies are excluded; movie-list filters do not limit the dashboard. Each table shows movie counts and average numeric ratings, including mapped historical ratings. Change Min or click Count/Average to sort. Click the active button again to reverse direction. Other Pivots groups comma-separated Other tags, excluding preserved availability notes. Prefix a tag with Subgenre to include it in Genres with an asterisk. Other Pivots sorts within Others, Subgenres, and starred Collections. Press L/P to switch movie views. Years can group by release year or watched year; unknown years have their own group. Movies count once per matching group, so a movie with several genres appears in each. Missing metadata has a separate group. Actor results use the saved cast, currently up to ten actors per movie. Pivots are computed locally and work offline.</p>"},
      {"id": "movies", "title": "Movie Lists And TMDB", "section": "Features", "keywords": "movies watched wishlist priority rating how other tmdb token review", "html": "<p>Add a movie to Wishlist or Watched. Search TMDB by title and choose a match, or enter its numeric movie ID. Release date, genres, production companies, directors, top ten actors, and collection are filled automatically. How and Other are free text. Wishlist allows an optional available date, priority 1\u20135, and Notes. Watched requires a rating 0\u20135. Review is optional; leave its date blank when unknown. Historical ratings preserve their label and map to scores: 100! = 5, YES = 4, MEH = 3, NO = 2, RUN = 1. Mark watched opens the editor. Dark ratings run red to green on a 0\u20135 scale; light priorities run green (1) to red (5). Settings → TMDB Lookup Settings stores the TMDB API Read Access Token separately from backups and sync. Saved movie editing works offline. Update all app copies before syncing the new movie format.</p><p><img src=\"assets/icons/tmdb.svg\" class=\"tmdb-logo\" alt=\"TMDB\">This product uses the TMDB API but is not endorsed or certified by TMDB.</p><p><a href=\"https://www.themoviedb.org\" target=\"_blank\" rel=\"noopener noreferrer\">The Movie Database</a></p>"},
      {
        "id": "start",
        "title": "Getting Started",
        "section": "Basics",
        "keywords": "start top shelf movies tv ratings lists search",
        "html": "<p>Top Shelf is the foundation for personal rating lists across different domains, with Movies, TV, Books and Podcasts available. Choose a shelf in the top bar or press 1–8. Movies supports Wishlist and Watched lists. Add movies by TMDB title search or ID. TV tracks whole shows, seasons and episodes. Books supports reading details, a prioritized wishlist and author/genre/year-read pivots. Podcasts tracks listening, publishing activity, episode length, frequency, categories and memberships; other shelves remain starter views. Use Notes to collect ideas, Settings to adjust appearance, and <kbd>/</kbd> to search Notes and application support.</p>"
      },
      {
        "id": "notes",
        "title": "Working With Notes",
        "section": "Features",
        "keywords": "notes text edit modal autosave heading link collapse",
        "html": "<p>Open Overall Notes from the top bar or press <kbd>N</kbd>. Use H1–H3 headings, bold, italics and links. A heading's arrow collapses its section without deleting content. Hover over a link to see its URL; click to open it in a new tab. Notes save locally and are included in backup and synchronization data.</p>"
      },
      {
        "id": "backup",
        "title": "Backup And Restore",
        "section": "Data",
        "keywords": "json export import backup restore recovery",
        "html": "<p>Export a JSON backup from Settings. Imports are parsed, migrated, sanitized, summarized, and confirmed before replacement. The current copy is saved as a recovery snapshot first.</p>"
      },
      {
        "id": "sync",
        "title": "GitHub Synchronization",
        "section": "Data",
        "keywords": "github cloud sync token conflict merge",
        "html": "<p>GitHub Sync is optional. This app uses <code>themadat/app-data/main/data/top-shelf.json</code>. Create that file with <code>{}</code>, then create a fine-grained token restricted to <strong>app-data</strong> with <strong>Contents: Read and write</strong>. Enter it only in Settings → Data Sync, choose whether to remember it, then Test and Save. Sync Notes, movies, TV shows and books with Sync Now and verify them on another configured browser. The JSON preview shows the upload content; appearance and settings stay on each device. Conflicts ask which copy to keep. Full JSON backups also preserve settings.</p>"
      },
      {
        "id": "install",
        "title": "Install The Application",
        "section": "Installation",
        "keywords": "install add home screen iphone ipad android mac windows pwa offline update refresh shortcut",
        "html": "<p>Use your browser’s Install app, Add to Home Screen, or Add to Dock command. There is no in-app installation dialog. Once the application shell has loaded, core local features continue to work offline. When a new version is ready, press <kbd>R</kbd> to Force Refresh or <kbd>X</kbd> to close its notice.</p>"
      },
      {
        "id": "app-icon",
        "title": "App Icon Controls",
        "section": "Appearance",
        "keywords": "icon theme dark light beta developer mode hold press shortcut pipe",
        "html": "<p>Click or tap the app icon, or press <kbd>T</kbd>, to switch between light and dark themes. Press and hold the icon, or press <kbd>|</kbd> or <kbd>D</kbd>, to enable or disable Developer Mode. The Beta pill appears automatically on a <code>/beta/</code> URL or when <code>?beta=1</code> is present.</p>"
      },
      {
        "id": "privacy",
        "title": "Privacy And Local Data",
        "section": "Data",
        "keywords": "privacy local storage token secret",
        "html": "<p>Notes, movies, TV shows and books remain in browser storage unless you export them or explicitly use GitHub Sync. Tokens are stored separately per device and excluded from backups and diagnostics.</p>"
      },
      {
        "id": "shortcuts",
        "title": "Keyboard Access",
        "section": "Accessibility",
        "keywords": "keyboard shortcuts slash escape alt option shift control hints hover version update refresh developer countdown",
        "html": "<p>Press <kbd>/</kbd> for search, <kbd>N</kbd> for Notes, <kbd>V</kbd> for What’s New, <kbd>T</kbd> for theme, <kbd>|</kbd> or <kbd>D</kbd> for Developer Mode, <kbd>,</kbd> for Settings, <kbd>1</kbd>–<kbd>8</kbd> for shelves, <kbd>S</kbd> for sync, <kbd>E</kbd> for backup export, and <kbd>H</kbd> or <kbd>?</kbd> for Help. What’s New closes after 20 seconds by default or with <kbd>X</kbd>; change its duration in Settings → Notifications. Use Update in the top bar or Shift–Control–Option–R to check and force refresh. Its icon turns red when a new version is ready. Hold Shift–Control–Option to reveal available shortcut badges. Escape closes dialogs.</p>"
      }
    ]
  };

  window.LocalApp.config = Object.freeze(CONFIG);
})();
