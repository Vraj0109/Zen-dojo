---
id: c-cf-266a
pattern: cses-codeforces
difficulty: easy
optimal: "O(n) time, O(1) space"
brute: same
reviewed: false
---

## Clarify first
- What colors do the stones have? Only 'R' (red), 'G' (green), and 'B' (blue).
- What is the goal? Minimize the number of removed stones such that no two adjacent stones in the row have the same color.
- Does removing a stone bring its adjacent neighbors into contact? Yes, if a stone is removed, its left and right neighbors become adjacent.
- What are the constraints on the length of the row? Between 1 and 50 stones.

## Examples to say out loud
- Consider `s = "RRG"`.
  The first two stones are both 'R'. Removing one 'R' leaves `"RG"`, where adjacent colors differ.
  Result: 1 removal.
- Consider `s = "RRRRR"`.
  All 5 stones are 'R'. Only 1 stone can remain.
  Result: $5 - 1 = 4$ removals.
- Consider `s = "RGB"`.
  No two adjacent stones share a color.
  Result: 0 removals.

## Brute force
A brute force search could simulate removing subsets of stones: generate all $2^n$ subsequences, check if any adjacent duplicate colors exist, and find the maximum valid subsequence length $k$, answering $n - k$. With $n \le 50$, $2^{50} \approx 10^{15}$ operations would time out. However, a simple greedy observation makes this solvable in a single pass.

## The key observation
Consider a maximal contiguous block of identical colors of length $L$.
To prevent adjacent duplicates within that block, at most one stone can be preserved from it; the remaining $L - 1$ stones must be removed.
Furthermore, removing identical stones from a single run never brings two identical colors from different runs into contact, because adjacent runs by definition have different colors.
Therefore, the minimum number of removals is simply the sum of $(L - 1)$ across all runs, which is mathematically identical to counting every index $i \ge 1$ where $s[i] == s[i - 1]$.

## Optimal approach
1. Initialize a counter `removals = 0`.
2. Iterate through index $i$ from 1 to $n - 1$ (where $n$ is the length of $s$):
   - If $s[i] == s[i - 1]$, increment `removals` by 1.
3. Return `removals`.
4. Complexity:
   - Time Complexity: $O(n)$, making a single linear scan over the string.
   - Space Complexity: $O(1)$, using only one integer counter.

## Code walkthrough
- `int c = 0;`: Counter for stones that must be discarded.
- `for (size_t i = 1; i < s.size(); i++)`: Scan through adjacent pairs from left to right.
- `if (s[i] == s[i - 1]) c++;`: If two adjacent stones match, one of them must be removed.
- `return c;`: Return total removals.

## Test it out loud
- Test 1: `s = "R"` $\to$ loop does not execute $\to$ returns 0. Correct.
- Test 2: `s = "RG"` $\to$ $s[1] \ne s[0] \to$ returns 0. Correct.
- Test 3: `s = "RRGGBB"` $\to$ matches at $i=1$ ('R'), $i=3$ ('G'), $i=5$ ('B') $\to$ returns 3. Correct.
- Test 4: `s = "RGRGRG"` $\to$ alternating colors, no matches $\to$ returns 0. Correct.

## Follow-ups
- What if removing a stone had a cost $C[i]$ associated with it?
  For each consecutive run of identical colors, we must keep exactly one stone. To minimize removal cost, we greedily keep the stone with the maximum cost in that run and remove all other stones.
- What if cyclic adjacency was required (the first and last stones are also adjacent)?
  Count adjacent pairs as before, and if the remaining string has length $> 1$ and matching ends, remove one additional stone.

## Common mistakes
- Starting loop at index 0 and comparing with $i + 1$ without properly guarding against out-of-bounds indices.
- Thinking that removing stones can cause new adjacent duplicates between distant groups; since groups were separated by a different color, removing inside a group never merges disjoint groups of the same color.
