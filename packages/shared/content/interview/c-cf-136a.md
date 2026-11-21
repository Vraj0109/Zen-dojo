---
id: c-cf-136a
pattern: cses-codeforces
difficulty: easy
optimal: "O(n) time and O(n) space"
brute: same
reviewed: false
---

## Clarify first
- What does the input represent? An integer `n` and an array `p` of length `n` (1-indexed), where the `i`-th element represents the person to whom friend `i` gave a gift.
- What should the output be? An array of length `n` where the `j`-th element represents the friend who gave a gift to friend `j`.
- What are the constraints? `n` is between 1 and 100, and `p` is a valid permutation of numbers from 1 to `n`.
- Is this essentially finding the inverse of a permutation? Yes, if `giver i` gave to `receiver p_i`, then for receiver `p_i`, the giver was `i`.

## Examples to say out loud
- Consider `n = 4` and `p = [2, 3, 4, 1]`:
  - Friend 1 gave to Friend 2 -> Friend 2 received from 1.
  - Friend 2 gave to Friend 3 -> Friend 3 received from 2.
  - Friend 3 gave to Friend 4 -> Friend 4 received from 3.
  - Friend 4 gave to Friend 1 -> Friend 1 received from 4.
  - Result: `[4, 1, 2, 3]`.
- Consider `n = 3` and `p = [1, 3, 2]`:
  - Friend 1 gave to 1 -> receiver 1 got from 1.
  - Friend 2 gave to 3 -> receiver 3 got from 2.
  - Friend 3 gave to 2 -> receiver 2 got from 3.
  - Result: `[1, 3, 2]`.

## Brute force
For each recipient `j` from 1 to `n`, scan through the entire array `p` to find index `i` where `p[i] == j`. This linear scan per person takes O(n^2) total time. While `n <= 100` makes O(n^2) fast enough, an inverse permutation can be directly constructed in O(n) time by direct indexing.

## The key observation
If person `i` gave a gift to person `p[i]`, then in our result array `ans`, at index `p[i]`, the value must be `i`. Instead of searching for who gave to `j`, we can iterate through each giver `i` once and place `i` directly into `ans[p[i]]`.

## Optimal approach
1. Allocate an answer array `ans` of size `n + 1` (or size `n` with 0-based conversion).
2. Iterate `i` from 1 to `n`.
3. Let `receiver = p[i - 1]` (if `p` is 0-indexed) or `p[i]`.
4. Assign `ans[receiver] = i`.
5. Return or print the values in `ans` from 1 to `n`.

Complexity:
- Time complexity: O(n), as we perform a single pass over the `n` elements with O(1) assignments.
- Space complexity: O(n) auxiliary space to store the inverted permutation array.

## Code walkthrough
- `vector<int> ans(n + 1)`: Output array sized for 1-based indexing.
- `for (int i = 1; i <= n; i++)`: `i` represents the giver (1-based).
- `int receiver = p[i - 1]`: The recipient of giver `i`'s gift.
- `ans[receiver] = i`: Records giver `i` at the recipient's position.
- Print `ans[1]` through `ans[n]`.

## Test it out loud
- `p = [2, 3, 4, 1]`:
  - `i = 1`: `ans[2] = 1`
  - `i = 2`: `ans[3] = 2`
  - `i = 3`: `ans[4] = 3`
  - `i = 4`: `ans[1] = 4`
  - Result is `[4, 1, 2, 3]`. Correct.
- Single element `n = 1`, `p = [1]`: `ans[1] = 1`. Result `[1]`. Correct.

## Follow-ups
- How does this generalize to permutation cycle decomposition? Every permutation can be decomposed into disjoint cycles; inverting the permutation simply reverses the direction of every cycle.

## Common mistakes
- Confusing 0-based array indexing with 1-based person indices.
- Inverting the assignment by doing `ans[i] = p[i]`, which leaves the original permutation unchanged.
