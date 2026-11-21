---
id: cses-point-in-polygon
pattern: cses-misc
difficulty: medium
optimal: "O(n) time per point and O(1) space"
reviewed: false
brute: same
---

## Clarify first
- What are the inputs? An array of vertices representing an `n`-gon in order, and an array of `m` 2D query points.
- What should be classified for each point? Determine whether the point is `"INSIDE"`, `"OUTSIDE"`, or on the `"BOUNDARY"` of the polygon.
- Can the polygon be non-convex? Yes, it can be any simple non-self-intersecting polygon.
- What are the constraints? `3 <= n <= 1000` vertices, `1 <= m <= 1000` query points. Coordinates range between `-10^9` and `10^9`.

## Examples to say out loud
- Consider a square polygon `[(0, 0), (4, 0), (4, 4), (0, 4)]`:
  - Query point `(2, 2)`: Lies strictly inside the square. Return `"INSIDE"`.
  - Query point `(0, 2)`: Lies on the left boundary segment between `(0, 0)` and `(0, 4)`. Return `"BOUNDARY"`.
  - Query point `(5, 5)`: Lies outside the square. Return `"OUTSIDE"`.
  - Query point `(0, 0)`: A vertex of the polygon. Return `"BOUNDARY"`.

## Brute force
For convex polygons, one could test if the point lies on the same side of all directed edges in O(n) time, or binary search angles in O(log n). But for arbitrary non-convex simple polygons, ray casting (the even-odd rule) is standard. In ray casting, we cast a semi-infinite ray from the test point and count edge intersections. Testing `n` edges takes O(n) per query point.

## The key observation
1. Boundary check: Before ray casting, test if the point lies directly on any polygon edge. A point `P` lies on segment `AB` if `cross_product(AB, AP) == 0` and `P` lies within the bounding box of `AB`. If so, report `"BOUNDARY"` immediately.
2. Ray casting: Cast a horizontal ray to the right `(+infinity, Py)`. An edge between `(x1, y1)` and `(x2, y2)` intersects the ray if:
   - One endpoint is strictly below `Py` and the other is at or above `Py` (i.e. `(y1 <= Py && Py < y2) || (y2 <= Py && Py < y1)`). This half-open convention prevents double-counting vertices.
   - The x-intersection of the edge at height `Py` is strictly greater than `Px`.
3. By the Jordan Curve Theorem, if the number of ray crossings is odd, the point is `"INSIDE"`; if even, it is `"OUTSIDE"`.

## Optimal approach
1. For each query point `P`:
2. Check if `P` lies on any segment `polygon[i] -> polygon[(i + 1) % n]`. If so, answer `"BOUNDARY"`.
3. Otherwise, initialize `crossings = 0`.
4. Loop through each edge `(p1, p2)`:
   - Check if the edge straddles the horizontal line `y = P.y`:
     `(p1.y <= P.y && p2.y > P.y) || (p2.y <= P.y && p1.y > P.y)`.
   - If it does, compute the x-coordinate of the intersection, or check the sign of the cross product:
     `cross_product(p1, p2, P)`. Taking into account the direction of the edge, check if `P` lies to the left of directed edge `p1 -> p2`.
   - If the ray crosses the edge to the right of `P`, increment `crossings`.
5. If `crossings % 2 == 1`, answer `"INSIDE"`; else answer `"OUTSIDE"`.

Complexity:
- Time complexity: O(n) per query point, leading to O(n * m) for `m` points. With `n, m <= 1000`, total operations are ~10^6, which easily completes within standard limits.
- Space complexity: O(1) auxiliary space beyond the output list.

## Code walkthrough
- `bool on_segment(A, B, P)`: Confirms collinearity via 64-bit cross product and checks bounding box.
- `if (on_segment(...)) return "BOUNDARY"`: Early exit for boundary points.
- `int crossings = 0`: Counts ray intersections.
- Half-open interval condition: `(y1 <= P.y && y2 > P.y) || (y2 <= P.y && y1 > P.y)`.
- Cross product check: Determines whether point `P` is to the left of the directed segment from lower endpoint to upper endpoint.

## Test it out loud
- Square `[(0,0), (4,0), (4,4), (0,4)]`, point `(2,2)`: Horizontal ray crosses the right edge `(4,0)-(4,4)` once. `crossings = 1` -> `"INSIDE"`. Correct.
- Point `(0,2)`: `on_segment` for `(0,0)-(0,4)` is true -> `"BOUNDARY"`. Correct.
- Point `(5,2)`: Ray extends rightwards from `(5,2)` to infinity, intersects zero edges -> `crossings = 0` -> `"OUTSIDE"`. Correct.

## Follow-ups
- How to answer queries in O(log n) time per point if the polygon is guaranteed to be convex? Perform binary search on the angles of vertices from an anchor vertex, then do a triangle orientation check.

## Common mistakes
- Not checking the boundary explicitly first, causing ray casting on horizontal edges or vertices to produce incorrect odd/even parity.
- Double-counting vertex intersections by using inclusive bounds `y1 <= Py && Py <= y2` instead of half-open intervals.
