---
id: cses-convex-hull
pattern: cses-misc
difficulty: medium
optimal: "O(n log n) time and O(n) space"
reviewed: false
---

## Clarify first
- What is the input? An array of `n` distinct 2D points with integer coordinates.
- What is the output? All points that lie on the convex hull boundary.
- Do collinear points on the boundary need to be included? Yes, the problem explicitly states that all points on the boundary must be included, even if they lie on a straight line between other vertices.
- What order should the hull points be in? Any order is accepted.
- What are the constraints? `3 <= n <= 2 * 10^5`, and `-10^9 <= x, y <= 10^9`.

## Examples to say out loud
- Consider `[(0,0), (6,0), (0,6), (2,2)]`:
  - `(0, 0)`, `(6, 0)`, and `(0, 6)` form a right triangle.
  - `(2, 2)` lies strictly inside the triangle.
  - Convex hull contains `[(0, 0), (6, 0), (0, 6)]`.
- Consider collinear points on an edge `[(0,0), (1,0), (2,0), (2,2), (0,2)]`:
  - `(1, 0)` is on the bottom edge between `(0, 0)` and `(2, 0)`.
  - Since all boundary points must be included, `(1, 0)` must be part of the output.

## Brute force
Gift Wrapping (Jarvis march) takes O(n * h) where `h` is the number of hull vertices. If all `n` points lie on the hull (e.g. points on a circle), Jarvis march takes O(n^2), which times out for `n = 2 * 10^5`. We use Andrew's monotone chain algorithm, which runs in O(n log n) guaranteed time.

## The key observation
Andrew's monotone chain algorithm sorts points lexicographically by `(x, y)` and constructs the convex hull in two halves: the lower hull (left to right) and the upper hull (right to left).
To decide whether to keep a point `C` after `A` and `B`:
- Standard Graham scan pops whenever the turn from `AB` to `BC` is not strictly counter-clockwise (i.e. `cross(AB, BC) <= 0`).
- To include collinear points on the boundary, we only pop when the turn is strictly clockwise: `cross(AB, BC) < 0`. This allows collinear points (`cross == 0`) to remain on the hull!
- When concatenating the lower and upper hulls, we remove duplicate points (or store points in a set/filter duplicates).

## Optimal approach
1. Sort all points primarily by `x`, breaking ties by `y`.
2. Construct the lower hull:
   - For each point `p` from left to right:
     - While the hull has `>= 2` points and `cross(hull.end[-2], hull.end[-1], p) < 0`, pop the last point.
     - Append `p`.
3. Construct the upper hull:
   - For each point `p` from right to left:
     - While the upper hull has `>= 2` points and `cross(hull.end[-2], hull.end[-1], p) < 0`, pop the last point.
     - Append `p`.
4. Combine the two hulls.
5. If all points are collinear, handle the degenerate case (simply return all points). Otherwise, remove duplicates from the combined list.
6. Return the resulting points.

Complexity:
- Time complexity: O(n log n) for sorting the points. Each point is pushed and popped from the hull stacks at most twice, taking O(n) amortized time.
- Space complexity: O(n) auxiliary space to store the lower and upper hulls.

## Code walkthrough
- `sort(pts.begin(), pts.end())`: Lexicographical sort by `(x, y)`.
- `auto cross = [](Point a, Point b, Point c)`: 64-bit cross product `(b.x - a.x)*(c.y - a.y) - (b.y - a.y)*(c.x - a.x)`.
- `while (lower.size() >= 2 && cross(lower[lower.size()-2], lower.back(), pts[i]) < 0) lower.pop_back()`: Pops strictly clockwise turns, retaining collinear points.
- Repeat the exact same logic in reverse for `upper`.
- Deduplicate vertices across lower and upper hulls.

## Test it out loud
- Triangle with interior point `[(0,0), (6,0), (0,6), (2,2)]`:
  - `(2, 2)` causes clockwise turns when bridging to other vertices, gets popped.
  - Hull outputs the 3 corner vertices. Correct.
- Collinear segment `[(0,0), (1,1), (2,2)]`:
  - `cross == 0` is not strictly `< 0`, so `(1, 1)` is never popped. All 3 points retained. Correct.

## Follow-ups
- How to sort the hull points in counter-clockwise order if required by the caller? Concatenate `lower` (excluding its last point) and `upper` (excluding its last point); the sequence naturally traces the boundary counter-clockwise.

## Common mistakes
- Using `<= 0` in the cross-product check instead of `< 0`, which mistakenly discards collinear points on the boundary edges.
- Not handling the collinear edge case where all points in the input lie on a single line.
- Arithmetic overflow in the cross-product calculation when coordinates reach 10^9.
