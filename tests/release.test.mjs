import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { planRelease } from '../scripts/release.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const options = {title:'Test "release"',summary:'Literal $() and `text` remain data',date:'2026-09-27'};
function config(text, history) {
 const context=vm.createContext({window:{}});vm.runInContext(text,context);vm.runInContext(history,context);return context.window.LocalApp.config;
}
test('release planning increments once, archives history and updates every surface without writes',()=>{
 const source=readFileSync(new URL('../assets/js/config.js',import.meta.url),'utf8');
 const history=readFileSync(new URL('../assets/js/release-history.js',import.meta.url),'utf8');
 const previous=config(source,history), plan=planRelease(root,options), next=config(plan.edits.get('assets/js/config.js'),plan.edits.get('assets/js/release-history.js'));
 const parts=previous.identity.version.split('.').map(Number);parts[3]++;
 assert.equal(plan.version,parts.join('.'));assert.equal(next.identity.buildId,plan.version);
 assert.equal(next.releases[0].summary,options.summary);assert.equal(next.releases.length,previous.releases.length+1);
 assert.equal(JSON.stringify(next.releases.slice(1)),JSON.stringify(previous.releases));
 for(const path of ['index.html','manifest.webmanifest','manifest-dark.webmanifest','sw.js','.github/workflows/deploy-pages.yml']) {
  assert.ok(plan.edits.get(path).includes(plan.version));assert.ok(!plan.edits.get(path).includes(previous.identity.version));
 }
 assert.equal(readFileSync(new URL('../assets/js/config.js',import.meta.url),'utf8'),source);
});
test('release planning validates promotion, required text and rollback versions',()=>{
 const promoted=planRelease(root,{...options,version:'99.0.0'});
 assert.equal(promoted.version,'99.0.0.1');
 for(const version of ['0.0.0.1','garbage','99.0.0.0'])assert.throws(()=>planRelease(root,{...options,version}));
 assert.throws(()=>planRelease(root,{...options,title:''}));
 assert.throws(()=>planRelease(root,{...options,date:'2026-02-30'}));
});
