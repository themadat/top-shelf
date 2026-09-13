(function () {
  "use strict";

  const App = window.LocalApp;
  const config = App.config;
  const icons = App.icons;
  const u = App.utils;
  const model = App.stateModel;
  const storage = App.storage;
  const components = App.components;
  const portability = App.portability;
  const sync = App.sync;
  const pwa = App.pwa;
  const sourceIconCatalog = App.iconLibrary && Array.isArray(App.iconLibrary.icons) ? App.iconLibrary.icons : [];
  const iconCategories = App.iconLibrary && Array.isArray(App.iconLibrary.categories) ? App.iconLibrary.categories : [];
  const iconCategoryById = new Map(iconCategories.map(function (category) { return [category.id, category]; }));
  const ICON_CATEGORY_SECTIONS = Object.freeze([
    Object.freeze({ id: "meaning", label: "What it is" }),
    Object.freeze({ id: "appearance", label: "How it looks" })
  ]);
  const sourceIconById = new Map(sourceIconCatalog.map(function (icon) { return [icon.id, icon]; }));
  let iconCatalog = sourceIconCatalog;
  let iconById = new Map(iconCatalog.map(function (icon) { return [icon.id, icon]; }));
  let iconSearchIndex = new Map();
  const ICON_PAGE_SIZE = 500;
  const ICON_FILTER_MIN_WIDTH = 156;
  const ICON_FILTER_MAX_WIDTH = 360;
  const ICON_WEIGHTS = Object.freeze(["ultralight", "light", "medium", "bold", "black"]);
  const ICON_WEIGHT_STRENGTH = Object.freeze({ ultralight: 1, light: 3, medium: 5, bold: 7, black: 9 });
  const ICON_WEIGHT_MORPHOLOGY_PER_STEP = 0.115;
  const weightedIconSvgCache = new Map();
  let hintModifierActive = false;
  let appIconHoldTimer = 0;
  let appIconHoldHandled = false;
  let iconVisibleCount = ICON_PAGE_SIZE;
  let copiedIconTimer = 0;
  let iconInfoTrigger = null;
  let whatsNewDismissTimer = 0;
  let whatsNewTimerVersion = "";

  const $ = function (selector, root) { return (root || document).querySelector(selector); };
  const $$ = function (selector, root) { return Array.from((root || document).querySelectorAll(selector)); };
  const versionedAsset = function (path) { return path + "?v=" + encodeURIComponent(config.identity.buildId); };

  function categoryRootsForSection(roots, sectionId) {
    const matches = roots.filter(function (category) { return (category.section || "meaning") === sectionId; });
    if (sectionId !== "appearance") return matches;
    return matches.sort(function (a, b) { return a.label.localeCompare(b.label, undefined, { numeric: true }); });
  }

  const SHORTCUTS = [
    { keys: "/", hintKey: "/", chordKey: "/", label: "Search all fields and select current search text", group: "Global" },
    { keys: "'", label: "Enable name-only matching while typing in search", group: "Icon Library", chord: false },
    { keys: "Enter", label: "Show icon search results below", group: "Icon Library", chord: false },
    { keys: "1", hintKey: "1", chordKey: "1", label: "Use Ultra icon weight", group: "Icon Library" },
    { keys: "3", hintKey: "3", chordKey: "3", label: "Use Light icon weight", group: "Icon Library" },
    { keys: "5", hintKey: "5", chordKey: "5", label: "Use Medium icon weight", group: "Icon Library" },
    { keys: "7", hintKey: "7", chordKey: "7", label: "Use Bold icon weight", group: "Icon Library" },
    { keys: "9", hintKey: "9", chordKey: "9", label: "Use Black icon weight", group: "Icon Library" },
    { keys: "G", hintKey: "G", chordKey: "G", label: "Focus the first visible icon", group: "Icon Library" },
    { keys: "I", hintKey: "I", chordKey: "I", label: "Show details for the focused icon", group: "Icon Library" },
    { keys: "A", hintKey: "A", chordKey: "A", label: "Select the All icon category", group: "Icon Library" },
    { keys: "C", hintKey: "C", chordKey: "C", label: "Clear icon filters and search", group: "Icon Library" },
    { keys: "L", hintKey: "L", chordKey: "L", label: "Show more matching icons", group: "Icon Library" },
    { keys: "Esc", hintKey: "Esc", chordKey: "Esc", label: "Close a dialog or menu", group: "Global" },
    { keys: "H or ?", hintKey: "H", chordKey: "H", label: "Open Help Center", group: "Global" },
    { keys: ",", hintKey: ",", chordKey: ",", label: "Open Settings", group: "Global" },
    { keys: "2", hintKey: "2", chordKey: "2", label: "Open Roadmap in Settings", group: "Navigation" },
    { keys: "N", hintKey: "N", chordKey: "N", label: "Open Notes", group: "Actions" },
    { keys: "V", hintKey: "V", chordKey: "V", label: "Open What’s New", group: "Actions" },
    { keys: "R", hintKey: "R", chordKey: "R", label: "Force refresh an available app update", group: "Updates" },
    { keys: "X", hintKey: "X", chordKey: "X", label: "Dismiss the active update notice or What’s New banner", group: "Updates" },
    { keys: "S", hintKey: "S", chordKey: "S", label: "Run the primary sync action", group: "Actions" },
    { keys: "E", hintKey: "E", chordKey: "E", label: "Export a JSON backup", group: "Actions" },
    { keys: "T", hintKey: "T", chordKey: "T", label: "Switch color theme", group: "Actions" },
    { keys: "D or |", hintKey: "D", secondaryHintKey: "|", chordKey: "D or |", label: "Toggle hidden Developer Mode", group: "Developer" },
    { keys: "Arrow keys", label: "Move through tabs, menus, and list choices", group: "Navigation", chord: false }
  ];

  function state() {
    return storage.getState();
  }

  function buildIconSearchIndex(catalog) {
    return new Map(catalog.map(function (icon) {
      const categoryLabels = (icon.categories || []).map(function (categoryId) { return iconCategoryById.get(categoryId)?.label || categoryId; });
      return [icon.id, [icon.label, icon.name, icon.kind === "sf-symbol" ? "sf symbol sf symbols" : "custom"].concat(icon.aliases || [], icon.tags || [], icon.categories || [], categoryLabels, icon.repositories || [], (icon.sources || []).map(function (item) { return item.symbol + " " + item.file; })).join(" ").toLowerCase()];
    }));
  }

  function refreshIconCatalog() {
    const overrides = state().modules.iconLibrary.overrides || [];
    const overrideById = new Map(overrides.map(function (override) { return [override.iconId, override]; }));
    iconCatalog = sourceIconCatalog.map(function (icon) {
      const override = overrideById.get(icon.id);
      if (!override) return icon;
      return Object.assign({}, icon, {
        label: override.label,
        kind: override.kind || icon.kind,
        categories: override.categories.slice(),
        source: override.source,
        repositories: override.source ? [override.source] : icon.repositories.slice()
      });
    }).sort(function (a, b) {
      return a.label.localeCompare(b.label, undefined, { numeric: true }) || a.id.localeCompare(b.id);
    });
    iconById = new Map(iconCatalog.map(function (icon) { return [icon.id, icon]; }));
    iconSearchIndex = buildIconSearchIndex(iconCatalog);
  }

  function setInputValue(input, value) {
    if (input && document.activeElement !== input) input.value = value == null ? "" : String(value);
  }

  function activeModuleEnabled(id) {
    if (id === "roadmap") return config.features.roadmap;
    return false;
  }

  function applyIdentity() {
    icons.mount(document);
    document.title = config.identity.name;
    $("meta[name='description']").content = config.identity.description;
    $("#appName").textContent = config.identity.name;
    $("#notesButton")?.toggleAttribute("hidden", !config.features.documents);
    $("#versionButton").textContent = "v" + config.identity.version;
    $("#versionButton").setAttribute("aria-label", "Open release notes for version " + config.identity.version);
    $("#appIcon").src = versionedAsset(config.identity.assets.appIconLight);
    $("#releaseCurrentVersion").textContent = "v" + config.identity.version;
    if (!config.features.roadmap) {
      $("[data-module='roadmap']")?.setAttribute("hidden", "");
      $("#roadmapModule")?.setAttribute("hidden", "");
      $("#supportRoadmapTab")?.setAttribute("hidden", "");
    }
  }

  function applyAppearance() {
    const appearance = state().preferences.appearance;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = appearance.mode === "dark" || (appearance.mode === "system" && systemDark);
    const root = document.documentElement;
    root.dataset.theme = dark ? "dark" : "light";
    root.dataset.buttonStyle = state().preferences.controls.buttonStyle;
    root.dataset.motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduce" : "full";
    root.style.setProperty("--text-scale", String(appearance.textScale));
    root.style.setProperty("--accent", appearance.accent);
    root.style.setProperty("--accent-strong", u.mixColor(appearance.accent, dark ? "#ffffff" : "#000000", dark ? 0.18 : 0.22));
    root.style.setProperty("--accent-soft", u.mixColor(appearance.accent, dark ? "#161c1b" : "#ffffff", dark ? 0.76 : 0.86));
    root.style.setProperty("--accent-2", appearance.accent2);
    root.style.setProperty("--accent-2-soft", u.mixColor(appearance.accent2, dark ? "#161c1b" : "#ffffff", dark ? 0.78 : 0.86));
    root.style.setProperty("--success", appearance.success);
    root.style.setProperty("--warning", appearance.warning);
    root.style.setProperty("--danger", appearance.danger);
    $("#appIcon").src = versionedAsset(dark ? config.identity.assets.appIconDark : config.identity.assets.appIconLight);
    const iconButton = $("#appIconButton");
    const nextTheme = dark ? "light" : "dark";
    iconButton.setAttribute("aria-label", "Switch to " + nextTheme + " theme. Press and hold to toggle Developer Mode");
    iconButton.title = "Switch to " + nextTheme + " theme · Press and hold for Developer Mode";
    decorateShortcutControls(iconButton);
    pwa.applyAppearanceAssets?.();
  }

  function isBetaDeploy() {
    const path = (location.pathname || "").toLowerCase();
    if (/\/beta(\/|$)/.test(path)) return true;
    const beta = new URLSearchParams(location.search || "").get("beta");
    return beta === "1" || beta === "true";
  }

  function renderHeader() {
    const developerMode = config.features.developerTools && state().preferences.controls.developerMode;
    const versionButton = $("#versionButton");
    versionButton.textContent = "v" + config.identity.version + (developerMode ? " DEV" : "");
    versionButton.dataset.developer = developerMode ? "true" : "false";
    versionButton.setAttribute("aria-label", "Open release notes for version " + config.identity.version + (developerMode ? ". Developer Mode is enabled" : ""));
    $("#betaPill").hidden = !isBetaDeploy();
    document.documentElement.dataset.developer = developerMode ? "on" : "off";
    setInputValue($("#globalSearch"), state().ui.search);
    renderSyncStatus();
    const latest = config.releases[0];
    const unread = latest && state().ui.seenReleaseVersion !== latest.version;
    $("#releaseUnreadDot").hidden = !unread;
    const banner = $("#whatsNewBanner");
    banner.hidden = !unread;
    if (unread) {
      $("[data-whats-new-version]").textContent = "v" + latest.version;
      $("[data-whats-new-title]").textContent = latest.title;
      $("[data-whats-new-summary]").textContent = latest.summary;
      startWhatsNewTimer(latest.version);
    } else {
      stopWhatsNewTimer();
    }
    const hint = $("#contextHint");
    const hintHidden = !config.features.hints || !state().preferences.hints.enabled || state().preferences.hints.dismissed.includes("icon-library-basics");
    hint.hidden = hintHidden;
  }

  function stopWhatsNewTimer() {
    window.clearTimeout(whatsNewDismissTimer);
    whatsNewDismissTimer = 0;
    whatsNewTimerVersion = "";
    $("#whatsNewBanner")?.classList.remove("is-counting-down");
  }

  function startWhatsNewTimer(version) {
    if (whatsNewDismissTimer && whatsNewTimerVersion === version) return;
    stopWhatsNewTimer();
    const banner = $("#whatsNewBanner");
    const duration = Math.max(1000, Number(config.controls.whatsNewAutoDismissMs) || 30000);
    banner.style.setProperty("--whats-new-duration", duration + "ms");
    banner.classList.add("is-counting-down");
    whatsNewTimerVersion = version;
    whatsNewDismissTimer = window.setTimeout(function () {
      if (config.releases[0]?.version === version && state().ui.seenReleaseVersion !== version) dismissWhatsNew();
    }, duration);
  }

  function dismissWhatsNew() {
    stopWhatsNewTimer();
    storage.mutate(function (next) { next.ui.seenReleaseVersion = config.releases[0].version; }, { reason: "release-seen" });
    renderHeader();
  }

  function renderCloudSyncVisual(element, info) {
    element.dataset.syncState = info.state;
    element.dataset.kind = info.kind;
    element.dataset.animation = info.animation;
    const icon = element.querySelector("[data-sync-icon]");
    if (icon && icon.dataset.symbol !== info.symbol) icons.set(icon, info.symbol);
  }

  function renderSyncStatus() {
    const info = sync.getInfo();
    const localAvailable = storage.isPersistent();
    const localLabel = localAvailable ? "Saved locally" : "Storage unavailable";
    const syncLabel = "GitHub · " + info.title;
    const button = $("#floatingStatusButton");
    renderCloudSyncVisual(button, info);
    button.dataset.localStorage = localAvailable ? "available" : "unavailable";
    button.setAttribute("aria-disabled", String(info.busy));
    button.title = localLabel + ". " + info.help + (info.busy ? "" : " " + info.action + ": " + sync.actions[info.primaryAction].help);
    button.setAttribute("aria-label", button.title);
    decorateShortcutControls(button);
    $("[data-floating-local-label]").textContent = localLabel;
    $("[data-floating-sync-label]").textContent = syncLabel;
  }

  function documentText(documentItem) {
    return u.richTextToPlainText(documentItem && documentItem.html || "", config.controls.maxDocumentHtmlLength);
  }

  function documentHtml(value) {
    return u.escapeHtml(u.cleanText(value, config.controls.maxDocumentHtmlLength)).replace(/\n/g, "<br>");
  }

  function renderNotesEditor() {
    const documentItem = state().workspace.documents[0];
    setInputValue($("#notesTextarea"), documentText(documentItem));
  }

  function saveNotes(value) {
    const normalized = u.cleanText(value, config.controls.maxDocumentHtmlLength);
    storage.mutate(function (next) {
      const documentItem = next.workspace.documents[0];
      if (!documentItem) return;
      documentItem.html = documentHtml(normalized);
      documentItem.updatedAt = u.isoNow();
    }, { reason: "edit-document" });
    $("[data-floating-local-label]").textContent = "Saving locally…";
    renderGlobalSearchResults();
  }

  function openNotes(trigger) {
    renderNotesEditor();
    components.openDialog("#notesDialog", { trigger: trigger, focus: "#notesTextarea" });
  }

  function filteredRoadmap(overrides) {
    const moduleState = state().modules.roadmap;
    const filters = Object.assign({ search: moduleState.search, state: moduleState.state, priority: moduleState.priority, target: moduleState.target, effort: moduleState.effort, sortBy: moduleState.sortBy, sortDirection: moduleState.sortDirection }, overrides || {});
    const query = String(filters.search || "").trim().toLowerCase();
    const direction = filters.sortDirection === "desc" ? -1 : 1;
    const priority = function (item) { return Number(item.priority) || 99; };
    return config.roadmap.filter(function (item) {
      return (filters.state === "all" || item.state === filters.state)
        && (filters.priority === "all" || String(item.priority) === String(filters.priority))
        && (filters.target === "all" || item.target === filters.target)
        && (filters.effort === "all" || String(item.effort) === String(filters.effort))
        && (!query || (item.title + " " + item.description + " " + item.target).toLowerCase().includes(query));
    }).slice().sort(function (a, b) {
      let compared = 0;
      if (filters.sortBy === "priority") compared = priority(a) - priority(b);
      else if (filters.sortBy === "effort") compared = a.effort - b.effort;
      else if (filters.sortBy === "age") compared = Date.parse(a.createdAt) - Date.parse(b.createdAt);
      else if (filters.sortBy === "target") compared = String(a.target).localeCompare(String(b.target), undefined, { numeric: true });
      else compared = a.title.localeCompare(b.title);
      return compared * direction || a.title.localeCompare(b.title);
    });
  }

  function roadmapCard(item) {
    return '<article class="roadmap-card" data-roadmap-state="' + item.state + '"><header><span class="roadmap-state">' + u.escapeHtml(item.state) + '</span><span class="priority-chip">P' + item.priority + '</span></header><h3>' + u.escapeHtml(item.title) + '</h3><p>' + u.escapeHtml(item.description) + '</p><footer><span>Target ' + u.escapeHtml(item.target) + '</span><span>Effort ' + item.effort + '/4</span><span>Added ' + u.dateLabel(item.createdAt) + "</span></footer></article>";
  }

  function repositoryLabel(value) {
    if (value === "mctree-mchome") return "McTree McHome";
    if (value === "objects-tools") return "Objects & Tools";
    if (value === "norway-sweden") return "Norway & Sweden";
    if (value === "indices") return "Indices";
    if (value === "all-1-ultrathin") return "All 1 Ultralight";
    if (value === "all-3-light") return "All 3 Light";
    if (value === "all-5-medium") return "All 5 Medium";
    if (value === "all-7-bold") return "All 7 Bold";
    if (value === "all-9-black") return "All 9 Black";
    return String(value || "").split("-").map(function (part) { return part.charAt(0).toUpperCase() + part.slice(1); }).join(" ");
  }

  function iconKindLabel(value) { return value === "sf-symbol" ? "Symbol" : "Custom"; }

  function iconMatches(icon, needle) {
    if (!needle) return true;
    const searchable = state().ui.searchNameOnly ? icon.label.toLowerCase() : (iconSearchIndex.get(icon.id) || "");
    return needle.split(/\s+/).filter(Boolean).every(function (term) { return searchable.includes(term); });
  }

  function selectedIconCategory() {
    const category = state().modules.iconLibrary.category;
    return iconCategoryById.has(category) ? category : "all";
  }

  function selectedIconWeight() {
    const weight = state().modules.iconLibrary.weight;
    return ICON_WEIGHTS.includes(weight) ? weight : "bold";
  }

  function iconSvgAtSelectedWeight(icon) {
    const weight = selectedIconWeight();
    if (!icon) return "";
    if (icon.weightSvgs && icon.weightSvgs[weight]) return icon.weightSvgs[weight];
    if (icon.kind !== "sf-symbol") return icon.svg;
    const sources = [{ weight: ICON_WEIGHTS.includes(icon.baseWeight) ? icon.baseWeight : "bold", svg: icon.svg }];
    Object.keys(icon.weightSvgs || {}).forEach(function (sourceWeight) {
      if (ICON_WEIGHTS.includes(sourceWeight)) sources.push({ weight: sourceWeight, svg: icon.weightSvgs[sourceWeight] });
    });
    sources.sort(function (a, b) {
      return Math.abs(ICON_WEIGHT_STRENGTH[a.weight] - ICON_WEIGHT_STRENGTH[weight]) - Math.abs(ICON_WEIGHT_STRENGTH[b.weight] - ICON_WEIGHT_STRENGTH[weight]);
    });
    const source = sources[0];
    if (!source || source.weight === weight) return source?.svg || icon.svg;
    const strengthDelta = ICON_WEIGHT_STRENGTH[weight] - ICON_WEIGHT_STRENGTH[source.weight];
    const operator = strengthDelta > 0 ? "dilate" : "erode";
    const radius = Math.abs(strengthDelta) * ICON_WEIGHT_MORPHOLOGY_PER_STEP;
    const cacheKey = weight + "\u0000" + icon.id + "\u0000" + source.weight + "\u0000" + source.svg;
    if (weightedIconSvgCache.has(cacheKey)) return weightedIconSvgCache.get(cacheKey);
    const filterId = "icon-weight-" + weight + "-" + String(icon.id || "symbol").replace(/[^a-z0-9_-]/gi, "-");
    const filter = '<defs><filter id="' + filterId + '" x="-20%" y="-20%" width="140%" height="140%"><feMorphology in="SourceGraphic" operator="' + operator + '" radius="' + radius + '"/></filter></defs>';
    const weighted = String(source.svg || "").replace(/^(\s*<svg\b[^>]*>)/i, function (openingTag) {
      return openingTag + filter + '<g data-icon-weight="' + weight + '" filter="url(#' + filterId + ')">';
    }).replace(/<\/svg>\s*$/i, "</g></svg>");
    weightedIconSvgCache.set(cacheKey, weighted);
    return weighted;
  }

  function renderIconWeightControl() {
    const control = $("#iconWeightControl");
    if (!control) return;
    const weight = selectedIconWeight();
    control.dataset.selectedWeight = weight;
    $$("[data-icon-weight]", control).forEach(function (input) { input.checked = input.value === weight; });
  }

  function iconCategoryChildren(categoryId) {
    return iconCategories.filter(function (category) { return category.parent === categoryId; });
  }

  function iconCategoryDescendants(categoryId) {
    const descendants = [];
    const pending = iconCategoryChildren(categoryId).slice();
    while (pending.length) {
      const category = pending.shift();
      descendants.push(category);
      pending.unshift.apply(pending, iconCategoryChildren(category.id));
    }
    return descendants;
  }

  function iconCategoryIsAncestor(categoryId, descendantId) {
    let parent = iconCategoryById.get(descendantId)?.parent || "";
    while (parent) {
      if (parent === categoryId) return true;
      parent = iconCategoryById.get(parent)?.parent || "";
    }
    return false;
  }

  function filteredIcons(options) {
    const settings = options || {};
    const moduleState = state().modules.iconLibrary;
    const availableSources = new Set(App.iconLibrary && App.iconLibrary.sourceRepositories || []);
    const sourceFilter = availableSources.has(moduleState.source) ? moduleState.source : "all";
    const kind = ["sf-symbol", "custom"].includes(moduleState.kind) ? moduleState.kind : "all";
    const category = settings.ignoreCategory ? "all" : selectedIconCategory();
    const needle = String(state().ui.search || "").trim().toLowerCase();
    const minimumLabelLength = state().preferences.controls.developerMode ? Math.round(u.clamp(moduleState.minimumLabelLength, 0, 120, 0)) : 0;
    const filtered = iconCatalog.filter(function (icon) {
      return (kind === "all" || icon.kind === kind)
        && (sourceFilter === "all" || icon.repositories.includes(sourceFilter))
        && (category === "all" || (icon.categories || []).includes(category))
        && (!minimumLabelLength || icon.label.length >= minimumLabelLength)
        && iconMatches(icon, needle);
    });
    filtered.sort(function (a, b) { return a.label.localeCompare(b.label, undefined, { numeric: true }); });
    return filtered;
  }

  function renderIconCategories(baseMatches) {
    const container = $("#iconCategoryFilters");
    if (!container) return;
    const selected = selectedIconCategory();
    const collapsed = new Set(state().modules.iconLibrary.collapsedCategories || []);
    const counts = new Map(iconCategories.map(function (category) { return [category.id, 0]; }));
    baseMatches.forEach(function (icon) {
      (icon.categories || []).forEach(function (categoryId) { counts.set(categoryId, (counts.get(categoryId) || 0) + 1); });
    });

    function choiceButton(choice, isSubcategory) {
      const active = choice.id === selected;
      const disabled = choice.count === 0 && !active;
      const parent = choice.parent ? iconCategoryById.get(choice.parent) : null;
      const ariaLabel = (parent ? parent.label + ": " : "") + choice.label + ", " + choice.count + " icons";
      const className = "icon-category-chip" + (isSubcategory ? " is-subcategory" : "");
      const shortcut = choice.id === "all" ? ' aria-keyshortcuts="A Control+Alt+Shift+A" data-shortcut="A"' : "";
      return '<button class="' + className + '" type="button" data-icon-category="' + u.escapeHtml(choice.id) + '" aria-pressed="' + active + '" aria-label="' + u.escapeHtml(ariaLabel) + '"' + shortcut + (disabled ? ' disabled' : '') + '><span>' + u.escapeHtml(choice.label) + '</span><small>' + choice.count + '</small></button>';
    }

    function categoryBranch(choice, isSubcategory, toggle) {
      const prefix = toggle || '<span class="icon-category-collapse-spacer" aria-hidden="true"></span>';
      return '<div class="icon-category-branch' + (isSubcategory ? ' is-subcategory' : '') + (choice.id === selected ? ' is-active' : '') + '">' + prefix + choiceButton(choice, isSubcategory) + '</div>';
    }

    const choices = iconCategories.map(function (category) {
      return { id: category.id, label: category.label, parent: category.parent || "", section: category.section || "meaning", count: counts.get(category.id) || 0 };
    });

    function categoryTree(choice, depth, alphabetize) {
      const children = choices.filter(function (candidate) { return candidate.parent === choice.id; });
      if (alphabetize) children.sort(function (a, b) { return a.label.localeCompare(b.label, undefined, { numeric: true }); });
      const isCollapsed = children.length > 0 && collapsed.has(choice.id);
      const childrenId = "icon-category-children-" + choice.id;
      const toggle = children.length ? '<button class="icon-category-collapse" type="button" data-icon-category-collapse="' + u.escapeHtml(choice.id) + '" aria-expanded="' + String(!isCollapsed) + '" aria-controls="' + u.escapeHtml(childrenId) + '" aria-label="' + u.escapeHtml((isCollapsed ? "Expand " : "Collapse ") + choice.label + " subcategories") + '" title="' + u.escapeHtml(isCollapsed ? "Expand" : "Collapse") + '"><span aria-hidden="true" data-symbol="' + (isCollapsed ? "chevronRight" : "chevronDown") + '"></span></button>' : "";
      const branch = categoryBranch(choice, depth > 0, toggle);
      const childMarkup = children.length ? '<div id="' + u.escapeHtml(childrenId) + '" class="icon-category-subcategories" role="group" aria-label="' + u.escapeHtml(choice.label + " subcategories") + '"' + (isCollapsed ? " hidden" : "") + '>' + children.map(function (child) { return categoryTree(child, depth + 1, alphabetize); }).join("") + '</div>' : "";
      return '<div class="icon-category-group" data-icon-category-depth="' + depth + '">' + branch + childMarkup + '</div>';
    }

    const otherChoice = choices.find(function (choice) { return choice.id === "other"; });
    const rootChoices = choices.filter(function (choice) { return !choice.parent && choice.id !== "other"; });
    const sections = ICON_CATEGORY_SECTIONS.map(function (section) {
      const sectionChoices = categoryRootsForSection(rootChoices, section.id);
      if (!sectionChoices.length) return "";
      const headingId = "icon-category-section-" + section.id;
      return '<section class="icon-category-section" aria-labelledby="' + headingId + '"><h3 id="' + headingId + '" class="icon-category-section-title">' + u.escapeHtml(section.label) + '</h3><div class="icon-category-section-groups">' + sectionChoices.map(function (choice) { return categoryTree(choice, 0, section.id === "appearance"); }).join("") + '</div></section>';
    }).join("");
    container.innerHTML = '<div class="icon-category-all">' + categoryBranch({ id: "all", label: "All", parent: "", count: baseMatches.length }, false, "") + '</div>' + (otherChoice ? '<div class="icon-category-other">' + categoryBranch(otherChoice, false, "") + '</div>' : "") + sections;
    icons.mount(container);
    decorateShortcutControls(container);
  }

  function sourceFileName(value) {
    const parts = String(value || "").split(/[\\/]/);
    return parts[parts.length - 1] || "Unknown file";
  }

  function highlightedSearchText(value, query) {
    const text = String(value || "");
    const needle = String(query || "").trim().toLowerCase();
    if (!needle) return u.escapeHtml(text);
    let cursor = 0;
    let output = "";
    let index = text.toLowerCase().indexOf(needle);
    while (index >= 0) {
      output += u.escapeHtml(text.slice(cursor, index));
      output += '<mark class="search-match">' + u.escapeHtml(text.slice(index, index + needle.length)) + "</mark>";
      cursor = index + needle.length;
      index = text.toLowerCase().indexOf(needle, cursor);
    }
    return output + u.escapeHtml(text.slice(cursor));
  }

  function iconCard(icon) {
    const typeText = iconKindLabel(icon.kind);
    const label = u.escapeHtml(icon.label);
    const highlightedLabel = highlightedSearchText(icon.label, state().ui.search);
    const id = u.escapeHtml(icon.id);
    const svg = iconSvgAtSelectedWeight(icon);
    return '<div class="icon-card-item" role="listitem" data-icon-item="' + id + '"><button id="icon-card-' + id + '" class="icon-card" type="button" data-icon-id="' + id + '" aria-label="Copy ' + label + ' SVG" aria-keyshortcuts="I Control+Alt+Shift+I" title="Copy SVG · Press I for details"><span class="icon-preview" aria-hidden="true">' + svg + '</span><span class="visually-hidden" data-icon-copy-text>Copy SVG</span></button><button class="icon-card-name" type="button" data-icon-rename="' + id + '" aria-haspopup="dialog" aria-controls="iconEditDialog" aria-label="Edit metadata for ' + label + '" title="Edit metadata">' + highlightedLabel + '</button><div class="icon-card-footer"><span class="icon-card-type">' + u.escapeHtml(typeText) + '</span><button class="icon-info-button" type="button" data-icon-info="' + id + '" aria-haspopup="dialog" aria-controls="iconInfoDialog" aria-label="More information about ' + label + '" title="More information"><span aria-hidden="true" data-symbol="info"></span></button></div></div>';
  }

  function iconOverrideFor(iconId) {
    return (state().modules.iconLibrary.overrides || []).find(function (override) { return override.iconId === iconId; }) || null;
  }

  function renderIconInfo(iconId) {
    const icon = iconById.get(iconId);
    if (!icon) return null;
    const aliases = Array.isArray(icon.aliases) ? icon.aliases.filter(Boolean) : [];
    const sources = Array.isArray(icon.sources) ? icon.sources : [];
    $("#iconInfoDialogTitle").textContent = icon.label;
    $("#iconInfoQuickEdit").dataset.iconId = icon.id;
    $("#iconInfoName").value = icon.label;
    $("#iconInfoType").value = icon.kind;
    $("#iconInfoName").removeAttribute("aria-invalid");
    $("#iconInfoValidation").hidden = true;
    $("#iconInfoIdentifier").textContent = icon.name || "—";
    $("#iconInfoAliases").textContent = aliases.join(", ");
    $("#iconInfoAliasesRow").hidden = aliases.length === 0;
    $("#iconInfoSource").textContent = icon.source ? repositoryLabel(icon.source) + " (selected)" : icon.repositories.map(repositoryLabel).join(", ");
    $("#iconInfoCategories").textContent = (icon.categories || []).map(function (categoryId) { return iconCategoryById.get(categoryId)?.label || categoryId; }).join(", ") || "No groups";
    $("#iconInfoTags").textContent = (icon.tags || []).join(", ") || "No additional tags";
    $("#iconInfoPreview").innerHTML = iconSvgAtSelectedWeight(icon);
    $("#iconInfoSourceCount").textContent = sources.length + (sources.length === 1 ? " source" : " sources");
    $("#iconInfoSources").innerHTML = sources.length ? sources.map(function (source) {
      const file = String(source.file || "");
      const symbol = String(source.symbol || "");
      return '<li><div class="icon-source-heading"><strong>' + u.escapeHtml(repositoryLabel(source.repo)) + '</strong><span>' + u.escapeHtml(sourceFileName(file)) + '</span></div><dl><div><dt>File</dt><dd><code>' + u.escapeHtml(file || "Unknown file") + '</code></dd></div>' + (symbol ? '<div><dt>Source symbol</dt><dd><code>' + u.escapeHtml(symbol) + '</code></dd></div>' : "") + '</dl></li>';
    }).join("") : '<li class="icon-source-empty">No source metadata is available.</li>';
    const editButton = $("#iconInfoEditButton");
    editButton.dataset.iconEdit = icon.id;
    editButton.setAttribute("aria-label", "Edit metadata for " + icon.label);
    const copyButton = $("#iconInfoCopyButton");
    copyButton.dataset.iconInfoCopy = icon.id;
    delete copyButton.dataset.copied;
    copyButton.querySelector("[data-icon-copy-text]").textContent = "Copy SVG";
    return icon;
  }

  function openIconInfo(iconId, trigger) {
    if (!renderIconInfo(iconId)) return;
    iconInfoTrigger = trigger instanceof HTMLElement ? trigger : null;
    components.openDialog("#iconInfoDialog", { trigger: trigger, focus: "#iconInfoCopyButton" });
  }

  function iconEditChoice(category, selected) {
    const id = u.escapeHtml(category.id);
    return '<label class="icon-edit-group"><input type="checkbox" value="' + id + '" data-icon-edit-category' + (selected.has(category.id) ? " checked" : "") + '><span>' + u.escapeHtml(category.label) + '</span></label>';
  }

  function renderIconEditGroups(icon) {
    const selected = new Set(icon.categories || []);
    function categoryTree(category, alphabetize) {
      const children = iconCategoryChildren(category.id);
      if (alphabetize) children.sort(function (a, b) { return a.label.localeCompare(b.label, undefined, { numeric: true }); });
      return '<div class="icon-edit-group-cluster" data-icon-edit-group="' + u.escapeHtml(category.id) + '">' + iconEditChoice(category, selected) + (children.length ? '<div class="icon-edit-subgroups" role="group" aria-label="' + u.escapeHtml(category.label + " subgroups") + '">' + children.map(function (child) { return categoryTree(child, alphabetize); }).join("") + '</div>' : "") + '</div>';
    }
    const roots = iconCategories.filter(function (category) { return !category.parent; });
    $("#iconEditGroups").innerHTML = ICON_CATEGORY_SECTIONS.map(function (section) {
      const categories = categoryRootsForSection(roots, section.id);
      if (!categories.length) return "";
      return '<section class="icon-edit-category-section" aria-label="' + u.escapeHtml(section.label) + '"><h4 class="icon-edit-category-section-title">' + u.escapeHtml(section.label) + '</h4>' + categories.map(function (category) { return categoryTree(category, section.id === "appearance"); }).join("") + '</section>';
    }).join("");
    updateIconEditControls();
  }

  function updateIconEditControls() {
    const selectedCount = $$("[data-icon-edit-category]:checked", $("#iconEditGroups")).length;
    const overrideCount = (state().modules.iconLibrary.overrides || []).length;
    $("#iconEditGroupCount").textContent = selectedCount + (selectedCount === 1 ? " group selected" : " groups selected") + " · " + overrideCount + (overrideCount === 1 ? " icon changed locally" : " icons changed locally");
    const iconId = $("#iconEditForm").dataset.iconId || "";
    $("#iconEditResetButton").disabled = !iconOverrideFor(iconId);
    $("#iconEditExportButton").disabled = overrideCount === 0;
  }

  function populateIconEditor(iconId) {
    const icon = iconById.get(iconId);
    if (!icon) return false;
    $("#iconEditForm").dataset.iconId = icon.id;
    $("#iconEditDialogTitle").textContent = "Edit " + icon.label;
    $("#iconEditPreview").innerHTML = iconSvgAtSelectedWeight(icon);
    $("#iconEditType").value = icon.kind;
    $("#iconEditLabel").value = icon.label;
    const sourceSelect = $("#iconEditSource");
    sourceSelect.innerHTML = '<option value="">Compiled sources</option>' + (App.iconLibrary.sourceRepositories || []).map(function (source) { return '<option value="' + u.escapeHtml(source) + '">' + u.escapeHtml(repositoryLabel(source)) + '</option>'; }).join("");
    sourceSelect.value = icon.source || "";
    $("#iconEditLabel").removeAttribute("aria-invalid");
    $("#iconEditValidation").hidden = true;
    renderIconEditGroups(icon);
    return true;
  }

  function openIconEditor(iconId, trigger) {
    if (!populateIconEditor(iconId)) return;
    components.openDialog("#iconEditDialog", { trigger: trigger, focus: "#iconEditLabel" });
  }

  function exportIconUpdates() {
    const overrides = (state().modules.iconLibrary.overrides || []).map(function (override) {
      const exported = { iconId: override.iconId, label: override.label, categories: override.categories.slice() };
      if (override.kind) exported.kind = override.kind;
      if (override.source) exported.source = override.source;
      return exported;
    }).sort(function (a, b) { return a.iconId.localeCompare(b.iconId); });
    if (!overrides.length) {
      components.toast("Change an icon’s name, type, groups, or filter source before downloading an update file.", { title: "No icon updates", kind: "warning" });
      return;
    }
    const generatedAt = u.isoNow();
    const blob = new Blob([JSON.stringify(overrides, null, 2) + "\n"], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = "app-template-icon-overrides-" + generatedAt.slice(0, 10) + ".json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(function () { URL.revokeObjectURL(href); }, 0);
    components.toast(overrides.length + (overrides.length === 1 ? " icon override is" : " icon overrides are") + " ready to feed back into this repository.", { title: "Overrides downloaded", kind: "success" });
  }

  function sameIconCategories(a, b) {
    const normalized = function (values) { return Array.from(new Set(values || [])).sort().join("\u0000"); };
    return normalized(a) === normalized(b);
  }

  function persistIconMetadata(iconId, label, kind, categories, source, reason) {
    const baseIcon = sourceIconById.get(iconId);
    if (!baseIcon) return false;
    const cleanLabel = u.cleanIconLabel(label, 120);
    if (!cleanLabel) return false;
    const requested = new Set(Array.isArray(categories) ? categories : []);
    const normalizedCategories = iconCategories.map(function (category) { return category.id; }).filter(function (categoryId) { return requested.has(categoryId); });
    if (!normalizedCategories.length && iconCategoryById.has("interface")) normalizedCategories.push("interface");
    const kindId = ["sf-symbol", "custom"].includes(kind) ? kind : baseIcon.kind;
    const kindOverride = kindId !== baseIcon.kind ? kindId : "";
    const sourceId = (App.iconLibrary.sourceRepositories || []).includes(source) ? source : "";
    const changed = cleanLabel !== baseIcon.label || Boolean(kindOverride) || !sameIconCategories(normalizedCategories, baseIcon.categories || []) || sourceId !== (baseIcon.source || "");
    storage.mutate(function (next) {
      const overrides = (next.modules.iconLibrary.overrides || []).filter(function (override) { return override.iconId !== iconId; });
      if (changed) overrides.push({ iconId: iconId, label: cleanLabel, kind: kindOverride, categories: normalizedCategories, source: sourceId });
      overrides.sort(function (a, b) { return a.iconId.localeCompare(b.iconId); });
      next.modules.iconLibrary.overrides = overrides;
    }, { reason: reason || "icon-metadata" });
    refreshIconCatalog();
    renderIconLibrary();
    renderGlobalSearchResults();
    return changed;
  }

  function saveIconInfoQuickEdit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const iconId = form.dataset.iconId || "";
    const icon = iconById.get(iconId);
    if (!icon) return;
    const input = $("#iconInfoName");
    const label = u.cleanIconLabel(input.value, 120);
    const validation = $("#iconInfoValidation");
    if (!label) {
      input.setAttribute("aria-invalid", "true");
      validation.textContent = "Enter a display name before saving.";
      validation.hidden = false;
      input.focus();
      return;
    }
    input.removeAttribute("aria-invalid");
    validation.hidden = true;
    const changed = persistIconMetadata(iconId, label, $("#iconInfoType").value, icon.categories || [], icon.source || "", "icon-info-metadata");
    renderIconInfo(iconId);
    $("#iconInfoName").focus();
    $("#iconInfoName").select();
    components.toast(changed ? label + " name and type were saved." : "The compiled name and type are already in use.", {
      title: changed ? "Icon updated" : "Icon unchanged",
      kind: "success"
    });
  }

  function removeIconFromSelectedGroup(iconId) {
    const categoryId = selectedIconCategory();
    const icon = iconById.get(iconId);
    if (!icon) return;
    if (categoryId === "all") {
      components.toast("Select a category first, then right-click an icon to remove it from that group.", { title: "Choose a group", kind: "warning" });
      return;
    }
    const category = iconCategoryById.get(categoryId);
    if (!category || !(icon.categories || []).includes(categoryId)) return;
    const removedIds = new Set([categoryId]);
    iconCategoryDescendants(categoryId).forEach(function (child) { removedIds.add(child.id); });
    const previousCategories = (icon.categories || []).slice();
    const nextCategories = previousCategories.filter(function (candidate) { return !removedIds.has(candidate); });
    persistIconMetadata(icon.id, icon.label, icon.kind, nextCategories, icon.source || "", "remove-icon-group");
    components.toast(icon.label + " was removed from " + category.label + ".", {
      title: "Group updated",
      kind: "success",
      duration: 6500,
      actionLabel: "Undo",
      actionSymbol: "arrowClockwise",
      onAction: function () {
        persistIconMetadata(icon.id, icon.label, icon.kind, previousCategories, icon.source || "", "undo-remove-icon-group");
        components.toast(icon.label + " is back in " + category.label + ".", { title: "Removal undone", kind: "success" });
      }
    });
  }

  function saveIconEdit(event) {
    event.preventDefault();
    const iconId = $("#iconEditForm").dataset.iconId || "";
    const baseIcon = sourceIconById.get(iconId);
    if (!baseIcon) return;
    const input = $("#iconEditLabel");
    const label = u.cleanIconLabel(input.value, 120);
    const validation = $("#iconEditValidation");
    if (!label) {
      input.setAttribute("aria-invalid", "true");
      validation.textContent = "Enter a display name before saving.";
      validation.hidden = false;
      input.focus();
      return;
    }
    input.removeAttribute("aria-invalid");
    validation.hidden = true;
    const selected = new Set($$("[data-icon-edit-category]:checked", $("#iconEditGroups")).map(function (checkbox) { return checkbox.value; }).filter(function (categoryId) {
      return iconCategoryById.has(categoryId);
    }));
    Array.from(selected).forEach(function (categoryId) {
      let parent = iconCategoryById.get(categoryId)?.parent || "";
      while (parent) {
        selected.add(parent);
        parent = iconCategoryById.get(parent)?.parent || "";
      }
    });
    const categories = iconCategories.map(function (category) { return category.id; }).filter(function (categoryId) { return selected.has(categoryId); });
    const changed = persistIconMetadata(iconId, label, $("#iconEditType").value, categories, $("#iconEditSource").value, "icon-metadata");
    components.closeDialog("#iconEditDialog", "saved");
    const overrideCount = state().modules.iconLibrary.overrides.length;
    components.toast(changed ? label + " metadata was saved." : "The compiled icon metadata is already in use.", {
      title: changed ? "Icon updated" : "Icon unchanged",
      kind: "success",
      actionLabel: overrideCount ? "Export overrides" : "",
      actionSymbol: overrideCount ? "down" : "",
      onAction: overrideCount ? exportIconUpdates : null
    });
  }

  async function resetIconEdit() {
    const iconId = $("#iconEditForm").dataset.iconId || "";
    if (!iconOverrideFor(iconId)) return;
    const baseIcon = sourceIconById.get(iconId);
    const confirmed = await components.confirm({
      title: "Reset icon metadata?",
      message: "Restore the compiled name, type, groups, and filter source for " + (baseIcon ? baseIcon.label : "this icon") + "? Other icon changes will stay saved.",
      confirmLabel: "Reset icon",
      danger: true
    });
    if (!confirmed) {
      $("#iconEditResetButton").focus();
      return;
    }
    storage.mutate(function (next) {
      next.modules.iconLibrary.overrides = (next.modules.iconLibrary.overrides || []).filter(function (override) { return override.iconId !== iconId; });
    }, { reason: "reset-icon-metadata" });
    refreshIconCatalog();
    renderIconLibrary();
    renderGlobalSearchResults();
    populateIconEditor(iconId);
    $("#iconEditLabel").focus();
    components.toast("The compiled icon metadata was restored.", { title: "Icon reset", kind: "success" });
  }

  function focusFirstIcon() {
    const first = $(".icon-card", $("#iconLibraryGrid"));
    if (!first) return;
    first.scrollIntoView({ block: "center", behavior: document.documentElement.dataset.motion === "reduce" ? "auto" : "smooth" });
    first.focus({ preventScroll: true });
  }

  function submitIconSearch() {
    $("#globalSearchResults").hidden = true;
    iconVisibleCount = ICON_PAGE_SIZE;
    renderIconLibrary();
    requestAnimationFrame(function () {
      const first = $(".icon-card", $("#iconLibraryGrid"));
      const target = first || $("#iconLibraryEmpty");
      target?.scrollIntoView({ block: "center", behavior: document.documentElement.dataset.motion === "reduce" ? "auto" : "smooth" });
      if (first) first.focus({ preventScroll: true });
      else if (target) { target.tabIndex = -1; target.focus({ preventScroll: true }); }
    });
  }

  function moveIconGridFocus(event) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    const item = event.target.closest(".icon-card-item");
    if (!item) return;
    const cards = $$(".icon-card", event.currentTarget);
    const current = item.querySelector(".icon-card");
    const index = cards.indexOf(current);
    if (index < 0 || !cards.length) return;
    const columns = Math.max(1, getComputedStyle(event.currentTarget).gridTemplateColumns.split(" ").filter(Boolean).length);
    let next = index;
    if (event.key === "ArrowLeft") next -= 1;
    else if (event.key === "ArrowRight") next += 1;
    else if (event.key === "ArrowUp") next -= columns;
    else if (event.key === "ArrowDown") next += columns;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = cards.length - 1;
    next = Math.max(0, Math.min(cards.length - 1, next));
    event.preventDefault();
    cards[next].focus();
  }

  function normalizeIconFilterWidth(value) {
    return Math.round(u.clamp(value, ICON_FILTER_MIN_WIDTH, ICON_FILTER_MAX_WIDTH, 204));
  }

  function applyIconFilterWidth(value) {
    const layout = $("#iconLibraryLayout");
    const divider = $("#iconFilterDivider");
    if (!layout || !divider) return;
    const width = normalizeIconFilterWidth(value);
    layout.style.setProperty("--icon-filter-width", width + "px");
    divider.setAttribute("aria-valuenow", String(width));
    divider.setAttribute("aria-valuetext", width + " pixels");
    const availableWidth = Math.max(1, layout.getBoundingClientRect().width);
    $("#iconFilterDividerValue").textContent = Math.round(width / availableWidth * 100) + "%";
  }

  function persistIconFilterWidth(value) {
    const width = normalizeIconFilterWidth(value);
    applyIconFilterWidth(width);
    if (width === state().modules.iconLibrary.sidebarWidth) return;
    storage.mutate(function (next) { next.modules.iconLibrary.sidebarWidth = width; }, { reason: "icon-filter-width" });
  }

  function bindIconFilterDivider() {
    const divider = $("#iconFilterDivider");
    if (!divider) return;
    let drag = null;

    divider.addEventListener("pointerdown", function (event) {
      if (event.button !== 0 || window.matchMedia("(max-width: 699px)").matches) return;
      const startWidth = normalizeIconFilterWidth(state().modules.iconLibrary.sidebarWidth);
      drag = { pointerId: event.pointerId, startX: event.clientX, width: startWidth };
      event.preventDefault();
      divider.setPointerCapture?.(event.pointerId);
      document.documentElement.classList.add("resizing-icon-filters");
    });
    divider.addEventListener("pointermove", function (event) {
      if (!drag || event.pointerId !== drag.pointerId) return;
      drag.width = normalizeIconFilterWidth(drag.width + event.clientX - drag.startX);
      drag.startX = event.clientX;
      applyIconFilterWidth(drag.width);
    });
    function finishResize(event) {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const width = drag.width;
      drag = null;
      document.documentElement.classList.remove("resizing-icon-filters");
      if (divider.hasPointerCapture?.(event.pointerId)) divider.releasePointerCapture(event.pointerId);
      persistIconFilterWidth(width);
    }
    divider.addEventListener("pointerup", finishResize);
    divider.addEventListener("pointercancel", finishResize);
    divider.addEventListener("keydown", function (event) {
      let width = normalizeIconFilterWidth(state().modules.iconLibrary.sidebarWidth);
      if (event.key === "ArrowLeft") width -= 12;
      else if (event.key === "ArrowRight") width += 12;
      else if (event.key === "Home") width = ICON_FILTER_MIN_WIDTH;
      else if (event.key === "End") width = ICON_FILTER_MAX_WIDTH;
      else return;
      event.preventDefault();
      persistIconFilterWidth(width);
    });
  }

  function renderIconLibrary() {
    const grid = $("#iconLibraryGrid");
    if (!grid) return;
    applyIconFilterWidth(state().modules.iconLibrary.sidebarWidth);
    renderIconWeightControl();
    const sources = App.iconLibrary && App.iconLibrary.sourceRepositories || [];
    const sourceSelect = $("#iconSourceFilter");
    if (sourceSelect.options.length !== sources.length + 1) {
      sourceSelect.innerHTML = '<option value="all">All sources</option>' + sources.map(function (source) { return '<option value="' + u.escapeHtml(source) + '">' + u.escapeHtml(repositoryLabel(source)) + '</option>'; }).join("");
    }
    const selectedSource = sources.includes(state().modules.iconLibrary.source) ? state().modules.iconLibrary.source : "all";
    setInputValue(sourceSelect, selectedSource);
    setInputValue($("#iconKindFilter"), state().modules.iconLibrary.kind);
    const baseMatches = filteredIcons({ ignoreCategory: true });
    renderIconCategories(baseMatches);
    const matches = filteredIcons();
    const shown = matches.slice(0, iconVisibleCount);
    grid.innerHTML = shown.map(iconCard).join("");
    icons.mount(grid);
    grid.hidden = shown.length === 0;
    $("#iconLibraryEmpty").hidden = shown.length !== 0;
    $("#iconLoadMore").hidden = shown.length >= matches.length;
    const libraryState = state().modules.iconLibrary;
    const hasActiveFilters = Boolean(state().ui.search) || state().ui.searchNameOnly
      || selectedIconCategory() !== "all"
      || libraryState.kind !== "all"
      || libraryState.source !== "all"
      || state().preferences.controls.developerMode && libraryState.minimumLabelLength > 0;
    $("#iconClearSearch").hidden = !hasActiveFilters;
    $("#iconLibraryCount").textContent = matches.length === iconCatalog.length ? iconCatalog.length + " icons" : matches.length + " of " + iconCatalog.length;
    const category = iconCategoryById.get(selectedIconCategory());
    const scope = category ? " in " + category.label : "";
    const minimumLabelLength = state().preferences.controls.developerMode ? Math.round(u.clamp(state().modules.iconLibrary.minimumLabelLength, 0, 120, 0)) : 0;
    const lengthScope = minimumLabelLength ? " with labels of " + minimumLabelLength + "+ characters" : "";
    $("#iconLibraryStatus").textContent = matches.length ? "Showing " + shown.length + " of " + matches.length + (state().ui.search ? " matching icons" : " icons") + scope + lengthScope + "." : "No icons match the current search, category, and filters" + lengthScope + ".";
  }

  function writeClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      const field = document.createElement("textarea");
      field.value = text;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      try {
        if (!document.execCommand("copy")) throw new Error("Copy was rejected.");
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        field.remove();
      }
    });
  }

  async function copyIcon(iconId, button) {
    const icon = iconById.get(iconId);
    if (!icon || button.disabled) return;
    button.disabled = true;
    try {
      await writeClipboard(iconSvgAtSelectedWeight(icon));
      $$('[data-copied="true"]').forEach(function (element) {
        delete element.dataset.copied;
        const copyText = element.querySelector("[data-icon-copy-text]");
        if (copyText) copyText.textContent = "Copy SVG";
      });
      button.dataset.copied = "true";
      const cardItem = button.closest(".icon-card-item");
      if (cardItem) cardItem.dataset.copied = "true";
      button.querySelector("[data-icon-copy-text]").textContent = "Copied";
      components.toast(icon.label + " is ready to paste into another app.", { title: "SVG copied", kind: "success", duration: 2200 });
      window.clearTimeout(copiedIconTimer);
      copiedIconTimer = window.setTimeout(function () {
        if (!button.isConnected) return;
        delete button.dataset.copied;
        if (cardItem) delete cardItem.dataset.copied;
        button.querySelector("[data-icon-copy-text]").textContent = "Copy SVG";
      }, 1800);
    } catch (error) {
      components.toast("The browser did not allow clipboard access. Try again from HTTPS or localhost.", { title: "Could not copy SVG", kind: "danger", duration: 5000 });
    } finally {
      button.disabled = false;
    }
  }

  function globalSearchMatches(query) {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    const results = [];
    iconCatalog.forEach(function (icon) {
      if (results.length < 8 && iconMatches(icon, needle)) results.push({ type: "icon", id: icon.id, title: icon.label, meta: iconKindLabel(icon.kind) + " · " + icon.repositories.map(repositoryLabel).join(" + ") });
    });
    if (state().ui.searchNameOnly) return results;
    const notes = state().workspace.documents[0];
    if (config.features.documents && notes && (`notes ${documentText(notes)}`).toLowerCase().includes(needle)) results.push({ type: "notes", id: notes.id, title: "Notes", meta: "Local notes" });
    config.help.forEach(function (topic) {
      if ((topic.title + " " + topic.keywords + " " + u.stripHtml(topic.html)).toLowerCase().includes(needle)) results.push({ type: "help", id: topic.id, title: topic.title, meta: "Help · " + topic.section });
    });
    if (config.features.roadmap) config.roadmap.forEach(function (item) {
      if ((item.title + " " + item.description).toLowerCase().includes(needle)) results.push({ type: "roadmap", id: item.id, title: item.title, meta: "Roadmap · " + item.state });
    });
    config.releases.forEach(function (release) {
      const releaseText = [release.version, release.title, release.summary].concat(release.features || [], release.improvements || [], release.fixes || [], release.knownIssues || []).join(" ");
      if (releaseText.toLowerCase().includes(needle)) results.push({ type: "release", id: release.version, title: release.title, meta: "Release · v" + release.version });
    });
    return results.slice(0, 12);
  }

  function renderSearchMode() {
    const enabled = state().ui.searchNameOnly;
    $("#searchNameOnly").hidden = !enabled;
    $("#globalSearch").closest(".global-search-wrap").classList.toggle("name-only", enabled);
    $("#globalSearch").setAttribute("aria-label", enabled ? "Search icon names only" : "Search icons and application support");
    $("#globalSearch").placeholder = enabled ? "Search icon names only" : "Search icons";
  }

  function setSearchNameOnly(enabled) {
    storage.mutate(function (next) { next.ui.searchNameOnly = enabled; }, { reason: "search-mode" });
    iconVisibleCount = ICON_PAGE_SIZE;
    renderIconLibrary();
    renderGlobalSearchResults();
  }

  function focusGlobalSearch() {
    setSearchNameOnly(false);
    $("#globalSearch").focus();
    $("#globalSearch").select();
  }

  function renderGlobalSearchResults() {
    renderSearchMode();
    const container = $("#globalSearchResults");
    const query = state().ui.search;
    if (!query || document.activeElement !== $("#globalSearch")) { container.hidden = true; return; }
    const results = globalSearchMatches(query);
    container.hidden = false;
    container.innerHTML = results.length ? results.map(function (result, index) {
      return '<button type="button" role="option" id="global-result-' + index + '" data-search-type="' + result.type + '" data-search-id="' + u.escapeHtml(result.id) + '"><span><strong>' + highlightedSearchText(result.title, query) + '</strong><small>' + highlightedSearchText(result.meta, query) + "</small></span><span aria-hidden=\"true\">→</span></button>";
    }).join("") : '<div class="search-empty">No matching icons or support content.</div>';
  }

  function activateGlobalSearchResult(type, id) {
    if (type === "icon") {
      if (state().modules.iconLibrary.source !== "all" || state().modules.iconLibrary.kind !== "all" || state().modules.iconLibrary.category !== "all") storage.mutate(function (next) { next.modules.iconLibrary.source = "all"; next.modules.iconLibrary.kind = "all"; next.modules.iconLibrary.category = "all"; }, { reason: "icon-filters" });
      iconVisibleCount = ICON_PAGE_SIZE;
      renderIconLibrary();
      requestAnimationFrame(function () {
        const card = document.getElementById("icon-card-" + id);
        card?.scrollIntoView({ block: "center", behavior: document.documentElement.dataset.motion === "reduce" ? "auto" : "smooth" });
        card?.focus({ preventScroll: true });
      });
    }
    else if (type === "notes") openNotes($("#globalSearch"));
    else if (type === "help") { openSupport("help"); setInputValue($("#helpSearch"), config.help.find(function (topic) { return topic.id === id; })?.title || ""); renderHelp(); }
    else if (type === "roadmap") {
      storage.mutate(function (next) { next.modules.roadmap.search = config.roadmap.find(function (item) { return item.id === id; })?.title || ""; }, { reason: "roadmap-search" });
      openSupport("roadmap", $("#globalSearch"));
    }
    else if (type === "release") openSupport("releases");
    $("#globalSearchResults").hidden = true;
  }

  function switchModule(moduleId) {
    if (!activeModuleEnabled(moduleId)) return;
    if (moduleId === "roadmap") openSupport("roadmap");
  }

  function openSupport(tab, trigger) {
    const chosen = tab || state().ui.supportTab || "settings";
    switchSupportTab(chosen);
    components.openDialog("#supportDialog", { trigger: trigger, focus: "[data-support-tab='" + chosen + "']" });
    renderSupport();
  }

  function switchSupportTab(tab) {
    if (tab === "developer" && !state().preferences.controls.developerMode) tab = "settings";
    storage.mutate(function (next) { next.ui.supportTab = tab; }, { touch: false, reason: "support-tab" });
    $$('[data-support-tab]').forEach(function (button) {
      const selected = button.dataset.supportTab === tab;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    $$('[data-support-panel]').forEach(function (panel) { panel.hidden = panel.dataset.supportPanel !== tab; });
    if (tab === "dataSync") renderSyncSettings();
    else if (tab === "help") renderHelp();
    else if (tab === "releases") renderReleases();
    else if (tab === "shortcuts") renderShortcuts();
    else if (tab === "roadmap") renderSupportRoadmap();
    else if (tab === "developer") renderDeveloper();
    else renderSettings();
    $(".support-panels")?.scrollTo({ top: 0, behavior: "auto" });
    $("#supportDialog")?.scrollTo({ top: 0, behavior: "auto" });
    $("#supportDialog .dialog-shell")?.scrollTo({ top: 0, behavior: "auto" });
  }

  function renderTextSizeControl() {
    const input = $("#textSizeSlider");
    const output = $("#textSizeValue");
    const wrap = $(".text-size-slider-wrap");
    if (!input || !output || !wrap) return;
    const percent = Math.round(state().preferences.appearance.textScale * 100);
    const minimum = Number(input.min) || 85;
    const maximum = Number(input.max) || 130;
    const ratio = Math.max(0, Math.min(1, (percent - minimum) / (maximum - minimum)));
    setInputValue(input, percent);
    input.style.setProperty("--range-pct", (ratio * 100) + "%");
    wrap.style.setProperty("--thumb-ratio", String(ratio));
    output.textContent = percent + "%";
  }

  function renderSettings() {
    const preferences = state().preferences;
    const appearance = preferences.appearance;
    $$('[data-theme-mode]').forEach(function (button) { button.setAttribute("aria-pressed", String(button.dataset.themeMode === appearance.mode)); });
    renderTextSizeControl();
    $$('[data-button-style]').forEach(function (button) { button.setAttribute("aria-pressed", String(button.dataset.buttonStyle === preferences.controls.buttonStyle)); });
    $$('[data-hints-enabled]').forEach(function (button) { button.setAttribute("aria-pressed", String((button.dataset.hintsEnabled === "true") === preferences.hints.enabled)); });
  }

  function renderSyncPayload() {
    const output = $("#syncPayloadJson");
    const json = JSON.stringify(model.syncPayload(state()), null, 2);
    if (output.textContent !== json) output.textContent = json;
  }

  function renderSyncSettings() {
    renderSyncPayload();
    const localAvailable = storage.isPersistent();
    $("#localStorageSettingsState").textContent = localAvailable ? "Saved locally" : "Unavailable";
    $("#localStorageSettingsState").dataset.kind = localAvailable ? "success" : "danger";
    $("#localStorageSettingsSummary").innerHTML = '<span aria-hidden="true">' + icons.markup(localAvailable ? "check" : "close") + '</span><span><strong>' + (localAvailable ? "Browser storage is working" : "Browser storage is unavailable") + '</strong><small>' + (localAvailable ? "Notes, preferences, and sync metadata save automatically on this device." : "Changes may not survive a reload. Export a backup before continuing.") + "</small></span>";
    if (!config.features.cloudSync) { $("#cloudSyncSettings").hidden = true; return; }
    const cloud = state().modules.cloudSync;
    const info = sync.getInfo();
    $("#cloudSyncSettings").hidden = false;
    const settingsStatus = $("#syncSettingsState");
    renderCloudSyncVisual(settingsStatus, info);
    settingsStatus.querySelector("[data-sync-label]").textContent = info.title;
    settingsStatus.title = info.help;
    [["#syncNowButton", "syncNow", info.canSync], ["#restoreCloudButton", "restore", info.canRestore]].forEach(function (entry) {
      const button = $(entry[0]);
      const action = sync.actions[entry[1]];
      icons.set(button.querySelector("[data-sync-action-icon]"), action.symbol);
      button.querySelector("[data-sync-action-label]").textContent = action.title;
      button.setAttribute("aria-label", action.title);
      button.title = action.help + (entry[2] ? "" : " " + info.help);
      button.disabled = !entry[2];
    });
    const appRepositoryUrl = u.safeUrl(config.identity.repository.url);
    const appRepositoryLink = $("#appRepositoryLink");
    appRepositoryLink.textContent = appRepositoryUrl ? config.identity.repository.label : "App repository not configured";
    appRepositoryLink.hidden = !appRepositoryUrl;
    if (appRepositoryUrl) {
      appRepositoryLink.href = appRepositoryUrl;
      appRepositoryLink.setAttribute("aria-label", config.identity.repository.label + " (opens in a new tab)");
    } else {
      appRepositoryLink.removeAttribute("href");
      appRepositoryLink.removeAttribute("aria-label");
    }
    $("#syncOwner").textContent = cloud.owner || "Not set";
    $("#syncBranch").textContent = cloud.branch || "Not set";
    const repositoryUrl = cloud.owner && cloud.repo ? u.safeUrl("https://github.com/" + encodeURIComponent(cloud.owner) + "/" + encodeURIComponent(cloud.repo)) : "";
    const dataFileUrl = repositoryUrl && cloud.branch && cloud.path ? u.safeUrl(repositoryUrl + "/blob/" + encodeURIComponent(cloud.branch) + "/" + cloud.path.split("/").map(encodeURIComponent).join("/")) : "";
    [["#syncRepo", cloud.repo, repositoryUrl, "Open GitHub repository"], ["#syncPath", cloud.path, dataFileUrl, "Open GitHub data file"]].forEach(function (entry) {
      const link = $(entry[0]);
      link.textContent = entry[1] || "Not set";
      if (entry[2]) {
        link.href = entry[2];
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.setAttribute("aria-label", entry[3] + " (opens in a new tab)");
      } else {
        link.removeAttribute("href");
        link.removeAttribute("target");
        link.removeAttribute("rel");
        link.removeAttribute("aria-label");
      }
    });
    const tokenInput = $("#syncToken");
    const rememberInput = $("#syncRememberToken");
    const hasStoredToken = storage.hasSecret();
    if (tokenInput.dataset.dirty !== "true") tokenInput.value = hasStoredToken ? storage.getSecret() : "";
    if (rememberInput.dataset.dirty !== "true") rememberInput.checked = cloud.rememberToken;
    $("#storedTokenLabel").textContent = hasStoredToken ? (cloud.rememberToken ? "Stored on this device" : "Stored for this tab") : "Required";
    tokenInput.placeholder = hasStoredToken ? "Token stored" : "Enter token";
    $("#forgetSyncButton").disabled = !hasStoredToken && !cloud.baselineHash;
    $("#saveSyncButton").disabled = info.busy;
    $("#testSyncButton").disabled = info.busy;
  }

  function markSyncCredentialFieldsClean() {
    delete $("#syncToken").dataset.dirty;
    delete $("#syncRememberToken").dataset.dirty;
  }

  function renderHelp() {
    const query = String($("#helpSearch")?.value || "").trim().toLowerCase();
    const topics = config.help.filter(function (topic) {
      return !query || (topic.title + " " + topic.section + " " + topic.keywords + " " + u.stripHtml(topic.html)).toLowerCase().includes(query);
    });
    $("#helpResultCount").textContent = topics.length + " topic" + (topics.length === 1 ? "" : "s");
    const groups = {};
    topics.forEach(function (topic) { (groups[topic.section] = groups[topic.section] || []).push(topic); });
    $("#helpContent").innerHTML = topics.length ? Object.keys(groups).map(function (section) {
      return '<section class="help-section"><h3>' + u.escapeHtml(section) + '</h3>' + groups[section].map(function (topic) { return '<article id="help-' + topic.id + '"><h4>' + u.escapeHtml(topic.title) + "</h4>" + topic.html + "</article>"; }).join("") + "</section>";
    }).join("") + renderSupportLinks() : emptyState("No help matches", "Try a shorter or broader search.", "Clear help search", "clear-help-search");
  }

  function renderSupportLinks() {
    const links = [config.identity.repository].concat(config.identity.support || []).filter(function (item) { return u.safeUrl(item.url); });
    if (!links.length) return "";
    return '<section class="help-section"><h3>Support links</h3><div class="support-links">' + links.map(function (item) { return '<button type="button" class="safe-link-button" data-open-url="' + u.escapeHtml(u.safeUrl(item.url)) + '">' + u.escapeHtml(item.label) + ' <span aria-hidden="true">↗</span></button>'; }).join("") + "</div></section>";
  }

  function releaseCard(release, index) {
    const section = function (title, values) {
      return values && values.length ? '<div class="release-section"><h5>' + title + "</h5><ul>" + values.map(function (value) { return "<li>" + u.escapeHtml(value) + "</li>"; }).join("") + "</ul></div>" : "";
    };
    return '<details class="release-card"' + (index === 0 ? " open" : "") + '><summary><div class="release-version-line"><span class="version-pill">v' + u.escapeHtml(release.version) + '</span><time datetime="' + u.escapeHtml(release.date) + '">' + u.dateLabel(release.date) + '</time></div><h4>' + u.escapeHtml(release.title) + '</h4></summary><div class="release-card-content"><p>' + u.escapeHtml(release.summary) + '</p><div class="release-sections">' + section("Features", release.features) + section("Improvements", release.improvements) + section("Fixes", release.fixes) + section("Known issues", release.knownIssues) + "</div></div></details>";
  }

  function renderReleases() {
    $("#releaseContent").innerHTML = config.releases.map(releaseCard).join("");
  }

  function renderShortcuts() {
    const groups = {};
    SHORTCUTS.forEach(function (shortcut) { (groups[shortcut.group] = groups[shortcut.group] || []).push(shortcut); });
    $("#shortcutContent").innerHTML = '<p class="section-intro">Use a listed key directly or with Shift–Control–Option. Hold the full chord to reveal badges on currently available controls; hover those controls to see the command. Command-key combinations remain available to the browser.</p>' + Object.keys(groups).map(function (group) {
      return '<section><h3>' + group + "</h3>" + groups[group].map(function (shortcut) {
        const chord = shortcut.chord === false ? "" : '<span class="shortcut-alternative">or</span><kbd>⇧⌃⌥ ' + u.escapeHtml(shortcut.chordKey) + "</kbd>";
        return '<div class="shortcut-row"><span class="shortcut-key-pair"><kbd>' + u.escapeHtml(shortcut.keys) + "</kbd>" + chord + '</span><span>' + u.escapeHtml(shortcut.label) + "</span></div>";
      }).join("") + "</section>";
    }).join("");
  }

  function renderSupportRoadmap() {
    const moduleState = state().modules.roadmap;
    setInputValue($("#supportRoadmapSearch"), moduleState.search);
    $("#supportRoadmapState").value = moduleState.state;
    $("#supportRoadmapPriority").value = moduleState.priority;
    const targetSelect = $("#supportRoadmapTarget");
    const targetOptions = Array.from(new Set(config.roadmap.map(function (item) { return item.target; }))).sort(function (a, b) { return String(a).localeCompare(String(b), undefined, { numeric: true }); });
    targetSelect.innerHTML = '<option value="all">All targets</option>' + targetOptions.map(function (target) { return '<option value="' + u.escapeHtml(target) + '">' + u.escapeHtml(target) + "</option>"; }).join("");
    targetSelect.value = moduleState.target;
    $("#supportRoadmapEffort").value = moduleState.effort;
    $("#supportRoadmapSort").value = moduleState.sortBy;
    const items = filteredRoadmap();
    $("#supportRoadmapCount").textContent = items.length + " " + (items.length === 1 ? "item" : "items");
    $("#supportRoadmapList").innerHTML = items.length ? items.map(roadmapCard).join("") : emptyState("No roadmap matches", "Try another search or view.");
  }

  async function renderDeveloper() {
    if (!state().preferences.controls.developerMode) return;
    const usage = await storage.usage();
    const info = sync.getInfo();
    const device = pwa.detectDevice();
    const breakpoint = window.innerWidth < 700 ? "Mobile" : window.innerWidth < 960 ? "Tablet" : "Desktop";
    const recovery = storage.recoveryInfo();
    const diagnostics = [
      ["State model", "v" + state().schemaVersion],
      ["Application", "v" + config.identity.version + " · build " + config.identity.buildId],
      ["Device", device.label],
      ["Layout", breakpoint + " · " + window.innerWidth + "×" + window.innerHeight],
      ["State size", u.formatBytes(usage.stateBytes)],
      ["Browser storage", usage.quota ? u.formatBytes(usage.usage) + " of " + u.formatBytes(usage.quota) : (usage.persistentStorageAvailable ? "Available" : "Unavailable")],
      ["Modules", Object.keys(config.features).filter(function (key) { return config.features[key]; }).join(", ")],
      ["Theme", document.documentElement.dataset.theme],
      ["Sync", info.title + (info.checkedAt ? " · checked " + u.relativeTime(info.checkedAt) : "")],
      ["Recovery", recovery ? u.dateLabel(recovery.createdAt) + " · " + recovery.reason : "None"]
    ];
    diagnostics.splice(2, 0, ["Notes", documentText(state().workspace.documents[0]).length + " characters"]);
    $("#developerDiagnostics").innerHTML = diagnostics.map(function (row) { return '<div><dt>' + u.escapeHtml(row[0]) + '</dt><dd>' + u.escapeHtml(row[1]) + "</dd></div>"; }).join("");
    const minimumLabelLength = Math.round(u.clamp(state().modules.iconLibrary.minimumLabelLength, 0, 120, 0));
    setInputValue($("#developerLabelLengthFilter"), minimumLabelLength || "");
    const matchingLongLabels = minimumLabelLength ? iconCatalog.filter(function (icon) { return icon.label.length >= minimumLabelLength; }).length : iconCatalog.length;
    $("#developerLabelLengthStatus").textContent = minimumLabelLength ? matchingLongLabels + " icons have labels of " + minimumLabelLength + " or more characters." : "Label-length filtering is off.";
    $("#clearDeveloperLabelLengthFilter").disabled = minimumLabelLength === 0;
    $("#developerExportIconOverrides").disabled = !(state().modules.iconLibrary.overrides || []).length;
    $("#developerState").textContent = JSON.stringify(model.exportEnvelope(state()), null, 2);
    $("#restoreRecoveryButton").disabled = !recovery;
  }

  function renderSupport() {
    $("#developerTab").hidden = !state().preferences.controls.developerMode || !config.features.developerTools;
    switchSupportTab(state().ui.supportTab);
  }

  function clearRoadmapFilters() {
    storage.mutate(function (next) { next.modules.roadmap.search = ""; next.modules.roadmap.state = "all"; next.modules.roadmap.priority = "all"; next.modules.roadmap.target = "all"; next.modules.roadmap.effort = "all"; next.modules.roadmap.sortBy = "priority"; }, { reason: "clear-roadmap-filters" });
    renderSupportRoadmap();
  }

  async function resetPreferences() {
    const accepted = await components.confirm({ title: "Reset preferences?", message: "Appearance, filters, panel layout, view state, and dismissed hints will return to defaults. Notes will be preserved.", confirmLabel: "Reset preferences", danger: true });
    if (!accepted) return;
    storage.replace(model.resetPreferences(state()), { recoveryReason: "Before resetting preferences", reason: "reset-preferences", touch: false });
    renderAll();
    components.toast("Preferences were reset; notes were preserved.", { title: "Preferences reset", kind: "success" });
  }

  async function eraseAllData() {
    const accepted = await components.confirm({ title: "Erase all application data?", message: "This permanently removes notes, preferences, sync settings, the stored token, and recovery data from this browser. Export a backup first if anything should be kept.", confirmLabel: "Erase everything", cancelLabel: "Keep my data", danger: true });
    if (!accepted) return;
    storage.clearAll();
    renderAll();
    components.closeDialog("#supportDialog", "erased");
    $("#assertiveStatus").textContent = "All application data was erased.";
    components.toast("All application data was erased from this browser.", { title: "Data erased", kind: "info", duration: 5000 });
  }

  async function forgetSync() {
    const accepted = await components.confirm({ title: "Forget GitHub token on this device?", message: "The stored token and sync history will be removed. The app’s fixed repository target and local notes will stay here.", confirmLabel: "Forget token", danger: true });
    if (!accepted) return;
    await sync.forget();
    markSyncCredentialFieldsClean();
    renderSyncSettings(); renderSyncStatus();
    components.toast("The GitHub token and sync history were removed from this device.", { title: "Sync disconnected", kind: "success" });
  }

  function syncFormValues() {
    const cloud = state().modules.cloudSync;
    return {
      owner: cloud.owner,
      repo: cloud.repo,
      branch: cloud.branch,
      path: cloud.path,
      token: $("#syncToken").value,
      rememberToken: $("#syncRememberToken").checked
    };
  }

  async function saveSyncSettings() {
    try {
      sync.saveConfiguration(syncFormValues());
      markSyncCredentialFieldsClean();
      renderSyncSettings(); renderSyncStatus();
      components.toast("The GitHub connection settings were saved.", { title: "Sync configured", kind: "success" });
      sync.check(true);
    } catch (error) {
      components.message("Settings not saved", error.message || "Check the GitHub settings and try again.", { trigger: $("#saveSyncButton") });
    }
  }

  async function testSyncSettings() {
    try {
      components.setLoading(true, "Testing GitHub…");
      const result = await sync.testConnection(syncFormValues());
      if (result) {
        markSyncCredentialFieldsClean();
        components.message("Connection succeeded", result.message, { trigger: $("#testSyncButton") });
      }
    } catch (error) {
      components.message("Connection failed", error.message || "GitHub could not be reached with these settings.", { trigger: $("#testSyncButton") });
    } finally {
      components.setLoading(false);
      renderSyncSettings(); renderSyncStatus();
    }
  }

  async function restoreRecovery() {
    const info = storage.recoveryInfo();
    if (!info) return;
    const accepted = await components.confirm({ title: "Restore recovery copy?", message: "Restore the copy saved " + u.relativeTime(info.createdAt) + " (“" + info.reason + "”). Current data will be replaced.", confirmLabel: "Restore recovery", danger: true });
    if (!accepted) return;
    storage.restoreRecovery(); renderAll();
    components.toast("The recovery copy was restored.", { title: "Recovery complete", kind: "success" });
  }

  function saveRecoveryCopy() {
    const saved = storage.saveRecovery("Manual recovery copy", state());
    if (saved) {
      renderDeveloper();
      components.toast("A recoverable local copy was saved.", { title: "Recovery copy saved", kind: "success" });
    }
  }

  function toggleDeveloperMode(force, options) {
    if (!config.features.developerTools) return;
    storage.mutate(function (next) { next.preferences.controls.developerMode = typeof force === "boolean" ? force : !next.preferences.controls.developerMode; }, { reason: "developer-mode" });
    $("#developerTab").hidden = !state().preferences.controls.developerMode;
    renderHeader();
    iconVisibleCount = ICON_PAGE_SIZE;
    renderIconLibrary();
    if (state().preferences.controls.developerMode) {
      components.toast("Developer Mode is available in Settings & Help.", { title: "Developer Mode on", kind: "info" });
      if (options && options.openPanel) openSupport("developer");
    } else {
      if (state().ui.supportTab === "developer") switchSupportTab("settings");
      components.toast("Developer tools are hidden.", { title: "Developer Mode off", kind: "info" });
    }
  }

  function toggleThemeFromAppIcon() {
    const nextMode = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    storage.mutate(function (next) { next.preferences.appearance.mode = nextMode; }, { reason: "appearance" });
    applyAppearance();
    if ($("#supportDialog").open && state().ui.supportTab === "settings") renderSettings();
    components.toast(nextMode === "dark" ? "Dark theme is active." : "Light theme is active.", { title: "Theme changed", kind: "info", duration: 2200 });
  }

  function bindAppIconGestures() {
    const button = $("#appIconButton");
    let startX = 0;
    let startY = 0;

    function cancelHold() {
      window.clearTimeout(appIconHoldTimer);
      appIconHoldTimer = 0;
      delete button.dataset.holdActive;
    }

    button.addEventListener("pointerdown", function (event) {
      if (event.button !== 0) return;
      cancelHold();
      appIconHoldHandled = false;
      startX = event.clientX;
      startY = event.clientY;
      button.dataset.holdActive = "true";
      appIconHoldTimer = window.setTimeout(function () {
        appIconHoldTimer = 0;
        appIconHoldHandled = true;
        delete button.dataset.holdActive;
        toggleDeveloperMode();
        window.setTimeout(function () { appIconHoldHandled = false; }, 900);
      }, 620);
    });
    button.addEventListener("pointermove", function (event) {
      if (Math.abs(event.clientX - startX) > 10 || Math.abs(event.clientY - startY) > 10) cancelHold();
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (name) { button.addEventListener(name, cancelHold); });
    button.addEventListener("click", function (event) {
      if (appIconHoldHandled) {
        event.preventDefault();
        appIconHoldHandled = false;
        return;
      }
      toggleThemeFromAppIcon();
    });
  }

  function handleAction(action, trigger) {
    if (action === "clear-roadmap-filters") clearRoadmapFilters();
    else if (action === "clear-help-search") { $("#helpSearch").value = ""; renderHelp(); }
  }

  function bindSupportEvents() {
    const dialog = $("#supportDialog");
    dialog.addEventListener("click", function (event) {
      const tab = event.target.closest("[data-support-tab]");
      if (tab) { switchSupportTab(tab.dataset.supportTab); return; }
      const mode = event.target.closest("[data-theme-mode]");
      if (mode) {
        storage.mutate(function (next) { next.preferences.appearance.mode = mode.dataset.themeMode; }, { reason: "appearance" }); applyAppearance(); renderSettings(); return;
      }
      const style = event.target.closest("[data-button-style]");
      if (style) { storage.mutate(function (next) { next.preferences.controls.buttonStyle = style.dataset.buttonStyle; }, { reason: "button-style" }); applyAppearance(); renderSettings(); return; }
    });
    dialog.addEventListener("keydown", function (event) {
      const tab = event.target.closest("[role='tab']");
      if (!tab || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const tabs = $$('[data-support-tab]:not([hidden])');
      const index = tabs.indexOf(tab);
      const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
      const target = event.key === "Home" ? tabs[0] : event.key === "End" ? tabs[tabs.length - 1] : tabs[(index + (forward ? 1 : -1) + tabs.length) % tabs.length];
      target.focus(); switchSupportTab(target.dataset.supportTab);
    });
    $("#textSizeSlider").addEventListener("input", function (event) { storage.mutate(function (next) { next.preferences.appearance.textScale = Number(event.target.value) / 100; }, { reason: "appearance" }); applyAppearance(); renderTextSizeControl(); });
    $$('[data-hints-enabled]').forEach(function (button) {
      button.addEventListener("click", function () { storage.mutate(function (next) { next.preferences.hints.enabled = button.dataset.hintsEnabled === "true"; }, { reason: "hints" }); renderHeader(); renderSettings(); });
    });
    $("#restoreHintsButton").addEventListener("click", function () { storage.mutate(function (next) { next.preferences.hints.dismissed = []; next.ui.dismissedHints = []; }, { reason: "hints" }); renderHeader(); renderSettings(); components.toast("All contextual hints are available again.", { title: "Hints restored", kind: "success" }); });
    $("#saveSyncButton").addEventListener("click", saveSyncSettings);
    $("#testSyncButton").addEventListener("click", testSyncSettings);
    $("#forgetSyncButton").addEventListener("click", forgetSync);
    $("#syncNowButton").addEventListener("click", function (event) { sync.syncNow(event.currentTarget); });
    $("#restoreCloudButton").addEventListener("click", function (event) { sync.restoreFromCloud(event.currentTarget); });
    $("#syncToken").addEventListener("input", function (event) { event.currentTarget.dataset.dirty = "true"; });
    $("#syncRememberToken").addEventListener("change", function (event) { event.currentTarget.dataset.dirty = "true"; });
    $("#exportButton").addEventListener("click", portability.exportJson);
    $("#importButton").addEventListener("click", function () { $("#importFileInput").click(); });
    $("#resetPreferencesButton").addEventListener("click", resetPreferences);
    $("#eraseAllButton").addEventListener("click", eraseAllData);
    $("#helpSearch").addEventListener("input", renderHelp);
    $("#supportRoadmapSearch").addEventListener("input", function (event) {
      storage.mutate(function (next) { next.modules.roadmap.search = u.cleanLine(event.target.value, 200); }, { reason: "roadmap-filter" });
      renderSupportRoadmap();
    });
    $("#supportRoadmapState").addEventListener("change", function (event) {
      storage.mutate(function (next) { next.modules.roadmap.state = event.target.value; }, { reason: "roadmap-filter" });
      renderSupportRoadmap();
    });
    $("#supportRoadmapPriority").addEventListener("change", function (event) {
      storage.mutate(function (next) { next.modules.roadmap.priority = event.target.value; }, { reason: "roadmap-filter" });
      renderSupportRoadmap();
    });
    $("#supportRoadmapTarget").addEventListener("change", function (event) {
      storage.mutate(function (next) { next.modules.roadmap.target = event.target.value; }, { reason: "roadmap-filter" });
      renderSupportRoadmap();
    });
    $("#supportRoadmapEffort").addEventListener("change", function (event) {
      storage.mutate(function (next) { next.modules.roadmap.effort = event.target.value; }, { reason: "roadmap-filter" });
      renderSupportRoadmap();
    });
    $("#supportRoadmapSort").addEventListener("change", function (event) {
      storage.mutate(function (next) { next.modules.roadmap.sortBy = event.target.value; }, { reason: "roadmap-sort" });
      renderSupportRoadmap();
    });
    $("#resetSupportRoadmapFilters").addEventListener("click", clearRoadmapFilters);
    $("#restoreRecoveryButton").addEventListener("click", restoreRecovery);
    $("#saveRecoveryButton").addEventListener("click", saveRecoveryCopy);
    $("#developerLabelLengthFilter").addEventListener("change", function (event) {
      const minimum = Math.round(u.clamp(event.target.value, 0, 120, 0));
      event.target.value = minimum || "";
      storage.mutate(function (next) { next.modules.iconLibrary.minimumLabelLength = minimum; }, { reason: "developer-icon-filter" });
      iconVisibleCount = ICON_PAGE_SIZE;
      renderIconLibrary();
      renderDeveloper();
    });
    $("#clearDeveloperLabelLengthFilter").addEventListener("click", function () {
      storage.mutate(function (next) { next.modules.iconLibrary.minimumLabelLength = 0; }, { reason: "developer-icon-filter" });
      iconVisibleCount = ICON_PAGE_SIZE;
      renderIconLibrary();
      renderDeveloper();
    });
    $("#developerExportIconOverrides").addEventListener("click", exportIconUpdates);
    $("#disableDeveloperButton").addEventListener("click", function () { toggleDeveloperMode(false); });
  }

  function shortcutChordHeld(event) {
    return Boolean(event.shiftKey && event.ctrlKey && event.altKey && !event.metaKey);
  }

  function shortcutModifiersAllowed(event) {
    return shortcutChordHeld(event) || (!event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey);
  }

  function refreshShortcutEligibility(active) {
    const openDialogs = $$("dialog[open]");
    const activeDialog = openDialogs[openDialogs.length - 1] || null;
    $$('[data-shortcut]').forEach(function (control) {
      const ownerDialog = control.closest("dialog");
      const available = !control.disabled && control.getAttribute("aria-disabled") !== "true" && control.getClientRects().length > 0;
      const inActiveScope = activeDialog ? ownerDialog === activeDialog : !ownerDialog;
      control.classList.toggle("shortcut-eligible", Boolean(active && available && inActiveScope));
    });
  }

  function decorateShortcutControls(root) {
    const controls = root && root.matches?.("[data-shortcut]") ? [root] : $$('[data-shortcut]', root || document);
    controls.forEach(function (control) {
      const keys = [control.dataset.shortcut, control.dataset.shortcutSecondary].filter(Boolean);
      const key = keys[0];
      const definition = SHORTCUTS.find(function (item) { return item.hintKey === key; });
      const currentTitle = String(control.getAttribute("title") || "");
      const undecoratedTitle = / · Shortcuts?:/.test(currentTitle) ? "" : currentTitle;
      const baseTitle = undecoratedTitle || control.getAttribute("aria-label") || definition?.label || control.textContent.trim();
      const commands = keys.map(function (commandKey) {
        const command = SHORTCUTS.find(function (item) { return item.hintKey === commandKey || item.secondaryHintKey === commandKey; });
        const chordKey = commandKey === command?.secondaryHintKey ? commandKey : command?.chordKey || commandKey;
        return commandKey + " or Shift + Control + Option + " + chordKey;
      });
      control.title = baseTitle + " · Shortcut" + (commands.length > 1 ? "s: " : ": ") + commands.join("; ");
    });
  }

  function updateShortcutHints(event, forceOff) {
    const active = !forceOff && state().preferences.controls.shortcutHints && shortcutChordHeld(event);
    hintModifierActive = active;
    document.documentElement.classList.toggle("shortcut-hints-visible", active);
    refreshShortcutEligibility(active);
  }

  function runShortcut(event, action) {
    event.preventDefault();
    action();
    requestAnimationFrame(function () {
      decorateShortcutControls();
      refreshShortcutEligibility(hintModifierActive);
    });
  }

  function handleGlobalKeydown(event) {
    updateShortcutHints(event, false);
    if (event.key === "Escape") {
      $("#globalSearchResults").hidden = true;
      return;
    }
    if (event.isComposing || event.defaultPrevented) return;
    if (event.target === $("#globalSearch") && event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
      runShortcut(event, focusGlobalSearch);
      return;
    }
    if (u.isEditableTarget(event.target) && !event.target.matches?.("[data-icon-weight]")) return;
    if (event.metaKey) return;
    if (event.code === "Slash") {
      if (!shortcutChordHeld(event) && event.shiftKey) runShortcut(event, function () { openSupport("help", event.target); });
      else runShortcut(event, focusGlobalSearch);
      return;
    }
    if (event.repeat) return;
    const iconPageActive = !$("dialog[open]");
    const updateToast = $("#appToast");
    const updateToastVisible = updateToast?.dataset.context === "pwa-update" && updateToast.classList.contains("visible");
    const focusedIconItem = document.activeElement.closest?.(".icon-card-item");
    const focusedIconId = focusedIconItem?.querySelector("[data-icon-id]")?.dataset.iconId;
    if ((event.code === "Backslash" && event.shiftKey) || event.key === "|") runShortcut(event, function () { toggleDeveloperMode(undefined, { openPanel: true }); });
    else if (event.code === "KeyH") runShortcut(event, function () { openSupport("help", event.target); });
    else if (event.code === "Comma") runShortcut(event, function () { openSupport("settings", event.target); });
    else if (event.code === "Digit2" && activeModuleEnabled("roadmap")) runShortcut(event, function () { openSupport("roadmap", event.target); });
    else if (event.code === "KeyN") runShortcut(event, function () { openNotes(event.target); });
    else if (event.code === "Digit1" && iconPageActive && shortcutModifiersAllowed(event)) runShortcut(event, function () { $('label[for="iconWeightUltralight"]').click(); });
    else if (event.code === "Digit3" && iconPageActive && shortcutModifiersAllowed(event)) runShortcut(event, function () { $('label[for="iconWeightLight"]').click(); });
    else if (event.code === "Digit5" && iconPageActive && shortcutModifiersAllowed(event)) runShortcut(event, function () { $('label[for="iconWeightMedium"]').click(); });
    else if (event.code === "Digit7" && iconPageActive && shortcutModifiersAllowed(event)) runShortcut(event, function () { $('label[for="iconWeightBold"]').click(); });
    else if (event.code === "Digit9" && iconPageActive && shortcutModifiersAllowed(event)) runShortcut(event, function () { $('label[for="iconWeightBlack"]').click(); });
    else if (event.code === "KeyG" && iconPageActive && shortcutModifiersAllowed(event)) runShortcut(event, focusFirstIcon);
    else if (event.code === "KeyI" && iconPageActive && focusedIconId && shortcutModifiersAllowed(event)) runShortcut(event, function () { openIconInfo(focusedIconId, document.activeElement); });
    else if (event.code === "KeyA" && iconPageActive && shortcutModifiersAllowed(event)) runShortcut(event, function () { $('[data-icon-category="all"]').click(); });
    else if (event.code === "KeyC" && iconPageActive && !$("#iconClearSearch").hidden && shortcutModifiersAllowed(event)) runShortcut(event, function () { $("#iconClearSearch").click(); });
    else if (event.code === "KeyL" && iconPageActive && !$("#iconLoadMore").hidden && shortcutModifiersAllowed(event)) runShortcut(event, function () { $("#iconLoadMore").click(); });
    else if (event.code === "KeyV") runShortcut(event, function () { openSupport("releases", event.target); });
    else if (event.code === "KeyR" && iconPageActive && updateToastVisible && shortcutModifiersAllowed(event)) runShortcut(event, function () { $("#appToast [data-toast-action]").click(); });
    else if (event.code === "KeyX" && iconPageActive && updateToastVisible && shortcutModifiersAllowed(event)) runShortcut(event, function () { $("#appToast [data-toast-close]").click(); });
    else if (event.code === "KeyX" && !$("dialog[open]") && !$("#whatsNewBanner").hidden && shortcutModifiersAllowed(event)) runShortcut(event, dismissWhatsNew);
    else if (event.code === "KeyS") runShortcut(event, function () { sync.syncNow(event.target); });
    else if (event.code === "KeyE") runShortcut(event, portability.exportJson);
    else if (event.code === "KeyT") runShortcut(event, toggleThemeFromAppIcon);
    else if (event.code === "KeyD") runShortcut(event, function () { toggleDeveloperMode(undefined, { openPanel: true }); });
  }

  function bindGeneralEvents() {
    $$('[data-close-dialog]').forEach(function (button) {
      if (!button.dataset.shortcut) button.dataset.shortcut = "Esc";
      if (!button.hasAttribute("aria-keyshortcuts")) button.setAttribute("aria-keyshortcuts", "Escape Control+Alt+Shift+Escape");
    });
    decorateShortcutControls();
    bindAppIconGestures();
    $("#versionButton").addEventListener("click", function (event) { openSupport("releases", event.currentTarget); });
    $("#supportButton").addEventListener("click", function (event) { openSupport(state().ui.supportTab, event.currentTarget); });
    $("#notesButton").addEventListener("click", function (event) { openNotes(event.currentTarget); });
    $("#notesTextarea").addEventListener("input", function (event) { saveNotes(event.target.value); });
    $("#floatingStatusButton").addEventListener("click", function (event) {
      sync.syncNow(event.currentTarget);
    });
    document.addEventListener("click", function (event) {
      const action = event.target.closest("[data-action]");
      if (action) handleAction(action.dataset.action, action);
      const dismissHint = event.target.closest("[data-dismiss-hint]");
      if (dismissHint) { storage.mutate(function (next) { next.preferences.hints.dismissed = Array.from(new Set(next.preferences.hints.dismissed.concat(dismissHint.dataset.dismissHint))); }, { reason: "dismiss-hint" }); renderHeader(); }
      if (event.target.closest("[data-dismiss-release]")) dismissWhatsNew();
      if (event.target.closest("[data-open-releases]")) openSupport("releases", event.target.closest("[data-open-releases]"));
      const safeLink = event.target.closest("[data-open-url]");
      if (safeLink && !u.safeExternalOpen(safeLink.dataset.openUrl)) components.toast("That external address is not allowed.", { title: "Link unavailable", kind: "warning" });
    });
    $("#globalSearch").addEventListener("input", function (event) {
      storage.mutate(function (next) { next.ui.search = u.cleanLine(event.target.value, 200); }, { reason: "global-search" });
      iconVisibleCount = ICON_PAGE_SIZE;
      renderIconLibrary();
      renderGlobalSearchResults();
    });
    $("#searchNameOnly").addEventListener("click", function () { setSearchNameOnly(false); $("#globalSearch").focus(); });
    $("#globalSearch").addEventListener("beforeinput", function (event) {
      if (!event.isComposing && event.data === "'") { event.preventDefault(); setSearchNameOnly(true); }
      else if (!event.isComposing && event.data === "/") { event.preventDefault(); focusGlobalSearch(); }
    });
    $("#globalSearch").addEventListener("focus", renderGlobalSearchResults);
    $("#globalSearch").addEventListener("keydown", function (event) {
      if (event.isComposing) return;
      if (event.key === "'" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        setSearchNameOnly(true);
        return;
      }
      const results = $$("button[role='option']", $("#globalSearchResults"));
      if (event.key === "Enter") { event.preventDefault(); submitIconSearch(); }
      else if (event.key === "ArrowDown" && results.length) { event.preventDefault(); results[0].focus(); }
      else if (event.key === "Escape") { $("#globalSearchResults").hidden = true; event.target.select(); }
    });
    $("#globalSearchResults").addEventListener("click", function (event) { const result = event.target.closest("[data-search-type]"); if (result) activateGlobalSearchResult(result.dataset.searchType, result.dataset.searchId); });
    $("#globalSearchResults").addEventListener("keydown", function (event) {
      const button = event.target.closest("[data-search-type]"); if (!button) return;
      const buttons = $$("[data-search-type]", event.currentTarget); const index = buttons.indexOf(button);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); buttons[(index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length]?.focus(); }
      else if (event.key === "Escape") { event.preventDefault(); $("#globalSearch").focus(); $("#globalSearchResults").hidden = true; }
    });
    document.addEventListener("focusin", function (event) { if (!event.target.closest(".global-search-wrap")) $("#globalSearchResults").hidden = true; });
    $("#iconLibraryGrid").addEventListener("click", function (event) {
      const renameButton = event.target.closest("[data-icon-rename]");
      if (renameButton) { openIconEditor(renameButton.dataset.iconRename, renameButton); return; }
      const infoButton = event.target.closest("[data-icon-info]");
      if (infoButton) { openIconInfo(infoButton.dataset.iconInfo, infoButton); return; }
      const button = event.target.closest("[data-icon-id]");
      if (button) copyIcon(button.dataset.iconId, button);
    });
    $("#iconLibraryGrid").addEventListener("contextmenu", function (event) {
      const item = event.target.closest("[data-icon-item]");
      if (!item) return;
      event.preventDefault();
      removeIconFromSelectedGroup(item.dataset.iconItem);
    });
    $("#iconLibraryGrid").addEventListener("keydown", moveIconGridFocus);
    $("#iconCategoryFilters").addEventListener("click", function (event) {
      const collapseButton = event.target.closest("[data-icon-category-collapse]");
      if (collapseButton) {
        const categoryId = collapseButton.dataset.iconCategoryCollapse;
        const isExpanded = collapseButton.getAttribute("aria-expanded") === "true";
        storage.mutate(function (next) {
          const collapsed = new Set(next.modules.iconLibrary.collapsedCategories || []);
          if (isExpanded) {
            collapsed.add(categoryId);
            if (iconCategoryIsAncestor(categoryId, next.modules.iconLibrary.category)) next.modules.iconLibrary.category = categoryId;
          }
          else collapsed.delete(categoryId);
          next.modules.iconLibrary.collapsedCategories = Array.from(collapsed);
        }, { reason: "icon-category-collapse" });
        renderIconLibrary();
        requestAnimationFrame(function () { $("[data-icon-category-collapse='" + categoryId + "']")?.focus({ preventScroll: true }); });
        return;
      }
      const button = event.target.closest("[data-icon-category]");
      if (!button || button.disabled) return;
      storage.mutate(function (next) { next.modules.iconLibrary.category = button.dataset.iconCategory; }, { reason: "icon-category" });
      iconVisibleCount = ICON_PAGE_SIZE;
      renderIconLibrary();
      requestAnimationFrame(function () { $("[data-icon-category][aria-pressed='true']")?.focus({ preventScroll: true }); });
    });
    $("#iconCategoryFilters").addEventListener("keydown", function (event) {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const buttons = $$("[data-icon-category]:not(:disabled)", event.currentTarget).filter(function (button) { return button.offsetParent !== null; });
      const current = event.target.closest("[data-icon-category]");
      const index = buttons.indexOf(current);
      if (index < 0 || !buttons.length) return;
      const forward = event.key === "ArrowDown" || event.key === "ArrowRight";
      let next = index + (forward ? 1 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 0);
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = buttons.length - 1;
      next = (next + buttons.length) % buttons.length;
      event.preventDefault();
      if (event.key === "ArrowUp" || event.key === "ArrowDown") buttons[next].click();
      else buttons[next].focus();
    });
    $("#iconInfoCopyButton").addEventListener("click", function (event) { copyIcon(event.currentTarget.dataset.iconInfoCopy, event.currentTarget); });
    $("#iconInfoQuickEdit").addEventListener("submit", saveIconInfoQuickEdit);
    $("#iconInfoEditButton").addEventListener("click", function (event) {
      const iconId = event.currentTarget.dataset.iconEdit;
      components.closeDialog("#iconInfoDialog", "edit");
      window.setTimeout(function () { openIconEditor(iconId, iconInfoTrigger || event.currentTarget); }, 0);
    });
    $("#iconEditForm").addEventListener("submit", saveIconEdit);
    $("#iconEditResetButton").addEventListener("click", resetIconEdit);
    $("#iconEditExportButton").addEventListener("click", exportIconUpdates);
    $("#iconEditGroups").addEventListener("change", function (event) {
      const checkbox = event.target.closest("[data-icon-edit-category]");
      if (!checkbox) return;
      const category = iconCategoryById.get(checkbox.value);
      const categoryInputs = $$("[data-icon-edit-category]", event.currentTarget);
      if (checkbox.checked && category?.parent) {
        let parentId = category.parent;
        while (parentId) {
          const parent = categoryInputs.find(function (input) { return input.value === parentId; });
          if (parent) parent.checked = true;
          parentId = iconCategoryById.get(parentId)?.parent || "";
        }
      }
      if (!checkbox.checked && category) {
        iconCategoryDescendants(category.id).forEach(function (child) {
          const childInput = categoryInputs.find(function (input) { return input.value === child.id; });
          if (childInput) childInput.checked = false;
        });
      }
      updateIconEditControls();
    });
    $("#iconSourceFilter").addEventListener("change", function (event) {
      storage.mutate(function (next) { next.modules.iconLibrary.source = event.target.value; }, { reason: "icon-source" });
      iconVisibleCount = ICON_PAGE_SIZE;
      renderIconLibrary();
    });
    $("#iconKindFilter").addEventListener("change", function (event) {
      storage.mutate(function (next) { next.modules.iconLibrary.kind = event.target.value; }, { reason: "icon-kind" });
      iconVisibleCount = ICON_PAGE_SIZE;
      renderIconLibrary();
    });
    $("#iconWeightControl").addEventListener("change", function (event) {
      const input = event.target.closest("[data-icon-weight]");
      if (!input || !ICON_WEIGHTS.includes(input.value)) return;
      storage.mutate(function (next) { next.modules.iconLibrary.weight = input.value; }, { reason: "icon-weight" });
      renderIconLibrary();
    });
    $("#iconClearSearch").addEventListener("click", function () {
      storage.mutate(function (next) {
        next.ui.search = "";
        next.ui.searchNameOnly = false;
        next.modules.iconLibrary.category = "all";
        next.modules.iconLibrary.kind = "all";
        next.modules.iconLibrary.source = "all";
        next.modules.iconLibrary.minimumLabelLength = 0;
      }, { reason: "icon-filters" });
      $("#globalSearch").value = "";
      iconVisibleCount = ICON_PAGE_SIZE;
      renderIconLibrary();
      renderGlobalSearchResults();
      renderDeveloper();
      $("#globalSearch").focus();
    });
    $("#iconLoadMore").addEventListener("click", function () { iconVisibleCount += ICON_PAGE_SIZE; renderIconLibrary(); });

    bindSupportEvents();
    document.addEventListener("keydown", handleGlobalKeydown);
    document.addEventListener("keyup", function (event) { updateShortcutHints(event, false); });
    window.addEventListener("blur", function () { updateShortcutHints({ altKey: false, shiftKey: false, ctrlKey: false }, true); });
    new MutationObserver(function () { if (hintModifierActive) refreshShortcutEligibility(true); }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open", "hidden", "disabled", "aria-disabled"] });
  }

  function renderAll() {
    refreshIconCatalog();
    applyAppearance();
    renderHeader();
    renderNotesEditor();
    renderIconLibrary();
    renderGlobalSearchResults();
    if ($("#supportDialog").open) renderSupport();
    decorateShortcutControls();
    refreshShortcutEligibility(hintModifierActive);
  }

  function bindRuntimeEvents() {
    window.addEventListener("app:shortcutcontrols", function () {
      decorateShortcutControls($("#appToast"));
      refreshShortcutEligibility(hintModifierActive);
    });
    window.addEventListener("app:syncchange", function () {
      renderSyncStatus();
      if ($("#supportDialog").open && state().ui.supportTab === "dataSync") renderSyncSettings();
      if ($("#supportDialog").open && state().ui.supportTab === "developer") renderDeveloper();
    });
    window.addEventListener("app:opensyncsettings", function (event) {
      openSupport("dataSync", event.detail && event.detail.trigger);
      requestAnimationFrame(function () { $("#storageSyncSettings").scrollIntoView({ block: "start" }); $("#syncToken").focus(); });
    });
    window.addEventListener("app:storageerror", function (event) {
      components.toast(event.detail.message, { title: event.detail.title, kind: "danger", duration: 0, actionLabel: "Export", onAction: portability.exportJson });
      renderSyncStatus();
    });
    window.addEventListener("app:statesaved", function () {
      renderSyncStatus();
      if ($("#supportDialog").open && state().ui.supportTab === "dataSync") renderSyncSettings();
    });
    window.addEventListener("app:networkchange", function () { document.documentElement.classList.toggle("offline", navigator.onLine === false); renderSyncStatus(); });
    window.addEventListener("app:pwaerror", function (event) { components.toast(event.detail.message, { title: "Offline support unavailable", kind: "warning", duration: 5000 }); });
    window.addEventListener("app:statechange", function (event) {
      const reasons = new Set(["import", "sync-download", "sync-merge", "recovery", "erase-all", "reset-preferences", "restore-demo"]);
      if (reasons.has(event.detail.reason)) renderAll();
      else if ($("#supportDialog").open && state().ui.supportTab === "dataSync") renderSyncPayload();
    });
    window.addEventListener("resize", function () { if ($("#developerPanel") && !$("#developerPanel").hidden) renderDeveloper(); });
    ["(prefers-color-scheme: dark)", "(prefers-reduced-motion: reduce)"].forEach(function (query) {
      const media = window.matchMedia(query);
      if (typeof media.addEventListener === "function") media.addEventListener("change", applyAppearance);
      else if (typeof media.addListener === "function") media.addListener(applyAppearance);
    });
  }

  function showLoadReport() {
    const report = storage.getLoadReport();
    if (report.recovered) {
      components.toast("The saved state was unusable, so the last valid recovery copy was loaded.", { title: "Recovery copy restored", kind: "warning", duration: 6000 });
    } else if (report.error && report.source === "default") {
      components.toast("Saved data could not be read. A fresh default workspace was created without overwriting any imported file.", { title: "Fresh workspace loaded", kind: "warning", duration: 6000 });
    } else if (report.migrations.length) {
      components.toast("Saved data was upgraded through " + report.migrations.join(", ") + ".", { title: "State upgraded", kind: "success" });
    }
  }

  function init() {
    storage.load();
    applyIdentity();
    components.init();
    portability.init();
    bindGeneralEvents();
    bindIconFilterDivider();
    bindRuntimeEvents();
    pwa.init();
    sync.init();
    renderAll();
    document.documentElement.classList.toggle("offline", navigator.onLine === false);
    requestAnimationFrame(function () { document.documentElement.classList.add("app-ready"); });
    showLoadReport();
  }

  App.application = {
    render: renderAll,
    switchModule: switchModule,
    openSupport: openSupport,
    openNotes: openNotes,
    shortcuts: SHORTCUTS
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
