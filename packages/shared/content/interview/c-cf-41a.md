---
id: c-cf-41a
pattern: cses-codeforces
difficulty: easy
optimal: "O(n) time, O(1) space"
reviewed: false
---

## Clarify first
- What does translation between Berlandish and Birlandish mean? A word in Birlandish is the exact reverse of the word in Berlandish (e.g., `'code'` translates to `'edoc'`).
- What are the inputs? Two strings $s$ and $t$.
- What should be returned? Boolean `true` if $t$ is the exact reverse of $s$, and `false` otherwise.
- What if the lengths of $s$ and $t$ differ? If $|s| \ne |t|$, $t$ cannot be the reverse of $s$, so return `false`.
- What are the constraints? Lengths are between 1 and 100, consisting only of lowercase Latin letters.

## Examples to say out loud
- Consider $s = \text{"code"}$ and $t = \text{"edoc"}$.
  Reversing $s$ gives `"edoc"`, which equals $t$ $\to$ return `true`.
- Consider $s = \text{"abb"}$ and $t = \text{"aba"}$.
  Reversing $s$ gives `"bba"`, which does not equal `"aba"` $\to$ return `false`.
- Consider $s = \text{"racecar"}$ and $t = \text{"racecar"}$.
  `"racecar"` is a palindrome; its reverse is itself $\to$ return `true`.
- Consider $s = \text{"go"}$ and $t = \text{"og"}$ $\to$ return `true`.

## Brute force
A brute force approach creates a reversed copy of string $s$ using string reversal functions (like `string(s.rbegin(), s.rend())` or `StringBuilder.reverse()`) and compares the reversed string with $t$. While this takes $O(n)$ time and $O(n)$ memory, we can also check equality in place using two pointers without allocating any temporary strings.

## The key observation
String $t$ is the reverse of string $s$ if and only if:
1. $|s| == |t|$
2. For all $i \in [0, |s| - 1]$, $s[i] == t[|t| - 1 - i]$.
If the lengths differ, return `false` immediately. Otherwise, comparing characters from opposite ends confirms reversal in $O(n)$ time and $O(1)$ auxiliary space.

## Optimal approach
1. Check if $|s| \ne |t|$. If so, return `false`.
2. Loop index $i$ from 0 to $|s| - 1$:
   - If $s[i] \ne t[|s| - 1 - i]$, return `false`.
3. If all characters match, return `true`.
4. (Alternatively: reverse $s$ in place and return $s == t$).
5. Complexity:
   - Time Complexity: $O(n)$, where $n$ is the length of string $s$. We perform at most $n$ character comparisons.
   - Space Complexity: $O(1)$ auxiliary space for two-pointer comparison or in-place reversal.

## Code walkthrough
- `if (s.size() != t.size()) return false;`: Guard clause ensuring lengths match.
- `reverse(s.begin(), s.end());`: Reverse $s$ in place.
- `return s == t;`: Compare reversed string with $t$.

## Test it out loud
- Test 1: $s = \text{"go"}, t = \text{"og"} \to \text{rev}(s) = \text{"og"} == t \to$ `true`.
- Test 2: $s = \text{"a"}, t = \text{"a"} \to$ `true`.
- Test 3: $s = \text{"a"}, t = \text{"b"} \to$ `false`.
- Test 4: $s = \text{"ab"}, t = \text{"ab"} \to \text{"ba"} \ne \text{"ab"} \to$ `false`.
- Test 5: $s = \text{"racecar"}, t = \text{"racecar"} \to$ `true`.

## Follow-ups
- How to check without modifying $s$ or allocating memory?
  Use two pointers: `i` starting at 0, `j` starting at $|t| - 1$. Compare $s[i]$ and $t[j]$ while advancing $i++$ and decrementing $j--$.
- What if strings contain Unicode grapheme clusters (e.g. accented characters or emojis)?
  Code point and combining mark reversal must be handled using grapheme-aware iterators to avoid corrupting multi-byte characters.

## Common mistakes
- Forgetting to verify that $|s| == |t|$; if $t$ is shorter or longer, out-of-bounds errors or incorrect matches could occur.
- Comparing $s[i]$ to $t[i]$ (testing identical strings instead of reversed strings).
