(function () {
  "use strict";

  const App = window.LocalApp;
  const config = App.config;
  const u = App.utils;
  const model = App.stateModel;
  let currentState;
  let databaseRecovery = null;
  let persistentStorageAvailable = true;
  let lastSavedJson = "";
  let loadReport = { source: "default", migrations: [], warnings: [], recovered: false, error: "" };

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
  }

  function readLocal(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      persistentStorageAvailable = false;
      return null;
    }
  }

  function writeLocal(key, value) {
    try {
      localStorage.setItem(key, value);
      persistentStorageAvailable = true;
      return true;
    } catch (error) {
      persistentStorageAvailable = false;
      emit("app:storageerror", {
        title: error && error.name === "QuotaExceededError" ? "Storage is full" : "Changes are not persistent",
        message: error && error.name === "QuotaExceededError"
          ? "The browser could not save this change. Export a backup, remove unneeded content, or free browser storage."
          : "Browser storage is unavailable. Changes made in this session may be lost.",
        error: error
      });
      return false;
    }
  }

  function removeLocal(key) {
    try { localStorage.removeItem(key); } catch (error) { persistentStorageAvailable = false; }
  }

  // Recovery can exceed localStorage's small per-origin quota. IndexedDB has
  // separate capacity; only a completed transaction counts as a saved backup.
  function recoveryDatabase(operation, value) {
    return new Promise(function (resolve, reject) {
      if (typeof indexedDB === "undefined") { reject(new Error("Recovery database is unavailable.")); return; }
      let blocked = false;
      const request = indexedDB.open(config.storage.recoveryKey + ".database", 1);
      request.onupgradeneeded = function () { request.result.createObjectStore("snapshots"); };
      request.onerror = function () { reject(request.error); };
      request.onblocked = function () { blocked = true; reject(new Error("Recovery database is busy. Close other app tabs and try again.")); };
      request.onsuccess = function () {
        const db = request.result;
        if (blocked) { db.close(); return; }
        const transaction = db.transaction("snapshots", operation === "read" ? "readonly" : "readwrite");
        const store = transaction.objectStore("snapshots");
        const result = operation === "read" ? store.get("recovery") : operation === "clear" ? store.delete("recovery") : store.put(value, "recovery");
        transaction.oncomplete = function () { db.close(); resolve(result.result); };
        transaction.onabort = function () { db.close(); reject(transaction.error || new Error("Recovery could not be saved.")); };
        transaction.onerror = function () { /* onabort handles transaction failures */ };
      };
    });
  }

  async function loadDatabaseRecovery() {
    try {
      const raw = await recoveryDatabase("read");
      databaseRecovery = raw ? { state: model.prepare(raw.state).state, createdAt: raw.createdAt, reason: raw.reason } : null;
    } catch (error) { databaseRecovery = null; }
  }

  async function saveRecoveryAsync(reason, state) {
    const snapshot = { createdAt: u.isoNow(), reason: u.cleanLine(reason || "Before data replacement", 160), state: model.normalize(u.clone(state || getState())) };
    const prior = readLocal(config.storage.recoveryKey), persisted = readLocal(config.storage.stateKey);
    try {
      await recoveryDatabase("write", snapshot);
    } catch (error) {
      return saveRecovery(reason, snapshot.state);
    }
    databaseRecovery = snapshot;
    if (readLocal(config.storage.stateKey) !== persisted) throw new Error("Saved data changed in another tab while making recovery. Reload and check cloud sync again.");
    // Reclaim only the superseded recovery, never library data or credentials.
    if (readLocal(config.storage.recoveryKey) === prior) removeLocal(config.storage.recoveryKey);
    return true;
  }

  function readRecovery() {
    const raw = readLocal(config.storage.recoveryKey);
    if (!raw) return databaseRecovery;
    try {
      const parsed = JSON.parse(raw);
      const prepared = model.prepare(parsed.state || parsed);
      return { state: prepared.state, createdAt: parsed.createdAt || "", reason: parsed.reason || "Recovery snapshot" };
    } catch (error) {
      return databaseRecovery;
    }
  }

  function load() {
    const candidates = [{ key: config.storage.stateKey, label: "current" }].concat(config.storage.legacyKeys.map(function (key) { return { key: key, label: "legacy" }; }));
    let parseError = "";
    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      const raw = readLocal(candidate.key);
      if (!raw) continue;
      try {
        const prepared = model.prepare(JSON.parse(raw));
        currentState = prepared.state;
        loadReport = {
          source: candidate.label,
          migrations: prepared.migrations,
          warnings: prepared.validation.warnings,
          recovered: false,
          error: ""
        };
        lastSavedJson = JSON.stringify(currentState);
        if (candidate.key !== config.storage.stateKey || prepared.migrations.length) saveNow();
        return currentState;
      } catch (error) {
        parseError = error.message || "Saved state could not be read.";
      }
    }

    const recovery = readRecovery();
    if (recovery) {
      currentState = recovery.state;
      loadReport = { source: "recovery", migrations: [], warnings: [], recovered: true, error: parseError };
      saveNow();
      return currentState;
    }

    currentState = model.createDefaultState();
    loadReport = { source: "default", migrations: [], warnings: [], recovered: false, error: parseError };
    saveNow();
    return currentState;
  }

  function getState() {
    if (!currentState) return load();
    return currentState;
  }

  function saveNow() {
    if (!currentState) return false;
    const normalized = model.normalize(currentState);
    currentState = normalized;
    const json = JSON.stringify(normalized);
    if (json === lastSavedJson) return true;
    const saved = writeLocal(config.storage.stateKey, json);
    if (saved) {
      lastSavedJson = json;
      emit("app:statesaved", { bytes: new Blob([json]).size, updatedAt: normalized.meta.updatedAt });
    }
    return saved;
  }

  const scheduleSave = u.debounce(saveNow, config.controls.autosaveDelayMs);

  function mutate(callback, options) {
    const settings = Object.assign({ touch: true, save: true, reason: "change" }, options || {});
    const state = getState();
    callback(state);
    if (settings.touch) model.touch(state);
    currentState = model.normalize(state);
    if (settings.save) scheduleSave();
    emit("app:statechange", { reason: settings.reason, state: currentState });
    return currentState;
  }

  function saveRecovery(reason, state) {
    const snapshot = {
      createdAt: u.isoNow(),
      reason: u.cleanLine(reason || "Before data replacement", 160),
      state: model.normalize(u.clone(state || getState()))
    };
    const value = JSON.stringify(snapshot), prior = readLocal(config.storage.recoveryKey);
    try {
      localStorage.setItem(config.storage.recoveryKey, value);
      persistentStorageAvailable = true;
      return true;
    } catch (firstError) {
      // Some browsers briefly count both values while replacing a large key. Rotate
      // the superseded snapshot, then restore it if the new snapshot still cannot fit.
      if (prior !== null && firstError && firstError.name === "QuotaExceededError") {
        try {
          localStorage.removeItem(config.storage.recoveryKey);
          localStorage.setItem(config.storage.recoveryKey, value);
          persistentStorageAvailable = true;
          return true;
        } catch (retryError) {
          try { localStorage.setItem(config.storage.recoveryKey, prior); } catch (restoreError) { /* current state remains untouched */ }
          return writeLocal(config.storage.recoveryKey, value);
        }
      }
      return writeLocal(config.storage.recoveryKey, value);
    }
  }

  function replace(nextState, options) {
    const settings = Object.assign({ recoveryReason: "Before data replacement", saveRecovery: true, reason: "replace", touch: true }, options || {});
    const prepared = model.prepare(nextState);
    if (settings.saveRecovery && currentState && !saveRecovery(settings.recoveryReason, currentState)) throw new Error("Could not save a recovery copy. Current data was kept.");
    const next = prepared.state;
    if (settings.touch) model.touch(next);
    const json = JSON.stringify(next);
    // Publish live state only after persistence. Explicit pulls may rotate the
    // active key on quota failure; other replacements keep the atomic write.
    let saved = false;
    if (settings.overwriteLocal) {
      const prior = readLocal(config.storage.stateKey);
      try {
        localStorage.setItem(config.storage.stateKey, json);
        saved = true;
      } catch (error) {
        if (error && error.name === "QuotaExceededError") {
          // An explicit cloud pull may free the old library's slot before retrying.
          // Only rotate this key; leave credentials and unrelated storage intact.
          try {
            localStorage.removeItem(config.storage.stateKey);
            localStorage.setItem(config.storage.stateKey, json);
            saved = true;
          } catch (retryError) {
            if (prior !== null) {
              try { localStorage.setItem(config.storage.stateKey, prior); } catch (restoreError) { /* live state remains available */ }
            }
          }
        }
      }
      if (!saved) throw new Error("The GitHub copy could not fit in browser storage even after freeing the local library’s slot. Free browser storage and try pulling again.");
      persistentStorageAvailable = true;
    } else {
      saved = writeLocal(config.storage.stateKey, json);
      if (!saved) throw new Error("The replacement could not fit in browser storage. Current data was kept; the recovery copy is still available. Export a backup before freeing storage.");
    }
    scheduleSave.cancel();
    currentState = next;
    lastSavedJson = json;
    emit("app:statesaved", { bytes: new Blob([json]).size, updatedAt: next.meta.updatedAt });
    emit("app:statechange", { reason: settings.reason, state: currentState });
    return currentState;
  }

  function restoreRecovery() {
    const recovery = readRecovery();
    if (!recovery) throw new Error("No usable recovery snapshot is available.");
    return replace(recovery.state, { saveRecovery: false, reason: "recovery" });
  }

  function recoveryInfo() {
    const recovery = readRecovery();
    if (!recovery) return null;
    return { createdAt: recovery.createdAt, reason: recovery.reason, records: recovery.state.workspace.records.length, documents: recovery.state.workspace.documents.length };
  }

  async function clearAll() {
    if (typeof indexedDB !== "undefined") await recoveryDatabase("clear");
    databaseRecovery = null;
    scheduleSave.cancel();
    [config.storage.stateKey, config.storage.tmdbSecretKey, config.storage.recoveryKey, config.storage.secretKey, config.storage.sessionSecretKey].concat(config.storage.legacyKeys).forEach(removeLocal);
    try { sessionStorage.removeItem(config.storage.sessionSecretKey); sessionStorage.removeItem(config.storage.tmdbSecretKey); } catch (error) { /* unavailable */ }
    lastSavedJson = "";
    currentState = model.createDefaultState({ demo: false });
    saveNow();
    emit("app:statechange", { reason: "erase-all", state: currentState });
    return currentState;
  }

  function setSecret(token, remember) {
    const clean = u.cleanLine(token, 500);
    try {
      if (remember) {
        localStorage.setItem(config.storage.secretKey, clean);
        sessionStorage.removeItem(config.storage.sessionSecretKey);
      } else {
        sessionStorage.setItem(config.storage.sessionSecretKey, clean);
        localStorage.removeItem(config.storage.secretKey);
      }
      return true;
    } catch (error) {
      emit("app:storageerror", { title: "Token was not stored", message: "This browser would not allow per-device token storage.", error: error });
      return false;
    }
  }

  function getSecret() {
    try { return localStorage.getItem(config.storage.secretKey) || sessionStorage.getItem(config.storage.sessionSecretKey) || ""; }
    catch (error) { return ""; }
  }

  function hasSecret() {
    return Boolean(getSecret());
  }

  function clearSecret() {
    removeLocal(config.storage.secretKey);
    try { sessionStorage.removeItem(config.storage.sessionSecretKey); } catch (error) { /* unavailable */ }
  }

  async function usage() {
    const stateJson = JSON.stringify(getState());
    const localBytes = new Blob([stateJson]).size;
    let estimate = null;
    if (navigator.storage && typeof navigator.storage.estimate === "function") {
      try { estimate = await navigator.storage.estimate(); } catch (error) { estimate = null; }
    }
    return {
      stateBytes: localBytes,
      usage: estimate && Number.isFinite(estimate.usage) ? estimate.usage : null,
      quota: estimate && Number.isFinite(estimate.quota) ? estimate.quota : null,
      persistentStorageAvailable: persistentStorageAvailable
    };
  }

  window.addEventListener("pagehide", function () { scheduleSave.flush(); });
  window.addEventListener("beforeunload", function () { scheduleSave.flush(); });

  App.storage = {
    load: load,
    loadDatabaseRecovery: loadDatabaseRecovery,
    saveRecoveryAsync: saveRecoveryAsync,
    getState: getState,
    getLoadReport: function () { return u.clone(loadReport); },
    mutate: mutate,
    replace: replace,
    saveNow: saveNow,
    saveRecovery: saveRecovery,
    restoreRecovery: restoreRecovery,
    recoveryInfo: recoveryInfo,
    clearAll: clearAll,
    setSecret: setSecret,
    getSecret: getSecret,
    hasSecret: hasSecret,
    clearSecret: clearSecret,
    usage: usage,
    isPersistent: function () { return persistentStorageAvailable; }
  };
})();
