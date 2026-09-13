(function () {
  "use strict";

  window.LocalApp = window.LocalApp || {};

  const CONFIG = {
    identity: {
      name: "App Template",
      shortName: "Template",
      description: "A searchable local SVG icon library for finding and copying reusable interface symbols.",
      version: "0.0.1.74",
      buildId: "0.0.1.74",
      repository: {
        label: "App repository",
        url: "https://github.com/themadat/app-template"
      },
      support: [
        { label: "Report a problem", url: "https://github.com/themadat/app-template/issues/new" },
        { label: "View documentation", url: "https://github.com/themadat/app-template#readme" }
      ],
      assets: {
        favicon: "assets/icons/favicon.svg",
        appIconLight: "assets/icons/app-icon-light.svg",
        appIconDark: "assets/icons/app-icon-dark.svg",
        manifestLight: "manifest.webmanifest",
        manifestDark: "manifest-dark.webmanifest"
      }
    },

    schemaVersion: 4,
    storage: {
      stateKey: "appTemplate.state.v4",
      legacyKeys: ["appTemplate.state.v3", "localWorkspace.state.v3", "localWorkspace.state.v2", "localWorkspace.state.v1"],
      recoveryKey: "appTemplate.recovery.v1",
      secretKey: "appTemplate.githubToken.v1",
      sessionSecretKey: "appTemplate.githubToken.session.v1"
    },

    cloudSync: {
      owner: "themadat",
      repo: "app-data",
      branch: "main",
      path: "data/app-template.json"
    },

    features: {
      records: false,
      documents: true,
      cloudSync: true,
      roadmap: true,
      developerTools: true,
      hints: true,
      demoData: true
    },

    controls: {
      shortcutHintModifier: "ShiftControlOption",
      autosaveDelayMs: 180,
      syncCheckIntervalMs: 5 * 60 * 1000,
      whatsNewAutoDismissMs: 30 * 1000,
      maxImportBytes: 5 * 1024 * 1024,
      maxRecords: 5000,
      maxDocuments: 500,
      maxTextLength: 20000,
      maxDocumentHtmlLength: 250000,
      maxIconOverrides: 5000
    },

    statuses: [
      { id: "active", label: "Active", icon: "●", color: "#2f7d68" },
      { id: "paused", label: "Paused", icon: "Ⅱ", color: "#a86a1f" },
      { id: "complete", label: "Complete", icon: "✓", color: "#4f6f52" },
      { id: "idea", label: "Idea", icon: "◇", color: "#7058a3" }
    ],

    themeDefaults: { accent: "#315f73", accent2: "#b86b4b", success: "#4f745f", warning: "#9b6a24", danger: "#a74747" },

    releases: [
      {
        version: "0.0.1.74",
        date: "2026-09-10T18:00:00.000Z",
        title: "Name-only search shortcut",
        summary: "Type an apostrophe in search to match displayed icon names only, with a highlighted indicator beside the slash shortcut.",
        features: ["Name-only search with a clickable active indicator"],
        improvements: ["Press / to disable name-only matching, focus search, and select the current text", "Name-only matching excludes aliases, tags, sources, and support content"],
        fixes: [],
        knownIssues: []
      },
      {
        version: "0.0.1.73",
        date: "2026-09-10T12:00:00.000Z",
        title: "Merge imported SF Symbol aliases",
        summary: "Fifty duplicate source entries now share their canonical SF Symbol cards, including Hide Play under Percent.",
        features: [],
        improvements: ["7,231 catalog entries with all five native weights", "Merged names remain searchable, with source references and categories preserved", "Saved edits to retired icon IDs follow the surviving symbols"],
        fixes: ["Approved source aliases no longer reappear as duplicate cards after a catalog rebuild"],
        knownIssues: []
      },
      {
        version: "0.0.1.72",
        date: "2026-09-08T12:00:00.000Z",
        title: "Put SVG paint attributes first",
        summary: "SF Symbol markup places fill, opacity, and stroke attributes before geometry for easier editing.",
        features: [],
        improvements: ["Consistent paint-first attributes across all five SF Symbol weights and base UI symbols", "Future catalog builds retain the attribute order"],
        fixes: [],
        knownIssues: ["GitHub Sync requires a user-provided fine-grained token."]
      },
      {
        version: "0.0.1.71",
        date: "2026-09-08T16:58:14.448Z",
        title: "Dedicated Data Sync settings",
        summary: "Data Sync has its own Settings section with connection controls and a collapsible view of the JSON used for syncing.",
        features: ["Data Sync navigation section", "Current sync payload preview with the supplied braces symbol"],
        improvements: ["The preview uses the same content payload as GitHub uploads and updates after changes", "Sync setup opens Data Sync directly"],
        fixes: [],
        knownIssues: []
      },
      {
        version: "0.0.1.70",
        date: "2026-09-08T16:51:06.339Z",
        title: "Clearer cloud sync choices",
        summary: "Cloud sync choices have left-aligned text and a cloud symbol beside each option.",
        features: [],
        improvements: ["Upload, download, and merge use distinct leading cloud symbols", "Descriptions align beneath their labels and wrap on narrow screens"],
        fixes: ["Sync choice content fills each button instead of centering as a group"],
        knownIssues: []
      },
      {
        version: "0.0.1.69",
        date: "2026-09-08T03:49:06.784Z",
        title: "Consistent Notes selection",
        summary: "Selected text in Notes now uses the same clear highlight as the search bar.",
        features: [],
        improvements: ["Notes and search share white selected text on the strong accent background"],
        fixes: ["Replaced the faint Notes selection highlight with the existing search-field treatment"],
        knownIssues: []
      },
      {
        version: "0.0.1.68",
        date: "2026-09-08T03:36:19.909Z",
        title: "Bake in ten icon category edits",
        summary: "Ten exported icon edits are now part of the built-in catalog.",
        features: [],
        improvements: ["Moon phases use Nature; Poweroff uses Energy & Power; Siri uses Apps & Branding; diamond suits use Games; directional waves use Devices & Connectivity"],
        fixes: ["These baked edits no longer need local overrides or cloud storage", "Rebuilding the catalog preserves existing SVG style scopes"],
        knownIssues: []
      },
      {
        version: "0.0.1.67",
        date: "2026-09-08T00:30:21.000Z",
        title: "Sync only saved content",
        summary: "GitHub Sync carries Notes and edited icon metadata while settings stay on each device.",
        features: ["Compact cloud data with an empty content object for a fresh template"],
        improvements: ["Existing cloud files remain readable and shrink on the next Sync Now", "Downloads preserve this device’s appearance, filters, and settings", "Conflicts compare content and offer merging only when items do not disagree"],
        fixes: ["Release notices, settings changes, and save timestamps no longer create pending sync work", "Already baked icon edits no longer reappear as pending content"],
        knownIssues: ["Refresh the app on each device before using the new cloud file format."]
      },
      {
        version: "0.0.1.66",
        date: "2026-09-07T23:57:19.566Z",
        title: "Clear cloud sync status and actions",
        summary: "Cloud Sync uses the supplied cloud SF Symbols, accessible state labels, and consistent colors in the floating control and Settings.",
        features: ["Fourteen centralized cloud states", "Sync Now and confirmed Restore from Cloud actions in Settings"],
        improvements: ["Neutral offline and waiting states; separate authentication, access, warning, and failure indicators", "Theme-aware status colors and Reduce Motion support"],
        fixes: ["Only the two-arrow modifier inside the supplied cloud symbol rotates, while text and directional arrows stay still", "Configured connections no longer show an idle spinner", "Cloud restore stops if the local recovery copy cannot be saved"],
        knownIssues: ["GitHub Sync requires a user-provided fine-grained token."]
      },
      {
        version: "0.0.1.65",
        date: "2026-09-07T21:11:57.000Z",
        title: "Keep GitHub credentials visible",
        summary: "Saved and successfully tested GitHub credentials now remain visibly present as a masked token with a clear storage label.",
        features: ["Visible device or browser-tab storage state beside the masked GitHub token"],
        improvements: ["Background sync status updates preserve token and Remember-choice edits that are still in progress"],
        fixes: ["Save and successful Test no longer empty the visible token field", "Save now reports a storage failure instead of presenting an unconnected state as successful"],
        knownIssues: ["GitHub Sync requires a user-provided fine-grained token."]
      },
      {
        version: "0.0.1.64",
        date: "2026-09-07T20:43:46.000Z",
        title: "Keep tested GitHub credentials",
        summary: "A successful connection test now keeps the verified token, and Settings links directly to the application repository.",
        features: ["Direct App repository link beneath the GitHub heading in Settings"],
        improvements: ["Successful tests respect the Remember token choice for persistent or tab-only storage"],
        fixes: ["Testing a newly entered access token no longer discards it when Settings refreshes"],
        knownIssues: ["GitHub Sync requires a user-provided fine-grained token."]
      },
      {
        version: "0.0.1.63",
        date: "2026-09-07T20:28:49.000Z",
        title: "Link the fixed GitHub target",
        summary: "GitHub Sync now presents its fixed target as compact metadata with direct repository and data-file links.",
        features: ["Direct links to the configured GitHub repository and exact JSON data file"],
        improvements: ["Owner, repository, branch, and path share one read-only metadata line instead of looking editable"],
        fixes: ["App Template sync now targets themadat/app-data/main/data/app-template.json"],
        knownIssues: ["GitHub Sync requires a user-provided fine-grained token."]
      },
      {
        version: "0.0.1.62",
        date: "2026-09-07T06:00:53.000Z",
        title: "Refine button symbols and Settings scrolling",
        summary: "Button Style uses a purpose-built matched symbol set, and mobile Settings now scrolls as one complete screen.",
        features: ["Supplied square-and-A artwork for Icons + Text with matching square-only and A-only variants"],
        improvements: ["One full-screen mobile Settings scroll surface with a sticky close header", "Settings tabs reset the active scroll surface to the top"],
        fixes: ["Removed unrelated catalog artwork from the Button Style choices", "Bottom Settings controls remain reachable without relying on a nested panel scroller"],
        knownIssues: ["GitHub Sync requires a user-provided fine-grained token."]
      },
      {
        version: "0.0.1.61",
        date: "2026-09-07T05:11:32.000Z",
        title: "Compact appearance and GitHub controls",
        summary: "Appearance controls now fill their rows consistently, and GitHub setup uses a fixed compact repository target.",
        features: ["Read-only GitHub owner, repository, branch, and path supplied by app configuration", "Icons for Button Style, Hints, restore, and GitHub connection actions"],
        improvements: ["The Text Size slider spans the same control width as the segmented toggles", "GitHub target, token, remember choice, and actions stay visible in one compact block"],
        fixes: ["Removed redundant Text Size explanatory copy", "Imported settings can no longer redirect the hard-coded GitHub target"],
        knownIssues: ["GitHub Sync requires a user-provided fine-grained token."]
      },
      {
        version: "0.0.1.60",
        date: "2026-09-07T04:51:25.000Z",
        title: "Refresh the settings experience",
        summary: "Settings now combine Trail Log’s compact appearance and release patterns with McFamily’s denser GitHub connection layout.",
        features: ["Symbol-led vertical settings navigation", "Roadmap priority, target, and effort filters with a live result count"],
        improvements: ["Trail Log-style appearance controls with System, Light, and Dark symbols", "Collapsible release notes remain separate from the dedicated Roadmap", "Shortcuts now sit below Roadmap and above Developer", "GitHub connection status and controls use a compact setup"],
        fixes: ["Vertical settings tabs respond to Up and Down Arrow in addition to horizontal arrow keys"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.59",
        date: "2026-09-06T23:01:54.000Z",
        title: "Isolate catalog styles and expand filter shortcuts",
        summary: "Category-specific SVG styles stay inside their own artwork, and direct shortcuts make category and filter reset faster.",
        features: ["A selects the All icon category", "C clears the icon search plus category, type, source, and developer label-length filters"],
        improvements: ["The clear action remains available whenever any catalog filter or search is active"],
        fixes: ["Scoped embedded SVG stylesheet selectors so Apps & Branding and Home & Appliances artwork cannot distort category chevrons"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.58",
        date: "2026-09-06T22:40:47.000Z",
        title: "Correct category controls and canonical weights",
        summary: "Category disclosure controls, selected search text, and compatibility-mapped SF Symbol weights now render consistently.",
        features: ["All five native-weight folders are authoritative for every mapped SF Symbol name"],
        improvements: ["Selected text in the search field uses a high-contrast accent treatment"],
        fixes: ["Removed Safari’s native button appearance from category chevrons", "Replaced legacy pseudo-Bold geometry with canonical All 7 Bold artwork for 50 mapped symbols"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.57",
        date: "2026-09-06T22:25:46.000Z",
        title: "Refine icon browsing",
        summary: "Search matches, filters, category rows, shortcut hints, and generated catalog delivery are clearer and more compact.",
        features: ["Four deterministic catalog data parts below GitHub’s large-file warning threshold", "High-contrast search-term highlighting in cards and search results"],
        improvements: ["Type and Source filters share one row", "The app-icon shortcut badge shows only T", "Icon-weight shortcut bubbles stay fully visible"],
        fixes: ["Removed the redundant F badge from the selected category", "Eliminated the clipped badge artifact that made selected category controls look malformed"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.56",
        date: "2026-09-06T22:08:14.000Z",
        title: "Complete native icon weights",
        summary: "All 6,918 SF Symbol records now provide Ultra, Light, Medium, Bold, and Black output from the complete app-input weight library.",
        features: ["Verified native-weight mappings for 50 app-facing symbol names", "Complete Ultra, Light, Medium, and Black coverage across the SF Symbol catalog"],
        improvements: ["The compiler reads the current All 1 Ultralight folder", "Mapped variants retain their exact app-input source provenance"],
        fixes: ["Filled the final 200 missing non-Bold weight variants without adding duplicate cards"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.55",
        date: "2026-09-06T19:46:23.000Z",
        title: "Add native Bold symbols",
        summary: "The All 7 Bold source set now supplies exact native Bold artwork and closes the remaining Bold gaps in the five-weight selector.",
        features: ["7,152 imported Bold source files", "Exact native Bold geometry on 6,868 deduplicated symbol records"],
        improvements: ["All 7 Bold source filter and provenance", "Matching Bold files enrich existing records without duplicate cards"],
        fixes: ["Eliminated every missing Bold weight in the SF Symbol catalog"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.54",
        date: "2026-09-06T19:13:11.000Z",
        title: "Add native Ultra and Black symbols",
        summary: "The All 1 Ultrathin and All 9 Black source sets now supply native artwork, and the enlarged weight selector uses the shorter Ultra label.",
        features: ["7,152 imported Ultra source files and 7,152 imported Black source files", "Exact native Ultra and Black geometry on 6,868 deduplicated symbol records"],
        improvements: ["Larger weight symbols and labels", "All 1 Ultrathin and All 9 Black source filters and provenance"],
        fixes: ["Renamed the visible Ultralight weight to Ultra"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.53",
        date: "2026-09-06T18:46:38.000Z",
        title: "Expand icon weights",
        summary: "The icon-weight selector now spans Ultra through Black with direct odd-number shortcuts and distinct weight symbols.",
        features: ["Ultra and Black SF Symbol weights", "1/3/5/7/9 shortcuts for Ultra, Light, Medium, Bold, and Black"],
        improvements: ["Dotted, dashed, outlined, ringed, and filled selector symbols communicate the weight progression", "Generated fallback artwork derives from the nearest available native weight"],
        fixes: ["Light now uses the requested dashed-circle selector symbol"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.52",
        date: "2026-09-06T18:31:01.000Z",
        title: "Add native Medium symbols",
        summary: "The complete All 5 Medium source set now supplies native Medium artwork, with direct 3/5/7 shortcuts for all three icon weights.",
        features: ["7,152 imported Medium source symbols with exact native geometry", "3 selects Light, 5 selects Medium, and 7 selects Bold"],
        improvements: ["Matching Medium files enrich existing records without duplicate cards", "All 5 Medium is available as a source filter and provenance label", "The shortcut reference and visible weight controls expose the new commands"],
        fixes: ["Replaced the generated Medium treatment wherever native Medium artwork is available"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.51",
        date: "2026-09-06T18:09:45.000Z",
        title: "Add native Light symbols",
        summary: "The complete All 3 Light source set now supplies native Light artwork throughout the deduplicated icon catalog.",
        features: ["7,152 imported Light source symbols with exact native geometry", "49 genuinely new deduplicated icons, bringing the catalog to 7,281"],
        improvements: ["The Light weight control prefers native source artwork while Medium retains its generated fallback", "Matching Light files enrich existing icon records instead of creating duplicate cards", "All 3 Light is available as a source filter and provenance label"],
        fixes: ["Replaced the simulated Light treatment wherever native Light artwork is available"],
        knownIssues: ["Medium continues to use a generated morphology fallback until a native Medium source is imported.", "GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.50",
        date: "2026-09-04T21:58:24.000Z",
        title: "Version deployment notifications",
        summary: "The GitHub Pages workflow name now carries the application version in the field displayed by GitHub Mobile notifications.",
        features: ["Application version in the GitHub Mobile Pages deployment notification label"],
        improvements: ["The dynamic run title continues to mirror the full versioned commit subject in Actions", "Release instructions now keep the Mobile-visible workflow name synchronized with every app build"],
        fixes: ["Moved the notification version from the ignored dynamic run title to the fixed workflow name used by GitHub Mobile"],
        knownIssues: ["GitHub Pages must use GitHub Actions as its only publishing source to prevent duplicate deployment notifications.", "GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.49",
        date: "2026-09-04T21:49:01.000Z",
        title: "Label Pages deployment runs",
        summary: "GitHub Pages now deploys through a checked-in workflow whose run title mirrors the versioned commit subject.",
        features: ["Automatic version details in GitHub Pages run titles"],
        improvements: ["The one-time workflow setup keeps future run titles current without another per-release edit", "Pages continues to publish the static repository root after pushes to main"],
        fixes: ["Replaced the fixed generated deployment title that omitted the application version"],
        knownIssues: ["GitHub Pages must be switched once to GitHub Actions as its publishing source.", "GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.48",
        date: "2026-09-04T21:32:50.000Z",
        title: "Add dashed and layered filters",
        summary: "How it looks now includes focused filters for dashed or dotted artwork and layered or stacked compositions.",
        features: ["Dashed & Dotted with 142 matching icons", "Layered & Stacked with 88 matching icons"],
        improvements: ["Conservative explicit-name matching avoids unrelated dot and multiple-item symbols", "Existing metadata overrides retain the new appearance memberships"],
        fixes: [],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.47",
        date: "2026-09-04T21:17:00.000Z",
        title: "Alphabetize appearance categories",
        summary: "How it looks categories and their nested choices now follow alphabetical order throughout the catalog interface.",
        features: [],
        improvements: ["Appearance categories sort by label in the filter rail", "Nested appearance choices and the metadata editor use the same alphabetical order"],
        fixes: ["Removed the hand-maintained appearance ordering that could drift as categories changed"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.46",
        date: "2026-09-04T18:14:26.000Z",
        title: "Balance favicon center bars",
        summary: "The favicon’s center horizontal and vertical bars now carry the same weight as its diagonal X.",
        features: [],
        improvements: ["Center cross and X share the 2.75-unit full-opacity stroke", "Outer grid guides retain their lighter 1.5-unit treatment"],
        fixes: ["The favicon center no longer looks weaker than its diagonals"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.45",
        date: "2026-09-04T17:55:13.000Z",
        title: "Unify app icon strokes",
        summary: "Every construction path in the light and dark app icons now renders at the same width and opacity.",
        features: [],
        improvements: ["Grid, diagonals, and concentric circles all use a 24-unit stroke at full opacity", "The construction grid remains clearly visible in the 42px top-bar icon"],
        fixes: ["Removed the grid-only rule that reduced its paths to a faint sub-pixel treatment"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.44",
        date: "2026-09-04T17:40:43.000Z",
        title: "Expand the icon catalog",
        summary: "The remaining SF Symbols source now joins the catalog with semantic categories and richer search vocabulary.",
        features: ["3,006 deduplicated icons from the Rest source", "Automotive under Transportation, plus Development and Energy & Power categories"],
        improvements: ["Rest icons reuse existing categories wherever their names identify a clear subject", "Category and concept synonyms make imported icons searchable beyond their source names"],
        fixes: ["All 7,232 retained icons have at least one semantic category and searchable tags"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.43",
        date: "2026-09-04T16:56:06.000Z",
        title: "Add SF Symbol weights",
        summary: "SF Symbols now support persistent Light, Medium, and Bold output, while the app and favicon geometry has clearer visual hierarchy.",
        features: ["A three-position Icon Weight slider in the catalog rail", "Light and Medium vector treatments for SF Symbol previews and copied SVGs"],
        improvements: ["The in-app icon emphasizes its X and circles over a quieter grid", "The favicon restores its X and removes both square outlines"],
        fixes: ["Custom icons remain unchanged when selecting an SF Symbol weight"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.42",
        date: "2026-09-04T16:27:38.000Z",
        title: "Persist exact icon overrides",
        summary: "The latest exported category edits now remain exact across every future catalog rebuild.",
        features: ["Exact category replacement for compiler-consumed permanent override entries"],
        improvements: ["All 150 supplied icon IDs are stored in the 409-entry permanent override set", "Source provenance remains intact even when an exported edit intentionally removes a source category"],
        fixes: ["Compiler inference no longer restores child or source groups removed by an exact exported override"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.41",
        date: "2026-09-04T16:17:00.000Z",
        title: "Simplify neon favicon",
        summary: "The Safari-gray favicon now uses a cleaner geometric construction and a vivid neon-blue stroke.",
        features: [],
        improvements: ["Two circles and two square outlines replace the former three-circle construction", "The grid now keeps every other guide line and removes the diagonal guides"],
        fixes: ["A thinner saturated blue stroke stands out more clearly than the former pale treatment"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.40",
        date: "2026-09-04T05:00:42.000Z",
        title: "Bake icon category overrides",
        summary: "The latest 150 exported category edits are now permanent and reproduce their selected memberships exactly.",
        features: ["Exact category replacement for compiler-consumed override entries"],
        improvements: ["The permanent override set now contains 409 validated icon records", "All 150 supplied icon IDs were found and baked without changing labels, types, artwork, or source provenance"],
        fixes: ["Explicitly removed inferred child and source groups are no longer silently restored during compilation"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.39",
        date: "2026-09-04T04:37:04.000Z",
        title: "Organize geographic icons",
        summary: "Geography now provides a durable home for areas, mapping tools, and physical destinations without mixing their meanings.",
        features: ["Geography with Countries, Regions, Mapping, and Places children", "Regions for continents, administrative areas, territories, and world or globe symbols"],
        improvements: ["Country outlines no longer appear as generic mapping tools", "Roads and paths remain in Mapping while buildings, landmarks, parks, and stations stay in Places"],
        fixes: ["Saved Locations, Maps, and Maps & Travel filters and overrides migrate into the new Geography hierarchy"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.38",
        date: "2026-09-04T04:21:12.000Z",
        title: "Clarify app icon artwork",
        summary: "The header icon now preserves its full blueprint geometry at display size, and the favicon uses a much brighter blue against Safari gray.",
        features: [],
        improvements: ["Thicker construction-grid and circle strokes in both header icon appearances", "Brighter, heavier favicon geometry for stronger small-size contrast"],
        fixes: ["The header icon no longer loses most of its grid and circles when scaled to 42 pixels"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.37",
        date: "2026-09-04T04:10:36.000Z",
        title: "Fit more icon cards",
        summary: "Narrower icon cards fit more results on each row while preserving the longest 20-character icon-name words.",
        features: [],
        improvements: ["Icon cards now use a compact 132–140 pixel responsive width", "The longest uninterrupted 20-character icon-name words remain intact at the default text size"],
        fixes: [],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.36",
        date: "2026-09-03T21:49:22.000Z",
        title: "Compact category navigation",
        summary: "The desktop category rail fits more choices on screen with shorter rows and single-line labels.",
        features: [],
        improvements: ["Category rows and the spacing between them use less vertical space", "Long category labels stay on one line and truncate until the sidebar is widened"],
        fixes: [],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.35",
        date: "2026-09-03T21:26:13.000Z",
        title: "Align category navigation",
        summary: "Category rows are easier to scan with larger type, aligned labels and counts, and familiar inline disclosure chevrons.",
        features: [],
        improvements: ["Counts align at the far right of every category row", "Category names share one starting position whether or not the row expands", "Sidebar category labels and counts use larger default type"],
        fixes: ["Expansion controls now sit at the far left inside the category container and use right/down chevrons"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.34",
        date: "2026-09-03T17:20:59.000Z",
        title: "Refine icon categories",
        summary: "The catalog taxonomy now separates visual arrow styles, clarifies recreation and locations, and keeps People limited to human and body-part symbols.",
        features: ["Arrows under How it looks with Chevron, Triangle, Chevron Arrow, and Triangle Arrow children", "Recreation with Games and Sport children, plus Locations with Countries, Mapping, and Places children"],
        improvements: ["Media is now Entertainment & Media", "All 4,540 icons remain categorized, including every icon from the former Actions and Norway & Sweden categories"],
        fixes: ["People no longer includes clothing, dice, doors, or other symbols without a person or body part"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.33",
        date: "2026-09-03T05:54:31.000Z",
        title: "Expand indices and currency symbols",
        summary: "Two curated symbol collections join the catalog, and the What’s New notice now closes itself after a visible countdown.",
        features: ["All 636 deduplicated Indices records and 13 Norway & Sweden records from the two requested source folders", "A 30-second What’s New countdown indicator with automatic dismissal"],
        improvements: ["Every added record also belongs to an existing semantic category: Commerce, Math, Text Formatting, or Locations", "Arrows, Building, Circled, Squared, and Interface continue to describe applicable visual variants", "The catalog now contains 4,540 unique icons"],
        fixes: [],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.32",
        date: "2026-09-03T00:04:13.000Z",
        title: "Add focused semantic categories",
        summary: "Five focused categories make home, sports, clothing, celebration, and education symbols faster to find.",
        features: ["Home & Appliances, Sports & Recreation, Clothing & Personal Items, Celebrations & Awards, and Education & Science filters", "Semantic search tags for every icon assigned to the new categories"],
        improvements: ["The new filters preserve useful broader memberships such as Games, People, Commerce, Devices, and Locations", "Eight newly supplied building edits are baked into the 266-entry permanent override set"],
        fixes: [],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.31",
        date: "2026-09-02T23:49:36.000Z",
        title: "Classify objects and tools",
        summary: "Every Objects & Tools icon now participates in the relevant semantic filters, while Building joins the compact appearance section.",
        features: ["A Building appearance filter with 91 matching icons", "All 1,499 Objects & Tools icons assigned to at least one additional semantic category"],
        improvements: ["The latest 70 supplied metadata edits are baked into the 258-entry permanent override set", "Home fixtures, electronics, sports equipment, clothing, media, safety gear, and other objects receive more useful search tags and category placement"],
        fixes: ["Distinct drawings that share a source name retain unique, stable icon IDs", "Both volcano variants now accept their intended baked metadata overrides"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.30",
        date: "2026-09-02T23:25:46.000Z",
        title: "Expand objects and stabilize icon browsing",
        summary: "The catalog adds the complete Objects & Tools collection, keeps Other visible at zero, and fixes Safari’s sticky filter-rail behavior.",
        features: ["All 1,499 deduplicated icons from the requested 1,504-file Objects & Tools source collection", "A persistent Other quick filter directly below All, including its zero count"],
        improvements: ["The compiler explicitly reads Objects & Tools without broadly scanning the !backups:data parent", "Previously compiled icons remain available when their former source folder is no longer part of the active scan", "The catalog now contains 4,042 unique icons"],
        fixes: ["Horizontal overflow containment no longer creates the Safari scroll ancestor that released the sticky category rail", "All Objects & Tools source icons remain in their requested category after permanent metadata overrides"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.29",
        date: "2026-09-02T19:56:27.000Z",
        title: "Fix icon rendering and baked override cleanup",
        summary: "The category rail now stays fixed while browsing, Nature has useful child filters, and baked metadata automatically leaves the pending override set.",
        features: ["Animals & Plants and Weather subcategories nested under Nature", "All 191 supplied icon metadata overrides baked into the catalog"],
        improvements: ["A dedicated sticky wrapper keeps the filter rail in view while its own long contents remain scrollable", "Device-local overrides are automatically removed after their values match the compiled catalog"],
        fixes: ["X Square Fill now uses the actual X artwork on a transparent canvas", "Metadata edits that would leave an icon ungrouped fall back to Interface"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.28",
        date: "2026-09-02T19:13:56.000Z",
        title: "Organize icon categories by meaning and appearance",
        summary: "The sticky filter rail now separates subject categories from visual treatments and gives every retained icon a useful classification.",
        features: ["Distinct What it is and How it looks category sections", "New Locations, Games, Apps & Branding, and nested Text Formatting destinations"],
        improvements: ["Maps and Maps & Travel are consolidated into Locations", "Connectivity is combined with Devices", "The former Other set was audited from 385 icons to zero retained uncategorized icons"],
        fixes: ["Legacy Maps, Maps & Travel, and Other metadata migrate into the new category structure", "Generated dist bundles are ignored so malformed build artifacts do not enter the catalog"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.27",
        date: "2026-09-02T18:13:36.000Z",
        title: "Show Developer Mode divider feedback",
        summary: "Developer Mode now exposes live proportional feedback while resizing the icon filter rail.",
        features: ["Live filter-rail percentage shown only while pointer dragging in Developer Mode"],
        improvements: ["The readout follows the divider and updates against the available catalog width"],
        fixes: ["Normal mode remains uncluttered and keyboard resizing retains its accessible pixel value", "SVG Converter’s aggregate !All folder is skipped so duplicate provenance does not churn the compiled catalog"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.26",
        date: "2026-09-02T04:46:13.000Z",
        title: "Widen icon cards and unify metadata editing",
        summary: "The catalog keeps its normal label size on wider cards, metadata fields are consistent, and Appearance settings are simpler.",
        features: ["All 82 supplied icon metadata overrides baked into the catalog"],
        improvements: ["Every icon card is wider so the long Arrow Trianglehead label fits four lines without shrinking", "Icon details and the complete metadata editor use the same Name and Type field layout", "The Icon details Edit metadata action and icon-name action continue to open the same complete editor"],
        fixes: ["Removed Primary, Secondary, Success, Warning, and Danger color controls from Settings"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.25",
        date: "2026-09-02T04:23:06.000Z",
        title: "Refine icon details and overrides",
        summary: "Icon details now edits names and types directly, while the supplied metadata changes are permanent in the compiled catalog.",
        features: ["Direct Name and Type fields in Icon details", "Portable Custom/Symbol type overrides in local state and exported update files", "All 75 supplied icon metadata overrides baked into the catalog"],
        improvements: ["Very long icon names use a compact four-line presentation", "The advanced icon editor is clearly reserved for groups and filter source"],
        fixes: ["Removed the malformed E Push T Segment Prefix T I To String 16 E Push T E Push extraction at compile time"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.24",
        date: "2026-09-02T04:08:33.000Z",
        title: "Add eight curated icon collections",
        summary: "Eight SVG Converter collections now have complete source-aware quick categories that survive artwork deduplication.",
        features: ["Accessibility with all 122 requested source files", "Editing with all 163 requested source files", "Keyboard with all 104 requested source files", "Maps with all 141 requested source files", "Math with all 101 requested source files", "Media with all 106 requested source files", "Privacy & Security with all 155 requested source files", "Transportation with all 119 requested source files"],
        improvements: ["Source-folder assignments remain attached when matching artwork merges with another repository", "Category names become semantic search tags and quick-filter choices"],
        fixes: ["Privacy & Security replaces the shorter Security label without changing its compatible stored category id"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.23",
        date: "2026-09-01T22:16:37.000Z",
        title: "Streamline icon metadata and categories",
        summary: "Icon names and filter sources are editable, category branches collapse persistently, the Badge taxonomy gains nested shape variants, and Appearance is more compact.",
        features: ["Direct name and group editing from every icon label plus editable filter source from Icon details", "Persistent collapsible category branches with Badged → Shapes and Exclamation Mark variants", "Right-click removal from the selected category with Undo", "Six supplied icon metadata overrides baked into the compiled catalog"],
        improvements: ["The refreshed sibling-source scan adds 750 SF Symbols for a 3,130-icon catalog", "Cloud/Server is now Cloud & Drive, while Rays and Sparkled are combined as Rays & Sparkles", "Wider icon cards fit Counterclockwise on one line at the default size", "One sliding text-size control adjusts application and reading text together", "Button presentation now follows color mode in Appearance"],
        fixes: ["Theme presets and the manual motion override no longer clutter Settings", "Nested group parents are preserved automatically in local and compiled overrides", "Reduced-motion behavior continues to follow the device preference"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.22",
        date: "2026-09-01T21:38:33.000Z",
        title: "Add Health, Nature, and Rays collections",
        summary: "The icon catalog now guarantees complete Health, Nature, and Rays source coverage, with Rays available as its own quick category.",
        features: ["All 133 SVGs from SVG Converter’s !Health collection", "All 159 SVGs from SVG Converter’s !Nature collection", "All 8 SVGs from SVG Converter’s !Rays collection and a dedicated Rays quick category"],
        improvements: ["Source-aware Health and Nature assignments survive deduplication", "Rays search and filtering include semantic ray, laser, and burst terms"],
        fixes: ["Icons from the three requested collections can no longer fall outside their intended quick category after merging with another source"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.21",
        date: "2026-09-01T21:11:36.000Z",
        title: "Accelerate and refine icon browsing",
        summary: "The catalog now shows 500 icons per batch, adds explicit Time-source coverage, simplifies override export, and provides a Developer Mode label-length filter.",
        features: ["All 49 SVGs from SVG Converter’s requested !Time collection—now organized as Time—remain classified under Time", "Developer Mode filtering by minimum label character count", "Compact icon override export as a simple JSON array accepted directly by the compiler"],
        improvements: ["Icon result batches increased from 120 to 500", "Up and Down Arrow keys activate the adjacent category in the vertical filter rail", "Generated and locally edited labels automatically remove the Svgrepo Com suffix"],
        fixes: ["Circle, Multiple, and Slash no longer appear as nested Badge subcategories", "Stored selections for removed icon categories recover to All"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.20",
        date: "2026-09-01T20:33:16.000Z",
        title: "Add complete Badge subcategories",
        summary: "The catalog adds the complete !Badge source collection and 42 suffix-specific nested choices, including a plain Badge subtype.",
        features: ["All 646 SVGs from SVG Converter’s !Badge source folder", "Forty-two nested Badged subcategories derived from the badge artwork suffix", "A plain Badge subtype for symbols whose badge has no additional content"],
        improvements: ["Catalog expanded to 2,296 unique icons while retaining deduplicated source provenance", "The metadata editor lays out the expanded Badged choices in a compact responsive grid", "Source-aware Badged assignment includes circlebadge, trianglebadge, and plain badge variants"],
        fixes: ["Badge subcategories use content after the badge token, so base-icon terms no longer create false subtype matches"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.19",
        date: "2026-09-01T18:34:26.000Z",
        title: "Edit icon metadata and add Weather",
        summary: "Icons can now be renamed and moved among groups locally, exported as compiler-ready updates, and browsed with the complete Weather source collection.",
        features: ["An accessible icon metadata editor for display names and multi-group membership", "A downloadable update JSON that the catalog compiler consumes for permanent changes", "All 173 SVGs from SVG Converter’s weather source folder"],
        improvements: ["Icon edits persist through reload, JSON backup, and GitHub Sync while Reset Preferences preserves them", "Source-aware Weather assignment survives icon deduplication", "The compiler reports applied and missing hardcoded overrides"],
        fixes: ["Same-name SF Symbol merges are counted once in compiler diagnostics"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.18",
        date: "2026-09-01T14:59:12.000Z",
        title: "Refine icon browsing and add Sparkles",
        summary: "The icon catalog adds nested badge categories, a resizable filter rail, denser cards, and the complete Sparkles source collection.",
        features: ["Plus, Minus, Checkmark, and Xmark subcategories nested under Badged", "A draggable filter-rail divider with remembered width and keyboard resizing", "All 26 SVGs from SVG Converter’s sparkles source folder"],
        improvements: ["Shorter icon cards and a smaller information control increase visible catalog density", "Source-aware Sparkled assignment survives icon deduplication", "The filter rail supports pointer, touch, Left and Right Arrow, Home, and End resizing"],
        fixes: ["Badge subcategories require both badge and subtype metadata so unrelated action symbols are excluded"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.17",
        date: "2026-09-01T04:43:05.000Z",
        title: "Expand icon categories and update controls",
        summary: "The icon catalog adds a shape-focused source collection and five quick categories, while the New version available notice gains full shortcut support.",
        features: ["Shapes category containing all 110 SVGs from SVG Converter’s shapes source folder", "Badged, Squared, Circled, Slashed, and Sparkled quick categories", "R to Force Refresh and X to close the New version available notice, directly or with Shift–Control–Option"],
        improvements: ["Shorter desktop category controls fit more quick filters on screen", "Source-aware Shapes assignment survives icon deduplication", "Update buttons participate in shortcut hints and hover descriptions"],
        fixes: ["Update-notice shortcuts remain inactive while a dialog owns keyboard focus", "Dynamic toast shortcuts are cleared before later notifications"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.16",
        date: "2026-08-31T18:56:38.000Z",
        title: "Expand browsing and add Cloud/Server icons",
        summary: "The catalog now uses the full workspace width, adds a dedicated Cloud/Server category, and simplifies its compact filter rail.",
        features: ["Cloud/Server category containing every SVG from SVG Converter’s server:drive source folder", "Source-aware category assignment that survives icon deduplication"],
        improvements: ["Full-width catalog below the application bar", "Shorter desktop category controls fit more quick filters on screen"],
        fixes: ["Removed the unnecessary icon sort preference while retaining predictable alphabetical results"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.15",
        date: "2026-08-31T20:00:00.000Z",
        title: "Clean icon sources and filter rail",
        summary: "Corrupted SVG Converter exports and repeated SF Symbols are removed, while categories and filters move into a persistent vertical workspace rail.",
        features: ["Sticky vertical category and filter rail on desktop and tablet", "Responsive compact filter surface on mobile"],
        improvements: ["Catalog reduced to 1,327 unique icons while preserving merged source provenance", "Retained SF Symbol paint is normalized to currentColor for dependable previewing and reuse"],
        fixes: ["Excluded SVG Converter output folders whose missing transparent-rectangle opacity produced filled square backgrounds", "Coalesced repeated SF Symbol names even when their source markup differs"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.14",
        date: "2026-08-31T18:00:00.000Z",
        title: "Category-first icon finding",
        summary: "The icon catalog now combines quick-select categories with semantic search tags and a denser card layout for faster symbol retrieval.",
        features: ["Persistent quick-select category chips with live counts", "Generated multi-category assignments and semantic aliases for every compiled icon"],
        improvements: ["Search accepts names, aliases, tags, categories, source metadata, and multiple query terms", "Removed the introductory catalog block and moved type/info controls to the bottom corners of each compact card"],
        fixes: ["Category generation ignores incidental source-directory names and keeps generic shape variants from overwhelming the Shapes category"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.13",
        date: "2026-08-31T16:00:00.000Z",
        title: "Compact icon library",
        summary: "The icon library now uses compact name-and-type cards, provides source details on demand, and includes a complete module shortcut set.",
        features: ["Accessible icon-details dialog with identifiers, aliases, repositories, filenames, paths, and source symbols", "Icon-library commands for filters, first result, focused-icon details, clearing search, and loading more"],
        improvements: ["Narrow cards show only the icon, a multiline name, and Custom or Symbol type", "Arrow keys plus Home and End move through the visible icon grid"],
        fixes: ["Enter in global search now closes suggestions, renders the catalog matches below, and focuses the first result"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.12",
        date: "2026-08-29T23:30:00.000Z",
        title: "What’s New banner shortcuts",
        summary: "The main-page What’s New banner now provides keyboard commands for viewing release notes or dismissing the notice.",
        features: ["V to view release notes", "X to dismiss the What’s New banner"],
        improvements: ["Shortcut-hint badges and hover descriptions on both banner actions"],
        fixes: ["The dismiss command is available only while the banner is visible on the active page and only for a plain key or the full Shift–Control–Option chord"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.10",
        date: "2026-08-29T22:00:00.000Z",
        title: "Complete multi-repository icon scan",
        summary: "The icon library now scans every sibling application repository, captures complete SVG template literals wherever they appear, and separates SF Symbols from custom artwork.",
        features: ["Generated catalog of 2,975 deduplicated SVG icons", "SF Symbols versus Custom type filter", "Automatic discovery of sibling application directories"],
        improvements: ["McTree McHome and every other contributing sibling repository now appear in the source filter", "Standalone SVG files are included alongside SVG template literals", "Catalog output reports scan and classification totals"],
        fixes: ["SVG template literals no longer require a named variable assignment to be captured", "Repositories outside the former three-directory allowlist are no longer skipped"],
        knownIssues: ["Two oversized world-map canvases are intentionally excluded from the icon catalog.", "GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.9",
        date: "2026-08-29T21:00:00.000Z",
        title: "Single GitHub Pages deployment",
        summary: "Pushes now use the repository’s existing GitHub Pages branch deployment without also starting a redundant custom publishing workflow.",
        features: [],
        improvements: ["One automatic Pages deployment per main-branch push", "Hosting instructions now document the single deployment path"],
        fixes: ["Removed the duplicate push-triggered GitHub Pages workflow"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.8",
        date: "2026-08-29T20:00:00.000Z",
        title: "Searchable SVG icon library",
        summary: "The main workspace now catalogs reusable SVG symbols from the related apps with fast search, source filtering, sorting, and one-click copying.",
        features: ["Generated catalog of 932 deduplicated SVG icons", "Searchable and filterable icon grid", "One-click complete SVG copying"],
        improvements: ["Global search now prioritizes matching icons", "Large result sets render in responsive batches", "Every catalog entry retains aliases and source metadata"],
        fixes: ["The formerly blank workspace now has a focused reusable purpose"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.7",
        date: "2026-08-29T17:00:00.000Z",
        title: "Safari-gray blueprint favicon",
        summary: "The full-bleed favicon now combines Safari’s neutral system gray with the template’s blue construction grid, diagonals, and concentric circles.",
        features: [],
        improvements: ["Safari-default gray favicon background", "Blueprint geometry tuned for small tab sizes"],
        fixes: ["Restored the requested blueprint identity without reintroducing an inset outline"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.6",
        date: "2026-08-29T16:00:00.000Z",
        title: "Full-bleed Safari favicon",
        summary: "Safari now receives a fully opaque gray favicon canvas with no inset shape, transparent margin, or outline treatment.",
        features: [],
        improvements: ["Gray favicon artwork runs edge to edge"],
        fixes: ["Removed the inset squircle and its visible Safari tab outline"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.5",
        date: "2026-08-29T15:00:00.000Z",
        title: "Filled dark-mode favicon",
        summary: "The favicon squircle now uses an appearance-aware solid fill so it remains filled instead of reading as a white outline in dark browser chrome.",
        features: [],
        improvements: ["Gray filled squircle in light browser chrome", "White filled squircle in dark browser chrome"],
        fixes: ["Dark title bars no longer make the favicon interior disappear against the surrounding gray"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.4",
        date: "2026-08-29T12:00:00.000Z",
        title: "Filled favicon and Developer shortcut",
        summary: "The neutral favicon now renders as a solid gray squircle, and the pipe key can toggle Developer Mode directly or with the shortcut chord.",
        features: ["Pipe-key Developer Mode shortcut"],
        improvements: ["Solid gray squircle favicon", "Theme and Developer Mode commands share the app-icon hint badge"],
        fixes: ["Favicon artwork no longer collapses into an outlined guide at small sizes"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.3",
        date: "2026-08-28T12:00:00.000Z",
        title: "Adaptive icons and command hints",
        summary: "The application now uses the supplied light, dark, and gray artwork and reveals available keyboard commands with the Shift–Control–Option chord.",
        features: ["Shift–Control–Option shortcut overlay", "Hover descriptions for shortcut-enabled controls"],
        improvements: ["New light and dark app, install, touch, and splash artwork", "Gray favicon artwork", "Settings now has its own comma shortcut"],
        fixes: ["Shortcut badges stay scoped to the active dialog", "Search remains available with the full modifier chord"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.2",
        date: "2026-08-03T15:00:00.000Z",
        title: "Blank application workspace",
        summary: "The main app area is empty and ready for a future app while Notes, Roadmap, updates, and shortcuts remain available from the shell.",
        features: ["Theme shortcut on the app icon", "Modifier-tolerant global shortcuts"],
        improvements: ["Unaccented Notes toolbar action", "Icon-only release and force-refresh actions", "Roadmap search, filters, and sorting live in Settings"],
        fixes: ["Fresh and unchanged demonstration Notes start blank", "Notes closes from its standard close control without a redundant Done button"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      },
      {
        version: "0.0.1.1",
        date: "2026-08-03T12:00:00.000Z",
        title: "Pre-launch application foundation",
        summary: "A focused local-first shell with centered search, combined storage and GitHub status, and force-refreshable PWA updates.",
        features: ["Single-modal Notes workspace", "Major.minor.patch.build versioning", "Combined Storage & GitHub settings"],
        improvements: ["Centered app-bar search", "Unified floating save and sync status", "Dedicated Notes SF Symbol", "Bottom new-version toast with force refresh"],
        fixes: ["Installed apps can explicitly activate and reload a waiting application update", "The redundant Roadmap navigation strip is removed"],
        knownIssues: ["GitHub Sync requires a user-provided repository and fine-grained token."]
      }
    ],

    roadmap: [
      { id: "road-1", title: "Optional attachment adapter", description: "Document an extension point for local or remote file attachments.", state: "planned", priority: 2, target: "1.2", effort: 3, createdAt: "2026-07-08T12:00:00.000Z" },
      { id: "road-2", title: "Notes print view", description: "Add a clean print layout for the single Notes workspace.", state: "wishlist", priority: 3, target: "Unscheduled", effort: 2, createdAt: "2026-07-20T12:00:00.000Z" },
      { id: "road-3", title: "Local print layout", description: "Add a clean print view for notes and roadmap entries.", state: "planned", priority: 1, target: "1.1", effort: 1, createdAt: "2026-07-29T12:00:00.000Z" },
      { id: "road-4", title: "Focused template foundation", description: "Ship the shell, Notes, Roadmap, sync, recovery, PWA, and settings modules.", state: "released", priority: 1, target: "1.0", effort: 4, createdAt: "2026-06-12T12:00:00.000Z" }
    ],

    help: [
      { id: "start", title: "Getting started", section: "Basics", keywords: "start icons search tags categories objects tools other health nature rays cloud server shapes badged plus minus checkmark xmark squared circled slashed sparkled copy svg weight ultra ultralight ultrathin light medium bold black resize divider rename right click notes roadmap", html: "<p>Press <kbd>/</kbd> to search the icon catalog by name or meaning, use the compact category and filter rail for instant narrowing, and choose Ultra, Light, Medium, Bold, or Black output for SF Symbols. The selected weight updates previews and copied SVG markup but does not alter custom icons. Select a preview to copy its complete SVG, or select its name to edit it directly. On desktop and tablet, the rail stays beside the scrolling results; drag its divider or use the divider’s arrow keys to resize it. Notes and the replaceable Roadmap remain available from the application shell.</p>" },
      { id: "icons", title: "Finding and copying icons", section: "Features", keywords: "icons svg symbol search semantic tags categories accessibility celebrations awards clothing personal editing education science text formatting games sport recreation home appliances indices currency geography countries regions continents states provinces territories mapping places maps objects tools other health keyboard math entertainment media nature animals plants people body privacy security rays sparkles cloud drive building shapes badged time transportation weather chevron triangle arrow plus minus checkmark xmark squared circled slashed quick select collapse copy clipboard rename right click remove undo source filter resize divider catalog compiler", html: "<p>Search by name, alias, semantic tag, category, Symbol/Custom type, repository, or source metadata; multiple search words must all match. Other stays directly below All so uncategorized icons are immediately visible, even when its count is zero. The desktop rail stays visible while results scroll and separates semantic <strong>What it is</strong> categories—including Recreation with Games and Sport, Geography with Countries, Regions, Mapping, and Places, Entertainment &amp; Media, Indices, Objects &amp; Tools, and Nature’s Animals &amp; Plants and Weather children—from the smaller, alphabetized <strong>How it looks</strong> set, including Arrows with Chevron, Chevron Arrow, Triangle, and Triangle Arrow. Geography separates geographic areas from map tools and physical destinations. People contains only symbols depicting a person or body part. Every curated Objects &amp; Tools and Indices icon also belongs to at least one relevant semantic category. Category branches can be collapsed and their state is remembered. Use Up and Down Arrow while a category is focused to activate the adjacent category. Drag the divider to change the rail width, or focus it and use Left/Right, Home, or End; the width is remembered. Results stay alphabetical and appear 500 at a time. Press <kbd>Enter</kbd> to move to the grid, choose a preview to copy its sanitized SVG, select its name to edit metadata, right-click it to remove it from the selected category with Undo, or use the information button for tags, original source details, and the editable filter source. Use <kbd>G</kbd> for the first result, <kbd>I</kbd> for focused-icon details, <kbd>C</kbd> to clear search, and <kbd>L</kbd> to show more. The committed catalog is rebuilt with <code>build/compile-icon-library.mjs</code>.</p>" },
      { id: "icon-overrides", title: "Icon overrides", section: "Features", keywords: "icon rename type custom symbol groups source right click remove undo override export json compiler feed back developer baked pending exact categories", html: "<p>Open Icon details to edit Name and Type immediately, or select an icon name to edit Name, Type, groups, and the source used by repository filtering while retaining every original file reference. When a category is selected, right-click an icon to remove it from that group and use Undo if needed. Choose <strong>Export overrides</strong> in the editor or Developer Mode to download a compact array containing icon IDs, labels, category IDs, and optional type and source values. Attach that file in a future request to hard-code the changes, or use it directly as <code>build/icon-library-overrides.json</code>; the compiler also accepts the wrapped format, whose optional <code>excludedIconIds</code> list permanently rejects unwanted extractions. Permanent entries may use <code>exactCategories: true</code> when exported memberships must replace inferred source or child categories exactly. Once an update matches the compiled catalog, the app automatically removes it from the local pending override set.</p>" },
      { id: "notes", title: "Working with Notes", section: "Features", keywords: "notes text edit modal autosave", html: "<p>Open Notes from the top bar or press <kbd>N</kbd>. The single plain-text editor saves locally and is included in backup and synchronization data.</p>" },
      { id: "roadmap", title: "Using Roadmap", section: "Features", keywords: "roadmap planned released wishlist priority target effort reset filters", html: "<p>Search Roadmap, filter by state, priority, target, or effort, reset the controls in one step, and sort by priority, target release, effort, age, or title. Replace the demonstration entries in configuration.</p>" },
      { id: "backup", title: "Backup and restore", section: "Data", keywords: "json export import backup restore recovery", html: "<p>Export a JSON backup from Settings. Imports are parsed, migrated, sanitized, summarized, and confirmed before replacement. The current copy is saved as a recovery snapshot first.</p>" },
      { id: "sync", title: "GitHub synchronization", section: "Data", keywords: "github cloud sync token conflict merge", html: "<p>GitHub sync is optional. The app configuration fixes the repository, branch, and JSON file path; enter a fine-grained token with Contents access in Settings → Data Sync. Expand Sync payload (JSON) there to inspect the current local content included in uploads. Only Notes and edited icon metadata sync; appearance, filters, and settings stay on this device. Conflicts ask which copy to keep, with merging available for matching or separate items.</p>" },
      { id: "install", title: "Install the application", section: "Installation", keywords: "install add home screen iphone ipad android mac windows pwa offline update refresh shortcut", html: "<p>Use your browser’s Install app, Add to Home Screen, or Add to Dock command. There is no in-app installation dialog. Once the application shell has loaded, core local features continue to work offline. When a new version is ready, press <kbd>R</kbd> to Force Refresh or <kbd>X</kbd> to close its notice.</p>" },
      { id: "app-icon", title: "App icon controls", section: "Appearance", keywords: "icon theme dark light beta developer mode hold press shortcut pipe", html: "<p>Click or tap the app icon, or press <kbd>T</kbd>, to switch between light and dark themes. Press and hold the icon, or press <kbd>|</kbd> or <kbd>D</kbd>, to enable or disable Developer Mode. The Beta pill appears automatically on a <code>/beta/</code> URL or when <code>?beta=1</code> is present.</p>" },
      { id: "privacy", title: "Privacy and local data", section: "Data", keywords: "privacy local storage token secret", html: "<p>Notes remain in browser storage unless you export them or explicitly use GitHub Sync. Tokens are stored separately per device and excluded from backups and diagnostics.</p>" },
      { id: "shortcuts", title: "Keyboard access", section: "Accessibility", keywords: "keyboard shortcuts slash escape alt option shift control hints hover version update refresh pipe developer countdown auto dismiss icon weight ultra ultralight ultrathin light medium bold black", html: "<p>Press <kbd>/</kbd> for global search, <kbd>N</kbd> for Notes, <kbd>V</kbd> for What’s New, <kbd>T</kbd> for the theme, <kbd>|</kbd> or <kbd>D</kbd> for Developer Mode, <kbd>,</kbd> for Settings, and <kbd>H</kbd> or <kbd>?</kbd> for Help. The main-page What’s New notice closes automatically after its 30-second countdown; use <kbd>V</kbd> to view release notes or <kbd>X</kbd> to dismiss it sooner. When New version available is visible, use <kbd>R</kbd> to Force Refresh and <kbd>X</kbd> to close it. In the icon library, use <kbd>1</kbd>, <kbd>3</kbd>, <kbd>5</kbd>, <kbd>7</kbd>, or <kbd>9</kbd> for Ultra through Black, and <kbd>G</kbd>, <kbd>I</kbd>, <kbd>C</kbd>, and <kbd>L</kbd> for the visible module actions. Commands work directly or with Shift–Control–Option held. Hold that chord to reveal available shortcut badges, and hover a shortcut-enabled control for its full command.</p>" }
    ]
  };

  window.LocalApp.config = Object.freeze(CONFIG);
})();
