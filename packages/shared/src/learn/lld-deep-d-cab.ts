import type { LldDeep, LldExtra, LldGuide } from "./types";

// Guide, recap, walkthrough and diagrams for the cab booking project in lld-projects-d-cab.ts.
// Rules: no backticks or dollar-brace in the text (template literals), quote every Mermaid node label,
// no semicolons or hash signs in diagram text.

export const CAB_GUIDE: LldGuide = {
  requirements: [
    "A rider requests a trip from a pickup to a drop-off for a vehicle type, and sees a price quote first.",
    "Find nearby available drivers fast, without scanning every driver. Offer the trip, let the first driver who accepts have it.",
    "A trip moves through REQUESTED, DRIVER_ASSIGNED, ARRIVED, IN_PROGRESS and COMPLETED (or CANCELLED, or NO_DRIVER).",
    "The final fare comes from what really happened: metered distance and time, times a surge multiplier fixed when the rider asked.",
    "Surge from demand against supply. Cancellation fees that depend on when the rider cancels. A driver who cancels sends the trip back to matching.",
  ],
  entities: [
    "Driver (AtomicReference status, volatile location), GridIndex (cells of 1 km), DriverStatus",
    "Trip (status table, offers, metered distance), TripStatus, VehicleType",
    "FareCalculator, FareBreakdown, SurgePolicy (DemandSupplySurge), DemandTracker (sliding window)",
    "RideService (facade, matching rounds), PaymentGateway, RideListener",
  ],
  patterns: [
    "Spatial grid index: query only the cells near a point",
    "Compare-and-set on the driver status; first accept wins under the trip's lock",
    "Transition table for the trip state machine",
    "Strategy for surge; one class for the fare formula",
    "Offers with deadlines driven by an injected clock",
  ],
  code: `final class GridIndex {
  static final double CELL_KM = 1.0;
  private final Map<Long, Set<Driver>> cells = new ConcurrentHashMap<>();

  static long key(Point p) {
    long cx = (long) Math.floor(p.x() / CELL_KM), cy = (long) Math.floor(p.y() / CELL_KM);
    return (cx << 32) ^ (cy & 0xffffffffL);
  }

  List<Driver> near(Point p, double radiusKm) {
    List<Driver> found = new ArrayList<>();
    int reach = (int) Math.ceil(radiusKm / CELL_KM);
    long cx = (long) Math.floor(p.x() / CELL_KM), cy = (long) Math.floor(p.y() / CELL_KM);
    for (long x = cx - reach; x <= cx + reach; x++)
      for (long y = cy - reach; y <= cy + reach; y++) {
        Set<Driver> cell = cells.get((x << 32) ^ (y & 0xffffffffL));
        if (cell != null) for (Driver d : cell) if (d.location().distanceTo(p) <= radiusKm) found.add(d);
      }
    return found;
  }
}

RideResult answer(String tripId, String driverId, boolean accept) {
  synchronized (trip) {                                   // first accept wins
    if (trip.status != TripStatus.REQUESTED) return RideResult.of(RideCode.WRONG_STATE);
    if (!driver.startTrip()) return RideResult.of(RideCode.WRONG_STATE);   // OFFERED to ON_TRIP, compare-and-set
    /* release the other offered drivers, assign, move to DRIVER_ASSIGNED */
  }
}`,
  extensions: [
    "Ride sharing: a Trip with several riders and a route that inserts stops; matching becomes a search over routes.",
    "A real road network and ETAs from a routing service instead of straight-line distance, behind the same ranking step.",
    "Scheduled rides: REQUESTED with a start time, and matching starts shortly before.",
    "Driver incentives and ratings as listeners on COMPLETED.",
  ],
};

export const CAB_EXTRA: LldExtra = {
  recap: [
    "Finding drivers is a spatial query. A grid of 1 km cells lets a radius query read a few dozen cells, not the whole fleet, and a moving driver just changes cell.",
    "Matching offers a trip to up to three drivers at the same time for 15 seconds. The first accept wins under the trip's lock, and each driver is claimed with compare-and-set.",
    "The trip is a transition table. The fare is metered while IN_PROGRESS: location pings add distance, and the end of the trip adds time. Surge is fixed at request time.",
    "Cancelling is free until two minutes after assignment, then 5.00, then 10.00 when the driver has arrived. A driver who cancels sends the trip back to matching without that driver.",
  ],
  flow: [
    "Asha asks for a quote: the price for 10 km and 20 minutes at the current surge is shown. She requests the trip and the demand tracker records the request.",
    "RideService asks the grid for drivers within 2 km, keeps the available ones of the right type, sorts by distance and claims up to three with compare-and-set. They are offered the trip for 15 seconds.",
    "One driver declines, another accepts. Under the trip's lock the status is REQUESTED, the driver is OFFERED, so startTrip succeeds, the other offered drivers are released and the trip is DRIVER_ASSIGNED.",
    "The driver arrives and starts the trip. Each location ping adds the distance since the last one. At the end the fare is computed from the meter, the minutes and the stored surge, and the rider is charged.",
    "If nobody is free within 2 km the radius becomes 5 km. If still nobody, a tick retries every 10 seconds, and after three rounds the trip ends as NO_DRIVER.",
  ],
  edgeCases: [
    "A driver who answers after the deadline, one who was not offered, a second accept for a trip that has a driver, an offer to a driver who went offline.",
    "Pings while the driver drives to the pickup (not metered), pings after the trip ended, a trip shorter than the minimum fare.",
    "Surge that rises between the request and the end of the trip (the rider keeps their price). A request with the same pickup and drop-off.",
    "Rider cancels at each stage, driver cancels after accepting, payment that fails at the end of the trip.",
    "Thirty trips asked at once for three drivers; eight threads moving drivers while others query the grid.",
  ],
};

export const CAB_DEEP: Record<string, LldDeep> = {
  "lldp-cab": {
    walkthrough: [
      {
        title: "What to clarify first",
        body: `A cab app has the same shape as food delivery, with a different centre of gravity. There the order was the hard part. Here the hard parts are finding a driver quickly among thousands, and pricing a trip fairly while the world changes around it. A good answer treats those two as the core and keeps everything else small.

Ask about scope. Is it one trip per driver at a time, or shared rides? Which vehicle types exist and do they have separate prices? Does the rider see a price before requesting, and is that price final or an estimate? How do we choose a driver: nearest, rating, ETA? Do we ask one driver at a time or several? What happens when a driver does not answer? How is the final fare computed, and what is surge? Can the rider cancel and what does it cost? Can the driver cancel? How many drivers and how many requests per second should the design survive?

The requirements we fix are in the guide above. Four decisions to say aloud. First, a spatial index instead of a scan: with 50,000 drivers in a city, asking every one for its distance on every request is far too slow. Second, offers go to up to three drivers at once and the first accept wins, which is faster than one at a time and is safe if accepting is atomic. Third, the fare is metered from what happened, while surge is frozen when the rider asked, so the price does not change under them. Fourth, time is an interface, so offer timeouts, cancellation windows and the demand window are tested by moving a clock.

State what is simplified: a flat map in kilometres, straight-line distance and time estimates, and a fake payment gateway.`,
      },
      {
        title: "Finding drivers: the grid index",
        body: `The naive search is: for every driver, compute the distance to the pickup, and keep those within 3 km. That is linear in the number of drivers, and it runs for every request. A spatial index avoids it.

GridIndex cuts the map into square cells of one kilometre. Each cell holds the set of drivers currently inside it, and a second map remembers the cell of each driver. A query for drivers within a radius computes which cells the circle can touch (the cells within ceil(radius) of the centre cell) and reads only those, filtering by exact distance inside each. For a radius of 3 km that is 7 by 7 cells, 49 in total, whatever the size of the fleet. The test prints that count.

When a driver sends a location ping, update() computes the new cell. If it is the same cell, nothing moves. Otherwise the driver is removed from the old cell and added to the new one. The update is synchronized, so a driver is never in two cells or in none, and the reads use concurrent sets, so a query running during an update is safe and sees the driver in one place or the other.

A 1 km cell is a choice. Smaller cells mean more cells to read per query and more moves per driver; bigger cells mean more drivers to filter per cell. Production systems use geohashes or S2 cells, which are the same idea on a sphere, and a hierarchy of sizes. The test that matters compares the grid with brute force: 50 random queries over 2000 random drivers must give exactly the same sets. It also covers negative coordinates, removal and moving across cells.

Say what you would do at larger scale: shard the index by city, keep it in memory, and treat the location stream as the source of truth.`,
      },
      {
        title: "Matching: rounds of parallel offers",
        body: `RideService.requestTrip creates the trip and runs a matching round. A round takes the drivers within the current radius (2 km at first), keeps those that are AVAILABLE, of the right vehicle type and not already declined, sorts them nearest first and tries to claim up to three of them. Claiming is Driver.tryOffer(), a compare-and-set from AVAILABLE to OFFERED. If it fails, someone else got the driver first, and the loop simply goes on to the next one. Each claimed driver is offered the trip for 15 seconds.

Why three at once, rather than one at a time? Waiting 15 seconds for each driver in turn makes a rider wait minutes when drivers are busy. Offering to a few at once is faster. The price is that two accepts may arrive together, and the design must pick exactly one. answer() does it under the lock of the trip: it checks that the trip is still REQUESTED, that this driver was offered, and that the deadline has not passed. Then startTrip (OFFERED to ON_TRIP, another compare-and-set) makes the driver busy, the other offered drivers are released back to AVAILABLE, and the trip becomes DRIVER_ASSIGNED. The second accept finds the status changed and gets WRONG_STATE. The test starts three threads that accept the same trip at once and checks that exactly one wins.

A decline frees that driver and records them as declined, so they are not asked again. If all offers are gone, a new round starts. tick() expires offers after 15 seconds, releases those drivers, marks them as declined and starts the next round. If a round finds nobody, the radius widens to 5 km, and if there is still nobody, nextRoundAt says to try again in 10 seconds. After three rounds the trip ends as NO_DRIVER, a final state.

Everything that depends on time takes the injected clock, so the tests move 14, then 15 seconds and check that the boundary is where it should be.`,
      },
      {
        title: "The trip: states, metering and the fare",
        body: `A trip is a state machine, and as in the food delivery project the legal moves are a table: REQUESTED to DRIVER_ASSIGNED, CANCELLED or NO_DRIVER; DRIVER_ASSIGNED to ARRIVED, CANCELLED or back to REQUESTED when the driver cancels; ARRIVED to IN_PROGRESS or CANCELLED; IN_PROGRESS to COMPLETED only. Nobody can cancel a trip in progress, and nothing leaves a final state. Every step is checked by Trip.moveTo and timestamped in the history.

The fare is metered. While the trip is IN_PROGRESS, each location ping from the driver adds the distance from the previous point to a meter on the trip. Pings before the start (the drive to the pickup) and after the end are not counted, and the tests check both. When the driver ends the trip, the service reads the meter and the time on board, counting every started minute, and calls FareCalculator. The formula is one line: base plus per-kilometre times distance plus per-minute times time, at least the minimum, times the surge, rounded to cents. A different vehicle type has different numbers in the enum. An airport fee or a toll would be one more term, in one class.

The quote shown before the trip uses the straight-line distance and an estimate of two minutes per kilometre, and it records the surge. The estimate is stored on the trip, and the surge is stored too, because the rider was shown a price with that multiplier and must be charged with it. A test makes the surge double after the first rider asked, and checks that the first rider still pays the original multiplier at the end.

Money is in integer cents. If the payment fails at the end, the service returns PAYMENT_FAILED but the trip stays COMPLETED and the driver is freed, since the ride happened; collecting the debt is a separate process.`,
      },
      {
        title: "Surge pricing",
        body: `When many people want a ride and few drivers are free, a higher price does two things: it brings more drivers online, and it makes some riders wait. The mechanism has two parts, and each is small and separately testable.

DemandTracker counts requests per area in a sliding window of five minutes. An area is a block of three by three grid cells. Each request is recorded with its time, and recent() drops entries older than the window before it counts, so the count always means the last five minutes. A request exactly five minutes old has left the window, and the test pins that boundary. Each area has its own deque, guarded by a lock on that deque, so requests in different areas never wait for one another.

SurgePolicy is a strategy with one method: given the number of recent requests and the number of available drivers nearby, return a multiplier. DemandSupplySurge computes the ratio of requests plus one to drivers plus one, so an empty area does not divide by zero, and maps it to steps: 1.0 up to a ratio of 1, then 1.25, 1.5 and 2.0. Steps are easier to explain to a rider than a smooth curve, and the ceiling protects riders. A different policy, such as one that smooths changes over time or caps the increase per minute, is another class.

The multiplier is computed at the moment of the request and stored on the trip. That gives the rider a stable price. It also means two riders can see different prices a few seconds apart, which is true of every surge system, and the interviewer may ask how to make it feel fair: show the multiplier and let the rider accept it, and cap how fast it can rise.

Notice what is not in the fare code: no knowledge of how surge is decided. FareCalculator takes a number.`,
      },
      {
        title: "Cancellations and the driver's side",
        body: `Cancellation is where product rules meet the state machine. The rider can cancel while the trip is REQUESTED, DRIVER_ASSIGNED or ARRIVED. The rules are about fairness to the driver, who has spent time and fuel. Cancelling while nobody is assigned is free. After a driver is assigned, it is free for the first two minutes (the limit is inclusive: at exactly 120 seconds it is still free), then it costs 5.00. Once the driver has arrived at the pickup it costs 10.00. The fee is charged through the payment gateway under its own key, so a retry cannot charge twice. A cancel during the ride is refused by the table. All of these are tests, with the clock moved to 120 and then 121 seconds.

Cancelling also releases whoever is involved: offered drivers go back to AVAILABLE, and an assigned driver is freed and removed from the map of drivers to trips.

The driver can cancel too, and the rule is different. The rider is not charged, because it is not their fault. The trip goes back to REQUESTED, the driver is added to the declined set so that the same driver is not asked again, the round counter restarts, and a new matching round runs. The rider sees a short delay and not a failure. The test checks that the trip returns to REQUESTED with no driver, that nobody was charged, and that another driver takes it. This is where the transition table's REQUESTED edge from DRIVER_ASSIGNED is used.

Only the assigned driver can report arrival, start or end, and only the rider can cancel their trip. These are checked in every action, and they matter: without them a rider could end someone else's trip. Each check returns a code, and the code list reads like a specification.`,
      },
      {
        title: "The main flow, step by step",
        body: `Run Main and follow it. Four drivers are put online: three near the origin and one far away. The quote for 10 km as the crow flies is 190.00: a base of 30.00, 120.00 for the distance and 40.00 for 20 minutes. Asking for drivers within 3 km finds three and reads 49 cells.

Asha requests the trip, and the three nearest drivers are offered it. The nearest declines, which frees them and leaves two offers open. The second accepts, and the third, who answers afterwards, gets WRONG_STATE and is released: the printed status shows the third driver AVAILABLE again. The driver arrives and starts. Two pings at (3,4) and (6,8) add 5 km each, so the meter reads 10.0 km, and after 12 minutes the fare is 174.00: 30.00 plus 120.00 plus 24.00 for 12 minutes. The charge key is the trip id.

Ben's trip is cancelled after 60 seconds and costs nothing. Chen's is cancelled after 180 seconds and costs 5.00. Dev's driver cancels, and the trip is REQUESTED again, offered to the next available driver. Eva asks for an XL vehicle in a place with no drivers: the first round widens the radius and finds nobody, the trip stays REQUESTED, and two ticks ten seconds apart run rounds two and three, after which the status is NO_DRIVER.

The events list starts with REQUESTED, three OFFERED events and DECLINED, which is the stream a notification service would consume. The tests cover everything Main does not print: each fare component, surge steps, the sliding window, each transition, the first-accept race, metering rules, fixed surge, each cancellation fee, authorisation, and three concurrency tests.`,
      },
      {
        title: "Concurrency, extensions and what interviewers probe",
        body: `Three kinds of sharing exist. A driver's status is shared by all trips that look for drivers, and it is an AtomicReference with compare-and-set transitions, so thirty trips asking for three drivers at once produce exactly three offers, each driver to one trip. A trip's fields are shared by its driver's accept, the rider's cancel and the timer, and they are guarded by the trip's own lock, so decisions about one trip are serial and trips do not wait for one another. The grid is shared by every location ping and every query: updates are synchronized, the cells are concurrent sets, and a test runs eight threads moving 100 drivers while others query, then checks that every driver is in the index exactly once.

Lock order is simple: the service takes a trip's lock, and inside it only compare-and-set operations on drivers and the grid's own lock, which never calls back. No path takes two trip locks, so a deadlock cannot form.

Extensions. Ride sharing turns a trip into a route with several riders and several stops, and matching into a search over routes. A routing service replaces straight-line distance for both ranking and the quote. Scheduled rides start matching shortly before the pickup time. Ratings, tips and driver incentives are listeners.

Probes, with short answers. Why a grid and not a k-d tree or a quadtree? A grid is simple, updates are cheap, and drivers move constantly; trees need rebalancing. How does it scale? Shard by city, and shard a city by cell ranges. Why offer to three at once? Latency, and the first-accept rule keeps it correct. Why freeze surge? The rider agreed to a price. Why meter the distance instead of using the estimate? The route changes, and the driver deserves to be paid for it. What happens if the server restarts? Trips in REQUESTED are rebuilt from storage and matching restarts, while drivers re-announce themselves with their next location ping. What do you monitor? Time to assignment, acceptance rate, the share of trips that end as NO_DRIVER, and the surge level by area.`,
      },
    ],
    classDiagram: `classDiagram
    class RideService {
        +requestTrip(riderId, pickup, dropoff, type) RideResult
        +quote(pickup, dropoff, type) FareBreakdown
        +answer(tripId, driverId, accept) RideResult
        +arrived(tripId, driverId) RideResult
        +start(tripId, driverId) RideResult
        +end(tripId, driverId) RideResult
        +cancelByRider(tripId, riderId) RideResult
        +cancelByDriver(tripId, driverId) RideResult
        +location(driverId, point)
        +tick()
    }
    class GridIndex {
        +update(driver)
        +remove(driver)
        +near(point, radiusKm) List
    }
    class Driver {
        id
        vehicle
        location
        +tryOffer() boolean
        +startTrip() boolean
        +release() boolean
    }
    class Trip {
        status
        driverId
        meteredKm
        surge
        offeredTo
        +moveTo(next, now) boolean
    }
    class TripStatus {
        <<enumeration>>
        REQUESTED
        DRIVER_ASSIGNED
        ARRIVED
        IN_PROGRESS
        COMPLETED
        CANCELLED
        NO_DRIVER
    }
    class FareCalculator {
        +calculate(type, km, minutes, surge) FareBreakdown
    }
    class SurgePolicy {
        <<interface>>
        +multiplier(requests, drivers) double
    }
    class DemandTracker {
        +record(point, now)
        +recent(point, now) int
    }
    class PaymentGateway {
        <<interface>>
        +charge(riderId, cents, key) boolean
    }
    class VehicleType {
        <<enumeration>>
        ECONOMY
        PREMIUM
        XL
    }
    RideService --> GridIndex
    RideService --> Driver
    RideService --> Trip
    RideService --> FareCalculator
    RideService --> SurgePolicy
    RideService --> DemandTracker
    RideService --> PaymentGateway
    GridIndex --> Driver
    Trip --> TripStatus
    Driver --> VehicleType
    FareCalculator --> VehicleType
    SurgePolicy <|.. DemandSupplySurge`,
    sequenceDiagram: `sequenceDiagram
    actor Rider
    participant S as RideService
    participant G as GridIndex
    participant D1 as Driver one
    participant D2 as Driver two
    Rider->>S: requestTrip(pickup, dropoff, ECONOMY)
    S->>S: quote, record demand, create Trip
    S->>G: near(pickup, 2 km)
    G-->>S: drivers in nearby cells
    S->>D1: tryOffer() compare-and-set
    S->>D2: tryOffer() compare-and-set
    S-->>D1: offer valid 15 seconds
    S-->>D2: offer valid 15 seconds
    D2->>S: answer(accept)
    S->>S: lock trip, status REQUESTED, D2 was offered
    S->>D2: startTrip() OFFERED to ON_TRIP
    S->>D1: release()
    S-->>Rider: trip DRIVER_ASSIGNED with D2`,
    stateDiagram: `stateDiagram-v2
    [*] --> REQUESTED
    REQUESTED --> DRIVER_ASSIGNED: a driver accepts
    REQUESTED --> NO_DRIVER: three rounds without a driver
    REQUESTED --> CANCELLED: rider cancels, free
    DRIVER_ASSIGNED --> ARRIVED: driver arrives
    DRIVER_ASSIGNED --> CANCELLED: rider cancels, free for 2 minutes then 5.00
    DRIVER_ASSIGNED --> REQUESTED: driver cancels
    ARRIVED --> IN_PROGRESS: ride starts, meter starts
    ARRIVED --> CANCELLED: rider cancels, 10.00
    IN_PROGRESS --> COMPLETED: driver ends the trip, fare charged`,
    extraDiagrams: [
      {
        title: "Grid cells for a radius query",
        caption: "A 3 km query reads 7 by 7 cells around the pickup. Only drivers inside those cells are checked for exact distance.",
        source: `flowchart TD
    P["Pickup point"] --> C["Centre cell = floor of x and y divided by 1 km"]
    C --> R["Reach = ceil(radius / 1 km) = 3"]
    R --> B["Read cells from centre - 3 to centre + 3 in x and in y: 49 cells"]
    B --> F["For each driver in those cells: exact distance at most radius?"]
    F --> O["Drivers within 3 km"]`,
      },
      {
        title: "A driver moves between cells",
        caption: "A location ping changes the cell only when the driver crosses a boundary. The update is one synchronized step.",
        source: `sequenceDiagram
    participant P as Driver phone
    participant S as RideService
    participant G as GridIndex
    P->>S: location(d1, 3.2, 4.9)
    S->>S: driver.setLocation
    S->>G: update(driver)
    G->>G: new cell = (3, 4), old cell = (2, 4)
    G->>G: remove from the old cell, add to the new cell
    S->>S: if on a trip IN_PROGRESS, add distance to the meter`,
      },
      {
        title: "A round of offers",
        caption: "Up to three drivers at once. A claim can fail because another trip claimed the driver first, and then the next one is tried.",
        source: `flowchart TD
    S["dispatchRound(trip)"] --> N["Drivers near the pickup, AVAILABLE, right type, not declined"]
    N --> K["Sort nearest first"]
    K --> L{"Fewer than 3 offers and drivers left?"}
    L -- yes --> T{"tryOffer succeeds?"}
    T -- yes --> O["Add to offeredTo, event OFFERED"]
    T -- no --> L
    O --> L
    L -- no --> A{"Any offers?"}
    A -- yes --> E["Deadline = now + 15 s"]
    A -- no --> W{"Radius 2 km?"}
    W -- yes --> W2["Radius 5 km, search again"]
    W -- no --> M{"Round 3?"}
    M -- yes --> ND["NO_DRIVER"]
    M -- no --> RT["Try again in 10 seconds"]`,
      },
      {
        title: "Driver states",
        caption: "Each move is a compare-and-set, so a driver is never claimed by two trips.",
        source: `stateDiagram-v2
    [*] --> OFFLINE
    OFFLINE --> AVAILABLE: goOnline
    AVAILABLE --> OFFLINE: goOffline
    AVAILABLE --> OFFERED: tryOffer
    OFFERED --> ON_TRIP: startTrip, accepted
    OFFERED --> AVAILABLE: release, declined or expired or not chosen
    ON_TRIP --> AVAILABLE: release, trip ended or cancelled`,
      },
      {
        title: "Metering a trip",
        caption: "Only pings during IN_PROGRESS add distance. The time is counted in started minutes when the trip ends.",
        source: `flowchart LR
    A["Driver drives to the pickup: not metered"] --> B["start: lastPoint = pickup"]
    B --> C["Each ping adds distance from lastPoint"]
    C --> D["end: minutes = started minutes on board"]
    D --> E["fare = max(minimum, base + per km * km + per minute * minutes) * surge"]`,
      },
      {
        title: "Surge: from requests to a price multiplier",
        caption: "Requests in the last five minutes against available drivers nearby. The multiplier is frozen on the trip.",
        source: `flowchart TD
    R["Requests in this area, last 5 minutes"] --> Q["ratio = (requests + 1) / (drivers + 1)"]
    D["Available drivers within 3 km"] --> Q
    Q --> S{"Ratio"}
    S -- "up to 1" --> M1["1.0"]
    S -- "up to 2" --> M2["1.25"]
    S -- "up to 3" --> M3["1.5"]
    S -- "over 3" --> M4["2.0"]
    M1 --> F["Stored on the trip as surge"]
    M2 --> F
    M3 --> F
    M4 --> F`,
      },
      {
        title: "Cancellation fees",
        caption: "What the rider pays depends on the state and the time since the assignment.",
        source: `flowchart TD
    X["cancelByRider"] --> S{"State"}
    S -- REQUESTED --> F0["Free"]
    S -- DRIVER_ASSIGNED --> T{"More than 120 s since assignment?"}
    T -- no --> F0
    T -- yes --> F5["Fee 5.00"]
    S -- ARRIVED --> F10["Fee 10.00"]
    S -- "IN_PROGRESS or final" --> NO["WRONG_STATE, refused"]`,
      },
      {
        title: "Object snapshot: a trip with a driver on board",
        caption: "Trip T1 is in progress. The service keeps the driver and trip maps, and the grid knows where the driver is.",
        source: `flowchart LR
    T["Trip T1: IN_PROGRESS, surge 1.0, meter 4.0 km"] --> DR["driverId = d2"]
    SV["RideService"] --> TM["tripByDriver: d2 to T1"]
    SV --> GR["GridIndex: cell 3,4 holds d2"]
    D["Driver d2: ON_TRIP, location 3.0, 4.0"] --> GR
    TM --> T`,
      },
      {
        title: "Where the extensions attach",
        caption: "Each follow-up question lands in one place.",
        source: `flowchart TD
    X["Follow-up questions"] --> SH["Ride sharing"]
    X --> RT["Real routes and ETAs"]
    X --> SC["Scheduled rides"]
    X --> RA["Ratings, tips, incentives"]
    SH --> SH1["Trip with several riders and stops, route search in matching"]
    RT --> RT1["Routing service behind the ranking and the quote"]
    SC --> SC1["Start time on Trip, dispatch starts later"]
    RA --> RA1["RideListener on COMPLETED"]`,
      },
    ],
    concurrency: [
      "A driver's status is an AtomicReference with compare-and-set transitions (AVAILABLE, OFFERED, ON_TRIP). Thirty trips looking for three drivers produce exactly three offers, each driver to one trip.",
      "All decisions about one trip run inside synchronized(trip): the first accept wins, a rider cancel and a tick cannot interleave, and different trips never wait for each other.",
      "The grid index synchronizes updates (so a driver is in exactly one cell) and uses concurrent sets for the cells, so queries never block on moves. A test runs eight threads of moves and queries and checks every driver is indexed once.",
      "Lock order is trivial: a trip lock, then compare-and-set on drivers and the grid's own lock, which never calls back. No path takes two trip locks.",
      "The demand tracker has one deque per area, each guarded by its own monitor, so requests in different areas never contend.",
      "Time is injected. Offer deadlines, the 120 second cancel window and the five minute demand window are all tested by moving a ManualClock.",
    ],
  },
};
