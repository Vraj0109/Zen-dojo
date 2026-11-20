---
id: c-kattis-speedlimit
pattern: cses-kattis
difficulty: easy
optimal: "O(n) time and O(1) space per test case"
reviewed: false
---

## Clarify first
- What does each test case represent? A log of driving segments:
  - An integer `n` (number of segments). If `n == -1`, it signals the end of input.
  - Followed by `n` lines, each containing speed `s` (in miles per hour) and cumulative total elapsed time `t` (in hours from the start of the trip).
- What should be computed? The total distance driven (in miles), formatted as `"X miles"`.
- What are the constraints? `1 <= n <= 10`, `1 <= s <= 90`, and `t` is strictly increasing up to 12 hours.

## Examples to say out loud
- Consider `n = 3` with pairs `(s, t)`:
  - `(20, 2)`: Time in segment = `2 - 0 = 2` hours. Distance = `20 * 2 = 40` miles.
  - `(30, 6)`: Time in segment = `6 - 2 = 4` hours. Distance = `30 * 4 = 120` miles.
  - `(10, 7)`: Time in segment = `7 - 6 = 1` hour. Distance = `10 * 1 = 10` miles.
  - Total distance = `40 + 120 + 10 = 170` miles. Output: `"170 miles"`.

## Brute force
A single pass iterating over the `n` segments and multiplying each speed by the time difference `t_current - t_previous` takes O(n) time. Since `n <= 10`, this is already minimal and optimal.

## The key observation
The given time values `t` are cumulative from the beginning of the trip, not durations of individual segments. By keeping track of the previous cumulative time `prev_t` (initially 0), the duration of each segment is `delta_t = t - prev_t`. The segment distance is `s * delta_t`.

## Optimal approach
1. While reading `n != -1`:
   - Initialize `total_dist = 0` and `prev_t = 0`.
   - Loop `n` times:
     - Read `s` and `t`.
     - `total_dist += s * (t - prev_t)`.
     - Update `prev_t = t`.
   - Print `total_dist << " miles"`.

Complexity:
- Time complexity: O(n) per test case, reading each segment once.
- Space complexity: O(1) auxiliary space.

## Code walkthrough
- `int total_dist = 0, prev_t = 0`: Running accumulators for distance and last timestamp.
- `for (int i = 0; i < n; i++)`: Processes each log entry.
- `int s, t; cin >> s >> t;`: Reads speed and cumulative time.
- `total_dist += s * (t - prev_t)`: Adds distance contributed by this segment.
- `prev_t = t`: Updates previous timestamp for next interval calculation.
- `cout << total_dist << " miles\n"`: Outputs formatted distance.

## Test it out loud
- `n = 3`, `[(20, 2), (30, 6), (10, 7)]`:
  - `i = 0`: `20 * (2 - 0) = 40`, `prev_t = 2`.
  - `i = 1`: `30 * (6 - 2) = 120`, `prev_t = 6`.
  - `i = 2`: `10 * (7 - 6) = 10`, `prev_t = 7`.
  - Sum is 170. Output: `"170 miles"`. Correct.
- Single segment `n = 1`, `(60, 3)`: `60 * 3 = 180 miles`. Correct.

## Follow-ups
- How to handle multiple trips in streaming real-time data? We can encapsulate the trip accumulator into a class or struct with an `add_point(s, t)` method and a `reset()` method triggered by session boundaries.

## Common mistakes
- Treating `t` as the duration of the current segment rather than cumulative elapsed time, computing `s * t` instead of `s * (t - prev_t)`.
- Forgetting the word `"miles"` in the output format.
- Not resetting `prev_t` to 0 between test cases.
