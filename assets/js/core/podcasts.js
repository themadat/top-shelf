(function () {
  'use strict';
  const App = window.LocalApp, u = App.utils;
  const statuses = ['Listening', 'Stopped'], activities = ['Unknown', 'Active', 'Inactive'];
  const sizes = ['Unknown','S','M','L','XL'];
  const frequencies = ['Unknown','Daily','Several times a week','Weekly','Every two weeks','Monthly','Seasonal','Irregular'];
  function text(v, max) { if (v == null) return ''; if (typeof v !== 'string' || v.length > max) throw new Error('Invalid or oversized podcast text.'); return u.cleanLine(v, max); }
  function number(v, max) { if (v === '' || v == null) return null; if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > max) throw new Error('Invalid podcast number.'); return v; }
  function choice(v, values, fallback) { if (v == null || v === '') return fallback; if (!values.includes(v)) throw new Error('Invalid podcast option.'); return v; }
  function url(v, feed) {
    v = text(v, 2000); if (!v) return '';
    let parsed; try { parsed = new URL(v); } catch (_) { throw new Error('Enter a valid public HTTP(S) URL.'); }
    if (!['http:','https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('Only public HTTP(S) URLs without credentials are supported.');
    if ([...parsed.searchParams.keys()].some(k=>/token|password|secret|auth|access.?key|api.?key|signature/i.test(k))) throw new Error('URLs containing credentials are not supported.');
    if (feed && (/token|password|secret|auth|private|access_key|api_key/i.test(parsed.search + parsed.pathname) || [...parsed.searchParams].some(([k,v])=>k!=='format'||!['rss','xml'].includes(v)) || /\/[a-f0-9]{32,}(?:\/|$)/i.test(parsed.pathname))) throw new Error('Use a public feed without subscription tokens or query parameters.');
    parsed.hash = ''; return parsed.href;
  }
  function words(v) { if (v == null) return []; if (!Array.isArray(v) || v.length > 40) throw new Error('Too many podcast categories.'); return [...new Set(v.map(x => text(x, 200)).filter(Boolean))]; }
  function categories(v) { if (v == null) return []; if (!Array.isArray(v) || v.length > 20) throw new Error('Too many podcast categories.'); return v.map(x => ({name:text(x?.name,200),subcategories:words(x?.subcategories)})).filter(x => x.name); }
  function catalog(value) {
    const s = u.plainObject(value), appleId = text(s.appleId, 30);
    if (appleId && !/^\d+$/.test(appleId)) throw new Error('Invalid Apple catalog ID.');
    return { provider: s.provider === 'podcastindex' ? 'podcastindex' : '', appleId, feedUrl:url(s.feedUrl,true), title:text(s.title,500), author:text(s.author,500), website:url(s.website), categories:categories(s.categories),
      activity:choice(s.activity,activities,'Unknown'), activityReason:text(s.activityReason,500), size:choice(s.size,sizes,'Unknown'), frequency:choice(s.frequency,frequencies,'Unknown'),
      averageSeconds:number(s.averageSeconds,864000), sampleCount:number(s.sampleCount,20), lastEpisode:text(s.lastEpisode,40), fundingUrl:url(s.fundingUrl), fetchedAt:text(s.fetchedAt,40), feedFetchedAt:text(s.feedFetchedAt,40) };
  }
  function rating(v) { if (v == null || v === '') return null; if (!Number.isInteger(v) || v < 1 || v > 5) throw new Error('Podcast ratings must be whole numbers from 1–5.'); return v; }
  function normalize(input) {
    const s=u.plainObject(input), id=text(s.id,100)||u.uid('podcast');
    if (!/^[a-z0-9_-]+$/i.test(id)) throw new Error('Invalid podcast identity.');
    if (s.deleted) return {id,deleted:true};
    const title=text(s.title,500); if (!title) throw new Error('Enter a podcast name.');
    const m=u.plainObject(s.membership), l=u.plainObject(s.legacy), currency=text(m.currency,3);
    if(currency && !/^[A-Z]{3}$/.test(currency)) throw new Error('Use a three-letter currency code.');
    const amount=number(m.amount,1000000); if(amount!==null && !currency) throw new Error('Enter the price currency.');
    const checkedAt=text(m.checkedAt,10); if(checkedAt && !/^\d{4}-\d{2}-\d{2}$/.test(checkedAt)) throw new Error('Enter a valid checked date.');
    return {id,title,rating:rating(s.rating),kind:choice(s.kind,['Podcast','Membership'],'Podcast'),status:choice(s.status,statuses,'Listening'),activity:choice(s.activity,activities.concat(''),'Unknown'),size:choice(s.size,sizes,'Unknown'),frequency:choice(s.frequency,frequencies,'Unknown'),categories:categories(s.categories),website:url(s.website),
      membership:{available:choice(m.available,['Unknown','Yes','No'],'Unknown'),amount,currency,basis:choice(m.basis,['Annual','Monthly','Variable','Unknown'],'Unknown'),tier:text(m.tier,200),url:url(m.url),checkedAt},
      legacy:{active:typeof l.active==='boolean'?l.active:null,last:text(l.last,100),time:number(l.time,1000000),recurrence:text(l.recurrence,100),url:url(l.url),sourceName:text(l.sourceName,500)},
      sourceKey:text(s.sourceKey,100),catalog:catalog(s.catalog)};
  }
  function normalizeList(value) {
    if(value==null) return []; if(!Array.isArray(value)||value.length>App.config.controls.maxPodcasts) throw new Error('Too many podcasts.');
    if(new TextEncoder().encode(JSON.stringify(value)).length>App.config.controls.maxImportBytes) throw new Error('Podcast library exceeds the size limit.');
    const ids=new Set(), links=new Set(), feeds=new Set();
    return value.map(s=>{if(!s?.id) throw new Error('Missing podcast identity.');const p=normalize(s);if(ids.has(p.id)) throw new Error('Duplicate podcast identity.');ids.add(p.id);
      if(!p.deleted){if(p.catalog.appleId && links.has(p.catalog.appleId)||p.catalog.feedUrl && feeds.has(p.catalog.feedUrl)) throw new Error('This catalog show is already linked to another entry.');if(p.catalog.appleId) links.add(p.catalog.appleId);if(p.catalog.feedUrl) feeds.add(p.catalog.feedUrl);}return p;});
  }
  function effective(p,key) { const own=p[key]; return own==='Unknown'||Array.isArray(own)&&!own.length||own==='' ? p.catalog[key] ?? own : own; }
  function annual(p) {const m=p.membership;return m.available==='Yes'&&m.amount!==null?(m.basis==='Annual'?m.amount:m.basis==='Monthly'?Math.round(m.amount*1200)/100:null):null;}
  function sizeFor(seconds) {return seconds<1800?'S':seconds<3600?'M':seconds<5400?'L':'XL';}
  function estimate(episodes,complete,now) {
    const clock=now||Date.now(),seen=new Set();
    const rows=episodes.filter(e=>{const date=Date.parse(e.date);if(!e.id||seen.has(e.id)||['trailer','bonus'].includes(e.type)||!Number.isFinite(date)||date>clock)return false;seen.add(e.id);return true;}).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,20);
    const durations=rows.map(e=>e.seconds).filter(n=>Number.isFinite(n)&&n>0&&n<=864000),average=durations.length>=3?durations.reduce((a,b)=>a+b,0)/durations.length:null;
    const dates=[...new Set(rows.map(e=>Date.parse(e.date)))], gaps=dates.slice(1).map((d,i)=>(dates[i]-d)/86400000).sort((a,b)=>a-b);
    const median=gaps.length?gaps.length%2?gaps[Math.floor(gaps.length/2)]:(gaps[gaps.length/2-1]+gaps[gaps.length/2])/2:null;
    let frequency='Unknown'; if(dates.length>=4){frequency=gaps.filter(g=>g>=median/2&&g<=median*2).length/gaps.length<0.7?'Irregular':median<=1.5?'Daily':median<=4?'Several times a week':median<=9?'Weekly':median<=18?'Every two weeks':median<=40?'Monthly':'Irregular';}
    const activity=complete?'Inactive':dates.length>=4?(clock-dates[0])/86400000<=Math.max(90,3*median)?'Active':'Inactive':'Unknown';
    return {activity,activityReason:complete?'Publisher marked the feed complete':activity==='Unknown'?'Insufficient episode history':'Estimated from episode dates; seasonal shows may differ',size:average===null?'Unknown':sizeFor(average),averageSeconds:average,sampleCount:durations.length,frequency,lastEpisode:dates.length?new Date(dates[0]).toISOString():''};
  }
  function compareNames(a,b){return String(a).replace(/^the\s+/i,'').localeCompare(String(b).replace(/^the\s+/i,''),undefined,{sensitivity:'base',numeric:true})||String(a).localeCompare(String(b),undefined,{sensitivity:'base',numeric:true});}
  function refreshStatus(row,result){if(result?.feedUrl!==row.catalog.feedUrl)return row.catalog.feedFetchedAt?'success':'';return result.success?'success':row.catalog.feedFetchedAt?'warning':'failed';}
  function refreshResults(value){return Object.fromEntries(Object.entries(u.plainObject(value)).slice(0,App.config.controls.maxPodcasts).flatMap(([id,result])=>{try{if(!/^[a-z0-9_-]+$/i.test(id)||typeof result?.success!=='boolean')return [];const feedUrl=url(result.feedUrl,true);return feedUrl?[[id,{feedUrl,success:result.success}]]:[];}catch(_){return [];}}));}
  function frequencyLabel(value){return {'Every two weeks':'2 Weeks','Several times a week':'Multi/Week'}[value]||value;}
  function categoryGroups(row){
    const groups=row.categories.map(c=>({name:c.name,subcategories:c.subcategories.map(label=>({label,feed:false}))}));
    const parentNames=new Set(groups.map(g=>g.name.toLowerCase()));
    for(const c of row.catalog.categories){const target=groups.find(g=>g.name.toLowerCase()===c.name.toLowerCase())||groups[0];
      if(!target){if(c.subcategories.length)groups.push({name:'',subcategories:c.subcategories.map(label=>({label,feed:true}))});continue;}
      for(const label of c.subcategories){const existing=target.subcategories.find(e=>e.label.toLowerCase()===label.toLowerCase());if(existing)existing.feed=true;else target.subcategories.push({label,feed:true});}
    }
    return groups.map(g=>{const seen=new Set();return {name:g.name,subcategories:g.subcategories.filter(e=>{const key=e.label.toLowerCase();if(parentNames.has(key)||seen.has(key))return false;seen.add(key);return true;}).sort((a,b)=>compareNames(a.label,b.label))};});
  }
  function categoryEntries(row){
    const parents=[],subs=new Map(),seen=new Set(),feed=new Set(row.catalog.categories.flatMap(c=>c.subcategories).map(v=>v.toLowerCase()));
    for(const c of row.categories){const key=c.name.toLowerCase();if(!seen.has(key)){parents.push({label:c.name,feed:false});seen.add(key);}for(const label of c.subcategories)if(!subs.has(label.toLowerCase()))subs.set(label.toLowerCase(),label);}
    for(const c of row.catalog.categories)for(const label of c.subcategories)if(!subs.has(label.toLowerCase()))subs.set(label.toLowerCase(),label);
    return parents.concat([...subs].filter(([key])=>!seen.has(key)).map(([key,label])=>({label,feed:feed.has(key)})).sort((a,b)=>compareNames(a.label,b.label)));
  }
  function categoryLabels(row){return categoryEntries(row).map(e=>e.label);}
  function weeklySeconds(row){const rate={Daily:7,'Several times a week':3,Weekly:1,'Every two weeks':0.5,Monthly:12/52}[effective(row,'frequency')];return row.catalog.averageSeconds===null||rate===undefined?null:row.catalog.averageSeconds*rate;}
  function weeklyTimeLabel(row){const seconds=weeklySeconds(row);return seconds===null?'—':(Math.round(seconds/1800)/2).toFixed(1)+' hr';}
  function searchable(p){return [p.title,p.catalog.title,p.catalog.author,...categoryLabels(p),p.membership.tier].join(' ').toLowerCase();}
  function preferences(s){s=u.plainObject(s);return {refreshResults:refreshResults(s.refreshResults),widths:Object.fromEntries(Object.entries(u.plainObject(s.widths)).filter(([key,v])=>['rating','title','author','status','activity','lastEpisode','weeklyTime','frequency','categories','membership','cost','website'].includes(key)&&Number.isFinite(v)).map(([key,v])=>[key,Math.max(60,Math.min(800,Math.round(v)))])),view:s.view==='pivots'?'pivots':'list',publisher:u.cleanLine(s.publisher,500)||'all',pivotQuery:u.cleanLine(s.pivotQuery,200),minimum:Number.isInteger(s.minimum)&&s.minimum>=1&&s.minimum<=2000?s.minimum:1,pivotSort:['name','count','average','score'].includes(s.pivotSort)?s.pivotSort:'count',pivotDirection:s.pivotDirection==='asc'?'asc':'desc',query:u.cleanLine(s.query,200),status:statuses.includes(s.status)?s.status:'all',activity:activities.includes(s.activity)?s.activity:'all',size:sizes.includes(s.size)?s.size:'all',frequency:frequencies.includes(s.frequency)?s.frequency:'all',category:u.cleanLine(s.category,200)||'all',membership:['Yes','No','Unknown'].includes(s.membership)?s.membership:'all',sort:['title','rating','status','activity','size','frequency','cost','author','lastEpisode','kind','averageSeconds','feedFetchedAt','sourceLast','sourceTime','weeklyTime'].includes(s.sort)?s.sort:'title',direction:s.direction==='desc'?'desc':'asc'};}
  App.podcasts={compareNames,refreshStatus,frequencyLabel,categoryGroups,categoryEntries,categoryLabels,weeklySeconds,weeklyTimeLabel,statuses,activities,sizes,frequencies,text,url,categories,catalog,normalize,normalizeList,effective,annual,sizeFor,estimate,searchable,preferences};
})();
