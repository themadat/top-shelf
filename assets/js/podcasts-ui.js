(function(){
 'use strict';const App=window.LocalApp,p=App.podcasts,u=App.utils,esc=u.escapeHtml,$=s=>document.querySelector(s);
 const state=()=>App.storage.getState();
 function snapshot(){return {rows:u.stableJson(state().workspace.podcasts),workspace:u.stableJson(state().workspace),stored:localStorage.getItem(App.config.storage.stateKey)};}
 function guard(before){const stored=localStorage.getItem(App.config.storage.stateKey);let sameContent=false;try{sameContent=u.stableJson(JSON.parse(stored)?.workspace)===before.workspace;}catch(_){}if(u.stableJson(state().workspace)!==before.workspace||(stored!==before.stored&&!sameContent))throw new Error('Saved data changed. Reopen the editor or preview again before saving.');}
 async function commit(rows,before,recovery,valid){
  guard(before);const next=u.clone(state());next.workspace.podcasts=p.normalizeList(rows);
  const current=u.stableJson(state());if(!App.storage.saveNow())throw new Error('Could not save current data.');const stored=localStorage.getItem(App.config.storage.stateKey);
  if(recovery&&!await App.storage.saveRecoveryAsync(recovery))throw new Error('Could not save recovery. Nothing changed.');
  if(valid&&!valid())throw new Error('The operation was cancelled.');
  if(u.stableJson(state())!==current||localStorage.getItem(App.config.storage.stateKey)!==stored)throw new Error('Data changed while saving recovery. Nothing changed.');
  App.storage.replace(next,{saveRecovery:false,reason:'podcasts-save'});
 }
 function pref(patch){App.storage.mutate(s=>Object.assign(s.ui.podcasts,patch),{touch:false,reason:'podcasts-preference'});}
 function render(){
  const all=state().workspace.podcasts.filter(r=>!r.deleted),prefs=state().ui.podcasts;
  const tab=$('[data-shelf="podcasts"]');if(tab){tab.querySelector('.shelf-tab-count').textContent=all.length;tab.setAttribute('aria-label','Podcasts, '+all.length+' entries');}
  if($('#podcastsSearch').value!==prefs.query)$('#podcastsSearch').value=prefs.query;
  const names=[...new Set(all.flatMap(r=>p.effective(r,'categories').map(c=>c.name)))].sort();
  $('#podcastsCategory').innerHTML='<option value="all">All</option>'+names.map(n=>'<option>'+esc(n)+'</option>').join('');
  for(const field of ['status','activity','size','frequency','category','membership'])$('#podcasts'+field[0].toUpperCase()+field.slice(1)).value=prefs[field];
  $('#podcastsSort').value=prefs.sort;$('#podcastsDirection').textContent=prefs.direction==='asc'?'Ascending':'Descending';
  let rows=all.filter(r=>(!prefs.query||p.searchable(r).includes(prefs.query.toLowerCase()))&&(prefs.status==='all'||r.status===prefs.status)&&(prefs.membership==='all'||r.membership.available===prefs.membership)&&['activity','size','frequency'].every(k=>prefs[k]==='all'||p.effective(r,k)===prefs[k])&&(prefs.category==='all'||p.effective(r,'categories').some(c=>c.name===prefs.category)));
  const value=r=>prefs.sort==='cost'?p.annual(r):prefs.sort==='size'?p.sizes.indexOf(p.effective(r,'size')):p.effective(r,prefs.sort);
  rows.sort((a,b)=>{const av=value(a),bv=value(b);if(av==null||bv==null)return av==null?(bv==null?0:1):-1;return(typeof av==='number'?av-bv:String(av).localeCompare(String(bv)))*(prefs.direction==='desc'?-1:1);});
  $('#podcastsCount').textContent=rows.length+' / '+all.length+' entries';$('#podcastsEmpty').hidden=!!rows.length;
  $('#podcastsRows').innerHTML=rows.map(r=>{const amount=p.annual(r),website=p.effective(r,'website');return '<tr><th scope="row"><button class="podcast-name" data-podcast-open="'+esc(r.id)+'">'+esc(r.title)+'</button><small>'+esc(r.kind==='Membership'?'Membership entry':r.catalog.appleId?'Catalog linked':'Not linked')+'</small></th><td>'+esc(r.status)+'</td><td title="'+esc(r.activity==='Unknown'?r.catalog.activityReason:'Manual activity')+'">'+(r.kind==='Membership'?'—':esc(p.effective(r,'activity'))+(r.activity==='Unknown'&&r.catalog.activityReason.startsWith('Estimated')?' (est.)':''))+'</td><td>'+esc(p.effective(r,'size'))+'</td><td>'+esc(p.effective(r,'frequency'))+'</td><td>'+p.effective(r,'categories').map(c=>esc(c.name)+(c.subcategories.length?' · '+esc(c.subcategories.join(', ')):'' )).join('<br>')+'</td><td>'+esc(r.membership.available)+(r.membership.tier?'<small>'+esc(r.membership.tier)+'</small>':'')+'</td><td>'+esc(amount===null?'Unknown':r.membership.currency+' '+amount.toFixed(2)+(r.membership.basis==='Monthly'?' (est.)':''))+'</td><td>'+(website?'<a href="'+esc(website)+'" target="_blank" rel="noopener noreferrer">Website</a>':'—')+'</td></tr>';}).join('');
 }
 function init(){
  for(const [field,values] of [['status',p.statuses],['activity',p.activities],['size',p.sizes],['frequency',p.frequencies],['membership',['Yes','No','Unknown']]])$('#podcasts'+field[0].toUpperCase()+field.slice(1)).innerHTML='<option value="all">All</option>'+values.map(v=>'<option>'+v+'</option>').join('');
  $('#podcastsSearch').addEventListener('input',e=>pref({query:e.target.value}));
  for(const field of ['status','activity','size','frequency','category','membership','sort'])$('#podcasts'+field[0].toUpperCase()+field.slice(1)).addEventListener('change',e=>pref({[field]:e.target.value}));
  $('#podcastsDirection').addEventListener('click',()=>pref({direction:state().ui.podcasts.direction==='asc'?'desc':'asc'}));
  $('#podcastsAdd').addEventListener('click',function(){App.podcastsEditor.open(null,this);});
  $('#podcastsRows').addEventListener('click',e=>{const button=e.target.closest('[data-podcast-open]');if(button)App.podcastsEditor.open(button.dataset.podcastOpen,button);});
  window.addEventListener('app:statechange',render);render();
 }
 App.podcastsUI={init,render,snapshot,guard,commit};
})();
