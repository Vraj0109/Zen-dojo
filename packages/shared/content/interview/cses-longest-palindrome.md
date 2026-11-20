---
id: cses-longest-palindrome
pattern: cses-misc
difficulty: medium
optimal: "O(n) time and O(n) space"
reviewed: false
---

## Clarify first
- What is the input? A single string `s` consisting of lowercase English letters.
- What should be returned? A longest palindromic substring of `s`.
- If there are multiple palindromic substrings of the maximum length, which one should be returned? Any one of them is acceptable.
- Can palindromes have even or odd length? Yes, both odd-length (like `"racecar"`) and even-length (like `"noon"`) palindromes must be supported.
- What are the constraints? `1 <= s.length <= 10^6`.

## Examples to say out loud
- Consider `s = "aybabtu"`:
  - Substrings like `"bab"` are palindromes of length 3.
  - No palindrome of length > 3 exists. Output: `"bab"`.
- Consider `s = "racecar"`:
  - The entire string is a palindrome of length 7. Output: `"racecar"`.
- Consider `s = "noonbreak"`:
  - Longest palindrome is `"noon"` (length 4, even length). Output: `"noon"`.

## Brute force
Checking every substring of `s` takes O(n^3) time. Expanding around each of the `2n - 1` possible centers takes O(n^2) worst-case time (e.g. for string `"aaaa..."`). With `n = 10^6`, O(n^2) requires 10^12 operations and will time out. We must use Manacher's algorithm to find the longest palindromic substring in strictly O(n) linear time.

## The key observation
**Manacher's algorithm** eliminates redundant character expansions by utilizing previously discovered palindromic symmetries.
1. We interleave the string with `#` and wrap it in distinct sentinels: `"^#a#b#a#$"`. This transforms every potential palindrome (whether even or odd in the original string) into an odd-length palindrome centered at some character in the modified string.
2. We maintain a center `c` and rightmost reach `r` of the palindrome that extends furthest to the right.
3. For any new position `i`, its mirror position across `c` is `i_mirror = 2 * c - i`. If `i < r`, the palindrome radius at `i` is at least `min(r - i, P[i_mirror])`.
4. We only need to manually expand past `r`. Whenever an expansion pushes beyond `r`, we update `c = i` and `r = i + P[i]`. Because `r` only increases, the total amortized expansion time is O(n).

## Optimal approach
1. Transform string `s` of length `n` into `T` by placing `#` between characters and adding sentinels `^` and `$`.
   Length of `T` is `2n + 3`.
2. Allocate radius array `P` of length `|T|` initialized to 0.
3. Maintain center `c = 0` and right boundary `r = 0`.
4. Track `max_len = 0` and `center_index = 0`.
5. For `i` from 1 to `|T| - 2`:
   - If `i < r`, initialize `P[i] = min(r - i, P[2 * c - i])`.
   - While `T[i + P[i] + 1] == T[i - P[i] - 1]`, increment `P[i]++`.
   - If `i + P[i] > r`, update `c = i` and `r = i + P[i]`.
   - If `P[i] > max_len`, update `max_len = P[i]` and `center_index = i`.
6. Map `center_index` and `max_len` back to the original string:
   The start index in `s` is `(center_index - 1 - max_len) / 2`.
7. Return `s.substr(start, max_len)`.

Complexity:
- Time complexity: O(n) because the inner while loop only executes when extending past `r`, and `r` advances from 0 to at most `2n + 3`.
- Space complexity: O(n) auxiliary space to store transformed string `T` and array `P`.

## Code walkthrough
- `string T = "^"` followed by `#` and characters, ending with `#$`: Handles even/odd unification and avoids bounds checks.
- `int i_mirror = 2 * c - i`: Symmetric counterpart inside the current enclosing palindrome.
- `P[i] = min(r - i, P[i_mirror])`: Leverages already-known symmetry.
- `while (T[i + 1 + P[i]] == T[i - 1 - P[i]]) P[i]++`: Extends beyond known radius.
- `int start = (center_index - 1 - max_len) / 2`: Converts index in `T` back to 0-based offset in `s`.

## Test it out loud
- `s = "x"`: `T = "^#x#$"`. Center at `'x'` has radius 1. Maps to `start = 0, len = 1` -> `"x"`. Correct.
- `s = "noon"`: Even palindrome. Transformed `#n#o#o#n#`. Center is at `#` between the two `'o'`s. Radius is 4. Returns `"noon"`. Correct.
- `s = "racecar"`: Returns `"racecar"`. Correct.

## Follow-ups
- Can we solve this using rolling hash and binary search? Yes, by binary searching the palindrome radius with 64-bit polynomial hashes. That achieves O(n log n) time, but Manacher is strictly optimal at O(n) without hashing collision risks.

## Common mistakes
- Failing to use boundary sentinels (like `^` and `$`), which leads to buffer overrun and out-of-bounds indexing in the expansion loop.
- Off-by-one errors when translating transformed string indices back into original string coordinates.
