---
id: cses-point-location-test
pattern: cses-misc
difficulty: medium
optimal: "O(1) time per query and O(1) space"
reviewed: false
---

## Clarify first
- What are the inputs? An array of queries where each query consists of 6 coordinates `[x1, y1, x2, y2, x3, y3]`.
- What do the points represent? Points `p1 = (x1, y1)` and `p2 = (x2, y2)` define a directed line from `p1` to `p2`. Point `p3 = (x3, y3)` is a test point.
- What should be returned? For each query, return:
  - `"LEFT"` if `p3` is located on the left side of the directed line.
  - `"RIGHT"` if `p3` is located on the right side of the directed line.
  - `"TOUCH"` if `p3` lies directly on the line.
- What are the constraints? Number of queries up to 10^5. Coordinates are between `-10^9` and `10^9`. `p1 != p2`.

## Examples to say out loud
- Consider `p1 = (0, 0)`, `p2 = (5, 0)`, and `p3 = (2, 3)`:
  - Directed line points along the positive x-axis.
  - Point `(2, 3)` is in the upper half-plane, which is to the left when facing from `p1` to `p2`.
  - Output: `"LEFT"`.
- If `p3 = (2, -3)`: Lies in the lower half-plane, which is to the right. Output: `"RIGHT"`.
- If `p3 = (3, 0)`: Lies directly on the ray from `p1` to `p2`. Output: `"TOUCH"`.

## Brute force
This is an orientation test in computational geometry. There are no loops or complex searches needed; calculating the 2D cross product of vector `p1 -> p2` with vector `p1 -> p3` immediately yields the orientation in O(1) time.

## The key observation
Let vector `v1 = p2 - p1 = (x2 - x1, y2 - y1)` and vector `v2 = p3 - p1 = (x3 - x1, y3 - y1)`.
The 2D cross product (or determinant) is given by:
`cross = (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1)`.
- If `cross > 0`, the angle from `v1` to `v2` is counter-clockwise, meaning `p3` is on the LEFT.
- If `cross < 0`, the turn is clockwise, meaning `p3` is on the RIGHT.
- If `cross == 0`, `v1` and `v2` are collinear, meaning `p3` touches the line (TOUCH).
Because coordinates reach 10^9, differences can be 2 * 10^9, and their products can reach 4 * 10^18, requiring 64-bit integers (`long long` in C++, `long` in Java).

## Optimal approach
1. For each query `[x1, y1, x2, y2, x3, y3]`:
2. Cast coordinates to 64-bit signed integers.
3. Compute `cross = (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1)`.
4. If `cross > 0`, record `"LEFT"`.
5. Else if `cross < 0`, record `"RIGHT"`.
6. Else (`cross == 0`), record `"TOUCH"`.
7. Return the collected results.

Complexity:
- Time complexity: O(1) time per query, or O(Q) total for `Q` queries.
- Space complexity: O(1) auxiliary space beyond the output array.

## Code walkthrough
- `long long cross = (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1)`: Evaluates the signed 2D cross product in 64-bit arithmetic to prevent overflow.
- `if (cross > 0) ans.push_back("LEFT")`: Positive cross product indicates counter-clockwise orientation (left).
- `else if (cross < 0) ans.push_back("RIGHT")`: Negative cross product indicates clockwise orientation (right).
- `else ans.push_back("TOUCH")`: Zero indicates collinearity.

## Test it out loud
- `[0, 0, 5, 0, 2, 3]`: `cross = (5 - 0) * (3 - 0) - (0 - 0) * (2 - 0) = 15 > 0` -> `"LEFT"`. Correct.
- `[0, 0, 5, 0, 2, -3]`: `cross = 5 * (-3) - 0 = -15 < 0` -> `"RIGHT"`. Correct.
- `[1, 1, 2, 2, 3, 3]`: `cross = (1) * (2) - (1) * (2) = 0` -> `"TOUCH"`. Correct.

## Follow-ups
- How does this building block support Graham scan for convex hulls? Graham scan computes the cross product of the last two hull points and the candidate point to discard right turns (non-left turns) when constructing the upper and lower convex hulls.

## Common mistakes
- Using 32-bit signed integers for the cross product, which overflows and yields incorrect signs when coordinates are up to 10^9.
- Swapping vector order `(v2 x v1)` instead of `(v1 x v2)`, which flips left and right.
