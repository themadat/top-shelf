import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
function harness(fetch=async()=>{throw new Error('Offline');}){
 const c=vm.createContext({window:{},URL,TextEncoder,TextDecoder,AbortController,DOMException,structuredClone,fetch,setTimeout:(fn,ms)=>setTimeout(fn,ms===15000?ms:0),clearTimeout});
 for(const f of ['config','core/utils','core/movies','core/tv','core/books','core/podcasts','core/podcasts-import','core/podcast-catalog'])vm.runInContext(readFileSync(new URL('../assets/js/'+f+'.js',import.meta.url),'utf8'),c);
 const App=c.window.LocalApp;App.utils.sanitizeRichHtml=String;App.utils.richTextToPlainText=String;
 vm.runInContext(readFileSync(new URL('../assets/js/core/state.js',import.meta.url),'utf8'),c);return App;
}
const App=harness(),p=App.podcasts,im=App.podcastsImport,model=App.stateModel,plain=v=>JSON.parse(JSON.stringify(v));
const row=(extra={})=>p.normalize({id:'pod-one',title:'Example Podcast',...extra});
const file=rows=>({format:'top-shelf-podcasts-import',version:1,podcasts:rows});
const catalog={provider:'podcastindex',appleId:'123',feedUrl:'https://example.com/public.xml',title:'Official title',author:'Example Publisher'};
const table='Name\tActive\tLast\tLen.\tRecurrence\tTime\tCategory\tSub-Categories\tCost\tMembership\tURL\nExample Podcast\tTRUE\t06/30/23 12:00 AM\tL\tCouple\t4\tTech\tDesign, Arts\t$50\tPremium\thttps://example.com/\nStopped Show\tFALSE\t\t\t\t\t\t\t—\t—\tNONE';
test('podcast table keeps listening separate from publication activity and preserves legacy values',()=>{
 const result=im.parse(table),r=result.podcasts[0];assert.equal(r.status,'Listening');assert.equal(r.activity,'Unknown');assert.equal(r.size,'L');assert.equal(r.frequency,'Several times a week');assert.equal(r.legacy.recurrence,'Couple');assert.equal(r.legacy.time,4);assert.equal(r.legacy.last,'06/30/23 12:00 AM');assert.equal(r.membership.amount,50);assert.equal(r.membership.basis,'Annual');assert.equal(r.membership.currency,'USD');assert.equal(r.membership.checkedAt,'');assert.equal(result.podcasts[1].status,'Stopped');assert.equal(result.podcasts[1].membership.available,'Unknown');assert.equal(result.podcasts[1].membership.amount,null);
 assert.equal(im.parse(table).podcasts[0].id,r.id);
});
test('original markdown formatting and totals do not become podcasts',()=>{
 const md='| <br> | **Active** | **Last** | **Len.** | **Recurrence** | **Time** | **Category** | **Sub-Categories** | **Cost** | <br> | **URL** |\n|---|---|---|---|---|---|---|---|---|---|---|\n| **Test&#xA0;** | TRUE | <br> | S | Every Other | 0.5 | Social | <br> | — | — | [https://example.com/](https://example.com/) |\n| **61** | **36** | | | | 222.5 | | | $641 | | |\n| <br> | FALSE | | | | | | | | | |';
 const x=im.parse(md);assert.equal(x.podcasts.length,1);assert.equal(x.podcasts[0].title,'Test');assert.equal(x.podcasts[0].website,'https://example.com/');assert.equal(x.audit.length,2);
});
test('import schema rejects malformed rows and credentials',()=>{
 for(const value of [table.replace('TRUE','MAYBE'),table.replace('$50','$oops'),table.replace('https://example.com/','javascript:alert(1)'),'Name,Active\nTest,TRUE'])assert.throws(()=>im.parse(value));
 assert.throws(()=>p.url('https://u:password@example.com/feed',true));assert.throws(()=>p.url('https://example.com/private/feed',true));assert.throws(()=>p.url('https://example.com/feed?token=secret',true));
 assert.equal(p.url('https://example.com/podcast?format=rss',true),'https://example.com/podcast?format=rss');
 assert.throws(()=>p.normalizeList([row(),row()]));assert.throws(()=>im.validate(file([row(),row()])));
});
test('membership-only rows remain entries without inventing show metadata',()=>{
 const data=im.parse(table.split('\n')[0]+'\nExample Network\tFALSE\t\t\t\t\t\t\t50\tMembership\thttps://example.com/membership');assert.equal(data.podcasts[0].kind,'Membership');assert.equal(data.podcasts[0].activity,'Unknown');assert.equal(data.podcasts[0].status,'Stopped');
});
test('catalog linking cannot overwrite source values on initial import or repeated import',()=>{
 const original=im.parse(table),first=original.podcasts[0],saved=row({...first,title:'My correction',status:'Stopped'}),linked=plain(original);linked.podcasts[0].catalog=catalog;
 const preview=im.preview([saved],linked);assert.equal(preview.entries[0].action,'link');const applied=im.apply([saved],linked,preview.snapshot,[first.id]);assert.equal(applied.linked,1);assert.equal(applied.podcasts[0].title,'My correction');assert.equal(applied.podcasts[0].status,'Stopped');assert.equal(applied.podcasts[0].membership.amount,50);assert.equal(applied.podcasts[0].catalog.appleId,'123');
 assert.equal(im.preview(applied.podcasts,linked).entries[0].action,'skip');assert.throws(()=>im.apply([row()],linked,preview.snapshot,[first.id]),/changed/);
});
test('duplicate catalog identities, tombstones and unchecked imports are safe',()=>{
 const a=row({catalog}),b=row({id:'two',title:'Possible alias',catalog}),source=file([a,b]),preview=im.preview([],source);
 assert.equal(preview.entries[1].action,'skip');assert.equal(im.apply([],source,preview.snapshot,['pod-one','two']).podcasts.length,1);assert.throws(()=>im.apply([],source,preview.snapshot,[]),/Select/);
 assert.equal(im.preview([{id:a.id,deleted:true}],file([a])).entries[0].action,'skip');assert.throws(()=>p.normalizeList([a,b]),/already linked/);
 const saved=row({id:'other',title:'Example Podcast'});assert.equal(im.preview([saved],file([a])).entries[0].action,'skip');
});
test('annual prices distinguish unknown, zero, actual yearly and estimated monthly',()=>{
 assert.equal(p.annual(row()),null);assert.equal(p.annual(row({membership:{available:'Yes',amount:0,currency:'USD',basis:'Annual'}})),0);
 assert.equal(p.annual(row({membership:{available:'Yes',amount:5.99,currency:'USD',basis:'Monthly'}})),71.88);
 assert.equal(p.annual(row({membership:{available:'Yes',amount:10,currency:'USD',basis:'Variable'}})),null);
 assert.throws(()=>row({membership:{amount:20}}),/currency/);assert.throws(()=>row({membership:{amount:-1,currency:'USD'}}));
});
test('episode sizing uses exact boundaries and excludes invalid, future, bonus and duplicate samples',()=>{
 [1799,1800,3599,3600,5399,5400].forEach((n,i)=>assert.equal(p.sizeFor(n),['S','M','M','L','L','XL'][i]));
 const rows=Array.from({length:4},(_,i)=>({id:String(i),date:`2026-09-${String(28-i*7).padStart(2,'0')}T00:00:00Z`,seconds:1800,type:'full'}));
 const result=p.estimate(rows.concat({...rows[0],seconds:100000},{id:'bonus',date:rows[0].date,seconds:30,type:'bonus'},{id:'future',date:'2099-01-01',seconds:30},{id:'bad',date:'not-a-date',seconds:30}),false,Date.parse('2026-09-30'));
 assert.equal(result.size,'M');assert.equal(result.sampleCount,4);assert.equal(result.frequency,'Weekly');assert.equal(result.activity,'Active');assert.equal(p.estimate(rows.slice(0,2),false,Date.parse('2026-09-30')).size,'Unknown');
 assert.equal(p.estimate(rows,true,Date.parse('2026-09-30')).activity,'Inactive');assert.equal(p.estimate(rows,false,Date.parse('2027-09-30')).activity,'Inactive');assert.equal(p.estimate([],false).activity,'Unknown');
});
test('effective fields honor imported/manual choices and use feed facts only for unknowns',()=>{
 const r=row({size:'L',frequency:'Weekly',categories:[{name:'My Category'}],catalog:{...catalog,size:'S',activity:'Active',frequency:'Daily',categories:[{name:'News'}]}});
 assert.equal(p.effective(r,'size'),'L');assert.equal(p.effective(r,'frequency'),'Weekly');assert.equal(p.effective(r,'activity'),'Active');assert.equal(p.effective(r,'categories')[0].name,'My Category');
});
test('podcasts migrate, round trip, isolate local preferences and reject old clients and conflicts',()=>{
 const old=model.createDefaultState();old.schemaVersion=9;delete old.workspace.podcasts;const migrated=model.prepare(old);assert.ok(migrated.migrations.includes('9→10'));assert.equal(migrated.state.workspace.podcasts.length,0);
 const local=model.normalize({workspace:{podcasts:[row({catalog})]},ui:{podcasts:{query:'Local',status:'Stopped'}}});
 assert.deepEqual(plain(model.prepare(model.exportEnvelope(local)).state.workspace.podcasts),plain(local.workspace.podcasts));
 const payload=model.syncPayload(local);assert.equal(payload.syncVersion,10);assert.equal(payload.schemaVersion,14);assert.equal(JSON.stringify(payload).includes('Local'),false);
 const remote=model.prepareSync(payload).state;assert.deepEqual(plain(remote.workspace.podcasts),plain(local.workspace.podcasts));assert.equal(model.applySync(local,remote).ui.podcasts.query,'Local');
 assert.throws(()=>model.prepareSync({...payload,syncVersion:9,schemaVersion:13}),/invalid/);assert.equal(model.prepareSync({syncFormat:'top-shelf-app-data',syncVersion:9,schemaVersion:13,data:{notesHtml:'<p>Old</p>',notes:'Old'}}).state.workspace.documents[0].html,'<p>Old</p>');
 const different=model.normalize({workspace:{podcasts:[row({status:'Stopped'})]}});assert.throws(()=>model.merge(local,different),/differs/);
 const duplicate=model.normalize({workspace:{podcasts:[row({id:'alias',catalog})]}});assert.throws(()=>model.merge(local,duplicate),/already linked/);
 assert.equal(model.resetPreferences(local).ui.podcasts.query,'');
});
test('catalog accepts only podcast identities, ignores search releaseDate and never treats free audio as free membership',async()=>{
 const raw={resultCount:1,results:[{kind:'podcast',collectionId:123,collectionName:'Example',artistName:'Publisher',feedUrl:'https://example.com/feed',releaseDate:'2099-01-01',collectionPrice:0,genres:['Technology','Podcasts']}]};
 const app=harness(async()=>({ok:true,status:200,text:async()=>JSON.stringify(raw)}));const c=(await app.podcastCatalog.search('Example'))[0];assert.equal(c.appleId,'123');assert.equal(c.activity,'Unknown');assert.equal(c.lastEpisode,'');assert.equal(c.categories.length,1);assert.equal(c.provider,'podcastindex');
 assert.equal(app.podcastCatalog.candidates({results:[{...raw.results[0],feedUrl:'https://example.com/feed?token=secret'}]})[0].feedUrl,'');
 const signal=new AbortController();signal.abort();await assert.rejects(app.podcastCatalog.search('Example',signal.signal),/stopped/);
});
test('provider error and malformed response do not produce false links',async()=>{
 const busy=harness(async()=>({ok:false,status:429}));await assert.rejects(busy.podcastCatalog.search('x'),/busy/);
 const bad=harness(async()=>({ok:true,status:200,text:async()=>'{"wrong":[]}'}));await assert.rejects(bad.podcastCatalog.search('x'),/invalid/);
});

test('import cannot reuse another entry ID to attach an unrelated catalog',()=>{const saved=row(),source=file([row({title:'Different show',catalog})]);assert.equal(im.preview([saved],source).entries[0].action,'skip');});
