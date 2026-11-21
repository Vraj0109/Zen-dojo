---
id: abc160-a
pattern: cses-atcoder
difficulty: medium
optimal: "O(1) time, O(1) space"
brute: same
reviewed: false
---

## Clarify first
- What is the definition of a "coffee-like" string? A 6-character string is coffee-like if its 3rd and 4th characters are identical to each other, AND its 5th and 6th characters are also identical to each other.
- Give an example of a coffee-like string: The word `"coffee"` itself: 3rd and 4th characters are `'f'` and `'f'` (equal), and 5th and 6th characters are `'e'` and `'e'` (equal).
- What should be returned? The string `"Yes"` if $s$ is coffee-like, and `"No"` otherwise.
- What are the constraints on $s$? $s$ is guaranteed to be a string of exactly 6 lowercase English letters.
- Are the 3rd and 5th characters required to be different? No, characters across different pairs can be identical (e.g. `"aabbcc"` or `"aaaaaa"` are both valid).

## Examples to say out loud
- Consider `s = "sippuu"`.
  - 3rd character is `'p'`, 4th is `'p'` $\to$ match.
  - 5th character is `'u'`, 6th is `'u'` $\to$ match.
  Both conditions hold $\to$ return `"Yes"`.
- Consider `s = "iphone"`.
  - 3rd character is `'h'`, 4th is `'o'` $\to$ mismatch.
  Return `"No"`.
- Consider `s = "abccde"`.
  - 3rd and 4th characters match (`'c'` and `'c'`).
  - 5th and 6th characters are `'d'` and `'e'` (mismatch).
  Return `"No"`.

## Brute force
Because the string has a fixed length of 6 characters and only two specific character comparisons must be made, there is no simpler brute force. Directly checking the two character pairs is already optimal in $O(1)$ time and space.

## The key observation
In 0-indexed programming languages:
- The 1st and 2nd characters are at indices 0 and 1.
- The 3rd and 4th characters are at indices 2 and 3: check $s[2] == s[3]$.
- The 5th and 6th characters are at indices 4 and 5: check $s[4] == s[5]$.
The string is coffee-like if and only if both conditions are simultaneously satisfied:
`s[2] == s[3] && s[4] == s[5]`.

## Optimal approach
1. Compare character at index 2 with character at index 3: `s[2] == s[3]`.
2. Compare character at index 4 with character at index 5: `s[4] == s[5]`.
3. If both boolean conditions are true, return `"Yes"`.
4. Otherwise, return `"No"`.
5. Complexity:
   - Time Complexity: $O(1)$, exactly two character comparisons.
   - Space Complexity: $O(1)$, no extra memory allocated.

## Code walkthrough
- `string isCoffeeLike(string s)`: Function taking the 6-character string.
- `s[2] == s[3] && s[4] == s[5]`: Verify that the 3rd and 4th characters match and the 5th and 6th characters match.
- `return ... ? "Yes" : "No";`: Return `"Yes"` or `"No"`.

## Test it out loud
- Test 1: `s = "coffee"` $\to s[2] == s[3] == \text{'f'}$, $s[4] == s[5] == \text{'e'} \to$ `"Yes"`.
- Test 2: `s = "aabbcc"` $\to s[2] == s[3] == \text{'b'}$, $s[4] == s[5] == \text{'c'} \to$ `"Yes"`.
- Test 3: `s = "abcdef"` $\to s[2] == \text{'c'} \ne s[3] == \text{'d'} \to$ `"No"`.
- Test 4: `s = "abccde"` $\to s[4] == \text{'d'} \ne s[5] == \text{'e'} \to$ `"No"`.

## Follow-ups
- How would you test this pattern using a regular expression?
  A regex matching `^..([a-z])\1([a-z])\2$` verifies any 6-character string where positions 3-4 and 5-6 contain repeating pairs.
- What if the string could have arbitrary length and we needed to check consecutive duplicate pairs at specified 1-based indices $(i, j)$?
  Index directly into $s[i - 1]$ and $s[j - 1]$ after verifying that the indices are within bounds.

## Common mistakes
- Off-by-one errors when translating 1-based problem descriptions to 0-based programming indices (e.g. checking $s[3] == s[4]$ instead of $s[2] == s[3]$).
- Checking only one of the two pairs (e.g. using `||` instead of `&&`).
- Returning `"True"` or boolean `true` instead of `"Yes"` and `"No"`.
