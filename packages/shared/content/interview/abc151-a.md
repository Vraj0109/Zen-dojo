---
id: abc151-a
pattern: cses-atcoder
difficulty: medium
optimal: "O(1) time, O(1) space"
brute: same
reviewed: false
---

## Clarify first
- What does the input string `c` contain? A single-character string holding one lowercase English letter.
- What range of letters can appear? The letter is guaranteed to be between `'a'` and `'y'`. `'z'` is never given as input.
- What should be returned? A string containing the single character that directly follows `c` in alphabetical order (e.g., `'a'` yields `'b'`).
- Does the alphabet need to wrap around from `'z'` to `'a'`? No, because the problem guarantees that `c` is strictly at most `'y'`.

## Examples to say out loud
- Consider `c = "a"`.
  The next letter in the English alphabet is `'b'`.
  Result: `"b"`.
- Consider `c = "y"`.
  The next letter is `'z'`.
  Result: `"z"`.
- Consider `c = "m"`.
  The character following `'m'` is `'n'`.
  Result: `"n"`.

## Brute force
A naive approach would define an alphabet lookup string `"abcdefghijklmnopqrstuvwxyz"`. We could locate the character `c[0]` in this string using linear search, find its index $i$, and return a string containing the character at index $i + 1$. While this runs in $O(26) = O(1)$ time, it requires storing an extra alphabet table. We can solve it directly using ASCII character arithmetic.

## The key observation
In ASCII and UTF-8 encoding, lowercase English letters `'a'` through `'z'` are assigned consecutive contiguous integer codes:
`'a'` has code 97, `'b'` has code 98, and so on.
Therefore, the character immediately following `c[0]` is obtained by adding 1 to its character code:
`next_char = (char)(c[0] + 1)`.
This computes the exact successor in a single CPU instruction without any array or string lookups.

## Optimal approach
1. Extract the first (and only) character of the input string `c`: `ch = c[0]`.
2. Compute the successor character by adding 1: `next_ch = (char)(ch + 1)`.
3. Construct a 1-character string from `next_ch` and return it.
4. Complexity:
   - Time Complexity: $O(1)$, executing exactly one addition instruction.
   - Space Complexity: $O(1)$ auxiliary space beyond the 1-character return value.

## Code walkthrough
- `string nextLetter(string c)`: Function accepting the single-character string.
- `(char)(c[0] + 1)`: Access character at index 0, increment its numeric character code by 1, and cast back to `char`.
- `return string(1, ...);`: Construct and return a 1-character string holding the successor character.

## Test it out loud
- Test 1: `c = "a"` $\to$ `'a' + 1 = 'b'` $\to$ returns `"b"`.
- Test 2: `c = "b"` $\to$ `'b' + 1 = 'c'` $\to$ returns `"c"`.
- Test 3: `c = "m"` $\to$ `'m' + 1 = 'n'` $\to$ returns `"n"`.
- Test 4: `c = "x"` $\to$ `'x' + 1 = 'y'` $\to$ returns `"y"`.
- Test 5: `c = "y"` $\to$ `'y' + 1 = 'z'` $\to$ returns `"z"`.

## Follow-ups
- What if the input could be `'z'`?
  We would use modular arithmetic: `'a' + (c[0] - 'a' + 1) % 26` to wrap `'z'` back around to `'a'`.
- What if the input could be an uppercase letter?
  Preserve case by checking `isupper(c[0])` or converting case accordingly.

## Common mistakes
- Forgetting to cast back from `int` to `char` after adding 1 in strongly typed languages like Java, resulting in type errors.
- Unnecessary string concatenation loops or full alphabet array allocations for a simple scalar character operation.
