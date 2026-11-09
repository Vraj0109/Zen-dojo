---
id: sd-blob
title: Object and blob storage
area: sd
section: B. Data storage
---

## Overview

Large binary objects (images, videos, backups) belong in object storage, not in your database. Store the bytes in S3-like storage and the metadata (owner, key, size) in your database; serve the bytes through a CDN.

## What to know

1. S3 semantics :: Objects are immutable blobs addressed by bucket and key; you replace an object rather than editing it. S3 provides strong read-after-write consistency, high durability through replication across zones, effectively unlimited scale, and pay-per-GB pricing. There's no rename or append, and listing is by prefix.

2. Multipart upload :: Large files are uploaded in parts (e.g. 5-100 MB each) in parallel and assembled at the end. A failed part is retried alone, and uploads can resume. This is required for big videos and backups.

3. Presigned URLs :: The server signs a short-lived URL that lets the client upload or download one object directly to or from storage. Bytes bypass your servers (saving bandwidth and CPU), and access stays controlled by expiry and the exact key.

4. Erasure coding :: Instead of keeping three full copies (200% overhead), split data into k data chunks plus m parity chunks (e.g. 10+4) spread across nodes; any k chunks rebuild the object. Similar durability at ~40% overhead, but rebuilding costs more CPU and network. Used for cold and warm tiers.

5. Lifecycle tiers :: Storage classes trade price against access latency and cost (hot, infrequent access, archive). Lifecycle rules move objects to cheaper tiers as they age, and delete them after a retention period.

## Recap

- Object storage: flat key → bytes, 11 nines durability, cheap, HTTP API.
- Uploads/downloads go client ↔ S3 directly via presigned URLs.
- Multipart upload: parallel parts, resumable, required for > 5 GB.
- Lifecycle: hot → infrequent access → archive by age.

## Go deeper

### Object storage semantics {point: 0}

Object stores (S3, GCS, Azure Blob) hold objects in buckets addressed by key; the namespace is flat (slashes in keys are just characters, though tools show them as folders). Operations are whole-object: PUT replaces, GET reads (with byte ranges), DELETE removes. There's no append or in-place edit; you write a new object or version.

S3 now offers strong read-after-write consistency for PUTs and deletes, conditional writes (If-None-Match, If-Match) for simple concurrency control, versioning (keep old versions, protect against deletes), and object lock (WORM retention). Durability is designed for 11 nines by storing data across multiple facilities; availability is lower (99.9-99.99%), so clients retry.

Performance: very high aggregate throughput by parallelizing across keys and byte ranges; per-request latency is tens of milliseconds, so don't use object storage for small, latency-sensitive reads (put a cache or database in front). Listing is slow for huge buckets; keep your own metadata index in a database.

### Large uploads and downloads {point: 1}

Multipart upload: initiate an upload, send parts (5 MB to 5 GB each, up to 10,000 parts) in parallel, possibly from different machines, then complete with the list of part ETags. Failed parts are retried individually, so huge uploads survive flaky networks; incomplete uploads should be cleaned up with a lifecycle rule. Clients can upload directly using presigned URLs for each part.

Downloads: byte-range GETs allow parallel downloads and resuming. Serve public or semi-public content through a CDN with the bucket as origin (and block direct bucket access with origin access control); private content uses short-lived signed URLs or signed cookies.

Processing pipelines: an upload triggers an event (S3 → SQS/Lambda) that starts validation, virus scanning, thumbnails, transcoding or text extraction, writing results to other keys and updating the metadata database with status.

### Upload flow with presigned URLs {point: 2}

1) Client asks the API for an upload (POST /uploads {size, type}). 2) API checks quota/auth, creates a metadata row (status=pending), returns a presigned PUT URL (or multipart upload id + part URLs) valid for minutes. 3) Client uploads bytes straight to S3, so app servers never carry the file. 4) S3 event (or client callback) → API marks the row uploaded, triggers processing (virus scan, thumbnails, transcoding).

Downloads: presigned GET or a CDN with signed cookies/URLs for private content.

### Durability: replication vs erasure coding {point: 3}

Three full replicas cost 3× storage and tolerate two losses. Erasure coding (e.g. Reed-Solomon 10+4) splits data into 10 fragments plus 4 parity fragments spread across failure domains: any 10 of the 14 rebuild the object, so it tolerates 4 losses at 1.4× storage. The trade-off is CPU and more network reads on repair and on degraded reads.

Hot, small, latency-sensitive data → replication; large, colder data → erasure coding.

### Cost and lifecycle {point: 4}

Storage classes trade price for access cost and latency: standard (frequent access), infrequent access (cheaper storage, per-GB retrieval fee, minimum duration), archive (Glacier: very cheap, minutes to hours to restore). Lifecycle rules move objects between classes by age and delete them after retention ends. Intelligent tiering moves objects automatically based on access.

Egress (data out to the internet) is often the biggest cost for media services, which is another reason for CDNs (cheaper egress, fewer origin fetches). Request costs matter for many tiny objects; batch small items into larger objects (e.g. log files rolled hourly, Parquet files rather than per-event objects).

In interviews, a sentence like 'originals go to S3 standard, move to infrequent access after 30 days and archive after a year; renditions are served via CDN' shows cost awareness.

## Interview questions

- How would users upload 2 GB videos reliably?
- Where do you store image metadata vs the image?
