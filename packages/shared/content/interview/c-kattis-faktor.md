---
id: c-kattis-faktor
pattern: cses-kattis
difficulty: easy
optimal: "O(1) time and O(1) space"
reviewed: false
---

## Clarify first
- What are the inputs? Two integers `A` and `I`.
  - `A`: The number of scientific articles to publish.
  - `I`: The target impact factor to achieve.
- How is the impact factor calculated? The impact factor is `ceil(total_citations / A)`.
- What is the goal? Find the minimum total number of citations needed so that the resulting impact factor is at least `I`.
- What are the constraints? `1 <= A, I <= 100`.

## Examples to say out loud
- Consider `A = 38, I = 24`:
  - To have `ceil(citations / 38) == 24`, the ratio `citations / 38` must be strictly greater than 23 (i.e. `citations / 38 > 23`).
  - The smallest integer `citations` strictly greater than `38 * 23` is `38 * 23 + 1 = 874 + 1 = 875`.
  - Let us verify: `875 / 38 = 23.026...`, and `ceil(23.026) = 24`.
- Consider `A = 1, I = 100`:
  - `1 * (100 - 1) + 1 = 1 * 99 + 1 = 100`.
  - `100 / 1 = 100`. Output is 100.

## Brute force
One could iterate `citations` starting from 1 upwards, computing `(citations + A - 1) / A` until the result equals `I`. However, arithmetic algebra gives the answer directly in a single step with zero loop overhead.

## The key observation
Since impact factor rounds up:
`ceil(C / A) = I` requires `I - 1 < C / A <= I`.
To minimize integer citations `C`, we need `C / A > I - 1`, which means:
`C > A * (I - 1)`.
The smallest integer strictly greater than `A * (I - 1)` is exactly:
`C_min = A * (I - 1) + 1`.

## Optimal approach
1. Read integers `A` and `I`.
2. Compute `A * (I - 1) + 1`.
3. Return or print the result.

Complexity:
- Time complexity: O(1) as this is a single constant-time arithmetic formula.
- Space complexity: O(1) auxiliary space.

## Code walkthrough
- `int ans = A * (I - 1) + 1`: Evaluates the minimum citation threshold.
- `cout << ans << "\n"`: Outputs the computed answer.

## Test it out loud
- `A = 38, I = 24`: `38 * (24 - 1) + 1 = 38 * 23 + 1 = 874 + 1 = 875`. Correct.
- `A = 1, I = 100`: `1 * 99 + 1 = 100`. Correct.
- `A = 10, I = 1`: `10 * (1 - 1) + 1 = 10 * 0 + 1 = 1`. Indeed, `ceil(1 / 10) = 1`. Correct.

## Follow-ups
- What if the impact factor rounded to the nearest integer instead of ceiling? Then we would need `C / A >= I - 0.5`, leading to `C >= ceil(A * (I - 0.5))`.

## Common mistakes
- Computing `A * I`, which yields the maximum citations for impact factor `I` rather than the minimum.
- Forgetting the `+ 1` offset after calculating `A * (I - 1)`.
