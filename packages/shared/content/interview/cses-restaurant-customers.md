---
id: cses-restaurant-customers
pattern: cses-sorting-and-searching
difficulty: medium
optimal: "O(n \log n) time and O(n) space"
reviewed: false
---

## Clarify first
- What does each interval represent? Customer $i$ arrives at time `arrival` and departs at time `departure`.
- Are arrival and departure times distinct? Yes, the problem constraints guarantee all arrival and departure times across all customers are unique.
- What should be returned? The maximum number of customers present in the restaurant simultaneously at any point in time.
- What are the constraints? $1 \le n \le 200000$ and $1 \le \text{arrival} < \text{departure} \le 10^9$.

## Examples to say out loud
- Consider `customers = [[5, 8], [2, 4], [3, 9]]`:
  - Customer 1: arrives 5, departs 8.
  - Customer 2: arrives 2, departs 4.
  - Customer 3: arrives 3, departs 9.
  - Chronological events:
    - Time 2: +1 (cust 2 arrives, count = 1, max = 1)
    - Time 3: +1 (cust 3 arrives, count = 2, max = 2)
    - Time 4: -1 (cust 2 departs, count = 1)
    - Time 5: +1 (cust 1 arrives, count = 2, max = 2)
    - Time 8: -1 (cust 1 departs, count = 1)
    - Time 9: -1 (cust 3 departs, count = 0)
  - Maximum customers present at any time is 2.
- Edge case: single customer `[[10, 20]]` $\implies 1$.
- Example 2: all overlapping `[[1, 10], [2, 9], [3, 8]]` $\implies$ all 3 present concurrently at time 3, returns 3.

## Brute force
A brute-force strategy would test every discrete time point or compare each customer against all other customers to count how many overlap. With times reaching $10^9$, testing all timestamps is impossible. Comparing all pairs of intervals takes $O(n^2)$ time, which for $n = 200000$ requires $4 \times 10^{10}$ operations and results in a Time Limit Exceeded. A sweep-line algorithm processes all transitions in $O(n \log n)$ time.

## The key observation
Occupancy changes only at discrete points in time: when a customer arrives (increasing occupancy by $+1$) or when a customer leaves (decreasing occupancy by $-1$).
By decomposing each customer's visit $[a, d]$ into two independent events: $(a, +1)$ and $(d, -1)$, sorting all $2n$ events chronologically, and scanning through them with a running counter, the maximum value attained by the counter gives the peak occupancy.

## Optimal approach
1. Create a list of $2n$ events: for each customer $[a, d]$, add $(a, +1)$ and $(d, -1)$.
2. Sort all events in ascending order of time. If two events have the same time, sort departures before arrivals (though times are guaranteed distinct here).
3. Initialize `cur = 0` (current customer count) and `best = 0` (maximum customer count).
4. Iterate through the sorted events:
   - Add the event's delta ($+1$ or $-1$) to `cur`.
   - Update `best = max(best, cur)`.
5. Return `best`.

Complexity:
- Time: $O(n \log n)$ to sort $2n$ events, followed by an $O(n)$ linear sweep.
- Space: $O(n)$ to store the $2n$ event pairs.

## Code walkthrough
- `vector<pair<int, int>> events`: Holds all timestamp and delta pairs.
- `events.emplace_back(c[0], 1); events.emplace_back(c[1], -1)`: Deconstructs intervals into $+1$ arrival and $-1$ departure events.
- `sort(events.begin(), events.end())`: Orders events by timestamp.
- `for (auto& [t, delta] : events) { cur += delta; best = max(best, cur); }`: Accumulates running occupancy and records the peak concurrent count.

## Test it out loud
- Test case $1$: Non-overlapping customers `[[1, 2], [3, 4], [5, 6]]`. Count oscillates between 0 and 1, returns 1.
- Test case $2$: Nested customers `[[1, 100], [2, 90], [3, 80], [4, 70]]`. All four arrive before any departure, reaching peak count 4.
- Test case $3$: `[[1, 6], [2, 5], [7, 10], [8, 9]]`. Two clusters of two overlapping customers, peak is 2.

## Follow-ups
- What if arrival and departure times could coincide? If a customer leaving at time $t$ frees up capacity for someone arriving at time $t$, departures must be processed before arrivals (sort key: time first, delta second with $-1 < +1$).
- Can this be solved with two sorted arrays? Yes, sort arrival times and departure times independently, and use a two-pointer merge sweep in $O(n \log n)$ time and $O(1)$ extra space beyond the two arrays.

## Common mistakes
- Allocating a direct array of size $10^9$: Attempting coordinate array indexing or prefix difference arrays without coordinate compression causes Memory Limit Exceeded.
- Handling ties incorrectly when times can match: Processing an arrival before a departure at the same timestamp could temporarily overcount occupancy.

## Further reading
- [Sweep Line Algorithm on Wikipedia](https://en.wikipedia.org/wiki/Sweep_line_algorithm)
