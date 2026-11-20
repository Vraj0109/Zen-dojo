---
id: cses-polygon-area
pattern: cses-misc
difficulty: medium
optimal: "O(n) time and O(1) space"
reviewed: false
---

## Clarify first
- What is the input? An array of `n` vertices representing a polygon in consecutive order (either clockwise or counter-clockwise).
- What should be returned? The double area `2 * Area`.
- Why double area? For any polygon with integer vertices, the shoelace formula guarantees that `2 * Area` is an exact integer, avoiding floating-point precision issues.
- Can the polygon be non-convex? The shoelace formula works for any simple non-self-intersecting polygon, whether convex or concave.
- What are the constraints? `3 <= n <= 1000`, with coordinates between `-10^9` and `10^9`.

## Examples to say out loud
- Consider a right triangle with vertices `[(0, 0), (4, 0), (0, 3)]`:
  - Base = 4, height = 3.
  - Actual area = `0.5 * 4 * 3 = 6`.
  - Double area = `2 * 6 = 12`.
- Consider a unit square `[(0, 0), (1, 0), (1, 1), (0, 1)]`:
  - Side length = 1, actual area = 1.
  - Double area = 2.

## Brute force
Triangulating the polygon into `n - 2` triangles and summing their signed areas takes O(n) time if the polygon is convex, or O(n log n) / O(n^2) for general ear-clipping. However, Gauss's area formula (the Shoelace formula) directly evaluates the signed area of any simple polygon in a single O(n) pass.

## The key observation
By Green's theorem / Gauss's shoelace formula:
`2 * Area = | sum_{i=0}^{n-1} (x_i * y_{i+1} - x_{i+1} * y_i) |`, with indices wrapping around so that vertex `n` is vertex `0`.
Since coordinates are up to 10^9, products can be up to 10^18, and summing across 1000 vertices can exceed standard 32-bit integer limits. Therefore, 64-bit signed integers (`long long` in C++, `long` in Java) are required.

## Optimal approach
1. Initialize a 64-bit integer accumulator `sum = 0`.
2. Loop `i` from 0 to `n - 1`:
   - Let `j = (i + 1) % n`.
   - Add `x_i * y_j - x_j * y_i` to `sum`.
3. Return `abs(sum)`.

Complexity:
- Time complexity: O(n) where `n <= 1000`, as each edge of the polygon contributes one term to the summation.
- Space complexity: O(1) auxiliary space beyond the input vertices.

## Code walkthrough
- `long long sum = 0`: Accumulates signed trapezoid / cross-product contributions in 64-bit precision.
- `for (int i = 0; i < n; i++)`: Loops through all vertices in cyclic order.
- `int j = (i + 1) % n`: Wraps around from the last vertex back to the first.
- `sum += 1LL * points[i][0] * points[j][1] - 1LL * points[j][0] * points[i][1]`: Standard 2D cross product term.
- `return abs(sum)`: Returns the absolute value to handle both clockwise and counter-clockwise vertex orders.

## Test it out loud
- Square `[(0,0), (1,0), (1,1), (0,1)]`:
  - `i=0`: `0*0 - 1*0 = 0`
  - `i=1`: `1*1 - 1*0 = 1`
  - `i=2`: `1*1 - 0*1 = 1`
  - `i=3`: `0*0 - 0*1 = 0`
  - `sum = 2`, `abs(sum) = 2`. Correct.
- Triangle `[(0,0), (4,0), (0,3)]`:
  - `i=0`: `0*0 - 4*0 = 0`
  - `i=1`: `4*3 - 0*0 = 12`
  - `i=2`: `0*0 - 0*3 = 0`
  - `sum = 12`, `abs(sum) = 12`. Correct.

## Follow-ups
- How does the shoelace formula relate to Pick's Theorem? Pick's theorem states `Area = i + b/2 - 1`, where `i` is interior lattice points and `b` is boundary lattice points. Using the shoelace formula for Area and GCDs for boundary points `b`, one can compute the number of strictly interior integer lattice points `i`.

## Common mistakes
- Forgetting to wrap around the final edge from `points[n-1]` to `points[0]`.
- Using 32-bit integers, leading to arithmetic overflow when coordinates exceed ~46,000.
- Forgetting `abs()` when points are ordered clockwise, returning a negative area.
