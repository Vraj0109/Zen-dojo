import type { DepthMore } from "./design-depth-e-more1";

// Plan 0014 batch E and plan 0031: extra sections, architecture cards and evaluation criteria for the last four designs.

const p = (...paragraphs: string[]) => paragraphs.join("\n\n");

export const DEPTH_MORE_2: Record<string, DepthMore> = {
  "sdd-building-blocks": {
    before: [
      {
        title: "Capacity planning, worked through",
        body: p(
          "Interviews reward a calm, repeatable way to turn users into machines. Start from daily active users, multiply by actions per user, divide by 86,400 seconds, then multiply by 3 to 5 for the peak. Take a photo app with 10 million daily users who each make 20 reads and 1 write a day. Reads: 10,000,000 x 20 = 200 million a day, 200,000,000 / 86,400 = about 2,300 a second on average, and perhaps 10,000 a second at peak. Writes are one twentieth of that, about 500 a second at peak.",
          "**Application servers.** A simple stateless service on one modern server handles roughly 1,000 to 5,000 requests a second when it does little work, and a few hundred when each request calls other services. At 10,000 a second and 500 per server you need 20 servers, plus spare capacity so that losing one zone, a third of the fleet, does not overload the rest: 30 servers.",
          "**Cache.** If there are 100 million objects of 2 KB each, the full set is 200 GB. The popular 20 percent, which serves most reads, is 40 GB, so one 64 GB cache node holds it and a second node gives availability. If the cache absorbs 95 percent of reads, the database sees 5 percent of 10,000, which is 500 reads a second, a load one database with a few replicas carries easily. Without the cache it would see 10,000 a second, which needs sharding.",
          "**Storage.** 1 million uploads a day at 500 KB is 500 GB a day, 182 TB a year. Three full copies is 547 TB; erasure coding that stores 1.5 times the data brings it to 273 TB. **Bandwidth.** 10,000 responses a second of 100 KB is 1 GB/s, which is 8 gigabits a second out of your network, a strong reason to serve media from a CDN.",
          "Round aggressively, say the assumptions aloud and show the multiplication. The point is not accuracy to the digit; it is to find which resource (CPU, memory, disk, network) runs out first, because that decides the design."
        ),
      },
      {
        title: "Edge cases that break standard parts",
        body: p(
          "**A cold cache.** With a 95 percent hit rate the database sees 500 reads a second. Restart the cache and the hit rate is 0 for a while, so the database suddenly sees 10,000 a second, twenty times its normal load, and may collapse, which keeps the cache cold. Warm the cache before shifting traffic, rate-limit the fallback path, and use request coalescing so that 1,000 simultaneous misses for one key cause one database read.",
          "**Retries multiply.** If a user request passes through three tiers and each retries three times on failure, one request can turn into 3 x 3 x 3 = 27 calls to the bottom service, exactly when it is struggling. Retry at one layer only, use exponential backoff with jitter, and cap retries with a budget (for example no more than 10 percent extra traffic).",
          "**Retried writes.** A client that times out will send a payment or order again. Give each operation an idempotency key and make the server store the result under it, so the second request returns the first result instead of acting twice.",
          "**Sticky sessions and scale-in.** Pinning users to a server by a cookie breaks when that server is removed during scale-in or a deploy, and the user is logged out. Keep session state in a shared store or a signed token.",
          "**DNS and TTLs.** Moving traffic by changing a DNS record takes as long as the record's TTL, and some clients cache longer. With a 5-minute TTL, failover is at best a few minutes, so low-TTL records or a load balancer in front are used for fast failover.",
          "**Negative results.** A lookup for a missing key goes to the database every time and can be abused as an attack. Cache the not-found answer for a short time, or put a bloom filter in front."
        ),
      },
    ],
    after: [
      {
        title: "Trade-offs to discuss in the interview",
        body: p(
          "**SQL or NoSQL.** Choose relational when you need transactions across rows, ad hoc queries and constraints, and the data fits a primary with replicas (a single well-tuned database goes a long way, often tens of thousands of simple reads a second). Choose a key-value or wide-column store when access is by key, volume is very large and you accept fewer joins and weaker transactions. The honest answer names the access patterns first, not a brand.",
          "**Synchronous or asynchronous.** A synchronous call gives an immediate result and simple reasoning, but couples availability: if the payment service is down, checkout is down. A queue decouples and smooths bursts, but adds delay, duplicates and a status the user must be shown. Use sync for what the user waits for, async for what can happen later (emails, thumbnails, analytics).",
          "**Consistency or availability.** During a network partition you must choose. Money and inventory counts usually pick consistency and show an error; feeds and view counts pick availability and repair later. Say which part of the product gets which choice.",
          "**Cache write policy.** Cache-aside is the default and easy; write-through keeps the cache fresh at the cost of slower writes; write-behind is fast but can lose data if the cache dies before flushing. Choose by how much staleness and loss the data tolerates.",
          "**Monolith or services.** Start with a well-structured monolith and split when teams or scaling needs force it, because each network boundary adds latency, partial failure and operational cost. In the interview, show that you would split by a clear reason, not by habit.",
          "**How to answer.** State the requirement that drives the choice, pick the option, name its cost, and say what number or event would make you change your mind. That four-part habit is what interviewers listen for."
        ),
      },
    ],
    architecture: [
      { name: "CDN and DNS", role: "Serve cacheable content near users and map names to the right region.", scale: "A 95 percent edge hit rate cuts 1 GB/s of origin traffic to 50 MB/s.", failure: "If an edge is down, DNS or anycast routes to another. TTLs bound how fast DNS failover works." },
      { name: "Load balancer and gateway", role: "Spread requests, drop unhealthy servers and apply authentication and rate limits once.", scale: "A managed balancer handles tens of thousands of requests a second per zone.", failure: "Run at least two across zones with health checks, so no single balancer is a point of failure." },
      { name: "Stateless application tier", role: "Runs the business logic with no local state, so any instance can serve any request.", scale: "About 500 requests a second per server in the example: 20 servers for 10,000, 30 with zone headroom.", failure: "A lost instance is replaced automatically. Use timeouts, bounded retries and circuit breakers on downstream calls." },
      { name: "Cache", role: "Keeps hot objects in memory in front of the database, using cache-aside with TTLs.", scale: "40 GB for the popular 20 percent of 200 GB, replicated for availability.", failure: "A cold cache moves 20 times the load to the database, so warm it and coalesce misses." },
      { name: "Database and queue", role: "Hold the source of truth and absorb asynchronous work.", scale: "One primary with replicas covers hundreds of writes a second; shard by a key when it does not.", failure: "Replicas take over with automatic failover; a queue keeps work during an outage, with a dead-letter path for bad messages." },
    ],
    criteria: [
      { area: "Clarifying and estimating", strong: "Asks about users and read to write ratio, then converts to QPS, storage and bandwidth with the arithmetic shown.", weak: "Jumps to boxes without a single number." },
      { area: "Choosing components", strong: "Adds each part for a stated reason (a bottleneck or a requirement) and omits parts that are not needed.", weak: "Draws every standard component on principle." },
      { area: "Scaling path", strong: "Scales up first, then cache, replicas, partitioning, with the trigger for each step.", weak: "Says shard the database as the first move." },
      { area: "Availability", strong: "Removes single points of failure per tier and uses timeouts, backoff with jitter and circuit breakers.", weak: "Adds retries everywhere with no limit." },
      { area: "Trade-offs", strong: "Names the cost of each choice and the condition that would change it.", weak: "Presents each choice as plainly best." },
    ],
  },
  "sdd-delivery-slots": {
    before: [
      {
        title: "Edge cases that break naive designs",
        body: p(
          "**Time zones and daylight saving.** Store each slot with the zone's IANA name and local start and end, not just a UTC instant. On the night the clocks go forward, a 2 to 4 am window does not exist; on the night they go back, 1 to 2 am happens twice. Generate slots from a calendar library per zone, and test those two nights.",
          "**A hold that expires during payment.** The customer pays at 4:59 of a 5-minute hold, the sweeper releases the unit at 5:00 and another customer takes it. Mark the hold as payment-in-progress when the payment starts and extend it by a short grace period; at confirmation, confirm only if the hold row is still valid and fail clearly (refund and offer alternatives) if it is not.",
          "**Capacity that shrinks after booking.** Three riders call in sick and a slot with 40 bookings now has capacity 28. Never silently cancel. Mark the slot over-capacity, stop new bookings, try to move bookings to neighbouring slots with the customer's consent, and only then cancel the latest bookings with an apology and credit. Operations needs a screen that shows exactly this.",
          "**Changing a slot.** Book the new slot first and release the old one after it succeeds, in one transaction where possible. Releasing first leaves the customer with nothing if the new booking fails.",
          "**Heavy orders and special handling.** An order with a fridge needs two people, or 5 units of capacity. Model capacity as a number of units, not a count of orders, and let the order say how many units it needs.",
          "**Hoarding and bots.** A script that holds every evening slot for 5 minutes, repeatedly, blocks real customers. Allow one active hold per customer, limit hold requests per account and address, and require a logged-in session.",
          "**The midnight rush.** When next week's slots open at midnight, the average of 10 orders a second becomes thousands of requests a second in the first seconds. Cache the availability list for 2 to 5 seconds, use a waiting room that admits users at a fixed rate, and keep the booking path as short as one atomic update."
        ),
      },
    ],
    after: [
      {
        title: "Trade-offs to discuss in the interview",
        body: p(
          "**How to guard the count.** Options: a row lock around read-check-write (correct, but waits pile up on a hot row), an atomic conditional update such as `UPDATE slot SET booked = booked + 1 WHERE id = ? AND booked + 1 <= capacity` (one statement, no lock held while the application thinks, and the number of rows changed tells you whether you won), or a counter in an in-memory store with a database record behind it (fastest, but two systems must agree, so reconcile). With only 350 hot rows, the atomic update on the database is usually enough, and you can say you would only add a faster store after measuring.",
          "**Hold length by Little's law.** In-flight holds equal the arrival rate times the hold duration. At 10 holds a second, a 5-minute hold means 10 x 300 = 3,000 units of capacity are temporarily locked; a 10-minute hold locks 6,000. Longer holds reduce lost checkouts but make a slot look full while many customers are only thinking, which matters most on the last units. Choose 5 minutes, release early when the customer leaves the page, and show a countdown.",
          "**Showing exact or approximate availability.** An exact count needs a read per slot on every page view. A cached list updated every few seconds, with the booking step as the real guard, is cheaper and good enough. Showing 'only a few left' instead of a number avoids a flood of bookings the instant a count changes.",
          "**Steering demand with price.** Cheaper off-peak slots and a surcharge for the busiest windows shift demand without adding riders. The cost is complexity and fairness questions, so it is a later phase, not the first design.",
          "**Overbooking on purpose.** Airlines overbook because they know the no-show rate. Delivery usually should not, because a missed delivery is a visible failure and refunds are expensive. If you do, do it with a measured buffer of a few percent and a defined remedy."
        ),
      },
    ],
    architecture: [
      { name: "Availability service", role: "Returns open slots for an address by zone, day and window, from a short-lived cache.", scale: "350 slot rows are tiny; the load is thousands of reads a second at the opening rush. Cache for 2 to 5 s.", failure: "If the cache is down, read the 350 rows from the database directly; they fit in memory." },
      { name: "Booking service", role: "Creates holds and confirms them with an atomic conditional update on the slot counter.", scale: "About 10 holds a second on average; bursts of a few hundred a second for the hottest slots.", failure: "Retries are safe because each request carries an idempotency key and the unique booking row rejects a repeat." },
      { name: "Slot store", role: "Holds capacity, booked units and held units per slot, plus the hold and booking rows.", scale: "350 slots and a few hundred thousand booking rows a day. Storage is small; contention is the problem.", failure: "Primary with a synchronous replica, so a failover loses no confirmed booking." },
      { name: "Hold sweeper", role: "Releases expired holds back to capacity.", scale: "3,000 holds in flight at 10 a second with a 5-minute hold; a scan every 10 s is trivial.", failure: "If it is delayed, slots look fuller than they are. Reads also ignore expired holds so correctness does not depend on the sweeper." },
      { name: "Operations console", role: "Lets operations change capacity and handle over-capacity slots.", scale: "Low volume, high importance.", failure: "Changes are audited and applied as a transaction; a bad change is reversed by a new change, not by editing history." },
    ],
    criteria: [
      { area: "Contention awareness", strong: "Sees that the data is small and the contention is high, and designs the booking step around that.", weak: "Treats it as a storage-scale problem and starts with sharding." },
      { area: "Correct counting", strong: "Uses an atomic conditional update or equivalent, and explains why check-then-update races.", weak: "Reads the count in the application, then writes it back." },
      { area: "Holds", strong: "Gives holds a time limit, releases them safely and does the Little's law arithmetic.", weak: "Reserves permanently on click or never releases abandoned carts." },
      { area: "Operational reality", strong: "Handles capacity cuts, time zones, changes and cancellations without losing a booking.", weak: "Only covers the happy path." },
      { area: "Fairness and abuse", strong: "Limits holds per customer and uses a waiting room for the opening rush.", weak: "No answer for bots or the midnight burst." },
    ],
  },
  "sdd-pricing": {
    before: [
      {
        title: "Edge cases that break naive designs",
        body: p(
          "**Order of discounts matters.** An item costs 100. Take 10 percent off and then 5 off: 100 becomes 90, then 85. Take 5 off first and then 10 percent: 95 becomes 85.5. The rule order must be fixed, written down and shown in the audit record, or two engineers will disagree about a bill. Also decide whether coupons stack, and cap the total discount so a stack never makes a price negative; floor the line at zero.",
          "**Allocating an order-level discount.** A 10.00 discount on three lines must be split so the parts sum to exactly 10.00, or refunds of one line will not add up. Split in proportion to the line amounts, round each share, and give the remaining cent to the last line. For equal lines that gives 3.33, 3.33 and 3.34. Store the allocation, because a later refund of one item needs it.",
          "**Tax inclusive and exclusive.** Some markets display prices with tax, others without. Keep the net price and the tax rate as stored facts and compute the display, never the other way round, because the reverse calculation loses cents.",
          "**Price changes mid-session.** A price drops while an item sits in a cart. Decide the policy: lock the price for a short period after it is added (15 to 30 minutes), or recompute at checkout and show a clear notice when it differs. Charging more than the shown price without telling the customer is the failure to avoid.",
          "**Thresholds.** Free shipping above 50: the cart is 52, the customer removes a 5 item, and the total now fails the threshold. Recompute all rules on every change instead of patching the last result.",
          "**Time and scheduled changes.** A flash sale starts at 12:00:00 in a given time zone; store the start as an instant and the zone, and let every service use the same clock source. A cache must not serve the old price after the start, so scheduled changes carry a version and a validity range instead of waiting for a cache to expire.",
          "**Currency conversion.** Use a rate with a timestamp and apply it at a defined point; keep the amount in the original currency for refunds."
        ),
      },
    ],
    after: [
      {
        title: "Trade-offs to discuss in the interview",
        body: p(
          "**Precompute or compute on demand.** Precomputing the final price of every item in every market is 10 million x 20 x 100 bytes = 20 GB, which fits in memory and makes a browse lookup a single read. The cost shows up when prices depend on the customer (segments, loyalty tiers, negotiated lists): 5 segments multiply it to 100 GB, still storable but slower to rebuild, and per-customer prices cannot be precomputed at all. A good compromise precomputes the common public price and computes personal adjustments at request time on the few items a page shows.",
          "**Cache lifetime against correctness.** A 60-second TTL on browse prices means a changed price can show wrongly for up to a minute, which is acceptable on a listing if checkout recomputes. Pushing invalidations to the cache when a price changes shortens that to seconds at the cost of a more complex pipeline. Say clearly that the listing is allowed to be slightly stale and the checkout is not.",
          "**Rules in code or as data.** Rules as data (a table or DSL edited by the business team with validation, preview and versioning) let pricing change without a deploy, but need a safe evaluator and a way to test a rule before it goes live, including a dry-run on a sample of carts. Rules as code are easier to test and review but turn every promotion into an engineering ticket.",
          "**Audit and replay.** Store the price decision for each order: inputs, the rule versions applied and the output. It costs storage (a few hundred bytes per line) and it is the only way to answer a dispute or reproduce a bill months later. Keep it immutable.",
          "**Dynamic pricing.** Changing prices by demand raises revenue and raises fairness, legal and trust questions, and it multiplies the cache problem because prices change constantly. If an interviewer raises it, treat it as an extension with guardrails (floor and ceiling, rate of change, human review) rather than the base design."
        ),
      },
    ],
    architecture: [
      { name: "Price catalogue", role: "Holds base prices per item and market with validity ranges and versions.", scale: "10 million items x 20 markets x 100 bytes is 20 GB: in memory with a database behind it.", failure: "Serve from replicas. A scheduled change is a new versioned row, so rollback is another row, not a data fix." },
      { name: "Rules engine", role: "Applies discounts, coupons, bundles, shipping and tax in a fixed, documented order.", scale: "Pure computation; a cart of 20 lines with 30 rules evaluates in a few milliseconds.", failure: "A bad rule is stopped by validation and a dry run; a slow rule is cut off by a time limit, with the last good rule set as fallback." },
      { name: "Browse price cache", role: "Serves approximate prices to listings and search results.", scale: "About 1,000,000 lookups a second at peak; sharded in-memory cache with a 60 s TTL.", failure: "If the cache is down, fall back to the catalogue replicas with rate limiting, or show a recent snapshot." },
      { name: "Checkout pricing", role: "Computes the exact total, locks it and records the decision.", scale: "About 500 a second; it must be consistent, so it reads the primary or a fresh replica.", failure: "If it cannot compute, checkout fails clearly. It never falls back to a cached price for charging." },
      { name: "Audit log", role: "Stores every priced order with the rules and versions used.", scale: "A few hundred bytes per line, a few GB a day at this volume.", failure: "Append-only with replication; a write failure blocks the order, because an unrecorded price cannot be defended." },
    ],
    criteria: [
      { area: "Money correctness", strong: "Uses integers or decimals, one rounding rule and defined rounding points, and allocates discounts so parts sum to the whole.", weak: "Uses floating point or rounds in several places." },
      { area: "Two paths", strong: "Separates cached browse prices from computed checkout totals and explains why.", weak: "Uses one path for both and either is slow or inexact." },
      { area: "Rules model", strong: "Fixed rule order, stacking limits, versioned rules as data with preview and an audit trail.", weak: "Hard-coded if statements with undefined order." },
      { area: "Consistency promise", strong: "Defines when the price is locked and what the customer is told if it changes.", weak: "Never addresses the price changing between cart and payment." },
      { area: "Edge cases", strong: "Covers negative totals, thresholds, tax display, currency timing and refunds of discounted lines.", weak: "Only handles one percentage discount." },
    ],
  },
  "sdd-catalog": {
    before: [
      {
        title: "Edge cases that break naive designs",
        body: p(
          "**Variant explosion.** A shirt in 3 colours, 10 sizes and 4 fabrics is 3 x 10 x 4 = 120 variants. Store variants as rows keyed by the product plus the chosen attribute values, not as 120 separate products, and let each category define which attributes create variants (size and colour do, material is a plain attribute). Otherwise the catalogue grows without bound and the product page lists 120 near-identical cards.",
          "**Duplicates from many sellers.** Two sellers list the same phone. Match by a standard identifier (GTIN or barcode) first, then by brand, model and normalised title with a human review queue for uncertain matches. Merge the offers under one product page, and keep the seller-specific price and stock on the offer, not on the product.",
          "**Deleting a product that orders refer to.** Past orders must still show what was bought. Soft-delete the product (a status field), keep the row, and store a snapshot of title, image and price on the order line at purchase time.",
          "**Facet counts.** When the user picks Brand = A, the counts shown next to each colour should reflect Brand = A, but the counts next to each brand should ignore the brand filter itself, or the other brands would all show zero and the user could never switch. Compute each facet's counts with all filters except its own.",
          "**Fast-changing fields in a slow index.** Price and stock change far more often than titles. Updating the whole search document for each change wastes indexing capacity. Keep titles and attributes in the index, and update price and availability with small partial updates, or read them from a cache at display time and only filter on coarse buckets.",
          "**Reindexing everything.** A change to analysis rules (for example how titles are split into words) needs a full rebuild. At 5,000 documents a second, 50 million products take 50,000,000 / 5,000 = 10,000 seconds, about 2.8 hours. Build a new index beside the live one, replay changes that arrived meanwhile, then switch an alias; never rebuild in place.",
          "**Inconsistent attribute values.** Colour, Color, colour and Navy blue should become one value. Normalise on ingest with a controlled vocabulary per category and keep the raw value for audit."
        ),
      },
    ],
    after: [
      {
        title: "Trade-offs to discuss in the interview",
        body: p(
          "**Relational or document model.** A relational schema (product, variant, offer, category, attribute tables) gives constraints, transactions across a product and its variants, and easy reporting. A document store holds a product as one nested document, which reads in one fetch and handles varied attributes naturally, but makes cross-product queries and consistency rules harder. A common design: relational or document store as source of truth, and a search index as a derived read model.",
          "**Dual writes or change data capture.** Writing to the database and the search index from the application means a crash between the two leaves them different, and nothing repairs it. Capturing the database's change log and feeding a queue that updates the index makes the index follow the truth and lets you replay it. The cost is a pipeline to run and an index that lags by seconds, which is fine for search and not for the page that shows the price.",
          "**Sharding the search index.** Sharding by product id hash spreads load evenly, but every query goes to every shard and waits for the slowest. With 20 shards each answering within 50 ms 99 percent of the time, the chance that at least one is slower is 1 - 0.99^20 = about 18 percent, so the overall slow rate is far worse than the per-shard figure. Reduce it with fewer, larger shards, replicas to send a duplicate request to, and a timeout that returns partial results. Sharding by category cuts fan-out, but makes some shards hot.",
          "**Caching pages.** Public product pages are the same for most visitors, so cache the rendered page or its data at the CDN for a short time (30 to 60 seconds), with price and stock fetched separately. This takes most of the 12,000 page views a second off the origin, but a changed description takes up to a minute to appear, which sellers can accept.",
          "**Facets: precomputed or live.** Live facet counts from the search engine are accurate for any filter combination and cost CPU at 3,500 searches a second. Precomputing counts for common categories is cheap but wrong once filters combine. Start live, cache the empty-filter counts per category, and measure before building anything more."
        ),
      },
    ],
    architecture: [
      { name: "Ingestion pipeline", role: "Accepts seller portal, feed and API data, then validates, normalises and deduplicates it.", scale: "About 6 updates a second on average (500,000 a day), with bulk feeds of millions of rows.", failure: "Bad rows go to a rejects list with a reason for the seller; the rest of the feed continues." },
      { name: "Catalogue database", role: "Source of truth for products, variants, offers and categories.", scale: "50 million products, 250 million variants; about 250 GB of product records.", failure: "Primary with replicas and point-in-time recovery. Writes stop on failover; reads continue from replicas." },
      { name: "Change feed and search index", role: "Stream changes from the database to a search index that serves queries and facets.", scale: "3,500 searches a second on average, perhaps 17,000 at peak; 20 shards with replicas.", failure: "If the index is behind or down, search degrades but product pages still load from the database or cache." },
      { name: "Image service and CDN", role: "Resize and store images in several sizes and serve them from edge caches.", scale: "About 1 to 2 TB of images; the CDN serves the traffic.", failure: "A missing size is generated on demand and cached; the original stays in object storage with replication." },
      { name: "Product page cache", role: "Short-lived cache of page data at the CDN and in memory.", scale: "12,000 views a second on average, 60,000 at peak, mostly cache hits.", failure: "Expiry is short, so stale data heals itself. On a cache outage, the database replicas take the load, rate-limited." },
    ],
    criteria: [
      { area: "Data model", strong: "Separates product, variant and offer, controls attributes per category and avoids a product per variant.", weak: "One flat table of products with a column per attribute." },
      { area: "Scale numbers", strong: "Derives page views, searches and write rates from users and shows storage for records and images.", weak: "States 50 million products and moves on." },
      { area: "Search and facets", strong: "Uses a derived search index, explains facet count rules and how to reindex without downtime.", weak: "Uses LIKE queries on the main database." },
      { area: "Keeping copies in step", strong: "Prefers a change feed to dual writes and accepts a short lag on search.", weak: "Writes to two stores in the request and ignores partial failure." },
      { area: "Data quality", strong: "Covers validation, normalisation, deduplication by identifier and moderation.", weak: "Assumes sellers submit clean data." },
    ],
  },
};
