import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

export function planRelease(root, { version, title, summary, date = new Date().toISOString().slice(0, 10) }) {
  const read = path => readFileSync(resolve(root, path), 'utf8');
  const context = vm.createContext({ window: {} });
  vm.runInContext(read('assets/js/config.js'), context);
  vm.runInContext(read('assets/js/release-history.js'), context);
  const config = context.window.LocalApp.config, old = config.identity.version;
  if (!title?.trim() || !summary?.trim()) throw new Error('--title and --summary are required.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error('Invalid release date.');
  const parts = old.split('.').map(Number);
  version ||= [...parts.slice(0, 3), parts[3] + 1].join('.');
  if (/^\d+\.\d+\.\d+$/.test(version)) version += '.1';
  if (!/^\d+\.\d+\.\d+\.[1-9]\d*$/.test(version)) throw new Error('Use major.minor.patch[.build], with a positive build.');
  const next = version.split('.').map(Number), difference = next.map((n, i) => n - parts[i]).find(n => n !== 0);
  if (!difference || difference < 0) throw new Error('Release version must increase.');
  const entry = { version, date: date + 'T12:00:00.000Z', title: title.trim(), summary: summary.trim(), features: [], improvements: [], fixes: [], knownIssues: [] };
  const edits = new Map();
  let source = read('assets/js/config.js');
  source = source.replace('"version": "' + old + '"', '"version": "' + version + '"').replace('"buildId": "' + old + '"', '"buildId": "' + version + '"');
  const start = source.indexOf('    "releases": [\n'), end = source.indexOf('\n    ],', start);
  if (start < 0 || end < 0) throw new Error('Cannot locate current release block.');
  source = source.slice(0, start) + '    "releases": [\n      ' + JSON.stringify(entry) + source.slice(end);
  edits.set('assets/js/config.js', source);
  edits.set('assets/js/release-history.js', '// Historical data only. Read config.js for the current release.\nwindow.LocalApp.config.releases.push(...[\n' + config.releases.map(item => '  ' + JSON.stringify(item)).join(',\n') + '\n]);\n');
  for (const path of ['index.html', 'manifest.webmanifest', 'manifest-dark.webmanifest', 'sw.js', '.github/workflows/deploy-pages.yml']) {
    const text = read(path);
    if (!text.includes(old)) throw new Error('Missing current version in ' + path);
    edits.set(path, text.replaceAll(old, version));
  }
  // Validate generated data before writing any file.
  for (const [path, text] of edits) {
    if (path.endsWith('.js')) new vm.Script(text, { filename: path });
    if (path.endsWith('.webmanifest')) JSON.parse(text);
  }
  return { version, edits };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2), options = {};
    if (args.includes('--help')) {
      console.log('node scripts/release.mjs --title "Title" --summary "Result" [--version 1.1.0] [--date YYYY-MM-DD] [--dry-run]\nDefaults to the next build. Updates local files only; never commits or pushes.');
    } else {
      for (let i = 0; i < args.length; i++) {
        const key = args[i];
        if (key === '--dry-run') { options.dryRun = true; continue; }
        if (!['--version', '--title', '--summary', '--date'].includes(key) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Invalid argument: ' + key);
        options[key.slice(2)] = args[++i];
      }
      const root = fileURLToPath(new URL('../', import.meta.url)), plan = planRelease(root, options);
      if (!options.dryRun) {
        const originals = new Map([...plan.edits.keys()].map(path => [path, readFileSync(resolve(root, path), 'utf8')]));
        try { for (const [path, text] of plan.edits) writeFileSync(resolve(root, path), text); }
        catch (error) { for (const [path, text] of originals) writeFileSync(resolve(root, path), text); throw error; }
      }
      console.log((options.dryRun ? 'Would release ' : 'Prepared ') + plan.version + ' (' + plan.edits.size + ' files).');
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
