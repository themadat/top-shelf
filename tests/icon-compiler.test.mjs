import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

test('rebuilding retained SVGs preserves artwork and applies exactly one CSS scope', () => {
  const root = mkdtempSync(join(tmpdir(), 'icon-compiler-'));
  try {
    const build = join(root, 'app', 'build'), source = join(root, 'source'), empty = join(root, 'empty');
    for (const folder of [build, source, empty]) mkdirSync(folder, { recursive: true });
    const compiler = join(build, 'compile-icon-library.mjs');
    copyFileSync(new URL('../build/compile-icon-library.mjs', import.meta.url), compiler);
    copyFileSync(new URL('../build/order-svg-paint.mjs', import.meta.url), join(build, 'order-svg-paint.mjs'));
    writeFileSync(join(source, 'scoped-art.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><style>.st0, path {fill:red}</style><path class="st0" d="M1 1h20v20H1Z"/></svg>');
    const compile = input => {
      execFileSync(process.execPath, [compiler, input], { encoding: 'utf8' });
      const sandbox = { window: { LocalApp: {} } };
      for (const file of ['icon-library-part-1.js', 'icon-library-part-2.js', 'icon-library-part-3.js', 'icon-library-part-4.js', 'icon-library.js']) {
        vm.runInNewContext(readFileSync(join(root, 'app', 'assets', 'js', file), 'utf8'), sandbox);
      }
      return sandbox.window.LocalApp.iconLibrary.icons;
    };
    const first = compile(source), second = compile(empty), third = compile(empty);
    assert.equal(first.length, 1);
    assert.equal(second.length, 1);
    assert.equal(second[0].id, first[0].id);
    assert.equal(second[0].svg, first[0].svg);
    assert.equal(third[0].svg, first[0].svg);
    assert.equal((third[0].svg.match(/<svg[^>]*data-icon-style-scope=/g) || []).length, 1);
    assert.match(third[0].svg, /\[data-icon-style-scope="[a-f0-9]+"\] \.st0/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

function loadCatalog(directory) {
  const sandbox = { window: { LocalApp: {} } };
  for (const file of ['icon-library-part-1.js', 'icon-library-part-2.js', 'icon-library-part-3.js', 'icon-library-part-4.js', 'icon-library.js']) {
    vm.runInNewContext(readFileSync(join(directory, file), 'utf8'), sandbox);
  }
  return JSON.parse(JSON.stringify(sandbox.window.LocalApp.iconLibrary.icons));
}

test('only the 50 approved SF aliases are retired and retained rebuilds are stable', () => {
  const catalogDir = fileURLToPath(new URL('../assets/js/', import.meta.url));
  const icons = loadCatalog(catalogDir);
  const approved = JSON.parse(readFileSync(new URL('./fixtures/sf-symbol-merges.json', import.meta.url), 'utf8'));
  assert.equal(approved.length, 50);
  assert.equal(icons.length, 7231);
  assert.equal(icons.filter(icon => icon.kind === 'sf-symbol').length, 6868);
  assert.deepEqual(icons.flatMap(icon => icon.retiredIds || []).sort(), approved.map(item => item.id).sort());
  for (const item of approved) {
    assert.equal(icons.some(icon => icon.name === item.name || icon.id === item.id), false, item.name);
    const target = icons.find(icon => icon.name === item.canonical);
    assert.ok(target?.aliases.includes(item.name), item.name);
    assert.ok(target.retiredIds.includes(item.id), item.id);
    for (const weight of ['ultralight', 'light', 'medium', 'bold', 'black']) assert.ok(target.weightSvgs[weight]);
  }
  for (const name of ['circle', 'poweroff', 'heart', 'suit_heart', 'arrow_left_to_line', 'arrow_backward_to_line']) {
    assert.ok(icons.some(icon => icon.name === name), name);
  }
  const root = mkdtempSync(join(tmpdir(), 'sf-merge-rebuild-'));
  try {
    const build = join(root, 'build'), output = join(root, 'assets/js'), empty = join(root, 'empty');
    for (const directory of [build, output, empty]) mkdirSync(directory, { recursive: true });
    for (const file of ['compile-icon-library.mjs', 'order-svg-paint.mjs', 'icon-library-overrides.json']) {
      copyFileSync(new URL('../build/' + file, import.meta.url), join(build, file));
    }
    for (const file of ['icon-library-part-1.js', 'icon-library-part-2.js', 'icon-library-part-3.js', 'icon-library-part-4.js', 'icon-library.js']) {
      copyFileSync(join(catalogDir, file), join(output, file));
    }
    // A newly scanned old app alias must not recreate a separate card.
    const percent = icons.find(icon => icon.name === 'percent');
    writeFileSync(join(empty, 'hide_play.svg'), percent.weightSvgs.bold);
    execFileSync(process.execPath, [join(build, 'compile-icon-library.mjs'), empty], { encoding: 'utf8' });
    const rebuilt = loadCatalog(output);
    assert.equal(rebuilt.length, icons.length);
    assert.equal(rebuilt.find(icon => icon.name === 'percent').id, percent.id);
    assert.equal(rebuilt.some(icon => icon.name === 'hide_play'), false);
    rmSync(join(empty, 'hide_play.svg'));
    execFileSync(process.execPath, [join(build, 'compile-icon-library.mjs'), empty], { encoding: 'utf8' });
    assert.deepEqual(loadCatalog(output), rebuilt);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
