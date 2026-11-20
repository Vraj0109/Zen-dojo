---
id: cses-movie-festival-queries
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O((n + q) log n) time, O(n log n) space"
reviewed: false
---

## Clarify first
- How are movies defined? Each movie is an interval [start, end] with start < end.
- Can movies touch? Yes, a movie may start at the exact moment another ends: if movie 1 ends at t and movie 2 starts at t, both can be watched.
- What does each query [a, b] specify? A visitor arrives at time a and leaves at time b, and can only watch movies that start at or after a and end at or before b.
- What should be returned? The maximum number of non-overlapping movies the visitor can watch within [a, b], in query order.
- What are the constraints? Up to 200,000 movies and 200,000 queries, with timestamps up to 10^9.

## Examples to say out loud
Suppose movies are [1, 5], [2, 3], [4, 6], [3, 4], [6, 8] and queries are:
- [1, 8]: picking movies [2, 3], [3, 4], [4, 6], and [6, 8] yields 4 non-overlapping movies. Output: 4.
- [2, 6]: picking [2, 3], [3, 4], and [4, 6] yields 3 movies. Output: 3.
- [1, 2]: no movie fits strictly inside [1, 2]. Output: 0.
- [4, 8]: picking [4, 6] and [6, 8] yields 2 movies. Output: 2.
Output list: [4, 3, 0, 2].

## Brute force
For a single interval, the standard greedy choice sorts available movies by end time and iteratively picks the earliest ending compatible movie.
Running this greedy scan for each of the 200,000 queries takes O(n log n) per query, leading to O(q * n log n) operations.
This will drastically time out.
Since the greedy choice from any given state is deterministic, we can precompute greedy transitions and use binary lifting to make logarithmic jumps.

## The key observation
In the greedy interval scheduling algorithm, once you pick a movie that ends at time T, your next choice is always the movie with the smallest end time among all movies starting at or after T.
Notice this transition is completely deterministic: every movie i has a unique greedy successor `next[i]`.
If we sort all movies by start time, finding the first movie starting >= end[i] takes a binary search (`lower_bound`), and finding which movie in that suffix has the minimal end time can be precomputed with a suffix minimum array.
Once each movie knows its immediate greedy successor `up[0][i]`, we build binary lifting tables `up[k][i]` representing the movie reached after 2^k greedy steps.
To answer query [a, b], we find the first greedy movie starting >= a. If its end > b, answer is 0. Otherwise, count 1, and jump using binary lifting from high powers of 2 down to 0 as long as the destination movie ends <= b.

## Optimal approach
1. Sort all movies by start time. Store start times `st` and end times `en`.
2. Compute suffix minimums: `best[j]` is the index of the movie with the minimum end time among movies from sorted index j to m - 1. Sentinel m represents no movie.
3. For each movie i:
   - Find first movie starting >= en[i]: `j = lower_bound(st, en[i])`.
   - Set `up[0][i] = best[j]`.
4. Build binary lifting tables for k from 1 to 18: `up[k][i] = up[k - 1][up[k - 1][i]]`.
5. For each query [a, b]:
   - Find first movie starting >= a: `j = lower_bound(st, a)`.
   - Start at movie `cur = best[j]`.
   - If `cur == m` or `en[cur] > b`, output 0.
   - Otherwise, initialize `cnt = 1`.
   - For k from 18 down to 0:
     - Let `nx = up[k][cur]`.
     - If `nx != m` and `en[nx] <= b`, jump: `cur = nx`, `cnt += 1 << k`.
   - Append `cnt` to answers list.
6. Return answers list.

Complexity: O((n + q) log n) time (sorting and O(log n) binary lifting per query), and O(n log n) space for binary lifting tables.

## Code walkthrough
In C++, `mv` stores pairs (start, end) and is sorted by start time.
Vector `best(m + 1, m)` computes suffix best indices backwards: `(en[j] < en[best[j + 1]]) ? j : best[j + 1]`.
`up[0][i] = best[j]` links each movie to its optimal greedy successor via `lower_bound`.
`up[k][i] = up[k - 1][up[k - 1][i]]` squares the step distance up to 2^18 (> 200,000).
In the query loop:
`cur = best[lower_bound(st, a)]` picks the optimal first movie.
The loop `for (int k = LOG; k >= 0; k--)` tries large power-of-two jumps: if `en[nx] <= b`, we advance `cur = nx` and add `1 << k` to the movie count.

## Test it out loud
- Single movie fitting: movie [1, 2], query [1, 2]. Fits, returns 1. Query [2, 3] finds no movie, returns 0.
- Consecutive touching movies: [1, 10] and [10, 20], query [1, 20]. First takes [1, 10]. Next jump takes [10, 20]. Returns 2.
- Multiple redundant options: movies [1, 100], [2, 3], [3, 4], [4, 5], query [1, 100]. Greedily skips [1, 100] because [2, 3] has earlier end time. Watches 3 movies. Returns 3.
- Range with zero valid movies: query [5, 6] when all movies start after 10 returns 0.

## Follow-ups
- Why is greedy interval scheduling optimal? The greedy strategy leaves the maximum possible remaining time for subsequent movies, which is guaranteed to be optimal by the exchange argument.
- How does binary lifting here relate to tree LCA? It is the exact same binary lifting technique applied to a functional graph where each node has out-degree 1 (a collection of directed trees rooted at the sentinel).
- What if movies had profits and we wanted maximum total profit? That would be weighted interval scheduling, which requires dynamic programming and Segment Trees instead of pure binary lifting.

## Common mistakes
- Not checking `en[nx] <= b`: failing to check if the jumped movie ends before query boundary b allows movies exceeding the allowed window.
- Off-by-one in suffix minimum: forgetting that `best` must use `<` on end times to prioritize earlier finishing movies.
- Setting sentinel index incorrectly: using 0 instead of m for sentinel can cause infinite loops in binary lifting.

## Further reading
- Greedy interval scheduling proof and properties
- Binary lifting on functional graphs
- Range interval scheduling with sparse tables
