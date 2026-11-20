---
id: c-cf-520a
pattern: cses-codeforces
difficulty: easy
optimal: "O(n) time and O(1) space"
reviewed: false
---

## Clarify first
- What is a pangram? A word or sentence that contains every letter of the alphabet at least once.
- Is case sensitive? No, uppercase and lowercase letters are treated as the same letter.
- What are the inputs? An integer `n` denoting the length of string `s`, and the string `s` itself.
- What are the constraints? `1 <= n <= 100`. The string consists of uppercase and lowercase English letters.
- What should be returned? "YES" if the string is a pangram, "NO" otherwise.

## Examples to say out loud
- Consider `n = 12, s = "toosmallword"`: `n < 26`, so it cannot possibly contain all 26 letters. Return "NO".
- Consider `n = 35, s = "TheQuickBrownFoxJumpsOverTheLazyDog"`: Converting to lowercase and collecting letters yields all 26 letters from 'a' to 'z'. Return "YES".

## Brute force
For each character from `'a'` to `'z'`, scan the entire string `s` to see if that character (in either case) exists in `s`. If any character is not found, return "NO". If all 26 are found, return "YES". This takes 26 * n comparisons, which is O(n) and works well, but we can do a single pass using a frequency set or bitmask.

## The key observation
If `n < 26`, the string cannot be a pangram immediately. Otherwise, by converting each character to lowercase (or indexing by `tolower(c) - 'a'`), we can toggle bits in a 32-bit integer bitmask. If at the end of the pass the bitmask equals `(1 << 26) - 1` (or popcount is 26), all 26 letters are present.

## Optimal approach
1. If `n < 26`, return "NO" immediately.
2. Initialize an integer `mask = 0`.
3. Iterate through each character `c` in `s`:
   - Convert `c` to lowercase.
   - Set the corresponding bit: `mask |= (1 << (c - 'a'))`.
4. If the number of set bits in `mask` is 26 (i.e. `mask == (1 << 26) - 1`), return "YES".
5. Otherwise, return "NO".

Complexity:
- Time complexity: O(n) where `n <= 100` is the string length. We process each character in O(1) time.
- Space complexity: O(1) auxiliary space, requiring just a single 32-bit integer for the bitmask.

## Code walkthrough
- `if (n < 26) return "NO"`: Quick reject if string length is smaller than alphabet size.
- `int mask = 0`: 32-bit bitmask tracking seen letters.
- `for (char c : s) mask |= (1 << (tolower(c) - 'a'))`: Flips the bit for the corresponding letter regardless of case.
- `return __builtin_popcount(mask) == 26 ? "YES" : "NO"`: Checks if all 26 unique letters are present.

## Test it out loud
- `n = 12, s = "toosmallword"`: `n < 26`, immediately returns "NO". Correct.
- Standard pangram: All letters appear, `__builtin_popcount(mask)` becomes 26, returns "YES". Correct.
- String with 25 unique letters: Missing 'z', popcount is 25, returns "NO". Correct.

## Follow-ups
- How to return the missing letters if the string is not a pangram? Iterate from `'a'` to `'z'`; if bit `i` is not set in `mask`, append `char('a' + i)` to the missing list.

## Common mistakes
- Forgetting that uppercase and lowercase letters must be considered identical.
- Forgetting to check if `n < 26` beforehand or checking only unique characters without case normalization.
