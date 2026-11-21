---
id: cses-polygon-lattice-points
pattern: cses-misc
difficulty: medium
optimal: "O(n log(max_coord)) time and O(1) space"
reviewed: false
brute: same
---

## Clarify first
- What is the input? An array of `n` vertices representing a simple polygon with integer coordinates in consecutive order.
- What are we asked to find? The number of integer lattice points strictly inside the polygon (`inside`), and the number of lattice points on its boundary (`boundary`).
- What is the output format? Return a 2-element array `[inside, boundary]`.
- What are the constraints? `3 <= n <= 10^5`, and coordinates are between `-10^9` and `10^9`.

## Examples to say out loud
- Consider a right triangle `[(0, 0), (4, 0), (0, 3)]`:
  - Double area by shoelace: `4 * 3 = 12`, so Area = 6.
  - Boundary points:
    - Segment `(0, 0)` to `(4, 0)`: `gcd(4, 0) = 4`.
    - Segment `(4, 0)` to `(0, 3)`: `gcd(|0 - 4|, |3 - 0|) = gcd(4, 3) = 1`.
    - Segment `(0, 3)` to `(0, 0)`: `gcd(0, 3) = 3`.
    - Total boundary points `B = 4 + 1 + 3 = 8`.
  - By Pick's theorem, `Area = I + B / 2 - 1` -> `6 = I + 4 - 1` -> `I = 3`.
  - Output: `[3, 8]`.
- Consider a unit square `[(0, 0), (1, 0), (1, 1), (0, 1)]`:
  - `2 * Area = 2`.
  - `B = 1 + 1 + 1 + 1 = 4`.
  - `I = (2 - 4 + 2) / 2 = 0`.
  - Output: `[0, 4]`.

## Brute force
Testing every integer lattice point inside the bounding box of the polygon using point-in-polygon checks would take O(Width * Height * n), which can be up to `(2 * 10^9)^2 * 10^5`. That is impossible. We must use Pick's Theorem.

## The key observation
1. Boundary points `B`: For any line segment between integer points `(x1, y1)` and `(x2, y2)`, the number of integer points on the segment (excluding one endpoint to allow clean summation around the cycle) is `gcd(|x2 - x1|, |y2 - y1|)`. Summing this across all `n` polygon edges gives total boundary points `B`.
2. Area `A`: Using Gauss's Shoelace formula, we can compute `2 * Area` in O(n) time.
3. Interior points `I`: Pick's Theorem states:
   `Area = I + B / 2 - 1`, which rearranges to:
   `2 * Area = 2 * I + B - 2`, or
   `I = (2 * Area - B + 2) / 2`.

## Optimal approach
1. Initialize 64-bit accumulators: `double_area = 0` and `B = 0`.
2. For each edge from `points[i]` to `points[j]` where `j = (i + 1) % n`:
   - Add `x_i * y_j - x_j * y_i` to `double_area`.
   - Add `std::gcd(abs(x_j - x_i), abs(y_j - y_i))` to `B`.
3. Set `double_area = abs(double_area)`.
4. Compute `I = (double_area - B + 2) / 2`.
5. Return `[I, B]`.

Complexity:
- Time complexity: O(n log(max_coord)) where `n <= 10^5`, since each edge computes one GCD in logarithmic time.
- Space complexity: O(1) auxiliary space beyond the output array.

## Code walkthrough
- `long long double_area = 0, B = 0`: 64-bit accumulators to prevent overflow.
- `for (int i = 0; i < n; i++)`: Iterates through each edge of the polygon.
- `B += std::gcd(abs(x2 - x1), abs(y2 - y1))`: Accumulates lattice points along each polygon segment.
- `double_area += 1LL * x1 * y2 - 1LL * x2 * y1`: Evaluates the shoelace summation.
- `long long I = (abs(double_area) - B + 2) / 2`: Computes interior points by Pick's theorem.
- `return {I, B}`: Returns the pair of values.

## Test it out loud
- Triangle `[(0,0), (4,0), (0,3)]`:
  - `double_area = 12`.
  - `B = 4 + 1 + 3 = 8`.
  - `I = (12 - 8 + 2) / 2 = 6 / 2 = 3`. Returns `[3, 8]`. Correct.
- Unit square `[(0,0), (1,0), (1,1), (0,1)]`:
  - `double_area = 2`.
  - `B = 4`.
  - `I = (2 - 4 + 2) / 2 = 0`. Returns `[0, 4]`. Correct.

## Follow-ups
- Does Pick's theorem work if the polygon has self-intersections or holes? No, Pick's theorem strictly holds for simple polygons without self-intersections or holes. For polygons with `h` holes, the formula generalizes to `Area = I + B / 2 + h - 1`.

## Common mistakes
- Forgetting that coordinates can be negative, so taking absolute values before calling `gcd` is necessary: `abs(x2 - x1)`.
- Using 32-bit integers for `double_area`, which overflows since coordinates reach 10^9.
