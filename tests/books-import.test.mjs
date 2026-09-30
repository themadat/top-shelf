import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const context = vm.createContext({ window: {}, TextEncoder, structuredClone });
for (const path of ['config.js', 'core/utils.js', 'core/books.js', 'core/books-import.js']) vm.runInContext(readFileSync(new URL('../assets/js/' + path, import.meta.url), 'utf8'), context);
const { books, booksImport } = context.window.LocalApp;
const row = (id, title, extras = {}) => ({ id, title, authors: [{ name: 'An Author' }], status: 'Want to Read', rating: null, ...extras });
const file = (...rows) => ({ format: 'top-shelf-books-import', version: 1, books: rows });

test('Books import previews additions, skips existing and deleted records, and keeps saved values', () => {
  const existing = [books.normalize(row('saved', 'Already Here', { rating: 4, status: 'Read' })), { id: 'deleted', deleted: true }];
  const input = file(row('incoming', 'Already Here', { rating: 5 }), row('deleted', 'Removed'), row('new', 'New Book'));
  const preview = booksImport.preview(existing, input);
  assert.deepEqual(Array.from(preview.entries, entry => entry.reason), ['Already in library · kept unchanged', 'Previously deleted · skipped', 'Add']);
  const applied = booksImport.apply(existing, input, preview.snapshot, ['new']);
  assert.equal(applied.count, 1);
  assert.equal(applied.books.length, 3);
  assert.equal(applied.books[0].rating, 4);
  assert.equal(booksImport.preview(applied.books, input).entries.filter(entry => !entry.skip).length, 0);
});

test('Books import rejects stale previews, duplicate identities and invalid content', () => {
  const input = file(row('one', 'First'));
  const preview = booksImport.preview([], input);
  assert.throws(() => booksImport.apply([books.normalize(row('other', 'Changed'))], input, preview.snapshot, ['one']), /changed since this preview/);
  assert.throws(() => booksImport.preview([], file(row('one', 'First'), row('two', 'first'))), /duplicate book/);
  assert.throws(() => booksImport.preview([], file(row('one', 'First', { rating: 5.2 }))), /Invalid book year, rating or priority/);
  assert.throws(() => booksImport.preview([], file(row('one', 'First', { review: 'x'.repeat(1001) }))), /exceeds/);
});

test('Books import links only one exact title and author match', () => {
  const book = books.normalize(row('source', 'The Example: A Story', { authors: ['Jane Smith'] }));
  const candidate = books.catalog({ workId: 'OL123W', title: 'The Example: A Story', authors: [{ name: 'Jane Smith', id: 'OL456A' }] });
  const other = books.catalog({ workId: 'OL124W', title: 'The Example: A Story', authors: ['John Smith'] });
  assert.equal(booksImport.matchCatalog(book, [other, candidate], new Set())?.workId, 'OL123W');
  assert.equal(booksImport.matchCatalog(book, [candidate, candidate], new Set()), null);
  assert.equal(booksImport.matchCatalog(book, [candidate], new Set(['OL123W'])), null);
  assert.equal(booksImport.matchCatalog(books.normalize(row('initials', 'Mere Christianity', { authors: ['C.S. Lewis'] })), [books.catalog({ workId: 'OL71056W', title: 'Mere Christianity', authors: ['C. S. Lewis'] })], new Set())?.workId, 'OL71056W');
  assert.equal(booksImport.matchCatalog(books.normalize(row('unknown', 'The Example: A Story', { authors: [] })), [candidate], new Set()), null);
  const linked = file(row('source', 'The Example: A Story', { authors: ['Jane Smith'], catalog: candidate }));
  const preview = booksImport.preview([], linked);
  assert.equal(booksImport.apply([], linked, preview.snapshot, ['source']).books[0].catalog.workId, 'OL123W');
});
