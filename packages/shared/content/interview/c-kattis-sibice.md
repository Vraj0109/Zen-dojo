---
id: c-kattis-sibice
pattern: cses-kattis
difficulty: easy
optimal: "O(n) time and O(1) space"
brute: same
reviewed: false
---

## Clarify first
- What are the inputs?
  - `n`: number of matches on the floor.
  - `w`: width of the rectangular box.
  - `h`: height of the rectangular box.
  - Followed by `n` integers representing the length of each match.
- What determines if a match fits in the box? A match can fit on the bottom of the box flatly or along the diagonal.
- What is the maximum length of a match that can fit? The maximum length is the diagonal of the box: `sqrt(w^2 + h^2)`.
- What should be output? For each match, print `"DA"` (Croatian for yes) if it fits, or `"NE"` (no) if it does not fit.
- What are the constraints? `1 <= n <= 50`, `1 <= w, h <= 1000`, match lengths up to 1000.

## Examples to say out loud
- Consider `w = 3, h = 4`. The diagonal length is `sqrt(3^2 + 4^2) = sqrt(25) = 5`.
  - Match length 5: fits along diagonal -> `"DA"`.
  - Match length 6: `6 > 5` -> does not fit -> `"NE"`.
  - Match length 3: fits along width -> `"DA"`.

## Brute force
For each match length `L`, we check if `L^2 <= w^2 + h^2`. Testing each match against this fixed threshold takes O(1) time per match, so across `n` matches the overall runtime is O(n). There is no brute force vs optimal dichotomy here.

## The key observation
The longest straight line segment that fits on the floor of a rectangle with dimensions `w` and `h` is its diagonal. By the Pythagorean theorem, the maximum length is `sqrt(w^2 + h^2)`. To avoid floating point inaccuracies, we can compare squared values directly: `L * L <= w * w + h * h`.

## Optimal approach
1. Read `n, w, h`.
2. Compute `max_sq = w * w + h * h`.
3. Loop `n` times:
   - Read match length `L`.
   - If `L * L <= max_sq`, print `"DA"`.
   - Otherwise, print `"NE"`.

Complexity:
- Time complexity: O(n) where `n <= 50`, taking O(1) operations per match.
- Space complexity: O(1) auxiliary space as each match length is processed immediately.

## Code walkthrough
- `int max_sq = w * w + h * h`: Computes squared diagonal length using integer arithmetic.
- `while (n--)`: Iterates through each match.
- `int L; cin >> L;`: Reads current match length.
- `if (L * L <= max_sq) cout << "DA\n"; else cout << "NE\n";`: Compares squared lengths to avoid floating point square roots.

## Test it out loud
- `w = 3, h = 4, max_sq = 25`:
  - `L = 5`: `5 * 5 = 25 <= 25` -> `"DA"`. Correct.
  - `L = 6`: `6 * 6 = 36 > 25` -> `"NE"`. Correct.
  - `L = 4`: `16 <= 25` -> `"DA"`. Correct.

## Follow-ups
- What if the box is 3D with dimensions `w, h, d`? The maximum space diagonal is `sqrt(w^2 + h^2 + d^2)`, and we would compare `L^2 <= w^2 + h^2 + d^2`.

## Common mistakes
- Only checking if `L <= w` or `L <= h`, forgetting that a match can be placed diagonally.
- Using floating-point square root without epsilon tolerance, which can lead to precision errors when `L` matches the exact diagonal. Comparing squared integers avoids this completely.
