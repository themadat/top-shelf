# Shared components

## Dialogs and choices

`components.openDialog()` stores the trigger, opens a native modal, and focuses the requested or first appropriate control. Closing restores focus. Confirmation, message, choice, import-preview, creation, and Settings dialogs share this lifecycle. On mobile, application dialogs become full-screen surfaces with one scrolling panel.

Use `components.confirm()` for destructive operations and `components.choose()` when the user must explicitly select among safe alternatives such as sync merge/upload/download.

## Menus and popovers

`components.openMenu()` renders an anchored menu into the shared popover. Positioning is clamped to the visible viewport, focus moves into the menu, arrow keys move between commands, and Escape closes and restores focus.

## Toasts, announcements, and loading

`components.toast()` updates the reusable `role="status"` toast and can include one text or SF Symbol action. Critical completion text can also be written to the assertive live region. `components.setLoading()` controls the modal loading overlay for operations such as connection tests.

## Empty and error states

Module empty states use one shared visual pattern with a heading, explanation, and optional visible recovery action. Sync, storage, import, and PWA failures use inline status, message dialogs, or persistent toasts depending on whether immediate action is required.

## Notes

Notes is one large, initially blank plain-text textarea in a native modal. It opens from the visible Notes control or `N`, autosaves locally, closes from the standard close control or Escape, and returns focus to its trigger. There is no redundant Done action or autosave heading. The compatibility `documents` collection remains in state and sync payloads, but normalization consolidates it to the stable `app-notes` document. Migration from earlier multi-note state retains each title as a section heading and preserves its text.

## Global search

`/` focuses the centered global search unless the user is already editing a field. Enter closes the suggestion list, renders matching icon cards below, scrolls to the catalog, and focuses the first match. Results also include Notes, Help topics, release entries, and Roadmap items; those suggestion buttons retain their direct routes.

## App identity control

The top-left app icon uses separate light and dark SVG artwork whose grid, X, and three concentric circles share one stroke width and full opacity at 42px. Clicking or pressing `T` changes the color theme and therefore swaps the matching icon artwork; the button only scales slightly while actively pressed. The favicon uses three grid lines per axis plus an X and two circles—without square outlines—in neon blue on the full-bleed Safari-gray background; the center cross matches the X weight while the outer grid guides stay lighter.

## Icon catalog

Catalog cards deliberately show the SVG preview and multiline name at the normal label size, with Custom/Symbol at bottom left and a compact information button at bottom right. Their compact 132–140px responsive width keeps the longest uninterrupted 20-character icon-name words on one line while longer multiword names wrap without special font shrinking. Selecting the preview copies its complete sanitized SVG; selecting the name opens the complete native metadata editor directly. With a category selected, right-click removes the icon from that group and exposes Undo in a live toast. The information dialog retains original source provenance and directly edits Name and Type using the same field layout as the complete editor; its Edit metadata action and the card-name action open that same complete editor. The full-width catalog uses a viewport-sticky vertical rail for result count, Type and Source on one row, a persistent Ultra/Light/Medium/Bold/Black SF Symbol weight slider, and persistent category rows. The selected weight updates SF Symbol cards, details, editor previews, and copied SVG markup; Ultra, Light, Medium, Bold, and Black treat native All 1 Ultralight, All 3 Light, All 5 Medium, All 7 Bold, and All 9 Black artwork as canonical for all 6,918 SF Symbol records, including all five verified native weights for 50 app-facing names; and custom artwork remains unchanged. Each category row reserves the same left inset for its name, aligns its count at the far right, and encloses any right/down disclosure control at the far left; category labels and counts use larger default type for readability. **What it is** contains semantic destinations such as Recreation → Games/Sport, Geography → Countries/Regions/Mapping/Places, Entertainment & Media, Devices & Connectivity, and Editing → Text Formatting. The Geography branch distinguishes areas (Countries and Regions), representation and navigation tools (Mapping), and physical destinations (Places). **How it looks** is alphabetized at every level and contains Arrows → Chevron/Chevron Arrow/Triangle/Triangle Arrow, Badged, Building, Circled, Dashed & Dotted, Layered & Stacked, Rays & Sparkles, Shapes, Slashed, and Squared. People contains only person and body-part symbols. Every retained icon has at least one category, and each Objects & Tools icon also has a more specific semantic placement. Badged keeps 39 primary subtype choices and its nested Shapes and Exclamation Mark variants. Every branch with descendants has an accessible collapse control with native platform appearance disabled, open/closed state persists, and collapsing a branch with a selected descendant moves selection to its visible parent. A pointer-, touch-, and keyboard-operable divider changes the rail width and persists it locally; while Developer Mode is active, pointer dragging also displays the rail percentage. The mobile layout keeps horizontal category chips and hides the divider. Up and Down Arrow activate the adjacent visible category, while the card grid’s Arrow keys, Home, and End move among visible copy buttons. Matching search text uses a high-contrast inline highlight, and selected search-input text uses a distinct high-contrast selection. Results remain alphabetical and render in batches of 500. Global search matches names, aliases, categories, semantic tags, repositories, and source metadata. Developer Mode adds a persistent minimum-label-character filter and another override-export action.

## Shortcut hints

Controls declare `data-shortcut`. Holding Shift–Control–Option reveals badges only on enabled controls in the active page or dialog; hovering a shortcut-enabled control exposes the plain and chorded commands. Global shortcuts use physical key codes and work both directly and with the full chord held. Command-key combinations remain available to the browser. The main-page What’s New banner exposes V to view release notes and contextual X to dismiss the notice, while its bottom-edge indicator counts down to automatic dismissal after 30 seconds. The New version available toast dynamically exposes R for Force Refresh and X to close. The icon library exposes G for the first result, I for focused-icon details, C to clear search, L to load more, and 1/3/5/7/9 for Ultra/Light/Medium/Bold/Black weights. The app-icon badge exposes only T; the pipe command remains hidden alongside the press-and-hold Developer Mode gesture. Icon-weight bubbles are positioned above their segments without clipping. Shortcuts never replace visible buttons or native interactions.

## Icon conventions

Use the inline SVG catalog in `assets/js/icons.js` whenever an appropriate SF Symbol exists. Controls still require meaningful visible text or an accessible name; state is never communicated by icon or color alone.
