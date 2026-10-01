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
 async function refresh(catalog,signal){if(!catalog.feedUrl)throw new Error('Link a public feed first.');return parse(await App.podcastCatalog.request(p.url(catalog.feedUrl,true),signal,true),catalog);}
 App.podcastFeed={parse,refresh};
})();
