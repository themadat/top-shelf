(function(){
 'use strict';const App=window.LocalApp,p=App.podcasts,u=App.utils;
 const key=v=>v.normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
 function clean(v){return String(v||'').replace(/<br\s*\/?\s*>/gi,'').replace(/&#xA0;|&nbsp;/gi,' ').replace(/\*\*/g,'').trim();}
 function parse(source){
  if(typeof source!=='string'||new TextEncoder().encode(source).length>App.config.controls.maxImportBytes)throw new Error('Import must be smaller than 5 MiB.');
  if(source.trim().startsWith('{'))return validate(JSON.parse(source));
  const lines=source.split(/\r?\n/).filter(l=>l.trim()),markdown=lines[0]?.trim().startsWith('|');
  if(!lines.length)throw new Error('Paste the supplied podcast table or choose its prepared file.');
  const cells=line=>(markdown?line.trim().replace(/^\|/,'').replace(/\|$/,'').split('|'):line.split('\t')).map(clean);
  const headers=cells(lines.shift());if(headers.length!==11||headers[1]!=='Active'||headers[2]!=='Last'||headers[3]!=='Len.'||headers[4]!=='Recurrence'||headers[5]!=='Time'||headers[6]!=='Category'||headers[7]!=='Sub-Categories'||headers[8]!=='Cost'||headers[10]!=='URL')throw new Error('Use the 11-column podcast table: Name, Active, Last, Len., Recurrence, Time, Category, Sub-Categories, Cost, Membership, URL.');
  const podcasts=[],audit=[];
  lines.forEach((line,i)=>{
   const c=cells(line);if(c.every(v=>/^[-: ]*$/.test(v)))return;
   if(!c[0]||/^\d+$/.test(c[0])){audit.push('Row '+(i+2)+': blank or totals row ignored.');return;}
   if(c.length!==11||!['TRUE','FALSE'].includes(c[1]))throw new Error('Row '+(i+2)+': invalid column count or Active value.');
   const empty=v=>['','—','NONE'].includes(v)?'':v;
   const title=c[0],rawUrl=empty(c[10]),match=rawUrl.match(/^\[[^\]]*\]\((https?:\/\/[^)]+)\)$/),website=p.url(match?match[1]:rawUrl);
   const rawCost=empty(c[8]).replace(/^\$/,'').replace(/,/g,'');if(rawCost&&!/^\d+(?:\.\d{1,2})?$/.test(rawCost))throw new Error('Row '+(i+2)+': invalid USD annual price.');
   const time=empty(c[5]);if(time&&!/^\d+(?:\.\d+)?$/.test(time))throw new Error('Row '+(i+2)+': invalid Time.');
   const membership=!!(rawCost||empty(c[9])),kind=!empty(c[3])&&!empty(c[4])&&membership&&/\/(?:membership|plus)\/?$/.test(website)?'Membership':'Podcast';
   const sourceKey='table-'+u.fingerprint(key(title));
   podcasts.push(p.normalize({id:'podcast-'+sourceKey,sourceKey,title,kind,status:c[1]==='TRUE'?'Listening':'Stopped',size:empty(c[3])||'Unknown',frequency:({'Couple':'Several times a week','Every Other':'Every two weeks','Random':'Irregular'})[c[4]]||empty(c[4])||'Unknown',categories:empty(c[6])?[{name:c[6],subcategories:empty(c[7]).split(',').map(s=>s.trim()).filter(Boolean)}]:[],website,membership:{available:membership?'Yes':'Unknown',amount:rawCost?Number(rawCost):null,currency:rawCost?'USD':'',basis:rawCost?'Annual':'Unknown',tier:empty(c[9]),url:membership?website:''},legacy:{active:c[1]==='TRUE',last:empty(c[2]),time:time?Number(time):null,recurrence:empty(c[4]),url:website,sourceName:title}}));
  });
  return validate({format:'top-shelf-podcasts-import',version:1,podcasts,audit});
 }
 function validate(input){
  if(input?.format!=='top-shelf-podcasts-import'||input.version!==1||!Array.isArray(input.podcasts)||!input.podcasts.length||input.podcasts.length>App.config.controls.maxPodcasts)throw new Error('Choose a version 1 top-shelf-podcasts-import file.');
  if(new TextEncoder().encode(JSON.stringify(input)).length>App.config.controls.maxImportBytes)throw new Error('Import exceeds 5 MiB.');
  const ids=new Set();const rows=input.podcasts.map(r=>{const row=p.normalize(r);if(ids.has(row.id))throw new Error('Duplicate row identity in import.');ids.add(row.id);return row;});
  return {format:input.format,version:1,podcasts:rows,audit:Array.isArray(input.audit)?input.audit.slice(0,200).map(v=>p.text(v,1000)):[]};
 }
 function preview(existing,input){
  const source=validate(input),claimedIds=new Set(),claimedFeeds=new Set();
  existing.filter(r=>!r.deleted).forEach(r=>{if(r.catalog.appleId)claimedIds.add(r.catalog.appleId);if(r.catalog.feedUrl)claimedFeeds.add(r.catalog.feedUrl);});
  const entries=source.podcasts.map(row=>{
   const saved=existing.find(r=>r.id===row.id||!r.deleted&&row.sourceKey&&r.sourceKey===row.sourceKey),id=row.catalog.appleId,feed=row.catalog.feedUrl;
   let action='add',reason='Add';
   if(saved?.deleted){action='skip';reason='Previously deleted; kept deleted';}
   else if(saved && (!row.sourceKey || row.sourceKey!==saved.sourceKey) && key(saved.title)!==key(row.title)){action='skip';reason='Row ID belongs to another entry; kept unchanged';}
   else if(saved?.catalog.appleId||saved?.catalog.feedUrl){action='skip';reason='Already linked; kept unchanged';}
   else if((id&&claimedIds.has(id))||(feed&&claimedFeeds.has(feed))){action='skip';reason='Duplicate catalog show; review this row';}
   else if(saved){action=id||feed?'link':'keep';reason=action==='link'?'Link existing entry; keep personal fields':'Already imported; find a catalog match';}
   if(action!=='skip'){if(id)claimedIds.add(id);if(feed)claimedFeeds.add(feed);}
   const possible=existing.find(r=>!r.deleted&&r.id!==row.id&&key(r.title)===key(row.title));
   if(possible&&action==='add'){action='skip';reason='Same name already saved; link from its editor';}
   return {row,saved,action,reason};
  });return {entries,snapshot:u.stableJson(existing),audit:source.audit};
 }
 function apply(existing,input,snapshot,selected){
  if(u.stableJson(existing)!==snapshot)throw new Error('Podcasts changed since preview. Preview again.');
  const ids=new Set(selected),entries=preview(existing,input).entries.filter(e=>ids.has(e.row.id)),next=u.clone(existing);let added=0,linked=0;
  entries.forEach(e=>{if(e.action==='add'){next.push(e.row);added++;}else if(e.action==='link'){const i=next.findIndex(r=>r.id===e.saved.id);next[i]=p.normalize(Object.assign({},next[i],{catalog:e.row.catalog}));linked++;}});
  if(!added&&!linked)throw new Error('Select entries to add or link.');return {podcasts:p.normalizeList(next),added,linked};
 }
 App.podcastsImport={parse,validate,preview,apply};
})();
