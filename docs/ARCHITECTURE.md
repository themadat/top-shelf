# Architecture

## Layers

The application is a static page with ordered scripts and no module loader:

1. `config.js` defines identity, the fixed GitHub Sync target, feature flags, theme defaults, help, releases, and demonstration Roadmap content.
2. `icons.js` provides the small SF Symbol set used by the application shell.
3. `icon-library-part-1.js` through `icon-library-part-4.js` hold the committed generated records below GitHub’s large-file warning threshold, and `icon-library.js` assembles them into the catalog of sanitized, deduplicated SVG symbols, categories, semantic tags, aliases, and source metadata; `build/icon-library-overrides.json` supplies permanent display-name, type, group, filter-source, and exclusion metadata.
4. `core/utils.js` provides escaping, sanitization, URL/color validation, ids, dates, and hashing.
5. `core/state.js` owns defaults, normalization, migrations, validation, export envelopes, sync payloads, and collection merging.
6. `core/storage.js` loads and autosaves browser state, stores the optional token separately, and manages one recovery copy.
7. `core/components.js` implements dialogs, choices, menus/popovers, loading UI, toasts, and long press.
8. `core/portability.js` handles safe JSON import and export.
9. `core/sync.js` implements optional GitHub synchronization.
10. `core/pwa.js` manages appearance-aware install metadata, device detection, service-worker registration, and update messaging.
11. `app.js` renders the searchable icon catalog, shell, and Settings modules and binds interactions and shortcuts.

`build/compile-icon-library.mjs` is a dependency-free development tool rather than a runtime requirement. By default it discovers every non-hidden sibling application directory and the configured Objects & Tools, `norway:sweden`, `indicies`, `Rest`, `All 1 Ultralight`, `All 3 Light`, `All 5 Medium`, `All 7 Bold`, and `All 9 Black` children beneath the excluded `!backups:data` parent. All 1 Ultralight, All 3 Light, All 5 Medium, All 7 Bold, and All 9 Black are compiled as native per-weight artwork on matching records, with only genuinely new names becoming new catalog records. The explicit `SF_SYMBOL_CANONICAL_NAME` map merges only the 50 approved source aliases into 49 canonical symbols. The surviving canonical IDs and artwork stay stable; aliases, sources, tags, and categories are retained. Serialized `retiredIds` redirect saved metadata edits and baked overrides to the surviving symbols, with explicit device edits to canonical IDs taking precedence. Identical artwork under distinct native names remains separate. It captures complete SVG template literals and standalone SVG files, sanitizes the markup, classifies SF Symbols versus Custom artwork, hashes normalized artwork, merges aliases/source references, coalesces repeated SF Symbol names, skips generated bundles and corrupted derived outputs, normalizes SF Symbol paint to currentColor, removes the `Svgrepo Com` display-label suffix, assigns multiple categories where appropriate, expands semantic search tags, and rewrites four deterministic generated data parts plus a small catalog assembler. Categories expose a `meaning` or `appearance` section. Geography owns Countries, Regions, Mapping, and Places; source-aware and metadata rules separate country outlines, regional/administrative areas and world views, map/navigation tools, and physical destinations. Other source-aware rules place Text Formatting, Connectivity, game artwork, indices, and Norway/Sweden currency symbols into their focused source categories and applicable existing semantic categories. Legacy Locations, Maps, and Maps & Travel category IDs normalize during compilation and state loading. Badged remains a collapsible appearance tree with 39 primary choices—including plain Badge—plus nested Shapes and Exclamation Mark variants. Stable icon IDs let the compiler apply validated display-name, type, category, and optional filter-source changes from `build/icon-library-overrides.json` after deduplication. The UI renders 500 matching cards at a time so the large catalog remains responsive.

Dashed & Dotted and Layered & Stacked use explicit dashed/dotted and layer/stack name tokens so visually unrelated dot and multiple-item symbols remain excluded. Existing permanent overrides that match those objective patterns include the corresponding appearance membership.

All modules attach to `window.LocalApp`. Runtime network access occurs only after the user saves a token or invokes GitHub Sync.

## State model

The current model is version 4:

```json
{
  "schemaVersion": 4,
  "meta": {
    "appVersion": "0.0.1.74",
    "buildId": "0.0.1.74",
    "createdAt": "ISO timestamp",
    "updatedAt": "ISO timestamp",
    "lastMutationId": "stable id",
    "tombstones": { "records": [], "documents": [] }
  },
  "workspace": {
    "title": "My App",
    "records": [],
    "documents": [
      {
        "id": "app-notes",
        "title": "Notes",
        "html": "Escaped plain text"
      }
    ]
  },
  "preferences": {
    "appearance": {},
    "controls": {},
    "hints": {},
    "installation": {}
  },
  "ui": {
    "activeModule": "roadmap",
    "selectedDocumentId": "app-notes",
    "search": "",
    "documents": {},
    "panels": {},
    "navigation": {},
    "seenReleaseVersion": "",
    "supportTab": "settings"
  },
  "modules": {
    "iconLibrary": { "category": "all", "kind": "all", "source": "all", "weight": "bold", "sidebarWidth": 204, "minimumLabelLength": 0, "collapsedCategories": ["badged"], "overrides": [] },
    "documents": {},
    "roadmap": {},
    "cloudSync": {}
  }
}
```

Icon-library overrides are normalized to stable icon ID, sanitized display name, optional Custom/Symbol type, recognized category IDs with required ancestors, and an optional recognized filter source. Legacy `locations`, `locations-countries`, `locations-regions`, `locations-mapping`, `locations-places`, `maps`, `maps-travel`, and `other` assignments migrate to the compiled semantic categories without losing name/type/source edits. Permanent overrides may opt into exact category replacement so an exported removal is not repopulated by inferred child membership. The filter-source override changes filtering only; compiled source-file provenance remains intact. Overrides are user-managed content: backup and sync include them, Reset Preferences preserves them, and Erase All removes them. Category collapse state and filter-rail width persist as preferences. `minimumLabelLength` is a Developer Mode filter from 0 through 120; it persists locally but is ignored while Developer Mode is off.

The single Notes modal continues to use the legacy `documents` collection and `html` field so older exports remain compatible. New editing is plain text; it is escaped before being stored in the stable `app-notes` document. Fresh Notes are blank, and normalization removes the exact former demonstration sentence while preserving all other user text. The v3→v4 migration consolidates multiple older documents into this one note and keeps their titles as section headings. Empty `records` and related tombstone/UI fields are retained only as backward-compatibility scaffolding for older backups and sync data. There is no Records interface or demonstration record data.

The application repository comes from `config.identity.repository` and appears as a direct link beneath the GitHub heading in Settings. The GitHub Sync owner, repository, branch, and path are copied from `config.cloudSync` during defaults and normalization; imported or legacy state cannot redirect the target. Settings renders the four sync values as one metadata line, linking the repository and exact data file when the target is complete. The GitHub token is never part of application state. It lives under a separate per-device storage key and is excluded from export, sync payloads, and diagnostics. Settings keeps the saved value masked in the password field and visibly labels device or tab-only storage. Save stores it directly, and a successful connection test stores the verified token according to the Remember choice; a failed test does not persist a newly entered token. Dirty credential controls are not reconciled during background sync renders, so an in-progress edit survives until Save, Test, or Forget resolves it.

## Persistence and migration

Startup checks the current storage key and then known legacy keys. Every candidate runs through wrapper unwrapping, sequential migration, normalization, sanitization, and validation. Malformed saved state falls back to a valid recovery copy or a fresh default without replacing an import file.

User mutations update metadata and schedule an autosave. Storage failures emit an application event that becomes an actionable toast. Import, cloud download, merge, reset, and other replacements create or preserve recovery data as appropriate.

Add a migration by creating `migrateNtoNPlus1`, registering it in `migrations`, increasing `schemaVersion`, and adding a fixture that proves renamed, removed, split, or combined values preserve user content.

Settings → Data Sync owns the connection controls and a collapsible, read-only JSON preview generated directly by `stateModel.syncPayload`. The preview shows the current local upload content, not a fetched cloud copy or full backup; updates use `textContent` and preserve the disclosure state. The Data Sync tab is persisted locally and shares existing tab keyboard navigation.

## GitHub conflict strategy

`stateModel.syncPayload` is an allowlist of actual content: plain-text `data.notes`, pending `data.iconOverrides`, and nonempty legacy `data.records`. Empty collections are omitted, so the fresh payload is `{"syncFormat":"local-first-app-data","syncVersion":1,"schemaVersion":5,"data":{}}`. This is a complete snapshot: an absent field clears its content on download. Built-in catalog SVGs, preferences, UI, workspace title, timestamps, mutation IDs, tombstones, and cloud bookkeeping are excluded. Notes timestamps and legacy record timestamps never affect comparison. Local persistence and full backups continue to use state schema v4; the cloud envelope declares schema v5 so older builds fail closed instead of interpreting the new structure as empty v4 state.

`prepareSync` accepts the compact envelope and legacy state/backup files; unsupported versions and invalid content fail before replacement. `applySync` replaces content while keeping local appearance, UI, configuration, and credentials. Baked icon overrides are pruned centrally in state normalization, so both copies compare the same effective edits.

The sync module stores a baseline target, SHA, and content hash after a successful sync. A remote check compares local, remote, and baseline hashes:

- Local only: upload.
- Remote only: download after saving a recovery copy.
- Equal: report Up to Date.
- No baseline or missing remote file: request a first-sync decision.
- Both changed: offer upload, download, or cancel, with merge available for matching or separate content.

Content hashes have a `data-v1:` prefix so old whole-state hashes are never compared against content hashes. Equal content establishes a baseline even on a first check or upgrade; an unchanged legacy baseline SHA also identifies the old baseline’s content. Other unknown baselines require a choice. A matching legacy file shows Up to Date; explicit Sync Now rewrites it compactly, while checks stay read-only toward GitHub. The same cleanup removes baked overrides from an already compact file; normalization differences alone never make user content pending.

Merging combines matching or separate items and retains content present in either copy. Different nonempty Notes or different metadata for the same icon/record require choosing a copy; save timestamps cannot decide which content to discard. Merge and download require a successful recovery save, and both preserve device settings. Requests are sequenced and aborted to prevent overlap and stale responses. Checks repeat periodically, on visibility, and when connectivity returns.

Cloud status presentation lives in `core/sync.js`: `CloudSyncState`, `presentation(state, options)`, and `actions` supply the SF Symbol, semantic color kind, accessible label, help, primary action, and animation. Reconciliation only describes which copy changed; queued local/remote work is `pending`, divergent copies are a recoverable `warning`, and only an active request is `syncing`, `uploading`, or `downloading`. Configured but unchecked connections are static `connected`; `idle` and `shared` are available for consumers that need those concepts, without inferring sharing from GitHub ownership. A permission denial is recoverable by default; `presentation(state, { hardDenial: true })` supports red for an explicitly hard denial. HTTP authentication, access, rate-limit/conflict, and server failures stay distinct.

The floating control and Settings share that presentation and the user-supplied native cloud SF Symbols in `icons.js`. Only the two-arrow modifier inside the supplied cloud symbol rotates; Reduce Motion disables it. Settings offers a clockwise Sync Now action and a counterclockwise Restore from Cloud action. Restore refreshes the remote copy, asks for confirmation, and requires a saved local recovery copy before replacement. Pending decisions suppress overlapping checks, and connection changes invalidate stale results and decisions.

## Accessibility and responsive behavior

The shell uses landmarks, native buttons and inputs, native dialogs, tabs, status regions, and explicit ARIA state. The icon catalog is an announced list of native copy buttons; its sticky vertical filter rail labels separate What it is and How it looks groups, using native pressed buttons, nested groups, collapse buttons, and a native radio group for persistent Ultra/Light/Medium/Bold/Black SF Symbol weight. How it looks roots and descendants are sorted alphabetically at render time in both the filter rail and metadata editor, while the semantic taxonomy retains its curated order. Ultra, Light, Medium, Bold, and Black output prefer bundled native All 1 Ultralight, All 3 Light, All 5 Medium, All 7 Bold, and All 9 Black artwork for every SF Symbol record, including the curated compatibility mappings; custom icons remain unchanged. The resizable divider is an operable ARIA separator, and search results can move focus to the corresponding card. Collapse controls expose `aria-expanded`/`aria-controls`; collapsing a branch with the selected descendant moves selection to the visible parent. Icon details labels and validates its direct Name/Type fields; the complete metadata editor labels every group checkbox and source selector, manages recursive parent/subgroup membership, and uses a custom confirmation before resetting an icon. Copy and save results use live toast messaging. Opening a dialog moves focus; closing restores the trigger. Escape closes temporary UI. All primary actions have keyboard and touch equivalents.

Notes uses one spacious modal on desktop and a full-screen editor on mobile. Settings also becomes a full-screen dialog with one scrolling content surface. Safe-area variables, 16px mobile form controls, reduced motion, and horizontal overflow protection are built into the shared stylesheet.

## PWA and offline strategy

`sw.js` precaches the application shell, all core scripts, manifests, and light/dark assets. Same-origin application requests use the network first with cache revalidation, then fall back to the cached shell when offline. Optional GitHub API traffic remains network-only. A waiting service worker triggers a persistent bottom **New version available** toast. Its accessible clockwise-arrow action activates the waiting worker and reloads through a cache-busting URL so installed PWAs can update immediately. Contextual R and X shortcuts run Force Refresh or close the notice, with plain and Shift–Control–Option commands registered through the shared shortcut system.
