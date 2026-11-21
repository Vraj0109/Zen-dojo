import { callList, designProblem, rng, seq } from "./design";
import type { ProblemSpec } from "./types";

// "Design a class" problems, part 2: snapshots, calendars, a random set and a small Twitter. See problems-design-a.ts for
// how a test is written. The expected answers below were checked by running the C++ reference.

const between = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));

const CALLS = "Each test gives the operations in order (the class name first, then method names) and their arguments; the expected answer has one entry per operation, with null for the constructor and for methods that return nothing.";

/** Random bookings [start, end) inside 0..limit, each at most maxLen long. */
function bookings(seed: number, className: string, n: number, limit: number, maxLen: number) {
  const r = rng(seed);
  const ops: string[] = [className];
  const args: unknown[][] = [[]];
  for (let i = 0; i < n; i++) {
    const start = between(r, 0, limit - maxLen - 1);
    ops.push("book");
    args.push([start, start + between(r, 1, maxLen)]);
  }
  return callList(ops, args);
}

export const DESIGN_SPECS_B: ProblemSpec[] = [
  designProblem({
    id: "lc-1146",
    title: "Snapshot Array",
    statement: [
      "Design an array of integers, all 0 at the start, that can take snapshots.",
      "set(index, val) changes one element. snap() takes a snapshot of the whole array and returns its id; the first snapshot has id 0, the next 1, and so on. get(index, snap_id) returns the value that element had when snapshot snap_id was taken.",
      "Copying the whole array on every snap is too slow and too big. Only store what changed.",
      CALLS,
    ],
    constraints: ["1 <= length <= 50000", "0 <= index < length", "0 <= val <= 1000000000", "0 <= snap_id < the number of snap calls so far", "At most 100000 calls in total"],
    design: {
      className: "SnapshotArray",
      ctor: [{ name: "length", type: "int" }],
      methods: [
        { name: "set", params: [{ name: "index", type: "int" }, { name: "val", type: "int" }], returns: "void" },
        { name: "snap", params: [], returns: "int" },
        { name: "get", params: [{ name: "index", type: "int" }, { name: "snap_id", type: "int" }], returns: "int" },
      ],
    },
    examples: [
      { ...seq("SnapshotArray(3) set(0,5) snap() set(0,6) get(0,0)", [null, null, 0, null, 5]), explanation: "The snapshot with id 0 was taken while element 0 was 5. The later set(0,6) does not change it." },
    ],
    tests: [
      seq("SnapshotArray(1) snap() get(0,0) set(0,7) get(0,0) snap() get(0,1)", [null, 0, 0, null, 0, 1, 7]),
      seq("SnapshotArray(2) set(0,1) set(1,2) snap() set(0,3) snap() get(0,0) get(1,0) get(0,1) get(1,1)", [null, null, null, 0, null, 1, 1, 2, 3, 2]),
      seq("SnapshotArray(3) snap() snap() set(2,9) snap() get(2,0) get(2,1) get(2,2)", [null, 0, 1, null, 2, 0, 0, 9]),
      seq("SnapshotArray(2) set(0,4) set(0,5) set(0,6) snap() get(0,0) set(0,7) snap() get(0,0) get(0,1)", [null, null, null, null, 0, 6, null, 1, 6, 7]),
      seq("SnapshotArray(4) set(3,1) snap() set(3,2) snap() set(3,3) snap() get(3,0) get(3,1) get(3,2) get(2,2)", [null, null, 0, null, 1, null, 2, 1, 2, 3, 0]),
      seq("SnapshotArray(5) snap() get(4,0) get(0,0)", [null, 0, 0, 0]),
    ],
    hints: [
      "Copying the whole array on every snapshot wastes space. What if you only recorded the moments when something changed?",
      "Most elements do not change between snapshots, so each index can keep its own history of changes.",
      "For each index, keep a list of snapshot id and value pairs, then binary search that list for the last entry at or before the requested snapshot.",
      "Start every list with an entry for snapshot 0 so every index has a value. If an index is set twice within one snapshot, overwrite the last entry.",
    ],
    solution: {
      idea: [
        "Keep a counter of snapshots taken so far. For every index keep a list of (snap id, value) pairs, starting with (0, 0).",
        "set writes at the current snap id: if the last pair of that index already has this id, overwrite its value, otherwise append a new pair. snap returns the counter and adds one to it.",
        "get binary searches the index's list for the last pair with an id at most snap_id and returns its value.",
      ],
      complexity: "set O(1), snap O(1), get O(log k) where k is the number of changes of that index.",
      cpp: `class SnapshotArray {
    vector<vector<pair<int, int>>> history;  // per index: (snap id, value), by snap id
    int snaps = 0;

public:
    SnapshotArray(int length) : history(length, vector<pair<int, int>>{{0, 0}}) {}

    void set(int index, int val) {
        auto& h = history[index];
        if (h.back().first == snaps) h.back().second = val;
        else h.push_back({snaps, val});
    }

    int snap() { return snaps++; }

    int get(int index, int snap_id) {
        auto& h = history[index];
        int lo = 0, hi = h.size();  // first entry with an id after snap_id
        while (lo < hi) {
            int mid = (lo + hi) / 2;
            if (h[mid].first <= snap_id) lo = mid + 1;
            else hi = mid;
        }
        return h[lo - 1].second;
    }
};
`,
    },
    stress: [
      {
        label: "50000 elements, 100000 sets, snaps and gets",
        make: () => {
          const r = rng(1146);
          const ops: string[] = ["SnapshotArray"];
          const args: unknown[][] = [[50000]];
          let snaps = 0;
          for (let i = 0; i < 99999; i++) {
            const x = r();
            if (x < 0.45) { ops.push("set"); args.push([between(r, 0, 49999), between(r, 0, 1000000000)]); }
            else if (x < 0.55 || snaps === 0) { ops.push("snap"); args.push([]); snaps++; }
            else { ops.push("get"); args.push([between(r, 0, 49999), between(r, 0, snaps - 1)]); }
          }
          return callList(ops, args);
        },
      },
    ],
  }),

  designProblem({
    id: "lc-729",
    title: "My Calendar I",
    statement: [
      "Design a calendar that accepts a booking only if it does not overlap one it already has.",
      "book(startTime, endTime) tries to add the time range from startTime up to, but not including, endTime. If it overlaps an earlier accepted booking, return false and do not add it; otherwise add it and return true. Two ranges overlap when some moment belongs to both, so a booking that ends at 20 does not overlap one that starts at 20.",
      CALLS,
    ],
    constraints: ["0 <= startTime < endTime <= 1000000000", "At most 100000 calls to book"],
    design: {
      className: "MyCalendar",
      ctor: [],
      methods: [{ name: "book", params: [{ name: "startTime", type: "int" }, { name: "endTime", type: "int" }], returns: "bool" }],
    },
    examples: [
      { ...seq("MyCalendar() book(10,20) book(15,25) book(20,30)", [null, true, false, true]), explanation: "15 to 25 overlaps 10 to 20 (the moments 15 to 19), so it is refused. 20 to 30 only touches the end of 10 to 20, so it fits." },
    ],
    tests: [
      seq("MyCalendar() book(5,10) book(0,5) book(10,15) book(4,6) book(9,11) book(0,15) book(15,20)", [null, true, true, true, false, false, false, true]),
      seq("MyCalendar() book(47,50) book(33,41) book(39,45) book(33,42) book(25,32) book(26,35) book(19,25) book(3,8) book(8,13) book(18,27)", [null, true, true, false, false, true, false, true, true, true, false]),
      seq("MyCalendar() book(0,1) book(1,2) book(2,3) book(0,3) book(0,1)", [null, true, true, true, false, false]),
      seq("MyCalendar() book(10,20) book(5,10) book(20,25) book(12,14) book(1,100) book(21,22)", [null, true, true, true, false, false, false]),
      seq("MyCalendar() book(100,200) book(0,50) book(50,100) book(200,300) book(75,125) book(0,300)", [null, true, true, true, true, false, false]),
      seq("MyCalendar() book(0,1000000000) book(0,1) book(999999999,1000000000)", [null, true, false, false]),
    ],
    hints: [
      "A new booking can only clash with bookings close to its start time. How could you find those neighbours quickly?",
      "If the bookings are kept sorted by start time, the only ones that can clash are the booking just before and the booking just after the new start.",
      "Keep bookings in an ordered map from start to end. Find the first start at or after the new start, and check it and its predecessor for overlap.",
      "Touching is not overlapping. A booking ending at 20 and one starting at 20 are fine, so use strict comparisons.",
    ],
    solution: {
      idea: [
        "Keep accepted bookings in an ordered map from start to end. They never overlap, so they are also sorted by end.",
        "For a new range [s, e): look at the first booking that starts at s or later. If it starts before e, there is an overlap. Then look at the booking just before it; if it ends after s, there is an overlap. Otherwise insert the new range.",
      ],
      complexity: "O(log n) per call, O(n) space.",
      cpp: `class MyCalendar {
    map<int, int> booked;  // start -> end

public:
    MyCalendar() {}

    bool book(int startTime, int endTime) {
        auto next = booked.lower_bound(startTime);  // first booking starting at or after startTime
        if (next != booked.end() && next->first < endTime) return false;
        if (next != booked.begin() && prev(next)->second > startTime) return false;
        booked[startTime] = endTime;
        return true;
    }
};
`,
    },
    stress: [{ label: "100000 short bookings in a wide range", make: () => bookings(729, "MyCalendar", 100000, 1000000000, 50000) }],
  }),

  designProblem({
    id: "lc-731",
    title: "My Calendar II",
    statement: [
      "Design a calendar that allows double bookings but never a triple booking.",
      "book(startTime, endTime) tries to add the range from startTime up to, but not including, endTime. A triple booking happens when three accepted ranges share some moment. If adding the range would cause one, return false and do not add it; otherwise add it and return true.",
      CALLS,
    ],
    constraints: ["0 <= startTime < endTime <= 1000000000", "At most 1000 calls to book"],
    design: {
      className: "MyCalendarTwo",
      ctor: [],
      methods: [{ name: "book", params: [{ name: "startTime", type: "int" }, { name: "endTime", type: "int" }], returns: "bool" }],
    },
    examples: [
      { ...seq("MyCalendarTwo() book(10,20) book(50,60) book(10,40) book(5,15) book(5,10) book(25,55)", [null, true, true, true, false, true, true]), explanation: "5 to 15 would share the moments 10 to 14 with both 10 to 20 and 10 to 40, a triple booking. 5 to 10 touches nothing. 25 to 55 shares at most two bookings at any moment." },
    ],
    tests: [
      seq("MyCalendarTwo() book(1,5) book(1,5) book(1,5) book(5,10) book(4,6)", [null, true, true, false, true, false]),
      seq("MyCalendarTwo() book(0,10) book(5,15) book(10,20) book(5,10) book(12,18) book(15,17)", [null, true, true, true, false, false, true]),
      seq("MyCalendarTwo() book(10,20) book(30,40) book(15,35) book(0,50)", [null, true, true, true, false]),
      seq("MyCalendarTwo() book(1,2) book(2,3) book(1,3) book(1,3) book(0,1)", [null, true, true, true, false, true]),
      seq("MyCalendarTwo() book(0,5) book(0,5) book(5,10) book(5,10) book(3,7) book(10,20) book(8,12)", [null, true, true, true, true, false, true, false]),
      seq("MyCalendarTwo() book(1,3) book(2,4) book(3,5) book(2,3) book(4,6)", [null, true, true, true, false, true]),
    ],
    hints: [
      "Allowing double bookings means you need to know where two bookings already overlap. What would you store for those places?",
      "A new booking becomes a triple booking only if it touches a spot where two bookings already overlap, so keep those spots separately.",
      "Keep a list of all bookings and a list of double-booked ranges. Reject a booking that hits any double range; otherwise add each overlap with an existing booking to the double list.",
      "Ranges are half-open, so a booking that only touches the end of a double range does not clash with it.",
    ],
    solution: {
      idea: [
        "Keep all accepted bookings and a list of double-booked ranges (the overlaps of pairs of bookings).",
        "To book [s, e): if it overlaps any double-booked range, return false. Otherwise, for every earlier booking add the overlap with [s, e) (if there is one) to the double-booked list, add [s, e) to the bookings and return true.",
      ],
      complexity: "O(n) per call, O(n^2) space in the worst case.",
      cpp: `class MyCalendarTwo {
    vector<pair<int, int>> all;       // every accepted booking
    vector<pair<int, int>> doubles;   // ranges that two bookings share

public:
    MyCalendarTwo() {}

    bool book(int startTime, int endTime) {
        for (auto& d : doubles)
            if (startTime < d.second && endTime > d.first) return false;
        for (auto& b : all) {
            int s = max(startTime, b.first), e = min(endTime, b.second);
            if (s < e) doubles.push_back({s, e});
        }
        all.push_back({startTime, endTime});
        return true;
    }
};
`,
    },
    stress: [{ label: "1000 bookings that often overlap", make: () => bookings(731, "MyCalendarTwo", 1000, 100000, 3000) }],
  }),

  designProblem({
    id: "lc-732",
    title: "My Calendar III",
    statement: [
      "Design a calendar that tells you how crowded it gets.",
      "book(startTime, endTime) adds the range from startTime up to, but not including, endTime, always accepted. It returns the largest k such that some moment is covered by k of the ranges booked so far (the biggest overlap).",
      CALLS,
    ],
    constraints: ["0 <= startTime < endTime <= 1000000000", "At most 400 calls to book"],
    design: {
      className: "MyCalendarThree",
      ctor: [],
      methods: [{ name: "book", params: [{ name: "startTime", type: "int" }, { name: "endTime", type: "int" }], returns: "int" }],
    },
    examples: [
      { ...seq("MyCalendarThree() book(10,20) book(50,60) book(10,40) book(5,15) book(5,10) book(25,55)", [null, 1, 1, 2, 3, 3, 3]), explanation: "After the fourth booking the moments 10 to 14 are covered by 5 to 15, 10 to 20 and 10 to 40: three bookings." },
    ],
    tests: [
      seq("MyCalendarThree() book(1,2) book(1,2) book(1,2) book(2,3)", [null, 1, 2, 3, 3]),
      seq("MyCalendarThree() book(0,10) book(10,20) book(20,30) book(5,25)", [null, 1, 1, 1, 2]),
      seq("MyCalendarThree() book(1,100) book(2,99) book(3,98) book(4,97) book(50,51)", [null, 1, 2, 3, 4, 5]),
      seq("MyCalendarThree() book(5,6) book(1,10) book(1,3) book(8,10) book(2,9)", [null, 1, 2, 2, 2, 3]),
      seq("MyCalendarThree() book(0,1000000000) book(0,1) book(999999999,1000000000) book(500,600)", [null, 1, 2, 2, 2]),
      seq("MyCalendarThree() book(10,20) book(20,30) book(30,40) book(10,40) book(15,35) book(25,26)", [null, 1, 1, 1, 2, 3, 4]),
    ],
    hints: [
      "You do not need to track every moment on the timeline. Which points actually change the number of active bookings?",
      "The count only changes at the start and end of each booking, so you only need to track those boundary points.",
      "Store plus one at each start and minus one at each end in an ordered map. Then walk the points in order, keeping a running total and its maximum.",
      "Store the net change at each time point, so a booking ending where another starts cancels out instead of being counted twice.",
    ],
    solution: {
      idea: [
        "Keep an ordered map from a coordinate to a change: +1 where a booking starts, -1 where one ends (the end is not covered).",
        "After each booking, walk the map in order keeping a running total. The largest total seen is the most bookings that share a moment, and it is the answer.",
      ],
      complexity: "O(n) per call with the map; O(log n) with a dynamic segment tree.",
      cpp: `class MyCalendarThree {
    map<int, int> change;  // coordinate -> +1 for a start, -1 for an end

public:
    MyCalendarThree() {}

    int book(int startTime, int endTime) {
        change[startTime]++;
        change[endTime]--;
        int running = 0, best = 0;
        for (auto& c : change) {
            running += c.second;
            best = max(best, running);
        }
        return best;
    }
};
`,
    },
    stress: [{ label: "400 bookings that often overlap", make: () => bookings(732, "MyCalendarThree", 400, 1000000000, 600000000) }],
  }),

  designProblem({
    id: "lc-380",
    title: "Insert Delete GetRandom O(1)",
    statement: [
      "Design a set of integers where insert, remove and getRandom each run in O(1) on average.",
      "insert(val) adds val and returns true, or returns false if it is already there. remove(val) removes it and returns true, or returns false if it is not there. getRandom() returns one of the current elements, each with the same probability.",
      "The judge cannot check a probability, so in every test getRandom is called only while the set holds exactly one element, which makes the answer fixed. Write it as if the choice were random: a solution that always returns the first element is not a correct design.",
      CALLS,
    ],
    constraints: ["-1000000000 <= val <= 1000000000", "getRandom is only called when the set has exactly one element", "At most 200000 calls in total"],
    design: {
      className: "RandomizedSet",
      ctor: [],
      methods: [
        { name: "insert", params: [{ name: "val", type: "int" }], returns: "bool" },
        { name: "remove", params: [{ name: "val", type: "int" }], returns: "bool" },
        { name: "getRandom", params: [], returns: "int" },
      ],
    },
    examples: [
      { ...seq("RandomizedSet() insert(1) remove(2) insert(2) remove(1) getRandom() insert(2) remove(2) insert(5) getRandom()", [null, true, false, true, true, 2, false, true, true, 5]), explanation: "remove(2) fails because 2 is not there yet. After remove(1) only 2 is left, so getRandom returns 2. insert(2) fails (already there). After remove(2) and insert(5), the only element is 5." },
    ],
    tests: [
      seq("RandomizedSet() remove(1) insert(1) insert(1) remove(1) remove(1) insert(3) getRandom()", [null, false, true, false, true, false, true, 3]),
      seq("RandomizedSet() insert(-1) remove(-1) insert(-2) getRandom() remove(-2)", [null, true, true, true, -2, true]),
      seq("RandomizedSet() insert(0) insert(1) remove(0) getRandom() insert(0) remove(1) getRandom()", [null, true, true, true, 1, true, true, 0]),
      seq("RandomizedSet() insert(1) insert(2) insert(3) remove(2) remove(3) getRandom() remove(1) insert(9) getRandom()", [null, true, true, true, true, true, 1, true, true, 9]),
      seq("RandomizedSet() insert(1000000000) insert(-1000000000) remove(1000000000) getRandom() remove(-1000000000) remove(-1000000000)", [null, true, true, true, -1000000000, true, false]),
      seq("RandomizedSet() insert(4) remove(4) remove(4) insert(4) getRandom()", [null, true, true, false, true, 4]),
    ],
    hints: [
      "Picking a random element is easy from a list, and checking membership is easy from a table. Which part needs which structure?",
      "Keep the values in a list so any position can be picked at random, and keep a table that records where each value sits in the list.",
      "On removal, move the last list element into the freed slot, update its recorded position, then drop the last entry.",
      "If the value being removed is already the last element, just drop it. Swapping it with itself must not break the table.",
    ],
    solution: {
      idea: [
        "Store the values in a vector and a hash map from value to its position in the vector. insert appends and records the position. getRandom picks a random position of the vector.",
        "remove swaps the value with the last element of the vector (so nothing shifts), fixes the moved element's position in the map, then pops the last slot and erases the removed value from the map. Doing the map update for the moved element before erasing the removed value keeps the case where they are the same element correct.",
      ],
      complexity: "O(1) average per call, O(n) space.",
      cpp: `class RandomizedSet {
    vector<int> items;
    unordered_map<int, int> where;  // value -> position in items

public:
    RandomizedSet() {}

    bool insert(int val) {
        if (where.count(val)) return false;
        where[val] = items.size();
        items.push_back(val);
        return true;
    }

    bool remove(int val) {
        auto it = where.find(val);
        if (it == where.end()) return false;
        int last = items.back();
        items[it->second] = last;
        where[last] = it->second;
        items.pop_back();
        where.erase(val);
        return true;
    }

    int getRandom() { return items[rand() % items.size()]; }
};
`,
    },
    stress: [
      {
        label: "200000 inserts and removes, with getRandom on one-element sets",
        make: () => {
          const r = rng(380);
          const ops: string[] = ["RandomizedSet"];
          const args: unknown[][] = [[]];
          const present = new Set<number>();
          while (ops.length < 200000) {
            if (ops.length % 20000 === 0 && present.size > 0) {
              // Drain the set down to one element and ask for it.
              const keep = [...present][0];
              for (const v of [...present]) {
                if (v === keep) continue;
                ops.push("remove");
                args.push([v]);
                present.delete(v);
              }
              ops.push("getRandom");
              args.push([]);
              continue;
            }
            const v = between(r, 0, 30000);
            if (r() < 0.55) { ops.push("insert"); present.add(v); }
            else { ops.push("remove"); present.delete(v); }
            args.push([v]);
          }
          return callList(ops, args);
        },
      },
    ],
  }),

  designProblem({
    id: "lc-355",
    title: "Design Twitter",
    statement: [
      "Design a small Twitter: users post tweets, follow and unfollow each other, and read a news feed.",
      "postTweet(userId, tweetId) makes the user post a tweet with this id (ids are unique). getNewsFeed(userId) returns the ids of the 10 most recent tweets in the user's feed, newest first; the feed holds the user's own tweets and the tweets of everyone the user follows. If there are fewer than 10, return all of them. follow(followerId, followeeId) makes the follower follow the followee (nothing changes if they already do). unfollow(followerId, followeeId) stops it (nothing changes if they did not). A user always sees their own tweets.",
      CALLS,
    ],
    constraints: ["1 <= userId, followerId, followeeId <= 500", "followerId != followeeId", "0 <= tweetId <= 100000, all different", "At most 30000 calls in total"],
    design: {
      className: "Twitter",
      ctor: [],
      methods: [
        { name: "postTweet", params: [{ name: "userId", type: "int" }, { name: "tweetId", type: "int" }], returns: "void" },
        { name: "getNewsFeed", params: [{ name: "userId", type: "int" }], returns: "int[]" },
        { name: "follow", params: [{ name: "followerId", type: "int" }, { name: "followeeId", type: "int" }], returns: "void" },
        { name: "unfollow", params: [{ name: "followerId", type: "int" }, { name: "followeeId", type: "int" }], returns: "void" },
      ],
    },
    examples: [
      { ...seq("Twitter() postTweet(1,5) getNewsFeed(1) follow(1,2) postTweet(2,6) getNewsFeed(1) unfollow(1,2) getNewsFeed(1)", [null, null, [5], null, null, [6, 5], null, [5]]), explanation: "After user 1 follows user 2, tweet 6 shows up above tweet 5 because it is newer. After unfollow, only user 1's own tweet is left." },
    ],
    tests: [
      seq(
        "Twitter() " + Array.from({ length: 12 }, (_, i) => `postTweet(1,${i + 1})`).join(" ") + " getNewsFeed(1)",
        [null, ...Array.from({ length: 12 }, () => null), [12, 11, 10, 9, 8, 7, 6, 5, 4, 3]],
      ),
      seq("Twitter() postTweet(1,10) postTweet(2,20) postTweet(3,30) follow(1,2) follow(1,3) getNewsFeed(1) getNewsFeed(2) unfollow(1,2) getNewsFeed(1)", [null, null, null, null, null, null, [30, 20, 10], [20], null, [30, 10]]),
      seq("Twitter() getNewsFeed(5) follow(5,6) getNewsFeed(5) postTweet(6,1) getNewsFeed(5)", [null, [], null, [], null, [1]]),
      seq("Twitter() postTweet(1,1) postTweet(2,2) postTweet(1,3) follow(3,1) follow(3,2) getNewsFeed(3) follow(3,2) unfollow(3,1) getNewsFeed(3) unfollow(3,1) unfollow(3,9) getNewsFeed(3)", [null, null, null, null, null, null, [3, 2, 1], null, null, [2], null, null, [2]]),
      seq(
        "Twitter() " + Array.from({ length: 20 }, (_, i) => `postTweet(${(i % 5) + 1},${i + 1})`).join(" ") + " follow(6,1) follow(6,3) follow(6,5) getNewsFeed(6) unfollow(6,5) getNewsFeed(6)",
        [null, ...Array.from({ length: 20 }, () => null), null, null, null, [20, 18, 16, 15, 13, 11, 10, 8, 6, 5], null, [18, 16, 13, 11, 8, 6, 3, 1]],
      ),
      seq("Twitter() postTweet(1,100) follow(2,1) postTweet(2,200) follow(1,2) getNewsFeed(1) getNewsFeed(2) postTweet(1,300) getNewsFeed(2)", [null, null, null, null, null, [200, 100], [200, 100], null, [300, 200, 100]]),
    ],
    hints: [
      "A feed only shows ten tweets. Does a tweet that is not among its author's ten most recent ever matter?",
      "A tweet outside its author's newest ten can never reach the feed's top ten, so only the newest ten per person are candidates.",
      "Give each tweet a global increasing time, gather the newest ten from the user and from each person they follow, then merge them and keep the top ten.",
      "Store follows in a set so that repeated follow or unfollow calls do nothing when the link already exists or is missing.",
    ],
    solution: {
      idea: [
        "Give every tweet a time from a counter that goes up by one on each post. Store each user's tweets as a list of (time, id) and each user's followees as a set.",
        "To build a feed, take at most the last 10 tweets of the user and of each followee (older ones can never be among the 10 newest overall), sort them by time from newest to oldest and return the ids of the first 10. A heap that merges the users' lists does the same with less sorting.",
      ],
      complexity: "postTweet, follow, unfollow O(1); getNewsFeed O(f log f) where f is about 10 times the number of followees.",
      cpp: `class Twitter {
    int clock = 0;
    unordered_map<int, vector<pair<int, int>>> tweets;  // user -> (time, tweet id)
    unordered_map<int, unordered_set<int>> follows;

public:
    Twitter() {}

    void postTweet(int userId, int tweetId) { tweets[userId].push_back({clock++, tweetId}); }

    vector<int> getNewsFeed(int userId) {
        vector<pair<int, int>> pool;
        auto addLast10 = [&](int u) {
            auto it = tweets.find(u);
            if (it == tweets.end()) return;
            auto& v = it->second;
            for (int i = max(0, (int)v.size() - 10); i < (int)v.size(); i++) pool.push_back(v[i]);
        };
        addLast10(userId);
        for (int f : follows[userId]) addLast10(f);
        sort(pool.rbegin(), pool.rend());  // newest first
        vector<int> feed;
        for (int i = 0; i < (int)pool.size() && i < 10; i++) feed.push_back(pool[i].second);
        return feed;
    }

    void follow(int followerId, int followeeId) { follows[followerId].insert(followeeId); }

    void unfollow(int followerId, int followeeId) { follows[followerId].erase(followeeId); }
};
`,
    },
    stress: [
      {
        label: "30000 calls, 500 users who follow many others",
        make: () => {
          const r = rng(355);
          const ops: string[] = ["Twitter"];
          const args: unknown[][] = [[]];
          let tweet = 0;
          for (let i = 0; i < 29999; i++) {
            const x = r();
            if (x < 0.35) { ops.push("postTweet"); args.push([between(r, 1, 500), tweet++]); }
            else if (x < 0.65) { ops.push("getNewsFeed"); args.push([between(r, 1, 500)]); }
            else {
              const a = between(r, 1, 500);
              let b = between(r, 1, 500);
              if (b === a) b = (a % 500) + 1;
              ops.push(x < 0.95 ? "follow" : "unfollow");
              args.push([a, b]);
            }
          }
          return callList(ops, args);
        },
      },
    ],
  }),
];
