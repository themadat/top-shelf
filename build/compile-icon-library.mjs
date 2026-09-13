#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { orderSvgPaint } from "./order-svg-paint.mjs";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceParent = path.dirname(projectRoot);
const outputDirectory = path.join(projectRoot, "assets/js");
const outputFile = path.join(outputDirectory, "icon-library.js");
const outputPartFiles = Array.from({ length: 4 }, function (_, index) { return path.join(outputDirectory, "icon-library-part-" + (index + 1) + ".js"); });
const generatedOutputFiles = new Set(outputPartFiles.concat(outputFile).map(function (file) { return path.resolve(file); }));
const overrideFile = path.join(projectRoot, "build/icon-library-overrides.json");
const requestedRoots = process.argv.slice(2);
const seedFile = process.env.APP_TEMPLATE_ICON_SEED || outputFile;
const NATIVE_WEIGHT_SOURCE_BY_FOLDER = new Map([
  ["All 1 Ultralight", { name: "all-1-ultrathin", weight: "ultralight" }],
  ["All 1 Ultrathin", { name: "all-1-ultrathin", weight: "ultralight" }],
  ["All 3 Light", { name: "all-3-light", weight: "light" }],
  ["All 5 Medium", { name: "all-5-medium", weight: "medium" }],
  ["All 7 Bold", { name: "all-7-bold", weight: "bold" }],
  ["All 9 Black", { name: "all-9-black", weight: "black" }]
]);
const NATIVE_WEIGHT_BY_SOURCE_NAME = new Map(Array.from(NATIVE_WEIGHT_SOURCE_BY_FOLDER.values()).map(function (source) { return [source.name, source.weight]; }));
// Approved source aliases only; visually identical native-name pairs stay separate.
const SF_SYMBOL_CANONICAL_NAME = new Map([
  ["2_h_circle", "2h_circle"],
  ["4_a_circle", "4a_circle"],
  ["4_h_circle", "4h_circle"],
  ["4_l_circle", "4l_circle"],
  ["123", "numbers"],
  ["a_z", "textformat_characters"],
  ["abc", "characters_uppercase"],
  ["bake_updated_index", "oven_fill"],
  ["battery_100_percent_circle", "battery_100percent_circle"],
  ["building_columns_circle", "building_classical_columns_circle"],
  ["bullet_clipboard_fill", "list_bullet_clipboard_fill"],
  ["circle_grid_3_x3_circle", "circle_grid_3x3_circle"],
  ["compressed_table", "rectangle_expand_diagonal"],
  ["data_source_notes", "info_circle"],
  ["dismiss", "xmark"],
  ["drink_coffee", "cup_and_saucer_fill"],
  ["drink_water", "drop_fill"],
  ["drink_wine", "wineglass_fill"],
  ["editor_amp_legend", "pencil"],
  ["eye_off", "eye_slash"],
  ["fit_view", "viewfinder"],
  ["hide_medals", "medal_fill"],
  ["hide_non_participants", "checkmark_seal_fill"],
  ["hide_play", "percent"],
  ["hide_qp", "number_sign"],
  ["highlight_by_confederation", "inset_filled_center_rectangle"],
  ["light_mode", "sun_max_fill"],
  ["macwindow_and_pointer_arrow", "interface_window_and_pointer_arrow"],
  ["music_microphone_circle", "microphone_dynamic_on_stand_circle"],
  ["my_bar", "waterbottle_fill"],
  ["number", "number_sign"],
  ["number_circle", "number_sign_circle"],
  ["rectangle_grid_1_x2_fill", "rectangle_grid_1x2_fill"],
  ["rectangle_grid_1_x3_fill", "rectangle_grid_1x3_fill"],
  ["rectangle_split_3_x1", "rectangle_split_3x1"],
  ["relationship_delete", "person_2_badge_minus_fill"],
  ["relationship_edit", "person_2_badge_gearshape_fill"],
  ["rotate_3_d_circle", "rotate_3d_circle"],
  ["settings", "gearshape_fill"],
  ["square_3_layers_3_d", "square_3_layers_3d"],
  ["square_3_layers_3_d_bottom_filled", "square_3_layers_3d_bottom_filled"],
  ["square_3_layers_3_d_middle_filled", "square_3_layers_3d_middle_filled"],
  ["square_3_layers_3_d_top_filled", "square_3_layers_3d_top_filled"],
  ["square_fill_text_grid_1_x2", "square_fill_text_grid_1x2"],
  ["square_grid_2_x2", "square_grid_2x2"],
  ["square_grid_3_x1_below_line_grid_1_x2_fill", "square_grid_3x1_below_line_grid_1x2_fill"],
  ["square_grid_3_x1_folder_fill_badge_plus", "square_grid_3x1_folder_fill_badge_plus"],
  ["square_grid_4_x3_fill", "square_grid_4x3_fill"],
  ["text_and_command_macwindow", "text_and_command_interface_window"],
  ["view_data_json", "ellipsis_curlybraces"]
]);

function sourceForRoot(root) {
  const resolved = path.resolve(root);
  const nativeWeightSource = NATIVE_WEIGHT_SOURCE_BY_FOLDER.get(path.basename(resolved));
  return Object.assign({ name: path.basename(resolved), root: resolved }, nativeWeightSource || {});
}

function readExistingCatalog() {
  if (!fs.existsSync(seedFile)) return [];
  try {
    const sandbox = { window: { LocalApp: {} } };
    const files = seedFile === outputFile && outputPartFiles.every(function (file) { return fs.existsSync(file); }) ? outputPartFiles.concat(outputFile) : [seedFile];
    files.forEach(function (file) { vm.runInNewContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file }); });
    return Array.isArray(sandbox.window.LocalApp.iconLibrary?.icons) ? sandbox.window.LocalApp.iconLibrary.icons : [];
  } catch (error) {
    process.stderr.write("Could not retain the existing compiled catalog: " + error.message + "\n");
    return [];
  }
}

const existingCatalog = readExistingCatalog();
const existingIdByName = new Map();
const existingIdByHash = new Map();
existingCatalog.forEach(function (icon) {
  const hash = crypto.createHash("sha256").update(canonicalSvg(String(icon.svg || ""))).digest("hex").slice(0, 12);
  if (hash && !existingIdByHash.has(hash)) existingIdByHash.set(hash, icon.id);
  [icon.name].concat(Array.isArray(icon.aliases) ? icon.aliases : []).filter(Boolean).forEach(function (name) {
    if (!existingIdByName.has(name)) existingIdByName.set(name, icon.id);
  });
});

function discoverDefaultSources() {
  const discovered = fs.readdirSync(sourceParent, { withFileTypes: true }).filter(function (entry) {
    return entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "backups" && entry.name !== "!backups:data";
  }).map(function (entry) {
    return { name: entry.name, root: path.join(sourceParent, entry.name) };
  });
  [
    { name: "objects-tools", folder: "Objects & Tools" },
    { name: "norway-sweden", folder: "norway:sweden" },
    { name: "indices", folder: "indicies" },
    { name: "Rest", folder: "Rest" },
    { name: "all-1-ultrathin", folder: "All 1 Ultralight", weight: "ultralight" },
    { name: "all-3-light", folder: "All 3 Light", weight: "light" },
    { name: "all-5-medium", folder: "All 5 Medium", weight: "medium" },
    { name: "all-7-bold", folder: "All 7 Bold", weight: "bold" },
    { name: "all-9-black", folder: "All 9 Black", weight: "black" }
  ].forEach(function (source) {
    const root = path.join(sourceParent, "!backups:data", "icons", "app-input", source.folder);
    if (fs.existsSync(root)) discovered.push({ name: source.name, root: root, weight: source.weight || "" });
  });
  return discovered.sort(function (a, b) { return a.name.localeCompare(b.name); });
}

const sources = requestedRoots.length ? requestedRoots.map(function (root) {
  return sourceForRoot(root);
}) : discoverDefaultSources();

const TEXT_EXTENSIONS = new Set([".cjs", ".html", ".htm", ".js", ".jsx", ".md", ".mjs", ".ts", ".tsx"]);
const SKIP_DIRECTORIES = new Set([".git", "dist", "node_modules"]);
const MAX_STANDALONE_SVG_BYTES = 256 * 1024;
const FORBIDDEN_SVG = /<(?:script|foreignObject)\b|javascript\s*:|\son[a-z]+\s*=/i;
const FORBIDDEN_REFERENCE = /(?:href|xlink:href)\s*=\s*["'](?!#)|@import\b|url\(\s*["']?(?:https?:|\/\/)/i;
const recordsByHash = new Map();
const sfRecordsByName = new Map();
const iconRecords = new Set();
const nativeWeightVariants = [];
const stats = { files: 0, extracted: 0, nativeWeightVariants: 0, templateLiterals: 0, inlineMarkup: 0, standalone: 0, rejected: 0, skippedOversized: 0, skippedGenerated: 0, mergedBySfName: 0 };

function walk(root) {
  const files = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name.startsWith(".") && entry.isDirectory()) continue;
      if (entry.isDirectory() && SKIP_DIRECTORIES.has(entry.name)) continue;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(absolute);
      else files.push(absolute);
    }
  }
  return files.sort();
}

function cleanSvg(svg) {
  let value = String(svg || "").trim();
  const start = value.search(/<svg\b/i);
  const end = value.toLowerCase().lastIndexOf("</svg>");
  if (start >= 0 && end >= start) value = value.slice(start, end + 6);
  value = value.replace(/\r\n?/g, "\n").replace(/[ \t]+$/gm, "");
  if (!/^<svg\b[\s\S]*<\/svg>$/i.test(value) || FORBIDDEN_SVG.test(value) || FORBIDDEN_REFERENCE.test(value) || value.includes("${")) return "";
  value = value.replace(/\s(?:aria-hidden|focusable)=(?:"[^"]*"|'[^']*')/gi, "");
  // Retained catalog artwork already has a scope. Keep it intact across rebuilds.
  const alreadyScoped = /^<svg\b[^>]*\sdata-icon-style-scope="[a-f0-9]{12}"/i.test(value);
  const embeddedStyles = Array.from(value.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi));
  if (embeddedStyles.length && !alreadyScoped) {
    const scope = crypto.createHash("sha256").update(value).digest("hex").slice(0, 12);
    const prefix = '[data-icon-style-scope="' + scope + '"]';
    value = value.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, function (_, attributes, css) {
      const cdataStart = css.match(/^\s*<!\[CDATA\[/)?.[0] || "";
      const cdataEnd = css.match(/\]\]>\s*$/)?.[0] || "";
      const rules = css.slice(cdataStart.length, cdataEnd ? -cdataEnd.length : undefined);
      const scopedRules = rules.replace(/(^|[{}])(\s*)(?!@)([^{}]*?)(\s*)\{/g, function (match, boundary, whitespace, selectorText, trailingWhitespace) {
        const selectors = selectorText.trim();
        if (!selectors) return match;
        return boundary + whitespace + selectors.split(",").map(function (selector) { return prefix + " " + selector.trim(); }).join(", ") + trailingWhitespace + "{";
      });
      return "<style" + attributes + ">" + cdataStart + scopedRules + cdataEnd + "</style>";
    });
    value = value.replace(/^<svg\b/i, '<svg data-icon-style-scope="' + scope + '"');
  }
  value = value.replace(/^<svg\b([^>]*)>/i, '<svg$1 aria-hidden="true" focusable="false">');
  return value;
}

function normalizeSfSymbolPaint(svg) {
  return svg.replace(/\sfill=(["'])(?:white|black|#fff(?:fff)?|#000(?:000)?)\1/gi, ' fill="currentColor"');
}

function canonicalSvg(svg) {
  return svg
    .replace(/\sclass=(?:"sf-symbol"|'sf-symbol')/gi, "")
    .replace(/\sdata-icon-style-scope=(?:"[^"]*"|'[^']*')/gi, "")
    .replace(/\[data-icon-style-scope=(?:"[^"]*"|'[^']*')\]\s*/gi, "")
    .replace(/\s(?:aria-hidden|focusable)=(?:"[^"]*"|'[^']*')/gi, "")
    .replace(/>\s+</g, "><")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedName(rawName) {
  let name = String(rawName || "").replace(/^_+/, "");
  if (name.includes("__")) name = name.split("__").filter(Boolean).pop();
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase() || "unnamed_icon";
}

function labelFor(name) {
  const label = name.split("_").filter(Boolean).map(function (part) {
    if (/^\d+x\d+$/.test(part)) return part;
    return part.charAt(0).toUpperCase() + part.slice(1);
  }).join(" ");
  return cleanIconLabel(label) || "Icon";
}

function cleanIconLabel(value) {
  return String(value || "")
    .replace(/\bsvg\s*repo\s*com\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ICON_CATEGORIES = [
  { id: "accessibility", label: "Accessibility", terms: ["accessibility", "assistive", "braille", "ear", "figure", "voiceover", "wheelchair"] },
  { id: "arrows", label: "Arrows", section: "appearance", terms: [] },
  { id: "arrows-chevron", label: "Chevron", parent: "arrows", terms: [] },
  { id: "arrows-triangle", label: "Triangle", parent: "arrows", terms: [] },
  { id: "arrows-chevron-arrow", label: "Chevron Arrow", parent: "arrows", terms: [] },
  { id: "arrows-triangle-arrow", label: "Triangle Arrow", parent: "arrows", terms: [] },
  { id: "branding", label: "Apps & Branding", terms: ["favicon", "logo", "splash", "safari", "appclip"] },
  { id: "celebrations-awards", label: "Celebrations & Awards", terms: ["award", "balloon", "birthday", "cake", "fireworks", "flag", "gift", "medal", "party", "rosette", "trophy"] },
  { id: "communication", label: "Communication", terms: ["message", "chat", "bubble", "mail", "envelope", "paperplane", "phone", "call", "megaphone", "bell", "notification", "mention"] },
  { id: "commerce", label: "Commerce", terms: ["cart", "bag", "basket", "credit", "currency", "dollar", "bank", "wallet", "gift", "receipt", "tag"] },
  { id: "clothing-personal", label: "Clothing & Personal Items", terms: ["backpack", "briefcase", "coat", "comb", "eyeglasses", "handbag", "hanger", "hat", "jacket", "shoe", "suitcase", "sunglasses", "tshirt", "watch"] },
  { id: "devices", label: "Devices & Connectivity", terms: ["desktop", "desktopcomputer", "laptop", "computer", "tablet", "iphone", "ipad", "mobile", "smartphone", "candybarphone", "flipphone", "watch", "applewatch", "keyboard", "mouse", "computermouse", "magicmouse", "printer", "display", "monitor", "television", "tv", "appletv", "airpod", "airpods", "earpods", "beats", "homepod", "hifispeaker", "ipod", "macbook", "macmini", "macpro", "macstudio", "vision pro", "xserve", "airtag", "applepencil", "magsafe", "audio jack", "cable connector", "antenna", "bonjour", "cellularbars", "hotspot", "personalhotspot", "radiowaves", "wifi", "fibrechannel"] },
  { id: "development", label: "Development", terms: ["applescript", "arkit", "developer", "programming", "swift", "swiftdata"] },
  { id: "cloud-server", label: "Cloud & Drive", terms: ["cloud", "icloud", "server", "drive", "externaldrive", "internaldrive", "opticaldiscdrive", "storage", "database", "network"] },
  { id: "documents", label: "Documents", terms: ["document", "doc", "file", "folder", "page", "paper", "note", "clipboard", "book", "text", "list", "archive", "archivebox", "bookmark", "data", "json"] },
  { id: "editing", label: "Editing", terms: ["edit", "pencil", "pen", "highlight", "highlighter", "crop", "scissors", "ruler", "paint", "eyedropper", "slider", "textformat", "editor", "legend"] },
  { id: "text-formatting", label: "Text Formatting", parent: "editing", terms: ["abc", "a z", "bold", "italic", "underline", "strikethrough", "paragraphsign", "quotelevel", "indent", "kashida", "fleuron", "textbox", "uppercase", "lowercase", "phonetic"] },
  { id: "education-science", label: "Education & Science", terms: ["atom", "book", "books", "flask", "graduationcap", "gyroscope", "level", "microscope", "scalemass", "school", "science", "studentdesk", "testtube", "university"] },
  { id: "energy-power", label: "Energy & Power", terms: ["alternatingcurrent", "battery", "charge", "charging", "directcurrent", "electricity", "energy", "hydrogen", "power", "powercord", "powermeter", "poweroutlet", "powerplug"] },
  { id: "food-drink", label: "Food & Drink", terms: ["bar", "cocktail", "drink", "glass", "wine", "wineglass", "beer", "cup", "mug", "fork", "knife", "spoon", "food", "restaurant", "bottle", "coffee"] },
  { id: "health", label: "Health", terms: ["heart", "medical", "medicine", "pill", "bandage", "stethoscope", "health", "hospital", "fitness", "dumbbell"] },
  { id: "home-appliances", label: "Home & Appliances", terms: ["conditioner", "purifier", "bathtub", "blinds", "cabinet", "chair", "chandelier", "contact sensor", "cooktop", "curtains", "dehumidifier", "dishwasher", "door", "dryer", "fan", "fireplace", "heater", "house", "humidifier", "lamp", "light", "lightswitch", "microwave", "oven", "pipe", "refrigerator", "roller shade", "roman shade", "sensor", "shower", "sink", "sofa", "spigot", "sprinkler", "stairs", "stove", "toilet", "vacuum", "washer"] },
  { id: "indices", label: "Indices", terms: ["index", "indices"] },
  { id: "interface", label: "Interface", terms: ["menu", "sidebar", "toolbar", "window", "panel", "grid", "ellipsis", "gear", "gearshape", "settings", "magnifyingglass", "search", "filter", "sort", "terminal", "curlybraces", "widget", "dock", "menubar", "inset", "gauge", "target", "swatchpalette", "chart", "table", "fit", "mode", "lightbulb", "line", "link", "pip", "view", "dismiss", "hide", "trash", "bin", "wrench"] },
  { id: "keyboard", label: "Keyboard", terms: ["keyboard", "command", "control", "option", "shift", "capslock", "escape", "return", "delete", "fn"] },
  { id: "geography", label: "Geography", terms: [] },
  { id: "geography-countries", label: "Countries", parent: "geography", terms: [] },
  { id: "geography-regions", label: "Regions", parent: "geography", terms: [] },
  { id: "geography-mapping", label: "Mapping", parent: "geography", terms: [] },
  { id: "geography-places", label: "Places", parent: "geography", terms: [] },
  { id: "math", label: "Math", terms: ["123", "function", "sum", "number", "percent", "divide", "multiply", "equal", "greaterthan", "lessthan", "plusminus", "radical"] },
  { id: "media", label: "Entertainment & Media", terms: ["play", "pause", "stop", "video", "camera", "photo", "livephoto", "pano", "spatial capture", "slowmo", "timelapse", "image", "music", "speaker", "hifispeaker", "homepod", "airplay audio", "airpod", "airpods", "earpods", "beats", "volume", "microphone", "waveform", "record", "recordingtape"] },
  { id: "nature", label: "Nature", terms: ["nature", "mountain", "water", "volcano"] },
  { id: "animals-plants", label: "Animals & Plants", parent: "nature", terms: ["leaf", "tree", "flower", "plant", "animal", "dog", "cat", "bird", "fish", "dinosaur", "raptor", "velociraptor"] },
  { id: "weather", label: "Weather", parent: "nature", terms: ["sun", "cloud", "rain", "snow", "wind", "temperature", "moon", "bolt", "lightning"] },
  { id: "objects-tools", label: "Objects & Tools", terms: ["object", "tool", "hammer", "wrench", "screwdriver", "flashlight", "lamp", "chair", "sofa", "bed", "toilet", "key", "suitcase", "briefcase", "watch", "clock", "shoe", "scissors", "ruler", "paintbrush", "basket", "box", "shippingbox", "mug", "cup"] },
  { id: "rays-sparkles", label: "Rays & Sparkles", section: "appearance", terms: ["ray", "rays", "laser", "burst", "sparkle", "sparkles"] },
  { id: "people", label: "People", terms: [] },
  { id: "recreation", label: "Recreation", terms: [] },
  { id: "recreation-games", label: "Games", parent: "recreation", terms: ["game", "meeple", "die", "dice", "castle", "abbey", "wizard", "witch", "mage", "fairy", "elf", "dragon", "sheep", "wolf", "robber", "princess", "knight", "spartan", "crown", "medieval", "ringmaster", "pigsty", "baazar", "vineyard", "arcade", "gamecontroller", "dpad", "joystick", "puzzlepiece", "teddybear", "suit club", "suit spade"] },
  { id: "recreation-sport", label: "Sport", parent: "recreation", terms: ["baseball", "basketball", "cricket", "football", "hockey", "oar", "rugbyball", "skateboard", "skis", "snowboard", "soccerball", "sport", "surfboard", "tennis", "trophy", "volleyball"] },
  { id: "security", label: "Privacy & Security", terms: ["lock", "key", "shield", "privacy", "secure", "password", "faceid", "touchid", "eye off"] },
  { id: "shapes", label: "Shapes", section: "appearance", terms: ["circle", "square", "rectangle", "triangle", "righttriangle", "diamond", "hexagon", "pentagon", "octagon", "oval", "capsule", "cone", "cube", "cylinder", "pyramid", "torus", "squareshape", "shape", "ring"] },
  { id: "building", label: "Building", section: "appearance", terms: ["building"] },
  { id: "badged", label: "Badged", section: "appearance", terms: ["badge", "trianglebadge", "circlebadge"] },
  { id: "badged-badge", label: "Badge", parent: "badged", terms: ["badge"] },
  { id: "badged-airplane", label: "Airplane", parent: "badged", terms: ["airplane"] },
  { id: "badged-arrow", label: "Arrow", parent: "badged", terms: ["arrow"] },
  { id: "badged-automatic", label: "Automatic", parent: "badged", terms: ["automatic"] },
  { id: "badged-bolt", label: "Bolt", parent: "badged", terms: ["bolt"] },
  { id: "badged-camera", label: "Camera", parent: "badged", terms: ["camera"] },
  { id: "badged-checkmark", label: "Checkmark", parent: "badged", terms: ["checkmark"] },
  { id: "badged-chevron", label: "Chevron", parent: "badged", terms: ["chevron"] },
  { id: "badged-clock", label: "Clock", parent: "badged", terms: ["clock"] },
  { id: "badged-creditcard", label: "Credit Card", parent: "badged", terms: ["creditcard"] },
  { id: "badged-ellipsis", label: "Ellipsis", parent: "badged", terms: ["ellipsis"] },
  { id: "badged-exclamationmark", label: "Exclamation Mark", parent: "badged", terms: ["exclamationmark"] },
  { id: "badged-exclamationmark-circle", label: "Circle", parent: "badged-exclamationmark", terms: ["circle"] },
  { id: "badged-exclamationmark-triangle", label: "Triangle", parent: "badged-exclamationmark", terms: ["triangle"] },
  { id: "badged-eye", label: "Eye", parent: "badged", terms: ["eye"] },
  { id: "badged-gauge", label: "Gauge", parent: "badged", terms: ["gauge"] },
  { id: "badged-gearshape", label: "Gear", parent: "badged", terms: ["gearshape"] },
  { id: "badged-icloud", label: "iCloud", parent: "badged", terms: ["icloud"] },
  { id: "badged-key", label: "Key", parent: "badged", terms: ["key"] },
  { id: "badged-location", label: "Location", parent: "badged", terms: ["location"] },
  { id: "badged-lock", label: "Lock", parent: "badged", terms: ["lock"] },
  { id: "badged-magnifyingglass", label: "Magnifying Glass", parent: "badged", terms: ["magnifyingglass"] },
  { id: "badged-microphone", label: "Microphone", parent: "badged", terms: ["microphone"] },
  { id: "badged-minus", label: "Minus", parent: "badged", terms: ["minus"] },
  { id: "badged-moon", label: "Moon", parent: "badged", terms: ["moon"] },
  { id: "badged-pause", label: "Pause", parent: "badged", terms: ["pause"] },
  { id: "badged-person", label: "Person", parent: "badged", terms: ["person"] },
  { id: "badged-play", label: "Play", parent: "badged", terms: ["play"] },
  { id: "badged-plus", label: "Plus", parent: "badged", terms: ["plus"] },
  { id: "badged-questionmark", label: "Question Mark", parent: "badged", terms: ["questionmark"] },
  { id: "badged-record", label: "Record", parent: "badged", terms: ["record"] },
  { id: "badged-shapes", label: "Shapes", parent: "badged", terms: [] },
  { id: "badged-shapes-shield", label: "Shield", parent: "badged-shapes", terms: ["shield"] },
  { id: "badged-shapes-triangle", label: "Triangle", parent: "badged-shapes", terms: ["triangle"] },
  { id: "badged-snowflake", label: "Snowflake", parent: "badged", terms: ["snowflake"] },
  { id: "badged-sparkles", label: "Sparkles", parent: "badged", terms: ["sparkles"] },
  { id: "badged-star", label: "Star", parent: "badged", terms: ["star"] },
  { id: "badged-steeringwheel", label: "Steering Wheel", parent: "badged", terms: ["steeringwheel"] },
  { id: "badged-timemachine", label: "Time Machine", parent: "badged", terms: ["timemachine"] },
  { id: "badged-video", label: "Video", parent: "badged", terms: ["video"] },
  { id: "badged-waveform", label: "Waveform", parent: "badged", terms: ["waveform"] },
  { id: "badged-wifi", label: "Wi-Fi", parent: "badged", terms: ["wifi"] },
  { id: "badged-xmark", label: "Xmark", parent: "badged", terms: ["xmark"] },
  { id: "squared", label: "Squared", section: "appearance", terms: ["square"] },
  { id: "circled", label: "Circled", section: "appearance", terms: ["circle"] },
  { id: "dashed-dotted", label: "Dashed & Dotted", section: "appearance", terms: ["dashed", "dotted"] },
  { id: "layered-stacked", label: "Layered & Stacked", section: "appearance", terms: ["layer", "layers", "layered", "stack", "stacked"] },
  { id: "slashed", label: "Slashed", section: "appearance", terms: ["slash", "slashed"] },
  { id: "status", label: "Status", terms: ["check", "checkmark", "xmark", "close", "exclamation", "exclamationmark", "warning", "warninglight", "hazardsign", "info", "question", "questionmark", "error", "success", "badge", "medal", "progress indicator", "purchased"] },
  { id: "time", label: "Time", terms: ["clock", "calendar", "timer", "hourglass", "alarm", "date"] },
  { id: "transportation", label: "Transportation", terms: ["car", "bus", "train", "tram", "plane", "airplane", "boat", "ferry", "bicycle", "scooter", "vehicle", "transportation"] },
  { id: "transportation-automotive", label: "Automotive", parent: "transportation", terms: [] }
];

const ICON_CATEGORY_ALIASES = new Map([
  ["actions", "interface"],
  ["maps-travel", "geography"],
  ["maps", "geography-mapping"],
  ["locations", "geography"],
  ["locations-countries", "geography-countries"],
  ["locations-regions", "geography-regions"],
  ["locations-mapping", "geography-mapping"],
  ["locations-places", "geography-places"],
  ["games", "recreation-games"],
  ["sports-recreation", "recreation-sport"],
  ["norway-sweden", "commerce"],
  ["rays", "rays-sparkles"],
  ["sparkled", "rays-sparkles"],
  ["badged-shield", "badged-shapes-shield"]
]);
const ICON_CATEGORY_BY_ID = new Map(ICON_CATEGORIES.map(function (category) { return [category.id, category]; }));

const OBJECT_TOOL_CATEGORY_RULES = [
  { id: "accessibility", terms: ["eyeglasses"] },
  { id: "celebrations-awards", terms: ["balloon", "birthday cake", "fireworks", "flag", "party popper", "rosette", "trophy"] },
  { id: "clothing-personal", terms: ["coat", "comb", "eyeglasses", "handbag", "hanger", "hat", "jacket", "shoe", "suitcase", "sunglasses", "tshirt"] },
  { id: "communication", terms: ["faxmachine", "greetingcard", "horn"] },
  { id: "commerce", terms: ["briefcase", "case", "coat", "creditcard", "handbag", "hat", "jacket", "shippingbox", "shoe", "suitcase", "ticket", "tshirt"] },
  { id: "devices", terms: ["air conditioner", "air purifier", "airpods", "amplifier", "battery", "batteryblock", "beats headphones", "cpu", "dehumidifier", "dishwasher", "drone", "dryer", "earbud", "earbuds", "esim", "fan", "faxmachine", "flashlight", "gamecontroller", "gyroscope", "headphones", "headset", "heater", "hifireceiver", "humidifier", "lamp", "laser", "light", "memorychip", "microwave", "opticaldisc", "oven", "powercord", "poweroutlet", "powerplug", "radio", "refrigerator", "robotic vacuum", "scanner", "sdcard", "simcard", "stove", "videoprojector", "washer"] },
  { id: "documents", terms: ["books", "briefcase", "greetingcard", "lanyardcard", "magazine", "menucard", "newspaper", "pad header", "paperclip", "scroll", "shippingbox", "tray"] },
  { id: "editing", terms: ["comb", "hammer", "level", "paintpalette", "scalemass", "screwdriver", "theatermask and paintbrush"] },
  { id: "education-science", terms: ["books", "flask", "graduationcap", "gyroscope", "level", "scalemass", "studentdesk", "testtube"] },
  { id: "food-drink", terms: ["birthday cake", "cooktop", "dishwasher", "frying pan", "menucard", "microwave", "oven", "pizza slice", "popcorn", "refrigerator", "stove", "tray", "waterbottle"] },
  { id: "recreation-games", terms: ["arcade stick", "die face", "gamecontroller", "puzzlepiece", "teddybear", "theatermasks"] },
  { id: "recreation-sport", terms: ["american football", "australian football", "baseball", "basketball", "cricket ball", "hockey puck", "oar", "rugbyball", "skateboard", "skis", "snowboard", "soccerball", "surfboard", "tennis racket", "tennisball", "trophy", "volleyball"] },
  { id: "health", terms: ["air purifier", "comb", "eyeglasses", "fire extinguisher", "flask", "fluid", "inhaler", "lifepreserver", "testtube"] },
  { id: "home-appliances", terms: ["air conditioner", "air purifier", "bathtub", "cabinet", "chair", "chandelier", "cooktop", "dehumidifier", "dishwasher", "door", "dryer", "fan", "fireplace", "heater", "house", "humidifier", "lamp", "light", "microwave", "oven", "refrigerator", "robotic vacuum", "shower", "sink", "sofa", "spigot", "sprinkler", "stove", "toilet", "washer"] },
  { id: "interface", terms: ["cube", "drop keypad", "entry lever keypad", "level", "rosette", "tray"] },
  { id: "geography-places", terms: ["house", "pedestrian gate", "tent"] },
  { id: "math", terms: ["gyroscope", "level", "scalemass"] },
  { id: "media", terms: ["airpods", "amplifier", "beats headphones", "earbud", "earbuds", "film", "guitars", "headphones", "headset", "hifireceiver", "horn", "metronome", "movieclapper", "opticaldisc", "pianokeys", "radio", "suitcase rolling and film", "theatermask", "tuningfork", "videoprojector"] },
  { id: "animals-plants", terms: ["pet carrier"] },
  { id: "security", terms: ["batteryblock stack trianglebadge", "door", "entry lever", "fire extinguisher", "flashlight", "helmet", "latch", "lifepreserver", "pedestrian gate"] },
  { id: "status", terms: ["balloon", "battery", "batteryblock", "fireworks", "flag", "party popper", "rosette", "trophy"] },
  { id: "time", terms: ["metronome"] },
  { id: "transportation", terms: ["drone", "helmet", "lifepreserver", "oar", "oilcan", "skateboard", "skis", "snowboard", "stroller", "suitcase", "surfboard"] },
  { id: "weather", terms: ["air conditioner", "air purifier", "barometer", "beach umbrella", "dehumidifier", "fan", "fireplace", "heater", "humidifier", "sprinkler", "umbrella"] }
];

const REST_CATEGORY_RULES = [
  { id: "transportation-automotive", pattern: /(?:^|_)(?:abs|autostartstop|axle|brakesignal|carseat|convertible|engine|gearshift|glowplug|headlight|lane|mirror_side|paddleshifter|parkinglight|parkingsign|pedal|pickup|retarder|steeringwheel|suspension|suv|tachometer|taillight|tire|tirepressure|tow_hitch|transmission|truck_side|vent_airflow|windshield)(?:_|$)|^(?:2h|4a|4h|4l|kph|mph)$|^(?:air|wave_3_down)_(?:convertible|pickup|suv)_side(?:_|$)|(?:^|_)electronic_toll_collection(?:_|$)|(?:^|_)thermometer_(?:brakesignal|tirepressure|transmission)(?:_|$)/ },
  { id: "commerce", pattern: /(?:^|_)(?:banknote|barcode|creditcard|giftcard|purchased|qrcode|storefront)(?:_|$)|(?:currency|dollar|cent|austral|australiandollar|baht|bitcoin|brazilianreal|cedi|coloncurrency|cruzeiro|danishkrone|dinar|dong|euro|eurozone|florin|franc|guarani|hryvnia|indianrupee|kip|lari|lira|malaysianringgit|manat|mill|naira|peruviansoles|peseta|peso|polishzloty|ruble|rupee|shekel|singaporedollar|sterling|tenge|tugrik|turkishlira|won|yen)sign(?:_|$)/ },
  { id: "development", pattern: /(?:^|_)(?:apple_intelligence|apple_terminal|apple_writing_tools|applescript|appclip|arkit|curlybraces|f_cursive|finder|flowchart|fx|helm|parentheses|swift|swiftdata)(?:_|$)/ },
  { id: "energy-power", pattern: /(?:^|_)(?:alternatingcurrent|directcurrent|glowplug|hydrogen|magsafe_batterypack|power|powermeter|poweron|poweroutlet|togglepower)(?:_|$)/ },
  { id: "recreation-games", pattern: /(?:^|_)(?:dpad|joystick)(?:_|$)|^(?:l|r|lb|lm|lsb|lt|m|p|pl|pr|rb|rm|rsb|rt|zl|zr)\d?_button(?:_|$)|(?:^|_)suit_(?:club|spade)(?:_|$)/ },
  { id: "recreation-sport", pattern: /(?:^|_)sportscourt(?:_|$)/ },
  { id: "home-appliances", pattern: /(?:^|_)(?:apple_homekit|blinds|contact_sensor|curtains|lightswitch|pipe_and_drop|roller_shade|roman_shade|sensor|stairs|switch_programmable)(?:_|$)/ },
  { id: "devices", pattern: /(?:^|_)(?:airtag|applepencil|appletvremote|audio_jack|av_remote|cable_coaxial|cable_connector|deskview|digitalcrown|mediastick|opticid|pc|vision_pro|watchface)(?:_|$)/ },
  { id: "media", pattern: /^(?:burn)$|(?:^|_)(?:apple_classical|apple_podcasts|airplay_audio|livephoto|memories|pano|recordingtape|shareplay|slowmo|spatial_capture|timelapse)(?:_|$)/ },
  { id: "editing", pattern: /(?:^|_)(?:apple_writing_tools|applepencil|eyebrow|filemenu|lines_measurement|lineweight|placeholdertext|quote_closing|quote_opening|relationship_edit|translate)(?:_|$)/ },
  { id: "interface", pattern: /(?:^|_)(?:app_background|app_dashed|app_shadow|app_specular|app_translucent|appwindow|arrowkeys|button_horizontal|button_vertical|deskview|dot_crosshair|dot_squareshape|dot_viewfinder|filemenu|flowchart|mosaic|progress_indicator|restart|squares_below|squares_leading|switch_2|tablecells|togglepower|uiwindow|viewfinder)(?:_|$)/ },
  { id: "math", pattern: /(?:^|_)(?:asterisk|f_cursive|fx|lines_measurement|parentheses|plus_minus|righttriangle)(?:_|$)/ },
  { id: "text-formatting", pattern: /^(?:k)$/ },
  { id: "communication", pattern: /^(?:at|sharedwithyou|shareplay)$/ },
  { id: "security", pattern: /(?:^|_)(?:opticid|tsa)(?:_|$)/ },
  { id: "status", pattern: /(?:^|_)(?:asterisk|exclamationmark|hazardsign|peacesign|progress_indicator|purchased|questionmark|star|warninglight|wrongwaysign|yieldsign)(?:_|$)/ },
  { id: "weather", pattern: /(?:^|_)(?:heat_waves|moonrise|moonset|thermometer_and_liquid_waves)(?:_|$)/ },
  { id: "nature", pattern: /(?:^|_)drop_halffull(?:_|$)/ },
  { id: "education-science", pattern: /(?:^|_)lightspectrum(?:_|$)/ },
  { id: "celebrations-awards", pattern: /(?:^|_)laurel(?:_|$)/ },
  { id: "arrows-chevron", pattern: /^(?:left|right)$/ },
  { id: "time", pattern: /^(?:powersleep|sleep|wake|zzz)$/ },
  { id: "clothing-personal", pattern: /(?:^|_)(?:mustache|shoeprints)(?:_|$)/ },
  { id: "shapes", pattern: /(?:^|_)(?:capsule|cone|cube|cylinder|octagon|oval|pentagon|point_3_(?:filled_)?connected_trianglepath|pyramid|righttriangle|squares_below|squares_leading|squareshape|torus)(?:_|$)/ }
];

const CATEGORY_SEARCH_TAGS = {
  "commerce": ["buy", "finance", "money", "payment", "shop"],
  "development": ["code", "developer", "programming", "software"],
  "devices": ["accessory", "connection", "device", "hardware", "technology"],
  "energy-power": ["electric", "electricity", "energy", "power", "utility"],
  "home-appliances": ["appliance", "home", "household", "smart home"],
  "media": ["audio", "entertainment", "media", "sound", "video"],
  "recreation-games": ["controller", "game", "gaming", "play"],
  "shapes": ["geometry", "shape"],
  "transportation-automotive": ["automotive", "car", "dashboard", "driving", "vehicle"]
};

const SEARCH_TAG_RULES = [
  { pattern: /(?:^|_)(?:airpod|airpods|beats|earpods)(?:_|$)/, tags: ["earbuds", "headphones", "listening", "wireless audio"] },
  { pattern: /(?:^|_)(?:hifispeaker|homepod)(?:_|$)/, tags: ["audio", "smart speaker", "sound", "speaker"] },
  { pattern: /(?:currency|dollar|cent|austral|baht|cedi|coloncurrency|cruzeiro|dinar|dong|euro|florin|franc|guarani|hryvnia|indianrupee|kip|lari|lira|manat|naira|peseta|peso|polishzloty|ruble|rupee|shekel|sterling|tenge|tugrik|turkishlira|won|yen)sign(?:_|$)/, tags: ["currency", "finance", "money", "payment"] },
  { pattern: /(?:^|_)(?:blinds|curtains|roller_shade|roman_shade)(?:_|$)/, tags: ["shade", "smart home", "window covering"] },
  { pattern: /(?:^|_)(?:brakesignal|headlight|taillight|tirepressure|transmission|windshield)(?:_|$)/, tags: ["automotive", "dashboard", "driving", "vehicle warning"] },
  { pattern: /(?:^|_)(?:dpad|joystick)(?:_|$)|^(?:l|r|lb|lm|lsb|lt|m|p|pl|pr|rb|rm|rsb|rt|zl|zr)\d?_button(?:_|$)/, tags: ["controller", "gamepad", "gaming", "input"] }
];

function recordMatchesTerm(record, term) {
  const needle = normalizedName(term);
  return [record.name].concat(Array.from(record.aliases), record.sources.map(function (source) { return source.symbol; })).some(function (value) {
    const name = normalizedName(value);
    return name === needle || name.startsWith(needle + "_") || name.endsWith("_" + needle) || name.includes("_" + needle + "_");
  });
}

function normalizeCategoryIds(values) {
  const selected = new Set((Array.isArray(values) ? values : []).map(function (categoryId) {
    const value = String(categoryId || "").trim();
    return ICON_CATEGORY_ALIASES.get(value) || value;
  }).filter(function (categoryId) { return categoryId === "other" || ICON_CATEGORY_BY_ID.has(categoryId); }));
  Array.from(selected).forEach(function (categoryId) {
    let parent = ICON_CATEGORY_BY_ID.get(categoryId)?.parent || "";
    while (parent) {
      selected.add(parent);
      parent = ICON_CATEGORY_BY_ID.get(parent)?.parent || "";
    }
  });
  return ICON_CATEGORIES.map(function (category) { return category.id; }).concat(["other"]).filter(function (categoryId) { return selected.has(categoryId); });
}

function loadIconOverrides() {
  if (!fs.existsSync(overrideFile)) return { overrides: [], excludedIconIds: [] };
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(overrideFile, "utf8"));
  } catch (error) {
    throw new Error("Could not parse " + path.relative(projectRoot, overrideFile) + ": " + error.message);
  }
  const overrideItems = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.overrides) ? parsed.overrides : null;
  const wrappedFormatIsValid = !parsed || Array.isArray(parsed) || ((!parsed.format || parsed.format === "app-template-icon-library-overrides") && (!parsed.formatVersion || parsed.formatVersion === 1));
  if (!overrideItems || !wrappedFormatIsValid) {
    throw new Error("The icon override file has an unsupported format.");
  }
  const excludedIconIds = Array.isArray(parsed) ? [] : Array.from(new Set((Array.isArray(parsed.excludedIconIds) ? parsed.excludedIconIds : []).map(function (iconId) {
    return String(iconId || "").trim().slice(0, 160);
  }).filter(Boolean)));
  const sourceIds = new Set(sources.map(function (source) { return source.name; }));
  const seen = new Set();
  const overrides = overrideItems.map(function (item, index) {
    const source = item && typeof item === "object" && !Array.isArray(item) ? item : {};
    const iconId = String(source.iconId || "").trim().slice(0, 160);
    const label = cleanIconLabel(source.label).slice(0, 120);
    if (!iconId || !label || !Array.isArray(source.categories)) throw new Error("Invalid icon override at position " + (index + 1) + ".");
    if (seen.has(iconId)) throw new Error("Duplicate icon override for " + iconId + ".");
    seen.add(iconId);
    return {
      iconId: iconId,
      label: label,
      kind: ["sf-symbol", "custom"].includes(String(source.kind || "").trim()) ? String(source.kind || "").trim() : "",
      categories: normalizeCategoryIds(source.categories),
      source: sourceIds.has(String(source.source || "").trim()) ? String(source.source || "").trim() : "",
      exactCategories: source.exactCategories === true
    };
  });
  return { overrides: overrides, excludedIconIds: excludedIconIds };
}

const TAG_GROUPS = [
  ["plus", "add", "create", "new"],
  ["minus", "remove", "subtract"],
  ["trash", "delete", "remove", "discard"],
  ["xmark", "close", "dismiss", "cancel"],
  ["checkmark", "check", "done", "confirm", "success"],
  ["pencil", "edit", "write", "compose"],
  ["gear", "settings", "preferences", "configuration", "options"],
  ["magnifyingglass", "search", "find", "lookup", "discover"],
  ["arrow", "navigate", "direction", "forward", "back"],
  ["square_and_arrow_up", "share", "export", "send"],
  ["square_and_arrow_down", "import", "download", "receive"],
  ["document", "file", "page", "paper", "text", "notes"],
  ["folder", "directory", "files", "collection"],
  ["person", "user", "account", "profile", "people"],
  ["lock", "secure", "security", "private", "privacy"],
  ["eye", "view", "show", "visible", "visibility"],
  ["eye_slash", "hide", "hidden", "invisible"],
  ["info", "information", "details", "about"],
  ["exclamation", "warning", "alert", "caution"],
  ["question", "help", "support", "faq"],
  ["heart", "favorite", "love", "health"],
  ["star", "favorite", "rating", "featured"],
  ["house", "home", "start"],
  ["map", "location", "mapping", "geography", "travel"],
  ["pin", "location", "marker", "mapping"],
  ["globe", "earth", "world", "region", "geography"],
  ["building", "landmark", "monument", "place", "destination"],
  ["car", "vehicle", "drive", "transport", "travel"],
  ["airplane", "plane", "flight", "transport", "travel"],
  ["message", "chat", "conversation", "communication"],
  ["envelope", "mail", "email", "message"],
  ["bell", "notification", "alert", "reminder"],
  ["camera", "photo", "picture", "image"],
  ["play", "media", "start", "video", "audio"],
  ["speaker", "volume", "sound", "audio"],
  ["microphone", "mic", "voice", "audio", "record"],
  ["calendar", "date", "schedule", "event"],
  ["clock", "time", "recent", "history"],
  ["cart", "shopping", "store", "commerce", "purchase"],
  ["credit_card", "payment", "commerce", "purchase"],
  ["cocktail", "drink", "beverage", "bar"],
  ["fork", "food", "restaurant", "dining"],
  ["cloud", "weather", "online", "sync"],
  ["bolt", "lightning", "power", "energy", "weather"]
];

function metadataKeys(values) {
  const keys = new Set();
  values.forEach(function (value) {
    const normalized = normalizedName(value);
    if (!normalized || normalized === "unnamed_icon") return;
    keys.add(normalized);
    keys.add(normalized.replace(/_/g, " "));
    normalized.split("_").filter(function (part) { return part.length > 1; }).forEach(function (part) { keys.add(part); });
  });
  return keys;
}

function metadataNames(record) {
  return [record.name].concat(Array.from(record.aliases), record.sources.map(function (source) { return source.symbol; })).map(normalizedName);
}

function recordMatchesPattern(record, pattern) {
  return metadataNames(record).some(function (name) { return pattern.test(name); });
}

function arrowCategoryIds(record) {
  const names = metadataNames(record);
  const categories = [];
  if (names.some(function (name) { return /(?:^|_)(?:chevron|caret)(?:_|$)/.test(name); })) categories.push("arrows-chevron");
  if (names.some(function (name) { return /^(?:triangle|triangleshape)(?:_|$)/.test(name) || /^(?:forward|backward)(?:_|$)/.test(name); })) categories.push("arrows-triangle");
  if (names.some(function (name) { return /(?:^|_)(?:arrowtriangle|arrow_triangle(?:head)?)(?:_|$)/.test(name); })) categories.push("arrows-triangle-arrow");
  if (names.some(function (name) {
    return /(?:^|_)(?:arrow|arrowshape)(?:_|$)/.test(name) && !/(?:^|_)(?:arrowtriangle|arrow_triangle(?:head)?)(?:_|$)/.test(name);
  })) categories.push("arrows-chevron-arrow");
  return categories;
}

function geographyCategoryIds(record) {
  const names = metadataNames(record);
  const matchesName = function (pattern) {
    return names.some(function (name) { return pattern.test(name); });
  };
  const isCountrySource = record.sources.some(function (source) {
    return /(?:^|\/)!?countries\//i.test(source.file);
  });
  const isRegionSource = record.sources.some(function (source) {
    return /(?:^|\/)!?(?:continents|earth|world|regions|states|provinces|territories)\//i.test(source.file);
  });
  const isMappingSource = record.sources.some(function (source) {
    return /(?:^|\/)!?(?:maps|mapping)\//i.test(source.file);
  });
  const isPlaceSource = record.sources.some(function (source) {
    return /(?:^|\/)!?(?:places|landmarks)\//i.test(source.file);
  });
  const isNamedTerritory = matchesName(/(?:^|_)(?:hong_kong|montserrat)(?:_|$)/);
  const isRegion = isRegionSource || isNamedTerritory || matchesName(/(?:^|_)(?:continent|state|province|territory|region|county|district|prefecture|hemisphere|globe|earth|world)(?:_|$)/);
  const isCountry = !isRegion && (isCountrySource || matchesName(/(?:^|_)country(?:_|$)/) || matchesName(/^(?:us|usa|united_states)_map(?:_|$)/));
  const hasDedicatedMappingSymbol = matchesName(/(?:^|_)(?:mappin|pin|marker|route|road|location|compass|direction|signpost|scope|waypoint|navigation|navigator)(?:_|$)/) ||
    names.some(function (name) { return /(?:^|_)point(?:_|.*_)(?:curvepath|scurvepath|capsulepath)(?:_|$)/.test(name); });
  const hasMapSymbol = matchesName(/(?:^|_)map(?:_|$)/);
  const isMapping = hasDedicatedMappingSymbol || ((!isCountry && !isRegion) && (isMappingSource || hasMapSymbol));
  const isPlace = isPlaceSource || matchesName(/(?:^|_)(?:airport|airfield|bridge|building|campus|cathedral|church|destination|gate|house|landmark|library|lighthouse|mecca|monument|museum|obelisk|park|pavilion|poi|point_of_interest|shrine|stadium|station|tent|tower|university|volcano|wall)(?:_|$)/);
  const categories = [];
  if (isCountry) categories.push("geography-countries");
  if (isRegion) categories.push("geography-regions");
  if (isMapping) categories.push("geography-mapping");
  if (isPlace) categories.push("geography-places");
  return categories;
}

function recordDepictsPeople(record) {
  return metadataNames(record).some(function (name) {
    if (/(?:^|_)(?:person|people|user|figure|body|accessibility)(?:_|$)/.test(name)) return true;
    if (/(?:^|_)(?:ear|eye|eyes|nose|mouth|brain|lungs|heart|foot|feet|leg|arm|head|torso|fingerprint|touchid)(?:_|$)/.test(name)) return true;
    if (/(?:^|_)(?:face|faceid)(?:_|$)/.test(name) && !/(?:^|_)die_face(?:_|$)/.test(name)) return true;
    return /(?:^|_)hands?(?:_|$)/.test(name) && !/(?:^|_)door(?:_sliding)?_(?:left|right)_hand(?:_|$)/.test(name);
  });
}

function badgeMetadata(record) {
  const subtypes = new Set();
  const shapes = new Set();
  const exclamationShapes = new Set();
  const values = [record.name].concat(Array.from(record.aliases), record.sources.flatMap(function (source) {
    return [source.symbol, path.basename(source.file, path.extname(source.file))];
  }));
  values.forEach(function (value) {
    const tokens = normalizedName(value).split("_");
    let badgeIndex = -1;
    tokens.forEach(function (token, index) {
      if (token === "badge" || token.endsWith("badge")) badgeIndex = index;
    });
    if (badgeIndex < 0) return;
    const badgeToken = tokens[badgeIndex];
    const trailing = tokens.slice(badgeIndex + 1).filter(function (token) { return token !== "fill" && token !== "filled"; });
    const subtype = trailing[0] || "badge";
    subtypes.add(subtype);
    if (badgeToken.includes("trianglebadge")) {
      shapes.add("triangle");
      if (subtype === "exclamationmark") exclamationShapes.add("triangle");
    } else if (subtype === "exclamationmark" && tokens.slice(0, badgeIndex).includes("circle")) {
      exclamationShapes.add("circle");
    }
    if (subtype === "shield") shapes.add("shield");
  });
  return { subtypes: subtypes, shapes: shapes, exclamationShapes: exclamationShapes };
}

function deriveMetadata(record) {
  const keys = metadataKeys([record.name].concat(Array.from(record.aliases), record.sources.map(function (item) { return item.symbol; })));
  const badge = badgeMetadata(record);
  const categories = ICON_CATEGORIES.filter(function (category) {
    if (category.id === "geography" || category.parent === "geography") return false;
    if (category.id === "people") return recordDepictsPeople(record);
    if (category.id === "shapes") return category.terms.some(function (term) {
      const normalized = normalizedName(term);
      return record.name === normalized || record.name.startsWith(normalized + "_");
    });
    if (category.id === "badged-shapes") return badge.shapes.size > 0;
    if (category.parent === "badged-shapes") return category.terms.some(function (term) { return badge.shapes.has(normalizedName(term)); });
    if (category.parent === "badged-exclamationmark") return badge.subtypes.has("exclamationmark") && category.terms.some(function (term) { return badge.exclamationShapes.has(normalizedName(term)); });
    if (category.parent === "badged") return category.terms.some(function (term) { return badge.subtypes.has(normalizedName(term)); });
    return category.terms.some(function (term) { return keys.has(normalizedName(term)); });
  }).map(function (category) { return category.id; });
  arrowCategoryIds(record).forEach(function (categoryId) {
    if (!categories.includes(categoryId)) categories.push(categoryId);
  });
  geographyCategoryIds(record).forEach(function (categoryId) {
    if (!categories.includes(categoryId)) categories.push(categoryId);
  });
  const isBadgeSource = record.sources.some(function (source) {
    return source.repo === "svg-converter" && /^app-input\/(?:!Badge|Badge)\//i.test(source.file);
  });
  if (isBadgeSource && !categories.includes("badged")) categories.push("badged");
  const isCloudServerSource = record.sources.some(function (source) {
    return source.repo === "svg-converter" && /^app-input\/(?:server:drive|Cloud:Drive)\//i.test(source.file);
  });
  if (isCloudServerSource && !categories.includes("cloud-server")) categories.push("cloud-server");
  const isShapesSource = record.sources.some(function (source) {
    return source.repo === "svg-converter" && /^app-input\/shapes\//i.test(source.file);
  });
  if (isShapesSource && !categories.includes("shapes")) categories.push("shapes");
  const isSparklesSource = record.sources.some(function (source) {
    return source.repo === "svg-converter" && /^app-input\/(?:sparkles|Sparkles:Rays)\//i.test(source.file);
  });
  if (isSparklesSource && !categories.includes("rays-sparkles")) categories.push("rays-sparkles");
  const isWeatherSource = record.sources.some(function (source) {
    return source.repo === "svg-converter" && /^app-input\/weather\//i.test(source.file);
  });
  if (isWeatherSource && !categories.includes("weather")) categories.push("weather");
  const isTimeSource = record.sources.some(function (source) {
    return source.repo === "svg-converter" && /^app-input\/(?:!Time|Time)\//i.test(source.file);
  });
  if (isTimeSource && !categories.includes("time")) categories.push("time");
  const isHealthSource = record.sources.some(function (source) {
    return source.repo === "svg-converter" && /^app-input\/(?:!Health|Health)\//i.test(source.file);
  });
  if (isHealthSource && !categories.includes("health")) categories.push("health");
  const isNatureSource = record.sources.some(function (source) {
    return source.repo === "svg-converter" && /^app-input\/(?:!Nature|Nature)\//i.test(source.file);
  });
  if (isNatureSource && !categories.includes("nature")) categories.push("nature");
  const isRaysSource = record.sources.some(function (source) {
    return source.repo === "svg-converter" && /^app-input\/(?:!Rays|Rays)\//i.test(source.file);
  });
  if (isRaysSource && !categories.includes("rays-sparkles")) categories.push("rays-sparkles");
  const isObjectsToolsSource = record.sources.some(function (source) { return source.repo === "objects-tools"; });
  if (isObjectsToolsSource) {
    if (!categories.includes("objects-tools")) categories.push("objects-tools");
    OBJECT_TOOL_CATEGORY_RULES.forEach(function (rule) {
      if (!categories.includes(rule.id) && rule.terms.some(function (term) { return recordMatchesTerm(record, term); })) categories.push(rule.id);
    });
  }
  const isNorwaySwedenSource = record.sources.some(function (source) { return source.repo === "norway-sweden"; });
  if (isNorwaySwedenSource && !categories.includes("commerce")) categories.push("commerce");
  const indicesSourceNames = record.sources.filter(function (source) { return source.repo === "indices"; }).map(function (source) { return normalizedName(source.symbol); });
  if (indicesSourceNames.length) {
    if (!categories.includes("indices")) categories.push("indices");
    if (indicesSourceNames.some(function (name) { return /^(?:\d{1,2}|[4-9]_alt)_(?:circle|square)(?:_|$)/.test(name); }) && !categories.includes("math")) categories.push("math");
    if (indicesSourceNames.some(function (name) { return /^[a-z]_(?:circle|square)(?:_|$)/.test(name); }) && !categories.includes("text-formatting")) categories.push("text-formatting");
    if (indicesSourceNames.some(function (name) { return /sign(?:_|$)/.test(name); }) && !categories.includes("commerce")) categories.push("commerce");
  }
  const isTextFormattingSource = record.sources.some(function (source) {
    return source.repo === "svg-converter" && /^app-input\/Text Formatting\//i.test(source.file);
  });
  if (isTextFormattingSource && !categories.includes("text-formatting")) categories.push("text-formatting");
  const isConnectivitySource = record.sources.some(function (source) {
    return source.repo === "svg-converter" && /^app-input\/Connectivity\//i.test(source.file);
  });
  if (isConnectivitySource && !categories.includes("devices")) categories.push("devices");
  const isGameSource = record.sources.some(function (source) {
    return source.repo === "carcassone-cheatsheet" && /^assets\/(?:unused\/)?[^/]+\.svg$/i.test(source.file);
  });
  if (isGameSource && !categories.includes("recreation-games")) categories.push("recreation-games");
  const isBrandingSource = record.sources.some(function (source) {
    return /(?:^|\/)(?:app[ -]?icon|apple[ -]?touch[ -]?icon|favicon|splash)[^/]*\.svg$/i.test(source.file);
  });
  if (isBrandingSource && !categories.includes("branding")) categories.push("branding");
  [
    { id: "accessibility", folder: "Accessibility" },
    { id: "editing", folder: "Editing" },
    { id: "keyboard", folder: "Keyboard" },
    { id: "math", folder: "Math" },
    { id: "media", folder: "Media" },
    { id: "security", folder: "Privacy & Security" },
    { id: "transportation", folder: "Transportation" }
  ].forEach(function (rule) {
    const escapedFolder = rule.folder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp("^app-input/(?:!" + escapedFolder + "|" + escapedFolder + ")/", "i");
    const isRequestedSource = record.sources.some(function (source) {
      return source.repo === "svg-converter" && pattern.test(source.file);
    });
    if (isRequestedSource && !categories.includes(rule.id)) categories.push(rule.id);
  });
  const isRestSource = record.sources.some(function (source) { return source.repo === "Rest"; });
  if (isRestSource) {
    REST_CATEGORY_RULES.forEach(function (rule) {
      if (!categories.includes(rule.id) && recordMatchesPattern(record, rule.pattern)) categories.push(rule.id);
    });
  }
  if (!categories.length) categories.push("other");
  const tags = new Set(Array.from(keys));
  TAG_GROUPS.forEach(function (group) {
    if (!group.some(function (term) { return keys.has(normalizedName(term)); })) return;
    group.forEach(function (term) { tags.add(normalizedName(term).replace(/_/g, " ")); });
  });
  const normalizedCategories = normalizeCategoryIds(categories);
  normalizedCategories.forEach(function (categoryId) {
    const category = ICON_CATEGORIES.find(function (item) { return item.id === categoryId; });
    tags.add(category ? category.label.toLowerCase() : "other");
    (CATEGORY_SEARCH_TAGS[categoryId] || []).forEach(function (tag) { tags.add(tag); });
  });
  SEARCH_TAG_RULES.forEach(function (rule) {
    if (recordMatchesPattern(record, rule.pattern)) rule.tags.forEach(function (tag) { tags.add(tag); });
  });
  return { categories: normalizedCategories, tags: Array.from(tags).filter(Boolean).sort().slice(0, 120) };
}

function templateLiteral(value) {
  return "`" + String(value).replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${") + "`";
}

function isSfSymbol(input) {
  const original = String(input.svg || "");
  const file = String(input.file || "");
  return input.kind === "sf-symbol"
    || /\bclass=["'][^"']*\bsf-symbol\b/i.test(original)
    || /Generator:\s*Apple Native CoreSVG/i.test(original)
    || input.repo === "svg-converter" && /(?:^|\/)(?:bulk-convert-format|bulk-convert-circle|output|output-circle)/i.test(file)
    || /(?:^|\/)build\/icon-sources\/source-material\//i.test(file);
}

function iconNameComesFirst(candidate, current) {
  return candidate.length < current.length || (candidate.length === current.length && candidate.localeCompare(current) < 0);
}

function repairKnownSourceIcon(input, svg) {
  if (input.repo !== "visit-tracker" || input.file !== "build/icon-sources/parked-icon-consts.js") {
    return { symbol: input.symbol, svg: svg };
  }
  const transposedSquareSymbols = {
    __CHECKMARK_SQUARE_FILL: "x_square_fill",
    __X_SQUARE_FILL: "checkmark_square_fill"
  };
  const symbol = transposedSquareSymbols[input.symbol] || input.symbol;
  if (symbol === input.symbol) return { symbol: symbol, svg: svg };
  return {
    symbol: symbol,
    svg: svg.replace('<rect height="22.959" width="23.3203" x="0" y="0"/>', '<rect height="22.959" opacity="0" width="23.3203" x="0" y="0"/>')
  };
}

function consolidateRecords(target, duplicate) {
  if (iconNameComesFirst(duplicate.name, target.name)) {
    target.name = duplicate.name;
    target.hash = duplicate.hash;
    target.svg = duplicate.svg;
  }
  duplicate.aliases.forEach(function (alias) { target.aliases.add(alias); });
  target.sources.push.apply(target.sources, duplicate.sources);
  duplicate.kinds.forEach(function (kind) { target.kinds.add(kind); });
  target.weightSvgs = Object.assign({}, duplicate.weightSvgs || {}, target.weightSvgs || {});
  if (!target.baseWeight && duplicate.baseWeight) target.baseWeight = duplicate.baseWeight;
  recordsByHash.forEach(function (record, hash) { if (record === duplicate) recordsByHash.set(hash, target); });
  sfRecordsByName.forEach(function (record, name) { if (record === duplicate) sfRecordsByName.set(name, target); });
  iconRecords.delete(duplicate);
  return target;
}

function addIcon(input) {
  const kind = isSfSymbol(input) ? "sf-symbol" : "custom";
  let svg = cleanSvg(input.svg);
  if (!svg) { stats.rejected += 1; return null; }
  if (kind === "sf-symbol") svg = normalizeSfSymbolPaint(svg);
  const repaired = repairKnownSourceIcon(input, svg);
  svg = repaired.svg;
  const hash = crypto.createHash("sha256").update(canonicalSvg(svg)).digest("hex").slice(0, 12);
  const originalName = normalizedName(input.preferredName || repaired.symbol);
  const name = kind === "sf-symbol" ? (SF_SYMBOL_CANONICAL_NAME.get(originalName) || originalName) : originalName;
  const source = { repo: input.repo, file: input.file, symbol: input.symbol };
  const matchingArtwork = recordsByHash.get(hash);
  const matchingSfName = kind === "sf-symbol" ? sfRecordsByName.get(name) : null;
  let existing = matchingArtwork || matchingSfName;
  if (matchingArtwork && matchingSfName && matchingArtwork !== matchingSfName) {
    existing = consolidateRecords(matchingSfName, matchingArtwork);
    stats.mergedBySfName += 1;
  }
  stats.extracted += 1;
  if (existing) {
    if (!matchingArtwork && matchingSfName) stats.mergedBySfName += 1;
    existing.aliases.add(originalName);
    existing.aliases.add(name);
    existing.sources.push(source);
    existing.kinds.add(kind);
    recordsByHash.set(hash, existing);
    if (kind === "sf-symbol") sfRecordsByName.set(name, existing);
    if (!input.inline && iconNameComesFirst(name, existing.name)) existing.name = name;
    return existing;
  }
  const record = { hash: hash, name: name, aliases: new Set([name, originalName]), sources: [source], kinds: new Set([kind]), svg: svg };
  recordsByHash.set(hash, record);
  if (kind === "sf-symbol") sfRecordsByName.set(name, record);
  iconRecords.add(record);
  return record;
}

function addNativeWeightVariant(input) {
  let svg = cleanSvg(input.svg);
  if (!svg) { stats.rejected += 1; return; }
  svg = normalizeSfSymbolPaint(svg);
  nativeWeightVariants.push({
    name: normalizedName(input.symbol),
    weight: input.weight,
    svg: svg,
    source: { repo: input.repo, file: input.file, symbol: input.symbol }
  });
  stats.extracted += 1;
  stats.nativeWeightVariants += 1;
}

function templateSymbol(text, matchIndex, svg, source, ordinal) {
  const prefix = text.slice(Math.max(0, matchIndex - 500), matchIndex);
  const assignment = prefix.match(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*$/);
  if (assignment) return assignment[1];
  const property = prefix.match(/(?:^|[,;{]\s*)\b([A-Za-z_$][\w$]*)\s*:\s*$/);
  if (property) return property[1];
  const title = svg.match(/<title\b[^>]*>([^<]+)<\/title>/i);
  const ariaLabel = svg.match(/\baria-label=["']([^"']+)["']/i);
  const id = svg.match(/\bid=["']([^"']+)["']/i);
  return title && title[1] || ariaLabel && ariaLabel[1] || id && id[1] || path.basename(source.file, path.extname(source.file)) + "-svg-" + ordinal;
}

function extractTemplateSvgs(text, source) {
  const tick = String.fromCharCode(96);
  const expression = new RegExp(tick + "\\s*(<svg\\b[\\s\\S]*?<\\/svg>)\\s*" + tick, "g");
  const ranges = [];
  let match;
  let ordinal = 0;
  while ((match = expression.exec(text))) {
    ordinal += 1;
    ranges.push([match.index, expression.lastIndex]);
    stats.templateLiterals += 1;
    addIcon({ repo: source.repo, file: source.file, symbol: templateSymbol(text, match.index, match[1], source, ordinal), svg: match[1] });
  }
  return ranges;
}

function extractInlineSvgs(text, source, excludedRanges) {
  const expression = /<svg\b[^>]*class=["'][^"']*\bsf-symbol\b[^"']*["'][^>]*>[\s\S]*?<\/svg>/gi;
  let match;
  let unnamed = 0;
  while ((match = expression.exec(text))) {
    if (excludedRanges.some(function (range) { return match.index >= range[0] && match.index < range[1]; })) continue;
    const buttonStart = text.lastIndexOf("<button", match.index);
    const buttonEnd = text.lastIndexOf("</button", match.index);
    let symbol = "inline-icon-" + (++unnamed);
    if (buttonStart > buttonEnd) {
      const tagEnd = text.indexOf(">", buttonStart);
      const buttonTag = tagEnd > buttonStart && tagEnd < match.index ? text.slice(buttonStart, tagEnd + 1) : "";
      const title = buttonTag.match(/\btitle=["']([^"']+)["']/i);
      const ariaLabel = buttonTag.match(/\baria-label=["']([^"']+)["']/i);
      const id = buttonTag.match(/\bid=["']([^"']+)["']/i);
      symbol = title && title[1] || ariaLabel && ariaLabel[1] || id && id[1] || symbol;
    }
    stats.inlineMarkup += 1;
    addIcon({ repo: source.repo, file: source.file, symbol: symbol, svg: match[0], inline: true });
  }
}

for (const source of sources) {
  if (!fs.existsSync(source.root)) {
    process.stderr.write("Skipping missing icon source: " + source.root + "\n");
    continue;
  }
  for (const absolute of walk(source.root)) {
    const relative = path.relative(source.root, absolute).split(path.sep).join("/");
    if (generatedOutputFiles.has(path.resolve(absolute))) continue;
    if (source.name === "svg-converter" && /^(?:output|output-circle:square|app-input\/!All)\//i.test(relative)) {
      stats.skippedGenerated += 1;
      continue;
    }
    const extension = path.extname(absolute).toLowerCase();
    if (source.name === "svg-converter" && extension === ".svg" && / \d+\.svg$/i.test(relative)) {
      const unsuffixed = absolute.replace(/ \d+(\.svg)$/i, "$1");
      if (fs.existsSync(unsuffixed)) {
        stats.skippedGenerated += 1;
        continue;
      }
    }
    if (TEXT_EXTENSIONS.has(extension)) {
      stats.files += 1;
      const text = fs.readFileSync(absolute, "utf8");
      const ranges = extractTemplateSvgs(text, { repo: source.name, file: relative });
      if (extension === ".html" || extension === ".htm") extractInlineSvgs(text, { repo: source.name, file: relative }, ranges);
    } else if (extension === ".svg") {
      stats.files += 1;
      if (fs.statSync(absolute).size > MAX_STANDALONE_SVG_BYTES) { stats.skippedOversized += 1; continue; }
      stats.standalone += 1;
      const input = { repo: source.name, file: relative, symbol: path.basename(relative, extension), svg: fs.readFileSync(absolute, "utf8") };
      if (source.weight) addNativeWeightVariant(Object.assign({ weight: source.weight }, input));
      else addIcon(input);
    }
  }
}

existingCatalog.forEach(function (icon) {
  const retainedSources = Array.isArray(icon.sources) && icon.sources.length ? icon.sources : [{ repo: "retained-catalog", file: "assets/js/icon-library.js", symbol: icon.name }];
  const baseSources = retainedSources.filter(function (source) {
    const sourceWeight = NATIVE_WEIGHT_BY_SOURCE_NAME.get(source.repo);
    if (icon.baseWeight && icon.baseWeight !== "bold") return source.repo !== "retained-catalog" && sourceWeight === icon.baseWeight;
    return !sourceWeight;
  });
  const sourcesToRetain = baseSources.length ? baseSources : [{ repo: "retained-catalog", file: "assets/js/icon-library.js", symbol: icon.name }];
  let retainedRecord = null;
  sourcesToRetain.forEach(function (source, index) {
    const record = addIcon({ repo: source.repo, file: source.file, symbol: source.symbol || icon.name, preferredName: index === 0 ? icon.name : "", kind: icon.kind, svg: icon.svg });
    if (record && index === 0) {
      retainedRecord = record;
      (Array.isArray(icon.aliases) ? icon.aliases : []).forEach(function (alias) { record.aliases.add(normalizedName(alias)); });
    }
  });
  if (!retainedRecord) return;
  if (icon.kind === "sf-symbol" && icon.weightSvgs && typeof icon.weightSvgs === "object") retainedRecord.weightSvgs = Object.assign({}, retainedRecord.weightSvgs || {}, icon.weightSvgs);
  if (icon.baseWeight) retainedRecord.baseWeight = icon.baseWeight;
  if (icon.kind === "sf-symbol") retainedSources.filter(function (source) { return NATIVE_WEIGHT_BY_SOURCE_NAME.has(source.repo); }).forEach(function (source) { retainedRecord.sources.push(source); });
});

const recordsByKnownName = new Map();
iconRecords.forEach(function (record) {
  if (!record.kinds.has("sf-symbol")) return;
  [record.name].concat(Array.from(record.aliases)).forEach(function (name) {
    if (!recordsByKnownName.has(name)) recordsByKnownName.set(name, record);
  });
});

nativeWeightVariants.forEach(function (variant) {
  let record = recordsByKnownName.get(variant.name);
  if (!record) {
    const recordCount = iconRecords.size;
    record = addIcon({ repo: variant.source.repo, file: variant.source.file, symbol: variant.source.symbol, kind: "sf-symbol", svg: variant.svg });
    if (!record) return;
    if (iconRecords.size > recordCount) record.baseWeight = variant.weight;
    [record.name].concat(Array.from(record.aliases)).forEach(function (name) { recordsByKnownName.set(name, record); });
  } else {
    record.sources.push(variant.source);
    record.aliases.add(variant.name);
  }
  record.weightSvgs = Object.assign({}, record.weightSvgs || {}, { [variant.weight]: variant.svg });
});

// Prefer the surviving canonical record's stable ID and artwork. Keep retired IDs
// so local edits and backups can follow the merged symbol.
const canonicalSfNames = new Set(SF_SYMBOL_CANONICAL_NAME.values());
const retainedByCanonicalName = new Map();
existingCatalog.forEach(function (icon) {
  if (icon.kind !== "sf-symbol") return;
  const canonical = SF_SYMBOL_CANONICAL_NAME.get(icon.name) || icon.name;
  if (!canonicalSfNames.has(canonical)) return;
  if (!retainedByCanonicalName.has(canonical)) retainedByCanonicalName.set(canonical, []);
  retainedByCanonicalName.get(canonical).push(icon);
});
retainedByCanonicalName.forEach(function (icons, name) {
  const record = recordsByKnownName.get(name);
  const canonical = icons.find(function (icon) { return icon.name === name; });
  if (!record) return;
  record.name = name;
  if (canonical) {
    record.svg = canonical.svg;
    record.weightSvgs = Object.assign({}, record.weightSvgs, canonical.weightSvgs);
  }
});

const assignedIconIds = new Set();

function stableIconId(record, preferred) {
  const slug = preferred.replace(/_/g, "-");
  const candidates = [
    retainedByCanonicalName.has(preferred) ? existingCatalog.find(function (icon) { return icon.name === preferred; })?.id : "",
    existingIdByHash.get(record.hash),
    existingIdByName.get(preferred),
    preferred === "x_square_fill" ? "x-square-fill-44b51b" : "",
    slug + "-" + record.hash.slice(0, 6),
    slug + "-" + record.hash.slice(0, 8),
    slug + "-" + record.hash
  ].filter(Boolean);
  const selected = candidates.find(function (candidate) { return !assignedIconIds.has(candidate); });
  if (!selected) throw new Error("Could not assign a unique icon id for " + preferred + ".");
  assignedIconIds.add(selected);
  return selected;
}

const compiledRecords = Array.from(iconRecords).map(function (record) {
  const aliases = Array.from(record.aliases).sort();
  const sourcesForIcon = Array.from(new Map(record.sources.map(function (source) {
    return [[source.repo, source.file, source.symbol].join("\u0000"), source];
  })).values()).sort(function (a, b) {
    return (a.repo + a.file + a.symbol).localeCompare(b.repo + b.file + b.symbol);
  });
  const preferred = record.name;
  const metadata = deriveMetadata(record);
  return {
    id: stableIconId(record, preferred),
    retiredIds: Array.from(new Set((retainedByCanonicalName.get(preferred) || []).flatMap(function (icon) { return [icon.id].concat(icon.retiredIds || []); }))),
    name: preferred,
    label: cleanIconLabel(labelFor(preferred)) || "Icon",
    kind: record.kinds.has("sf-symbol") ? "sf-symbol" : "custom",
    aliases: aliases,
    categories: metadata.categories,
    tags: metadata.tags,
    repositories: Array.from(new Set(sourcesForIcon.map(function (source) { return source.repo; }))).sort(),
    source: "",
    sources: sourcesForIcon,
    baseWeight: record.baseWeight || "bold",
    weightSvgs: Object.assign({}, record.weightSvgs || {}),
    svg: record.svg
  };
});

const hardcodedMetadata = loadIconOverrides();
const hardcodedOverrides = hardcodedMetadata.overrides;
const excludedIconIds = new Set(hardcodedMetadata.excludedIconIds);
const records = compiledRecords.filter(function (record) { return !excludedIconIds.has(record.id); });
const recordById = new Map(records.map(function (record) { return [record.id, record]; }));
let overridesApplied = 0;
hardcodedOverrides.slice().sort(function (a, b) {
  return Number(recordById.has(a.iconId)) - Number(recordById.has(b.iconId));
}).forEach(function (override) {
  const record = recordById.get(override.iconId) || records.find(function (icon) { return icon.retiredIds.includes(override.iconId); });
  if (!record) return;
  if (record.id === override.iconId) record.label = cleanIconLabel(override.label) || record.label;
  record.kind = override.kind || record.kind;
  const overrideCategories = override.categories.filter(function (categoryId) { return categoryId !== "other"; });
  if (!override.exactCategories) {
    ["arrows", "geography", "recreation"].forEach(function (parentId) {
      if (!overrideCategories.includes(parentId)) return;
      record.categories.filter(function (categoryId) { return ICON_CATEGORY_BY_ID.get(categoryId)?.parent === parentId; }).forEach(function (categoryId) {
        if (!overrideCategories.includes(categoryId)) overrideCategories.push(categoryId);
      });
    });
  }
  record.categories = overrideCategories.length ? normalizeCategoryIds(record.id === override.iconId ? overrideCategories : record.categories.concat(overrideCategories)) : record.categories;
  record.source = override.source;
  overridesApplied += 1;
});
records.forEach(function (record) {
  const retained = retainedByCanonicalName.get(record.name);
  record.retiredIds = record.retiredIds.filter(function (id) { return id !== record.id; }).sort();
  if (!retained) return;
  if (retained.length > 1) record.categories = normalizeCategoryIds(record.categories.concat(retained.flatMap(function (icon) { return icon.categories; })));
  record.tags = Array.from(new Set(record.tags.concat(retained.flatMap(function (icon) { return icon.tags; })))).sort();
});
records.sort(function (a, b) { return a.label.localeCompare(b.label, undefined, { numeric: true }) || a.id.localeCompare(b.id); });

const contributingSources = Array.from(new Set(records.flatMap(function (record) { return record.repositories.concat(record.source || []); }))).sort();
function serializeRecord(record) {
  if (record.kind === "sf-symbol") {
    record.svg = orderSvgPaint(record.svg);
    record.weightSvgs = Object.fromEntries(Object.entries(record.weightSvgs).map(([weight, svg]) => [weight, orderSvgPaint(svg)]));
  }
  const lines = ["    {"];
  lines.push("      id: " + JSON.stringify(record.id) + ",");
  if (record.retiredIds.length) lines.push("      retiredIds: " + JSON.stringify(record.retiredIds) + ",");
  lines.push("      name: " + JSON.stringify(record.name) + ",");
  lines.push("      label: " + JSON.stringify(record.label) + ",");
  lines.push("      kind: " + JSON.stringify(record.kind) + ",");
  lines.push("      aliases: " + JSON.stringify(record.aliases) + ",");
  lines.push("      categories: " + JSON.stringify(record.categories) + ",");
  lines.push("      tags: " + JSON.stringify(record.tags) + ",");
  lines.push("      repositories: " + JSON.stringify(record.repositories) + ",");
  if (record.source) lines.push("      source: " + JSON.stringify(record.source) + ",");
  lines.push("      sources: " + JSON.stringify(record.sources) + ",");
  if (record.baseWeight !== "bold") lines.push("      baseWeight: " + JSON.stringify(record.baseWeight) + ",");
  if (Object.keys(record.weightSvgs).length) lines.push("      weightSvgs: " + JSON.stringify(record.weightSvgs) + ",");
  lines.push("      svg: " + templateLiteral(record.svg));
  lines.push("    },");
  return lines.join("\n");
}

const serializedRecords = records.map(serializeRecord);
const exportedCategories = ICON_CATEGORIES.concat([{ id: "other", label: "Other", section: "meaning", terms: [] }]).filter(function (category) {
  return category.id === "other" || records.some(function (record) { return record.categories.includes(category.id); });
}).map(function (category) {
  return Object.assign({ id: category.id, label: category.label }, category.parent ? { parent: category.parent } : { section: category.section || "meaning" });
});

const lines = [
  "/* Generated by build/compile-icon-library.mjs. Load icon-library-part-1.js through icon-library-part-4.js first. */",
  "(function () {",
  '  "use strict";',
  "",
  "  window.LocalApp = window.LocalApp || {};",
  "  const ICON_LIBRARY = (window.LocalApp.iconLibraryParts || []).flat();",
  "  delete window.LocalApp.iconLibraryParts;"
];
lines.push("  window.LocalApp.iconLibrary = Object.freeze({");
lines.push("    categories: Object.freeze(" + JSON.stringify(exportedCategories) + ".map(Object.freeze)),");
lines.push("    sourceRepositories: Object.freeze(" + JSON.stringify(contributingSources) + "),");
lines.push("    icons: Object.freeze(ICON_LIBRARY.map(Object.freeze))");
lines.push("  });");
lines.push("})();");
lines.push("");

fs.mkdirSync(outputDirectory, { recursive: true });
outputPartFiles.forEach(function (file, index) {
  const start = Math.floor(index * serializedRecords.length / outputPartFiles.length);
  const end = Math.floor((index + 1) * serializedRecords.length / outputPartFiles.length);
  const partLines = [
    "/* Generated icon catalog part " + (index + 1) + " of " + outputPartFiles.length + ". */",
    "(function () {",
    '  "use strict";',
    "",
    "  window.LocalApp = window.LocalApp || {};",
    "  window.LocalApp.iconLibraryParts = window.LocalApp.iconLibraryParts || [];",
    "  window.LocalApp.iconLibraryParts.push([",
    serializedRecords.slice(start, end).join("\n"),
    "  ]);",
    "})();",
    ""
  ];
  fs.writeFileSync(file, partLines.join("\n"));
});
fs.writeFileSync(outputFile, lines.join("\n"));
process.stdout.write(JSON.stringify({
  outputs: outputPartFiles.concat(outputFile).map(function (file) { return path.relative(projectRoot, file); }),
  outputBytes: Object.fromEntries(outputPartFiles.concat(outputFile).map(function (file) { return [path.relative(projectRoot, file), fs.statSync(file).size]; })),
  scannedFiles: stats.files,
  extracted: stats.extracted,
  nativeWeightVariants: stats.nativeWeightVariants,
  templateLiterals: stats.templateLiterals,
  inlineMarkup: stats.inlineMarkup,
  standalone: stats.standalone,
  uniqueIcons: records.length,
  excludedIcons: compiledRecords.length - records.length,
  sfSymbols: records.filter(function (record) { return record.kind === "sf-symbol"; }).length,
  customIcons: records.filter(function (record) { return record.kind === "custom"; }).length,
  rejected: stats.rejected,
  skippedOversized: stats.skippedOversized,
  skippedGenerated: stats.skippedGenerated,
  mergedBySfName: stats.mergedBySfName,
  overridesApplied: overridesApplied,
  overridesMissing: hardcodedOverrides.length - overridesApplied,
  scannedSources: sources.filter(function (source) { return fs.existsSync(source.root); }).map(function (source) { return source.name; }),
  contributingSources: contributingSources
}, null, 2) + "\n");
