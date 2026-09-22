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
test('supplied labels inherit initial destinations without converting Pay-2 or split windows into first destinations',()=>{
 for(const [company,service]of [['Universal Pictures','Peacock'],['Focus Features','Peacock'],['DreamWorks Animation','Peacock'],['Illumination','Peacock'],['Columbia Pictures','Netflix'],['TriStar Pictures','Netflix'],['Screen Gems','Netflix'],['Sony Pictures Animation','Netflix'],['Paramount Pictures','Paramount+'],['A24','HBO Max'],['Lionsgate','Starz'],['Summit Entertainment','Starz'],['DC Studios','HBO Max'],['New Line Cinema','HBO Max'],['Pixar Animation Studios','Disney+'],['Marvel Studios','Disney+'],['Lucasfilm','Disney+'],['Walt Disney Animation Studios','Disney+'],['Walt Disney Pictures','Disney+'],['20th Century Studios','Hulu / Disney+'],['Searchlight Pictures','Hulu / Disney+'],['NEON','Hulu'],['MGM','Prime'],['Apple Original Films','Apple TV']]) {
   const result=model.predict(movie([company]),{usTheatricalDate:'2026-06-01',today:'2026-09-22'});
   assert.equal(result.status,'ESTIMATE',company); assert.ok(result.how.startsWith('Likely '+service+' ('),company);
 }
 for(const companies of [['Independent'],['Legendary Entertainment'],['Legendary Entertainment','Paramount Pictures'],['A24','Paramount Pictures']]) assert.equal(model.predict(movie(companies)).status,'UNKNOWN');
});
test('date estimates preserve ranges and separate sequential windows',()=>{
 const options={usTheatricalDate:'2026-06-01',today:'2026-09-22'};
 const universal=model.predict(movie(['Universal Pictures']),options);
 assert.equal(universal.windows.map(x=>x.window).join(','),'Pay-1A,Pay-1B,Pay-1C');
 assert.equal(universal.windows.map(x=>x.services[0]).join(','),'Peacock,Netflix,Peacock');
 assert.equal(universal.windows[0].estimatedDates[0],'2026-09-29');
 assert.equal(universal.windows[1].estimatedDates[0],'2027-01-27');
 assert.equal(universal.windows[2].estimatedDates,null);
 const warner=model.predict(movie(['New Line Cinema']),options);
 assert.equal(warner.windows[0].estimatedDates.join(','),'2026-08-10,2026-08-30');
 assert.match(warner.how,/2026-08-10 to 08-30/);
 assert.equal(model.predict(movie(['Columbia Pictures']),options).windows[1].window,'Pay-2');
 assert.equal(model.predict(movie(['Columbia Pictures']),{...options,usTheatricalDate:'2027-01-01'}).windows.length,1);
 assert.equal(model.predict(movie(['Universal Pictures'])).windows[0].estimatedDates,null);
 assert.equal(model.predict(movie(['Universal Pictures']),{...options,usTheatricalDate:'2000-01-01'}).status,'UNKNOWN');
});
test('verified title dates, rights and distributor precede company clues; rental dates are ignored',()=>{
 const input=movie(['Paramount Pictures']);
 const titleRights={source:'https://example.com/official',services:['Netflix'],officialDate:'2026-10-01'};
 assert.equal(model.predict(input,{titleRights,available:'Peacock'}).status,'OFFICIAL');
 assert.match(model.predict(input,{titleRights}).how,/Netflix.*official 2026-10-01/);
 assert.equal(model.predict(input,{titleRights:{...titleRights,officialDate:''}}).status,'RIGHTS');
 assert.match(model.predict(input,{distributor:'Columbia Pictures'}).how,/Likely Netflix/);
 assert.equal(model.predict(input,{distributor:'Independent'}).status,'UNKNOWN');
 assert.equal(model.predict(input,{titleRights:{...titleRights,source:''}}).status,'ESTIMATE');
 assert.doesNotMatch(model.predict(input,{digitalReleaseDate:'2026-10-01'}).how,/2026-10-01/);
});

test('unresolved checks keep previous How with one marker, successful checks replace it',()=>{
 const input={...movie([]),how:'Cinema'};
 assert.equal(model.describe(input,'','2026-09-22'),'* Cinema');
 input.how='*Cinema';assert.equal(model.describe(input,'','2026-09-22'),'* Cinema');
 assert.equal(model.describe(input,'Netflix','2026-09-22'),'Netflix');
 input.productionCompanies=['Universal Pictures'];assert.match(model.describe(input,'','2026-09-22'),/^Likely Peacock/);
});
test('incomplete metadata detects any requested gap and ignores optional fields',()=>{
 const api=context.window.LocalApp.movies;
 const complete={releaseDate:'2026-01-01',genres:['Drama'],actors:['Actor'],directors:['Director'],productionCompanies:['Studio']};
 assert.equal(api.incomplete(complete),false);
 for(const field of Object.keys(complete))assert.equal(api.incomplete({...complete,[field]:field==='releaseDate'?'':[]}),true);
 const normalized=api.normalize({id:'1',tmdbId:1,title:'Long How',status:'wishlist',how:'*'+'x'.repeat(300)});assert.equal(normalized.how.length,302);
});

test('How normalization shortens providers and estimates without losing personal notes',()=>{
 const api=context.window.LocalApp.movies;
 assert.equal(api.cleanHow('Amazon Prime Video, Amazon Prime Video with Ads, Kanopy (free), Plex Channel (ads), Plex (ads)'), 'Prime, Kanopy, Plex');
 assert.equal(api.cleanHow('Likely Hulu / Disney+ (US; estimated 2032-02-17–2032-04-17; company-based)'), 'Likely Hulu / Disney+ (~ 2032-02-17 to 04-17)');
 assert.equal(api.cleanHow('Likely Netflix (US; estimated 2032-12-17–2033-04-17; distributor-based)'), 'Likely Netflix (~ 2032-12-17 to 2033-04-17)');
 assert.equal(api.cleanHow('No US streaming listed; destination unknown'), '');
 assert.equal(model.describe({...movie([]),how:'03-05 Disney+'},'', '2026-09-22'), '* 03-05 Disney+');
 assert.equal(model.describe({...movie([]),how:'* 03-05 Disney+'},'', '2026-09-22'), '* 03-05 Disney+');
 assert.equal(model.describe(movie([]),'', '2026-09-22'), '');
 assert.equal(api.cleanHow('constructor'), 'constructor');
 assert.equal(api.incomplete({...movie([]),incompleteOverride:true}), false);
 assert.equal(api.normalize({id:'1',tmdbId:1,status:'wishlist',title:'Example',incompleteOverride:true}).incompleteOverride,true);
});
