---
id: cses-minimum-euclidean-distance
pattern: cses-misc
difficulty: medium
optimal: "O(n log n) time and O(n) space"
reviewed: false
---

## Clarify first
- What is the input? An array of `n` 2D points with integer coordinates `[x, y]`.
- What are we asked to return? The minimum squared Euclidean distance `(x1 - x2)^2 + (y1 - y2)^2` between any pair of distinct points.
- Why squared distance? Because integer coordinates squared avoid any floating-point inaccuracies.
- What are the constraints? `2 <= n <= 2 * 10^5`, and `-10^9 <= x, y <= 10^9`.
- Can two points have the exact same coordinates? Yes, if duplicate points exist, their distance is 0.

## Examples to say out loud
- Consider points `[(2, 1), (4, 4), (1, 2), (6, 3)]`:
  - Distance between `(2, 1)` and `(1, 2)`: `(2 - 1)^2 + (1 - 2)^2 = 1^2 + (-1)^2 = 2`.
  - Checking other pairs gives distances >= 2.
  - Return `2`.
- Consider points `[(0, 0), (3, 4)]`:
  - Squared distance: `3^2 + 4^2 = 9 + 16 = 25`. Return `25`.

## Brute force
Comparing every pair of points `(i, j)` with `0 <= i < j < n` requires `O(n^2)` distance computations. With `n = 2 * 10^5`, `n^2 = 4 * 10^{10}`, which far exceeds the standard time limit of 1 second (around 10^8 operations). We need an O(n log n) divide-and-conquer or sweep-line approach.

## The key observation
We can sort all points by x-coordinate and use a sweep-line algorithm with a balanced binary search tree (or `std::set` in C++).
Let `d` be the minimum squared distance found so far, and let `r = ceil(sqrt(d))`.
As we sweep from left to right:
1. We only keep points in our active set whose x-coordinate satisfies `x_current - x_prev < r`. Points with `(x_current - x_prev)^2 >= d` can never improve `d`, so we remove them.
2. In the active set (ordered by y-coordinate), we only inspect points whose y-coordinate is in the range `[y_current - r, y_current + r]`.
Geometrically, a box of width `r` and height `2 * r` can contain at most a constant number of points (at most 6-8 points) that are separated by distance at least `sqrt(d)`. Therefore, each point requires only O(1) distance checks, yielding O(n log n) total time.

## Optimal approach
1. Sort all points primarily by x-coordinate, breaking ties by y-coordinate.
2. Initialize `d = squared_dist(p[0], p[1])`.
3. Maintain an active set of points ordered by `(y, x)` and a left pointer `left = 0`.
4. Insert `p[0]` and `p[1]` into the set.
5. Iterate `i` from 2 to `n - 1`:
   - While `(p[i].x - p[left].x)^2 >= d`, remove `p[left]` from the active set and increment `left`.
   - Query the active set for points whose y-coordinates lie in `[p[i].y - sqrt(d), p[i].y + sqrt(d)]` using `lower_bound`.
   - For each candidate point in this range, update `d = min(d, squared_dist(p[i], candidate))`.
   - Insert `p[i]` into the active set.
6. Return `d`.

Complexity:
- Time complexity: O(n log n) because sorting takes O(n log n), and each point is inserted and erased from the set at most once (O(log n)), while checking at most O(1) points in the y-range per iteration.
- Space complexity: O(n) auxiliary space to store the active set and sorted array.

## Code walkthrough
- `sort(pts.begin(), pts.end())`: Sorts points by x-coordinate.
- `set<pair<long long, long long>> active`: Maintains active points ordered by `(y, x)` for logarithmic range lookups.
- `while ((pts[i].x - pts[left].x) * (pts[i].x - pts[left].x) >= d)`: Sweeps away points outside the candidate horizontal stripe.
- `auto it = active.lower_bound({pts[i].y - r, -INF})`: Locates the starting iterator for the vertical stripe.
- `d = min(d, dist_sq)`: Updates the best known squared distance.
- `active.insert({pts[i].y, pts[i].x})`: Adds current point to the active window.

## Test it out loud
- Duplicate points `[(1,2), (5,5), (1,2)]`: Sorted array has adjacent identical points. Distance is `0`. Set pruning keeps `d = 0`. Correct.
- Points on an axis `[(0, 0), (5, 0), (12, 0)]`: `(0, 0)` and `(5, 0)` give `d = 25`. `(12, 0)` has `(12 - 0)^2 = 144 >= 25`, so `(0, 0)` is evicted. `(12 - 5)^2 = 49 >= 25`, so `d` remains 25. Correct.

## Follow-ups
- How does the divide-and-conquer version work? Split sorted points into left and right halves, solve recursively, let `d = min(d_left, d_right)`, and check points in the middle strip of width `2 * sqrt(d)` sorted by y in linear time. Both achieve O(n log n).

## Common mistakes
- Ordering the active set by `x` instead of `y`, making it impossible to query the vertical range in O(log n).
- Using floating-point comparisons or 32-bit integers, which overflow when coordinates reach 10^9 (squared distances reach 8 * 10^18).
