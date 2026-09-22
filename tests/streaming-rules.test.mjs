import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
const context=vm.createContext({window:{}});
for(const file of ['config.js','core/utils.js','core/movies.js','core/streaming-rules.js'])vm.runInContext(readFileSync(new URL('../assets/js/'+file,import.meta.url),'utf8'),context);
const model=context.window.LocalApp.streamingRules;
const movie=(companies,date='2026-06-01')=>({productionCompanies:companies,releaseDate:date});
test('live providers override deals, missing dates, and older catalog',()=>{
 assert.equal(model.describe(movie(['Universal Pictures'],'1999-01-01'),'Netflix','2026-09-21'),'Netflix');
 assert.equal(model.describe(movie([],''),'Tubi (ads)','2026-09-21'),'Tubi (ads)');
});
test('bundled research estimates only supported unambiguous recent company matches',()=>{
 for(const [company,service]of [['Universal Pictures','Peacock'],['Columbia Pictures','Netflix'],['Paramount Pictures','Paramount+'],['A24','HBO Max'],['Lionsgate','STARZ']])assert.equal(model.describe(movie([company]),'','2026-09-21'),'Likely '+service+' (US; company-based estimate; date unannounced)');
 for(const input of [movie(['Universal Pictures'],'2000-01-01'),movie(['Universal Pictures'],''),movie(['Universal Pictures'],'2035-01-01'),movie(['Blumhouse Productions']),movie(['A24','Paramount Pictures'])])assert.equal(model.describe(input,'','2026-09-21'),'No US streaming listed; destination unknown');
 assert.match(model.describe(movie([' UNIVERSAL PICTURES ', 'Focus Features']),'','2026-09-21'),/^Likely Peacock/);
});
