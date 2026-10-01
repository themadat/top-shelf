# Data and Persistence Reference

## Local preferences and data contracts

Identity/build settings live in config.js. Storage key topShelf.state.v5 migrates topShelf.state.v4; local schema 10. Full backups use top-shelf-backup. Content sync uses top-shelf-app-data v10/schema 14 and accepts earlier v1–v9 cloud envelopes. Keep namespace compatibility. The current envelope carries Podcasts and sanitized Notes HTML alongside searchable plain text; older clients reject it instead of dropping formatting. Earlier TV-bearing v6, Books-bearing v7 and half-point TV v8 envelopes remain readable.

Device-local ui fields (full backups, excluded from content sync): podcasts (query/status/activity/size/frequency/category/membership/sort/direction); books (view/query/sort/direction/widths/status/ownership/kind/format/pivotQuery/minimum/pivotSort/pivotDirection); tv (view/sort/direction/widths/pivotWidths/episodeWidths/filter/query); movieSorts by all/wishlist/watched; movieColumnWidths with separate maps per tab; pivotColumnWidths; pivotLocalSettings; pivotSubsectionSorts. Old flat movie widths migrate to independent copies. Old workspace.pivotSettings is a fallback until locally overridden; scoring baseline/weight remain shared. Reset preferences clears local overrides.

GitHub target is fixed: themadat/app-data/main/data/top-shelf.json. Imports cannot redirect it. Never write that separate repo without explicit authorization. Tokens are browser-only and excluded from config, exports, diagnostics and content sync. Provisioning instructions: docs/RESET.md. Never request tokens in chat. Keep origin git@github.com:themadat/top-shelf.git; machine SSH setup belongs in user configuration.

Sync repairs baselineHash only when baselineTarget and nonempty baselineSha match the freshly fetched remote blob. Different revisions still require normal conflict handling. No timestamp-winner guessing. Recovery precedes destructive replacements/batches; concurrent edits must not be overwritten.

Cloud download/merge and manual recovery prefer an IndexedDB recovery snapshot, committed before removing the superseded localStorage recovery key. This frees localStorage space without removing the active library, credentials, or unrelated keys. If IndexedDB is unavailable, the existing localStorage recovery path remains a fallback. Startup loads database recovery for Developer Tools and recovery from an unreadable active state; Erase All clears both stores. Replacements publish state and success only after the active library is persisted. Failed writes retain the prior live and stored library; async recovery rejects intervening edits. A cloud library larger than localStorage capacity still fails safely.

Overall Notes stores sanitized HTML with H1–H3 headings, bold, italics and validated HTTP(S) links. Hovering a link shows its URL; clicking opens it in a new tab. Heading buttons sit outside the editable document and collapse content (including loose text and nested blocks) up to the next heading of the same or higher level. Empty headings have no collapse control; Backspace at a heading’s start returns it to body text, and Enter at its end starts a body paragraph. Collapse state is temporary UI state and never removes hidden content from saved Notes, backup, search or sync. Plain-text search remains available. Notes buffers typing 300ms before normalization; flush on blur/close/hidden/page exit, cancel pending drafts on state replacement. Movie/pivot/subgenre views ignore edit-document redraws. Notes fills desktop height and width minus 2rem (up to 1800px wide) and is full-screen on mobile. Cmd/Ctrl+B, I and K apply bold, italics and links; Cmd/Ctrl+Shift+B returns to body text, and Cmd/Ctrl+Shift+1–3 applies heading levels. These shortcuts act only inside Notes, preserve the selection for link entry, and expose current formatting in the toolbar.


TV model, editor, imports and one-time data behavior: [TV.md](TV.md).

Books model, catalog lookup, wishlist and pivots: [BOOKS.md](BOOKS.md).

Podcast model, table importer and catalog/feed linking: [PODCASTS.md](PODCASTS.md).
