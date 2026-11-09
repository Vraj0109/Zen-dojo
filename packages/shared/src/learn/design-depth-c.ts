import type { WalkthroughDeep } from "./design-depth-types";

// Depth for system design walkthroughs (plan 0014). Diagrams are Mermaid, code is Java 17 (compiled by design-code.test.ts).

export const DESIGN_DEPTH_C: Record<string, WalkthroughDeep> = {
  "sdd-ride-sharing": {
    architecture: [
      {
            "name": "Driver location gateway",
            "role": "Maintains duplex WebSocket connections with on-duty drivers, validates auth tokens and accepts 4-second GPS pings.",
            "scale": "1 million drivers at 1 ping every 4 s generates 250,000 pings/sec; 140 Mbps network ingress terminated across 25 gateway instances.",
            "failure": "Gateway crashes drop active sockets; drivers reconnect automatically to adjacent gateways with jitter. Locations are stateless."
      },
      {
            "name": "Geospatial index",
            "role": "Indexes moving driver positions into H3 hexagonal spatial cells in an in-memory Redis cluster with 10-second TTLs.",
            "scale": "1 million active drivers requires only 150 MB RAM; k-ring hexagonal lookups take under 2 ms across 10 shards.",
            "failure": "If a Redis shard crashes, driver positions for that cell rebuild organically within 4 to 8 seconds as next pings arrive."
      },
      {
            "name": "Dispatch and matching engine",
            "role": "Batches ride requests in 5-second windows and computes minimum-cost bipartite matches using true road route ETAs.",
            "scale": "20 million trips per day averages 230 trips/sec, peaking at 2,500 requests/sec. Batch bipartite matching completes in under 200 ms.",
            "failure": "If matching worker fails, unassigned requests roll over into the next 5-second batch window with higher priority."
      },
      {
            "name": "Surge pricing calculator",
            "role": "Aggregates ride demand and available driver supply per H3 cell, applying spatial smoothing across 1-ring neighbors.",
            "scale": "Runs once per minute per metropolitan cell; evaluations take under 50 ms in memory.",
            "failure": "On calculation timeout, pricing falls back to the previous minute's multiplier or neutral 1.0x baseline."
      },
      {
            "name": "Trip store",
            "role": "Authoritative relational database recording trip lifecycle, driver assignment leases, and financial billing records.",
            "scale": "20 million trips per day is 20 GB/day (7.3 TB/year), sharded by tripId across partitioned PostgreSQL or CockroachDB.",
            "failure": "Primary-replica failover with synchronous WAL replication. Optimistic version locking prevents double-booking race conditions."
      }
],
    criteria: [
      {
            "area": "Scale and throughput arithmetic",
            "strong": "Derives 250,000 location pings/sec from 1M drivers / 4s, calculates 140 Mbps bandwidth, and estimates 150 MB spatial memory.",
            "weak": "States millions of drivers without calculating ping rate, bandwidth, or spatial index memory footprint."
      },
      {
            "area": "Spatial indexing choices",
            "strong": "Compares Quadtrees, Geohashes, and Uber H3 hexagons, justifying H3 for uniform 6-neighbor adjacency and invariant edge distance.",
            "weak": "Proposes standard relational PostGIS queries or selects Quadtrees without addressing dynamic leaf rebalancing overhead."
      },
      {
            "area": "Dispatch algorithm",
            "strong": "Rejects greedy nearest-driver matching; introduces 5-second windowed bipartite matching via Hungarian algorithm with road ETAs.",
            "weak": "Assigns the first driver with lowest Euclidean distance, ignoring global wait-time optimization and one-way road topologies."
      },
      {
            "area": "Surge pricing and balance",
            "strong": "Formulates supply-demand ratio per H3 cell with 1-ring spatial smoothing to eliminate border cliff effects.",
            "weak": "Treats surge as a global city-wide multiplier without spatial localization or smoothing."
      },
      {
            "area": "Concurrency and failure modes",
            "strong": "Prevents double-booking via optimistic locking on trip version, and uses Redis TTLs to evict disconnected drivers without tombstones.",
            "weak": "Relies on application memory flags to prevent double-booking, vulnerable to network partitions and race conditions."
      }
],
    "diagrams": [
      {
        "title": "Components",
        "source": "flowchart LR\n  Rider[Rider App] --> API[Trip API Gateway]\n  Driver[Driver App] --> WS[WebSocket Gateway]\n  WS --> LocSvc[Location Ingestion Service]\n  LocSvc --> GeoIdx[(Redis H3 Spatial Index)]\n  LocSvc --> Kafka[Location Kafka Stream]\n  API --> Dispatch[Dispatch and Matching Engine]\n  Dispatch --> GeoIdx\n  Dispatch --> Surge[Dynamic Pricing Engine]\n  Dispatch --> TripDB[(Trip Store: PostgreSQL)]\n  Dispatch --> Notif[Notification Service]\n  Notif --> WS",
        "caption": "Driver locations stream into an in-memory spatial index. Ride requests query nearby drivers and dispatch offers via WebSocket."
      },
      {
        "title": "Match and dispatch path",
        "source": "sequenceDiagram\n  participant R as Rider\n  participant D as Dispatch Engine\n  participant S as Spatial Index\n  participant P as Surge Engine\n  participant DB as Trip Store\n  participant Dr as Driver\n  R->>D: POST /trips/request (pickup, dropoff)\n  D->>P: compute multiplier(pickup cell)\n  P-->>D: surge 1.4x\n  D->>S: findDrivers(pickup, radius=2km, limit=10)\n  S-->>D: [driver-1, driver-2, driver-3]\n  D->>DB: create trip (PENDING, driver-1, lease=15s)\n  D->>Dr: push dispatch offer (15s countdown)\n  alt Driver accepts\n    Dr->>D: accept offer\n    D->>DB: update status = DISPATCHED\n    D-->>R: driver assigned, ETA 3 mins\n  else Timeout or reject\n    D->>DB: reassign next driver\n  end",
        "caption": "Dispatch matches the closest available driver, holds an exclusive offer lease, and falls back on timeout."
      },
      {
        "title": "Driver location ingestion",
        "source": "sequenceDiagram\n  participant App as Driver App\n  participant GW as WebSocket Gateway\n  participant Loc as Ingest Worker\n  participant Redis as Geospatial Cache\n  participant K as Kafka\n  loop Every 4 seconds\n    App->>GW: ping location (lat, lon, status, heading)\n    GW->>Loc: route payload\n    Loc->>Redis: GEOADD or H3 set cell (TTL 10s)\n    Loc->>K: publish location update event\n  end",
        "caption": "Continuous 4-second location pings update fast in-memory spatial cells with TTL for dead driver expiration."
      }
    ],
    "sections": [
      {
        "title": "Scale, QPS and bandwidth arithmetic",
        "body": "Start from the operating requirements because they dictate the partitioning and storage tiers. Consider a global ride-sharing service with 10 million active riders and 1 million active drivers on duty, with approximately 50,000 concurrent drivers operating in a major metropolitan tier-1 city. Drivers transmit GPS coordinate pings once every 4 seconds over persistent duplex WebSocket connections. Across 1 million drivers, this produces 1,000,000 / 4 = 250,000 location writes per second arriving at the ingestion gateway.\n\nEach location ping payload is compact: driver ID (8 bytes), latitude and longitude (16 bytes), timestamp (8 bytes), heading (2 bytes), and availability status (1 byte), totaling approximately 35 bytes of binary application data or roughly 70 bytes when including WebSocket and TLS frame overhead. Ingestion network bandwidth is 250,000 x 70 bytes = 17.5 MB/s, which equals 140 Mbps. A cluster of 20 to 30 gateway servers easily terminates these connections.\n\nRide booking demand is comparatively smaller: 20 million completed trips per day corresponds to roughly 230 trip creations per second average and 2,500 requests per second at peak rush hour. The system has an inverted 100-to-1 write-to-read ratio on raw location pings, but a trip request triggers a heavy read-and-match workflow. Storing live driver locations requires very little RAM: 1 million drivers at 150 bytes of index metadata per driver is only 150 MB, fitting entirely inside an in-memory Redis cluster. Historical completed trips (pickup, dropoff, route points, fare) average 1 KB each: 20 million trips per day equals 20 GB daily, or 7.3 TB annually, which shards cleanly by trip ID across relational PostgreSQL or CockroachDB nodes."
      },
      {
        "title": "Geospatial indexing: Quadtree, Geohash and Uber H3 hexagons",
        "body": "Spatial indexing must solve two critical operations: updating a moving driver's location 250,000 times a second, and finding all available drivers within a radius of a rider's pickup point in under 10 milliseconds. Traditional relational databases with R-tree spatial indexes (such as PostGIS) fail under this load because tree rebalancing locks multiple levels of the index tree during high-frequency writes.\n\nQuadtrees divide two-dimensional space recursively into four quadrants. While efficient for static points of interest like restaurants or hotels, moving vehicles require continuous leaf node deletions, parent rebalancing, and insertions across thread boundaries, leading to severe lock contention.\n\nGeohashes map latitude and longitude into hierarchical base32 strings by interleaving coordinate bits. Longer prefixes denote smaller bounding boxes. However, Geohash rectangles introduce distortion near the poles and equator, and adjacent points across cell borders can have completely disjoint prefix strings, requiring searching eight adjacent bounding boxes with awkward boundary mathematics.\n\nThe modern industry solution is H3, an open-source hexagonal hierarchical spatial index developed by Uber. Hexagonal tiling possesses an essential mathematical property: every hexagon has exactly six neighbors, and the distance between the center of a hexagon and each neighbor's center is identical. Rectangular grids have two distinct neighbor distances (1 for orthogonal neighbors and square-root of 2 for diagonal corner neighbors), which introduces distortion during radius searches. In H3, resolution 8 covers an average area of 0.737 square kilometers (edge length 461 meters), and resolution 9 covers 0.105 square kilometers (edge length 174 meters). Ingestion computes the cell ID from coordinates in O(1) arithmetic and adds the driver ID into a Redis set keyed by the cell ID. Radius searches simply fetch the rider's cell and its concentric hexagonal rings (k-rings) via fast set unions."
      },
      {
        "title": "Matching algorithms, batch dispatch and surge pricing",
        "body": "A naive dispatch engine greedily assigns the first driver who appears closest in straight-line Euclidean distance. This causes two systemic failures: first-order greedy matching traps (where assigning driver A to rider 1 leaves rider 2 with no driver or an excessive 15-minute wait, even though a swapped assignment would minimize total wait time), and routing obstacles where straight-line distance ignores one-way streets, divided highways, and river bridges.\n\nProduction dispatch systems batch ride requests in discrete 5-second to 10-second windows. In each window, the dispatch engine models pending riders and nearby available drivers as a weighted bipartite graph. Edge weights represent true road routing ETA (computed via routing engines), driver acceptance history, and platform fairness. The system solves the Minimum Cost Bipartite Matching problem using the Hungarian algorithm or Kuhn-Munkres combinatorial optimization. This global batch optimization decreases average pickup ETA across all riders by 15% to 20% compared to greedy dispatch.\n\nDynamic surge pricing balances real-time supply and demand. Every minute, the pricing engine tallies ride requests (demand) and available drivers (supply) per H3 hexagon. When demand exceeds available supply, a surge multiplier raises fares: multiplier = 1.0 + alpha x (Demand / Supply - 1). This dampens excess rider demand while incentivizing offline or nearby adjacent-cell drivers to enter the high-demand area. Hexagonal spatial smoothing prevents abrupt boundary cliffs by averaging surge multipliers across immediate 1-ring neighbor cells."
      },
      {
        "title": "Failure modes and operational resilience",
        "body": "Walk through what breaks, with numbers, because an interviewer wants to hear the system degrade gracefully under load and infrastructure failure.\n\n**Driver location ping loss**: Drivers frequently pass through subway tunnels, parking garages, or cellular dead zones. The location service sets a 10-second TTL on all driver cell entries in Redis. If a driver fails to ping within 10 seconds, Redis automatically evicts the driver from the active spatial index. When cellular connectivity resumes, the next ping re-registers the driver immediately without requiring tombstone cleanup jobs.\n\n**Redis spatial cluster node failure**: If an in-memory spatial cache shard crashes, in-flight driver positions for that geographic partition vanish. Gateway nodes continuously mirror incoming location pings to both Redis and a Kafka stream. The replacement Redis node can either replay the last 10 seconds from Kafka or simply warm up organically within 4 to 8 seconds as active drivers transmit their next periodic pings.\n\n**Split-brain dispatch and double booking**: If network latency delays a driver's response, the dispatch service might reassign the trip to driver B while driver A's late acceptance arrives. This concurrency race is prevented at the database layer using optimistic concurrency control with monotonic versioning: UPDATE trips SET driver_id = :d, status = 'DISPATCHED', version = version + 1 WHERE id = :tripId AND status = 'PENDING' AND version = :v. Only the first commit succeeds; the late driver receives an assignment canceled event and returns to the available pool.\n\n**Rider-driver connection loss during an ongoing trip**: The mobile app caches the trip itinerary, route polyline, and emergency tokens locally. The driver app records GPS points in local SQLite storage (offline buffer) and uploads them in a batch once connectivity returns, ensuring accurate fare calculation despite complete mid-trip network blackouts."
      }
    ],
    "code": [
      {
        "name": "RideMatching.java",
        "code": "import java.util.*;\n\npublic class RideMatching {\n    record Location(double lat, double lon) {\n        double distanceKmTo(Location other) {\n            double dLat = Math.toRadians(other.lat - this.lat);\n            double dLon = Math.toRadians(other.lon - this.lon);\n            double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)\n                    + Math.cos(Math.toRadians(this.lat)) * Math.cos(Math.toRadians(other.lat))\n                    * Math.sin(dLon / 2) * Math.sin(dLon / 2);\n            return 6371.0 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));\n        }\n    }\n\n    enum DriverStatus { AVAILABLE, ON_TRIP, OFFLINE }\n\n    static class Driver {\n        final String id;\n        Location location;\n        DriverStatus status;\n        long lastPingMs;\n\n        Driver(String id, Location location) {\n            this.id = id;\n            this.location = location;\n            this.status = DriverStatus.AVAILABLE;\n            this.lastPingMs = System.currentTimeMillis();\n        }\n    }\n\n    static class SpatialGridIndex {\n        private final double cellSizeDeg = 0.01;\n        private final Map<String, Set<String>> grid = new HashMap<>();\n        private final Map<String, String> driverCell = new HashMap<>();\n\n        String cellKey(Location loc) {\n            int x = (int) Math.floor(loc.lat / cellSizeDeg);\n            int y = (int) Math.floor(loc.lon / cellSizeDeg);\n            return x + \":\" + y;\n        }\n\n        synchronized void updateLocation(String driverId, Location loc) {\n            String newKey = cellKey(loc);\n            String oldKey = driverCell.put(driverId, newKey);\n            if (oldKey != null && !oldKey.equals(newKey)) {\n                Set<String> oldSet = grid.get(oldKey);\n                if (oldSet != null) oldSet.remove(driverId);\n            }\n            grid.computeIfAbsent(newKey, k -> new HashSet<>()).add(driverId);\n        }\n\n        synchronized List<String> findNearby(Location loc, int ringSize) {\n            int cx = (int) Math.floor(loc.lat / cellSizeDeg);\n            int cy = (int) Math.floor(loc.lon / cellSizeDeg);\n            List<String> found = new ArrayList<>();\n            for (int dx = -ringSize; dx <= ringSize; dx++) {\n                for (int dy = -ringSize; dy <= ringSize; dy++) {\n                    Set<String> set = grid.get((cx + dx) + \":\" + (cy + dy));\n                    if (set != null) found.addAll(set);\n                }\n            }\n            return found;\n        }\n    }\n\n    static class DispatchEngine {\n        final SpatialGridIndex index = new SpatialGridIndex();\n        final Map<String, Driver> drivers = new HashMap<>();\n\n        void registerDriver(String id, Location loc) {\n            Driver d = new Driver(id, loc);\n            drivers.put(id, d);\n            index.updateLocation(id, loc);\n        }\n\n        record MatchCandidate(String driverId, double distanceKm, int etaMinutes) {}\n\n        List<MatchCandidate> findCandidates(Location pickup, int maxDrivers) {\n            List<String> nearbyIds = index.findNearby(pickup, 2);\n            List<MatchCandidate> candidates = new ArrayList<>();\n            for (String did : nearbyIds) {\n                Driver d = drivers.get(did);\n                if (d != null && d.status == DriverStatus.AVAILABLE) {\n                    double dist = pickup.distanceKmTo(d.location);\n                    int eta = Math.max(1, (int) Math.round((dist / 30.0) * 60.0));\n                    candidates.add(new MatchCandidate(did, dist, eta));\n                }\n            }\n            candidates.sort(Comparator.comparingDouble(MatchCandidate::distanceKm));\n            if (candidates.size() > maxDrivers) {\n                return candidates.subList(0, maxDrivers);\n            }\n            return candidates;\n        }\n    }\n\n    public static void main(String[] args) {\n        DispatchEngine engine = new DispatchEngine();\n        Location downtown = new Location(37.7749, -122.4194);\n        engine.registerDriver(\"driver-1\", new Location(37.7755, -122.4180));\n        engine.registerDriver(\"driver-2\", new Location(37.7790, -122.4150));\n        engine.registerDriver(\"driver-3\", new Location(37.8000, -122.4000));\n\n        List<DispatchEngine.MatchCandidate> matches = engine.findCandidates(downtown, 5);\n        System.out.println(\"matching candidates found=\" + matches.size());\n        for (DispatchEngine.MatchCandidate m : matches) {\n            System.out.printf(Locale.US, \"matched %s dist=%.2f km eta=%d mins%n\", m.driverId(), m.distanceKm(), m.etaMinutes());\n        }\n    }\n}"
      }
    ]
  },
  "sdd-maps": {
    architecture: [
      {
            "name": "Vector tile service and CDN",
            "role": "Serves Mapbox Vector Tiles (MVT) containing clipped, simplified road and polygon geometries for GPU client-side rendering.",
            "scale": "500,000 tile requests/sec absorbed at 99%+ hit rate by worldwide CDN edge caches; origin stores 50 TB across zoom levels 0-14.",
            "failure": "If origin tile service is slow, CDN serves stale tiles. Static geometries are durable in object storage."
      },
      {
            "name": "Routing engine",
            "role": "Computes turn-by-turn driving routes using bidirectional A* over precomputed Contraction Hierarchies and Multi-Level Dijkstra cells.",
            "scale": "50,000 route queries/sec globally at peak; P99 latency under 5 ms utilizing in-memory shortcut graphs.",
            "failure": "Routing nodes are stateless and replicated; failed nodes are dropped from the load balancer pool with zero user interruption."
      },
      {
            "name": "Road network graph store",
            "role": "Stores 100M intersections and 300M directed road edges in memory with dynamic traversal weights updated with live traffic.",
            "scale": "Entire worldwide road graph requires only 7.2 GB raw memory (under 20 GB including spatial R-trees and traffic overlays).",
            "failure": "Read-only graph is mirrored in RAM across all routing nodes; graph reload occurs through zero-downtime blue-green rotation."
      },
      {
            "name": "Traffic speed streaming pipeline",
            "role": "Consumes anonymized GPS probe pings in Kafka, aggregating segment speeds in 1-minute Flink tumbling windows.",
            "scale": "Ingests hundreds of thousands of speed probes/sec, updating dynamic edge weights across graph partitions every minute.",
            "failure": "If traffic stream aggregator lags, routing engine falls back to historical time-of-day speed baseline profiles."
      },
      {
            "name": "Map-matching engine",
            "role": "Snaps noisy, multipath-distorted GPS coordinates to true road network segments using a Hidden Markov Model Viterbi algorithm.",
            "scale": "Processes active navigation pings in under 1 ms per point, preventing false off-route recalculation loops in urban canyons.",
            "failure": "If map-matching confidence drops below threshold, navigation holds current road projection until clean GPS fixes resume."
      }
],
    criteria: [
      {
            "area": "Scale and memory representation",
            "strong": "Quantifies road network graph size (100M nodes, 300M edges, ~20 GB RAM) proving it fits in server memory without disk lookups.",
            "weak": "Assumes global map routing requires distributed database disk queries for every turn."
      },
      {
            "area": "Tile delivery architecture",
            "strong": "Recommends client-rendered vector tiles over raster PNGs, explaining 80% bandwidth savings, smooth rotation, and dynamic styling.",
            "weak": "Designs pre-rendered PNG image pipelines, ignoring mobile bandwidth and theme switching constraints."
      },
      {
            "area": "Routing algorithm selection",
            "strong": "Explains why Dijkstra and basic A* are too slow (millions of expansions); proposes Contraction Hierarchies and Multi-Level Dijkstra.",
            "weak": "Stops at Dijkstra or standard A* without acknowledging the necessity of precomputed hierarchy shortcuts for sub-5ms latencies."
      },
      {
            "area": "Dynamic traffic integration",
            "strong": "Separates static road geometry from dynamic speed overlays; uses 1-minute streaming windows with fallback to historical profiles.",
            "weak": "Proposes recomputing the entire global contraction hierarchy on every traffic jam."
      },
      {
            "area": "GPS drift and resilience",
            "strong": "Addresses urban canyon multipath interference with Hidden Markov Model Viterbi map-matching.",
            "weak": "Snaps GPS coordinates greedily to the nearest road segment, causing frequent route recalculation flickering."
      }
],
    "diagrams": [
      {
        "title": "Components",
        "source": "flowchart LR\n  Client[Mobile / Web Client] --> CDN[CDN Edge: Tile Cache]\n  Client --> GW[API Gateway]\n  CDN -. Cache Hit 99% .-> Client\n  CDN -. Cache Miss .-> TileSvc[Vector Tile Service]\n  TileSvc --> S3[(Tile Object Store: MVT)]\n  GW --> RouteSvc[Routing Service]\n  RouteSvc --> PartGraph[(Partitioned Road Graph: RAM)]\n  Kafka[Probe Location Stream] --> Flink[Traffic Aggregation Engine]\n  Flink --> SpeedDB[(Real-time Edge Speed Cache)]\n  SpeedDB --> PartGraph",
        "caption": "Vector tiles are statically pre-rendered and cached at CDN edges. The routing service queries an in-memory road network graph continuously updated with live traffic speeds."
      },
      {
        "title": "Routing query path",
        "source": "sequenceDiagram\n  participant C as Client\n  participant GW as API Gateway\n  participant RS as Routing Service\n  participant G as Graph Partitions\n  participant T as Traffic Speed Cache\n  C->>GW: GET /route?origin=lat1,lon1&dest=lat2,lon2\n  GW->>RS: computeRoute(origin, dest)\n  RS->>G: snap coordinates to road segment edges\n  RS->>T: fetch current speeds for candidate corridor\n  T-->>RS: dynamic edge travel times\n  RS->>G: bidirectional A* over Contraction Hierarchy\n  G-->>RS: optimal path node sequence\n  RS->>RS: generate turn maneuvers and polyline\n  RS-->>C: route: polyline, distance, ETA, maneuvers",
        "caption": "Coordinates snap to graph vertices. Bidirectional search over contracted shortcut graphs evaluates real-time edge travel times to produce turn-by-turn routes in milliseconds."
      },
      {
        "title": "Live traffic update path",
        "source": "sequenceDiagram\n  participant Probe as Active Navigation GPS Probe\n  participant Ingest as Traffic Ingestion Service\n  participant Stream as Kafka Stream\n  participant Flink as Flink Aggregator\n  participant Graph as Routing Graph Shards\n  loop Every 5 seconds\n    Probe->>Ingest: anonymized segment speed probe\n    Ingest->>Stream: publish probe\n  end\n  Stream->>Flink: 1-minute tumbling window\n  Flink->>Flink: average speed per road segment\n  Flink->>Graph: update edge weights (time = distance / speed)",
        "caption": "Crowdsourced GPS probes are aggregated in streaming windows to calculate dynamic edge weights based on real-time traffic speeds."
      }
    ],
    "sections": [
      {
        "title": "Scale, road network sizing and query latency targets",
        "body": "Global mapping requires handling two fundamentally different workloads: static geometric tile rendering and dynamic path routing. Worldwide navigable road networks contain approximately 100 million road intersections (graph vertices) and 300 million directed road segments (graph edges). Memory representation is surprisingly compact: a vertex contains node ID, latitude, and longitude (24 bytes). A directed edge contains target node ID, length, speed limit, road classification, and traversal flags (16 bytes). Across 100 million nodes and 300 million edges, the raw graph occupies 2.4 GB + 4.8 GB = 7.2 GB. Including adjacency lists, spatial R-tree indexes, and live traffic speed overlays, the entire global road network fits comfortably inside 20 GB of RAM on a single standard server machine.\n\nRouting traffic scales to approximately 50,000 routing queries per second globally at peak hours, with an SLA target of P99 under 50 milliseconds. Map tile rendering traffic is far heavier: up to 500,000 tile requests per second. Vector tiles (Mapbox Vector Tile format encoded in Google Protocol Buffers) average 15 KB to 40 KB per tile. Storing worldwide map tiles across zoom levels 0 through 14 requires roughly 50 TB of storage. Because physical road geometry changes infrequently, CDN edge caching absorbs over 99% of tile requests, shielding origin rendering clusters."
      },
      {
        "title": "Graph routing algorithms: Dijkstra, A*, and Contraction Hierarchies",
        "body": "Dijkstra's algorithm explores vertices outward in a circular wave. On a graph with 100 million nodes, finding a route between two cities 500 km apart requires exploring millions of vertices and takes multiple seconds, which is completely unacceptable for interactive mobile navigation.\n\nA* search improves on Dijkstra by adding a directed heuristic function h(u), typically the straight-line Haversine distance from node u to destination d divided by the maximum road speed limit. The priority queue sorts vertices by f(u) = g(u) + h(u), focusing the search frontier into an elliptical beam toward the destination and reducing explored nodes by 80% to 90%.\n\nFor production routing at scale, systems employ Contraction Hierarchies (CH) and Multi-Level Dijkstra (MLD). In a precomputation phase, nodes are ranked by road importance (residential driveways at the bottom, arterial interstates at the top). Nodes are contracted one by one: when a low-importance node is removed, shortcut edges are inserted between its neighbors if the shortest path between them passed through it. At query time, bidirectional search executes simultaneously from origin and destination: forward search travels upward along shortcut edges of increasing hierarchy, and backward search travels upward from the destination. The two frontiers meet at a shared high-level highway vertex. This reduces graph traversal from 1,000,000 node expansions to roughly 500 to 1,000 node lookups, cutting route computation latency from 1,000 ms to under 5 milliseconds."
      },
      {
        "title": "Map rendering: Vector tiles, pyramids and coordinate clipping",
        "body": "Digital maps represent geography using the Web Mercator projection (EPSG:3857). The world is projected onto a square and recursively subdivided into a quadtree pyramid of 2^z x 2^z tiles at zoom level z, where tiles are addressed by coordinates (z, x, y). Zoom level 0 covers the entire planet in one 256x256 pixel tile; zoom level 14 provides city street resolution, and zoom level 18 resolves individual buildings.\n\nModern architectures serve vector tiles rather than pre-rendered raster PNG images. Vector tiles contain raw vector geometries (lines for roads, polygons for parks, points for labels) clipped to tile boundaries and simplified using the Douglas-Peucker algorithm according to zoom level. The client device's GPU (OpenGL, Metal, or WebGL) renders the styling, fonts, and colors dynamically.\n\nVector tiles deliver four critical architectural benefits: bandwidth reduction (a vector tile is 20 KB versus 100 KB for an equivalent Retina PNG), dynamic client-side rotation and 3D tilting without pixelation, instant dark-mode and light-mode theme switching without fetching new tiles, and client-side feature inspection (tapping a building or road segment without an extra round-trip API call)."
      },
      {
        "title": "Failure modes, traffic spikes and edge recalculation",
        "body": "Walk through what breaks, with numbers, because an interviewer wants to hear the system degrade gracefully under load and infrastructure failure.\n\n**Dynamic road closures and accidents**: Contraction Hierarchies precompute shortcuts assuming static edge weights. When an accident or flood closes a major highway, invalidating a single edge can break thousands of precomputed shortcuts, and full recomputation takes hours. To solve this, production systems decouple the graph: Multi-Level Dijkstra partitions the road graph into geographic cells (using inertial flow cutters). Closures only invalidate paths within a local cell, while inter-cell highway overlays adapt dynamically without rebuilding the entire worldwide hierarchy.\n\n**Traffic speed cache staleness**: Flink streaming pipelines aggregate GPS probes every 60 seconds. If an aggregation worker crashes or a network partition delays traffic speed updates, the routing engine falls back to historical speed profiles (time-of-day and day-of-week baseline speeds) stored in memory, preventing erroneous route deviations into residential alleys.\n\n**Routing engine node crash**: Routing workers are strictly stateless; the read-only road graph and dynamic edge weights are mirrored across all nodes in a cluster. A crashed node is pulled from the load balancer pool immediately with zero user impact.\n\n**GPS drift in urban canyons and tunnels**: Buildings reflect satellite signals (multipath interference), causing GPS fixes to jump across parallel streets. Navigation engines apply a Hidden Markov Model (HMM) Viterbi map-matching algorithm: it evaluates candidate road segments within an error circle, calculating emission probabilities (distance from GPS fix) and transition probabilities (routing feasibility between consecutive points), preventing route recalculation loops when a user is simply driving through a tunnel."
      }
    ],
    "code": [
      {
        "name": "MapRouter.java",
        "code": "import java.util.*;\n\npublic class MapRouter {\n    record Node(String id, double x, double y) {\n        double distanceTo(Node other) {\n            double dx = this.x - other.x;\n            double dy = this.y - other.y;\n            return Math.sqrt(dx * dx + dy * dy);\n        }\n    }\n\n    record Edge(String targetNodeId, double distanceKm, double speedLimitKmh) {\n        double travelTimeMinutes() {\n            return (distanceKm / speedLimitKmh) * 60.0;\n        }\n    }\n\n    static class Graph {\n        final Map<String, Node> nodes = new HashMap<>();\n        final Map<String, List<Edge>> adjacency = new HashMap<>();\n\n        void addNode(String id, double x, double y) {\n            nodes.put(id, new Node(id, x, y));\n            adjacency.putIfAbsent(id, new ArrayList<>());\n        }\n\n        void addEdge(String from, String to, double distanceKm, double speedKmh) {\n            adjacency.get(from).add(new Edge(to, distanceKm, speedKmh));\n        }\n\n        record RouteResult(List<String> path, double totalDistanceKm, double totalTimeMinutes) {}\n\n        RouteResult findFastestRoute(String startId, String targetId) {\n            Node targetNode = nodes.get(targetId);\n            if (targetNode == null || !nodes.containsKey(startId)) return null;\n\n            record NodeScore(String nodeId, double gTime, double fScore) {}\n\n            PriorityQueue<NodeScore> openSet = new PriorityQueue<>(Comparator.comparingDouble(NodeScore::fScore));\n            Map<String, Double> gScores = new HashMap<>();\n            Map<String, String> cameFrom = new HashMap<>();\n            Map<String, Double> edgeDists = new HashMap<>();\n\n            gScores.put(startId, 0.0);\n            openSet.add(new NodeScore(startId, 0.0, 0.0));\n\n            while (!openSet.isEmpty()) {\n                NodeScore current = openSet.poll();\n                if (current.nodeId.equals(targetId)) {\n                    List<String> path = new ArrayList<>();\n                    String curr = targetId;\n                    double totalDist = 0.0;\n                    while (curr != null) {\n                        path.add(curr);\n                        totalDist += edgeDists.getOrDefault(curr, 0.0);\n                        curr = cameFrom.get(curr);\n                    }\n                    Collections.reverse(path);\n                    return new RouteResult(path, totalDist, current.gTime);\n                }\n\n                if (current.gTime > gScores.getOrDefault(current.nodeId, Double.POSITIVE_INFINITY)) {\n                    continue;\n                }\n\n                for (Edge edge : adjacency.getOrDefault(current.nodeId, List.of())) {\n                    double tentativeG = current.gTime + edge.travelTimeMinutes();\n                    if (tentativeG < gScores.getOrDefault(edge.targetNodeId(), Double.POSITIVE_INFINITY)) {\n                        gScores.put(edge.targetNodeId(), tentativeG);\n                        cameFrom.put(edge.targetNodeId(), current.nodeId);\n                        edgeDists.put(edge.targetNodeId(), edge.distanceKm());\n\n                        Node nextNode = nodes.get(edge.targetNodeId());\n                        double heuristicTime = (nextNode.distanceTo(targetNode) / 100.0) * 60.0;\n                        openSet.add(new NodeScore(edge.targetNodeId(), tentativeG, tentativeG + heuristicTime));\n                    }\n                }\n            }\n            return null;\n        }\n    }\n\n    public static void main(String[] args) {\n        Graph g = new Graph();\n        g.addNode(\"A\", 0, 0);\n        g.addNode(\"B\", 5, 0);\n        g.addNode(\"C\", 0, 5);\n        g.addNode(\"D\", 5, 5);\n\n        g.addEdge(\"A\", \"C\", 5.0, 40.0);\n        g.addEdge(\"C\", \"D\", 5.0, 40.0);\n\n        g.addEdge(\"A\", \"B\", 5.0, 100.0);\n        g.addEdge(\"B\", \"D\", 5.0, 100.0);\n\n        Graph.RouteResult route = g.findFastestRoute(\"A\", \"D\");\n        System.out.println(\"fastest path: \" + String.join(\" -> \", route.path()));\n        System.out.printf(Locale.US, \"total distance: %.1f km, ETA: %.1f mins%n\", route.totalDistanceKm(), route.totalTimeMinutes());\n    }\n}"
      }
    ]
  },
  "sdd-crawler": {
    architecture: [
      {
            "name": "Mercator URL frontier",
            "role": "Coordinates link discovery via priority Front Queues and per-host politeness Back Queues managed by a Politeness Min-Heap.",
            "scale": "Buffers 5 billion URLs across crawl cycles; dispatches up to 5,000 URLs/sec while strictly respecting 1 req/sec/host limits.",
            "failure": "Frontier state checkpoints to disk; worker leases use visibility timeouts so crashed worker tasks return to the queue."
      },
      {
            "name": "Fetcher worker pool",
            "role": "Stateless asynchronous workers that execute HTTP GET requests, validate MIME types, and respect robots.txt rules.",
            "scale": "5,000 pages/sec consumes 500 MB/s (4 Gbps) network bandwidth; distributed across hundreds of containerized fetcher nodes.",
            "failure": "Network timeouts and HTTP errors trigger exponential backoff. Target server 5xx drops domain priority temporarily."
      },
      {
            "name": "Asynchronous DNS cache",
            "role": "Custom in-memory non-blocking DNS resolver cluster (Netty/c-ares) caching IP addresses with aggressive TTLs.",
            "scale": "Resolves 5,000 DNS queries/sec in microseconds, avoiding standard blocking OS getaddrinfo bottlenecks.",
            "failure": "Failed DNS queries retry against secondary upstream resolvers; unresolvable hosts are quarantined."
      },
      {
            "name": "Deduplication engine",
            "role": "Filters known URLs using a Counting Bloom Filter and RocksDB; identifies near-duplicate content via 64-bit SimHash Hamming distance.",
            "scale": "Tracks 50 billion URLs in 60 GB Bloom filter RAM; SimHash detects near-duplicates in sub-millisecond table lookups.",
            "failure": "Bloom filter false positives (under 1%) are resolved by querying on-disk RocksDB. Content duplicates are discarded before storage."
      },
      {
            "name": "Document object store",
            "role": "Stores compressed raw HTML documents and parsed extracted text metadata for downstream search engine indexing.",
            "scale": "5 billion pages compressed at 25 KB is 125 TB/month; stored in distributed object storage (S3/GCS/Ceph).",
            "failure": "Object storage provides multi-AZ replication. Ingestion pipeline uses write-ahead buffering to survive storage transient errors."
      }
],
    criteria: [
      {
            "area": "Scale, storage and bandwidth",
            "strong": "Derives 1,930 pages/sec avg (5,000 peak) for 5B pages/month, 4 Gbps network bandwidth, and 125 TB monthly compressed storage.",
            "weak": "Mentions crawling the web without calculating document throughput, network bandwidth, or storage capacity."
      },
      {
            "area": "URL Frontier and politeness",
            "strong": "Implements Mercator two-tier frontier: Front Queues for priority/freshness and Back Queues with min-heap for 1s/host politeness.",
            "weak": "Uses a single FIFO queue, failing to prevent accidental distributed denial-of-service on target web hosts."
      },
      {
            "area": "Deduplication strategy",
            "strong": "Distinguishes URL deduplication (Bloom Filter + RocksDB) from content deduplication (64-bit SimHash Hamming distance <= 3).",
            "weak": "Proposes storing all full URL strings in a hash set, exceeding memory limits, and misses near-duplicate content detection."
      },
      {
            "area": "Spider traps and loop defense",
            "strong": "Mitigates infinite calendar and directory traps via max path depth (8), max URL length (512), and per-domain crawl quotas.",
            "weak": "Does not anticipate recursive URL loops or dynamic parameter generation."
      },
      {
            "area": "DNS and networking bottlenecks",
            "strong": "Identifies standard DNS resolution as a critical bottleneck; specifies asynchronous local DNS caching with pre-fetching.",
            "weak": "Assumes standard blocking synchronous HTTP client calls without considering thread starvation or DNS lookup latency."
      }
],
    "diagrams": [
      {
        "title": "Components",
        "source": "flowchart LR\n  Frontier[URL Frontier] --> Workers[Crawler Fetcher Pool]\n  Workers --> DNS[Asynchronous DNS Cache]\n  DNS --> Web[Internet Web Servers]\n  Workers --> Parse[HTML Parser and Extractor]\n  Parse --> ContentDedup{Content Dedup: SimHash}\n  ContentDedup -- Unique --> Store[(Document Store: S3/Blob)]\n  Parse --> URLFilter[URL Normalizer and Dedup]\n  URLFilter --> URLSeen[(URL Seen Filter: Bloom + RocksDB)]\n  URLSeen -- New URL --> Frontier\n  Robots[Robots.txt Cache] --> Workers",
        "caption": "The URL Frontier feeds fetcher workers respecting host politeness. Extracted links undergo normalization and Bloom deduplication before re-entering the frontier."
      },
      {
        "title": "Crawl and extraction path",
        "source": "sequenceDiagram\n  participant F as Polite Frontier\n  participant W as Fetcher Worker\n  participant R as Robots Cache\n  participant Web as Web Server\n  participant D as Dedup Engine\n  participant Store as Document Storage\n  F->>W: pop next polite URL\n  W->>R: check allowed(domain, path)\n  R-->>W: 200 OK allowed\n  W->>Web: GET /article.html (User-Agent, timeout=5s)\n  Web-->>W: 200 HTML content\n  W->>D: compute 64-bit SimHash\n  alt Content is near-duplicate (Hamming distance <= 3)\n    D-->>W: duplicate: skip storage\n  else Content is unique\n    W->>Store: write compressed raw HTML\n    W->>W: parse HTML, extract links\n    W->>D: check URL seen filter\n    W->>F: enqueue newly discovered URLs\n  end",
        "caption": "Fetchers enforce politeness delays, check robots.txt permission, drop near-duplicate pages via SimHash, and stream newly discovered links back into the frontier."
      },
      {
        "title": "Mercator polite frontier architecture",
        "source": "flowchart TD\n  In[Discovered URLs] --> FQ[Priority Queues: F1 to Fn]\n  FQ --> Biased[Priority Selector Router]\n  Biased --> BQ[Host Politeness Queues: B1 to Bm]\n  BQ --> Heap[Politeness Min-Heap: nextAllowedTime]\n  Heap --> Worker[Next Available Fetcher Worker]",
        "caption": "Two-tier Mercator frontier: front queues prioritize authoritative URLs; back queues isolate domains and enforce per-host inter-request delays."
      }
    ],
    "sections": [
      {
        "title": "Requirements, crawl volume and bandwidth arithmetic",
        "body": "A web crawler continuously discovers, downloads, and processes web pages to feed search engine indexing pipelines. Sizing must account for raw document volume and network bandwidth. Target crawling 5 billion web pages per month. Over 30 days, this requires 5,000,000,000 / (30 x 86,400) = approximately 1,930 pages per second average, with peak provisioned capacity of 5,000 pages per second.\n\nStorage sizing: The average uncompressed HTML document is roughly 100 KB; compressed with Zstandard or gzip it averages 25 KB. Storing 5 billion compressed documents requires 5 x 10^9 x 25 KB = 125 TB of raw storage per month. Network bandwidth requirements are substantial: fetching 5,000 pages per second at 100 KB uncompressed ingress requires 5,000 x 100 KB = 500 MB/s, which corresponds to 4 Gbps of dedicated network bandwidth.\n\nPoliteness is a non-negotiable operational constraint: never send more than one request per second to any single host or domain unless explicitly authorized by a Crawl-delay directive in robots.txt. Without strict politeness enforcement, distributed crawl workers would inadvertently stage denial-of-service attacks on target servers."
      },
      {
        "title": "URL frontier architecture: Priority and politeness (The Mercator model)",
        "body": "A web crawler cannot use a simple FIFO queue for discovered URLs. A FIFO queue suffers from two fatal flaws: politeness violations (thousands of links from a single newly discovered domain would be fetched in tight parallel, causing a distributed denial-of-service attack on that host), and priority inversion (low-value spam links displace high-value authoritative pages).\n\nThe industry-standard architecture is the Mercator two-tier frontier. It separates URL management into Front Queues (handling priority) and Back Queues (handling politeness).\n\nWhen URLs are discovered, a prioritization function (based on PageRank, domain authority, and freshness history) assigns each URL to one of N Front Queues. A biased selector pulls URLs from high-priority queues with higher probability.\n\nTo enforce politeness, the system maintains M Back Queues. Each back queue contains URLs for exactly one host, ensuring that all URLs destined for example.com reside in the same FIFO queue. A Politeness Min-Heap tracks the active back queues, keyed by nextAllowedFetchTime (the timestamp when that domain can be queried again, typically last_fetch_time + 1000ms).\n\nA free worker pops the root of the min-heap. If nextAllowedFetchTime <= now, the worker takes the top URL from that host's back queue, issues the HTTP request, updates the host's nextAllowedFetchTime = now + 1000ms, and re-inserts the host into the min-heap. If the host queue becomes empty, an empty back queue pulls a new URL from the Front Queues. This guarantees that thousands of fetcher workers remain 100% utilized across distinct hosts while never violating the 1-second delay for any single domain."
      },
      {
        "title": "Deduplication: Bloom filters and SimHash fingerprints",
        "body": "The web is riddled with duplicate content: mirror sites, syndicated news articles, boilerplate navigation footers, and URL alias parameters. Crawlers employ two levels of deduplication: URL deduplication and content deduplication.\n\nURL deduplication prevents re-crawling identical URLs. With 50 billion tracked URLs, storing 50-byte strings in memory requires 2.5 TB of RAM. Instead, the crawler uses a Counting Bloom Filter backed by an on-disk key-value store (RocksDB or Cassandra). A Bloom filter with 10 bits per key and 7 hash functions achieves a false positive rate under 1% in just 60 GB of RAM. When the Bloom filter reports a URL is new, it is definitely new and enqueued. When it reports a hit, the worker checks RocksDB to resolve false positives.\n\nURL normalization canonicalizes URLs before deduplication: converting protocol and hostname to lowercase, removing default ports (:80, :443), stripping URL fragments (#section), removing trailing slashes, sorting query parameters alphabetically, and stripping tracking parameters (utm_*, ref).\n\nContent deduplication detects identical or near-identical page bodies using SimHash (Charikar's algorithm). SimHash computes a 64-bit fingerprint: tokenizing the document into words, hashing each word to a 64-bit hash with word weight, summing vector dimensions, and setting bit i to 1 if dimension i > 0. Near-duplicate documents differ by a Hamming distance (number of bit flips) of 3 or fewer. Storing SimHash fingerprints in an inverted index allows detecting near-duplicates in sub-millisecond lookups."
      },
      {
        "title": "Failure modes, spider traps and DNS resolution",
        "body": "Walk through what breaks, with numbers, because an interviewer wants to hear the system degrade gracefully under load and infrastructure failure.\n\n**Spider traps and infinite dynamic loops**: Malicious or misconfigured web servers generate infinite URL paths (e.g. /calendar?date=2026-11-09, or recursive directories /dir/dir/dir/...). Without protections, a crawler gets trapped in an infinite crawl loop. Mitigations: enforce a maximum path depth (e.g., maximum 8 directory levels), restrict URL string length (max 512 characters), and set strict per-domain page crawl quotas (e.g., maximum 10,000 pages per domain per crawl cycle).\n\n**DNS bottleneck and timeouts**: Issuing 5,000 DNS lookups per second against public DNS servers will trigger rate limiting or fail due to high network latency (typically 50-100 ms per lookup). Crawlers deploy an in-memory asynchronous DNS resolver pool (such as c-ares or Netty) with a local DNS cache configured with aggressive TTLs, reducing DNS lookup latency from 50 ms to microseconds.\n\n**Crawler fetcher worker crashes**: A worker may crash mid-download or hang on a slow connection. The URL frontier leases URLs with a visibility timeout (e.g. 30 seconds). If the worker does not acknowledge successful completion within 30 seconds, the URL returns to its host back queue for re-dispatch, ensuring zero link loss.\n\n**Robots.txt parsing overhead and unavailability**: Querying robots.txt before every URL would double outbound traffic. Fetchers cache parsed robots.txt rules in Redis with a 24-hour TTL. If a target server returns HTTP 500 when fetching robots.txt, the crawler assumes full disallow to prevent legal or ethical violations."
      }
    ],
    "code": [
      {
        "name": "WebCrawlerFrontier.java",
        "code": "import java.net.URI;\nimport java.util.*;\n\npublic class WebCrawlerFrontier {\n    record CrawlTask(String url, String host, int priority) {}\n\n    static class PoliteFrontier {\n        private final long hostDelayMs;\n        final Set<String> seenUrls = new HashSet<>();\n        private final Map<String, Queue<CrawlTask>> hostQueues = new HashMap<>();\n        private final Map<String, Long> nextAllowedTime = new HashMap<>();\n\n        record ScheduledHost(String host, long readyAt) {}\n        private final PriorityQueue<ScheduledHost> readyHeap = new PriorityQueue<>(\n                Comparator.comparingLong(ScheduledHost::readyAt)\n        );\n\n        PoliteFrontier(long hostDelayMs) {\n            this.hostDelayMs = hostDelayMs;\n        }\n\n        String normalize(String rawUrl) {\n            try {\n                URI uri = new URI(rawUrl.trim());\n                String host = uri.getHost() == null ? \"\" : uri.getHost().toLowerCase();\n                String path = uri.getPath() == null || uri.getPath().isEmpty() ? \"/\" : uri.getPath();\n                if (path.endsWith(\"/\") && path.length() > 1) {\n                    path = path.substring(0, path.length() - 1);\n                }\n                return uri.getScheme().toLowerCase() + \"://\" + host + path;\n            } catch (Exception e) {\n                return rawUrl.trim().toLowerCase();\n            }\n        }\n\n        synchronized boolean enqueue(String rawUrl, int priority, long now) {\n            String norm = normalize(rawUrl);\n            if (!seenUrls.add(norm)) return false;\n\n            try {\n                URI uri = new URI(norm);\n                String host = uri.getHost();\n                if (host == null) return false;\n\n                boolean hostActive = hostQueues.containsKey(host);\n                hostQueues.computeIfAbsent(host, k -> new LinkedList<>()).add(new CrawlTask(norm, host, priority));\n\n                if (!hostActive) {\n                    long ready = Math.max(now, nextAllowedTime.getOrDefault(host, 0L));\n                    readyHeap.add(new ScheduledHost(host, ready));\n                }\n                return true;\n            } catch (Exception e) {\n                return false;\n            }\n        }\n\n        synchronized CrawlTask pollNext(long fakeNow) {\n            if (readyHeap.isEmpty()) return null;\n            ScheduledHost nextHost = readyHeap.peek();\n            if (nextHost.readyAt > fakeNow) return null;\n\n            readyHeap.poll();\n            Queue<CrawlTask> queue = hostQueues.get(nextHost.host);\n            if (queue == null || queue.isEmpty()) return null;\n\n            CrawlTask task = queue.poll();\n            nextAllowedTime.put(nextHost.host, fakeNow + hostDelayMs);\n\n            if (!queue.isEmpty()) {\n                readyHeap.add(new ScheduledHost(nextHost.host, fakeNow + hostDelayMs));\n            } else {\n                hostQueues.remove(nextHost.host);\n            }\n            return task;\n        }\n    }\n\n    public static void main(String[] args) {\n        PoliteFrontier frontier = new PoliteFrontier(1000L);\n        long clock = 10000L;\n\n        frontier.enqueue(\"https://example.com/page1\", 1, clock);\n        frontier.enqueue(\"https://example.com/page2\", 1, clock);\n        frontier.enqueue(\"https://example.com/page1/\", 1, clock);\n        frontier.enqueue(\"https://news.org/top\", 2, clock);\n        frontier.enqueue(\"https://news.org/sports\", 2, clock);\n\n        System.out.println(\"total unique urls tracked in seen set=\" + frontier.seenUrls.size());\n\n        CrawlTask t1 = frontier.pollNext(clock);\n        System.out.println(\"t=10000ms popped: \" + t1.url());\n\n        CrawlTask t2 = frontier.pollNext(clock);\n        System.out.println(\"t=10000ms popped concurrent other host: \" + t2.url());\n\n        CrawlTask t3 = frontier.pollNext(clock);\n        System.out.println(\"t=10000ms popped same host (should be null): \" + (t3 == null ? \"none\" : t3.url()));\n\n        CrawlTask t4 = frontier.pollNext(clock + 1000L);\n        System.out.println(\"t=11000ms popped after delay: \" + t4.url());\n    }\n}"
      }
    ]
  },
  "sdd-job-scheduler": {
    architecture: [
      {
            "name": "Scheduler coordinator leader",
            "role": "Elected active leader managing trigger time, acquiring task leases, and populating task queues from in-memory time wheels.",
            "scale": "Coordinates 10 million registered jobs; handles 1,700 executions/sec baseline and 50,000/sec midnight spikes.",
            "failure": "Standby coordinators monitor leader via ZooKeeper/etcd; automatic leader election recovers state within 5 seconds."
      },
      {
            "name": "Hashed time wheel",
            "role": "Multi-level circular ring buffer in RAM dispatching scheduled tasks in O(1) amortized time per second tick.",
            "scale": "Hierarchical wheels (seconds, minutes, hours, days) track 10 million future task pointers in under 50 MB RAM.",
            "failure": "Time wheel state is backed by persistent database job schedules; rebuilt on coordinator restart from next_run_at index."
      },
      {
            "name": "Distributed task queue",
            "role": "Partitioned queue (Kafka or Redis Streams) buffering dispatched jobs and isolating workloads by priority tier.",
            "scale": "Absorbs 50,000 tasks/sec burst during midnight spikes, smoothing delivery across worker execution pools.",
            "failure": "Topic replication prevents task loss; consumer acknowledgements prevent dropped jobs during worker node crashes."
      },
      {
            "name": "Worker execution pool",
            "role": "Stateless worker nodes pulling tasks from queues, maintaining heartbeats, and executing business logic with timeout guards.",
            "scale": "Horizontally scales from 100 to 1,000+ workers based on queue lag and CPU/memory utilization metrics.",
            "failure": "Unresponsive workers miss heartbeats; coordinator reassigns task to a healthy worker upon lease expiration."
      },
      {
            "name": "Lease and fencing manager",
            "role": "Issues distributed leases with monotonically increasing fencing tokens to prevent zombie split-brain writes.",
            "scale": "Evaluates lease heartbeats every 5 s; verifies fencing tokens on task completion in sub-millisecond database updates.",
            "failure": "Stale writes from zombie workers experiencing GC pauses are rejected when their token is lower than the active lease token."
      }
],
    criteria: [
      {
            "area": "Scale and midnight spike handling",
            "strong": "Identifies the 30x midnight cron spike (50k jobs/sec) and applies deterministic hash jitter to flatten execution demand.",
            "weak": "Assumes uniform job arrivals across the day and ignores cron boundary synchronization spikes."
      },
      {
            "area": "Trigger engine architecture",
            "strong": "Rejects recurring SQL polling (SELECT WHERE next_run <= NOW); implements hierarchical Hashed Time Wheels for O(1) triggers.",
            "weak": "Proposes continuous polling on a relational database table, causing database CPU saturation and missed deadlines."
      },
      {
            "area": "Execution semantics and idempotency",
            "strong": "Acknowledges physical exactly-once impossibility; provides at-least-once dispatch paired with idempotent execution keys.",
            "weak": "Claims the scheduler guarantees exactly-once execution without addressing network partition boundaries."
      },
      {
            "area": "Zombie workers and split-brain safety",
            "strong": "Enforces distributed leases with monotonically increasing fencing tokens, rejecting late commits from timed-out workers.",
            "weak": "Relies on simple timeout flags without fencing tokens, enabling data corruption when paused workers resume."
      },
      {
            "area": "Fault tolerance and backpressure",
            "strong": "Features active-standby Raft coordinator failover, isolated priority queues, exponential backoff, and dead-letter queues.",
            "weak": "Lacks worker isolation, allowing long-running bulk batch jobs to starve short critical tasks."
      }
],
    "diagrams": [
      {
        "title": "Components",
        "source": "flowchart LR\n  Client[API / Job Admin] --> DB[(Job Metadata Store: PostgreSQL)]\n  Coord1[Coordinator 1: Leader] <--> ZK[(ZooKeeper / etcd Cluster)]\n  Coord2[Coordinator 2: Standby] <--> ZK\n  Coord1 --> Wheel[Hierarchical Time Wheel in RAM]\n  Coord1 --> Queue[Distributed Task Queue: Kafka / Redis]\n  Queue --> W1[Worker Node 1]\n  Queue --> W2[Worker Node 2]\n  Queue --> W3[Worker Node 3]\n  W1 --> Heartbeat[Heartbeat and Lease Service]\n  Heartbeat --> DB\n  W1 --> ExecDB[(Execution History DB)]",
        "caption": "Active coordinator leader schedules jobs from an in-memory time wheel to distributed task queues. Workers execute jobs under lease renewed via heartbeats."
      },
      {
        "title": "Job trigger and execution path",
        "source": "sequenceDiagram\n  participant Coord as Scheduler Coordinator\n  participant DB as Job Metadata DB\n  participant Q as Task Queue\n  participant W as Worker Node\n  participant Target as Target Downstream Service\n  Coord->>Coord: time wheel tick: job due at T <= now\n  Coord->>DB: acquire lease, increment fencing token (v=v+1)\n  Coord->>Q: push task (jobId, payload, fencingToken=101)\n  Q->>W: pull task\n  loop Every 2 seconds\n    W->>DB: send heartbeat (renew lease, token=101)\n  end\n  W->>Target: execute idempotently with token=101\n  Target-->>W: success\n  W->>DB: completeTask(jobId, token=101)\n  DB-->>W: acknowledged, nextRun scheduled",
        "caption": "Jobs are dispatched with a monotonically increasing fencing token. Downstream systems reject stale tokens from timed-out zombie workers."
      },
      {
        "title": "Worker failure and lease recovery",
        "source": "sequenceDiagram\n  participant W1 as Worker 1 (Failing)\n  participant Coord as Scheduler Coordinator\n  participant DB as Lease Store\n  participant W2 as Worker 2 (Healthy)\n  W1->>W1: executing task (token=101)... network partitioned\n  Note over W1,Coord: W1 misses heartbeats for 6 seconds (lease timeout)\n  Coord->>DB: lease expired for token=101!\n  Coord->>DB: allocate new lease, increment token to 102\n  Coord->>W2: re-dispatch task (token=102)\n  W2->>DB: complete task (token=102)\n  Note over W1,DB: W1 wakes up and tries to commit with stale token=101\n  W1->>DB: completeTask(token=101)\n  DB-->>W1: REJECTED: stale fencing token",
        "caption": "When worker heartbeats lapse, the coordinator increments the fencing token and reassigns the job, preventing split-brain double writes."
      }
    ],
    "sections": [
      {
        "title": "Scale, requirements and the midnight spike",
        "body": "A distributed job scheduler reliably coordinates the execution of recurring (cron) and ad-hoc delayed tasks across a cluster of worker nodes. Consider an enterprise scheduling service with 10 million registered recurring jobs. Baseline operational throughput averages 100,000 jobs per minute, which is roughly 1,700 jobs executed per second continuously.\n\nThe primary architectural challenge is the midnight spike: in cron scheduling, human users and automated pipelines overwhelmingly schedule recurring tasks on round clock boundaries (for example, 0 0 * * * midnight, */5 * * * * every 5 minutes, or 0 * * * * top of the hour). Peak arrival at 00:00:00 can surge to 50,000 jobs in a single second—a 30-fold increase over baseline load that can exhaust thread pools, database connections, and task queues.\n\nExecution duration varies widely from sub-second lightweight tasks (webhook notifications, email sends, cache warmups) to multi-hour batch pipelines (ETL transforms, database backups, payroll reconciliation). The execution guarantee must be designed pragmatically: in a distributed system subject to network partitions and hardware crashes, physical exactly-once execution is impossible (the classic Two Generals' problem). The architecture provides at-least-once delivery combined with idempotent worker execution, reinforced by distributed leasing, heartbeat monitors, and monotonic fencing tokens."
      },
      {
        "title": "Triggering engines: Database polling vs Hashed Time Wheels",
        "body": "A naive scheduler polls the database every second: SELECT * FROM jobs WHERE status = 'READY' AND next_run_at <= NOW() LIMIT 1000. Scanning millions of rows every second produces massive database lock contention, high CPU utilization, and missed scheduling deadlines. Indexing on (status, next_run_at) helps, but still creates a database read hotspot at scale, especially during the midnight spike when hundreds of thousands of rows become eligible simultaneously.\n\nHigh-performance schedulers utilize an in-memory Hashed Time Wheel (first described by Varghese and Lauck). A time wheel is a circular ring buffer where each slot represents a discrete time unit (e.g. 1 second). A 60-slot wheel represents 1 minute. Each slot holds a linked list of scheduled tasks due at that second. A hardware or software timer ticks every second, advancing the wheel pointer and dispatching all tasks in the current slot in O(1) time without scanning unrelated future jobs.\n\nFor jobs scheduled days or months in the future, a hierarchical time wheel operates multiple cascading rings: a seconds wheel (60 slots), a minutes wheel (60 slots), an hours wheel (24 slots), and a days wheel (365 slots). When the hour wheel advances, tasks for the next hour cascade down into the minute wheel, which subsequently cascade into the second wheel. This provides O(1) amortized insertion and O(1) trigger execution while consuming minimal memory (a few megabytes for 10 million pointers in RAM)."
      },
      {
        "title": "Execution semantics: Leasing, heartbeats and fencing tokens",
        "body": "When a job is triggered, the coordinator must ensure only one worker executes it at any time. The coordinator acquires a distributed lease in the database (or ZooKeeper/etcd) with an initial lease duration (e.g. 30 seconds).\n\nThe worker node continuously transmits heartbeat signals every 5 seconds to renew the lease. If the worker encounters a long garbage collection pause, a CPU lockup, or a network partition, the heartbeat stops. After 30 seconds, the coordinator considers the worker dead and re-enqueues the job.\n\nHowever, the 'dead' worker might still be alive and executing the task (the zombie worker problem). If it finishes and writes results after a replacement worker has already taken over, data corruption occurs. To guarantee safety, every lease renewal generates a monotonically increasing fencing token (an integer that increments with every lease grant). When the coordinator reassigns the job to a new worker, it increments the fencing token (e.g., from 101 to 102). Downstream databases and storage systems enforce that any write with a fencing token lower than the highest recorded token is rejected with an optimistic concurrency error."
      },
      {
        "title": "Failure modes, backpressure and jitter",
        "body": "Walk through what breaks, with numbers, because an interviewer wants to hear the system degrade gracefully under load and infrastructure failure.\n\n**Coordinator leader failure**: The scheduler coordinator cluster runs in an active-standby configuration coordinated via ZooKeeper or etcd leader election (or Raft consensus). If the leader node misses its heartbeat for 5 seconds, standby nodes trigger an election. The newly elected leader queries the database for active leases, reconstructs the in-memory time wheel for the upcoming 10-minute window, and resumes dispatch without dropping jobs.\n\n**Thundering herd at hour boundaries**: To prevent 50,000 jobs triggering at 00:00:00 from crushing the worker pool, the scheduler applies schedule jitter. Non-critical batch jobs configured for midnight are automatically assigned a deterministic pseudorandom offset (e.g. plus or minus 30 seconds based on hash(job_id) % 60), flattening the spike into a smooth rectangular distribution.\n\n**Worker pool saturation and backpressure**: If long-running batch jobs occupy all worker threads, short critical jobs (e.g. password reset emails) starve in the queue. The system isolates workloads into distinct priority queues: HIGH_PRIORITY (short timeout, dedicated worker pool), DEFAULT, and BULK_BATCH. Workers poll queues with weighted fair queuing (e.g. 70% high, 20% default, 10% bulk).\n\n**Poison pill jobs and retry storms**: A buggy job payload that crashes the worker on startup (e.g. OutOfMemoryError) could repeatedly crash every worker that claims it. The scheduler tracks retry_count in the job metadata. On failure, it applies exponential backoff with jitter. If retry_count reaches 5, the job transitions to DEAD_LETTER status and alerts operators, stopping the retry loop."
      }
    ],
    "code": [
      {
        "name": "JobScheduler.java",
        "code": "import java.util.*;\n\npublic class JobScheduler {\n    record JobDefinition(String jobId, String payload, long intervalMs) {}\n\n    static class ScheduledTask {\n        final JobDefinition job;\n        long nextRunTimeMs;\n        long currentFencingToken;\n        String assignedWorker;\n        long leaseExpiresAtMs;\n        int runCount;\n\n        ScheduledTask(JobDefinition job, long nextRunTimeMs) {\n            this.job = job;\n            this.nextRunTimeMs = nextRunTimeMs;\n            this.currentFencingToken = 0;\n            this.runCount = 0;\n        }\n    }\n\n    static class SchedulerCoordinator {\n        private final Map<String, ScheduledTask> tasks = new HashMap<>();\n        private long globalTokenCounter = 100;\n        private final long leaseDurationMs = 3000;\n\n        void registerJob(String id, String payload, long firstRunMs, long intervalMs) {\n            tasks.put(id, new ScheduledTask(new JobDefinition(id, payload, intervalMs), firstRunMs));\n        }\n\n        record DispatchResult(String jobId, String payload, long fencingToken, String workerId) {}\n\n        DispatchResult pollAndLease(long now, String workerId) {\n            for (ScheduledTask task : tasks.values()) {\n                boolean isDue = task.assignedWorker == null && task.nextRunTimeMs <= now;\n                boolean isLeaseExpired = task.assignedWorker != null && task.leaseExpiresAtMs <= now;\n\n                if (isDue || isLeaseExpired) {\n                    task.assignedWorker = workerId;\n                    task.leaseExpiresAtMs = now + leaseDurationMs;\n                    task.currentFencingToken = ++globalTokenCounter;\n                    task.runCount++;\n                    return new DispatchResult(task.job.jobId(), task.job.payload(), task.currentFencingToken, workerId);\n                }\n            }\n            return null;\n        }\n\n        boolean heartbeat(String jobId, String workerId, long fencingToken, long now) {\n            ScheduledTask task = tasks.get(jobId);\n            if (task == null || !workerId.equals(task.assignedWorker) || fencingToken != task.currentFencingToken) {\n                return false;\n            }\n            task.leaseExpiresAtMs = now + leaseDurationMs;\n            return true;\n        }\n\n        boolean completeJob(String jobId, String workerId, long fencingToken, long now) {\n            ScheduledTask task = tasks.get(jobId);\n            if (task == null || !workerId.equals(task.assignedWorker) || fencingToken != task.currentFencingToken) {\n                return false;\n            }\n            task.assignedWorker = null;\n            task.leaseExpiresAtMs = 0;\n            task.nextRunTimeMs = now + task.job.intervalMs();\n            return true;\n        }\n    }\n\n    public static void main(String[] args) {\n        SchedulerCoordinator scheduler = new SchedulerCoordinator();\n        long clock = 1000L;\n\n        scheduler.registerJob(\"backup-db\", \"pg_dump /data\", 1000L, 10000L);\n        System.out.println(\"job registered for t=1000ms\");\n\n        SchedulerCoordinator.DispatchResult d1 = scheduler.pollAndLease(clock, \"worker-A\");\n        System.out.println(\"dispatched to \" + d1.workerId() + \", fencing token=\" + d1.fencingToken());\n\n        clock = 4500L;\n        SchedulerCoordinator.DispatchResult d2 = scheduler.pollAndLease(clock, \"worker-B\");\n        System.out.println(\"lease expired! re-dispatched to \" + d2.workerId() + \", new fencing token=\" + d2.fencingToken());\n\n        boolean staleAck = scheduler.completeJob(\"backup-db\", \"worker-A\", d1.fencingToken(), clock);\n        System.out.println(\"old worker A completion with stale token accepted=\" + staleAck);\n\n        boolean validAck = scheduler.completeJob(\"backup-db\", \"worker-B\", d2.fencingToken(), clock);\n        System.out.println(\"worker B completion with valid token accepted=\" + validAck);\n    }\n}"
      }
    ]
  },
  "sdd-top-k": {
    architecture: [
      {
            "name": "Ingestion partition stream",
            "role": "Partitioned Kafka event stream distributing high-throughput incoming events (search terms, hashtags, clicks) across workers.",
            "scale": "Ingests 100,000 events/sec across 32 partitions; applies 2-stage salting for viral hot keys to balance partition load.",
            "failure": "Kafka offset tracking allows workers to replay from checkpoints; partition replication prevents message loss."
      },
      {
            "name": "Count-Min Sketch stream workers",
            "role": "Stateless Apache Flink workers tracking item frequencies in sublinear space using conservative-update Count-Min Sketches.",
            "scale": "Processes 100,000 events/sec in 76 KB RAM per sketch (depth d=7, width w=2718) with error bound epsilon <= 0.001.",
            "failure": "Asynchronous Chandy-Lamport state snapshotting flushes sketch state to durable storage every 10 s for fast recovery."
      },
      {
            "name": "Local top-K min-heap",
            "role": "Bounded in-memory min-heap of size K paired with a hash map tracking the local heavy hitter candidates per worker node.",
            "scale": "Maintains top-100 candidates with O(log K) insertion overhead; evicts root element when new items exceed minimum threshold.",
            "failure": "Heap state is checkpointed alongside the sketch in worker state; reconstructed instantly upon worker restart."
      },
      {
            "name": "Central aggregator reducer",
            "role": "Periodically gathers candidate top-K lists from all distributed workers, combines counts, and produces the global top-K ranking.",
            "scale": "Executes every 5 to 10 seconds; aggregates a few thousand candidate items in under 20 ms in memory.",
            "failure": "Stateless aggregator; if a cycle fails, the subsequent snapshot cycle produces the updated global leaderboard."
      },
      {
            "name": "Top-K cache and query API",
            "role": "Caches the global Top-K leaderboard in a Redis Sorted Set (ZSET), serving client dashboard queries with sub-millisecond response.",
            "scale": "Serves 10,000 read queries/sec with P99 under 2 ms; reads are isolated from heavy ingestion stream processing.",
            "failure": "Redis read replicas handle query surges. On total cache loss, central aggregator re-publishes leaderboard within 5 seconds."
      }
],
    criteria: [
      {
            "area": "Scale and memory constraints",
            "strong": "Demonstrates that exact tracking of 100M keys requires 7.2 GB RAM; justifies probabilistic Count-Min Sketch using 76 KB RAM.",
            "weak": "Proposes an in-memory HashMap for all keys, ignoring out-of-memory crashes on high-cardinality streams."
      },
      {
            "area": "Count-Min Sketch parameters",
            "strong": "Derives dimensions w = ceil(e/epsilon) = 2718 and d = ceil(ln(1/delta)) = 7 from epsilon=0.001 and 99.9% confidence.",
            "weak": "Mentions Count-Min Sketch without knowing how width and depth relate to error bounds and confidence parameters."
      },
      {
            "area": "Heavy hitter extraction mechanism",
            "strong": "Pairs Count-Min Sketch with a bounded size-K Min-Heap and hash map to extract top items without scanning all possible keys.",
            "weak": "Claims Count-Min Sketch can directly return top-K without maintaining a companion heap or candidate list."
      },
      {
            "area": "Sliding window management",
            "strong": "Addresses inability of sketches to decrement counts by partitioning 1-hour window into 12 tumbling 5-minute bucket sketches.",
            "weak": "Suggests decrementing Count-Min Sketch counters on item expiration, which violates the minimum-count error guarantee."
      },
      {
            "area": "Zipfian skew and hot keys",
            "strong": "Applies conservative update to cut collision overestimation by 40%, whitelists super-heavy items, and salts hot keys across Kafka partitions.",
            "weak": "Does not address hash collision contamination from viral items or partition hotspotting in Kafka."
      }
],
    "diagrams": [
      {
        "title": "Components",
        "source": "flowchart LR\n  Producers[API / Event Producers] --> Kafka[Partitioned Kafka Stream]\n  Kafka --> Workers[Stream Processing Workers: Flink]\n  Workers --> LocalCMS[Local Count-Min Sketch & Min-Heap]\n  LocalCMS --> Window[Sliding Window Aggregator]\n  Window --> MergedCMS[(Central Aggregator: Global Top-K)]\n  MergedCMS --> Redis[(Redis Sorted Set: Top-K Cache)]\n  Client[Dashboard / Analytics API] --> Redis",
        "caption": "Events stream through Kafka into Flink workers maintaining local Count-Min Sketches and heaps. A central aggregator merges candidate sets into a Redis cache."
      },
      {
        "title": "Streaming count and update path",
        "source": "sequenceDiagram\n  participant Event as Event Stream\n  participant W as Stream Worker\n  participant CMS as Count-Min Sketch\n  participant Heap as Top-K Min-Heap (size K)\n  Event->>W: item arrived (e.g. \"#superbowl\")\n  W->>CMS: compute d hash indices: h1(x)...hd(x)\n  W->>CMS: query current min across rows = minVal\n  W->>CMS: conservative update: increment cells == minVal\n  W->>CMS: estimate(item) -> count\n  alt count > heap.minCount or heap.size < K\n    W->>Heap: insert/update item with new count\n    Heap->>Heap: rebalance min-heap, evict root if size > K\n  end",
        "caption": "Conservative update increments only counters matching the minimum across rows, reducing hash collision overestimation before updating the top-K min-heap."
      },
      {
        "title": "Two-stage aggregation",
        "source": "flowchart TD\n  Stream[High-Throughput Ingestion Stream] --> W1[Worker 1: Local Top-100]\n  Stream --> W2[Worker 2: Local Top-100]\n  Stream --> W3[Worker 3: Local Top-100]\n  W1 --> Snap[Periodic Snapshot Flush: 5s]\n  W2 --> Snap\n  W3 --> Snap\n  Snap --> Reducer[Global Reducer / Combiner]\n  Reducer --> GlobalHeap[Global Top-K Leaderboard]\n  GlobalHeap --> API[\"Read Query API: O(1) latency\"]",
        "caption": "Two-tier map-reduce aggregation: distributed workers track local heavy hitters and emit candidate sets to a global reducer, guaranteeing linear scale."
      }
    ],
    "sections": [
      {
        "title": "Scale, event stream volume and the memory barrier",
        "body": "Identifying the top-K most frequent items (heavy hitters) in an unbounded real-time stream is a foundational problem for trending hashtag trackers, ad-click fraud detection, and network traffic DDoS monitors. Stream scale: 100,000 ad clicks or search queries per second. Within a sliding 1-hour window, the system observes over 100 million distinct unique keys.\n\nExact frequency counting requires maintaining a key-counter pair for every unique key. Storing 100 million keys in a standard hash map requires: 100M keys x (32 bytes key string + 8 bytes counter + 32 bytes hash table overhead) = approximately 7.2 GB of RAM per stream worker node. Furthermore, answering top-K queries requires sorting 100 million keys, which consumes prohibitive CPU time and cannot run continuously at 100k events per second.\n\nIn stream processing, memory must be strictly bounded. Workers must identify the top-100 items within megabytes of RAM rather than gigabytes, maintaining an error bound epsilon <= 0.001 with probability 99.9%, while serving top-K query results with sub-millisecond response latency."
      },
      {
        "title": "Probabilistic counting: Count-Min Sketch and conservative update",
        "body": "The Count-Min Sketch (Cormode and Muthukrishnan) is a sublinear space probabilistic data structure that estimates item frequencies in an unbounded stream using a 2D array of counters with depth d and width w.\n\nDimension sizing: To guarantee that the frequency estimate is bounded by true count plus epsilon x N (where N is total stream events) with probability at least 1 - delta, the dimensions are chosen as width w = ceil(e / epsilon) and depth d = ceil(ln(1 / delta)). For error parameter epsilon = 0.001 and confidence 99.9% (delta = 0.001), width w = 2,718 and depth d = 7. A table of 7 x 2,718 32-bit integers requires only 76 KB of RAM.\n\nWhen an item arrives, it is hashed by d independent pairwise-independent hash functions. Each function maps the item to a column index in row i. Because counters only increment, hash collisions can only cause overestimation; a Count-Min Sketch never underestimates true frequency. The estimate is the minimum value across all d rows for that item.\n\nConservative update optimization: In a standard update, all d counters are incremented. With conservative update, the algorithm first computes the current estimate min. It then only increments the counters that equal that minimum value. This significantly reduces overestimation error caused by collisions with high-frequency items, improving estimation accuracy by 30% to 50% without additional memory."
      },
      {
        "title": "Finding Top-K: Min-Heap pairing, sliding windows and two-tier aggregation",
        "body": "A Count-Min Sketch answers 'what is the frequency of item X?', but it cannot directly answer 'which items have the highest frequencies?' without testing every possible key.\n\nTo extract the Top-K heavy hitters, the system pairs the Count-Min Sketch with a bounded Min-Heap of size K and a companion hash map index. When an item is processed and its new frequency estimate is retrieved from the sketch: if the item is already in the min-heap, its frequency is updated and the heap is sifted down; if the heap has fewer than K items, the item is inserted; if the item is not in the heap but its estimate exceeds the root of the heap, the root (the current K-th item with smallest count) is evicted, and the new item is inserted.\n\nSliding windows: In real-world applications (e.g. 'trending hashtags in the last hour'), historical counts must age out. Because Count-Min sketches do not support decrements (subtracting counts breaks the minimum guarantee), the system uses tumbling sub-windows. The 1-hour window is partitioned into twelve 5-minute buckets, each maintaining its own sketch and top-K heap. The active 1-hour frequency is computed by summing the 12 active sketches, and buckets older than 60 minutes are dropped.\n\nTwo-tier map-reduce aggregation: Events are partitioned across Kafka partitions and consumed by distributed stream processing workers (Apache Flink). Each worker processes its local partition, maintaining a local Count-Min sketch and local top-K heap. Every 5 to 10 seconds, workers emit their candidate top-K lists to a central reducer. The reducer aggregates the candidate counts and publishes the final global Top-K leaderboard into a Redis Sorted Set, allowing API servers to read the global top-100 in O(1) time."
      },
      {
        "title": "Failure modes, heavy hitter skew and approximation trade-offs",
        "body": "Walk through what breaks, with numbers, because an interviewer wants to hear the system degrade gracefully under load and infrastructure failure.\n\n**Skew and hash collision pollution**: In Zipfian distributions, a few 'super-heavy hitters' (e.g. a viral tweet or global news event) receive millions of hits. If a rare item happens to share a hash bucket with a super-heavy hitter across multiple rows, its estimated count will be falsely inflated. Mitigations: conservative update mitigates this; additionally, high-frequency items that surpass a predefined threshold are promoted to an exact in-memory whitelist cache, bypassing the sketch counters entirely and eliminating collision contamination for long-tail items.\n\n**Worker failure and stream replay**: If a stream processing worker crashes, in-memory sketch state for that window could be lost. Flink's asynchronous barrier snapshotting (Chandy-Lamport algorithm) periodically writes checkpointed sketch state to durable storage (RocksDB / S3). On worker failure, the partition rewinds to the last checkpoint offset in Kafka and replays events, ensuring consistent state restoration.\n\n**Hot key partition skew in Kafka**: If Kafka is partitioned by hash(item_id), all events for a viral item land on a single worker, causing CPU saturation and queue lag. To prevent this, ingestion gateways apply two-stage routing (salting): heavy keys are salted with a random suffix (item_id + '_' + random(1..4)), spreading traffic across 4 workers. The central reducer strips the salt and aggregates the partial sums.\n\n**Window boundary lag**: When sliding windows expire, dropping an old bucket can temporarily cause an item's count to step down abruptly. Using smooth decay weights or shorter tumbling bucket intervals (e.g. 1-minute buckets instead of 15-minute buckets) smooths out transient boundary fluctuations."
      }
    ],
    "code": [
      {
        "name": "TopKHeavyHitters.java",
        "code": "import java.util.*;\n\npublic class TopKHeavyHitters {\n    static class CountMinSketch {\n        private final int width;\n        private final int depth;\n        private final int[][] table;\n        private final long[] hashA;\n        private final long[] hashB;\n        private static final long PRIME = 2147483647L;\n\n        CountMinSketch(int width, int depth) {\n            this.width = width;\n            this.depth = depth;\n            this.table = new int[depth][width];\n            this.hashA = new long[depth];\n            this.hashB = new long[depth];\n            Random rng = new Random(42);\n            for (int i = 0; i < depth; i++) {\n                this.hashA[i] = 1 + rng.nextInt((int) PRIME - 1);\n                this.hashB[i] = rng.nextInt((int) PRIME);\n            }\n        }\n\n        private int hash(String item, int row) {\n            long hashVal = item.hashCode();\n            long val = (hashA[row] * hashVal + hashB[row]) % PRIME;\n            return (int) Math.abs(val % width);\n        }\n\n        void add(String item) {\n            int minVal = estimate(item);\n            for (int r = 0; r < depth; r++) {\n                int col = hash(item, r);\n                if (table[r][col] == minVal) {\n                    table[r][col]++;\n                }\n            }\n        }\n\n        int estimate(String item) {\n            int min = Integer.MAX_VALUE;\n            for (int r = 0; r < depth; r++) {\n                int col = hash(item, r);\n                min = Math.min(min, table[r][col]);\n            }\n            return min;\n        }\n    }\n\n    record ItemCount(String item, int count) {}\n\n    static class StreamTopK {\n        private final CountMinSketch sketch;\n        private final int k;\n        private final Map<String, Integer> heapLookup = new HashMap<>();\n        private final PriorityQueue<ItemCount> minHeap = new PriorityQueue<>(\n                Comparator.comparingInt(ItemCount::count)\n        );\n\n        StreamTopK(int k, int sketchWidth, int sketchDepth) {\n            this.k = k;\n            this.sketch = new CountMinSketch(sketchWidth, sketchDepth);\n        }\n\n        void process(String item) {\n            sketch.add(item);\n            int est = sketch.estimate(item);\n\n            if (heapLookup.containsKey(item)) {\n                minHeap.removeIf(ic -> ic.item().equals(item));\n                minHeap.add(new ItemCount(item, est));\n                heapLookup.put(item, est);\n            } else if (minHeap.size() < k) {\n                minHeap.add(new ItemCount(item, est));\n                heapLookup.put(item, est);\n            } else if (est > minHeap.peek().count()) {\n                ItemCount evicted = minHeap.poll();\n                heapLookup.remove(evicted.item());\n                minHeap.add(new ItemCount(item, est));\n                heapLookup.put(item, est);\n            }\n        }\n\n        List<ItemCount> getTopK() {\n            List<ItemCount> list = new ArrayList<>(minHeap);\n            list.sort(Comparator.comparingInt(ItemCount::count).reversed());\n            return list;\n        }\n    }\n\n    public static void main(String[] args) {\n        int k = 3;\n        StreamTopK topKTracker = new StreamTopK(k, 1000, 5);\n        Map<String, Integer> exactCounts = new HashMap<>();\n\n        String[] heavyItems = {\"#superbowl\", \"#breaking_news\", \"#tech_trends\"};\n        int[] occurrences = {5000, 3000, 1500};\n\n        for (int i = 0; i < heavyItems.length; i++) {\n            for (int n = 0; n < occurrences[i]; n++) {\n                topKTracker.process(heavyItems[i]);\n                exactCounts.merge(heavyItems[i], 1, Integer::sum);\n            }\n        }\n\n        for (int i = 0; i < 10_000; i++) {\n            String noise = \"noise_\" + (i % 2000);\n            topKTracker.process(noise);\n            exactCounts.merge(noise, 1, Integer::sum);\n        }\n\n        List<ItemCount> results = topKTracker.getTopK();\n        System.out.println(\"top-\" + k + \" heavy hitters detected:\");\n        for (ItemCount ic : results) {\n            int exact = exactCounts.getOrDefault(ic.item(), 0);\n            System.out.println(\"item=\" + ic.item() + \" sketch_est=\" + ic.count() + \" exact=\" + exact);\n        }\n    }\n}"
      }
    ]
  }
};
