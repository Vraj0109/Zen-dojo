import type { LldDeep, LldExtra, LldGuide } from "./types";

// Guide, recap, walkthrough and diagrams for the meeting room scheduler project in lld-projects-e-meeting.ts.
// Rules: no backticks or dollar-brace in the text (template literals), quote every Mermaid node label,
// no semicolons or hash signs in diagram text.

export const MEETING_GUIDE: LldGuide = {
  requirements: [
    "Book a room for a time range. Two meetings in one room must not overlap, but back to back is fine.",
    "The organizer cannot be in two meetings at once, so a booking must fit in the room's schedule and the organizer's schedule.",
    "Recurring meetings (daily, weekly on chosen days, every second week) are booked all or nothing; one occurrence can be cancelled alone.",
    "Rules: 15 minute granularity, at most 4 hours, inside working hours, not in the past, not more people than seats.",
    "Find rooms by size and equipment (best fit first), list the free stretches of a room, move a meeting, and stay correct with many people booking at once.",
  ],
  entities: [
    "Room (capacity, equipment), TimeRange (half open), Booking (series of ranges), Occurrence",
    "Schedule (sorted map by start time, its own lock), Recurrence (expands to ranges), RoomQuery",
    "MeetingService (facade, rules, two-lock booking), MeetingResult and MeetingCode, TimeSource",
  ],
  patterns: [
    "Interval tree idea with a TreeMap: an overlap check looks at two neighbours",
    "Recurrence expanded to plain ranges, so nothing else knows about it",
    "Lock several schedules in a fixed order (sorted by key) to avoid deadlock",
    "Best-fit room search; free-slot (gap) computation",
    "Result objects with the conflicting ranges named",
  ],
  code: `record TimeRange(long start, long end) {
  boolean overlaps(TimeRange other) { return start < other.end && other.start < end; }   // half open
}

final class Schedule {
  final ReentrantLock lock = new ReentrantLock();
  private final TreeMap<Long, Occurrence> byStart = new TreeMap<>();

  Optional<Occurrence> conflict(TimeRange range) {              // caller holds the lock
    Map.Entry<Long, Occurrence> before = byStart.floorEntry(range.start());
    if (before != null && before.getValue().range().overlaps(range)) return Optional.of(before.getValue());
    Map.Entry<Long, Occurrence> after = byStart.ceilingEntry(range.start());
    if (after != null && after.getValue().range().overlaps(range)) return Optional.of(after.getValue());
    return Optional.empty();
  }
}

private <T> T withBoth(Schedule a, Schedule b, Supplier<T> body) {
  Schedule first = a.key.compareTo(b.key) <= 0 ? a : b;      // always the same order
  Schedule second = first == a ? b : a;
  first.lock.lock();
  try { second.lock.lock(); try { return body.get(); } finally { second.lock.unlock(); } }
  finally { first.lock.unlock(); }
}`,
  extensions: [
    "Attendees: every invited person has a schedule too, and the booking is checked against all of them (more locks, same order).",
    "Time zones: store UTC, expand recurrences in the organizer's zone so that daylight saving does not move a 9:00 meeting.",
    "Buffers between meetings, cleaning time, and room maintenance blocks as bookings by a system user.",
    "Calendar integration: events published to a calendar service, and room release when nobody checks in.",
  ],
};

export const MEETING_EXTRA: LldExtra = {
  recap: [
    "A time range is half open, so 9 to 10 and 10 to 11 do not overlap. Everything is built on that one rule.",
    "Each room and each person has a Schedule: a TreeMap from start time to occurrence. Occurrences in one schedule never overlap, so a conflict check looks at just two neighbours, in O(log n).",
    "A recurrence is expanded into plain ranges before anything else happens. A series is booked all or nothing, and the refusal names the ranges that clash.",
    "A booking changes two schedules (room and organizer) as one step. The two locks are always taken in the same order, sorted by key, so threads cannot deadlock.",
  ],
  flow: [
    "Dev books a weekly series. The service checks the room and the size, the shape of the first meeting and that no occurrence is in the past.",
    "Recurrence.expand turns the rule into six ranges. The service takes the two locks (room:r2 and user:dev) in sorted order.",
    "Each range is checked against the room schedule and the person schedule with the two-neighbour test. If any clashes, the refusal lists them and nothing has changed.",
    "If all fit, one Occurrence per range is added to both schedules and a Booking with the ranges is stored.",
    "Later, cancelOccurrence removes just the second range from both schedules and remembers it in the booking, so the rest of the series stands.",
  ],
  edgeCases: [
    "Back to back meetings, overlap at the start, at the end, inside, around; the same person in two rooms at the same time.",
    "A series where one occurrence clashes (nothing is booked), a series that starts in the past, a series that starts on a Wednesday.",
    "Not a quarter hour, longer than 4 hours, before 8:00 or after 20:00, across midnight, exactly at the edges of working hours.",
    "Cancel one occurrence twice, cancel by someone else, move onto another meeting (the old time must come back).",
    "Forty people booking one room at one time; ten threads mixing bookings and cancellations across rooms and people.",
  ],
};

export const MEETING_DEEP: Record<string, LldDeep> = {
  "lldp-meeting-rooms": {
    walkthrough: [
      {
        title: "What to clarify first",
        body: `A meeting room scheduler is the classic interval problem wearing a business costume. Given a set of bookings, can a new one be added without overlapping? The interview is about doing that well, and about what grows around it: recurring meetings, searching, and two people trying at once.

Ask about the basics. Are times continuous or in slots of 15 or 30 minutes? Is there a maximum length? Are there working hours? Is the minimum unit the meeting, and can meetings in the same room touch, one ending when the next starts? Ask about people. Does the organizer need to be free too? Are attendees checked? Ask about recurrence. Which patterns: daily, weekly on chosen days, every second week? Can one occurrence be cancelled alone? Ask about search. Do users look for a room by size and equipment, or for a time when a room is free? Ask about concurrency and scale: how many rooms, how many users, and what happens when two people click at the same moment?

The requirements we fix are in the guide above. Four early decisions. First, a time range is half open: it includes its start and not its end. That one decision defines what back to back means and removes a whole class of off-by-one bugs. Second, a recurrence is expanded into plain ranges as soon as it is booked, so nothing else needs to understand it. Third, rooms and people are both schedules of the same kind. Fourth, time comes from an injected clock, so the past-time rule is tested by moving the clock.

State what is simplified: everything is in UTC, there are no attendees besides the organizer, and no calendar integration.`,
      },
      {
        title: "Overlap in O(log n)",
        body: `The first answer to "does this meeting overlap an existing one" is to compare it with all of them, which is linear in the number of bookings. For one room and one day that is fine. For a company with a thousand rooms and years of recurring meetings it is not, and an interviewer will ask for better.

Two ranges overlap when each starts before the other ends. With half open ranges that is start less than other.end and other.start less than end, which is the whole definition. The test pins the edges: 9 to 10 and 10 to 11 do not overlap, and sharing a single minute does.

Schedule keeps its bookings in a TreeMap from start time to occurrence. Inside one schedule nothing overlaps, so the occurrences sorted by start are also sorted by end. A new range can therefore only clash with one of two occurrences: the one that starts last at or before the new start (it may still be running), and the one that starts first at or after it (it may begin before the new range ends). floorEntry and ceilingEntry find them in logarithmic time. Everything else is either completely before or completely after, so it cannot overlap.

The property test is the one to remember. It generates 2000 random candidate ranges, places each in the schedule if the fast check allows it, and compares the answer for every candidate with a brute force check against all the placed ranges. They must agree every time. The same idea is an interval tree, which handles bookings that may overlap. Here the rule is that bookings do not overlap, so the plain sorted map is enough and simpler.

within(window) lists the occurrences that touch a window, and gaps(window, minutes) lists the free stretches. Both use the same ordering.`,
      },
      {
        title: "Recurrence: expand once, then forget it",
        body: `Recurring meetings are where candidates over-engineer. The tempting design stores the rule and checks it against every other booking in a special way. A simpler design turns the rule into a list of plain ranges at booking time, and from then on a series is just several ranges.

Recurrence holds a frequency (daily or weekly), an interval, the days of the week for weekly rules, and a count. expand(first) computes the ranges from the first meeting. Daily adds the interval in days to the date of the first. Weekly walks week by week from the Monday of the first meeting's week, takes the chosen days of each week, skips days before the first meeting, and stops when it has the count. With no days named, a weekly rule repeats on the weekday of the first meeting. Each occurrence keeps the same time of day and the same length. The count is limited to 52, so a request cannot create an unbounded number of rows.

The tests read like a specification. Daily for three days. Every second day. Monday, Wednesday and Friday for five meetings, which are the Monday, Wednesday, Friday of the first week and the Monday and Wednesday of the next. Every second week on Friday. A weekly series with no days. And a series that starts on a Wednesday with Monday and Wednesday as days: it must not include the Monday before the start.

Booking a series is all or nothing. The service checks every range against both schedules before adding anything. If some of them clash, the result is a ROOM_CONFLICT (or ORGANIZER_CONFLICT) that lists those ranges, so a screen can say that the Friday of the second week is taken, and nothing has been changed. The test books a series over a blocker on one Friday and checks that the other five occurrences are not left behind.

Cancelling one occurrence removes its range from both schedules and records its index in the booking. Cancelling the series removes all the active ones.`,
      },
      {
        title: "Two schedules, two locks, one order",
        body: `A meeting has to fit in two places: the room's schedule and the organizer's. If the booking checked the room and then, separately, the person, two threads could interleave and break the rule. The check and the change must be one step over both schedules, and that means holding both locks.

Holding two locks brings the classic danger. Suppose thread A books Asha into room r1 and thread B books Ben into room r1 and, at the same time, another thread books Asha into r2 while a fourth books Ben into r2. If each takes the room lock first and then the person lock, nothing is wrong. If one of them takes the person lock first, it can end up holding the person's lock and waiting for the room, while another holds the room and waits for the person. Neither can move. That is a deadlock.

The fix is a global order. Every schedule has a key such as room:r2 or user:dev, and withBoth always takes the lock of the smaller key first. As long as everyone follows the same order, a cycle cannot form, whatever the combination of rooms and people. A helper does it, so that no caller can get the order wrong, and a comment explains why.

The tests are built around this. Forty people book the same room at the same time and exactly one wins. Then ten threads run 150 rounds each of random bookings (some of them series) and random cancellations over three rooms and four people, with a 30 second limit: a wrong lock order would hang this test, and the test checks that every thread finished. When they are done, the test checks the invariants. No room and no person has two overlapping meetings, and the number of occurrences in the room schedules equals the number in the person schedules, because each one is in both or in neither.

Operations that touch only one schedule, such as a room search, take just that lock, which cannot create a cycle.`,
      },
      {
        title: "Rules, results and moving a meeting",
        body: `Before the schedules are touched, the service checks the shape of the request. These checks need no lock, because they depend only on the request and the clock. The room must exist and be big enough (CAPACITY). The start and the end must be on a quarter hour (BAD_TIME). The length must be at most four hours (TOO_LONG). The meeting must be on one day and inside working hours, 8:00 to 20:00 (OUTSIDE_HOURS), and the edges are allowed: a meeting that ends at exactly 20:00 is fine. No occurrence may start before now (IN_THE_PAST), and a meeting that starts at this moment is allowed. Each is a result code, because they are things users cause, not errors of the program.

Under the locks, two more answers are possible: ROOM_CONFLICT and ORGANIZER_CONFLICT, each with the list of requested ranges that clash. Only the organizer may cancel (NOT_ORGANIZER), cancelling twice is WRONG_STATE, and an unknown booking or index is NOT_FOUND.

Moving a meeting is the interesting operation, and it is where the old time must come back on failure. move() takes both locks, removes the meeting from both schedules, and checks the new range against them. If either clashes, the old occurrence is added back to both schedules and the answer says which side was the problem; the meeting is exactly where it was. If both are free, the new occurrence is added and the booking is replaced with one that has the new range. The test moves a meeting onto another meeting in the room and onto the organizer's other meeting, and checks that the room still holds both meetings afterwards. A series cannot be moved as one meeting here, which is stated in the code: moving a series means moving every occurrence by the same amount and deciding what happens to occurrences that were already cancelled or are in the past.

The booking returned by a move is a new object, since a Booking's ranges are immutable. That keeps readers who hold the old one safe.`,
      },
      {
        title: "Finding rooms and free times",
        body: `Two searches matter to users. The first is: which rooms can I use for this time? findRooms(query, range) takes the number of attendees and the equipment needed, keeps the rooms that are big enough and have all the equipment, and checks each room's schedule for a conflict with the range. The result is ranked best fit first: the smallest room that is big enough, with ties by id, so a large room is not wasted on three people. The tests check the order, the equipment rule (all items must be there), and that a room that is busy for part of the range is left out.

The second is: when is this room free? freeSlots(roomId, day, minutes) works inside working hours for that day, starts no earlier than now rounded up to the next quarter hour, and asks the schedule for its gaps. gaps walks the occurrences in the window in time order with a cursor. Any space between the cursor and the next start that is long enough becomes a gap, and the cursor moves to the end of that occurrence. After the last occurrence, the space to the end of the window may be a gap too. The gaps are whole stretches and not cut into slices, so a free morning shows as one stretch from 10:00 to 13:00, and the user chooses where inside it to start. The test covers the day with two meetings, a longer minimum that drops the short gaps, an empty day, a day that is partly in the past and yesterday.

firstAvailable combines the two: starting from the wanted time, it tries each quarter hour of the next 24 hours until some room fits the query, and returns the room and time. It is a convenience, not a scheduling algorithm. At scale one would ask each room for its gaps and take the earliest that fits, rather than probing quarter hour by quarter hour.

Main shows it: five people with video are offered Banyan and Peepal for nine o'clock, three people at ten o'clock get only Peepal because the other rooms are taken, and Lotus has free stretches from 8:00 to 9:00 and from 11:00 to 20:00.`,
      },
      {
        title: "The main flow, step by step, and what interviewers probe",
        body: `Run Main and follow it. Asha books Lotus from 9 to 10. Ben's 9:30 to 10:30 in the same room is ROOM_CONFLICT, and his 10:00 to 11:00 is accepted, since back to back is allowed. Asha's own 9:30 meeting in Banyan is ORGANIZER_CONFLICT: the room is free, but she is not. Five people in Lotus is CAPACITY. A start at 14:10 is BAD_TIME, five hours is TOO_LONG, and 21:00 is OUTSIDE_HOURS.

Dev books a series on Monday, Wednesday and Friday, six times, from the 2nd to the 13th of March. Eva asks for three days in a row starting on Wednesday at 10:30 and is refused: Dev's Wednesday and Friday meetings clash, and the answer lists them. Eva's schedule has no entries, so nothing was half-booked. Dev cancels the Wednesday meeting, five of six remain active, and Eva can now take that Wednesday. Ben tries to cancel Dev's series and is refused as NOT_ORGANIZER. Room searches, the free stretches, a move that frees the nine o'clock slot, a move onto Ben's meeting (refused, and the meeting stays where it was) and a booking in the past follow.

Extensions. Attendees are more schedules and more locks in the same sorted order. Time zones need UTC storage and recurrence expanded in the organizer's zone, so that a 9:00 meeting stays at 9:00 across a daylight saving change. Buffers and cleaning times are bookings by a system user. A release rule frees a room when nobody checks in after ten minutes. A calendar integration publishes events.

Probes, with short answers. Why half open ranges? Back to back must work and the maths must be simple. Why a TreeMap? Neighbours give the overlap check in O(log n). Why expand recurrences? Everything else then works on plain ranges. Why sorted lock order? It makes deadlock impossible. What if there are millions of bookings? Shard by room, keep only the window that matters in memory, and store the rest. What if a series is open-ended? Store the rule and expand a rolling window, for example the next year, and extend it by a job.`,
      },
    ],
    classDiagram: `classDiagram
    class MeetingService {
        +book(organizer, roomId, title, attendees, range, recurrence) MeetingResult
        +cancelSeries(organizer, bookingId) MeetingResult
        +cancelOccurrence(organizer, bookingId, index) MeetingResult
        +move(organizer, bookingId, newRange) MeetingResult
        +findRooms(query, range) List
        +freeSlots(roomId, day, minutes) List
        +firstAvailable(query, start, minutes) String
        +agenda(key, window) List
    }
    class Schedule {
        key
        lock
        +conflict(range) Optional
        +add(occurrence)
        +remove(occurrence)
        +within(window) List
        +gaps(window, minMinutes) List
    }
    class TimeRange {
        <<record>>
        start
        end
        +overlaps(other) boolean
    }
    class Booking {
        id
        roomId
        organizer
        ranges
        cancelled
        +activeCount() int
    }
    class Occurrence {
        <<record>>
        bookingId
        index
        range
    }
    class Recurrence {
        frequency
        interval
        days
        count
        +expand(first) List
    }
    class Room {
        <<record>>
        id
        capacity
        equipment
    }
    class RoomQuery {
        <<record>>
        attendees
        equipment
    }
    class TimeSource {
        <<interface>>
        +nowMillis() long
    }
    MeetingService --> Schedule
    MeetingService --> Booking
    MeetingService --> Room
    MeetingService --> Recurrence
    MeetingService --> RoomQuery
    MeetingService --> TimeSource
    Schedule --> Occurrence
    Occurrence --> TimeRange
    Booking --> TimeRange
    Recurrence ..> TimeRange`,
    sequenceDiagram: `sequenceDiagram
    actor Dev
    participant S as MeetingService
    participant R as Recurrence
    participant L as Lock order
    participant RS as Schedule room r2
    participant PS as Schedule user dev
    Dev->>S: book(dev, r2, Planning, series Mon Wed Fri x6)
    S->>S: room exists, capacity, shape, not in the past
    S->>R: expand(first meeting)
    R-->>S: six time ranges
    S->>L: lock room:r2 then user:dev, sorted by key
    S->>RS: conflict(range) for each of the six
    S->>PS: conflict(range) for each of the six
    RS-->>S: none clash
    PS-->>S: none clash
    S->>RS: add six occurrences
    S->>PS: add six occurrences
    S-->>Dev: OK, booking B7 with six ranges`,
    stateDiagram: `stateDiagram-v2
    [*] --> Active: booked, all occurrences in both schedules
    Active --> Active: one occurrence cancelled, the rest stand
    Active --> Cancelled: cancelSeries removes every active occurrence
    Cancelled --> [*]`,
    extraDiagrams: [
      {
        title: "Which occurrences can overlap a new range",
        caption: "Only the occurrence that starts last at or before the new start, and the one that starts first after it. Everything else is entirely before or after.",
        source: `flowchart LR
    A["9:00 to 10:00"] --> N["New range 9:30 to 10:30"]
    N --> B["10:15 to 11:00"]
    F["floorEntry(9:30) = the 9:00 booking: overlaps"] -.-> A
    C["ceilingEntry(9:30) = the 10:15 booking: starts before 10:30, overlaps"] -.-> B
    O["Bookings before 9:00 or after 10:15: cannot overlap, not looked at"] -.-> N`,
      },
      {
        title: "Half open ranges",
        caption: "The end is not part of the range, so meetings that touch do not clash.",
        source: `flowchart TD
    A["9:00 to 10:00 and 10:00 to 11:00"] --> B["start less than other.end: 9:00 less than 11:00 yes"]
    A --> C["other.start less than end: 10:00 less than 10:00 no"]
    B --> D["Overlap needs both: no overlap"]
    C --> D
    E["9:00 to 10:00 and 9:59 to 10:30"] --> F["both true: overlap"]`,
      },
      {
        title: "Expanding a weekly recurrence",
        caption: "Weeks are counted from the Monday of the first meeting's week. Days before the first meeting are skipped.",
        source: `flowchart TD
    R["Weekly, every 1 week, Mon Wed Fri, 5 meetings, first Monday 2 March"] --> W0["Week 0: Mon 2, Wed 4, Fri 6"]
    R --> W1["Week 1: Mon 9, Wed 11, Fri 13"]
    W0 --> L["Take occurrences until the count is reached"]
    W1 --> L
    L --> O["2, 4, 6, 9, 11 March at the same time of day and length"]`,
      },
      {
        title: "Why two locks need an order",
        caption: "Taken in different orders the two threads would wait for each other for ever. Taken in the same order one simply waits.",
        source: `sequenceDiagram
    participant A as Thread A, Asha in room 2
    participant B as Thread B, Ben in room 2
    participant L1 as Lock room:r2
    participant L2 as Lock user:asha
    A->>L1: lock first, because room:r2 sorts before user:asha
    B->>L1: tries to lock, waits
    A->>L2: lock second
    A->>L2: unlock
    A->>L1: unlock
    B->>L1: gets it
    Note over A,B: nobody holds one lock while waiting for the other in a cycle`,
      },
      {
        title: "Free stretches of a room",
        caption: "A cursor walks the bookings. Space between the cursor and the next start becomes a gap if it is long enough.",
        source: `flowchart TD
    S["Window 8:00 to 20:00, cursor = 8:00, meetings 9:00 to 10:00 and 13:00 to 14:30"] --> M1{"Meeting starts after the cursor by enough?"}
    M1 -- "9:00 is 60 minutes after 8:00" --> G1["Gap 8:00 to 9:00, cursor = 10:00"]
    G1 --> M2{"Next meeting at 13:00"}
    M2 -- "180 minutes" --> G2["Gap 10:00 to 13:00, cursor = 14:30"]
    G2 --> E{"Space left to 20:00?"}
    E -- yes --> G3["Gap 14:30 to 20:00"]`,
      },
      {
        title: "Moving a meeting",
        caption: "Take it out, test the new time, put the old one back if it does not fit.",
        source: `flowchart TD
    M["move(organizer, booking, newRange)"] --> C{"Shape, owner, not a series, not in the past?"}
    C -- no --> E1["BAD_TIME, NOT_ORGANIZER, WRONG_STATE, IN_THE_PAST"]
    C -- yes --> L["Take both locks in sorted order"]
    L --> R["Remove the occurrence from both schedules"]
    R --> F{"Room free and organizer free at the new time?"}
    F -- no --> B["Add the old occurrence back to both, ROOM_CONFLICT or ORGANIZER_CONFLICT"]
    F -- yes --> A["Add the new occurrence to both, replace the booking"]`,
      },
      {
        title: "Object snapshot after the demo bookings",
        caption: "The same occurrences appear in a room schedule and in a person schedule.",
        source: `flowchart LR
    RS["Schedule room:r1"] --> O1["9:00 to 10:00 Standup, B1"]
    RS --> O2["10:00 to 11:00 Sync, B2"]
    PA["Schedule user:asha"] --> O1
    PB["Schedule user:ben"] --> O2
    R2["Schedule room:r2"] --> D1["Mon 10:00 to 11:00, B3 occurrence 0"]
    R2 --> D2["Fri 10:00 to 11:00, B3 occurrence 2"]
    PD["Schedule user:dev"] --> D1
    PD --> D2`,
      },
      {
        title: "Where the extensions attach",
        caption: "Each follow-up question lands in one place.",
        source: `flowchart TD
    X["Follow-up questions"] --> AT["Attendees"]
    X --> TZ["Time zones"]
    X --> BF["Buffers and maintenance"]
    X --> RL["Release unused rooms"]
    AT --> AT1["One schedule per person, locks in the same sorted order"]
    TZ --> TZ1["Store UTC, expand recurrence in the organizer zone"]
    BF --> BF1["Bookings by a system user"]
    RL --> RL1["Job cancels an occurrence if nobody checks in"]`,
      },
    ],
    concurrency: [
      "Each Schedule has its own lock. A booking changes two schedules (room and organizer) and takes both locks in sorted key order, so no cycle of waiting threads can form, whatever the rooms and people.",
      "The conflict check and the insertion of every occurrence happen under both locks, so a series is booked entirely or not at all, and 40 people booking the same slot produce exactly one booking.",
      "Searches (findRooms, freeSlots, agenda) take one schedule lock at a time and never wait for a second, so they cannot take part in a deadlock.",
      "The rules that depend only on the request (shape, capacity, hours, past) are checked before any lock is taken, which keeps the critical section short.",
      "Time comes from an injected clock, so the in-the-past rule and the free-slot start are tested by moving it.",
      "At scale, schedules shard by room. The sorted-key rule still applies when a booking spans a room shard and a person shard: lock in key order or use a transaction with the same ordering.",
    ],
  },
};
