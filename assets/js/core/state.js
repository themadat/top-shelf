(function () {
  "use strict";

  const App = window.LocalApp;
  const config = App.config;
  const u = App.utils;
  const SYNC_FORMAT = "top-shelf-app-data";
  const SYNC_VERSION = 2;
  // Older builds reject this movie-capable envelope instead of dropping its content.
  const SYNC_SCHEMA_VERSION = 6;
  const CLOUD_TARGET = Object.freeze({
    owner: u.cleanLine(config.cloudSync?.owner, 39),
    repo: u.cleanLine(config.cloudSync?.repo, 100).replace(/\.git$/i, ""),
    branch: u.cleanLine(config.cloudSync?.branch || "main", 250) || "main",
    path: u.cleanLine(config.cloudSync?.path || "data/top-shelf.json", 500).replace(/^\/+/, "") || "data/top-shelf.json"
  });
  const STATUS_IDS = new Set(config.statuses.map(function (status) { return status.id; }));
  const MODULE_IDS = ["roadmap"];
  function demoRecords(now) {
    return [];
  }

  function demoDocuments(now) {
    return [
      { id: "app-notes", title: "Notes", html: "", order: 0, createdAt: now, updatedAt: now }
    ];
  }

  function defaultTheme() {
    return config.themeDefaults;
  }

  function createDefaultState(options) {
    const settings = Object.assign({ demo: config.features.demoData }, options || {});
    const now = u.isoNow();
    const records = settings.demo ? demoRecords(now) : [];
    const documents = settings.demo && config.features.documents ? demoDocuments(now) : [];
    return {
      schemaVersion: config.schemaVersion,
      meta: {
        appVersion: config.identity.version,
        buildId: config.identity.buildId,
        createdAt: now,
        updatedAt: now,
        lastMutationId: u.uid("mutation"),
        tombstones: { records: [], documents: [] }
      },
      workspace: {
        title: config.identity.name,
        movies: [],
        records: records,
        documents: documents
      },
      preferences: {
        appearance: {
          mode: "system",
          accent: defaultTheme().accent,
          accent2: defaultTheme().accent2,
          success: defaultTheme().success,
          warning: defaultTheme().warning,
          danger: defaultTheme().danger,
          textScale: 1
        },
        controls: {
          buttonStyle: "both",
          shortcutHints: true,
          shortcutHintModifier: config.controls.shortcutHintModifier,
          developerMode: false
        },
        hints: {
          enabled: config.features.hints,
          dismissed: []
        },
        installation: {
          iconVariant: "auto"
        }
      },
      ui: {
        activeModule: "roadmap",
        selectedRecordId: records[0] ? records[0].id : "",
        selectedDocumentId: documents[0] ? documents[0].id : "",
        selectedShelf: config.shelves[0].id,
        search: "",
        records: {
          statusFilter: "all",
          categoryFilter: "all",
          favoritesOnly: false,
          sortBy: "order",
          sortDirection: "asc",
          viewMode: "comfortable",
          expandedIds: []
        },
        documents: {
          search: "",
          sortBy: "order",
          sortDirection: "asc"
        },
        panels: {
          listVisible: true,
          detailVisible: true,
          listRatio: 0.38
        },
        navigation: {
          mobileScreen: "list",
          recordsScrollTop: 0,
          documentsScrollTop: 0
        },
        dismissedHints: [],
        seenReleaseVersion: "",
        supportTab: "settings"
      },
      modules: {
        records: { showDemoFields: true },
        documents: { enabled: config.features.documents },
        roadmap: { search: "", state: "all", priority: "all", target: "all", effort: "all", sortBy: "priority", sortDirection: "asc" },
        cloudSync: {
          enabled: config.features.cloudSync,
          owner: CLOUD_TARGET.owner,
          repo: CLOUD_TARGET.repo,
          branch: CLOUD_TARGET.branch,
          path: CLOUD_TARGET.path,
          rememberToken: true,
          advancedOpen: false,
          baselineTarget: "",
          baselineSha: "",
          baselineHash: "",
          lastSyncedAt: "",
          lastCheckedAt: ""
        }
      }
    };
  }

  function migrate1to2(input) {
    const source = u.plainObject(input);
    const now = u.isoNow();
    const rawRecords = Array.isArray(source.items) ? source.items : (Array.isArray(source.records) ? source.records : []);
    const rawDocuments = Array.isArray(source.notes) ? source.notes : (Array.isArray(source.documents) ? source.documents : []);
    return {
      schemaVersion: 2,
      meta: {
        appVersion: u.cleanLine(source.appVersion || source.version, 32),
        createdAt: source.createdAt || now,
        updatedAt: source.updatedAt || now
      },
      workspace: {
        title: source.workspaceTitle || source.title || "My Workspace",
        records: rawRecords.map(function (item, index) {
          const record = u.plainObject(item);
          return {
            id: record.id || u.uid("record"),
            title: record.title || record.name || "Untitled record",
            summary: record.summary || record.description || "",
            category: record.category || record.type || "General",
            status: record.status || (record.done ? "complete" : "active"),
            url: record.url || record.link || "",
            tags: record.tags || [],
            favorite: record.favorite === true,
            order: Number.isFinite(Number(record.order)) ? Number(record.order) : index,
            createdAt: record.createdAt || now,
            updatedAt: record.updatedAt || now
          };
        }),
        documents: rawDocuments.map(function (item, index) {
          if (typeof item === "string") return { id: u.uid("document"), title: "Note " + (index + 1), html: "<p>" + u.escapeHtml(item) + "</p>", order: index, createdAt: now, updatedAt: now };
          const document = u.plainObject(item);
          return {
            id: document.id || u.uid("document"),
            title: document.title || document.name || "Untitled note",
            html: document.html || document.content || document.text || "",
            order: Number.isFinite(Number(document.order)) ? Number(document.order) : index,
            createdAt: document.createdAt || now,
            updatedAt: document.updatedAt || now
          };
        })
      },
      preferences: {
        theme: source.theme || (source.settings && source.settings.theme) || "system",
        accent: source.accent || (source.settings && source.settings.accent),
        textScale: source.textScale || (source.settings && source.settings.textScale) || 1,
        buttonStyle: source.buttonStyle || (source.settings && source.settings.buttonStyle) || "both",
        hintsEnabled: source.hintsEnabled !== false
      },
      layout: u.plainObject(source.layout || source.panels),
      filters: u.plainObject(source.filters),
      selection: u.plainObject(source.selection),
      modules: u.plainObject(source.modules)
    };
  }

  function migrate2to3(input) {
    const source = u.plainObject(input);
    const base = createDefaultState({ demo: false });
    const oldPreferences = u.plainObject(source.preferences);
    const oldLayout = u.plainObject(source.layout);
    const oldFilters = u.plainObject(source.filters);
    const oldSelection = u.plainObject(source.selection);
    const oldModules = u.plainObject(source.modules);
    const mode = ["system", "light", "dark"].includes(oldPreferences.theme) ? oldPreferences.theme : "system";
    return {
      schemaVersion: 3,
      meta: Object.assign({}, base.meta, u.plainObject(source.meta), { tombstones: { records: [], documents: [] } }),
      workspace: Object.assign({}, base.workspace, u.plainObject(source.workspace)),
      preferences: {
        appearance: Object.assign({}, base.preferences.appearance, {
          mode: mode,
          accent: oldPreferences.accent || base.preferences.appearance.accent,
          textScale: oldPreferences.textScale || 1
        }),
        controls: Object.assign({}, base.preferences.controls, { buttonStyle: oldPreferences.buttonStyle || "both" }),
        hints: Object.assign({}, base.preferences.hints, { enabled: oldPreferences.hintsEnabled !== false }),
        installation: base.preferences.installation
      },
      ui: Object.assign({}, base.ui, {
        selectedRecordId: oldSelection.recordId || oldSelection.selectedRecordId || "",
        selectedDocumentId: oldSelection.documentId || oldSelection.selectedDocumentId || "",
        records: Object.assign({}, base.ui.records, oldFilters.records || oldFilters),
        documents: Object.assign({}, base.ui.documents, oldFilters.documents),
        panels: {
          listVisible: oldLayout.listVisible !== false,
          detailVisible: oldLayout.detailVisible !== false,
          listRatio: oldLayout.listRatio || oldLayout.splitRatio || base.ui.panels.listRatio
        }
      }),
      modules: Object.assign({}, base.modules, oldModules)
    };
  }

  function migrate3to4(input) {
    const source = u.plainObject(input);
    source.schemaVersion = 4;
    source.ui = Object.assign({}, u.plainObject(source.ui), { activeModule: "roadmap" });
    return source;
  }

  function migrate4to5(input) {
    const source = u.clone(input);
    source.schemaVersion = 5;
    const appearance = source.preferences?.appearance;
    if (appearance?.accent === "#315f73") appearance.accent = config.themeDefaults.accent;
    if (appearance?.accent2 === "#b86b4b") appearance.accent2 = config.themeDefaults.accent2;
    return source;
  }
  const migrations = { 1: migrate1to2, 2: migrate2to3, 3: migrate3to4, 4: migrate4to5 };

  function unwrapInput(input) {
    const source = u.plainObject(input);
    if (source.exportFormat && source.state && typeof source.state === "object") return source.state;
    if (source.backup && source.backup.state && typeof source.backup.state === "object") return source.backup.state;
    if (source.data && source.data.workspace && typeof source.data === "object") return source.data;
    return source;
  }

  function migrate(input) {
    let next = u.clone(unwrapInput(input));
    let version = Number(next.schemaVersion || next.stateVersion || 1);
    if (!Number.isInteger(version) || version < 1) version = 1;
    if (version > config.schemaVersion) throw new Error("This backup uses a newer state model (v" + version + ") than this app supports (v" + config.schemaVersion + ").");
    const applied = [];
    while (version < config.schemaVersion) {
      const migration = migrations[version];
      if (!migration) throw new Error("No migration is available from state model v" + version + ".");
      next = migration(next);
      applied.push(version + "→" + (version + 1));
      version += 1;
    }
    next.schemaVersion = config.schemaVersion;
    return { state: next, applied: applied };
  }

  function normalizeRecord(input, index, usedIds, now) {
    const source = u.plainObject(input);
    let id = u.cleanLine(source.id, 100).replace(/[^a-z0-9_-]/gi, "-");
    if (!id || usedIds.has(id)) id = u.uid("record");
    usedIds.add(id);
    const status = STATUS_IDS.has(source.status) ? source.status : "active";
    const createdAt = u.ensureIso(source.createdAt, now);
    return {
      id: id,
      title: u.cleanLine(source.title || source.name || "Untitled record", 140) || "Untitled record",
      summary: u.cleanText(source.summary || source.description, 4000).trim(),
      category: u.cleanLine(source.category || "General", 60) || "General",
      status: status,
      url: u.safeUrl(source.url || source.link),
      tags: Array.from(new Set((Array.isArray(source.tags) ? source.tags : String(source.tags || "").split(","))
        .map(function (tag) { return u.cleanLine(tag, 32).toLowerCase(); }).filter(Boolean))).slice(0, 20),
      favorite: source.favorite === true,
      order: Number.isFinite(Number(source.order)) ? Math.round(Number(source.order)) : index,
      createdAt: createdAt,
      updatedAt: u.ensureIso(source.updatedAt, createdAt)
    };
  }

  function normalizeDocument(input, index, usedIds, now) {
    const source = u.plainObject(input);
    let id = u.cleanLine(source.id, 100).replace(/[^a-z0-9_-]/gi, "-");
    if (!id || usedIds.has(id)) id = u.uid("document");
    usedIds.add(id);
    const createdAt = u.ensureIso(source.createdAt, now);
    return {
      id: id,
      title: u.cleanLine(source.title || source.name || "Untitled note", 140) || "Untitled note",
      html: u.sanitizeRichHtml(source.html || source.content || source.text || ""),
      order: Number.isFinite(Number(source.order)) ? Math.round(Number(source.order)) : index,
      createdAt: createdAt,
      updatedAt: u.ensureIso(source.updatedAt, createdAt)
    };
  }

  function consolidateDocuments(documents, now) {
    const ordered = documents.slice().sort(function (a, b) { return a.order - b.order; });
    if (!ordered.length) return [{ id: "app-notes", title: "Notes", html: "", order: 0, createdAt: now, updatedAt: now }];
    const createdAt = ordered.reduce(function (earliest, item) {
      return Date.parse(item.createdAt) < Date.parse(earliest) ? item.createdAt : earliest;
    }, ordered[0].createdAt);
    const updatedAt = ordered.reduce(function (latest, item) {
      return Date.parse(item.updatedAt) > Date.parse(latest) ? item.updatedAt : latest;
    }, ordered[0].updatedAt);
    const sections = ordered.map(function (item) {
      const text = u.richTextToPlainText(item.html, config.controls.maxDocumentHtmlLength);
      if (ordered.length === 1) return text;
      return [item.title, text].filter(Boolean).join("\n\n");
    });
    let text = u.cleanText(sections.filter(Boolean).join("\n\n—\n\n"), config.controls.maxDocumentHtmlLength);
    if (ordered.length === 1 && text === "This is a simple local note. Start typing to replace it.") text = "";
    return [{
      id: "app-notes",
      title: "Notes",
      html: u.escapeHtml(text).replace(/\n/g, "<br>"),
      order: 0,
      createdAt: createdAt,
      updatedAt: updatedAt
    }];
  }

  function normalizeTombstones(value) {
    const used = new Set();
    return (Array.isArray(value) ? value : []).map(function (entry) {
      const source = u.plainObject(entry);
      const id = u.cleanLine(source.id, 100).replace(/[^a-z0-9_-]/gi, "-");
      if (!id || used.has(id)) return null;
      used.add(id);
      return { id: id, deletedAt: u.ensureIso(source.deletedAt) };
    }).filter(Boolean).slice(0, 10000);
  }

  function normalize(input) {
    const source = u.plainObject(input);
    const base = createDefaultState({ demo: false });
    const now = u.isoNow();
    const sourceMeta = u.plainObject(source.meta);
    const sourceWorkspace = u.plainObject(source.workspace);
    const sourcePreferences = u.plainObject(source.preferences);
    const sourceAppearance = u.plainObject(sourcePreferences.appearance);
    const sourceControls = u.plainObject(sourcePreferences.controls);
    const sourceHints = u.plainObject(sourcePreferences.hints);
    const sourceInstallation = u.plainObject(sourcePreferences.installation);
    const sourceUi = u.plainObject(source.ui);
    const sourceRecordUi = u.plainObject(sourceUi.records);
    const sourceDocumentUi = u.plainObject(sourceUi.documents);
    const sourcePanels = u.plainObject(sourceUi.panels);
    const sourceNavigation = u.plainObject(sourceUi.navigation);
    const sourceModules = u.plainObject(source.modules);
    const sourceRoadmap = u.plainObject(sourceModules.roadmap);
    const sourceCloud = u.plainObject(sourceModules.cloudSync);
    const theme = defaultTheme();
    const recordIds = new Set();
    const normalizedDocumentIds = new Set();
    const records = (Array.isArray(sourceWorkspace.records) ? sourceWorkspace.records : []).slice(0, config.controls.maxRecords).map(function (record, index) {
      return normalizeRecord(record, index, recordIds, now);
    });
    const normalizedDocuments = (Array.isArray(sourceWorkspace.documents) ? sourceWorkspace.documents : []).slice(0, config.controls.maxDocuments).map(function (document, index) {
      return normalizeDocument(document, index, normalizedDocumentIds, now);
    });
    const documents = consolidateDocuments(normalizedDocuments, now);
    const documentIds = new Set(documents.map(function (documentItem) { return documentItem.id; }));
    const categories = new Set(records.map(function (record) { return record.category; }));
    const mode = ["system", "light", "dark"].includes(sourceAppearance.mode) ? sourceAppearance.mode : "system";
    const sortBy = ["order", "title", "status", "updatedAt", "createdAt"].includes(sourceRecordUi.sortBy) ? sourceRecordUi.sortBy : "order";
    const documentSort = ["order", "title", "updatedAt", "createdAt"].includes(sourceDocumentUi.sortBy) ? sourceDocumentUi.sortBy : "order";
    const activeCandidates = MODULE_IDS.filter(function (id) { return id !== "roadmap" || config.features.roadmap; });
    const activeModule = activeCandidates.includes(sourceUi.activeModule) ? sourceUi.activeModule : (activeCandidates[0] || "");
    const sourceTombstones = u.plainObject(sourceMeta.tombstones);
    const state = {
      schemaVersion: config.schemaVersion,
      meta: {
        appVersion: config.identity.version,
        buildId: config.identity.buildId,
        createdAt: u.ensureIso(sourceMeta.createdAt, now),
        updatedAt: u.ensureIso(sourceMeta.updatedAt, now),
        lastMutationId: u.cleanLine(sourceMeta.lastMutationId, 100) || u.uid("mutation"),
        tombstones: {
          records: normalizeTombstones(sourceTombstones.records),
          documents: normalizeTombstones(sourceTombstones.documents)
        }
      },
      workspace: {
        title: u.cleanLine(sourceWorkspace.title || base.workspace.title, 100) || base.workspace.title,
        movies: App.movies.normalizeList(sourceWorkspace.movies),
        records: records,
        documents: documents
      },
      preferences: {
        appearance: {
          mode: mode,
          accent: u.normalizeColor(sourceAppearance.accent, theme.accent),
          accent2: u.normalizeColor(sourceAppearance.accent2, theme.accent2),
          success: u.normalizeColor(sourceAppearance.success, theme.success),
          warning: u.normalizeColor(sourceAppearance.warning, theme.warning),
          danger: u.normalizeColor(sourceAppearance.danger, theme.danger),
          textScale: u.clamp(sourceAppearance.textScale, 0.85, 1.3, u.clamp(sourceAppearance.readingScale, 0.85, 1.3, 1))
        },
        controls: {
          buttonStyle: ["icons", "text", "both"].includes(sourceControls.buttonStyle) ? sourceControls.buttonStyle : "both",
          shortcutHints: sourceControls.shortcutHints !== false,
          shortcutHintModifier: sourceControls.shortcutHintModifier === "ShiftControlOption" ? sourceControls.shortcutHintModifier : config.controls.shortcutHintModifier,
          developerMode: sourceControls.developerMode === true
        },
        hints: {
          enabled: config.features.hints && sourceHints.enabled !== false,
          dismissed: Array.from(new Set((Array.isArray(sourceHints.dismissed) ? sourceHints.dismissed : []).map(function (id) { return u.cleanLine(id, 80); }).filter(Boolean))).slice(0, 200)
        },
        installation: {
          iconVariant: ["auto", "light", "dark"].includes(sourceInstallation.iconVariant) ? sourceInstallation.iconVariant : "auto"
        }
      },
      ui: {
        activeModule: activeModule,
        selectedRecordId: recordIds.has(sourceUi.selectedRecordId) ? sourceUi.selectedRecordId : (records[0] ? records[0].id : ""),
        selectedDocumentId: documentIds.has(sourceUi.selectedDocumentId) ? sourceUi.selectedDocumentId : (documents[0] ? documents[0].id : ""),
        selectedShelf: config.shelves.some(function (shelf) { return shelf.id === sourceUi.selectedShelf; }) ? sourceUi.selectedShelf : config.shelves[0].id,
        search: u.cleanLine(sourceUi.search, 200),
        records: {
          statusFilter: sourceRecordUi.statusFilter === "all" || STATUS_IDS.has(sourceRecordUi.statusFilter) ? (sourceRecordUi.statusFilter || "all") : "all",
          categoryFilter: sourceRecordUi.categoryFilter === "all" || categories.has(sourceRecordUi.categoryFilter) ? (sourceRecordUi.categoryFilter || "all") : "all",
          favoritesOnly: sourceRecordUi.favoritesOnly === true,
          sortBy: sortBy,
          sortDirection: sourceRecordUi.sortDirection === "desc" ? "desc" : "asc",
          viewMode: ["compact", "comfortable"].includes(sourceRecordUi.viewMode) ? sourceRecordUi.viewMode : "comfortable",
          expandedIds: (Array.isArray(sourceRecordUi.expandedIds) ? sourceRecordUi.expandedIds : []).filter(function (id) { return recordIds.has(id); }).slice(0, 200)
        },
        documents: {
          search: u.cleanLine(sourceDocumentUi.search, 200),
          sortBy: documentSort,
          sortDirection: sourceDocumentUi.sortDirection === "desc" ? "desc" : "asc"
        },
        panels: {
          listVisible: sourcePanels.listVisible !== false,
          detailVisible: sourcePanels.detailVisible !== false,
          listRatio: u.clamp(sourcePanels.listRatio, 0.25, 0.7, base.ui.panels.listRatio)
        },
        navigation: {
          mobileScreen: sourceNavigation.mobileScreen === "detail" ? "detail" : "list",
          recordsScrollTop: u.clamp(sourceNavigation.recordsScrollTop, 0, 10000000, 0),
          documentsScrollTop: u.clamp(sourceNavigation.documentsScrollTop, 0, 10000000, 0)
        },
        dismissedHints: Array.from(new Set((Array.isArray(sourceUi.dismissedHints) ? sourceUi.dismissedHints : []).map(function (id) { return u.cleanLine(id, 80); }).filter(Boolean))).slice(0, 200),
        seenReleaseVersion: u.cleanLine(sourceUi.seenReleaseVersion, 32),
        supportTab: ["settings", "dataSync", "help", "releases", "shortcuts", "roadmap", "developer"].includes(sourceUi.supportTab) ? sourceUi.supportTab : "settings"
      },
      modules: {
        records: Object.assign({}, base.modules.records, u.plainObject(sourceModules.records)),
        documents: { enabled: config.features.documents && u.plainObject(sourceModules.documents).enabled !== false },
        roadmap: {
          search: u.cleanLine(sourceRoadmap.search, 200),
          state: ["all", "released", "planned", "wishlist"].includes(sourceRoadmap.state) ? sourceRoadmap.state : "all",
          priority: ["all", "1", "2", "3"].includes(String(sourceRoadmap.priority)) ? String(sourceRoadmap.priority) : "all",
          target: sourceRoadmap.target ? u.cleanLine(sourceRoadmap.target, 80) : "all",
          effort: ["all", "1", "2", "3", "4"].includes(String(sourceRoadmap.effort)) ? String(sourceRoadmap.effort) : "all",
          sortBy: ["priority", "target", "effort", "age", "title"].includes(sourceRoadmap.sortBy) ? sourceRoadmap.sortBy : "priority",
          sortDirection: sourceRoadmap.sortDirection === "desc" ? "desc" : "asc"
        },
        cloudSync: {
          enabled: config.features.cloudSync && sourceCloud.enabled !== false,
          owner: CLOUD_TARGET.owner,
          repo: CLOUD_TARGET.repo,
          branch: CLOUD_TARGET.branch,
          path: CLOUD_TARGET.path,
          rememberToken: sourceCloud.rememberToken !== false,
          advancedOpen: sourceCloud.advancedOpen === true,
          baselineTarget: u.cleanLine(sourceCloud.baselineTarget, 800),
          baselineSha: u.cleanLine(sourceCloud.baselineSha, 100),
          baselineHash: u.cleanLine(sourceCloud.baselineHash, 100),
          lastSyncedAt: sourceCloud.lastSyncedAt ? u.ensureIso(sourceCloud.lastSyncedAt, "") : "",
          lastCheckedAt: sourceCloud.lastCheckedAt ? u.ensureIso(sourceCloud.lastCheckedAt, "") : ""
        }
      }
    };
    if (!state.ui.panels.listVisible && !state.ui.panels.detailVisible) state.ui.panels.listVisible = true;
    return state;
  }

  function validate(state) {
    const errors = [];
    const warnings = [];
    if (!state || typeof state !== "object") errors.push("The root value must be an object.");
    if (state.schemaVersion !== config.schemaVersion) errors.push("The state-model version is not supported.");
    if (!state.workspace || !Array.isArray(state.workspace.records) || !Array.isArray(state.workspace.documents)) errors.push("Workspace records or documents are missing.");
    if (state.workspace && !state.workspace.records.length && !state.workspace.documents.length) warnings.push("The backup contains no records or documents.");
    if (state.workspace && state.workspace.records.length >= config.controls.maxRecords) warnings.push("The record limit was reached; extra records were not included.");
    if (state.workspace && state.workspace.documents.length >= config.controls.maxDocuments) warnings.push("The document limit was reached; extra documents were not included.");
    return { ok: errors.length === 0, errors: errors, warnings: warnings };
  }

  function prepare(input) {
    if (input && ("syncFormat" in Object(input) || "syncVersion" in Object(input))) return prepareSync(input);
    const migration = migrate(input);
    const state = normalize(migration.state);
    const validation = validate(state);
    if (!validation.ok) throw new Error(validation.errors.join(" "));
    return { state: state, migrations: migration.applied, validation: validation };
  }

  function touch(state) {
    state.meta.appVersion = config.identity.version;
    state.meta.buildId = config.identity.buildId;
    state.meta.updatedAt = u.isoNow();
    state.meta.lastMutationId = u.uid("mutation");
    return state;
  }

  function resetPreferences(state) {
    const defaults = createDefaultState({ demo: false });
    const next = u.clone(state);
    next.preferences = defaults.preferences;
    next.ui.search = "";
    next.ui.records = defaults.ui.records;
    next.ui.documents = defaults.ui.documents;
    next.ui.panels = defaults.ui.panels;
    next.ui.navigation = defaults.ui.navigation;
    next.ui.dismissedHints = [];
    next.ui.supportTab = "settings";
    next.modules.roadmap = defaults.modules.roadmap;
    next.modules.cloudSync.advancedOpen = false;
    return normalize(touch(next));
  }

  function exportEnvelope(state) {
    return {
      exportFormat: "top-shelf-backup",
      exportedAt: u.isoNow(),
      application: {
        name: config.identity.name,
        version: config.identity.version,
        buildId: config.identity.buildId
      },
      schemaVersion: config.schemaVersion,
      state: normalize(u.clone(state))
    };
  }

  // Cloud data is a complete content snapshot. Empty collections are omitted;
  // their absence still clears that content when a snapshot is downloaded.
  function syncPayload(state) {
    const normalized = normalize(state);
    const data = {};
    const notes = u.richTextToPlainText(normalized.workspace.documents[0].html, config.controls.maxDocumentHtmlLength);
    if (notes) data.notes = notes;
    if (normalized.workspace.movies.length) data.movies = normalized.workspace.movies;
    // Preserve real content from older backups, without exporting empty scaffolding.
    if (normalized.workspace.records.length) data.records = normalized.workspace.records.map(function (record) {
      const item = Object.assign({}, record);
      delete item.createdAt;
      delete item.updatedAt;
      return item;
    });
    return { syncFormat: SYNC_FORMAT, syncVersion: SYNC_VERSION, schemaVersion: SYNC_SCHEMA_VERSION, data: data };
  }

  function syncHash(state) {
    // Prefix separates content hashes from the previous whole-state baselines.
    return "data-v1:" + u.fingerprint(syncPayload(state));
  }

  function prepareSync(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("The GitHub data must be a JSON object.");
    if (!("syncFormat" in input) && !("syncVersion" in input)) {
      return Object.assign({}, prepare(input), { legacy: true });
    }
    const legacyContent = input.syncFormat === SYNC_FORMAT && input.syncVersion === 1 && input.schemaVersion === 5;
    if (!legacyContent && (input.syncFormat !== SYNC_FORMAT || input.syncVersion !== SYNC_VERSION || input.schemaVersion !== SYNC_SCHEMA_VERSION)) throw new Error("This cloud data format is not supported. Update the app before syncing.");
    const data = input.data;
    if (!data || typeof data !== "object" || Array.isArray(data)
      || Object.keys(data).some(function (key) { return !(legacyContent ? ["notes", "records"] : ["notes", "records", "movies"]).includes(key); })
      || ("notes" in data && (typeof data.notes !== "string" || data.notes.length > config.controls.maxDocumentHtmlLength))
      || ("records" in data && (!Array.isArray(data.records) || data.records.length > config.controls.maxRecords))) {
      throw new Error("The cloud file contains invalid or unsupported content.");
    }
    if ((data.records || []).some(function (item) { return !item || typeof item.id !== "string" || !item.id; })) {
      throw new Error("The cloud file contains an invalid saved item.");
    }
    const state = normalize({
      workspace: {
        documents: [{ id: "app-notes", title: "Notes", html: u.escapeHtml(data.notes || "").replace(/\n/g, "<br>") }],
        movies: App.movies.normalizeList(data.movies),
        records: data.records || []
      }
    });
    return { state: state, legacy: legacyContent, migrations: [], validation: validate(state) };
  }

  function applySync(localState, remoteState) {
    const next = normalize(localState);
    const remote = normalize(remoteState);
    next.workspace.documents = remote.workspace.documents;
    next.workspace.records = remote.workspace.records;
    next.workspace.movies = remote.workspace.movies;
    next.meta.tombstones = remote.meta.tombstones;
    return normalize(touch(next));
  }

  function mergeSyncData(localState, remoteState) {
    const local = syncPayload(localState).data;
    const remote = syncPayload(remoteState).data;
    if (local.notes && remote.notes && local.notes !== remote.notes) throw new Error("Notes differ. Choose which copy to keep.");
    const data = {};
    if (local.notes || remote.notes) data.notes = local.notes || remote.notes;
    [["records", "id", config.controls.maxRecords], ["movies", "id", config.controls.maxMovies]].forEach(function (entry) {
      const items = new Map();
      (local[entry[0]] || []).concat(remote[entry[0]] || []).forEach(function (item) {
        const current = items.get(item[entry[1]]);
        if (current && u.stableJson(current) !== u.stableJson(item)) throw new Error("The same saved item differs. Choose which copy to keep.");
        items.set(item[entry[1]], item);
      });
      if (items.size > entry[2]) throw new Error("The combined content exceeds the saved item limit.");
      if (items.size) data[entry[0]] = Array.from(items.values());
    });
    if (data.movies) data.movies = App.movies.normalizeList(data.movies);
    return { syncFormat: SYNC_FORMAT, syncVersion: SYNC_VERSION, schemaVersion: SYNC_SCHEMA_VERSION, data: data };
  }

  function canMerge(localState, remoteState) {
    try { mergeSyncData(localState, remoteState); return true; }
    catch (error) { return false; }
  }

  function merge(localState, remoteState) {
    return applySync(localState, prepareSync(mergeSyncData(localState, remoteState)).state);
  }

  App.stateModel = {
    migrations: migrations,
    createDefaultState: createDefaultState,
    normalize: normalize,
    validate: validate,
    prepare: prepare,
    touch: touch,
    resetPreferences: resetPreferences,
    exportEnvelope: exportEnvelope,
    syncPayload: syncPayload,
    syncHash: syncHash,
    prepareSync: prepareSync,
    applySync: applySync,
    canMerge: canMerge,
    merge: merge
  };
})();
