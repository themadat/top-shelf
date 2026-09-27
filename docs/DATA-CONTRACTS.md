# Data and Persistence Reference

## Local preferences and data contracts

Identity/build settings live in config.js. Storage key topShelf.state.v5 migrates topShelf.state.v4; local schema 6. Full backups use top-shelf-backup. Content sync uses top-shelf-app-data v5/schema 9 and accepts earlier v1–v4 cloud envelopes. Keep namespace compatibility. Optional fields added after schema 9 require all clients to update so older clients do not drop them.

Device-local ui fields (full backups, excluded from content sync): movieSorts by all/wishlist/watched; movieColumnWidths with separate maps per tab; pivotColumnWidths; pivotLocalSettings; pivotSubsectionSorts. Old flat movie widths migrate to independent copies. Old workspace.pivotSettings is a fallback until locally overridden; scoring baseline/weight remain shared. Reset preferences clears local overrides.

GitHub target is fixed: themadat/app-data/main/data/top-shelf.json. Imports cannot redirect it. Never write that separate repo without explicit authorization. Tokens are browser-only and excluded from config, exports, diagnostics and content sync. Provisioning instructions: docs/RESET.md. Never request tokens in chat. Keep origin git@github.com:themadat/top-shelf.git; machine SSH setup belongs in user configuration.

Sync repairs baselineHash only when baselineTarget and nonempty baselineSha match the freshly fetched remote blob. Different revisions still require normal conflict handling. No timestamp-winner guessing. Recovery precedes destructive replacements/batches; concurrent edits must not be overwritten.

Notes buffers typing 300ms before normalization; flush on blur/close/hidden/page exit, cancel pending drafts on state replacement. Movie/pivot/subgenre views ignore edit-document redraws. Notes fills desktop height minus 2rem and is full-screen on mobile.

