import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
function harness(fetch=async()=>{throw new Error('Offline');}){
 const c=vm.createContext({window:{location:{protocol:'https:'}},URL,TextEncoder,TextDecoder,AbortController,DOMException,structuredClone,fetch,setTimeout:(fn,ms)=>setTimeout(fn,ms===15000?ms:0),clearTimeout});
 for(const f of ['config','core/utils','core/movies','core/tv','core/books','core/podcasts','core/podcasts-import','core/podcast-catalog','core/podcast-feed'])vm.runInContext(readFileSync(new URL('../assets/js/'+f+'.js',import.meta.url),'utf8'),c);
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
 const payload=model.syncPayload(local);assert.equal(payload.syncVersion,11);assert.equal(payload.schemaVersion,15);assert.equal(JSON.stringify(payload).includes('Local'),false);
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

test('personal podcast ratings survive imports and backup/content round trips; invalid scores are rejected',()=>{
 const rated=row({rating:5,catalog});assert.equal(row().rating,null);
 for(const rating of [0,6,1.5,'5',NaN])assert.throws(()=>row({rating}),/ratings/);
 const local=model.normalize({workspace:{podcasts:[rated]},ui:{podcasts:{view:'pivots',publisher:'Example Publisher',pivotQuery:'News',minimum:2,pivotSort:'average'}}});
 assert.equal(model.prepare(model.exportEnvelope(local)).state.workspace.podcasts[0].rating,5);
 assert.equal(model.prepareSync(model.syncPayload(local)).state.workspace.podcasts[0].rating,5);
 assert.equal(local.ui.podcasts.view,'pivots');assert.equal(local.ui.podcasts.pivotSort,'average');
 assert.equal(JSON.stringify(model.syncPayload(local)).includes('pivotQuery'),false);
 const original=im.parse(table);original.podcasts[0].catalog=catalog;const old=row({...original.podcasts[0],rating:4,catalog:{}}),preview=im.preview([old],original);
 assert.equal(im.apply([old],original,preview.snapshot,[old.id]).podcasts[0].rating,4);
});

test('previous podcast envelopes remain readable and rating envelopes require an updated client',()=>{
 const legacy=model.prepareSync({syncFormat:'top-shelf-app-data',syncVersion:10,schemaVersion:14,data:{podcasts:[row()],notesHtml:'<p>Keep</p>'}});assert.equal(legacy.state.workspace.podcasts[0].rating,null);
 assert.throws(()=>model.prepareSync({syncFormat:'top-shelf-app-data',syncVersion:10,schemaVersion:14,data:{podcasts:[row({rating:4})]}}),/invalid/);
 const old=model.createDefaultState();old.schemaVersion=10;old.workspace.podcasts=[row({rating:3})];const migrated=model.prepare(old);assert.ok(migrated.migrations.includes('10→11'));assert.equal(migrated.state.workspace.podcasts[0].rating,3);
});


test('weekly time uses frequency and mean duration without inventing legacy units',()=>{
 for(const [frequency,seconds] of [['Daily',12600],['Several times a week',5400],['Weekly',1800],['Every two weeks',900],['Monthly',1800*(12/52)],['Seasonal',null],['Irregular',null],['Unknown',null]])assert.equal(p.weeklySeconds(row({frequency,catalog:{averageSeconds:1800},legacy:{time:999}})),seconds);
 assert.equal(p.weeklySeconds(row({frequency:'Weekly'})),null);
 assert.equal(p.weeklySeconds(row({catalog:{averageSeconds:1800,frequency:'Weekly'}})),1800);
 assert.equal(p.frequencyLabel('Every two weeks'),'2 Weeks');assert.equal(p.frequencyLabel('Several times a week'),'Multi/Week');
});
test('combined categories retain personal labels and append distinct feed subcategories',()=>{
 assert.deepEqual(plain(p.categoryLabels(row({categories:[{name:'Personal',subcategories:['Design']}],catalog:{categories:[{name:'Technology',subcategories:['design','Software','Personal']}]}}))),['Personal','Design','Software']);
 assert.deepEqual(plain(p.categoryLabels(row({catalog:{categories:[{name:'Technology',subcategories:['Software']}]}}))),['Software']);
});
test('podcast widths clamp and survive backups without entering sync',()=>{
 const local=model.normalize({workspace:{podcasts:[row()]},ui:{podcasts:{widths:{rating:80,title:1000,website:10,bogus:200,author:'bad'},sort:'weeklyTime'}}});
 assert.deepEqual(plain(local.ui.podcasts.widths),{rating:80,title:800,website:60});assert.equal(local.ui.podcasts.sort,'weeklyTime');
 assert.deepEqual(plain(model.prepare(model.exportEnvelope(local)).state.ui.podcasts.widths),{rating:80,title:800,website:60});assert.equal(JSON.stringify(model.syncPayload(local)).includes('widths'),false);
});

test('subcategory order and public origin remain distinct from manual parent labels',()=>{
 const r=row({categories:[{name:'Personal',subcategories:['Zulu','Alpha']}],catalog:{categories:[{name:'Tech',subcategories:['alpha','Beta']}]}});
 assert.deepEqual(plain(p.categoryEntries(r)),[{label:'Personal',feed:false},{label:'Alpha',feed:true},{label:'Beta',feed:true},{label:'Zulu',feed:false}]);
});
test('weekly time rounds to half hours and always shows one decimal',()=>{
 for(const [seconds,label] of [[0,'0.0 hr'],[899,'0.0 hr'],[900,'0.5 hr'],[4500,'1.5 hr'],[7200,'2.0 hr'],[8100,'2.5 hr']])assert.equal(p.weeklyTimeLabel(row({frequency:'Weekly',catalog:{averageSeconds:seconds}})),label);
 assert.equal(p.weeklyTimeLabel(row()),'—');
});

test('category table groups keep manual hierarchy and append sorted feed subcategories',()=>{
 const r=row({categories:[{name:'Personal',subcategories:['Zulu']} ,{name:'Technology',subcategories:['Design']}],catalog:{categories:[{name:'Technology',subcategories:['Software','design']},{name:'Other',subcategories:['Alpha']}]}});
 assert.deepEqual(plain(p.categoryGroups(r)),[{name:'Personal',subcategories:[{label:'Alpha',feed:true},{label:'Zulu',feed:false}]},{name:'Technology',subcategories:[{label:'Design',feed:true},{label:'Software',feed:true}]}]);
 assert.deepEqual(plain(p.categoryGroups(row({catalog:{categories:[{name:'Tech',subcategories:['Software']}]}}))),[{name:'',subcategories:[{label:'Software',feed:true}]}]);
});
test('browser feed failures explain CORS/network limits and HTTP errors without losing saved data',async()=>{
 const offline=harness(async()=>{throw new TypeError('Load failed');});await assert.rejects(offline.podcastCatalog.request('https://example.com/feed.xml',undefined,true),/cross-origin access \(CORS\).*Saved feed details are kept/);
 const forbidden=harness(async()=>({ok:false,status:403}));await assert.rejects(forbidden.podcastCatalog.request('https://example.com/feed.xml',undefined,true),/Feed request failed \(HTTP 403\)/);
 const busy=harness(async()=>({ok:false,status:429}));await assert.rejects(busy.podcastCatalog.request('https://example.com/feed.xml',undefined,true),/Feed host is busy/);
 let options;const readable=harness(async(url,o)=>{options=o;return {ok:true,text:async()=>'<rss/>'};});assert.equal(await readable.podcastCatalog.request('https://example.com/feed.xml',undefined,true),'<rss/>');assert.equal(options.cache,'no-store');assert.equal(options.credentials,'omit');
});

test('HTTPS pages upgrade legacy HTTP public feeds without changing saved identity',async()=>{
 const app=harness();let requested;app.podcastCatalog.request=async url=>{requested=url;throw new Error('Intercepted');};
 const c=app.podcasts.catalog({feedUrl:'http://example.com/feed.xml'});await assert.rejects(app.podcastFeed.refresh(c),/Intercepted/);assert.equal(requested,'https://example.com/feed.xml');assert.equal(c.feedUrl,'http://example.com/feed.xml');
});

test('alphabetical podcast sorting ignores only a leading The',()=>{
 assert.deepEqual(['Zebra','The Beta','Alpha','the Delta','Theatre','A Story'].sort(p.compareNames),['A Story','Alpha','The Beta','the Delta','Theatre','Zebra']);
 assert.ok(p.compareNames('The Episode 2','Episode 10')<0);
});
test('refresh icon status distinguishes new failure, retained success and changed feed',()=>{
 const r=row({catalog:{feedUrl:'https://example.com/feed.xml'}}),failed={feedUrl:r.catalog.feedUrl,success:false};
 assert.equal(p.refreshStatus(r,failed),'failed');assert.equal(p.refreshStatus(r,{...failed,success:true}),'success');assert.equal(p.refreshStatus(r,undefined),'');
 r.catalog.feedFetchedAt='2026-10-03T12:00:00Z';assert.equal(p.refreshStatus(r,failed),'warning');assert.equal(p.refreshStatus(r,undefined),'success');
 r.catalog.feedUrl='https://example.com/new.xml';r.catalog.feedFetchedAt='';assert.equal(p.refreshStatus(r,failed),'');
 const local=model.normalize({workspace:{podcasts:[r]},ui:{podcasts:{refreshResults:{[r.id]:failed,bad:{feedUrl:'https://example.com/?token=secret',success:false}}}}});
 assert.deepEqual(plain(local.ui.podcasts.refreshResults),{[r.id]:failed});assert.deepEqual(plain(model.prepare(model.exportEnvelope(local)).state.ui.podcasts.refreshResults),{[r.id]:failed});assert.equal(JSON.stringify(model.syncPayload(local)).includes('refreshResults'),false);
});

test('property locks preserve legacy edits and protect individual fields through refresh and round trips',()=>{
 const r=row({size:'L',frequency:'Daily',website:'https://example.com/manual',catalog:{size:'M',frequency:'Weekly',activity:'Active',website:'https://example.com/feed'}});
 assert.equal(r.locks.size,true);r.locks.frequency=false;r.locks.activity=true;
 const refreshed=p.applyCatalog(r,{...r.catalog,size:'S',frequency:'Monthly',activity:'Inactive'});
 assert.equal(refreshed.size,'L');assert.equal(refreshed.frequency,'Monthly');assert.equal(refreshed.activity,'Unknown');assert.equal(p.effective(refreshed,'activity'),'Unknown');assert.equal(refreshed.website,'https://example.com/manual');
 const local=model.normalize({workspace:{podcasts:[refreshed]}});assert.deepEqual(plain(model.prepare(model.exportEnvelope(local)).state.workspace.podcasts[0].locks),plain(refreshed.locks));assert.deepEqual(plain(model.prepareSync(model.syncPayload(local)).state.workspace.podcasts[0].locks),plain(refreshed.locks));
 const unlocked=p.applyCatalog({...r,locks:{activity:false,size:false,frequency:false,website:false}},r.catalog);assert.equal(unlocked.size,'M');assert.equal(unlocked.website,'https://example.com/feed');assert.equal(p.effective(unlocked,'activity'),'Active');
});
