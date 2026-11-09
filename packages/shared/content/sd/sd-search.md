---
id: sd-search
title: Search
area: sd
section: B. Data storage
---

## Overview

Full-text search uses an inverted index: for each term, the list of documents containing it. Search systems sit beside the primary database, fed by change streams, and trade freshness and some consistency for fast relevance-ranked queries.

## What to know

1. Inverted index :: Map each term to a postings list of document ids (with positions and frequencies). A query intersects or unions postings lists, much faster than scanning documents. Postings are sorted and compressed, and segments are immutable and merged, much like an LSM tree.

2. Tokenization :: Analyzers turn text into terms: tokenize, lowercase, remove stop words, stem ('running' → 'run'), add synonyms, and use n-grams for prefix or fuzzy matching. The same analyzer must run at index time and query time.

3. Ranking basics :: Classic ranking is TF-IDF or BM25: terms that are frequent in the document but rare overall score higher, and field length is normalized. Real systems add signals like popularity, recency and personalization, often with a second-stage learned re-ranker.

4. Elasticsearch/OpenSearch :: Elasticsearch/OpenSearch distribute the index as shards with replicas; queries fan out to shards and merge the top results. They're not a primary store: index from your database through a queue or CDC, and be able to rebuild the index.

5. Near-real-time indexing :: New documents become searchable after a refresh (about 1 s by default), when the in-memory buffer becomes a searchable segment. This is near real time, not immediate; trade refresh frequency against indexing throughput.

## Recap

- Inverted index: term → postings list (doc ids, positions).
- Analyze text: tokenize, lowercase, stem, stop words; same at index and query time.
- Rank with BM25 (term frequency, inverse document frequency, length) + business signals.
- Elasticsearch: shards + replicas, near-real-time refresh (~1 s), feed it via CDC/queue.

## Go deeper

### Building and querying an inverted index {point: 0}

Docs: 1 'red running shoes', 2 'blue shoes', 3 'running shorts'. After analysis (lowercase, stem 'running' → 'run', 'shoes' → 'shoe'): run → [1, 3], shoe → [1, 2], red → [1], blue → [2], short → [3]. Query 'running shoe' → intersect run ∩ shoe = [1] (AND) or union with scores (OR).

Postings are sorted by doc id so intersection is a merge, with skip lists to jump ahead. Positions enable phrase queries. BM25 favors rare terms (high IDF) appearing often in a short doc.

### Text analysis and relevance {point: 1}

Indexing and querying both pass text through an analyzer: a character filter (strip HTML), a tokenizer (split into words, handling punctuation and languages; CJK languages need special tokenizers), and token filters (lowercase, remove stop words, stemming 'running' → 'run', synonyms 'tv' ↔ 'television', ASCII folding 'café' → 'cafe'). The same pipeline must apply at index and query time or matches fail.

Relevance: BM25 scores a document per query term by term frequency in the document (with diminishing returns), inverse document frequency (rare terms matter more), and document length normalization. Real search ranks with more: field boosts (title matches matter more than body), phrase proximity, freshness, popularity (sales, clicks), personalization, and business rules. Large systems use learning-to-rank: retrieve candidates with BM25 or vector similarity, then re-rank with an ML model on many features.

Autocomplete uses edge n-grams or completion suggesters; typo tolerance uses fuzzy matching (edit distance) on terms.

### Elasticsearch architecture {point: 3}

An index is split into primary shards (fixed at creation, or changed by reindexing/splitting), each with replicas on other nodes. A query goes to a coordinating node, which sends it to one copy of each shard (scatter), gets top results and scores back, merges them (gather), then fetches the documents. Deep pagination is expensive because each shard must return from + size results; use search_after cursors.

Writes go to the primary shard, which indexes into an in-memory buffer and a transaction log, then replicates to replicas. A refresh (default every 1 s) turns the buffer into a searchable segment, which is why search is near real-time. Segments are immutable and merged in the background (like LSM compaction); deletes are marked and removed on merge.

Sizing rules of thumb: shards of ~10-50 GB, not thousands of tiny shards; enough replicas for read throughput and availability; separate hot and warm nodes for time-based indices (logs). Use index aliases so you can rebuild an index and switch atomically.

### Keeping search in sync with the database {point: 4}

The source of truth stays in the DB. Changes flow DB → CDC (Debezium) or outbox → Kafka → indexer → Elasticsearch, so the index lags by seconds and can be rebuilt from scratch by replaying. Dual writes from the app (DB then ES) drift on partial failures.

Scaling: shard by document id for even spread; replicas serve reads and survive node loss. Reindexing for a mapping change: build a new index alongside, backfill, switch an alias atomically.

### Search in a product design

Example: product search for an e-commerce site. Catalog service owns product data in a relational DB. Changes publish events (outbox/CDC) → indexing workers enrich them (category names, current price, stock status, ratings) → bulk index into Elasticsearch. Queries go through a search service that builds the Elasticsearch query (text match on title/brand/description with boosts, filters for category/price/in-stock, facets via aggregations), applies business re-ranking, and hydrates results from a cache.

Mention: index-time denormalization (one document has everything needed to display a result), handling price/stock that change often (partial updates, or fetch live values at display time), zero-result handling (spell correction, relaxing filters), analytics on queries and clicks to tune relevance, and a full reindex pipeline for mapping changes.

## Interview questions

- How would you keep search in sync with the product database?
- Design search for an e-commerce catalog with typo tolerance.
