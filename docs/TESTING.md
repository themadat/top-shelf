# Verification checklists

## Automated baseline

- [ ] `node --test tests/sync.test.mjs` passes (Node 18+; no installed packages required).
- [ ] `tests/sync-preview.html` displays all fourteen states and both circular-arrow actions using production symbols and styles; inspect Light, Dark, Reduce Motion, and system increased/forced contrast.
- [ ] Every JavaScript file and `sw.js` passes `node --check`.
- [ ] Both manifests parse as JSON.
- [ ] `git diff --check` is clean.
- [ ] Every local `src`, `href`, manifest icon, and service-worker shell path exists.
- [ ] No console errors appear during startup or the tested workflows.

## Desktop

- [ ] Header, version/Beta pills, centered global search, toolbar, icon catalog, and combined floating storage/sync status fit without horizontal overflow.
- [ ] The full-width catalog reports 7,231 unique icons, initially renders up to 500 compact 132–140px responsive cards with separate preview-copy and direct-name-edit controls plus bottom-corner type/compact-info controls, keeps Australiandollarsign, Greaterthanorequalto, and Malaysianringgitsign on one line at the default text size, wraps longer names, keeps persistent category chips plus same-row Type/Source and Ultra/Light/Medium/Bold/Black SF Symbol weight controls in the compact vertical left rail, remains alphabetically ordered, and progressively reveals additional 500-icon batches. The weight choice persists, uses canonical native Ultra, Light, Medium, Bold, and Black artwork across all 6,868 SF Symbol records, including all five folder-sourced weights for the 49 canonical cards absorbing 50 source aliases, responds to the 1/3/5/7/9 weight shortcuts, updates card/details/editor previews and copied SF Symbol SVGs, and never changes custom artwork.
- [ ] `/` focuses global search; Enter closes suggestions and moves to matching cards below; suggestion results still focus their corresponding copy button or route to Notes, Help, releases, and the Settings Roadmap.
- [ ] No newly scanned source comes from generated output, `dist/`, or the broad `!backups:data` parent beyond its configured child sources; no SF Symbol name or icon ID appears more than once, no display label contains `Svgrepo Com`, and malformed build extractions are absent. Every retained icon belongs to at least one category, Other stays visible directly below All with zero records, and source provenance remains available even when an exact override intentionally removes a source category. Actions, Locations, standalone Games, Sports & Recreation, and Norway & Sweden are absent as category choices. Recreation nests Games and Sport; Geography nests Countries, Regions, Mapping, and Places; country outlines remain distinct from mapping tools; continents, administrative areas, territories, and world/globe symbols appear in Regions; and physical destinations appear in Places. Entertainment & Media replaces Media; Text Formatting nests under Editing; Connectivity joins Devices; Animals & Plants and Weather nest under Nature; and People contains only person/body-part symbols. Arrows appears under How it looks with Chevron, Chevron Arrow, Triangle, and Triangle Arrow children. Explicitly baked broad-parent-only memberships are allowed. All 409 permanent overrides apply; the latest 150 exact entries retain their exported semantic memberships plus applicable Dashed & Dotted or Layered & Stacked memberships, including the four intentional Objects & Tools removals. Badged exposes 39 primary choices, omits Circle/Multiple/Slash as direct children, retains its plain-badge records under Badge, and nests Shield/Triangle under Shapes plus Circle/Triangle under Exclamation Mark. Name, alias, semantic-tag, category, and multi-word searches return expected icons with high-contrast matching text, and selected search-input text has an obvious contrasting selection; selecting a preview copies complete SVG markup; selecting a name and the Icon details Edit metadata action open the same complete editor; right-click category removal and Undo work; metadata editing and override export preserve source provenance; focus returns to the opener when dialogs close. The four generated catalog data parts each remain below 50 MB and assemble into all 7,231 records.
- [ ] No retained source comes from SVG Converter’s aggregate `app-input/!All/` roll-up.
- [ ] Every file in the requested `!Accessibility`, `!Editing`, `!Keyboard`, `!Maps`, `!Math`, `!Media`, `!Privacy & Security`, and `!Transportation` folders is represented by an icon assigned to its matching quick category after deduplication; Maps resolves to Geography → Mapping, Media displays as Entertainment & Media, and equivalent folder names without `!` remain supported.
- [ ] In Developer Mode, a minimum label length such as 30 filters the main catalog and reports the matching count; clearing restores the catalog, disabling Developer Mode suspends the filter, and Export overrides is enabled only when local icon changes exist.
- [ ] Copying shows visible and announced success, and clipboard denial provides an actionable failure message.
- [ ] Notes opens blank as one modal, focuses its textarea, autosaves plain text, has no Done button or autosave heading, appears in global search, and restores focus when closed.
- [ ] The current four-part version matches the build id, asset queries, service-worker cache, manifest icon queries, architecture example, and deployment workflow name; each release-log date appears beside its version number.
- [ ] Roadmap search, state/priority/target/effort filters, result count, reset action, and every sort option work inside Settings.
- [ ] Icon-led Settings, Help, What’s New, Roadmap, Shortcuts, and Developer tabs render in that order and manage focus with vertical and horizontal arrow keys; the main-page What’s New banner exposes V/X, displays a bottom-edge 30-second countdown, and automatically marks itself seen when time expires; the New version available toast exposes R to Force Refresh and X to close, directly and with Shift–Control–Option.
- [ ] Toasts and polite/assertive announcements communicate completion without relying on color.

## Tablet and mobile

- [ ] At representative 768px and 390px widths, document and body scroll widths do not exceed the viewport; the rail remains vertical at tablet width and becomes a compact top filter surface on mobile.
- [ ] Top controls remain touch-sized and form fields do not trigger unwanted input zoom.
- [ ] Notes fills the mobile viewport without horizontal overflow or nested page scrolling.
- [ ] Icon details and metadata editing fill the mobile viewport, wrap long content, keep one scrollable content panel, and present touch-sized group checkboxes and footer actions.
- [ ] Settings fills the screen and uses one full-screen mobile scroll surface with a sticky close header; every tab resets that surface to the top, the final data controls remain reachable, Appearance stays compact, and the fixed GitHub target uses two columns without overflow.
- [ ] Floating Sync stays inside safe areas and does not obscure required controls.

## Keyboard and accessibility

- [ ] Visible focus, logical focus order, labels, roles, and ARIA state are correct.
- [ ] Escape closes menus, popovers, and dialogs and returns focus to the trigger.
- [ ] `/`, `H`/`?`, `,`, `2`, `N`, `V`, `R`, `X`, `S`, `E`, `T`, and `D`/`|` work in their valid contexts outside editable fields; icon commands G/I/C/L work directly and with Shift–Control–Option.
- [ ] Holding Shift–Control–Option reveals shortcut hints only for enabled controls in the active page or dialog, and releasing any chord key hides them.
- [ ] Hovering a shortcut-enabled control shows both its plain key and Shift–Control–Option command.
- [ ] The desktop category rail remains sticky while the icon results page scrolls, its What it is and How it looks sections remain distinct, and the appearance section is alphabetized at every level: Arrows (Chevron, Chevron Arrow, Triangle, Triangle Arrow), Badged, Building, Circled, Dashed & Dotted (142), Layered & Stacked (88), Rays & Sparkles, Shapes, Slashed, and Squared. Both new filters return only explicitly named dashed/dotted or layer/stack variants, and the metadata editor presents the same appearance order. Category labels share one aligned inset, counts align at the far right, label/count type remains comfortably readable, and expandable rows contain a native-appearance-neutral left-side right/down chevron with an equal-width spacer on leaf rows. Tabs and menu items support arrow-key movement; icon cards support Left/Right/Up/Down plus Home/End without hiding the separate information controls; the separator supports drag/touch plus Left/Right/Home/End resizing and reports its current value; Developer Mode shows the rail percentage only while pointer dragging.
- [ ] Appearance contains color mode, then button presentation using the supplied square-and-A symbol plus matching square-only and A-only variants, then one iOS-style text-size slider, followed by symbol-led Hints controls and the supplied circular restore symbol; the slider fills the same control width as the segmented toggles and updates the whole application, no redundant Text Size disclaimer remains, and the device reduced-motion setting removes nonessential transitions and animations.
- [ ] Light and dark themes meet contrast needs; every path in the 42px app icon uses the same width and full opacity before and after theme switching; the favicon geometry remains distinct against its Safari-gray fill at tab size; status always includes text or an accessible label.

## Persistence, import, and migration

- [ ] Icon category/type/source settings, category collapse state, filter-rail width, icon name/type/group/filter-source overrides, Notes, Roadmap filters and sorting, hints, release state, and preferences persist after reload; saved Locations and child filters, Maps, and Maps & Travel filters and overrides migrate to Geography and the corresponding child, while old Other-only overrides inherit the icon’s compiled groups.
- [ ] Reset Preferences preserves notes and icon metadata overrides; Erase All removes content, overrides, preferences, token, and recovery data only after custom confirmation.
- [ ] Backup export contains state-model version, notes, preferences, icon metadata overrides, and module settings, but never the GitHub token; compact override export is a plain array containing stable icon IDs, labels, category IDs, and only explicitly changed type/filter-source values.
- [ ] A malformed or oversized import is rejected without replacing current data.
- [ ] A valid import shows its preview, migrates and sanitizes, confirms replacement, and preserves a recovery copy.
- [ ] `docs/examples/legacy-backup-v1.json` and `legacy-backup-v2.json` migrate without losing their user content.

## GitHub synchronization

- [ ] Data Sync is a separate Settings navigation tab. The connection controls are absent from the general Settings panel, and missing-token sync setup opens Data Sync directly.
- [ ] Sync payload (JSON) starts collapsed, opens with the keyboard, and shows exactly the current `stateModel.syncPayload` with no credentials or device preferences. Notes/icon edits refresh it without closing it or replacing dirty token fields. Long JSON wraps without horizontal overflow on mobile; tab selection survives reopening/reload.

- [ ] The GitHub heading links to `config.identity.repository`; owner, repository, branch, and path come from `config.cloudSync`, appear with their values on one non-input metadata line, and cannot be redirected by saved or imported state; Repository links to the configured sync repository and Path links to the exact branch/file when the target is complete.
- [ ] The target line stays a single contained horizontal line at mobile widths without causing page-level horizontal overflow; Settings shows Sync Now and Restore from Cloud above the target, with Forget, Test, and Save below the token and remember choice.
- [ ] Missing token opens setup; invalid values show actionable validation.
- [ ] Connection testing distinguishes authentication, permission, missing repository/branch, network, and malformed remote-file failures.
- [ ] Save and a successful Test keep the token visibly masked in the password field, label device or tab-only storage, and survive Settings re-renders; a failed Test does not persist a newly entered token, and background sync renders do not overwrite an in-progress token or Remember-choice edit.
- [ ] Floating status and Settings agree on the cloud state, symbol, semantic tint, label, and tooltip. Local/remote changes wait with a static dashed cloud; divergent copies require attention; success, upload, download, auth, access, and failure use distinct shapes. Offline is neutral and a configured unchecked connection is static.
- [ ] Syncing rotates only the two arrows inside the supplied cloud symbol; labels, upload/download arrows, pending, and all inactive states stay still. Reduce Motion removes rotation.
- [ ] The clockwise Sync Now action respects busy state. Counterclockwise Restore from Cloud refreshes the remote copy, confirms replacement, preserves local cloud settings, and stops if the recovery copy cannot be saved. Cancellation leaves local content untouched.
- [ ] A fresh cloud payload is under 120 bytes, with empty `data`; populated payloads contain only Notes, edited icon metadata, and any real legacy record content.
- [ ] After downloading, waiting for the 30-second release notice to dismiss, changing theme/filter/sidebar width, opening Settings tabs, and reloading all retain Up to Date. Real Notes/icon edits and deletions become pending; undoing an edit clears it.
- [ ] Old full-state cloud files compare by actual content and shrink on explicit Sync Now; checks never write. Refresh both devices before using the compact format; older builds reject its v5 envelope. Full backups retain preferences.
- [ ] Downloads preserve this device’s appearance, filters, UI, and token. Empty cloud content clears Notes and icon overrides after recovery; Unicode, multiline text, and literal HTML round trip without becoming markup.
- [ ] Conflict choices include upload, download, and cancel; merge is offered only when Notes and shared item IDs do not disagree, combines content present in either copy, and refuses replacement if recovery fails.
- [ ] Download and merge preserve a recovery copy and keep all device-local settings.
- [ ] Visibility, interval, and reconnect checks do not overlap or apply stale responses.
- [ ] JSON backup/restore remains usable without GitHub.

## PWA and recovery

- [ ] First online visit caches every `SHELL` entry, including the generated icon catalog, and a later offline reload supports icon search/copy, Notes, the Settings Roadmap, and Settings.
- [ ] An online refresh revalidates and displays current HTML, CSS, and JavaScript instead of preferring stale cache entries.
- [ ] A waiting service worker shows a bottom New version available toast; its arrow-only Force refresh action and contextual R shortcut activate it and reload the browser tab or installed PWA, while X closes the notice. R/X also work with Shift–Control–Option, display shortcut hints, and stay inactive when a dialog owns focus.
- [ ] The Safari favicon uses a fully opaque `#8E8E93` background with visible neon-blue geometry, an X, two circles, every other grid line, no square outlines, and no inset outline; its center cross matches the X thickness while the outer grid guides remain lighter; manifest, touch icon, install icon, and splash assets resolve.
- [ ] Manual recovery copy enables Restore; restoring replaces state only after confirmation.
- [ ] Storage quota and unavailable-API paths show useful fallback messages.

The compiler regression in `tests/icon-compiler.test.mjs` builds a temporary SVG catalog three times and verifies that retained artwork and its CSS scope remain identical. Run it together with the sync tests using `node --test tests/*.test.mjs` on a current Node version.

- [ ] Selecting text in Notes uses the same white text and strong accent background as selecting search-field text, in both light and dark mode.

- [ ] Searching Hide Play returns the Percent card; all 50 approved source aliases resolve to their canonical symbols. The 49 visually identical native-name pairs remain separate. Retired-ID metadata edits survive normalization/import, and rescanning an old alias does not restore a duplicate card.

- [ ] Type Hide Play, then apostrophe in search: Percent disappears because only displayed names match; the highlighted apostrophe appears left of /. Press / while focused: mode clears, query is unchanged and selected, and Percent returns. Repeat from outside search. Partial displayed names, edited labels, mobile input, clear filters, and reload retain the expected mode; Notes typing is unaffected.
