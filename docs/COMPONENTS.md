# Components

The header contains the app icon, name/version, centered search, Notes, and Settings. Clicking the icon changes theme; holding it toggles Developer Mode. The version opens What’s New. Beta is a separate environment badge. Search finds movies, Notes, Help, releases, and configured Roadmap content, with keyboard-accessible results and escaped highlights.

The Movies workspace contains state filters, search, sorting, compact movie rows, and a TMDB-assisted editor. Other domain tabs retain starter views. Rows expose all metadata and personal fields; state labels and scores supplement the dark rating/light priority colors. The editor includes separate TMDB credential settings and attribution. Notes is a single plain-text modal with local autosave. Settings uses vertical icon-led tabs for Appearance and backup/reset, Data Sync, Help, What’s New, Roadmap, Shortcuts, and optional Developer diagnostics. Settings includes movie database background, favorites, rating mappings, and reference links. Roadmap preserves the spreadsheet backlog; What’s New includes separate legacy spreadsheet history. Mobile Settings has one full-screen scroll surface and sticky close header.

Shared core components handle modal focus restoration, confirmations, choices, toasts, menus, and live announcements. Use native labelled controls, visible focus, escaped user text, safe external URLs, and the existing inline SVG helper for interface actions. The helper has no product-data dependency.

Combined top-bar storage/sync status shares fourteen centralized presentations with Data Sync. Active sync rotates only the two-arrow modifier inside a stationary cloud and respects reduced motion. Initial sync/conflict choices use leading cloud symbols and left-aligned descriptions. Restore from Cloud requires confirmation and a successful recovery save.

Appearance retains light/dark/system modes, text scale, icon/text/both button presentation, hints, and hint restoration. Shortcut badges appear with Shift–Control–Option and remain scoped to the active dialog. Developer Mode adds DEV to the version and exposes storage/recovery diagnostics. PWA updates offer Force Refresh and dismiss actions.

The top bar includes combined storage/cloud-sync status and an Update button. Update checks for a new worker, saves current data, and force-refreshes; ready updates change its icon to red without an availability pop-up. Settings → Notifications controls What’s New dismissal from 1–300 seconds (default 20), stored in local preferences and full backups, excluded from content sync.

The Movies toolbar is sticky and combines the list/pivot switch, state filters, shown-count search, equal-width sort, and Add Movie. Table titles and column headings remain visible while scrolling. Shift–Control–Option–R activates Update outside dialogs.
