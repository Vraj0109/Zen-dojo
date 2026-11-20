---
id: cses-movie-festival
pattern: cses-sorting-and-searching
difficulty: medium
optimal: "O(n \log n) time and O(1) space"
reviewed: false
---

## Clarify first
- What does each entry represent? A movie with start time and end time: `[start, end]`.
- Can you watch back-to-back movies if one movie ends at time $t$ and another begins at time $t$? Yes, transition time is zero; if movie 1 ends at $t$, a movie starting at $t$ can be watched immediately.
- What is the objective? Maximize the total count of non-overlapping movies you can watch completely.
- What are the constraints? $1 \le n \le 200000$ and $1 \le \text{start} < \text{end} \le 10^9$.

## Examples to say out loud
- Consider `movies = [[3, 5], [4, 9], [5, 8]]`:
  - Movie 1: [3, 5], ends at 5.
  - Movie 2: [4, 9], ends at 9.
  - Movie 3: [5, 8], ends at 8.
  - Sort by end time: [3, 5] (ends 5), [5, 8] (ends 8), [4, 9] (ends 9).
  - Pick [3, 5] first (earliest end time). Last watched ends at 5.
  - Next movie [5, 8] starts at $5 \ge 5$, so we can watch it. Last watched ends at 8.
  - Next movie [4, 9] starts at $4 < 8$, overlaps with previously watched movie. Skip.
  - Total movies watched: 2.
- Consider `movies = [[1, 10], [2, 5], [6, 9]]`:
  - If we greedily chose the earliest start time ([1, 10]), we would only watch 1 movie.
  - By choosing the earliest end time: [2, 5] ends at 5, then [6, 9] ends at 9 $\implies 2$ movies watched.

## Brute force
A brute force approach would enumerate all $2^n$ subsets of movies, check if any two movies in the subset overlap, and find the maximum subset size. With $n = 200000$, $2^n$ is astronomical. Even a dynamic programming approach on sorted intervals would take $O(n^2)$ time ($O(n \log n)$ with binary search), which is slower than necessary. The classic greedy Interval Scheduling Algorithm solves this in $O(n \log n)$ time.

## The key observation
This is the classic Interval Scheduling Maximization Problem.
The greedy strategy that always achieves an optimal solution is: **always select the movie that finishes earliest** among all available compatible movies.
Why does this work? Choosing the movie that ends as early as possible frees up the resource (the viewer's time) as quickly as possible, leaving the maximum remaining time window for subsequent movies. Any other choice ends later, leaving a smaller or equal window of opportunity, which can never result in more movies being watched.

## Optimal approach
1. Sort the `movies` array in ascending order of their end times (`movie[1]`). If end times are equal, tie-break arbitrarily by start times.
2. Initialize `count = 0` and `lastEnd = 0`.
3. Iterate through each movie in the sorted list:
   - If the movie's start time $\ge \text{lastEnd}$:
     - Increment `count`.
     - Update `lastEnd` to this movie's end time.
4. Return `count`.

Complexity:
- Time: $O(n \log n)$ dominated by sorting the $n$ movie intervals. The subsequent linear scan is $O(n)$.
- Space: $O(1)$ auxiliary space beyond the sorting recursion stack.

## Code walkthrough
- `sort(movies.begin(), movies.end(), ...)`: Sorts intervals by end time `a[1] < b[1]`.
- `int count = 0, lastEnd = 0`: Tracks the number of selected movies and the completion time of the latest chosen movie.
- `for (const auto& m : movies)`: Scans movies in order of finishing times.
- `if (m[0] >= lastEnd)`: Checks compatibility: ensures the movie begins at or after the previous movie finishes.
- `count++; lastEnd = m[1]`: Greedily commits to watching this movie and updates the availability boundary.

## Test it out loud
- Test case $1$: `[[1, 2], [2, 3], [3, 4], [4, 5]]`. Consecutive chain without gaps $\implies$ returns 4.
- Test case $2$: `[[1, 100], [2, 100], [3, 100]]`. All end at 100, picking one blocks all others $\implies$ returns 1.
- Test case $3$: `[[10, 20]]`. Single movie $\implies$ returns 1.
- Test case $4$: `[[100, 200], [50, 150], [150, 250], [250, 350]]`. Sorted by end: [50, 150], [100, 200], [150, 250], [250, 350]. Picks [50, 150], [150, 250], [250, 350] $\implies$ returns 3.

## Follow-ups
- What if each movie had a weight or value, and we wanted to maximize total value? Greedy no longer works; this becomes the Weighted Interval Scheduling Problem, which is solved using dynamic programming with binary search in $O(n \log n)$ time.
- What if we had $k$ people who could watch movies simultaneously? This generalizes to finding the maximum number of intervals that can be partitioned into $k$ disjoint sets, solvable using a min-heap tracking the $k$ latest ending times in $O(n \log k)$ time.

## Common mistakes
- Sorting by start time instead of end time: A very long movie starting early (e.g. $[0, 100]$) would be picked first and block multiple shorter non-overlapping movies (e.g. $[1, 2], [3, 4]$).
- Sorting by duration (shortest interval first): A short interval in the middle of two non-overlapping intervals can block both, yielding 1 movie instead of 2. Earliest end time is the unique provably optimal greedy metric.

## Further reading
- [Interval Scheduling on Wikipedia](https://en.wikipedia.org/wiki/Interval_scheduling)
