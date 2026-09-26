import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
const context=vm.createContext({window:{},structuredClone, URL, console});
for(const file of ['config.js','core/utils.js','core/movies.js','core/subgenres.js','core/state.js']) vm.runInContext(readFileSync(new URL('../assets/js/'+file,import.meta.url),'utf8'),context);
const A=context.window.LocalApp;
A.utils.sanitizeRichHtml = String; A.utils.richTextToPlainText = String;
const movie=(id,extra={})=>A.movies.normalize({id:String(id),tmdbId:id,title:'Movie '+id,status:'wishlist',...extra});
const data=()=>[movie(1,{subgenreReviewed:true,other:'Favorite, Subgenre: Time Travel, Subgenre Neo-Noir'}),movie(2,{other:'Keep this',notes:'Private notes'}),movie(3)];
const result=(reviews)=>({format:'top-shelf-subgenre-results',version:1,reviews});
const row=(id,extra={})=>({id:String(id),tmdbId:id,reviewed:true,subgenres:[],...extra});
test('request includes pending movies, deduplicated vocabulary, instructions and no personal notes',()=>{
 const movies=data(); movies.push(movie(4,{subgenreReviewed:true,other:'Subgenre time travel'}),{id:'deleted',deleted:true});
 const request=A.subgenres.request(movies);
 assert.deepEqual(Array.from(request.supportedSubgenres),['Holmesian','Neo-Noir','Time Travel']);
 assert.deepEqual(Array.from(request.movies,m=>m.id),['2','3']);
 assert.equal(JSON.stringify(request).includes('Private notes'),false);
 assert.ok(request.instructions.length);
});
test('results append unique subgenres, retain other text, track no-match and uncertainty',()=>{
 const rows=A.subgenres.preview(data(),result([row(2,{subgenres:['time travel','Time Travel']}),row(3)]));
 assert.equal(rows[0].other,'Keep this\nSubgenre: Time Travel'); assert.equal(rows[1].change,true);assert.equal(rows[1].other,'');
 const uncertain=A.subgenres.preview(data(),result([row(2,{reviewed:false})]));assert.equal(uncertain[0].change,false);
 assert.throws(()=>A.subgenres.preview(data(),result([row(2,{reviewed:false,subgenres:['Time Travel']})])));
});
test('invalid batches cannot partially apply or target a different movie',()=>{
 for(const reviews of [[row(2),row(2)],[row(99)],[row(2,{tmdbId:3})],[row(2,{subgenres:['Invented']})],[row(2,{reviewed:'true'})],[row(1,{subgenres:['Time Travel','Neo-Noir','time travel'] }), row(2,{subgenres:[null]})]]) assert.throws(()=>A.subgenres.preview(data(),result(reviews)));
 assert.throws(()=>A.subgenres.preview(data(),{format:'top-shelf-backup',reviews:[]}));
 const movies=data();movies[1].other='x'.repeat(3999);assert.throws(()=>A.subgenres.preview(movies,result([row(2,{subgenres:['Time Travel']})])));
});
test('repeat import is a no-op and re-review requires explicit reopening',()=>{
 const movies=data(); const preview=A.subgenres.preview(movies,result([row(2,{subgenres:['Time Travel']})]))[0];
 movies[1]=A.movies.normalize({...movies[1],other:preview.other,subgenreReviewed:true});
 assert.equal(A.subgenres.preview(movies,result([row(2,{subgenres:['Time Travel']})]))[0].change,false);
 assert.throws(()=>A.subgenres.preview(movies,result([row(2,{subgenres:['Neo-Noir']})])));
});
test('old local/cloud libraries become reviewed; new movies stay pending through backup and cloud',()=>{
 const state=A.stateModel.createDefaultState({demo:false});state.workspace.movies=data();
 const old=structuredClone(state);old.schemaVersion=5;for(const movie of old.workspace.movies)delete movie.subgenreReviewed;
 assert.ok(A.stateModel.prepare(old).state.workspace.movies.every(m=>m.subgenreReviewed));
 const cloud=A.stateModel.prepareSync({syncFormat:'top-shelf-app-data',syncVersion:4,schemaVersion:8,data:{movies:old.workspace.movies}});
 assert.ok(cloud.state.workspace.movies.every(m=>m.subgenreReviewed));
 const backup=A.stateModel.prepare(A.stateModel.exportEnvelope(state)).state;
 const roundtrip=A.stateModel.prepareSync(A.stateModel.syncPayload(state)).state;
 for(const copy of [backup,roundtrip])assert.deepEqual(Array.from(copy.workspace.movies,m=>m.subgenreReviewed),[true,false,false]);
});

test('Incomplete override survives backups and cloud, and defaults off',()=>{
 const state=A.stateModel.createDefaultState({demo:false});state.workspace.movies=data();
 state.workspace.movies[0].incompleteOverride=true;
 for(const copy of [A.stateModel.prepare(A.stateModel.exportEnvelope(state)).state,A.stateModel.prepareSync(A.stateModel.syncPayload(state)).state]){
   assert.equal(copy.workspace.movies[0].incompleteOverride,true);
   assert.equal(copy.workspace.movies[1].incompleteOverride,false);
 }
});

test('Holmesian is supported without reopening existing reviews or tagging movies',()=>{
 const movies=data(), before=JSON.stringify(movies), pending=A.subgenres.queue(movies).map(movie=>movie.id);
 assert.deepEqual(Array.from(A.subgenres.vocabulary([])),['Holmesian']);
 assert.equal(A.subgenres.request(movies).supportedSubgenres.includes('Holmesian'),true);
 assert.deepEqual(A.subgenres.queue(movies).map(movie=>movie.id),pending);
 assert.equal(JSON.stringify(movies),before);
 assert.equal(A.subgenres.preview(movies,result([row(2,{subgenres:['holmesian']})]))[0].other,'Keep this\nSubgenre: Holmesian');
});


test('typo tags normalize to a single Holmesian without changing review status or unrelated text',()=>{
 const entry=movie(20,{other:'Keep Homesian in this note, Subgenre: Homesian, Subgenre Holmesian, Subgenre: Time Travel',subgenreReviewed:true});
 assert.equal(entry.other,'Keep Homesian in this note, Subgenre: Holmesian, Subgenre: Time Travel');
 assert.equal(entry.subgenreReviewed,true);
 assert.deepEqual(Array.from(A.subgenres.vocabulary([{other:'Subgenre: Homesian'}])),['Holmesian']);
 assert.equal(A.movies.normalize(entry).other,entry.other);
});

test('cloud data carries personal and TMDB ratings, legacy labels, and How through round trips',()=>{
 const state=A.stateModel.createDefaultState({demo:false});
 state.workspace.movies=[movie(21,{status:'watched',rating:4.25,how:'* HBO Max',other:'Subgenre Homesian'}),movie(22,{tmdbAverage:7.8,how:'Prime',priority:1}),movie(23,{status:'watched',historicalRating:'YES',how:'Cinema'})];
 const payload=A.stateModel.syncPayload(state);
 const restored=A.stateModel.prepareSync(payload).state.workspace.movies;
 assert.equal(payload.data.movies[0].rating,4.25);
 assert.equal(restored[0].rating,4.25);
 assert.equal(restored[0].how,'* HBO Max');
 assert.equal(restored[0].other,'Subgenre Holmesian');
 assert.equal(restored[1].tmdbAverage,7.8);
 assert.equal(restored[1].how,'Prime');
 assert.equal(restored[2].historicalRating,'YES');
 assert.equal(restored[2].rating,4);
 assert.equal(restored[2].how,'Cinema');
 const before=A.stateModel.syncHash(state);
 state.workspace.movies[0].rating=4.5;
 assert.notEqual(A.stateModel.syncHash(state),before);
 const afterRating=A.stateModel.syncHash(state);
 state.workspace.movies[0].how='Hulu';
 assert.notEqual(A.stateModel.syncHash(state),afterRating);
});
