---
id: sd-warehouse
title: Data warehouses and lakes
area: sd
section: B. Data storage
---

## Overview

Operational databases (OLTP) serve the app; analytical systems (OLAP) answer big aggregate questions. Keep them separate: copy data into a warehouse or lake built for scans, so analytics never slows production.

## What to know

1. OLTP vs OLAP :: OLTP: many small reads and writes by key, low latency, current state, row storage (Postgres, DynamoDB). OLAP: few huge queries that scan and aggregate millions of rows, historical data, column storage (BigQuery, Redshift, Snowflake). Analytics on the OLTP primary hurts users.

2. Columnar formats (Parquet) :: Columnar formats like Parquet and ORC store each column together. A query reading 3 of 100 columns reads only those, and similar values compress well (dictionary, run-length encoding). Files are partitioned by date so queries skip irrelevant data.

3. Redshift/BigQuery :: Managed warehouses separate storage from compute, scale out queries across many workers, and bill by data scanned or compute time. Data lakes keep raw files in object storage queried by engines (Spark, Trino); 'lakehouse' formats (Iceberg, Delta) add tables and transactions on top.

4. Batch ETL vs stream :: Batch ETL runs periodically (nightly or hourly) to extract, transform and load: simple and cheap, with stale data. Streaming pipelines (CDC → Kafka → stream processor → warehouse) give minutes-fresh data at more complexity. Many systems combine both.

## Recap

- OLTP: many small transactions, row store. OLAP: big scans/aggregates, column store.
- Columnar (Parquet): read only needed columns, great compression, vectorized scans.
- Partition tables by date; cluster/sort by common filter columns.
- Feed via CDC/streams into a lake (S3 + Parquet) and a warehouse (BigQuery, Redshift, Snowflake).

## Go deeper

### Modeling data for analytics {point: 0}

Analytical schemas are designed for reads. The star schema has a central fact table of events or transactions (orders, clicks: foreign keys plus numeric measures like amount and quantity) surrounded by dimension tables describing entities (customer, product, date, store). Queries join facts to a few dimensions and aggregate. A snowflake schema normalizes dimensions further; usually unnecessary in modern columnar warehouses.

Slowly changing dimensions handle history: type 1 overwrites (only current value), type 2 adds a new row with validity dates so old facts keep the attributes they had at the time (customer's city when the order was placed).

Many teams now build wide denormalized tables directly (columnar storage compresses repeated values well) and use tools like dbt to define transformations as versioned SQL models with tests.

### Why columnar is fast for analytics {point: 1}

Query: SUM(amount) WHERE country = 'IN' AND day = '2026-11-06' over 10B rows with 50 columns. A row store reads every column of every row. A column store reads only country, day and amount; each column compresses well (dictionary + run-length encoding for low-cardinality country), min/max stats per row group skip groups that can't match, and date partitioning skips whole days.

The cost: single-row updates and point lookups are slow, which is why OLTP stays in Postgres/MySQL and data flows to the warehouse.

### Lakes, lakehouses and table formats {point: 2}

A data lake stores raw and processed data as files (Parquet, ORC, JSON) in object storage: cheap, scalable, any engine can read it (Spark, Trino/Presto, Athena). Plain files lack transactions, schema evolution and efficient updates.

Table formats (Apache Iceberg, Delta Lake, Apache Hudi) add a metadata layer over the files: atomic commits (readers see whole snapshots), schema evolution, time travel (query as of a snapshot), partition evolution, and row-level deletes/updates (needed for GDPR deletion and CDC upserts). This 'lakehouse' gives warehouse-like guarantees on lake storage.

Cloud warehouses (BigQuery, Snowflake, Redshift) separate storage and compute: storage is columnar and managed, compute scales independently (virtual warehouses or slots), and you pay per query or per compute time. Use them for SQL analytics and BI; use the lake for ML and very large raw data; many architectures use both.

### Batch ETL vs streaming ingestion {point: 3}

Batch (hourly/daily Spark or dbt jobs): simple, cheap, easy to backfill; data is hours old. Streaming (Kafka → Flink → warehouse/lake): seconds fresh, needs handling of late events, duplicates and schema changes.

Common answer: stream raw events into the lake continuously (append-only, partitioned by event date), run batch transformations on top for curated tables, and use the streaming path only for metrics that must be fresh (fraud, live dashboards).

### Getting data in: CDC and event pipelines {point: 3}

Two main sources feed analytics. Operational databases: change data capture (Debezium reading the Postgres WAL or MySQL binlog) streams every insert/update/delete to Kafka, then into the lake/warehouse, with merges producing current-state tables and keeping history. This avoids heavy queries on production and gives near-real-time data.

Events: applications emit structured events (page views, clicks, purchases) with a schema (Avro/Protobuf and a schema registry) to Kafka; stream jobs validate, enrich and write them partitioned by event date.

Quality concerns to mention: deduplication (at-least-once delivery), late data (reprocess recent partitions), schema changes (compatibility rules), PII handling (hash or tokenize before the warehouse, restrict access), and data contracts between producing teams and analytics.

## Interview questions

- How would you build a daily revenue dashboard without hurting the production DB?
- Why is columnar storage fast for analytics?
