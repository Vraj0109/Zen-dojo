---
id: cses-finding-periods
pattern: cses-misc
difficulty: medium
optimal: "O(n) time and O(n) space"
reviewed: false
---

## Clarify first
- What defines a period of a string `s`? An integer `p` (`1 <= p <= n`) such that `s[i] == s[i + p]` for all `0 <= i < n - p`.
- Does the string need to repeat a whole number of times? No, the final repetition can be incomplete (a prefix of the period). For example, for `"abacaba"`, `p = 4` is a period because `"abacaba"` is `"abac"` followed by `"aba"` (the first 3 letters of `"abac"`).
- Is `n` always a valid period? Yes, for `p = n`, the condition `0 <= i < n - n = 0` is vacuously true.
- What should be output? All valid periods in strictly increasing order.
- What are the constraints? `1 <= n <= 10^6`, with lowercase English letters.

## Examples to say out loud
- Consider `s = "abacaba"` of length 7:
  - `p = 4`: `s[0...2] == s[4...6]` (`"aba" == "aba"`), valid.
  - `p = 6`: `s[0] == s[6]` (`'a' == 'a'`), valid.
  - `p = 7`: Entire length, valid.
  - Periods: `[4, 6, 7]`.
- Consider `s = "aaaa"` of length 4:
  - Every `p` from 1 to 4 satisfies `s[i] == s[i + p]`.
  - Periods: `[1, 2, 3, 4]`.
- Consider `s = "abcde"`:
  - No characters match with offset, so only `p = 5` works.
  - Periods: `[5]`.

## Brute force
For each candidate period `p` from 1 to `n - 1`, verify if `s[i] == s[i + p]` for all `0 <= i < n - p`. In the worst case (e.g. `"aaaa..."`), this does `sum_{p=1}^{n} (n - p) = O(n^2)` comparisons. With `n = 10^6`, `O(n^2)` operations will exceed the time limit. We need an O(n) approach.

## The key observation
Look closely at the definition: `s[i] == s[i + p]` for all `0 <= i < n - p`.
This means the suffix of `s` starting at index `p` (which has length `n - p`) must exactly match the prefix of `s` of length `n - p`!
This is precisely what the **Z-algorithm** computes:
`z[p]` is defined as the length of the longest common prefix between `s` and the suffix starting at `p`.
Therefore, `p` is a valid period if and only if `z[p] >= n - p`!
Since the Z-algorithm computes the entire `z` array in linear O(n) time, we can test all `p` in O(1) each.

## Optimal approach
1. Compute the Z-array `z` for string `s`:
   - Initialize `z` array of size `n` with 0, and window `[l, r] = [0, 0]`.
   - Loop `i` from 1 to `n - 1`:
     - If `i < r`, set `z[i] = min(r - i, z[i - l])`.
     - While `i + z[i] < n` and `s[z[i]] == s[i + z[i]]`, increment `z[i]`.
     - If `i + z[i] > r`, update `l = i` and `r = i + z[i]`.
2. Initialize `ans` array.
3. For `p` from 1 to `n - 1`:
   - If `z[p] >= n - p`, add `p` to `ans`.
4. Always add `n` to `ans` (the entire string is always a period).
5. Return `ans`.

Complexity:
- Time complexity: O(n) because the Z-algorithm runs in O(n) time (each character comparison either expands `r` or ends the loop), and scanning `p` from 1 to `n` takes O(n).
- Space complexity: O(n) auxiliary space to store the Z-array and the result list.

## Code walkthrough
- `vector<int> z(n, 0)`: Stores length of longest prefix match starting at each index.
- Standard Z-box optimization: Maintains active matched interval `[l, r]` to skip redundant comparisons.
- `if (z[p] >= n - p) ans.push_back(p)`: Tests whether the suffix of length `n - p` matches the prefix of length `n - p`.
- `ans.push_back(n)`: Appends the trivial period `n`.

## Test it out loud
- `s = "abacaba"` (len 7):
  - `z[4] = 3`. `n - p = 7 - 4 = 3`. Since `3 >= 3`, `p = 4` is a period.
  - `z[6] = 1`. `n - p = 7 - 6 = 1`. Since `1 >= 1`, `p = 6` is a period.
  - `p = 7` is appended.
  - Output: `[4, 6, 7]`. Correct.
- `s = "abcde"`: `z[p] = 0` for all `p > 0`. Only `p = 5` is added. Output: `[5]`. Correct.

## Follow-ups
- How does period relate to string borders? If a string has a border of length `b`, then `n - b` is a period of the string! Thus, finding all periods is dual to finding all borders.

## Common mistakes
- Assuming `n` must be divisible by `p`; periods in string algorithms do not require complete repetitions.
- Forgetting to append `n` at the end as a valid period.
