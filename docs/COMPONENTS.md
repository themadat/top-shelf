# Components

The header contains the app icon, name/version, centered search, Notes, and Settings. Clicking the icon changes theme; holding it toggles Developer Mode. The version opens What’s New. Beta is a separate environment badge. Search finds Notes, Help, releases, and configured Roadmap content, with keyboard-accessible results and escaped highlights.

The semantic main workspace is blank. Notes is a single plain-text modal with local autosave. Settings uses vertical icon-led tabs for Appearance and backup/reset, Data Sync, Help, What’s New, Roadmap, Shortcuts, and optional Developer diagnostics. The empty Roadmap describes where future plans will appear. Mobile Settings has one full-screen scroll surface and sticky close header.

Shared core components handle modal focus restoration, confirmations, choices, toasts, menus, and live announcements. Use native labelled controls, visible focus, escaped user text, safe external URLs, and the existing inline SVG helper for interface actions. The helper has no product-data dependency.

Combined floating storage/sync status shares fourteen centralized presentations with Data Sync. Active sync rotates only the two-arrow modifier inside a stationary cloud and respects reduced motion. Initial sync/conflict choices use leading cloud symbols and left-aligned descriptions. Restore from Cloud requires confirmation and a successful recovery save.

Appearance retains light/dark/system modes, text scale, icon/text/both button presentation, hints, and hint restoration. Shortcut badges appear with Shift–Control–Option and remain scoped to the active dialog. Developer Mode adds DEV to the version and exposes storage/recovery diagnostics. PWA updates offer Force Refresh and dismiss actions.
