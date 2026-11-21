---
id: cses-line-segment-intersection
pattern: cses-misc
difficulty: medium
optimal: "O(1) time per query and O(1) space"
reviewed: false
brute: same
---

## Clarify first
- What are the inputs? An array of queries where each query consists of 8 coordinates: `[x1, y1, x2, y2, x3, y3, x4, y4]`.
- What do the coordinates define? Segment 1 connects `p1 = (x1, y1)` and `p2 = (x2, y2)`. Segment 2 connects `p3 = (x3, y3)` and `p4 = (x4, y4)`.
- What constitutes an intersection? Any shared point, including interior crossings, touching at an endpoint, or overlapping along a collinear line segment.
- What should be returned? `"YES"` if the segments intersect, `"NO"` otherwise.
- What are the constraints? Number of queries up to 10^5, coordinates between `-10^9` and `10^9`.

## Examples to say out loud
- Consider `p1 = (0, 0), p2 = (4, 4)` and `p3 = (0, 4), p4 = (4, 0)`: The two diagonals of the square intersect at `(2, 2)`. Both cross each other properly. Return `"YES"`.
- Consider `p1 = (0, 0), p2 = (2, 2)` and `p3 = (0, 1), p4 = (2, 3)`: Two parallel segments shifted vertically. They do not intersect. Return `"NO"`.
- Consider `p1 = (0, 0), p2 = (2, 2)` and `p3 = (2, 2), p4 = (4, 1)`: They touch at endpoint `(2, 2)`. Return `"YES"`.

## Brute force
Computing line equations using slope-intercept form `y = mx + b` leads to division by zero for vertical lines and floating-point precision inaccuracies. In computational geometry, the standard robust method is exact cross-product orientation combined with bounding-box checks for collinear points.

## The key observation
Two segments `AB` and `CD` intersect if and only if:
1. General case: `C` and `D` lie on opposite sides of line `AB`, and `A` and `B` lie on opposite sides of line `CD`. In terms of orientation signs:
   `sign(cross(AB, AC)) != sign(cross(AB, AD))` AND `sign(cross(CD, CA)) != sign(cross(CD, CB))`.
2. Collinear / touching case: An endpoint of one segment lies directly on the other segment. A point `P` lies on segment `AB` if `cross(AB, AP) == 0` and `P` is within the 1D bounding boxes along both the x-axis and y-axis:
   `min(Ax, Bx) <= Px <= max(Ax, Bx)` and `min(Ay, By) <= Py <= max(Ay, By)`.

## Optimal approach
1. Define a helper `cross_product(A, B, C) = (Bx - Ax) * (Cy - Ay) - (By - Ay) * (Cx - Ax)` using 64-bit integers.
2. Define a helper `on_segment(A, B, P)` that returns true if `cross_product(A, B, P) == 0` and `P` is inside the axis-aligned bounding box of `AB`.
3. Compute the four orientation signs:
   - `d1 = sign(cross(p1, p2, p3))`
   - `d2 = sign(cross(p1, p2, p4))`
   - `d3 = sign(cross(p3, p4, p1))`
   - `d4 = sign(cross(p3, p4, p2))`
4. If `((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))`, return `"YES"`.
5. If `on_segment(p1, p2, p3)` or `on_segment(p1, p2, p4)` or `on_segment(p3, p4, p1)` or `on_segment(p3, p4, p2)` is true, return `"YES"`.
6. Otherwise, return `"NO"`.

Complexity:
- Time complexity: O(1) time per query.
- Space complexity: O(1) auxiliary space.

## Code walkthrough
- `long long cross(...)`: Uses 64-bit math to prevent overflow from coordinate differences up to 2 * 10^9.
- `bool on_segment(A, B, P)`: Confirms collinearity and checks `min(A.x, B.x) <= P.x <= max(A.x, B.x)` and corresponding y-bounds.
- General intersection branch: Ensures straddling on both lines.
- Collinear checks: Covers touching endpoints and overlapping segments.

## Test it out loud
- Standard intersection `(0,0)-(4,4)` and `(0,4)-(4,0)`: Straddle condition holds in both directions -> `"YES"`. Correct.
- Parallel separated segments `(0,0)-(2,2)` and `(0,1)-(2,3)`: Orientations do not straddle, no point on segment -> `"NO"`. Correct.
- Endpoint touch `(0,0)-(2,2)` and `(2,2)-(4,1)`: `p2 == p3`, `on_segment` returns true -> `"YES"`. Correct.

## Follow-ups
- How to find the actual intersection point coordinates? Solve the linear system of equations using Cramer's rule or line parameterization `P = A + t * (B - A)`.

## Common mistakes
- Using floating-point division to find slopes, causing division-by-zero crashes on vertical lines or precision errors on nearly-parallel segments.
- Neglecting the collinear overlapping cases where the cross products are zero but the segments may or may not overlap.
