---
id: c-kattis-nastyhacks
pattern: cses-kattis
difficulty: easy
optimal: "O(1) time and O(1) space per test case"
reviewed: false
---

## Clarify first
- What are the inputs? An integer `n` denoting the number of test cases, followed by `n` lines, each containing three integers:
  - `r`: expected revenue if not advertising.
  - `e`: expected revenue if advertising.
  - `c`: cost of advertising.
- What should be output for each case?
  - `"advertise"` if advertising yields strictly higher profit.
  - `"do not advertise"` if not advertising yields strictly higher profit.
  - `"does not matter"` if both choices yield the exact same profit.
- What are the constraints? `1 <= n <= 100`, and `-10^6 <= r, e <= 10^6`, `0 <= c <= 10^6`.

## Examples to say out loud
- Consider `r = 0, e = 100, c = 70`:
  - Profit without advertising = `0`.
  - Profit with advertising = `100 - 70 = 30`.
  - Since `30 > 0`, output `"advertise"`.
- Consider `r = 100, e = 130, c = 30`:
  - Profit without advertising = `100`.
  - Profit with advertising = `130 - 30 = 100`.
  - Since profits are equal, output `"does not matter"`.

## Brute force
This is an evaluation of a straightforward arithmetic comparison. Computing the net profit for advertising and comparing it against the revenue without advertising takes O(1) arithmetic operations. There is no simpler or brute force alternative.

## The key observation
The net profit with advertising is `net = e - c`.
We compare `net` directly with `r`:
- If `net > r` (or `e - c > r`), advertising is strictly better.
- If `net < r` (or `e - c < r`), not advertising is strictly better.
- If `net == r`, it does not matter.

## Optimal approach
1. For each test case, read `r`, `e`, and `c`.
2. Compute net advertising profit: `net = e - c`.
3. If `net > r`, return `"advertise"`.
4. Else if `net < r`, return `"do not advertise"`.
5. Else, return `"does not matter"`.

Complexity:
- Time complexity: O(1) time per test case, or O(n) total across all `n` test cases.
- Space complexity: O(1) auxiliary space.

## Code walkthrough
- `int net = e - c`: Computes net advertising revenue after deducting costs.
- `if (net > r) cout << "advertise\n"`: Identifies when advertising increases profit.
- `else if (net < r) cout << "do not advertise\n"`: Identifies when cost outweighs revenue gain.
- `else cout << "does not matter\n"`: Identifies equal profit outcomes.

## Test it out loud
- `r = 0, e = 100, c = 70`: `100 - 70 = 30 > 0` -> `"advertise"`. Correct.
- `r = 100, e = 130, c = 30`: `130 - 30 = 100 == 100` -> `"does not matter"`. Correct.
- `r = -500, e = -700, c = 1000`: `-700 - 1000 = -1700 < -500` -> `"do not advertise"`. Correct.

## Follow-ups
- How to avoid potential 32-bit integer overflow if inputs could be up to 10^18? In C++, use 64-bit integers (`long long`), or rearrange `e - c > r` to `e - r > c` (watching for potential sign extremes).

## Common mistakes
- Misspelling the exact string literals required by the judge (e.g. typing "don't advertise" instead of "do not advertise").
- Forgetting to deduct the cost `c` from advertising revenue `e`.
