import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
const root = fileURLToPath(new URL('../', import.meta.url));
const walk = path => readdirSync(resolve(root, path), { withFileTypes: true }).flatMap(item => item.isDirectory() ? walk(path + '/' + item.name) : [path + '/' + item.name]);
const read = path => readFileSync(resolve(root, path), 'utf8');
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stdout + result.stderr);
  return result.stdout;
}
function asset(path) {
  const clean = path.split('?')[0].split('#')[0];
  if (clean && !/^(?:[a-z]+:|\/\/)/i.test(clean) && !existsSync(resolve(root, clean))) throw new Error('Missing asset: ' + path);
}
try {
  const scripts = [...walk('assets/js'), ...walk('scripts'), 'sw.js'].filter(path => /\.m?js$/.test(path));
  for (const path of scripts) run(process.execPath, ['--check', path]);
  const html = read('index.html');
  for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) asset(match[1]);
  for (const path of walk('assets/css').filter(path => path.endsWith('.css'))) {
    for (const match of read(path).matchAll(/url\(["']?([^)'"\s]+)/g)) if (!match[1].startsWith('data:')) asset(dirname(path) + '/' + match[1]);
  }
  const context = vm.createContext({window: {}});
  vm.runInContext(read('assets/js/config.js'), context);
  vm.runInContext(read('assets/js/release-history.js'), context);
  vm.runInContext(read('assets/js/icons.js'), context);
  const config = context.window.LocalApp.config, version = config.identity.version;
  if (version !== config.identity.buildId || version !== config.releases[0].version) throw new Error('Config/release versions disagree.');
  if (new Set(config.releases.map(entry => entry.version)).size !== config.releases.length) throw new Error('Duplicate release version.');
  for (const path of ['manifest.webmanifest','manifest-dark.webmanifest']) {
    const manifest = JSON.parse(read(path)); asset(manifest.start_url); manifest.icons.forEach(icon => asset(icon.src));
  }
  for (const path of ['index.html','manifest.webmanifest','manifest-dark.webmanifest']) for (const match of read(path).matchAll(/\?v=([^"']+)/g)) if (match[1] !== version) throw new Error('Stale build query in ' + path);
  if (!read('.github/workflows/deploy-pages.yml').split('\n')[0].endsWith('v' + version)) throw new Error('Deployment version mismatch.');
  const worker = vm.createContext({self:{addEventListener(){}}});
  vm.runInContext(read('sw.js') + '\nthis.shell=SHELL;this.build=ASSET_VERSION;this.cache=CACHE_NAME;', worker);
  if (worker.build !== version || !worker.cache.endsWith(version)) throw new Error('Worker version mismatch.');
  worker.shell.forEach(asset);
  for (const match of html.matchAll(/(?:src|href)="(assets\/[^"?]+\.(?:js|css))\?v=[^"]+"/g)) if (!worker.shell.includes('./' + match[1] + '?v=' + version)) throw new Error('Uncached shell asset: ' + match[1]);
  for (const path of ['index.html', ...walk('assets/js').filter(p=>!p.endsWith('icons.js'))]) {
    for (const match of read(path).matchAll(/data-symbol=["']([a-zA-Z0-9]+)["']/g)) if (!context.window.LocalApp.icons.markup(match[1])) throw new Error('Missing symbol: ' + match[1]);
  }
  const output = run(process.execPath, ['--test', ...walk('tests').filter(path => path.endsWith('.test.mjs'))]);
  run('git', ['diff','--check']);
  const count = output.match(/(?:ℹ|#) tests (\d+)/)?.[1] || 'All';
  console.log(count + ' tests passed. Syntax, versions, manifests, assets, offline asset coverage, symbols and diff checks passed.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
