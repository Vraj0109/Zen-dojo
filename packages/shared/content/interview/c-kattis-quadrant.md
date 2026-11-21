---
id: c-kattis-quadrant
pattern: cses-kattis
difficulty: easy
optimal: "O(1) time and O(1) space"
brute: same
reviewed: false
---

## Clarify first
- What are the inputs? Two non-zero integers `x` and `y`, each given on a separate line.
- What do `x` and `y` represent? The Cartesian coordinates of a point `(x, y)`.
- What are the standard quadrant numbers?
  - Quadrant 1: `x > 0` and `y > 0`
  - Quadrant 2: `x < 0` and `y > 0`
  - Quadrant 3: `x < 0` and `y < 0`
  - Quadrant 4: `x > 0` and `y < 0`
- What are the constraints? `-1000 <= x, y <= 1000`, with `x != 0` and `y != 0`.

## Examples to say out loud
- Input: `x = 10, y = 6`: Both coordinates are positive, so this is Quadrant 1.
- Input: `x = 9, y = -13`: `x > 0` and `y < 0`, which is Quadrant 4.
- Input: `x = -12, y = 5`: `x < 0` and `y > 0`, which is Quadrant 2.
- Input: `x = -12, y = -5`: Both negative, which is Quadrant 3.

## Brute force
This problem requires determining the quadrant of a single 2D point based on the signs of `x` and `y`. There is no loop or search needed; a simple conditional branch executes in O(1) time.

## The key observation
We can directly branch based on the signs of `x` and `y`. If `x > 0`, the quadrant is either 1 (if `y > 0`) or 4 (if `y < 0`). If `x < 0`, the quadrant is either 2 (if `y > 0`) or 3 (if `y < 0`).

## Optimal approach
1. Read integers `x` and `y`.
2. Check if `x > 0`:
   - If `y > 0`, output 1.
   - Else, output 4.
3. Otherwise (`x < 0`):
   - If `y > 0`, output 2.
   - Else, output 3.

Complexity:
- Time complexity: O(1) as at most two sign checks are executed.
- Space complexity: O(1) auxiliary space.

## Code walkthrough
- `if (x > 0)`: Focuses on the right half of the Cartesian plane.
  - `cout << (y > 0 ? 1 : 4) << "\n"`: Distinguishes between upper-right and lower-right quadrants.
- `else`: Focuses on the left half of the Cartesian plane.
  - `cout << (y > 0 ? 2 : 3) << "\n"`: Distinguishes between upper-left and lower-left quadrants.

## Test it out loud
- `x = 12, y = 5`: `x > 0, y > 0` -> 1. Correct.
- `x = -12, y = 5`: `x < 0, y > 0` -> 2. Correct.
- `x = -12, y = -5`: `x < 0, y < 0` -> 3. Correct.
- `x = 12, y = -5`: `x > 0, y < 0` -> 4. Correct.

## Follow-ups
- How to handle axis points if `x == 0` or `y == 0` were possible? We would add explicit checks returning 0, or reporting which specific axis (positive/negative X or Y axis, or origin) the point lies on.

## Common mistakes
- Confusing quadrant numbering order (counter-clockwise starting from upper right: Q1 top-right, Q2 top-left, Q3 bottom-left, Q4 bottom-right).
