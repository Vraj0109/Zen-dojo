---
id: c-z-function
pattern: String matching
difficulty: medium
optimal: "O(n) time, O(n) space"
reviewed: false
---

## Clarify first
- What is the Z-array? For a string s of length n, `z[i]` is the length of the longest common prefix between s and the suffix of s starting at index i (`s[i..n-1]`).
- What is the value of `z[0]`? By definition in this problem, `z[0]` is set to 0.
- What characters does s contain? Lowercase English letters.
- What is the length constraint on s? Between 1 and 100,000 characters.
- What should be returned? An array of integers representing the Z-values from index 0 to n - 1.

## Examples to say out loud
Suppose s = "aaaaa", n = 5:
- `z[0] = 0` by definition.
- Suffix at 1 is "aaaa". Longest common prefix with "aaaaa" is "aaaa" of length 4.
- Suffix at 2 is "aaa", prefix match length is 3.
- Suffix at 3 is "aa", prefix match length is 2.
- Suffix at 4 is "a", prefix match length is 1.
Result: [0, 4, 3, 2, 1].

Suppose s = "abacaba":
- `z[0] = 0`.
- Suffix 1 "bacaba": starts with 'b' != 'a', length 0.
- Suffix 2 "acaba": starts with 'a', matches "a", next is 'c' != 'b', length 1.
- Suffix 3 "caba": starts with 'c' != 'a', length 0.
- Suffix 4 "aba": matches "aba", length 3.
- Suffix 5 "ba": length 0.
- Suffix 6 "a": matches "a", length 1.
Result: [0, 0, 1, 0, 3, 0, 1].

## Brute force
For each index i from 1 to n - 1, compare characters `s[j]` with `s[i + j]` starting from `j = 0` until a mismatch occurs or the end of the string is reached.
On strings like "aaaa...a", each suffix comparison takes O(n) comparisons, leading to O(n^2) total time.
For n = 100,000, 10^10 operations will result in Time Limit Exceeded.
We can compute the entire Z-array in O(n) time using a match segment (the Z-box).

## The key observation
We maintain an active match interval `[l, r)` that extends furthest to the right, where `r = max(j + z[j])`.
This interval guarantees that `s[l..r-1]` is identical to `s[0..r-l-1]`.
When computing `z[i]` for some `i < r`:
- Node `i` corresponds to index `i - l` in the prefix.
- The substring starting at `i` matches `s[0..]` for at least `min(r - i, z[i - l])` characters because that subsegment was already matched inside the Z-box.
- If `z[i - l] < r - i`, then `z[i]` is completely determined and equals `z[i - l]`.
- If `z[i - l] >= r - i`, the match extends at least up to `r`, and we only need to test characters beyond `r`.
Whenever a match extends past `r`, we update `l = i` and `r = i + z[i]`.
Because `r` only moves forward from 0 to n, each character is compared successfully at most once when extending `r`, achieving linear time.

## Optimal approach
1. Allocate an array `z` of length n initialized to 0.
2. Initialize Z-box boundaries `l = 0` and `r = 0`.
3. Loop `i` from 1 to n - 1:
   - If `i < r`, initialize `z[i] = min(r - i, z[i - l])`.
   - While `i + z[i] < n` and `s[z[i]] == s[i + z[i]]`, increment `z[i]`.
   - If `i + z[i] > r`, update `l = i` and `r = i + z[i]`.
4. Return `z`.

Complexity: O(n) time because the right boundary `r` increases monotonically up to n and each mismatch immediately terminates the while loop. Auxiliary space is O(n) to store the result array.

## Code walkthrough
In C++, `l` and `r` represent the right-open interval `[l, r)` matching prefix `s[0..r - l - 1]`.
`if (i < r)` applies the prefix reuse optimization: `min(r - i, z[i - l])`.
The `while (i + z[i] < n && s[z[i]] == s[i + z[i]])` loop only does work when `i + z[i] >= r` or when expanding past the known boundary.
If the expanded match exceeds `r`, `l = i; r = i + z[i];` slides the Z-box rightward.

## Test it out loud
- Single character "a": n = 1, loop does not execute, returns [0].
- All identical characters "aaaa":
  - i = 1: matches to end, z[1] = 3, Z-box becomes [1, 4).
  - i = 2: i < 4, z[2] initialized to min(2, z[1]) = min(2, 3) = 2, expands to 2, correct.
- All distinct characters "abcdef": no prefix matches, all z[i] remain 0.
- Alternating "ababab":
  - z[2] = 4 ("abab"), correctly identifies the period.

## Follow-ups
- How to use the Z-algorithm for exact pattern matching of pattern P in text T? Concatenate `P + "$" + T` with a unique separator `$` and compute the Z-array. Any index `i` in T where `z[i] == |P|` marks an occurrence of P.
- How does Z-algorithm compare to KMP? KMP computes the prefix function (pi-array: longest proper prefix that is also a suffix of the prefix). Both run in O(n) time and can be converted into one another, but the Z-algorithm is often conceptually simpler and more intuitive for suffix-prefix matches.
- Can Z-algorithm detect string periods? Yes, if `n % i == 0` and `z[i] == n - i`, then the prefix of length `i` is a period of `s`.

## Common mistakes
- Forgetting `z[0] = 0`: the problem statement specifies `z[0] = 0` (even though the prefix matches itself for length n).
- Off-by-one in the bound `r - i`: inside `[l, r)`, the number of characters guaranteed to match is `r - i`.
- Not bounding `z[i - l]` by `r - i`: blindly setting `z[i] = z[i - l]` without taking the minimum with `r - i` would assume characters beyond `r` match without checking.

## Further reading
- Gusfield's linear-time string matching algorithms
- Comparison between Knuth-Morris-Pratt (KMP) and Z-algorithm
- Finding string periodicities and repetitions using Z-function
