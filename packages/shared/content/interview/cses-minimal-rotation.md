---
id: cses-minimal-rotation
pattern: cses-misc
difficulty: medium
optimal: "O(n) time and O(n) space"
reviewed: false
---

## Clarify first
- What is a rotation of a string? A cyclic shift formed by moving some number of characters from the front to the end of the string.
- What should be returned? The lexicographically minimal string among all `n` possible cyclic rotations.
- What characters appear in the string? Only lowercase English letters `a`-`z`.
- What are the constraints? String length `n <= 10^6`.

## Examples to say out loud
- Consider `s = "acabaca"` of length 7:
  - Rotations include `"acabaca"`, `"cabacaa"`, `"abacaac"`, `"bacaaca"`, `"acaacab"`, `"caacaba"`, `"aacabac"`.
  - The lexicographically smallest is `"aacabac"` (starting at index 5: `s[5...6] + s[0...4]`).
- Consider `s = "ba"`:
  - Rotations are `"ba"` and `"ab"`. Smallest is `"ab"`.
- Consider `s = "abab"`:
  - Rotations are `"abab"` and `"baba"`. Smallest is `"abab"`.

## Brute force
Generating all `n` rotations and comparing them lexicographically requires `O(n^2)` time in the worst case (e.g. `"aaaa...ab"`). For `n = 10^6`, `n^2 = 10^{12}`, which will easily exceed the 1.0 second execution limit. We need an algorithm that finds the minimal rotation in linear O(n) time.

## The key observation
If we double the string `S = s + s`, every cyclic rotation of `s` corresponds to a contiguous substring of length `n` in `S`.
Finding the lexicographically minimal rotation is equivalent to finding the starting index `k` (`0 <= k < n`) such that `S[k...k+n-1]` is lexicographically smallest.
**Booth's algorithm** (or **Duval's algorithm** based on Lyndon factorization) finds this starting index in strictly O(n) time by maintaining two pointers and a failure function, skipping redundant starting positions whenever a comparison mismatch occurs.

## Optimal approach
1. Let `S = s + s`. The length of `S` is `2n`.
2. Initialize failure function table `f` of size `2n` with `-1`.
3. Maintain current best starting index `k = 0`.
4. Iterate `j` from 1 to `2n - 1`:
   - Let `i = f[j - k - 1]`.
   - While `i != -1` and `S[j] != S[k + i + 1]`:
     - If `S[j] < S[k + i + 1]`, update `k = j - i - 1`.
     - Set `i = f[i]`.
   - If `i == -1` and `S[j] != S[k + i + 1]`:
     - If `S[j] < S[k + i + 1]`, update `k = j`.
     - Set `f[j - k] = -1`.
   - Else:
     - Set `f[j - k] = i + 1`.
5. The minimal rotation starts at index `k`. Extract substring `S[k...k+n-1]`.
6. Return the extracted substring.

Complexity:
- Time complexity: O(n) because each character comparison advances either the index `j` or shifts the starting index `k`, performing at most 4n character comparisons.
- Space complexity: O(n) auxiliary space to store the doubled string and failure array `f`.

## Code walkthrough
- `string S = s + s`: Concatenates the string with itself so all cyclic shifts are contiguous substrings.
- `vector<int> f(2 * n, -1)`: Stores the failure function for prefix matching inside Booth's algorithm.
- `int k = 0`: Tracks the candidate starting index for the lexicographically smallest rotation.
- Loop `j`: Advances through the doubled string comparing characters against the candidate rotation.
- `if (S[j] < S[k + i + 1]) k = ...`: Updates `k` whenever a strictly smaller character sequence is encountered.
- `return S.substr(k, n)`: Returns the minimal rotation of length `n`.

## Test it out loud
- `s = "ba"`: `S = "baba"`. Booth's algorithm shifts `k` from 0 to 1 when `'a' < 'b'`. Substring `S[1...2]` is `"ab"`. Correct.
- `s = "cba"`: `k` shifts to 2 (pointing at `'a'`). Substring is `"acb"`. Correct.
- `s = "aaaa"`: Identical characters, `k` remains 0. Substring is `"aaaa"`. Correct.

## Follow-ups
- How does Duval's Lyndon factorization algorithm compare? Duval's algorithm finds the Lyndon word starting at index 0 and advances pointers without needing an explicit failure array, using only O(1) extra memory beyond the doubled string. Both run in linear time.

## Common mistakes
- Comparing all rotations naively with `std::min` or sorting suffixes, leading to O(n^2) or O(n log^2 n) which is too slow or consumes too much memory for `n = 10^6`.
- Forgetting to double the string or taking a substring of the wrong length.
