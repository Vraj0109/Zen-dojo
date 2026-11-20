---
id: c-atc-abc150-b
pattern: cses-atcoder
difficulty: easy
optimal: "O(n) time, O(1) space"
reviewed: false
---

## Clarify first
- Are we searching for the exact contiguous substring `"ABC"`? Yes, exactly three uppercase letters in consecutive order: 'A' followed immediately by 'B' and then 'C'.
- Can occurrences overlap? The substring `"ABC"` cannot overlap with itself because the third character is 'C' while the pattern starts with 'A'.
- What are the string length bounds? Length $n$ is between 3 and 50.
- What characters are present in the string? Only uppercase English letters.

## Examples to say out loud
- Consider `s = "ZABCDBABCQ"`.
  - At index 1: `s[1..3] = "ABC"` $\to$ match 1.
  - At index 6: `s[6..8] = "ABC"` $\to$ match 2.
  Total matches: 2.
- Consider `s = "ABCABCABC"`.
  - Matches at index 0, index 3, and index 6.
  Total matches: 3.
- Edge case: `s = "ABD"` or `s = "CBA"`.
  No contiguous substring matches `"ABC"`. Result: 0.

## Brute force
A brute force approach checks every possible starting index $i$ from $0$ up to $n - 3$. At each index, we compare the 3-character slice `s[i..i+2]` with `"ABC"`. Since the length of `"ABC"` is fixed at 3, each check takes $O(1)$ comparisons, making the brute force already optimal at $O(n)$ time and $O(1)$ extra space.

## The key observation
Since the target substring has fixed length 3, a sliding window of size 3 checking `s[i] == 'A' && s[i+1] == 'B' && s[i+2] == 'C'` iterates through all potential starting positions in a single pass.

## Optimal approach
1. Initialize a counter `count = 0`.
2. Iterate an index $i$ from $0$ up to $n - 3$ (where $n$ is the length of $s$):
   - Check if $s[i] == 'A'$, $s[i + 1] == 'B'$, and $s[i + 2] == 'C'$.
   - If true, increment `count` by 1.
3. Return `count`.
4. Complexity:
   - Time Complexity: $O(n)$, since we inspect each character a constant number of times across $n - 2$ iterations.
   - Space Complexity: $O(1)$, requiring only a single integer counter.

## Code walkthrough
- `int c = 0;`: Maintain count of matching occurrences.
- `for (size_t i = 0; i + 2 < s.size(); i++)`: Iterate up to $n - 3$, ensuring `i + 2` is always within the string bounds.
- `if (s[i] == 'A' && s[i + 1] == 'B' && s[i + 2] == 'C') c++;`: Check if the 3-character window starting at index $i$ matches `"ABC"`.
- `return c;`: Return the total count.

## Test it out loud
- Test 1: `s = "ABC"` $\to$ loop runs for $i = 0$, matches `"ABC"` $\to$ returns 1.
- Test 2: `s = "ABD"` $\to$ loop runs for $i = 0$, $s[2] == 'D' \ne 'C'$ $\to$ returns 0.
- Test 3: `s = "AABBCC"` $\to$ no contiguous `"ABC"` $\to$ returns 0.
- Test 4: `s = "ABABC"` $\to$ index 2 has `"ABC"` $\to$ returns 1.

## Follow-ups
- How would you solve this if the pattern string $P$ had an arbitrary length $m$?
  For small $m$, sliding window with direct comparison takes $O(n \cdot m)$. For large $m$ and $n$, the Knuth-Morris-Pratt (KMP) algorithm or Boyer-Moore algorithm achieves $O(n + m)$ optimal time.
- What if we needed to count occurrences with up to 1 mismatch?
  In the same sliding window, count mismatches between `s[i..i+2]` and `"ABC"`; increment the total if `mismatches <= 1`.

## Common mistakes
- Index out of bounds: looping up to `s.length()` and accessing `s[i + 1]` or `s[i + 2]`. The loop must stop when `i + 2 < s.length()`.
- Using `.substring(i, i + 3)` repeatedly in memory-constrained environments, which creates short-lived string objects when character comparisons suffice.
