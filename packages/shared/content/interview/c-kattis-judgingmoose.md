---
id: c-kattis-judgingmoose
pattern: cses-kattis
difficulty: easy
optimal: "O(1) time and O(1) space"
brute: same
reviewed: false
---

## Clarify first
- What are the inputs? Two non-negative integers `l` and `r` representing the number of tines on the left and right antlers of a moose.
- What are the rules for determining the age and type of the moose?
  - If `l == 0` and `r == 0`, the animal is not a moose (output `"Not a moose"`).
  - If `l == r`, the moose is an "Even moose" of age `2 * l` (or `l + r`). Output `"Even <2 * l>"`.
  - If `l != r`, the moose is an "Odd moose" of age `2 * max(l, r)` (because an older moose may have broken off some tines). Output `"Odd <2 * max(l, r)>"`.
- What are the constraints? `0 <= l, r <= 20`.

## Examples to say out loud
- Consider `l = 2, r = 3`:
  - `l != r`, so it is an odd moose.
  - The maximum tine count is `max(2, 3) = 3`.
  - The estimated age is `2 * 3 = 6`.
  - Output: `"Odd 6"`.
- Consider `l = 3, r = 3`:
  - `l == r > 0`, so it is an even moose.
  - The age is `3 + 3 = 6`.
  - Output: `"Even 6"`.
- Consider `l = 0, r = 0`:
  - Both are 0, so output `"Not a moose"`.

## Brute force
This problem directly maps to three basic conditional checks with no loops or algorithmic complexity. Executing the conditionals takes O(1) operations.

## The key observation
If both antler tine counts are zero, there are no antlers, meaning it cannot be a moose. If the counts are equal, symmetry indicates an even moose whose age is the sum of both antlers (`2 * l`). If the counts are unequal, the moose must have had at least `max(l, r)` tines on both sides before damage, meaning it is an odd moose of age `2 * max(l, r)`.

## Optimal approach
1. Read integers `l` and `r`.
2. If `l == 0 && r == 0`:
   - Output `"Not a moose"`.
3. Else if `l == r`:
   - Output `"Even "` followed by `2 * l`.
4. Else:
   - Output `"Odd "` followed by `2 * max(l, r)`.

Complexity:
- Time complexity: O(1) for constant-time conditional checks.
- Space complexity: O(1) auxiliary space.

## Code walkthrough
- `if (l == 0 && r == 0) cout << "Not a moose\n";`: Detects the zero-tine edge case.
- `else if (l == r) cout << "Even " << 2 * l << "\n";`: Handles symmetrical antlers.
- `else cout << "Odd " << 2 * max(l, r) << "\n";`: Handles asymmetrical antlers using twice the maximum tine count.

## Test it out loud
- `l = 2, r = 3`: `l != r`, `max(2, 3) = 3` -> `"Odd 6"`. Correct.
- `l = 3, r = 3`: `l == r`, `2 * 3 = 6` -> `"Even 6"`. Correct.
- `l = 0, r = 0`: Handled by first branch -> `"Not a moose"`. Correct.
- `l = 0, r = 5`: `max(0, 5) = 5` -> `"Odd 10"`. Correct.

## Follow-ups
- How to extend this if tines could break off from both sides? Without bounds on broken tines, any tine count `(l, r)` with `max(l, r) > 0` could represent a moose of age at least `2 * max(l, r)`.

## Common mistakes
- Forgetting the special case where both `l == 0` and `r == 0`, incorrectly classifying it as `"Even 0"`.
- Using `l + r` instead of `2 * max(l, r)` for odd moose.
