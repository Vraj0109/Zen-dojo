import type { LldExtra } from "./types";
import { URL_SHORTENER_EXTRA } from "./lld-deep-b-url";

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
  "lldp-booking": {
    recap: ["Show/Room/Book has inventory units (Seat, RoomNight, Copy).", "Hold with expiry → confirm on payment → release on timeout.", "Lock per unit (or optimistic version) to prevent double booking."],
    flow: [
      "User selects seats A1, A2 → BookingService.hold(showId, seats, userId).",
      "For each seat (sorted to avoid deadlock): lock, check AVAILABLE, mark HELD with holdUntil.",
      "Return Booking(PENDING, expiresAt).",
      "Payment success → confirm(): seats HELD → BOOKED, booking CONFIRMED.",
      "Scheduler releases holds past holdUntil → AVAILABLE.",
    ],
    edgeCases: ["Partial availability (A1 free, A2 taken) → all or nothing.", "Payment confirms after the hold expired.", "Same user double-clicks confirm (idempotent).", "Cancellation and refund rules by time before show."],
  },
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
  "lldp-splitwise": {
    recap: ["Expense(paidBy, amount, splits); Split strategies: equal, exact, percent.", "Balances map user → net amount (or pairwise ledger).", "Simplify debts: greedily match the largest creditor with the largest debtor."],
    flow: [
      "addExpense(groupId, paidBy=A, 900, EQUAL among A, B, C).",
      "SplitStrategy computes shares 300 each (remainder cents to the payer or first users).",
      "For each participant ≠ payer: balance[participant] −= share, balance[payer] += share.",
      "showBalances(): non-zero nets; simplify(): two heaps (creditors, debtors) settle max against max.",
    ],
    edgeCases: ["Amounts that don't divide evenly (use cents, distribute remainder).", "Percent splits not summing to 100 → reject.", "Payer not among participants.", "Settling up partially.", "Currency: store in minor units."],
  },
  "lldp-games": {
    recap: ["Game holds Board, Players, turn order and status; Move is a value object.", "Rules per piece/game behind an interface (validate move, check win).", "Game loop: get move → validate → apply → check end → next player."],
    flow: [
      "Game.start(): board initialized, current player = first.",
      "Player submits Move(from, to); Game asks the piece's MoveRule if legal on this board.",
      "Board.apply(move) (capture, promotion); push the move to history for undo.",
      "WinChecker evaluates (checkmate/stalemate, three in a row); else switch player.",
    ],
    edgeCases: ["Move by the wrong player.", "Move leaving own king in check (chess).", "Draw conditions.", "Undo across captures.", "Board size configurable (N×N tic-tac-toe, win in O(1) with row/col/diag counters)."],
  },
  "lldp-vending-atm": {
    recap: ["State pattern: Idle, HasMoney, Dispensing, OutOfService.", "Inventory per slot; cash box with denominations.", "Change-making: greedy with standard denominations; fail if exact change impossible."],
    flow: [
      "insertCoin(25) in Idle → credit 25, state HasMoney.",
      "select('B2') → check stock and price; if credit ≥ price → Dispensing.",
      "Dispense item, compute change, decrement stock and cash; back to Idle.",
      "cancel() in HasMoney → refund credit, Idle.",
    ],
    edgeCases: ["Item out of stock after money inserted → refund or reselect.", "Can't make change → refuse sale before dispensing.", "Dispense failure (jam) → refund and alert.", "ATM: insufficient balance, daily limit, card retained after wrong PIN attempts."],
  },
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
  "lldp-food-cab": {
    recap: ["Order/Ride lifecycle as a state machine.", "Matching is a Strategy (nearest, rating, batching).", "Assign atomically: driver AVAILABLE → ASSIGNED with compare-and-set."],
    flow: [
      "Customer places order → Order(PLACED); restaurant accepts → ACCEPTED.",
      "MatchingStrategy ranks nearby available couriers by distance/ETA.",
      "Offer to the best courier with a timeout; accept → atomically mark courier busy, Order ASSIGNED.",
      "PICKED_UP → DELIVERED; payment captured; courier AVAILABLE again.",
    ],
    edgeCases: ["Courier declines or times out → next candidate.", "Restaurant rejects after payment → refund.", "Customer cancels at each state (different refund rules).", "No couriers nearby → widen radius or queue."],
  },
  "lldp-file-system-kv": {
    recap: ["File system: tree of Directory/File nodes (Composite); path resolution by splitting on '/'.", "KV store: HashMap + optional TTL and transactions (stack of change maps).", "Clean API: mkdir, ls, addContent, readContent / get, set, delete, begin, commit, rollback."],
    flow: [
      "mkdir('/a/b'): walk from root, create missing directories.",
      "addContentToFile('/a/b/f', 'x'): resolve parent, create file if absent, append.",
      "ls('/a'): directory → sorted child names; file → its own name.",
      "KV begin(): push an empty change map; set writes there; commit merges down; rollback pops.",
    ],
    edgeCases: ["Path with trailing slash or '..'.", "File and directory with the same name.", "Nested transactions and rollback with nothing open.", "Expired keys checked lazily on get plus periodic cleanup."],
  },
};
