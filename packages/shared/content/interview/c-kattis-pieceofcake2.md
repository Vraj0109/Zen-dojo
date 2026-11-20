---
id: c-kattis-pieceofcake2
pattern: cses-kattis
difficulty: easy
optimal: "O(1) time and O(1) space"
reviewed: false
---

## Clarify first
- What are the dimensions of the cake? The cake is a square of side length `n` cm, and the cake's thickness is a constant 4 cm.
- What cuts are made?
  - A horizontal cut is made `h` cm from the top edge.
  - A vertical cut is made `v` cm from the left edge.
- How many pieces does this create? The two cuts divide the square cake into 4 rectangular prism pieces.
- What should be computed? The volume of the largest of the 4 pieces (in cubic cm).
- What are the constraints? `2 <= n <= 10000`, `0 < h, v < n`.

## Examples to say out loud
- Consider `n = 10, h = 4, v = 7`:
  - The horizontal cut splits the height `10` into two segments: `4` and `10 - 4 = 6`. The larger segment is `max(4, 6) = 6`.
  - The vertical cut splits the width `10` into two segments: `7` and `10 - 7 = 3`. The larger segment is `max(7, 3) = 7`.
  - The maximum base area is `6 * 7 = 42`.
  - Thickness is 4, so volume of largest piece is `42 * 4 = 168` cubic cm.

## Brute force
Compute the volume of all 4 pieces:
1. `h * v * 4`
2. `h * (n - v) * 4`
3. `(n - h) * v * 4`
4. `(n - h) * (n - v) * 4`
Take the maximum among the 4 volumes. This evaluates 4 multiplications in O(1) time.

## The key observation
Since volume is `length * width * thickness` and thickness is always 4, maximizing volume is equivalent to maximizing the base area `length * width`.
The horizontal cut yields segments of length `h` and `n - h`.
The vertical cut yields segments of length `v` and `n - v`.
Because length and width are independent, the maximum product is formed by picking the larger horizontal segment and the larger vertical segment:
`max_volume = max(h, n - h) * max(v, n - v) * 4`.

## Optimal approach
1. Read `n, h, v`.
2. Compute `max_h = max(h, n - h)`.
3. Compute `max_v = max(v, n - v)`.
4. Compute `volume = max_h * max_v * 4`.
5. Output `volume`.

Complexity:
- Time complexity: O(1) arithmetic operations.
- Space complexity: O(1) auxiliary space.

## Code walkthrough
- `int max_h = max(h, n - h)`: Picks the longer vertical segment.
- `int max_v = max(v, n - v)`: Picks the longer horizontal segment.
- `int volume = max_h * max_v * 4`: Multiplies the largest base area by the constant depth 4.
- `cout << volume << "\n"`: Outputs the resulting volume.

## Test it out loud
- `n = 10, h = 4, v = 7`: `max(4, 6) * max(7, 3) * 4 = 6 * 7 * 4 = 168`. Correct.
- `n = 5, h = 2, v = 2`: `max(2, 3) * max(2, 3) * 4 = 3 * 3 * 4 = 36`. Correct.
- `n = 4, h = 2, v = 1`: `max(2, 2) * max(1, 3) * 4 = 2 * 3 * 4 = 24`. Correct.

## Follow-ups
- Could `volume` overflow a 32-bit signed integer? The maximum value is `n = 10000`, so `10000 * 10000 * 4 = 4 * 10^8`, which fits well within standard 32-bit signed integers (up to `2 * 10^9`).

## Common mistakes
- Forgetting to multiply by the constant thickness 4.
- Taking `h * v * 4` directly without considering the remaining segments `n - h` and `n - v`.
