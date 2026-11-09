import type { LldProject } from "./types";

// Meeting room scheduler (plan 0025). Java 17, standard library only, default package.
// Compiled with javac -Xlint:all and run (Main and Tests) when it was written.

export const LLD_PROJECTS_E_MEETING: Record<string, LldProject> = {
  "lldp-meeting-rooms": {
    files: [
      {
        name: "TimeSource.java",
        code: `interface TimeSource {
    long nowMillis();
}
`,
      },
      {
        name: "ManualClock.java",
        code: `final class ManualClock implements TimeSource {
    private long now;

    ManualClock(long start) { this.now = start; }

    @Override
    public synchronized long nowMillis() { return now; }

    synchronized void set(long millis) { now = millis; }
}
`,
      },
      {
        name: "Times.java",
        code: `import java.time.LocalDateTime;
import java.time.ZoneOffset;

// Small helpers so that the code and the tests can say "2 March 2026, 9:30" instead of a number of milliseconds. Everything
// is in UTC to keep the example short; a real system stores UTC and shows each user their own zone.
final class Times {
    static final long MINUTE = 60_000L;
    static final long HOUR = 60 * MINUTE;
    static final long DAY = 24 * HOUR;

    private Times() { }

    static long at(int year, int month, int day, int hour, int minute) {
        return LocalDateTime.of(year, month, day, hour, minute).toInstant(ZoneOffset.UTC).toEpochMilli();
    }

    static String text(long millis) {
        return LocalDateTime.ofEpochSecond(millis / 1000, 0, ZoneOffset.UTC).toString().replace('T', ' ');
    }
}
`,
      },
      {
        name: "TimeRange.java",
        code: `// A period of time, half open: it includes the start and not the end. So 9:00 to 10:00 and 10:00 to 11:00 do not overlap,
// which is what people mean when they book back to back.
record TimeRange(long start, long end) {
    TimeRange {
        if (end <= start) throw new IllegalArgumentException("a range must end after it starts");
    }

    boolean overlaps(TimeRange other) { return start < other.end && other.start < end; }

    long minutes() { return (end - start) / Times.MINUTE; }

    @Override
    public String toString() { return Times.text(start) + " to " + Times.text(end).substring(11); }
}
`,
      },
      {
        name: "Room.java",
        code: `import java.util.Set;

record Room(String id, String name, int capacity, Set<String> equipment) { }
`,
      },
      {
        name: "Frequency.java",
        code: `enum Frequency { DAILY, WEEKLY }
`,
      },
      {
        name: "Recurrence.java",
        code: `import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

// "Every day", "every Monday and Wednesday", "every second week on Friday", for a number of occurrences. expand() turns the
// rule and the first meeting into the list of real time ranges, so everything downstream (conflict checks, search, cancel)
// works on plain ranges and never has to understand recurrence.
final class Recurrence {
    static final int MAX_OCCURRENCES = 52;

    final Frequency frequency;
    final int interval;
    final Set<DayOfWeek> days;   // for WEEKLY; empty means the weekday of the first meeting
    final int count;

    Recurrence(Frequency frequency, int interval, Set<DayOfWeek> days, int count) {
        if (interval < 1 || count < 1 || count > MAX_OCCURRENCES) throw new IllegalArgumentException("interval at least 1, count 1 to " + MAX_OCCURRENCES);
        this.frequency = frequency;
        this.interval = interval;
        this.days = Set.copyOf(days);
        this.count = count;
    }

    static Recurrence daily(int count) { return new Recurrence(Frequency.DAILY, 1, Set.of(), count); }

    static Recurrence weekly(int interval, int count, DayOfWeek... days) { return new Recurrence(Frequency.WEEKLY, interval, Set.of(days), count); }

    List<TimeRange> expand(TimeRange first) {
        List<TimeRange> out = new ArrayList<>();
        LocalDateTime start = LocalDateTime.ofEpochSecond(first.start() / 1000, 0, ZoneOffset.UTC);
        long length = first.end() - first.start();
        LocalDate day = start.toLocalDate();
        if (frequency == Frequency.DAILY) {
            for (int i = 0; i < count; i++) out.add(range(day.plusDays((long) i * interval), start, length));
            return out;
        }
        Set<DayOfWeek> wanted = days.isEmpty() ? Set.of(day.getDayOfWeek()) : days;
        LocalDate monday = day.with(DayOfWeek.MONDAY);   // weeks are counted from the Monday of the first meeting's week
        for (int week = 0; out.size() < count; week += interval) {
            for (DayOfWeek d = DayOfWeek.MONDAY; ; d = d.plus(1)) {
                LocalDate date = monday.plusWeeks(week).plusDays(d.getValue() - 1);
                if (wanted.contains(d) && !date.isBefore(day) && out.size() < count) out.add(range(date, start, length));
                if (d == DayOfWeek.SUNDAY) break;
            }
        }
        return out;
    }

    private static TimeRange range(LocalDate date, LocalDateTime firstStart, long length) {
        long start = LocalDateTime.of(date, firstStart.toLocalTime()).toInstant(ZoneOffset.UTC).toEpochMilli();
        return new TimeRange(start, start + length);
    }
}
`,
      },
      {
        name: "Occurrence.java",
        code: `// One actual meeting: a time range that belongs to a booking (a series of one or more). index counts from 0.
record Occurrence(String bookingId, int index, TimeRange range) { }
`,
      },
      {
        name: "Booking.java",
        code: `import java.util.HashSet;
import java.util.List;
import java.util.Set;

// A booking is a series of occurrences (one, for a single meeting). Individual occurrences can be cancelled without
// touching the others.
final class Booking {
    final String id;
    final String roomId;
    final String organizer;
    final String title;
    final int attendees;
    final List<TimeRange> ranges;
    final Set<Integer> cancelled = new HashSet<>();
    boolean seriesCancelled;

    Booking(String id, String roomId, String organizer, String title, int attendees, List<TimeRange> ranges) {
        this.id = id;
        this.roomId = roomId;
        this.organizer = organizer;
        this.title = title;
        this.attendees = attendees;
        this.ranges = List.copyOf(ranges);
    }

    boolean active(int index) { return !seriesCancelled && !cancelled.contains(index); }

    int activeCount() {
        int n = 0;
        for (int i = 0; i < ranges.size(); i++) if (active(i)) n++;
        return n;
    }
}
`,
      },
      {
        name: "Schedule.java",
        code: `import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.concurrent.locks.ReentrantLock;

// Everything booked in one place (a room) or for one person (an organizer), as a sorted map from start time to occurrence.
// Because the occurrences of one schedule never overlap, they are also sorted by end time, and an overlap check only has to
// look at two neighbours: the occurrence that starts last before (or at) the new start, and the one that starts first after it.
// That is O(log n) instead of scanning every booking. The lock is part of the schedule so that callers can take several in a
// fixed order.
final class Schedule {
    final String key;
    final ReentrantLock lock = new ReentrantLock();
    private final TreeMap<Long, Occurrence> byStart = new TreeMap<>();

    Schedule(String key) { this.key = key; }

    // The occurrence that overlaps the range, if any. Caller holds the lock.
    Optional<Occurrence> conflict(TimeRange range) {
        Map.Entry<Long, Occurrence> before = byStart.floorEntry(range.start());
        if (before != null && before.getValue().range().overlaps(range)) return Optional.of(before.getValue());
        Map.Entry<Long, Occurrence> after = byStart.ceilingEntry(range.start());
        if (after != null && after.getValue().range().overlaps(range)) return Optional.of(after.getValue());
        return Optional.empty();
    }

    void add(Occurrence o) { byStart.put(o.range().start(), o); }

    void remove(Occurrence o) { byStart.remove(o.range().start()); }

    // Occurrences that overlap the window, in time order.
    List<Occurrence> within(TimeRange window) {
        List<Occurrence> out = new ArrayList<>();
        Map.Entry<Long, Occurrence> before = byStart.floorEntry(window.start());
        if (before != null && before.getValue().range().overlaps(window)) out.add(before.getValue());
        for (Occurrence o : byStart.subMap(window.start(), false, window.end(), false).values()) out.add(o);
        return out;
    }

    // The gaps of at least minMinutes inside the window, longest possible (a gap is as long as the free time between
    // two bookings, not cut into slices).
    List<TimeRange> gaps(TimeRange window, long minMinutes) {
        List<TimeRange> out = new ArrayList<>();
        long cursor = window.start();
        for (Occurrence o : within(window)) {
            if (o.range().start() > cursor && (o.range().start() - cursor) / Times.MINUTE >= minMinutes) {
                out.add(new TimeRange(cursor, Math.min(o.range().start(), window.end())));
            }
            cursor = Math.max(cursor, o.range().end());
        }
        if (cursor < window.end() && (window.end() - cursor) / Times.MINUTE >= minMinutes) out.add(new TimeRange(cursor, window.end()));
        return out;
    }

    int size() { return byStart.size(); }
}
`,
      },
      {
        name: "MeetingCode.java",
        code: `enum MeetingCode {
    OK, UNKNOWN_ROOM, BAD_TIME, IN_THE_PAST, TOO_LONG, OUTSIDE_HOURS, CAPACITY, ROOM_CONFLICT, ORGANIZER_CONFLICT,
    NOT_FOUND, NOT_ORGANIZER, WRONG_STATE
}
`,
      },
      {
        name: "MeetingResult.java",
        code: `import java.util.List;

// A booking, or the reason it was refused. When the refusal is a conflict, conflicts lists the requested ranges that clash,
// so a caller can say "the 3rd occurrence is taken" and not just "no".
record MeetingResult(MeetingCode code, Booking booking, List<TimeRange> conflicts) {
    static MeetingResult of(MeetingCode code) { return new MeetingResult(code, null, List.of()); }

    boolean ok() { return code == MeetingCode.OK; }
}
`,
      },
      {
        name: "RoomQuery.java",
        code: `import java.util.Set;

// What a person needs: how many people, which equipment. The search ranks the rooms that satisfy it.
record RoomQuery(int attendees, Set<String> equipment) {
    static RoomQuery of(int attendees, String... equipment) { return new RoomQuery(attendees, Set.of(equipment)); }
}
`,
      },
      {
        name: "MeetingService.java",
        code: `import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

// Books meeting rooms. A booking must fit in two places at once: the ROOM's schedule and the ORGANIZER's schedule (a person
// cannot be in two meetings). Both are checked and changed as one step. To do that safely with several threads, the two locks
// are always taken in the same order (sorted by key), so two bookings that need the same two schedules cannot each hold one
// and wait for the other.
final class MeetingService {
    static final long GRANULARITY = 15 * Times.MINUTE;
    static final long MAX_LENGTH = 4 * Times.HOUR;
    static final int DAY_START_HOUR = 8;
    static final int DAY_END_HOUR = 20;

    private final TimeSource clock;
    private final Map<String, Room> rooms = new LinkedHashMap<>();
    private final Map<String, Schedule> schedules = new ConcurrentHashMap<>();
    private final Map<String, Booking> bookings = new ConcurrentHashMap<>();
    private final AtomicInteger nextId = new AtomicInteger(1);

    MeetingService(TimeSource clock) { this.clock = clock; }

    void addRoom(Room room) {
        rooms.put(room.id(), room);
        scheduleOf("room:" + room.id());
    }

    private Schedule scheduleOf(String key) { return schedules.computeIfAbsent(key, Schedule::new); }

    // ---------------------------------------------------------------- booking

    MeetingResult book(String organizer, String roomId, String title, int attendees, TimeRange first, Recurrence recurrence) {
        Room room = rooms.get(roomId);
        if (room == null) return MeetingResult.of(MeetingCode.UNKNOWN_ROOM);
        if (attendees > room.capacity()) return MeetingResult.of(MeetingCode.CAPACITY);
        MeetingCode shape = checkShape(first);
        if (shape != MeetingCode.OK) return MeetingResult.of(shape);
        List<TimeRange> ranges = recurrence == null ? List.of(first) : recurrence.expand(first);
        for (TimeRange r : ranges) {
            if (r.start() < clock.nowMillis()) return MeetingResult.of(MeetingCode.IN_THE_PAST);
        }

        Schedule roomSchedule = scheduleOf("room:" + roomId);
        Schedule personSchedule = scheduleOf("user:" + organizer);
        return withBoth(roomSchedule, personSchedule, () -> {
            List<TimeRange> roomClashes = new ArrayList<>();
            List<TimeRange> personClashes = new ArrayList<>();
            for (TimeRange r : ranges) {
                if (roomSchedule.conflict(r).isPresent()) roomClashes.add(r);
                if (personSchedule.conflict(r).isPresent()) personClashes.add(r);
            }
            if (!roomClashes.isEmpty()) return new MeetingResult(MeetingCode.ROOM_CONFLICT, null, roomClashes);
            if (!personClashes.isEmpty()) return new MeetingResult(MeetingCode.ORGANIZER_CONFLICT, null, personClashes);

            Booking booking = new Booking("B" + nextId.getAndIncrement(), roomId, organizer, title, attendees, ranges);
            for (int i = 0; i < ranges.size(); i++) {
                Occurrence o = new Occurrence(booking.id, i, ranges.get(i));
                roomSchedule.add(o);
                personSchedule.add(o);
            }
            bookings.put(booking.id, booking);
            return new MeetingResult(MeetingCode.OK, booking, List.of());
        });
    }

    // Rules that every meeting must obey, whatever the room.
    private MeetingCode checkShape(TimeRange r) {
        if (r.start() % GRANULARITY != 0 || r.end() % GRANULARITY != 0) return MeetingCode.BAD_TIME;
        if (r.end() - r.start() > MAX_LENGTH) return MeetingCode.TOO_LONG;
        long startOfDay = r.start() - Math.floorMod(r.start(), Times.DAY);
        boolean sameDay = r.end() <= startOfDay + Times.DAY;
        if (!sameDay || r.start() < startOfDay + DAY_START_HOUR * Times.HOUR || r.end() > startOfDay + DAY_END_HOUR * Times.HOUR) return MeetingCode.OUTSIDE_HOURS;
        return MeetingCode.OK;
    }

    private <T> T withBoth(Schedule a, Schedule b, java.util.function.Supplier<T> body) {
        Schedule first = a.key.compareTo(b.key) <= 0 ? a : b;
        Schedule second = first == a ? b : a;
        first.lock.lock();
        try {
            second.lock.lock();
            try {
                return body.get();
            } finally {
                second.lock.unlock();
            }
        } finally {
            first.lock.unlock();
        }
    }

    // ---------------------------------------------------------------- cancelling

    MeetingResult cancelSeries(String organizer, String bookingId) {
        Booking b = bookings.get(bookingId);
        if (b == null) return MeetingResult.of(MeetingCode.NOT_FOUND);
        if (!b.organizer.equals(organizer)) return MeetingResult.of(MeetingCode.NOT_ORGANIZER);
        Schedule room = scheduleOf("room:" + b.roomId);
        Schedule person = scheduleOf("user:" + b.organizer);
        return withBoth(room, person, () -> {
            if (b.seriesCancelled) return MeetingResult.of(MeetingCode.WRONG_STATE);
            for (int i = 0; i < b.ranges.size(); i++) {
                if (b.active(i)) removeOccurrence(b, i, room, person);
            }
            b.seriesCancelled = true;
            return new MeetingResult(MeetingCode.OK, b, List.of());
        });
    }

    // Cancels one occurrence of a series (or the only meeting of a single booking) and leaves the rest.
    MeetingResult cancelOccurrence(String organizer, String bookingId, int index) {
        Booking b = bookings.get(bookingId);
        if (b == null || index < 0 || index >= b.ranges.size()) return MeetingResult.of(MeetingCode.NOT_FOUND);
        if (!b.organizer.equals(organizer)) return MeetingResult.of(MeetingCode.NOT_ORGANIZER);
        Schedule room = scheduleOf("room:" + b.roomId);
        Schedule person = scheduleOf("user:" + b.organizer);
        return withBoth(room, person, () -> {
            if (!b.active(index)) return MeetingResult.of(MeetingCode.WRONG_STATE);
            removeOccurrence(b, index, room, person);
            b.cancelled.add(index);
            return new MeetingResult(MeetingCode.OK, b, List.of());
        });
    }

    private void removeOccurrence(Booking b, int index, Schedule room, Schedule person) {
        Occurrence o = new Occurrence(b.id, index, b.ranges.get(index));
        room.remove(o);
        person.remove(o);
    }

    // Moves a single meeting to a new time in the same room. The old time is freed only if the new one fits; on a conflict
    // nothing changes. (A series would move every occurrence by the same amount; the walkthrough says why that is left out.)
    MeetingResult move(String organizer, String bookingId, TimeRange newRange) {
        Booking b = bookings.get(bookingId);
        if (b == null) return MeetingResult.of(MeetingCode.NOT_FOUND);
        if (!b.organizer.equals(organizer)) return MeetingResult.of(MeetingCode.NOT_ORGANIZER);
        if (b.ranges.size() != 1) return MeetingResult.of(MeetingCode.WRONG_STATE);
        MeetingCode shape = checkShape(newRange);
        if (shape != MeetingCode.OK) return MeetingResult.of(shape);
        if (newRange.start() < clock.nowMillis()) return MeetingResult.of(MeetingCode.IN_THE_PAST);
        Schedule room = scheduleOf("room:" + b.roomId);
        Schedule person = scheduleOf("user:" + b.organizer);
        return withBoth(room, person, () -> {
            if (!b.active(0)) return MeetingResult.of(MeetingCode.WRONG_STATE);
            removeOccurrence(b, 0, room, person);
            boolean roomFree = room.conflict(newRange).isEmpty();
            boolean personFree = person.conflict(newRange).isEmpty();
            if (!roomFree || !personFree) {
                room.add(new Occurrence(b.id, 0, b.ranges.get(0)));     // put the old time back
                person.add(new Occurrence(b.id, 0, b.ranges.get(0)));
                return new MeetingResult(roomFree ? MeetingCode.ORGANIZER_CONFLICT : MeetingCode.ROOM_CONFLICT, null, List.of(newRange));
            }
            Booking moved = new Booking(b.id, b.roomId, b.organizer, b.title, b.attendees, List.of(newRange));
            bookings.put(b.id, moved);
            Occurrence o = new Occurrence(b.id, 0, newRange);
            room.add(o);
            person.add(o);
            return new MeetingResult(MeetingCode.OK, moved, List.of());
        });
    }

    // ---------------------------------------------------------------- finding rooms and times

    // Rooms that fit the query and are free for the whole range, best fit first: the smallest room that is big enough, so
    // that a large room is not wasted on three people. Ties by id.
    List<Room> findRooms(RoomQuery query, TimeRange range) {
        List<Room> found = new ArrayList<>();
        for (Room room : rooms.values()) {
            if (room.capacity() < query.attendees() || !room.equipment().containsAll(query.equipment())) continue;
            Schedule s = scheduleOf("room:" + room.id());
            s.lock.lock();
            try {
                if (s.conflict(range).isEmpty()) found.add(room);
            } finally {
                s.lock.unlock();
            }
        }
        found.sort(Comparator.comparingInt(Room::capacity).thenComparing(Room::id));
        return found;
    }

    // Free stretches of at least the given length in one room on one day, inside working hours.
    List<TimeRange> freeSlots(String roomId, LocalDate day, int minutes) {
        long start = day.atStartOfDay().toInstant(ZoneOffset.UTC).toEpochMilli() + DAY_START_HOUR * Times.HOUR;
        long end = day.atStartOfDay().toInstant(ZoneOffset.UTC).toEpochMilli() + DAY_END_HOUR * Times.HOUR;
        long from = Math.max(start, roundUp(clock.nowMillis()));
        if (from >= end) return List.of();
        Schedule s = scheduleOf("room:" + roomId);
        s.lock.lock();
        try {
            return s.gaps(new TimeRange(from, end), minutes);
        } finally {
            s.lock.unlock();
        }
    }

    private static long roundUp(long t) { return (t + GRANULARITY - 1) / GRANULARITY * GRANULARITY; }

    // The first room, and the first time on or after the wanted start, that fits: a convenience on top of the two above.
    String firstAvailable(RoomQuery query, long wantedStart, int minutes) {
        long step = GRANULARITY;
        for (long t = wantedStart; t < wantedStart + Times.DAY; t += step) {
            TimeRange range = new TimeRange(t, t + minutes * Times.MINUTE);
            if (checkShape(range) != MeetingCode.OK) continue;
            List<Room> rooms = findRooms(query, range);
            if (!rooms.isEmpty()) return rooms.get(0).name() + " at " + Times.text(t);
        }
        return null;
    }

    // What is booked in a room or for a person in a window, in time order.
    List<Occurrence> agenda(String key, TimeRange window) {
        Schedule s = scheduleOf(key);
        s.lock.lock();
        try {
            return s.within(window);
        } finally {
            s.lock.unlock();
        }
    }

    Booking booking(String id) { return bookings.get(id); }

    int scheduledIn(String key) {
        Schedule s = scheduleOf(key);
        s.lock.lock();
        try {
            return s.size();
        } finally {
            s.lock.unlock();
        }
    }
}
`,
      },
      {
        name: "Main.java",
        code: `import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        ManualClock clock = new ManualClock(Times.at(2026, 3, 2, 7, 0));   // Monday 2 March 2026, 07:00
        MeetingService service = new MeetingService(clock);
        service.addRoom(new Room("r1", "Lotus", 4, java.util.Set.of("tv")));
        service.addRoom(new Room("r2", "Banyan", 8, java.util.Set.of("tv", "video")));
        service.addRoom(new Room("r3", "Peepal", 20, java.util.Set.of("tv", "video", "whiteboard")));

        TimeRange nine = new TimeRange(Times.at(2026, 3, 2, 9, 0), Times.at(2026, 3, 2, 10, 0));
        MeetingResult a = service.book("asha", "r1", "Standup", 4, nine, null);
        System.out.println("Asha books Lotus 9 to 10: " + a.code());
        System.out.println("Ben books the same room 9:30 to 10:30: " + service.book("ben", "r1", "Sync", 3, new TimeRange(Times.at(2026, 3, 2, 9, 30), Times.at(2026, 3, 2, 10, 30)), null).code());
        System.out.println("Ben books it back to back 10 to 11: " + service.book("ben", "r1", "Sync", 3, new TimeRange(Times.at(2026, 3, 2, 10, 0), Times.at(2026, 3, 2, 11, 0)), null).code());
        System.out.println("Asha books another room at 9:30 (she is in a meeting): " + service.book("asha", "r2", "Review", 6, new TimeRange(Times.at(2026, 3, 2, 9, 30), Times.at(2026, 3, 2, 10, 0)), null).code());
        System.out.println("Too many people for Lotus: " + service.book("chen", "r1", "All hands", 5, new TimeRange(Times.at(2026, 3, 2, 14, 0), Times.at(2026, 3, 2, 15, 0)), null).code());
        System.out.println("Not on a quarter hour: " + service.book("chen", "r2", "Odd", 2, new TimeRange(Times.at(2026, 3, 2, 14, 10), Times.at(2026, 3, 2, 15, 0)), null).code() + ", too long: " + service.book("chen", "r2", "Long", 2, new TimeRange(Times.at(2026, 3, 2, 9, 0), Times.at(2026, 3, 2, 14, 0)), null).code() + ", night: " + service.book("chen", "r2", "Late", 2, new TimeRange(Times.at(2026, 3, 2, 21, 0), Times.at(2026, 3, 2, 22, 0)), null).code());

        TimeRange mondayTen = new TimeRange(Times.at(2026, 3, 2, 10, 0), Times.at(2026, 3, 2, 11, 0));
        Recurrence mwf = Recurrence.weekly(1, 6, DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY);
        MeetingResult series = service.book("dev", "r2", "Planning", 6, mondayTen, mwf);
        System.out.println("Dev books a series on Mon Wed Fri, 6 times: " + series.code() + ", first " + series.booking().ranges.get(0) + ", last " + series.booking().ranges.get(5));
        MeetingResult clash = service.book("eva", "r2", "Blocked", 4, new TimeRange(Times.at(2026, 3, 4, 10, 30), Times.at(2026, 3, 4, 11, 30)), Recurrence.daily(3));
        System.out.println("Eva asks for 3 days from Wednesday 10:30: " + clash.code() + ", clashing: " + clash.conflicts());
        System.out.println("Eva's series left nothing behind: " + service.scheduledIn("user:eva") + " entries");
        System.out.println("Dev cancels the Wednesday meeting only: " + service.cancelOccurrence("dev", series.booking().id, 1).code() + ", active " + series.booking().activeCount() + " of 6");
        System.out.println("Eva can take that Wednesday now: " + service.book("eva", "r2", "Wed block", 4, new TimeRange(Times.at(2026, 3, 4, 10, 30), Times.at(2026, 3, 4, 11, 30)), null).code());
        System.out.println("Ben cancels Dev's series: " + service.cancelSeries("ben", series.booking().id).code());

        System.out.println("Rooms for 5 people with video, 9 to 10 on Monday: " + names(service.findRooms(RoomQuery.of(5, "video"), nine)));
        System.out.println("Rooms for 3 people, 10 to 11 on Monday: " + names(service.findRooms(RoomQuery.of(3), mondayTen)));
        System.out.println("Free 60 minute slots in Lotus on Monday: " + service.freeSlots("r1", LocalDate.of(2026, 3, 2), 60));
        System.out.println("First room for 6 people with whiteboard, 1 hour from 9: " + service.firstAvailable(RoomQuery.of(6, "whiteboard"), Times.at(2026, 3, 2, 9, 0), 60));

        MeetingResult moved = service.move("asha", a.booking().id, new TimeRange(Times.at(2026, 3, 2, 13, 0), Times.at(2026, 3, 2, 14, 0)));
        System.out.println("Asha moves her standup to 13:00: " + moved.code() + ", room at 9 is free again: " + service.findRooms(RoomQuery.of(2), nine).size() + " rooms");
        System.out.println("Move onto Ben's 10 o'clock meeting: " + service.move("asha", a.booking().id, new TimeRange(Times.at(2026, 3, 2, 10, 0), Times.at(2026, 3, 2, 11, 0))).code());
        clock.set(Times.at(2026, 3, 2, 9, 0));
        System.out.println("In the past: " + service.book("zoe", "r1", "Old", 2, new TimeRange(Times.at(2026, 3, 2, 8, 0), Times.at(2026, 3, 2, 8, 30)), null).code());
    }

    private static List<String> names(List<Room> rooms) { return rooms.stream().map(Room::name).toList(); }
}
`,
      },
    ],
    tests: [
      {
        name: "Tests.java",
        code: `import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

public class Tests {
    private static int failures = 0;

    private static void check(boolean ok, String name) {
        System.out.println((ok ? "PASS " : "FAIL ") + name);
        if (!ok) failures++;
    }

    private static final long NOW = Times.at(2026, 3, 2, 7, 0);   // a Monday

    private static TimeRange r(int day, int h1, int m1, int h2, int m2) {
        return new TimeRange(Times.at(2026, 3, day, h1, m1), Times.at(2026, 3, day, h2, m2));
    }

    private static MeetingService service() {
        MeetingService s = new MeetingService(new ManualClock(NOW));
        s.addRoom(new Room("r1", "Lotus", 4, Set.of("tv")));
        s.addRoom(new Room("r2", "Banyan", 8, Set.of("tv", "video")));
        s.addRoom(new Room("r3", "Peepal", 20, Set.of("tv", "video", "whiteboard")));
        return s;
    }

    public static void main(String[] args) throws Exception {
        rangeRules();
        scheduleMatchesBruteForce();
        gapsInASchedule();
        recurrenceExpansion();
        recurrenceValidation();
        shapeRules();
        conflictsAndBackToBack();
        organizerCannotBeInTwoPlaces();
        seriesAreAllOrNothing();
        cancelling();
        moving();
        findingRooms();
        freeSlots();
        oneSlotManyThreads();
        mixedWorkloadKeepsSchedulesConsistent();
        if (failures > 0) System.exit(1);
    }

    private static void rangeRules() {
        TimeRange nine = r(2, 9, 0, 10, 0);
        check(!nine.overlaps(r(2, 10, 0, 11, 0)) && !nine.overlaps(r(2, 8, 0, 9, 0)), "back to back ranges do not overlap: the end is not included");
        check(nine.overlaps(r(2, 9, 59, 10, 30)) && nine.overlaps(r(2, 8, 30, 9, 1)), "a minute of shared time is an overlap");
        check(nine.overlaps(r(2, 9, 15, 9, 45)) && nine.overlaps(r(2, 8, 0, 12, 0)), "one range inside the other, or around it");
        check(nine.minutes() == 60, "length in minutes");
        boolean refused = false;
        try {
            new TimeRange(5, 5);
        } catch (IllegalArgumentException e) {
            refused = true;
        }
        check(refused, "an empty range is refused");
    }

    private static void scheduleMatchesBruteForce() {
        Random random = new Random(9);
        Schedule s = new Schedule("room:x");
        List<TimeRange> placed = new ArrayList<>();
        boolean same = true;
        for (int i = 0; i < 2000; i++) {
            long start = random.nextInt(400) * Times.MINUTE;
            TimeRange candidate = new TimeRange(start, start + (1 + random.nextInt(8)) * 15 * Times.MINUTE);
            boolean brute = placed.stream().anyMatch(p -> p.overlaps(candidate));
            boolean fast = s.conflict(candidate).isPresent();
            same &= brute == fast;
            if (!brute) {
                placed.add(candidate);
                s.add(new Occurrence("b" + i, 0, candidate));
            }
        }
        check(same, "2000 random candidates: the two-neighbour check agrees with comparing against every booking");
        check(placed.size() == s.size() && placed.size() > 10, "and a good number of them were placed");
    }

    private static void gapsInASchedule() {
        Schedule s = new Schedule("room:x");
        s.add(new Occurrence("a", 0, r(2, 9, 0, 10, 0)));
        s.add(new Occurrence("b", 0, r(2, 10, 30, 12, 0)));
        s.add(new Occurrence("c", 0, r(2, 15, 0, 16, 0)));
        List<TimeRange> gaps = s.gaps(r(2, 8, 0, 18, 0), 30);
        check(gaps.equals(List.of(r(2, 8, 0, 9, 0), r(2, 10, 0, 10, 30), r(2, 12, 0, 15, 0), r(2, 16, 0, 18, 0))), "free stretches between bookings, whole and not cut into pieces");
        check(s.gaps(r(2, 8, 0, 18, 0), 60).size() == 3 && s.gaps(r(2, 8, 0, 18, 0), 200).isEmpty(), "short gaps are dropped when a longer one is needed");
        check(s.gaps(r(2, 9, 30, 9, 45), 10).isEmpty(), "a window inside a booking has no gap");
        check(s.within(r(2, 9, 30, 11, 0)).size() == 2 && s.within(r(2, 12, 0, 15, 0)).isEmpty(), "within lists the bookings that touch the window, in order");
    }

    private static void recurrenceExpansion() {
        TimeRange first = r(2, 10, 0, 11, 0);   // Monday
        List<TimeRange> daily = Recurrence.daily(3).expand(first);
        check(daily.size() == 3 && daily.get(2).equals(r(4, 10, 0, 11, 0)), "daily for three days");
        List<TimeRange> everyOther = new Recurrence(Frequency.DAILY, 2, Set.of(), 3).expand(first);
        check(everyOther.get(1).equals(r(4, 10, 0, 11, 0)) && everyOther.get(2).equals(r(6, 10, 0, 11, 0)), "every second day");
        List<TimeRange> mwf = Recurrence.weekly(1, 5, DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY).expand(first);
        check(mwf.size() == 5 && mwf.get(1).equals(r(4, 10, 0, 11, 0)) && mwf.get(3).equals(r(9, 10, 0, 11, 0)) && mwf.get(4).equals(r(11, 10, 0, 11, 0)), "Monday, Wednesday and Friday for five meetings");
        List<TimeRange> biweekly = Recurrence.weekly(2, 3, DayOfWeek.FRIDAY).expand(first);
        check(biweekly.get(0).equals(r(6, 10, 0, 11, 0)) && biweekly.get(1).equals(r(20, 10, 0, 11, 0)) && biweekly.get(2).start() == Times.at(2026, 4, 3, 10, 0), "every second week on Friday");
        List<TimeRange> sameDay = Recurrence.weekly(1, 3).expand(r(4, 9, 0, 9, 30));
        check(sameDay.get(0).equals(r(4, 9, 0, 9, 30)) && sameDay.get(1).equals(r(11, 9, 0, 9, 30)) && sameDay.get(2).equals(r(18, 9, 0, 9, 30)), "weekly with no day named repeats on the first meeting's weekday");
        List<TimeRange> midweek = Recurrence.weekly(1, 3, DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY).expand(r(4, 10, 0, 11, 0));
        check(midweek.get(0).equals(r(4, 10, 0, 11, 0)) && midweek.get(1).equals(r(9, 10, 0, 11, 0)) && midweek.get(2).equals(r(11, 10, 0, 11, 0)), "a series that starts on Wednesday does not include the Monday before it");
    }

    private static void recurrenceValidation() {
        boolean zero = false;
        boolean many = false;
        try {
            Recurrence.daily(0);
        } catch (IllegalArgumentException e) {
            zero = true;
        }
        try {
            Recurrence.daily(53);
        } catch (IllegalArgumentException e) {
            many = true;
        }
        check(zero && many, "a series has between 1 and 52 meetings");
        check(Recurrence.daily(52).expand(r(2, 9, 0, 10, 0)).size() == 52, "52 is allowed");
    }

    private static void shapeRules() {
        MeetingService s = service();
        check(s.book("u", "zz", "t", 2, r(2, 9, 0, 10, 0), null).code() == MeetingCode.UNKNOWN_ROOM, "unknown room");
        check(s.book("u", "r1", "t", 5, r(2, 9, 0, 10, 0), null).code() == MeetingCode.CAPACITY, "more people than seats");
        check(s.book("u", "r1", "t", 4, r(2, 9, 10, 10, 0), null).code() == MeetingCode.BAD_TIME, "start not on a quarter hour");
        check(s.book("u", "r1", "t", 4, r(2, 9, 0, 14, 0), null).code() == MeetingCode.TOO_LONG, "longer than 4 hours");
        check(s.book("u", "r1", "t", 4, r(2, 9, 0, 13, 0), null).ok(), "exactly 4 hours is allowed");
        check(s.book("u2", "r1", "t", 4, r(2, 7, 45, 8, 15), null).code() == MeetingCode.OUTSIDE_HOURS && s.book("u2", "r1", "t", 4, r(2, 19, 30, 20, 30), null).code() == MeetingCode.OUTSIDE_HOURS, "before 8:00 or after 20:00");
        check(s.book("u2", "r1", "t", 4, r(2, 19, 0, 20, 0), null).ok() && s.book("u3", "r1", "t", 4, r(3, 8, 0, 8, 15), null).ok(), "working hours are inclusive at the edges");
        check(s.book("u4", "r1", "t", 4, new TimeRange(Times.at(2026, 3, 3, 23, 0), Times.at(2026, 3, 4, 1, 0)), null).code() == MeetingCode.OUTSIDE_HOURS, "a meeting across midnight is outside hours");
        ManualClock late = new ManualClock(Times.at(2026, 3, 2, 12, 0));
        MeetingService t = new MeetingService(late);
        t.addRoom(new Room("r1", "Lotus", 4, Set.of()));
        check(t.book("u", "r1", "t", 2, r(2, 11, 0, 11, 30), null).code() == MeetingCode.IN_THE_PAST && t.book("u", "r1", "t", 2, r(2, 12, 0, 12, 30), null).ok(), "a meeting that already started is in the past, one starting now is fine");
    }

    private static void conflictsAndBackToBack() {
        MeetingService s = service();
        s.book("a", "r1", "one", 2, r(2, 9, 0, 10, 0), null);
        check(s.book("b", "r1", "two", 2, r(2, 9, 30, 10, 30), null).code() == MeetingCode.ROOM_CONFLICT, "overlapping the end of a meeting");
        check(s.book("b", "r1", "two", 2, r(2, 8, 30, 9, 15), null).code() == MeetingCode.ROOM_CONFLICT, "overlapping the start");
        check(s.book("b", "r1", "two", 2, r(2, 9, 15, 9, 45), null).code() == MeetingCode.ROOM_CONFLICT, "inside it");
        check(s.book("b", "r1", "two", 2, r(2, 8, 0, 12, 0), null).code() == MeetingCode.ROOM_CONFLICT, "around it");
        check(s.book("b", "r1", "two", 2, r(2, 10, 0, 11, 0), null).ok() && s.book("c", "r1", "three", 2, r(2, 8, 0, 9, 0), null).ok(), "back to back before and after is fine");
        check(s.book("d", "r2", "four", 2, r(2, 9, 0, 10, 0), null).ok(), "the same time in another room is fine");
        MeetingResult clash = s.book("e", "r1", "five", 2, r(2, 9, 30, 10, 30), null);
        check(clash.conflicts().equals(List.of(r(2, 9, 30, 10, 30))), "a refusal says which requested range clashed");
    }

    private static void organizerCannotBeInTwoPlaces() {
        MeetingService s = service();
        s.book("asha", "r1", "one", 2, r(2, 9, 0, 10, 0), null);
        check(s.book("asha", "r2", "two", 2, r(2, 9, 30, 10, 30), null).code() == MeetingCode.ORGANIZER_CONFLICT, "the same person in two rooms at once");
        check(s.scheduledIn("room:r2") == 0, "and the other room was not touched");
        check(s.book("asha", "r2", "two", 2, r(2, 10, 0, 11, 0), null).ok(), "one meeting after the other is fine");
        check(s.agenda("user:asha", r(2, 8, 0, 18, 0)).size() == 2, "the person's agenda lists both");
        check(s.agenda("room:r1", r(2, 8, 0, 18, 0)).size() == 1, "and the room's agenda lists its own");
    }

    private static void seriesAreAllOrNothing() {
        MeetingService s = service();
        s.book("x", "r2", "blocker", 2, r(6, 10, 30, 11, 30), null);   // Friday
        MeetingResult series = s.book("dev", "r2", "planning", 4, r(2, 10, 0, 11, 0), Recurrence.weekly(1, 6, DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY));
        check(series.code() == MeetingCode.ROOM_CONFLICT && series.conflicts().equals(List.of(r(6, 10, 0, 11, 0))), "a series with one clashing occurrence is refused and names it");
        check(s.scheduledIn("room:r2") == 1 && s.scheduledIn("user:dev") == 0, "and none of its other occurrences were booked");
        MeetingResult ok = s.book("dev", "r2", "planning", 4, r(2, 8, 0, 9, 0), Recurrence.weekly(1, 6, DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY));
        check(ok.ok() && ok.booking().ranges.size() == 6 && s.scheduledIn("room:r2") == 7, "a series that fits books all six");
        ManualClock clock = new ManualClock(Times.at(2026, 3, 2, 12, 0));
        MeetingService t = new MeetingService(clock);
        t.addRoom(new Room("r1", "Lotus", 4, Set.of()));
        check(t.book("u", "r1", "x", 2, r(2, 9, 0, 10, 0), Recurrence.daily(3)).code() == MeetingCode.IN_THE_PAST, "an occurrence in the past refuses the whole series");
    }

    private static void cancelling() {
        MeetingService s = service();
        MeetingResult b = s.book("dev", "r2", "planning", 4, r(2, 10, 0, 11, 0), Recurrence.daily(4));
        check(s.cancelOccurrence("dev", b.booking().id, 1).ok() && b.booking().activeCount() == 3, "one occurrence of a series is cancelled");
        check(s.book("eva", "r2", "taken over", 2, r(3, 10, 0, 11, 0), null).ok(), "its time is free for others");
        check(s.cancelOccurrence("dev", b.booking().id, 1).code() == MeetingCode.WRONG_STATE, "cancelling it twice is refused");
        check(s.cancelOccurrence("dev", b.booking().id, 9).code() == MeetingCode.NOT_FOUND && s.cancelOccurrence("dev", "B99", 0).code() == MeetingCode.NOT_FOUND, "an unknown occurrence or booking");
        check(s.cancelOccurrence("mallory", b.booking().id, 0).code() == MeetingCode.NOT_ORGANIZER && s.cancelSeries("mallory", b.booking().id).code() == MeetingCode.NOT_ORGANIZER, "only the organizer can cancel");
        check(s.cancelSeries("dev", b.booking().id).ok() && s.scheduledIn("room:r2") == 1 && s.scheduledIn("user:dev") == 0, "cancelling the series removes the remaining occurrences from both schedules");
        check(s.cancelSeries("dev", b.booking().id).code() == MeetingCode.WRONG_STATE, "a series is cancelled once");
        check(s.book("dev", "r2", "again", 2, r(2, 10, 0, 11, 0), null).ok(), "the person and the room are free again");
    }

    private static void moving() {
        MeetingService s = service();
        MeetingResult a = s.book("asha", "r1", "one", 2, r(2, 9, 0, 10, 0), null);
        s.book("ben", "r1", "two", 2, r(2, 11, 0, 12, 0), null);
        s.book("asha", "r2", "other", 2, r(2, 14, 0, 15, 0), null);
        check(s.move("asha", a.booking().id, r(2, 13, 0, 14, 0)).ok() && s.findRooms(RoomQuery.of(1), r(2, 9, 0, 10, 0)).size() == 3, "moving frees the old time");
        MeetingResult clashRoom = s.move("asha", a.booking().id, r(2, 11, 30, 12, 30));
        check(clashRoom.code() == MeetingCode.ROOM_CONFLICT && s.booking(a.booking().id).ranges.get(0).equals(r(2, 13, 0, 14, 0)), "a move onto another meeting is refused and the meeting stays where it was");
        check(s.agenda("room:r1", r(2, 8, 0, 18, 0)).size() == 2, "so the room still holds both meetings");
        check(s.move("asha", a.booking().id, r(2, 14, 0, 15, 0)).code() != MeetingCode.OK, "a move onto the organizer's other meeting is refused too");
        check(s.move("asha", a.booking().id, r(2, 13, 10, 14, 0)).code() == MeetingCode.BAD_TIME && s.move("ben", a.booking().id, r(2, 16, 0, 17, 0)).code() == MeetingCode.NOT_ORGANIZER, "the same shape and owner rules apply");
        MeetingResult series = s.book("dev", "r3", "series", 2, r(2, 16, 0, 17, 0), Recurrence.daily(2));
        check(s.move("dev", series.booking().id, r(2, 17, 0, 18, 0)).code() == MeetingCode.WRONG_STATE, "a series cannot be moved as one meeting");
    }

    private static List<String> names(List<Room> rooms) {
        List<String> out = new ArrayList<>();
        for (Room room : rooms) out.add(room.name());
        return out;
    }

    private static void findingRooms() {
        MeetingService s = service();
        TimeRange nine = r(2, 9, 0, 10, 0);
        check(names(s.findRooms(RoomQuery.of(2), nine)).equals(List.of("Lotus", "Banyan", "Peepal")), "smallest room that fits comes first");
        check(names(s.findRooms(RoomQuery.of(5), nine)).equals(List.of("Banyan", "Peepal")), "rooms that are too small are left out");
        check(names(s.findRooms(RoomQuery.of(2, "video"), nine)).equals(List.of("Banyan", "Peepal")) && names(s.findRooms(RoomQuery.of(2, "video", "whiteboard"), nine)).equals(List.of("Peepal")), "equipment must all be there");
        s.book("a", "r2", "x", 3, r(2, 9, 30, 10, 30), null);
        check(names(s.findRooms(RoomQuery.of(2), nine)).equals(List.of("Lotus", "Peepal")), "a room busy for part of the range is left out");
        check(s.findRooms(RoomQuery.of(30), nine).isEmpty(), "nothing fits 30 people");
        check(s.firstAvailable(RoomQuery.of(6), Times.at(2026, 3, 2, 9, 0), 60).startsWith("Peepal at"), "the first room that fits at the wanted time");
        s.book("b", "r3", "y", 10, r(2, 9, 0, 10, 0), null);
        check(s.firstAvailable(RoomQuery.of(6), Times.at(2026, 3, 2, 9, 0), 60).equals("Peepal at " + Times.text(Times.at(2026, 3, 2, 10, 0))), "with both rooms busy at 9:00, the search moves on in quarter hours to the first fit");
    }

    private static void freeSlots() {
        MeetingService s = service();
        s.book("a", "r1", "x", 2, r(2, 9, 0, 10, 0), null);
        s.book("b", "r1", "y", 2, r(2, 13, 0, 14, 30), null);
        List<TimeRange> slots = s.freeSlots("r1", LocalDate.of(2026, 3, 2), 60);
        check(slots.equals(List.of(r(2, 8, 0, 9, 0), r(2, 10, 0, 13, 0), r(2, 14, 30, 20, 0))), "free stretches inside working hours");
        check(s.freeSlots("r1", LocalDate.of(2026, 3, 2), 90).size() == 2, "only gaps of the length that is needed");
        check(s.freeSlots("r1", LocalDate.of(2026, 3, 3), 60).equals(List.of(r(3, 8, 0, 20, 0))), "an empty day is one stretch");
        ManualClock clock = new ManualClock(Times.at(2026, 3, 2, 12, 10));
        MeetingService late = new MeetingService(clock);
        late.addRoom(new Room("r1", "Lotus", 4, Set.of()));
        check(late.freeSlots("r1", LocalDate.of(2026, 3, 2), 30).equals(List.of(r(2, 12, 15, 20, 0))), "slots in the past are not offered, and the start rounds up to a quarter hour");
        check(late.freeSlots("r1", LocalDate.of(2026, 3, 1), 30).isEmpty(), "yesterday has nothing");
    }

    private static void oneSlotManyThreads() throws InterruptedException {
        MeetingService s = service();
        AtomicInteger winners = new AtomicInteger();
        Thread[] threads = new Thread[40];
        for (int i = 0; i < threads.length; i++) {
            final String user = "u" + i;
            threads[i] = new Thread(() -> {
                if (s.book(user, "r1", "t", 2, r(2, 9, 0, 10, 0), null).ok()) winners.incrementAndGet();
            });
        }
        for (Thread t : threads) t.start();
        for (Thread t : threads) t.join();
        check(winners.get() == 1 && s.scheduledIn("room:r1") == 1, "40 people booking the same room and time: exactly one wins");
    }

    private static void mixedWorkloadKeepsSchedulesConsistent() throws InterruptedException {
        MeetingService s = service();
        String[] users = {"a", "b", "c", "z"};
        String[] roomIds = {"r1", "r2", "r3"};
        Thread[] threads = new Thread[10];
        for (int i = 0; i < threads.length; i++) {
            final int seed = i;
            threads[i] = new Thread(() -> {
                Random random = new Random(seed);
                for (int k = 0; k < 150; k++) {
                    String user = users[random.nextInt(users.length)];
                    String room = roomIds[random.nextInt(roomIds.length)];
                    int day = 2 + random.nextInt(3);
                    int hour = 8 + random.nextInt(11);
                    MeetingResult res = s.book(user, room, "t", 2, r(day, hour, 0, hour + 1, 0), random.nextInt(4) == 0 ? Recurrence.daily(1 + random.nextInt(3)) : null);
                    if (res.ok() && random.nextInt(3) == 0) s.cancelSeries(user, res.booking().id);
                }
            });
        }
        for (Thread t : threads) t.start();
        boolean finished = true;
        for (Thread t : threads) {
            t.join(30_000);
            finished &= !t.isAlive();
        }
        check(finished, "10 threads booking and cancelling across rooms and people finish: the two locks are always taken in the same order");
        int roomTotal = 0;
        int personTotal = 0;
        boolean overlapping = false;
        TimeRange all = new TimeRange(Times.at(2026, 3, 1, 0, 0), Times.at(2026, 3, 10, 0, 0));
        for (String room : roomIds) {
            List<Occurrence> list = s.agenda("room:" + room, all);
            roomTotal += list.size();
            for (int i = 1; i < list.size(); i++) overlapping |= list.get(i - 1).range().overlaps(list.get(i).range());
        }
        for (String user : users) {
            List<Occurrence> list = s.agenda("user:" + user, all);
            personTotal += list.size();
            for (int i = 1; i < list.size(); i++) overlapping |= list.get(i - 1).range().overlaps(list.get(i).range());
        }
        check(!overlapping, "no room and no person has two overlapping meetings");
        check(roomTotal == personTotal && roomTotal > 0, "every occurrence is in a room schedule and a person schedule, both or neither");
    }
}
`,
      },
    ],
    expectedOutput: [
      "Asha books Lotus 9 to 10: OK",
      "Ben books the same room 9:30 to 10:30: ROOM_CONFLICT",
      "Ben books it back to back 10 to 11: OK",
      "Asha books another room at 9:30 (she is in a meeting): ORGANIZER_CONFLICT",
      "Too many people for Lotus: CAPACITY",
      "Not on a quarter hour: BAD_TIME, too long: TOO_LONG, night: OUTSIDE_HOURS",
      "Dev books a series on Mon Wed Fri, 6 times: OK, first 2026-03-02 10:00 to 11:00, last 2026-03-13 10:00 to 11:00",
      "Eva asks for 3 days from Wednesday 10:30: ROOM_CONFLICT, clashing: [2026-03-04 10:30 to 11:30, 2026-03-06 10:30 to 11:30]",
      "Eva's series left nothing behind: 0 entries",
      "Dev cancels the Wednesday meeting only: OK, active 5 of 6",
      "Eva can take that Wednesday now: OK",
      "Ben cancels Dev's series: NOT_ORGANIZER",
      "Rooms for 5 people with video, 9 to 10 on Monday: [Banyan, Peepal]",
      "Rooms for 3 people, 10 to 11 on Monday: [Peepal]",
      "Free 60 minute slots in Lotus on Monday: [2026-03-02 08:00 to 09:00, 2026-03-02 11:00 to 20:00]",
      "First room for 6 people with whiteboard, 1 hour from 9: Peepal at 2026-03-02 09:00",
      "Asha moves her standup to 13:00: OK, room at 9 is free again: 3 rooms",
      "Move onto Ben's 10 o'clock meeting: ROOM_CONFLICT",
      "In the past: IN_THE_PAST",
    ],
  },
};
