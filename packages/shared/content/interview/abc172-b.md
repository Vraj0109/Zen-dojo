---
id: abc172-b
pattern: cses-atcoder
difficulty: medium
optimal: "O(n) time, O(1) space"
brute: same
reviewed: false
---

## Clarify first
- What are the inputs? Two strings $s$ and $t$ of equal length.
- What operation is permitted? In one operation, you can change any single character in $s$ to any other lowercase English letter.
- What is the objective? Find the minimum number of operations to transform $s$ into $t$.
- What are the constraints? String length $n$ is between 1 and 200,000, and both strings contain only lowercase English letters.
- Are characters at different positions coupled? No, changes at position $i$ affect only position $i$.

## Examples to say out loud
- Consider `s = "cupofcoffee"` and `t = "cupofhottea"`.
  Comparing characters index by index:
  - Indices 0..4: `"cupof"` matches `"cupof"`.
  - Index 5: `'c'` vs `'h'` (diff 1).
  - Index 6: `'o'` matches `'o'`.
  - Index 7: `'f'` vs `'t'` (diff 2).
  - Index 8: `'f'` vs `'t'` (diff 3).
  - Index 9: `'e'` matches `'e'`.
  - Index 10: `'e'` vs `'a'` (diff 4).
  Total mismatches: 4. Minimum operations: 4.
- Consider `s = "a"` and `t = "a"`.
  No differences $\to$ return 0.
- Consider `s = "a"` and `t = "b"`.
  1 mismatch $\to$ return 1.

## Brute force
Because every single-character replacement affects exactly one index, each mismatch $s[i] \ne t[i]$ requires at least one operation to fix. Conversely, a single operation at position $i$ replacing $s[i]$ with $t[i]$ fixes that mismatch completely. Hence, the minimum number of operations is mathematically equal to the Hamming distance between $s$ and $t$. No simpler brute force is needed; counting mismatches directly is $O(n)$ time.

## The key observation
The problem is equivalent to computing the Hamming distance between two strings of identical length:
$\text{Hamming}(s, t) = \sum_{i=0}^{n-1} [s[i] \ne t[i]]$.
We can iterate an index $i$ from 0 to $n - 1$ in a single forward pass, incrementing a counter whenever $s[i] \ne t[i]$.

## Optimal approach
1. Initialize an integer mismatch counter `c = 0`.
2. Loop index $i$ from 0 to $n - 1$:
   - If $s[i] \ne t[i]$, increment `c++`.
3. Return `c`.
4. Complexity:
   - Time Complexity: $O(n)$, where $n$ is the length of strings $s$ and $t$. We examine each position once.
   - Space Complexity: $O(1)$, requiring only one integer counter.

## Code walkthrough
- `int c = 0;`: Counter for character differences.
- `for (size_t i = 0; i < s.size(); i++) if (s[i] != t[i]) c++;`: Single linear scan comparing characters at corresponding positions.
- `return c;`: Total operations needed.

## Test it out loud
- Test 1: `s = "a", t = "a"` $\to s[0] == t[0] \to 0$.
- Test 2: `s = "a", t = "b"` $\to s[0] \ne t[0] \to 1$.
- Test 3: `s = "abc", t = "abc"` $\to 0$.
- Test 4: `s = "abc", t = "abd"` $\to s[2] \ne t[2] \to 1$.
- Test 5: `s = "aaaa", t = "bbbb"` $\to$ all 4 positions differ $\to 4$.

## Follow-ups
- What if operations could also insert or delete characters?
  This would become the classical Levenshtein edit distance problem, solved in $O(n \times m)$ time using dynamic programming.
- What if changing character $x$ to character $y$ had a specific cost $C(x, y)$?
  If individual costs $C(x, y)$ are given, the total minimum cost is simply $\sum_{i=0}^{n-1} C(s[i], t[i])$, where $C(x, x) = 0$.

## Common mistakes
- Comparing string lengths when the problem guarantees $|s| = |t|$.
- Creating unnecessary intermediate string copies or substring objects.
