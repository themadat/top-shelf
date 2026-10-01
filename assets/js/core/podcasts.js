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
  function normalize(input) {
    const s=u.plainObject(input), id=text(s.id,100)||u.uid('podcast');
    if (!/^[a-z0-9_-]+$/i.test(id)) throw new Error('Invalid podcast identity.');
    if (s.deleted) return {id,deleted:true};
    const title=text(s.title,500); if (!title) throw new Error('Enter a podcast name.');
    const m=u.plainObject(s.membership), l=u.plainObject(s.legacy), currency=text(m.currency,3);
    if(currency && !/^[A-Z]{3}$/.test(currency)) throw new Error('Use a three-letter currency code.');
    const amount=number(m.amount,1000000); if(amount!==null && !currency) throw new Error('Enter the price currency.');
    const checkedAt=text(m.checkedAt,10); if(checkedAt && !/^\d{4}-\d{2}-\d{2}$/.test(checkedAt)) throw new Error('Enter a valid checked date.');
    return {id,title,kind:choice(s.kind,['Podcast','Membership'],'Podcast'),status:choice(s.status,statuses,'Listening'),activity:choice(s.activity,activities.concat(''),'Unknown'),size:choice(s.size,sizes,'Unknown'),frequency:choice(s.frequency,frequencies,'Unknown'),categories:categories(s.categories),website:url(s.website),
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
  function searchable(p){return [p.title,p.catalog.title,p.catalog.author,...effective(p,'categories').flatMap(c=>[c.name,...c.subcategories]),p.membership.tier].join(' ').toLowerCase();}
  function preferences(s){s=u.plainObject(s);return {query:u.cleanLine(s.query,200),status:statuses.includes(s.status)?s.status:'all',activity:activities.includes(s.activity)?s.activity:'all',size:sizes.includes(s.size)?s.size:'all',frequency:frequencies.includes(s.frequency)?s.frequency:'all',category:u.cleanLine(s.category,200)||'all',membership:['Yes','No','Unknown'].includes(s.membership)?s.membership:'all',sort:['title','status','activity','size','frequency','cost'].includes(s.sort)?s.sort:'title',direction:s.direction==='desc'?'desc':'asc'};}
  App.podcasts={statuses,activities,sizes,frequencies,text,url,categories,catalog,normalize,normalizeList,effective,annual,sizeFor,estimate,searchable,preferences};
})();
