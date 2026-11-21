---
id: abc177-b
pattern: cses-atcoder
difficulty: medium
optimal: "O(|s| * |t|) time, O(1) space"
brute: same
reviewed: false
---

## Clarify first
- What are the inputs? Two strings $s$ and $t$, with $|t| \le |s|$.
- What operation can be performed? In one operation, you can change any single character of $s$ into any other lowercase English letter.
- What is the goal? Find the minimum number of character changes so that $t$ appears as a contiguous substring of $s$.
- What are the constraints? $1 \le |t| \le |s| \le 1000$, and both strings contain only lowercase English letters.
- Can $t$ match anywhere inside $s$? Yes, $t$ can start at any valid 0-based index $i$ such that $0 \le i \le |s| - |t|$.

## Examples to say out loud
- Consider `s = "cabacc"` and `t = "abc"`.
  - Align $t$ at index 0 (`"cab"` vs `"abc"`):
    'c' vs 'a', 'a' vs 'b', 'b' vs 'c' $\to$ 3 mismatches.
  - Align $t$ at index 1 (`"aba"` vs `"abc"`):
    'a' matches 'a', 'b' matches 'b', 'a' vs 'c' $\to$ 1 mismatch.
  - Align $t$ at index 2 (`"bac"` vs `"abc"`):
    'b' vs 'a', 'a' vs 'b', 'c' matches 'c' $\to$ 2 mismatches.
  - Align $t$ at index 3 (`"acc"` vs `"abc"`):
    'a' matches 'a', 'c' vs 'b', 'c' matches 'c' $\to$ 1 mismatch.
  The minimum operations needed is 1 (e.g. changing $s[3]$ from 'a' to 'c' to make `"abc"` at index 1).
  Result: 1.
- Consider `s = "codeforces"` and `t = "atcoder"`.
  The minimum mismatches at any alignment is 6 $\to$ returns 6.

## Brute force
A brute force approach tests every possible starting position $i$ in $s$ where $t$ could align ($0 \le i \le |s| - |t|$). For each starting offset $i$, we compare the slice $s[i \dots i + |t| - 1]$ against $t$ and count the number of mismatched characters. Since $|s|, |t| \le 1000$, there are at most 1001 offsets and each takes at most 1000 comparisons, totaling at most $10^6$ operations. This brute force sliding window is already optimal in time and space.

## The key observation
If $t$ is placed to match the substring of $s$ starting at index $i$, any position $j \in [0, |t| - 1]$ where $s[i + j] \ne t[j]$ must be altered to match $t[j]$.
The cost to place $t$ at starting index $i$ is:
$\text{cost}(i) = \sum_{j=0}^{|t|-1} [s[i + j] \ne t[j]]$.
The overall minimum operations is simply:
$\min_{0 \le i \le |s| - |t|} \text{cost}(i)$.

## Optimal approach
1. Let $m = |t|$ and $n = |s|$.
2. Initialize `best = m` (the maximum possible changes is changing every character of $t$).
3. Loop starting index $i$ from 0 to $n - m$:
   - Initialize mismatch counter `c = 0`.
   - Loop offset $j$ from 0 to $m - 1$:
     - If $s[i + j] \ne t[j]$, increment `c++`.
   - Update `best = min(best, c)`.
4. Return `best`.
5. Complexity:
   - Time Complexity: $O(|s| \cdot |t|)$, running at most $(|s| - |t| + 1) \times |t| \le 10^6$ character comparisons, which runs in ~2 milliseconds in C++.
   - Space Complexity: $O(1)$ auxiliary space.

## Code walkthrough
- `int best = t.size();`: Upper bound for needed changes.
- `for (size_t i = 0; i + t.size() <= s.size(); i++)`: Slide $t$ over every valid starting index in $s$.
- `for (size_t j = 0; j < t.size(); j++) if (s[i + j] != t[j]) c++;`: Count characters that must be rewritten for this alignment.
- `best = min(best, c);`: Track the minimum changes across all alignments.
- `return best;`: Return the minimal operations.

## Test it out loud
- Test 1: `s = "a", t = "a"` $\to i = 0$, mismatches = 0 $\to$ returns 0.
- Test 2: `s = "a", t = "b"` $\to i = 0$, mismatches = 1 $\to$ returns 1.
- Test 3: `s = "abc", t = "xyz"` $\to$ mismatches = 3 $\to$ returns 3.
- Test 4: `s = "aaaaa", t = "ab"` $\to$ index 0 has `"aa"` vs `"ab"` (1 mismatch) $\to$ returns 1.

## Follow-ups
- Could we break early if `c >= best`?
  Yes, inside the inner loop, if `c >= best`, we can break early since this alignment cannot improve upon the best found so far.
- Can this be solved faster using FFT for very large strings ($|s|, |t| \le 10^5$)?
  Yes, string matching with wildcards / mismatches can be solved in $O(26 \cdot |s| \log |s|)$ using Fast Fourier Transform polynomial convolution for each letter of the alphabet.

## Common mistakes
- Boundary condition: stopping the loop when `i < s.size() - t.size()` instead of `<=`, omitting the last valid alignment offset.
- Slicing strings with `.substr()` repeatedly, which creates unnecessary temporary heap allocations in the inner loop.
