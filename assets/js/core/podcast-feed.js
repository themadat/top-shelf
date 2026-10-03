(function(){
 'use strict';const App=window.LocalApp,p=App.podcasts;
 function parse(raw,prior){
  if(typeof raw!=='string'||new TextEncoder().encode(raw).length>App.config.controls.maxImportBytes||/<!DOCTYPE|<!ENTITY/i.test(raw))throw new Error('Use an RSS file under 5 MiB without DTD or entity declarations.');
  const doc=new DOMParser().parseFromString(raw,'application/xml');if(doc.querySelector('parsererror'))throw new Error('Invalid RSS XML.');const channel=doc.querySelector('channel');if(!channel)throw new Error('No RSS podcast channel found.');
  const children=(node,name,ns)=>Array.from(node.children).filter(e=>e.localName===name&&(!ns||e.namespaceURI===ns));
  const value=(node,name,ns)=>children(node,name,ns)[0]?.textContent.trim()||'';
  const itunes='http://www.itunes.com/dtds/podcast-1.0.dtd',ns='https://podcastindex.org/namespace/1.0';
  const duration=v=>{if(/^\d+(?:\.\d+)?$/.test(v))return Number(v);if(!/^\d+:\d{2}(?::\d{2})?$/.test(v))return null;const parts=v.split(':').map(Number);if(parts.slice(1).some(n=>n>=60))return null;return parts.reduce((a,b)=>a*60+b,0);};
  const episodes=children(channel,'item').slice(0,5000).map((item,i)=>({id:value(item,'guid')||children(item,'enclosure')[0]?.getAttribute('url')||'missing-'+i,date:value(item,'pubDate'),seconds:duration(value(item,'duration',itunes)),type:value(item,'episodeType',itunes).toLowerCase()}));
  const safe=v=>{try{return p.url(v);}catch(_){return '';}};
  const cats=children(channel,'category',itunes).slice(0,20).map(e=>({name:e.getAttribute('text')||'',subcategories:children(e,'category',itunes).map(c=>c.getAttribute('text')||'')}));
  const fields={title:value(channel,'title').slice(0,500),website:safe(value(channel,'link')),categories:cats,author:value(channel,'author',itunes).slice(0,500),fundingUrl:safe(children(channel,'funding',ns)[0]?.getAttribute('url')||'')};
  const old=p.catalog(prior),estimates=p.estimate(episodes,value(channel,'complete',itunes).toLowerCase()==='yes');
  // A partial feed must not erase earlier usable observations.
  if(estimates.averageSeconds===null && old.averageSeconds!==null){estimates.averageSeconds=old.averageSeconds;estimates.size=old.size;estimates.sampleCount=old.sampleCount;}
  if(estimates.frequency==='Unknown')estimates.frequency=old.frequency;
  if(estimates.activity==='Unknown' && old.activity!=='Unknown'){estimates.activity=old.activity;estimates.activityReason=old.activityReason.replace(/ \(retained; current feed has insufficient history\)$/,'').slice(0,400)+' (retained; current feed has insufficient history)';}
  if(!estimates.lastEpisode)estimates.lastEpisode=old.lastEpisode;
  const result=Object.assign({},old,estimates,{feedFetchedAt:new Date().toISOString()});
  Object.entries(fields).forEach(([key,v])=>{if(v.length)result[key]=v;});return p.catalog(result);
 }
 // Keep XML token boundaries intact, including comments and CDATA; stop on a complete recent sample.
 function sampler(){let raw='',offset=0,count=0;
  return {push(chunk){raw+=chunk;if(/<!DOCTYPE|<!ENTITY/i.test(raw))throw new Error('RSS DTD or entity declarations are not supported.');
   while(true){const start=raw.indexOf('<',offset);if(start<0)break;let end;
    if(raw.startsWith('<![CDATA[',start)){end=raw.indexOf(']]>',start+9);if(end<0)break;offset=end+3;continue;}
    if(raw.startsWith('<!--',start)){end=raw.indexOf('-->',start+4);if(end<0)break;offset=end+3;continue;}
    let quote='';end=start+1;for(;end<raw.length;end++){const c=raw[end];if(quote){if(c===quote)quote='';}else if(c==='"'||c==="'")quote=c;else if(c==='>')break;}if(end>=raw.length)break;offset=end+1;
    if(!/^<\/item\s*>$/.test(raw.slice(start,end+1)))continue;count++;if(count<20||count>200||count%5!==0)continue;
    const prefix=raw.slice(0,offset)+'</channel></rss>',doc=new DOMParser().parseFromString(prefix,'application/xml');if(doc.querySelector('parsererror'))continue;
    const items=Array.from(doc.querySelector('channel')?.children||[]).filter(e=>e.localName==='item'),seen=new Set(),dates=[];
    for(const [i,item] of items.entries()){const value=name=>Array.from(item.children).find(e=>e.localName===name)?.textContent.trim()||'',date=Date.parse(value('pubDate')),id=value('guid')||Array.from(item.children).find(e=>e.localName==='enclosure')?.getAttribute('url')||'missing-'+i;if(!Number.isFinite(date)||date>Date.now()||['bonus','trailer'].includes(value('episodeType').toLowerCase())||seen.has(id))continue;seen.add(id);dates.push(date);}
    if(dates.length>=20&&new Set(dates.slice(0,20)).size>=4&&dates.every((date,i)=>!i||date<=dates[i-1])&&parse(prefix).averageSeconds!==null)return prefix;

   }return null;},value(){return raw;}};
 }
 async function readStream(reader,signal){const sample=sampler(),decoder=new TextDecoder();let bytes=0;
  try{while(true){if(signal?.aborted)throw new DOMException('Feed read stopped.','AbortError');const part=await reader.read();if(signal?.aborted)throw new DOMException('Feed read stopped.','AbortError');if(part.done)break;const remaining=App.config.controls.maxImportBytes-bytes;bytes+=part.value.byteLength;const prefix=sample.push(decoder.decode(part.value.subarray(0,Math.max(0,remaining)),{stream:true}));if(prefix){if(new TextEncoder().encode(prefix).length>App.config.controls.maxImportBytes)throw new Error('Recent RSS sample exceeds 5 MiB.');await reader.cancel();return prefix;}if(bytes>App.config.controls.maxImportBytes)throw new Error('Could not collect a complete recent RSS sample within 5 MiB.');}
   sample.push(decoder.decode());return sample.value();
  }catch(e){await reader.cancel().catch(()=>{});throw e;}
 }
 async function readFile(file,signal){if(file.stream)return readStream(file.stream().getReader(),signal);if(file.size>App.config.controls.maxImportBytes)throw new Error('This browser cannot stream large RSS files.');return file.text();}
 async function refresh(catalog,signal){if(!catalog.feedUrl)throw new Error('Link a public feed first.');let feedUrl=p.url(catalog.feedUrl,true);if(window.location?.protocol==='https:'&&feedUrl.startsWith('http:'))feedUrl='https:'+feedUrl.slice(5);return parse(await App.podcastCatalog.request(feedUrl,signal,true),catalog);}
 App.podcastFeed={parse,refresh,readStream,readFile};
})();
