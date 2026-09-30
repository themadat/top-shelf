# Books

Books is independent of Movies/TV. All Books includes every nondeleted entry; Read includes completed books; Wishlist includes Want to Read. Reading and Stopped remain available in All Books. Wishlist defaults to priority ascending (1 highest, 5 lowest, blanks last), then title. Clicking a column changes sorting. List search shows matching books out of all books; pivot search shows matching groups out of all author, genre and year groups. The `.` shortcut focuses the active Books search. Table widths, sorting, search, filters and pivot preferences stay device-local; full backups include them.

The list columns are #, Ave, Year, Name, Author, Type, Genre, Own, Format and Review. # shows wishlist priority for Want to Read and My rating for other statuses; Ave is the Open Library average when available. A notes icon beside Year indicates longer book notes and opens that book. Earlier saved priority sorting maps to # sorting.

Own displays YES, NO or — for unknown; filters and the editor use YES/NO labels while keeping the established saved ownership values. The Clear filters control matches the input height. Column widths update during pointer dragging and persist on release. Refresh Book Data updates linked Open Library metadata and community ratings, saving a recovery copy first. It skips books being edited or changed during retrieval and can be stopped; manual books remain untouched. The book editor is wider on desktop.

## Personal fields

A title is required. Authors support multiple names, one per line, with optional Open Library author identities. Year read is one optional completion year (1000–9999), separate from the catalog's first publication year. My rating is optional 0–5 in half-points; zero counts and blank is unrated. Ownership is Owned / Not owned / Unknown. Print, Ebook and Audiobook may coexist; Listened via Audible implies Audiobook. Catalog ebook availability never sets personal format or ownership.

Type (Fiction / Nonfiction / Unknown) and comma-separated genres are editable. Review (1,000 characters) and longer notes (20,000) are separate plain text, with line breaks preserved. Oversized imported text is rejected rather than silently truncated. Mark read opens the editor without guessing a completion year or rating. Priority remains saved after reading. Multiple reading events and per-format ownership are not modeled.

## Open Library

`core/open-library.js` uses explicit title/author/ISBN searches and selected-work ratings from Open Library. No key, account or backend. Search returns up to twelve works; ISBN search retains the ISBN and matching edition when available. Work identity groups editions; duplicate linked work IDs or ISBNs are rejected until the existing entry is used or the duplicate match is unlinked. Same-title manual entries are not automatically merged.

Personal fields stay separate from `catalog`. Genre suggestions use a small subject vocabulary; ambiguous fiction classification remains Unknown. Title/author/genre/kind refresh only if empty or still equal to the previous catalog value, preserving manual corrections. Refresh previews changed bibliographic fields. Catalog average/count are optional, source-linked and dated; missing/failed rating retrieval retains the last successful rating with its original date. An unavailable rating never becomes zero or replaces My rating. Covers use validated numeric IDs and fall back gracefully; cover caching offline is not guaranteed.

Requests omit credentials, run serially at least 1.1 seconds apart, time out after 12 seconds, and respect a bounded 429 retry delay. An in-memory response cache holds up to 40 responses; saved catalog snapshots are available offline. Stop/close/new queries cancel stale requests; draft snapshots and saved-record/replacement checks reject late application. No whole-library polling or bulk harvesting.

Provider references: [Search API](https://openlibrary.org/dev/docs/api/search), [usage guidelines](https://openlibrary.org/developers/api), [licensing](https://openlibrary.org/developers/licensing). Browser search and `/works/{id}/ratings.json` access were verified against public data during implementation; provider availability and coverage can change.

## Pivots

Authors, Genres and Year Read use all nondeleted Read books, independent of list filters. Each unique book counts once within each matching group; multiple authors/genres can contribute to several groups. The overall total is unique completed books. Provider author IDs keep different same-name authors distinct; unlinked names and genres group by normalized whitespace/case. Missing metadata gets Unknown groups.

Tables show book count, rated-book count and average personal rating. Zero is included; unrated entries are omitted only from the average. Supports group search, minimum count, sorting by name/year, count or average in either direction, and drilling into matching books. Clear filters exits a drilled group.

## Persistence and safety

`workspace.books` carries stable local IDs and explicit deletion markers. Local schema 8 adds an empty Books library to schema 7; older supported migrations remain intact. Cloud v7/schema 11 introduced Books; current v9/schema 13 retains them, and v1–v8 remain readable. Earlier apps reject the current envelope. Full backups, content hashes, conflict detection, merges, restore previews and recovery include Books. Conflicting same-book content or duplicate catalog identity requires a user choice; timestamps never pick a winner.

Book saves validate a cloned library and use durable storage replacement before publishing success. Failed writes keep the old live and stored library and the open editor draft. Deletion first commits a recovery snapshot, then checks for intervening edits before saving a tombstone. Data replacement invalidates open drafts; manual same-book changes block stale saves. Device preferences and transient lookup caches are excluded from content sync. Existing storage capacity limits still apply.

Books → Import Books accepts `{format: "top-shelf-books-import", version: 1, books: [...]}`. Rows need a title and valid reading status; other personal fields follow the Books model. IDs may be supplied or are derived from title and authors. Preview validates every row, shows optional source audit notes, and lets the user select additions. Existing matches by ID, catalog identity, or normalized title plus authors are skipped, including prior import tombstones. Applying saves a recovery copy, rejects changed data, and persists the whole addition before reporting success. Existing book details are never replaced. Personal import files belong in ignored `import-preparation/`, outside runtime assets.

Implementation: `core/books.js`, `core/books-import.js`, `core/open-library.js`, `books-editor.js`, `books-import-ui.js`, `books-ui.js`, `books-pivots-ui.js`, `books.css`, and shared state/portability/shell wiring. Automated regressions live in `tests/books.test.mjs`, `tests/books-import.test.mjs` and existing persistence suites. Live authenticated GitHub and multi-device sync need separate verification.
