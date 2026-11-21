---
id: c-atc-abc148-b
pattern: cses-atcoder
difficulty: easy
optimal: "O(n) time, O(n) space"
brute: same
reviewed: false
---

## Clarify first
- Are the two input strings always of equal length? Yes, the problem statement guarantees that `s.length == t.length`.
- What characters are contained in `s` and `t`? Lowercase English letters only.
- What are the constraints on length? Length $n$ is between 1 and 100.
- What is the required order of characters in the result? Alternating character by character starting with $s[0]$, then $t[0]$, then $s[1]$, then $t[1]$, up to $s[n-1]$ and $t[n-1]$.

## Examples to say out loud
- Consider `s = "ip"` and `t = "cc"`.
  - Take $s[0]$: `'i'`
  - Take $t[0]$: `'c'`
  - Take $s[1]$: `'p'`
  - Take $t[1]$: `'c'`
  Result: `"icpc"`.
- Edge case: length 1, e.g., `s = "a"`, `t = "b"`.
  Result: `"ab"`.

## Brute force
Because the problem only requires reading characters in a fixed interleaved pattern, there is no simpler brute force: any valid solution must construct the output string of length $2n$. A naive implementation might perform repeated string concatenations in languages where strings are immutable, leading to $O(n^2)$ character copies. We will implement it using linear-time string building.

## The key observation
We iterate through an index $i$ from $0$ up to $n - 1$. At each step, we emit character $s[i]$ followed immediately by $t[i]$. Pre-allocating capacity or using an efficient builder ensures strictly linear time and memory.

## Optimal approach
1. Determine the length $n$ of the string $s$.
2. Initialize an empty string buffer or dynamic array of characters with capacity $2n$.
3. Loop $i$ from $0$ to $n - 1$:
   - Append $s[i]$ to the buffer.
   - Append $t[i]$ to the buffer.
4. Convert the buffer to the final string and return.
5. Complexity:
   - Time Complexity: $O(n)$, where $n$ is the length of strings $s$ and $t$. We perform $2n$ constant-time appends.
   - Space Complexity: $O(n)$ to store the resulting interleaved string of length $2n$.

## Code walkthrough
- `string r;`: String accumulator to hold the interleaved result.
- `for (size_t i = 0; i < s.size(); i++)`: Iterate through indices from 0 up to the length of the strings.
- `r += s[i]; r += t[i];`: Append the $i$-th character of $s$, followed by the $i$-th character of $t$.
- `return r;`: Return the combined output string of length $2n$.

## Test it out loud
- Test 1: `s = "a", t = "b"` $\to$ index 0: `'a'`, `'b'` $\to$ `"ab"`. Correct.
- Test 2: `s = "aa", t = "bb"` $\to$ index 0: `'a'`, `'b'`, index 1: `'a'`, `'b'` $\to$ `"abab"`. Correct.
- Test 3: `s = "abc", t = "xyz"` $\to$ `"axbycz"`. Correct.
- Test 4: `s = "hello", t = "world"` $\to$ `"hweolrllod"`. Correct.

## Follow-ups
- What if the strings can have different lengths?
  We would iterate up to $\max(|s|, |t|)$, appending $s[i]$ if $i < |s|$ and $t[i]$ if $i < |t|$.
- What if there are $k$ strings to interleave instead of 2?
  A double loop: outer loop over index $i$ up to maximum length, inner loop over the $k$ strings, appending each string's $i$-th character when within bounds.

## Common mistakes
- In Java or Python, using repeated string addition (`+` operator) inside a loop without `StringBuilder` or `''.join()`, causing quadratic memory churn.
- Getting the interleaving order backward (e.g., adding $t[i]$ before $s[i]$).
- Off-by-one errors in loop boundaries.
