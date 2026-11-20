---
id: c-cf-112a
pattern: cses-codeforces
difficulty: easy
optimal: "O(n) time, O(1) space"
reviewed: false
---

## Clarify first
- What are the inputs? Two strings $a$ and $b$ of equal length.
- What is the comparison rule? Lexicographical comparison where letter case is completely ignored (case-insensitive: 'A' and 'a' are treated as identical).
- What should be returned?
  - Return $-1$ if string $a$ is strictly smaller than string $b$.
  - Return $1$ if string $b$ is strictly smaller than string $a$.
  - Return $0$ if both strings are lexicographically equal.
- What are the constraints? String length is between 1 and 100, containing only Latin uppercase and lowercase letters.

## Examples to say out loud
- Consider `a = "aaaa"` and `b = "aaaA"`.
  When case is ignored, both strings are equivalent to `"aaaa"`.
  Result: 0.
- Consider `a = "abs"` and `b = "Abz"`.
  Case-insensitive conversion yields `"abs"` vs `"abz"`.
  At index 2, `'s'` comes before `'z'` in alphabetical order $\to$ string $a$ is strictly smaller.
  Result: $-1$.
- Consider `a = "abcdefg"` and `b = "AbCdEfF"`.
  At index 6, `'g'` comes after `'f'` $\to$ string $a$ is strictly larger.
  Result: 1.

## Brute force
A brute force approach would convert both strings completely into lowercase new strings (e.g. `a.toLowerCase()` and `b.toLowerCase()`), and then compare the two new strings using standard string comparison. While this takes $O(n)$ time and $O(n)$ memory, we can do it with $O(1)$ auxiliary space by comparing characters on the fly and returning early on the first mismatch.

## The key observation
Lexicographical order is determined by the very first index $i$ where characters differ:
- Convert $a[i]$ and $b[i]$ to lowercase: $c_a = \text{tolower}(a[i])$, $c_b = \text{tolower}(b[i])$.
- If $c_a < c_b$, string $a$ is strictly smaller; we can return $-1$ immediately.
- If $c_a > c_b$, string $b$ is strictly smaller; we can return $1$ immediately.
- If $c_a == c_b$, advance to $i + 1$.
If the loop reaches the end of the strings with no mismatches, the strings are identical; return $0$.

## Optimal approach
1. Loop index $i$ from 0 to $|a| - 1$:
   - Let $c_a = \text{tolower}(a[i])$ and $c_b = \text{tolower}(b[i])$.
   - If $c_a < c_b$, return $-1$.
   - If $c_a > c_b$, return $1$.
2. If all characters matched, return $0$.
3. Complexity:
   - Time Complexity: $O(n)$, where $n$ is the length of strings $a$ and $b$ (up to 100). The loop terminates at the first differing character.
   - Space Complexity: $O(1)$ auxiliary space, since characters are converted and compared in place without allocating new strings.

## Code walkthrough
- `for (size_t i = 0; i < a.size(); i++)`: Iterate through characters in parallel.
- `char ca = tolower(a[i]); char cb = tolower(b[i]);`: Normalize both characters to lowercase.
- `if (ca < cb) return -1; if (ca > cb) return 1;`: Early exit on the first differing character.
- `return 0;`: Fallback when both strings are identical under case-insensitive comparison.

## Test it out loud
- Test 1: `a = "a", b = "z"` $\to \text{'a'} < \text{'z'} \to -1$.
- Test 2: `a = "Z", b = "a"` $\to \text{'z'} > \text{'a'} \to 1$.
- Test 3: `a = "HELLO", b = "hello"` $\to$ all characters match $\to 0$.
- Test 4: `a = "abc", b = "abd"` $\to$ index 2 has `'c'` vs `'d'` $\to -1$.

## Follow-ups
- How does standard POSIX C handle this?
  POSIX provides `strcasecmp(a.c_str(), b.c_str())`, which performs case-insensitive comparison directly in C.
- What if the strings can have different lengths?
  Compare characters up to $\min(|a|, |b|)$. If all match, the shorter string is lexicographically smaller: return $-1$ if $|a| < |b|$, $1$ if $|a| > |b|$, and $0$ if lengths match.

## Common mistakes
- Comparing ASCII codes directly without converting to lowercase first (e.g. uppercase `'Z'` has ASCII 90 while lowercase `'a'` has ASCII 97, which would incorrectly claim that `'Z' < 'a'`).
- In Java, using `==` to compare strings rather than comparing characters or using `a.compareToIgnoreCase(b)`.
