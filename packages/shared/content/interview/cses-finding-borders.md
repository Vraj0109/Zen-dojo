---
id: cses-finding-borders
pattern: cses-misc
difficulty: medium
optimal: "O(n) time and O(n) space"
reviewed: false
---

## Clarify first
- What is a border of a string? A border is a substring that is both a proper prefix and a proper suffix of the string (meaning its length is strictly less than the length of the string).
- What should be returned? All border lengths sorted in strictly increasing order.
- What if there are no borders? Return an empty list.
- What are the constraints? String length `n <= 10^6`, containing only lowercase English letters.

## Examples to say out loud
- Consider `s = "abacaba"`:
  - Prefix of length 1: `"a"`, suffix of length 1: `"a"` -> Match (length 1).
  - Prefix of length 3: `"aba"`, suffix of length 3: `"aba"` -> Match (length 3).
  - Proper prefixes of lengths 2, 4, 5, 6 do not match their corresponding suffixes.
  - Output: `[1, 3]`.
- Consider `s = "aaaa"`:
  - Length 1: `"a"`
  - Length 2: `"aa"`
  - Length 3: `"aaa"`
  - Output: `[1, 2, 3]`.
- Consider `s = "abcde"`: No proper prefix matches a proper suffix. Output: `[]`.

## Brute force
Comparing every prefix `s[0...L-1]` with the corresponding suffix `s[n-L...n-1]` for each `L` from 1 to `n - 1` takes `O(n^2)` time in the worst case (e.g. for a string of identical characters `"aaaa..."`). With `n = 10^6`, `n^2 = 10^{12}`, which will severely time out. We need a linear time algorithm.

## The key observation
The KMP prefix function (also known as the $\pi$ table or failure function) exactly computes the length of the longest proper prefix of `s[0...i]` that is also a suffix of `s[0...i]`.
In particular:
- The longest border of the entire string `s` has length `k = \pi[n - 1]`.
- What about the second longest border? Any border of `s` must itself be a border of the longest border!
- Therefore, the next border length is obtained simply by following the chain: `k = \pi[k - 1]`, continuing until `k == 0`.
This yields all border lengths in decreasing order, which we can reverse to output in ascending order.

## Optimal approach
1. Compute the KMP prefix function array `pi` of length `n`:
   - Initialize `pi[0] = 0`.
   - Maintain length `j = 0`.
   - Loop `i` from 1 to `n - 1`:
     - While `j > 0` and `s[i] != s[j]`, backtrack: `j = pi[j - 1]`.
     - If `s[i] == s[j]`, increment `j++`.
     - Assign `pi[i] = j`.
2. Trace the border chain:
   - Initialize `k = pi[n - 1]`.
   - While `k > 0`:
     - Add `k` to the results list.
     - Move to `k = pi[k - 1]`.
3. Reverse the collected list so that lengths are in increasing order.
4. Return the list.

Complexity:
- Time complexity: O(n) because computing the KMP $\pi$ array takes amortized O(n) time, and following the border chain takes at most O(n) steps.
- Space complexity: O(n) auxiliary space to store the prefix array and border lengths.

## Code walkthrough
- `vector<int> pi(n, 0)`: Standard KMP failure function array.
- `while (j > 0 && s[i] != s[j]) j = pi[j - 1]`: Backtracks on mismatch.
- `if (s[i] == s[j]) j++`: Extends matching border.
- `int k = pi[n - 1]`: Starts with the longest border of the whole string.
- `while (k > 0) { ans.push_back(k); k = pi[k - 1]; }`: Gathers all valid nested border lengths.
- `reverse(ans.begin(), ans.end())`: Sorts lengths in increasing order.

## Test it out loud
- `s = "abacaba"`: `pi[6] = 3` (`"aba"`). Next `pi[3 - 1] = pi[2] = 1` (`"a"`). Next `pi[1 - 1] = pi[0] = 0`. List is `[3, 1]`, reversed: `[1, 3]`. Correct.
- `s = "a"`: `pi[0] = 0`. List is empty `[]`. Correct.
- `s = "ababab"`: `pi[5] = 4` (`"abab"`), `pi[3] = 2` (`"ab"`), `pi[1] = 0`. Reversed: `[2, 4]`. Correct.

## Follow-ups
- How does the Z-algorithm solve this? Compute the Z-array. For any index `i` from 1 to `n - 1`, if `i + z[i] == n`, then `z[i]` is a border length! Both approaches run in O(n) time.

## Common mistakes
- Comparing strings using substrings or hashing without collision handling, which can either exceed time limits or fail on adversarial test cases.
- Forgetting to reverse the gathered chain, outputting descending instead of ascending order.
