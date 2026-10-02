(function(){
 'use strict';const App=window.LocalApp,p=App.podcasts,u=App.utils,esc=u.escapeHtml,$=s=>document.querySelector(s);
 const state=()=>App.storage.getState();
 function snapshot(){return {rows:u.stableJson(state().workspace.podcasts),workspace:u.stableJson(state().workspace),stored:localStorage.getItem(App.config.storage.stateKey)};}
 function guard(before){const stored=localStorage.getItem(App.config.storage.stateKey);let sameContent=false;try{sameContent=u.stableJson(App.storageCodec.parse(stored)?.workspace)===before.workspace;}catch(_){}if(u.stableJson(state().workspace)!==before.workspace||(stored!==before.stored&&!sameContent))throw new Error('Saved data changed. Reopen the editor or preview again before saving.');}
 async function commit(rows,before,recovery,valid){
  guard(before);const next=u.clone(state());next.workspace.podcasts=p.normalizeList(rows);
  const current=u.stableJson(state());if(!App.storage.saveNow())throw new Error('Could not save current data.');const stored=localStorage.getItem(App.config.storage.stateKey);
  if(recovery&&!await App.storage.saveRecoveryAsync(recovery))throw new Error('Could not save recovery. Nothing changed.');
  if(valid&&!valid())throw new Error('The operation was cancelled.');
  if(u.stableJson(state())!==current||localStorage.getItem(App.config.storage.stateKey)!==stored)throw new Error('Data changed while saving recovery. Nothing changed.');
  App.storage.replace(next,{saveRecovery:false,reason:'podcasts-save'});
 }
 function pref(patch){App.storage.mutate(s=>Object.assign(s.ui.podcasts,patch),{touch:false,reason:'podcasts-preference'});}
 const columns=[['rating','Rating',60],['title','Name',210],['author','Publisher',145],['status','My Status',125],['activity','Show Status',100],['lastEpisode','Last Episode',110],['size','Length',65],['frequency','Frequency',155],['categories','Categories',140],['subcategories','Subcategories',160],['membership','Membership',140],['cost','Annual Cost',105],['website','Website',85],['kind','Entry Type',100],['averageSeconds','Mean Length',105],['feedFetchedAt','Feed Checked',110],['sourceLast','Last (Source)',125],['sourceTime','Time (Source)',115]];
 const dimensions=[['category','Categories'],['status','My Status'],['activity','Show Status'],['size','Length'],['frequency','Frequency'],['membership','Membership'],['author','Publishers']];
 let saving=false;
 function tone(value){return 'podcast-tone-'+({Listening:'blue',Stopped:'red',Active:'green',Inactive:'purple'}[value]||'muted');}
 function options(values,current){return values.map(v=>'<option value="'+esc(v)+'"'+(v===current?' selected':'')+' class="'+tone(v)+'">'+esc(v)+'</option>').join('');}
 function ratingOptions(current){return '<option value="">—</option>'+options([1,2,3,4,5],current);}
 function membership(r){return r.membership.tier?(r.membership.available==='Yes'?r.membership.tier:r.membership.available+' · '+r.membership.tier):r.membership.available;}
 function groupsFor(r,key){return key==='category'?p.effective(r,'categories').map(c=>c.name):[key==='membership'?r.membership.available:key==='author'?r.catalog.author:p.effective(r,key)];}
 function badge(value){return value===null?'—':'<span class="movie-score" style="background:'+App.movies.color(value,false)+'">'+value.toFixed(1)+'</span>';}
 function renderPivots(rows){
  const prefs=state().ui.podcasts;
  $('#podcastsPivotSearch').value=prefs.pivotQuery;$('#podcastsPivotMin').value=prefs.minimum;$('#podcastsPivotSort').value=prefs.pivotSort;$('#podcastsPivotDirection').textContent=prefs.pivotDirection==='asc'?'Ascending':'Descending';
  $('#podcastsPivotCards').innerHTML=dimensions.map(([key,label])=>{
   const buckets=new Map();rows.forEach(r=>new Set(groupsFor(r,key).filter(Boolean)).forEach(name=>{if(!buckets.has(name))buckets.set(name,{name,count:0,total:0,rated:0});const b=buckets.get(name);b.count++;if(r.rating!==null){b.rated++;b.total+=r.rating;}}));
   const groups=[...buckets.values()].map(g=>Object.assign(g,{average:g.rated?g.total/g.rated:null,score:App.pivots.score(g.rated,g.rated?g.total/g.rated:null)})).filter(g=>g.count>=prefs.minimum&&g.name.toLowerCase().includes(prefs.pivotQuery.toLowerCase()));
   groups.sort((a,b)=>{const av=a[prefs.pivotSort],bv=b[prefs.pivotSort];if(av===null||bv===null)return av===bv?a.name.localeCompare(b.name):av===null?1:-1;return (typeof av==='number'?av-bv:av.localeCompare(bv))*(prefs.pivotDirection==='asc'?1:-1)||a.name.localeCompare(b.name);});const max=Math.max(1,...groups.map(g=>g.count));
   return '<section class="pivot-card"><header><h3>'+label+'</h3><small>'+groups.length+' groups</small></header><div class="pivot-table-scroll" tabindex="0" role="region" aria-label="'+label+' podcast pivot"><table><thead><tr><th scope="col">Group</th><th scope="col">#</th><th scope="col" title="Average personal rating">x̄</th><th scope="col" title="Weighted score">∑</th></tr></thead><tbody>'+groups.map(g=>{const avg=g.rated?g.total/g.rated:null;return '<tr><th scope="row"><button class="podcast-name" data-podcast-pivot="'+key+'" data-value="'+esc(g.name)+'">'+esc(g.name)+'</button></th><td><span class="pivot-count-bar" style="--share:'+g.count/max*100+'%">'+g.count+'</span></td><td title="'+g.rated+' rated entries">'+badge(avg)+'</td><td>'+badge(App.pivots.score(g.rated,avg))+'</td></tr>';}).join('')+(groups.length?'':'<tr><td colspan="4">No matching groups.</td></tr>')+'</tbody></table></div></section>';
  }).join('');
 }
 function render(){
  const all=state().workspace.podcasts.filter(r=>!r.deleted),prefs=state().ui.podcasts;
  const tab=$('[data-shelf="podcasts"]');if(tab){tab.querySelector('.shelf-tab-count').textContent=all.length;tab.setAttribute('aria-label','Podcasts, '+all.length+' entries');}
  if($('#podcastsSearch').value!==prefs.query)$('#podcastsSearch').value=prefs.query;
  const names=[...new Set(all.flatMap(r=>p.effective(r,'categories').map(c=>c.name)))].sort();
  $('#podcastsCategory').innerHTML='<option value="all">All</option>'+names.map(n=>'<option>'+esc(n)+'</option>').join('');
  $('#podcastsPublisher').innerHTML='<option value="all">All</option>'+[...new Set(all.map(r=>r.catalog.author).filter(Boolean))].sort().map(n=>'<option>'+esc(n)+'</option>').join('');
  for(const field of ['status','activity','size','frequency','category','membership','publisher'])$('#podcasts'+field[0].toUpperCase()+field.slice(1)).value=prefs[field];
  $('#podcastsStatus').className=tone(prefs.status);$('#podcastsActivity').className=tone(prefs.activity);
  $('#podcastsSort').value=prefs.sort;$('#podcastsDirection').textContent=prefs.direction==='asc'?'Ascending':'Descending';
  $('#podcastsListView').hidden=prefs.view==='pivots';$('#podcastsPivotsView').hidden=prefs.view!=='pivots';
  document.querySelectorAll('[data-podcasts-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.podcastsView===prefs.view)));
  const rows=all.filter(r=>(!prefs.query||p.searchable(r).includes(prefs.query.toLowerCase()))&&(prefs.status==='all'||r.status===prefs.status)&&(prefs.membership==='all'||r.membership.available===prefs.membership)&&['activity','size','frequency'].every(k=>prefs[k]==='all'||p.effective(r,k)===prefs[k])&&(prefs.category==='all'||p.effective(r,'categories').some(c=>c.name===prefs.category))&&(prefs.publisher==='all'||r.catalog.author===prefs.publisher));
  const value=r=>prefs.sort==='cost'?p.annual(r):prefs.sort==='status'?p.statuses.indexOf(r.status):prefs.sort==='activity'?p.activities.indexOf(p.effective(r,'activity')):prefs.sort==='size'?p.sizes.indexOf(p.effective(r,'size')):prefs.sort==='frequency'?p.frequencies.indexOf(p.effective(r,'frequency')):['author','lastEpisode','averageSeconds','feedFetchedAt'].includes(prefs.sort)?(r.catalog[prefs.sort]===0?0:r.catalog[prefs.sort]||null):prefs.sort==='sourceLast'?r.legacy.last||null:prefs.sort==='sourceTime'?r.legacy.time:p.effective(r,prefs.sort);
  rows.sort((a,b)=>{const av=value(a),bv=value(b);if(av==null||bv==null)return av==null?(bv==null?a.title.localeCompare(b.title):1):-1;return(typeof av==='number'?av-bv:String(av).localeCompare(String(bv)))*(prefs.direction==='desc'?-1:1)||a.title.localeCompare(b.title);});
  $('#podcastsCount').textContent=rows.length+' / '+all.length+' entries';$('#podcastsEmpty').hidden=!!rows.length;
  $('#podcastsTable colgroup').innerHTML=columns.map(([, ,width])=>'<col style="width:'+width+'px">').join('');
  $('#podcastsTable').style.minWidth=columns.reduce((sum,c)=>sum+c[2],0)+'px';
  $('#podcastsTable thead').innerHTML='<tr>'+columns.map(([key,label])=>'<th scope="col" data-column="'+key+'"'+(prefs.sort===key?' aria-sort="'+(prefs.direction==='asc'?'ascending':'descending')+'"':'')+'>'+(['categories','subcategories','membership','website'].includes(key)?label:'<button type="button" data-podcast-sort="'+key+'">'+label+(prefs.sort===key?' <span aria-hidden="true">'+App.icons.markup(prefs.direction==='asc'?'sortUp':'sortDown')+'</span>':'')+'</button>')+'</th>').join('')+'</tr>';
  $('#podcastsRows').innerHTML=rows.map(r=>{
   const amount=p.annual(r),website=p.effective(r,'website'),activity=p.effective(r,'activity'),categories=p.effective(r,'categories'),cats=categories.map(c=>c.name).join('; '),subs=categories.filter(c=>c.subcategories.length).map(c=>c.name+' > '+c.subcategories.join(', ')).join('; '),linked=!!(r.catalog.appleId||r.catalog.feedUrl);
   const link=linked?'<span class="podcast-linked" role="img" aria-label="Catalog linked" title="'+esc(r.catalog.appleId?'Catalog linked · Apple ID '+r.catalog.appleId:'Public feed linked')+'">'+App.icons.markup('link')+'</span>':'';
   const cell=(text,title)=>({html:esc(text??'—'),title:title??String(text??'')});
   const cells={
    rating:{html:'<span class="podcast-rating"><span class="movie-score"'+(r.rating!==null?' style="background:'+App.movies.color(r.rating,false)+'"':'')+' aria-hidden="true">'+(r.rating??'—')+'</span><select data-podcast-edit="rating" aria-label="Rating for '+esc(r.title)+'">'+ratingOptions(r.rating)+'</select></span>'},
    title:{html:'<div class="podcast-title-line"><button class="podcast-name" data-podcast-open="'+esc(r.id)+'" title="'+esc(r.title)+'">'+esc(r.title)+'</button>'+link+'</div>'},
    status:{html:'<select class="'+tone(r.status)+'" data-podcast-edit="status" aria-label="My status for '+esc(r.title)+'">'+options(p.statuses,r.status)+'</select>'},
    activity:Object.assign(cell(r.kind==='Membership'?'—':activity,r.activity==='Unknown'?r.catalog.activityReason:'Manual show status'),{className:tone(activity)}),
    size:cell(p.effective(r,'size')),frequency:cell(p.effective(r,'frequency')),categories:cell(cats||'—'),subcategories:cell(subs||'—'),membership:cell(membership(r)),
    cost:cell(amount===null?'—':'$'+amount,amount===null?'Annual cost unknown':r.membership.currency+' '+amount+(r.membership.basis==='Monthly'?' · Yearly estimate (monthly ×12)':'')),
    author:cell(r.catalog.author||'—'),lastEpisode:cell(r.catalog.lastEpisode.slice(0,10)||'—'),
    website:{html:website?'<a href="'+esc(website)+'" target="_blank" rel="noopener noreferrer">Website</a>':'—',title:website},
    kind:cell(r.kind),averageSeconds:cell(r.catalog.averageSeconds===null?'—':Math.round(r.catalog.averageSeconds/60)+' min',r.catalog.averageSeconds===null?'Insufficient episode durations':'Mean from '+r.catalog.sampleCount+' recent full episodes'),
    feedFetchedAt:cell(r.catalog.feedFetchedAt.slice(0,10)||'—'),sourceLast:cell(r.legacy.last||'—','Original imported Last; meaning unspecified'),sourceTime:cell(r.legacy.time,'Original imported Time; units unspecified')
   };
   return '<tr data-podcast-id="'+esc(r.id)+'">'+columns.map(([key])=>{const c=cells[key],tag=key==='title'?'th':'td';return '<'+tag+(tag==='th'?' scope="row"':'')+' data-column="'+key+'"'+(c.className?' class="'+c.className+'"':'')+(c.title?' title="'+esc(c.title)+'"':'')+'>'+c.html+'</'+tag+'>';}).join('')+'</tr>';
  }).join('');
  renderPivots(rows);
 }
 async function edit(select){
  if(saving){render();return;}saving=true;
  const id=select.closest('[data-podcast-id]').dataset.podcastId,field=select.dataset.podcastEdit,value=field==='rating'?(select.value===''?null:Number(select.value)):select.value,before=snapshot();
  try{await commit(state().workspace.podcasts.map(r=>r.id===id?Object.assign({},r,{[field]:value}):r),before,null);}
  catch(e){App.components.toast(e.message,{title:'Podcast change not saved',kind:'error'});}
  finally{saving=false;render();const target=[...$('#podcastsRows').querySelectorAll('[data-podcast-edit]')].find(s=>s.closest('tr').dataset.podcastId===id&&s.dataset.podcastEdit===field);target?.focus({preventScroll:true});}
 }
 function init(){
  for(const [field,values] of [['status',p.statuses],['activity',p.activities],['size',p.sizes],['frequency',p.frequencies],['membership',['Yes','No','Unknown']]])$('#podcasts'+field[0].toUpperCase()+field.slice(1)).innerHTML='<option value="all">All</option>'+options(values);
  $('#podcastsSearch').addEventListener('input',e=>pref({query:e.target.value}));
  for(const field of ['status','activity','size','frequency','category','membership','publisher','sort'])$('#podcasts'+field[0].toUpperCase()+field.slice(1)).addEventListener('change',e=>pref({[field]:e.target.value}));
  $('#podcastsDirection').addEventListener('click',()=>pref({direction:state().ui.podcasts.direction==='asc'?'desc':'asc'}));
  document.querySelectorAll('[data-podcasts-view]').forEach(b=>b.addEventListener('click',()=>pref({view:b.dataset.podcastsView})));
  $('#podcastsPivotSearch').addEventListener('input',e=>pref({pivotQuery:e.target.value}));
  $('#podcastsPivotMin').addEventListener('change',e=>pref({minimum:Math.max(1,Math.min(2000,Number(e.target.value)||1))}));
  $('#podcastsPivotSort').addEventListener('change',e=>pref({pivotSort:e.target.value}));
  $('#podcastsPivotDirection').addEventListener('click',()=>pref({pivotDirection:state().ui.podcasts.pivotDirection==='asc'?'desc':'asc'}));
  $('#podcastsClear').addEventListener('click',()=>pref({query:'',status:'all',activity:'all',size:'all',frequency:'all',category:'all',membership:'all',publisher:'all'}));
  $('#podcastsAdd').addEventListener('click',function(){App.podcastsEditor.open(null,this);});
  $('#podcastsTable').addEventListener('click',e=>{const button=e.target.closest('[data-podcast-open]');if(button)App.podcastsEditor.open(button.dataset.podcastOpen,button);const sort=e.target.closest('[data-podcast-sort]');if(sort){const key=sort.dataset.podcastSort;pref({sort:key,direction:state().ui.podcasts.sort===key&&state().ui.podcasts.direction==='asc'?'desc':'asc'});$('#podcastsTable [data-podcast-sort="'+key+'"]').focus();}});
  $('#podcastsRows').addEventListener('change',e=>{if(e.target.matches('[data-podcast-edit]'))edit(e.target);});
  $('#podcastsPivotCards').addEventListener('click',e=>{const b=e.target.closest('[data-podcast-pivot]');if(b){$('.podcasts-filter-disclosure').open=true;pref({[b.dataset.podcastPivot==='author'?'publisher':b.dataset.podcastPivot]:b.dataset.value,view:'list'});}});
  window.addEventListener('app:statechange',render);render();
 }
 App.podcastsUI={init,render,snapshot,guard,commit,tone};
})();
