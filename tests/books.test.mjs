import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
function harness(fetch = async () => { throw new Error('Offline'); }) {
  const c = vm.createContext({ window: {}, URL, TextEncoder, structuredClone, AbortController, DOMException, fetch, setTimeout: (fn, ms) => setTimeout(fn, ms === 12000 ? ms : 0), clearTimeout });
  for (const f of ['config.js','core/utils.js','core/movies.js','core/tv.js','core/books.js','core/open-library.js']) vm.runInContext(readFileSync(new URL('../assets/js/' + f, import.meta.url), 'utf8'), c);
  const App = c.window.LocalApp; App.utils.sanitizeRichHtml = String; App.utils.richTextToPlainText = String;
  vm.runInContext(readFileSync(new URL('../assets/js/core/state.js', import.meta.url), 'utf8'), c);
  return App;
}
const App = harness(), books = App.books, model = App.stateModel;
const book = (extra = {}) => books.normalize({ id: 'book-one', title: 'Sample', ...extra });
const plain = x => JSON.parse(JSON.stringify(x));
const raw = { key: '/works/OL27482W', title: 'The Hobbit', author_name: ['J.R.R. Tolkien'], author_key: ['OL26320A'], first_publish_year: 1937, subject: ['Fantasy fiction','Fiction','Middle Earth','Fantasy'], cover_i: 123, number_of_pages_median: 310, editions: { docs: [{ key: '/books/OL123M', publish_date: ['September 27, 1995'], publisher: ['Houghton Mifflin'], number_of_pages: 320 }] } };
const response = (data, status = 200) => ({ ok: status === 200, status, headers: { get: () => null }, text: async () => JSON.stringify(data) });

test('book fields keep zero, blanks, ownership, multiple formats and plain writing distinct', () => {
  const b = book({ rating: 0, priority: 1, yearRead: 2020, ownership: 'Owned', formats: ['Ebook'], audible: true, review: '<b>Review</b>', notes: 'Line one\n\nLine two', authors: ['Alice','alice'], genres: ['Fantasy','fantasy'] });
  assert.equal(b.rating, 0); assert.equal(b.status, 'Want to Read'); assert.equal(b.yearRead, 2020);
  assert.deepEqual(plain(b.formats), ['Ebook','Audiobook']); assert.equal(b.review, '<b>Review</b>'); assert.equal(b.notes, 'Line one\n\nLine two');
  assert.equal(b.authors.length, 1); assert.equal(b.genres.length, 1); assert.equal(book().rating, null); assert.equal(book().yearRead, null); assert.equal(book().ownership, 'Unknown');
  for (const patch of [{ rating: 5.5 }, { rating: '4' }, { rating: 1.25 }, { priority: 0 }, { yearRead: 2020.5 }, { title: '' }, { notes: 'x'.repeat(20001) }, { authors: {} }, { catalog: { workId: 'javascript:alert(1)' } }]) assert.throws(() => book(patch));
});

test('old Books priority sorting follows the combined # column', () => {
  assert.equal(books.preferences({ sort: 'priority', view: 'wishlist' }).sort, 'rating');
  assert.equal(books.preferences({ sort: 'status' }).sort, 'title');
});

test('book identity validation rejects ambiguous linked duplicates and preserves tombstones', () => {
  const b = book({ catalog: { workId: 'OL1W', isbn: '123456789X' } });
  assert.throws(() => books.normalizeList([b, { ...b, id: 'another' }]), /already/);
  assert.throws(() => books.normalizeList([b, book({ catalog: { workId: 'OL2W' } })]), /Duplicate/);
  assert.equal(books.normalizeList([b, { id: 'deleted', deleted: true }]).length, 2);
  assert.throws(() => books.normalizeList([{}]), /identity/);
  assert.throws(() => books.normalizeList(Array.from({length: 300}, (_, i) => book({id: 'b'+i, notes: 'x'.repeat(20000)}))), /size limit/);
});

test('refresh updates untouched metadata while keeping corrections, personal fields and prior rating on missing data', () => {
  const c = books.catalog({workId:'OL1W', title:'Original', authors:['Alice'], genres:['History'], average:4, ratingsCount:10, ratingsFetchedAt:'2026-01-01T00:00:00Z'});
  const prior = book({title:'My title',authors:c.authors,genres:['Memoir'],kind:'Nonfiction',rating:0,status:'Read',yearRead:2025,notes:'Keep',review:'Good',ownership:'Owned',formats:['Ebook'],priority:1,catalog:c});
  const fresh = books.refresh(prior, {...c, title:'Updated', authors:['Alice Updated'], genres:['Science'], kind:'Fiction', average:null, ratingsCount:null});
  assert.equal(fresh.title, 'My title'); assert.equal(fresh.authors[0].name, 'Alice Updated'); assert.deepEqual(plain(fresh.genres), ['Memoir']); assert.equal(fresh.kind, 'Nonfiction');
  for (const key of ['rating','status','yearRead','notes','review','ownership','priority']) assert.equal(fresh[key],prior[key]);
  assert.equal(fresh.catalog.average,4); assert.equal(fresh.catalog.ratingsFetchedAt,prior.catalog.ratingsFetchedAt);
  assert.throws(() => books.refresh(prior, {...c,workId:'OL2W'}), /different/);
});

test('pivots count completed books once per group, preserve author identity and average only personal scores', () => {
  const rows = [book({status:'Read', rating:0, authors:[{id:'OL1A',name:'Alex'},{id:'OL2A',name:'Alex'}], genres:['Fantasy','fantasy'], yearRead:2020}), book({id:'two',status:'Read',rating:4,authors:[{id:'OL1A',name:'Alex'}],genres:['Fantasy','History'],yearRead:2020}), book({id:'three',status:'Read'}), book({id:'wishlist',rating:5}), {id:'deleted',deleted:true}];
  const author = books.pivots(rows,'authors'); assert.equal(author.find(g=>g.key==='OL1A').count,2); assert.equal(author.find(g=>g.key==='OL1A').average,2); assert.equal(author.find(g=>g.key==='OL2A').count,1);
  const genre = books.pivots(rows,'genres').find(g=>g.key==='fantasy'); assert.equal(genre.count,2); assert.equal(genre.rated,2); assert.equal(genre.average,2);
  const years = books.pivots(rows,'yearRead'); assert.equal(years.find(g=>g.key==='').average,null); assert.equal(years.find(g=>g.key==='2020').count,2);
});

test('books migrate legacy local and TV cloud data and survive full backup/content round trips', () => {
  const old = model.createDefaultState(); old.schemaVersion = 7; delete old.workspace.books;
  old.workspace.tvShows = [App.tv.normalize({id:'tv-one',title:'Preserved TV'})];
  assert.equal(model.prepare(old).state.workspace.books.length,0); assert.equal(model.prepare(old).state.workspace.tvShows[0].title,'Preserved TV');
  const previous = model.prepareSync({syncFormat:'top-shelf-app-data',syncVersion:6,schemaVersion:10,data:{tvShows:old.workspace.tvShows,notes:'Keep notes'}});
  assert.equal(previous.state.workspace.tvShows.length,1); assert.equal(previous.state.workspace.books.length,0);
  const state = model.normalize({workspace:{books:[book({notes:'First\nSecond',rating:0,yearRead:2024})]},ui:{books:{view:'wishlist',query:'Sample',widths:{title:350}}}});
  assert.deepEqual(plain(model.prepare(model.exportEnvelope(state)).state.workspace.books),plain(state.workspace.books));
  const payload = model.syncPayload(state); assert.equal(payload.syncVersion,9); assert.equal(payload.schemaVersion,13); assert.equal(JSON.stringify(payload).includes('widths'),false);
  assert.equal(model.syncHash(model.prepareSync(payload).state),model.syncHash(state));
  assert.throws(()=>model.prepareSync({...payload,syncVersion:6,schemaVersion:10}),/invalid/);
  assert.throws(()=>model.prepareSync({...payload,syncVersion:10,schemaVersion:14}),/not supported/);
  const remote = model.normalize({workspace:{books:[book({id:'remote'})]}});
  assert.equal(model.applySync(state,remote).ui.books.widths.title,350); assert.equal(model.resetPreferences(state).ui.books.query,'');
});

test('books merge disjoint entries but reject same-book edits, deletions and catalog duplicates', () => {
  const local=model.normalize({workspace:{books:[book({catalog:{workId:'OL1W'}})]}});
  const remote=model.normalize({workspace:{books:[book({id:'two'})]}});
  assert.equal(model.merge(local,remote).workspace.books.length,2);
  for (const b of [book({notes:'Concurrent'}),{id:'book-one',deleted:true},book({id:'other',catalog:{workId:'OL1W'}})]) assert.equal(model.canMerge(local,model.normalize({workspace:{books:[b]}})),false);
});

test('provider lookup selects fields, ISBN edition, curated genres and real ratings without credentials', async () => {
  const calls=[];
  const a=harness(async (url,options)=>{calls.push({url,options});return response(url.includes('ratings.json')?{summary:{average:4.29,count:500}}:{docs:[raw]});});
  const results=await a.openLibrary.search('978-0261103344','isbn'); const d=await a.openLibrary.details(results[0]);
  assert.equal(results[0].isbn,'9780261103344'); assert.equal(results[0].editionId,'OL123M'); assert.equal(d.catalog.average,4.29); assert.equal(d.catalog.ratingsCount,500);
  assert.equal(results[0].publishDate,'September 27, 1995'); assert.equal(results[0].publisher,'Houghton Mifflin'); assert.equal(results[0].pages,320); assert.equal(results[0].pagesSource,'edition');
  const median=a.openLibrary.fromSearch({...raw,editions:{docs:[{key:'/books/OL123M'}]}}); assert.equal(median.pages,310); assert.equal(median.pagesSource,'work-median');
  assert.deepEqual(plain(results[0].subjects),['Fantasy fiction','Fiction','Middle Earth','Fantasy']);
  assert.deepEqual(plain(results[0].genres),['Fantasy']); assert.equal(results[0].kind,'Fiction'); assert.equal(calls[0].options.credentials,'omit'); assert.equal(calls[0].options.headers.Authorization,undefined);
  assert.equal(new URL(calls[0].url).searchParams.get('isbn'),'9780261103344'); assert.equal(calls.length,2);
  await a.openLibrary.search('9780261103344','isbn'); assert.equal(calls.length,2);
});

test('refresh reads the selected edition and preserves existing catalog values when absent', async () => {
  const calls=[];
  const a=harness(async url=>{calls.push(url);return response(url.includes('/books/OL123M.json')?{publish_date:'2001',publishers:['Updated Publisher'],number_of_pages:321}:url.includes('ratings.json')?{summary:{average:4.2,count:10}}:{docs:[raw]});});
  const prior=a.books.catalog({workId:'OL27482W',editionId:'OL123M',subjects:['Earlier Subject'],publishDate:'1995',publisher:'Old Publisher',pages:300});
  const refreshed=await a.openLibrary.details(prior,undefined,true);
  assert.equal(refreshed.catalog.publishDate,'2001'); assert.equal(refreshed.catalog.publisher,'Updated Publisher'); assert.equal(refreshed.catalog.pages,321); assert.equal(refreshed.catalog.pagesSource,'edition');
  assert.equal(calls.length,3);
  const kept=a.books.refresh(a.books.normalize({id:'one',title:'The Hobbit',catalog:prior}),a.books.catalog({workId:'OL27482W'}));
  assert.equal(kept.catalog.publisher,'Old Publisher'); assert.deepEqual(plain(kept.catalog.subjects),['Earlier Subject']);
});

test('provider errors, zero ratings, malformed responses and cancellation keep metadata usable', async () => {
  const a=harness(async()=>response({summary:{average:null,count:0}}));
  const d=await a.openLibrary.details(a.openLibrary.fromSearch(raw)); assert.equal(d.catalog.average,null); assert.match(d.warning,/No community/);
  const offline=harness(); const missing=await offline.openLibrary.details(offline.openLibrary.fromSearch(raw)); assert.match(missing.warning,/unavailable/);
  const bad=harness(async()=>response({oops:true})); await assert.rejects(()=>bad.openLibrary.search('Title','title'),/invalid search/);
  const rate=harness(async()=>response({},429)); await assert.rejects(()=>rate.openLibrary.search('Title','title'),/busy/);
  const c=new AbortController(); c.abort(); await assert.rejects(()=>a.openLibrary.search('Title','title',c.signal),{name:'AbortError'});
  await assert.rejects(()=>a.openLibrary.search('bad','isbn'),/ISBN/);
  assert.throws(()=>a.openLibrary.fromSearch({...raw,key:'https://evil.test'}),/invalid book/);
});
