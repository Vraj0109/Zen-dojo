import type { LldExtra } from "./types";
import { URL_SHORTENER_EXTRA } from "./lld-deep-b-url";
import { VENDING_ATM_EXTRA } from "./lld-deep-c-vending";
import { BOOKING_EXTRA } from "./lld-deep-c-booking";
import { SPLITWISE_EXTRA } from "./lld-deep-c-splitwise";
import { LIBRARY_EXTRA } from "./lld-deep-c-library";
import { FOOD_EXTRA } from "./lld-deep-d-food";
import { CAB_EXTRA } from "./lld-deep-d-cab";
import { GAMES_EXTRA } from "./lld-deep-d-games";
import { FILESYSTEM_EXTRA } from "./lld-deep-d-filesystem";
import { KV_EXTRA } from "./lld-deep-d-kv";
import { HOTEL_EXTRA } from "./lld-deep-e-hotel";

// Per LLD problem: what to remember, one use case traced through the classes, and edge cases to name.

export const LLD_EXTRA: Record<string, LldExtra> = {
  "lldp-url-shortener": URL_SHORTENER_EXTRA,
  "lldp-parking-lot": {
    recap: ["ParkingLot → Floors → Slots (by type); Ticket links Vehicle, Slot, entry time.", "Slot allocation is a Strategy (nearest, by floor); pricing is a Strategy.", "Atomic slot assignment (per-type free queues or synchronized allocate)."],
    flow: [
      "Car arrives: EntryGate.issueTicket(vehicle) asks ParkingLot.allocate(vehicle.type).",
      "AllocationStrategy picks a floor; Floor.allocate(type) polls a free slot atomically.",
      "Slot.park(vehicle); Ticket(id, vehicle, slot, now) saved in the active-tickets map.",
      "On exit: ExitGate.close(ticketId) → PricingStrategy.fee(entry, now, type) → payment.",
      "Slot.release() returns it to the floor's free queue; ticket marked closed.",
    ],
    edgeCases: ["Lot full for that vehicle type → no ticket, show message.", "Lost ticket → max daily fee policy.", "Two cars at two gates racing for the last slot.", "Stay crossing midnight or exceeding 24 h.", "Larger vehicle allowed in a larger slot if its own type is full (policy)."],
  },
  "lldp-elevator": {
    recap: ["Elevator has state (IDLE, MOVING_UP, MOVING_DOWN, DOORS_OPEN, MAINTENANCE).", "Dispatcher assigns hall calls via a Strategy (nearest car, SCAN/LOOK).", "Each car keeps up/down stop sets and serves in direction order (LOOK)."],
    flow: [
      "Hall button on floor 7 'up' → Dispatcher.request(7, UP).",
      "Strategy scores cars (distance, direction, load) and calls car.addStop(7).",
      "Car (MOVING_UP from 3) adds 7 to its up-stops; the control loop moves floor by floor.",
      "At 7: state DOORS_OPEN, remove stop, wait, close; pick next stop in the current direction.",
      "No stops left → IDLE; reverse direction only when stops remain behind.",
    ],
    edgeCases: ["Request for the floor the car is already at with doors open.", "Overweight → doors stay open, refuse to move.", "Car in maintenance excluded from dispatch.", "All cars busy → queue the request.", "Emergency stop / fire mode overrides everything."],
  },
  "lldp-booking": BOOKING_EXTRA,
  "lldp-lru-rate-limiter": {
    recap: ["LRU: HashMap<K, Node> + doubly linked list; get/put O(1).", "Rate limiter interface with TokenBucket / SlidingWindow implementations, keyed per client.", "Thread safety: one lock per cache (or segmented), per-key buckets in a ConcurrentHashMap."],
    flow: [
      "cache.get(k): lock, find node, move to head, return value.",
      "cache.put(k, v): update and move to head, or insert at head; if size > capacity remove tail and its map entry.",
      "limiter.allow(clientId): buckets.computeIfAbsent(clientId, new TokenBucket).",
      "TokenBucket.tryAcquire(): synchronized refill by elapsed time × rate, take a token if ≥ 1.",
    ],
    edgeCases: ["Capacity 0 or 1.", "Updating an existing key must not evict.", "Clock injected for tests; monotonic time (nanoTime) not wall clock.", "Buckets for idle clients pile up → expire them."],
  },
  "lldp-splitwise": SPLITWISE_EXTRA,
  "lldp-games": GAMES_EXTRA,
  "lldp-vending-atm": VENDING_ATM_EXTRA,
  "lldp-logger-notifications": {
    recap: ["Logger: levels, formatters, appenders (Strategy) and a chain by level.", "Notifications: Observer for subscribers; channel senders behind an interface.", "Async: a queue + worker so callers don't block; retries per channel."],
    flow: [
      "logger.info(msg): if level enabled, build LogRecord(time, level, thread, msg).",
      "Formatter renders it; each Appender (console, file, remote) writes it.",
      "Async appender puts records on a bounded queue; a worker drains and writes in batches.",
      "Notification: event published → subscribers resolved by preferences → ChannelSender.send().",
    ],
    edgeCases: ["Queue full → drop with a counter or block (policy).", "Log file rotation by size/time.", "Channel failure → retry with backoff then fallback channel.", "User opted out / quiet hours."],
  },
  "lldp-food-cab": FOOD_EXTRA,
  "lldp-file-system-kv": FILESYSTEM_EXTRA,
  "lldp-library": LIBRARY_EXTRA,
  "lldp-cab": CAB_EXTRA,
  "lldp-kv-store": KV_EXTRA,
  "lldp-hotel": HOTEL_EXTRA,
};
