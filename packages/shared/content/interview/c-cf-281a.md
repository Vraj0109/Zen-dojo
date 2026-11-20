---
id: c-cf-281a
pattern: cses-codeforces
difficulty: easy
optimal: "O(1) time beyond copy, O(1) space"
reviewed: false
---

## Clarify first
- What is the definition of word capitalization? Capitalizing a word means ensuring its first letter is an uppercase letter.
- What happens to the other letters in the word? All other letters (from index 1 onward) must remain completely unchanged, preserving their original uppercase or lowercase casing.
- What if the first letter is already capitalized? The string should remain unchanged.
- What are the constraints? Length is between 1 and 1000 characters, consisting only of uppercase and lowercase English letters.
- Can we mutate the string in place? In languages with mutable strings like C++, mutating $s[0]$ in place avoids any memory allocation.

## Examples to say out loud
- Consider `s = "konjac"`.
  The first letter is lowercase `'k'`.
  Converting `'k'` to uppercase yields `'K'`.
  Remaining characters `"onjac"` stay unchanged.
  Result: `"Konjac"`.
- Consider `s = "ApPLe"`.
  The first letter is already uppercase `'A'`.
  Remaining characters `"pPLe"` stay unchanged.
  Result: `"ApPLe"`.
- Consider `s = "z"` $\to$ returns `"Z"`.

## Brute force
Because the task only requires modifying the first character at index 0 and leaving all subsequent characters untouched, there is no simpler brute force. Inspecting and converting character 0 takes $O(1)$ operations, making the direct solution already optimal.

## The key observation
Only the character at index 0 ($s[0]$) needs to be modified:
`s[0] = toupper(s[0])`.
All characters at indices $i \ge 1$ are left exactly as they were.
If $s[0]$ is already uppercase, `toupper(s[0])` returns $s[0]$ unchanged, so no conditional check is necessary.

## Optimal approach
1. If string $s$ is not empty:
   - Convert $s[0]$ to uppercase: $s[0] \leftarrow \text{toupper}(s[0])$.
2. Return $s$.
3. Complexity:
   - Time Complexity: $O(1)$ operations to modify the first character (plus $O(n)$ to copy/return the string).
   - Space Complexity: $O(1)$ auxiliary space if modified in-place, or $O(n)$ in languages with immutable strings.

## Code walkthrough
- `string capitalizeWord(string s)`: Function taking the word.
- `if (!s.empty()) s[0] = toupper(s[0]);`: Safely convert the initial character to uppercase using the standard library `toupper` function.
- `return s;`: Return the capitalized word.

## Test it out loud
- Test 1: `s = "z"` $\to s[0] = \text{'Z'} \to$ `"Z"`.
- Test 2: `s = "A"` $\to s[0] = \text{'A'} \to$ `"A"`.
- Test 3: `s = "apple"` $\to s[0] = \text{'A'} \to$ `"Apple"`.
- Test 4: `s = "cODING"` $\to s[0] = \text{'C'} \to$ `"CODING"`.
- Test 5: `s = "testCase"` $\to s[0] = \text{'T'} \to$ `"TestCase"`.

## Follow-ups
- How to convert without standard library functions?
  Check if $s[0] \ge \text{'a'} \land s[0] \le \text{'z'}$; if so, subtract 32 ($s[0] \leftarrow s[0] - (\text{'a'} - \text{'A'})$).
- What if the string represents a title where every word in a sentence must be capitalized?
  Split words on whitespace or iterate through the string, capitalizing any character that follows a space.

## Common mistakes
- Lowercasing the remaining characters (e.g. converting `"ApPLe"` to `"Apple"`), which violates the requirement that other characters remain untouched.
- Index out of bounds on an empty string (always check `!s.empty()`).
