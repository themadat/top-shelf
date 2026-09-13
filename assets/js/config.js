(function () {
  "use strict";

  window.LocalApp = window.LocalApp || {};

  const CONFIG = {
    "identity": {
      "name": "Top Shelf",
      "shortName": "Top Shelf",
      "description": "A collection of personal rating lists across movies, TV, books, podcasts, restaurants, scotches, and more, starting with movies and TV.",
      "version": "0.0.1.1",
      "buildId": "0.0.1.1",
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
    "schemaVersion": 4,
    "storage": {
      "stateKey": "topShelf.state.v4",
      "legacyKeys": [],
      "recoveryKey": "topShelf.recovery.v1",
      "secretKey": "topShelf.githubToken.v1",
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
      "whatsNewAutoDismissMs": 30000,
      "maxImportBytes": 5242880,
      "maxRecords": 5000,
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
      "accent": "#315f73",
      "accent2": "#b86b4b",
      "success": "#4f745f",
      "warning": "#9b6a24",
      "danger": "#a74747"
    },
    "releases": [
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
    "roadmap": [],
    "help": [
      {
        "id": "start",
        "title": "Getting started",
        "section": "Basics",
        "keywords": "start top shelf movies tv ratings lists search",
        "html": "<p>Top Shelf is the foundation for personal rating lists across different domains, starting with movies and TV. The workspace is currently blank. Use Notes to collect ideas, Settings to adjust appearance, and <kbd>/</kbd> to search Notes and application support.</p>"
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
        "html": "<p>GitHub Sync is optional. This app uses <code>themadat/app-data/main/data/top-shelf.json</code>. Create that file with <code>{}</code>, then create a fine-grained token restricted to <strong>app-data</strong> with <strong>Contents: Read and write</strong>. Enter it only in Settings → Data Sync, choose whether to remember it, then Test and Save. Sync Notes with Sync Now and verify them on another configured browser. The JSON preview shows the upload content; appearance and settings stay on each device. Conflicts ask which copy to keep. Full JSON backups also preserve settings.</p>"
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
        "html": "<p>Notes remain in browser storage unless you export them or explicitly use GitHub Sync. Tokens are stored separately per device and excluded from backups and diagnostics.</p>"
      },
      {
        "id": "shortcuts",
        "title": "Keyboard access",
        "section": "Accessibility",
        "keywords": "keyboard shortcuts slash escape alt option shift control hints hover version update refresh developer countdown",
        "html": "<p>Press <kbd>/</kbd> for search, <kbd>N</kbd> for Notes, <kbd>V</kbd> for What’s New, <kbd>T</kbd> for theme, <kbd>|</kbd> or <kbd>D</kbd> for Developer Mode, <kbd>,</kbd> for Settings, <kbd>2</kbd> for Roadmap, <kbd>S</kbd> for sync, <kbd>E</kbd> for backup export, and <kbd>H</kbd> or <kbd>?</kbd> for Help. What’s New closes after 30 seconds or with <kbd>X</kbd>. When an update is ready, use <kbd>R</kbd> to Force Refresh or <kbd>X</kbd> to close its notice. Hold Shift–Control–Option to reveal available shortcut badges. Escape closes dialogs.</p>"
      }
    ]
  };

  window.LocalApp.config = Object.freeze(CONFIG);
})();
