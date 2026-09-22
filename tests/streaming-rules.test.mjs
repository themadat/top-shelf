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

test('unresolved checks keep previous How with one marker, successful checks replace it',()=>{
 const input={...movie([]),how:'Cinema'};
 assert.equal(model.describe(input,'','2026-09-22'),'*Cinema');
 input.how='*Cinema';assert.equal(model.describe(input,'','2026-09-22'),'*Cinema');
 assert.equal(model.describe(input,'Netflix','2026-09-22'),'Netflix');
 input.productionCompanies=['Universal Pictures'];assert.match(model.describe(input,'','2026-09-22'),/^Likely Peacock/);
});
test('incomplete metadata detects any requested gap and ignores optional fields',()=>{
 const api=context.window.LocalApp.movies;
 const complete={releaseDate:'2026-01-01',genres:['Drama'],actors:['Actor'],directors:['Director'],productionCompanies:['Studio']};
 assert.equal(api.incomplete(complete),false);
 for(const field of Object.keys(complete))assert.equal(api.incomplete({...complete,[field]:field==='releaseDate'?'':[]}),true);
 const normalized=api.normalize({id:'1',tmdbId:1,title:'Long How',status:'wishlist',how:'*'+'x'.repeat(300)});assert.equal(normalized.how.length,301);
});
