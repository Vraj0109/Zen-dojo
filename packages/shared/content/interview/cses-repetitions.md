---
id: cses-repetitions
pattern: cses-introductory
difficulty: medium
optimal: "O(n) time and O(1) space"
reviewed: false
---

## Clarify first
- What characters does the input string contain? Only the uppercase characters A, C, G, and T.
- What is the length bounds of the string? The length $n$ is between $1$ and $10^6$.
- What is the minimum possible return value? Because the string has length at least $1$, the answer is at least $1$.
- Is extra memory allowed? We should aim for $O(1)$ auxiliary space since we only need to scan the string.

## Examples to say out loud
- Consider $s = \text{"ATTCGGGA"}$:
  - Index 0: 'A', run length is 1, max is 1.
  - Index 1: 'T', different from 'A', run resets to 1.
  - Index 2: 'T', matches 'T', run becomes 2, max is 2.
  - Index 3: 'C', resets run to 1.
  - Index 4: 'G', resets run to 1.
  - Index 5: 'G', matches 'G', run becomes 2.
  - Index 6: 'G', matches 'G', run becomes 3, max is 3.
  - Index 7: 'A', resets run to 1.
  - Result: 3 (from run "GGG").
- Edge case: $s = \text{"A"}$. Only one character, loop from index 1 never executes, answer is 1.

## Brute force
A brute-force solution would check every pair of start and end indices $(i, j)$, verifying whether all characters between $i$ and $j$ are identical, and finding the maximum length $j - i + 1$. There are $O(n^2)$ substrings, and checking each takes up to $O(n)$ time, yielding an $O(n^3)$ approach. Even if optimized to expand around each start position, it takes $O(n^2)$ time, which TLEs when $n = 10^6$. We can solve it in a single linear pass.

## The key observation
A contiguous repetition continues as long as the current character matches the immediately preceding character. If it matches, the current streak increases by 1; if it differs, a new run begins with length 1. Tracking the running length and its running maximum across a single pass gives the optimal answer without looking back.

## Optimal approach
1. Initialize `best = 1` and `run = 1`.
2. Iterate through the string from index $1$ to $n - 1$:
   - If $s[i] == s[i - 1]$, increment `run` by 1.
   - Otherwise, reset `run` to 1.
   - Update `best = max(best, run)`.
3. Return `best`.

Complexity:
- Time: $O(n)$ as we inspect each character exactly once.
- Space: $O(1)$ auxiliary space using two integer variables.

## Code walkthrough
- `int best = 1, run = 1`: Sets baseline count for non-empty strings.
- `for (size_t i = 1; i < s.size(); i++)`: Begins at the second character so we can safely compare with the predecessor at index $i - 1$.
- `run = (s[i] == s[i - 1]) ? run + 1 : 1`: Extends run length if adjacent characters match, or starts a new streak of 1 otherwise.
- `best = max(best, run)`: Tracks the longest run seen anywhere in the string up to this point.

## Test it out loud
- Test case $1$: $s = \text{"A"}$. Length is 1, loop does not run, returns 1.
- Test case $2$: $s = \text{"AAAA"}$. Run counts: $1 \to 2 \to 3 \to 4$. Max is 4.
- Test case $3$: $s = \text{"ACGT"}$. No adjacent duplicates; run remains 1 throughout, returns 1.
- Test case $4$: $s = \text{"AACCC"}$. Best becomes 2 during "AA", then 3 during "CCC", returns 3.

## Follow-ups
- What if the string is streamed character by character? We only need the previous character and two integers (`run` and `best`). The space remains $O(1)$ and runs online.
- How would we return the substring or character that achieved the maximum run? Store a `best_char` alongside `best`, updating `best_char = s[i]` whenever `run > best`.

## Common mistakes
- Initializing `best = 0`: While it often gets updated to 1 on the first comparison, for a single-character string like "A", the loop never runs and would incorrectly return 0.
- Forgetting to reset `run` to 1: Resetting to 0 when characters differ results in undercounting subsequent runs by 1.
- Boundary indexing errors: Starting the loop at index 0 and checking $s[i - 1]$ causes an out-of-bounds access.

## Further reading
- [Run-Length Encoding on Wikipedia](https://en.wikipedia.org/wiki/Run-length_encoding)
