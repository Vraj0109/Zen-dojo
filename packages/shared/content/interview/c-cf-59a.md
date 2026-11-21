---
id: c-cf-59a
pattern: cses-codeforces
difficulty: easy
optimal: "O(n) time, O(1) auxiliary space"
brute: same
reviewed: false
---

## Clarify first
- What is the normalization rule for the word?
  - If the count of uppercase letters is strictly greater than the count of lowercase letters ($\text{up} > \text{low}$), convert the entire word to uppercase.
  - Otherwise (if $\text{low} \ge \text{up}$), convert the entire word to lowercase.
- What if uppercase and lowercase counts are tied? When counts are equal, lowercase wins; convert the entire word to lowercase.
- What are the constraints? The word length is between 1 and 100, consisting only of uppercase and lowercase English letters.
- What should be returned? The transformed word string with consistent casing.

## Examples to say out loud
- Consider `s = "HoUse"`.
  - Uppercase letters: 'H', 'U' (count = 2).
  - Lowercase letters: 'o', 's', 'e' (count = 3).
  Since $3 \ge 2$, lowercase wins $\to$ return `"house"`.
- Consider `s = "ViP"`.
  - Uppercase: 'V', 'P' (count = 2).
  - Lowercase: 'i' (count = 1).
  Since $2 > 1$, uppercase wins $\to$ return `"VIP"`.
- Consider `s = "maTRIx"`.
  3 uppercase ('T', 'R', 'I') and 3 lowercase ('m', 'a', 'x').
  Equal counts $\to$ lowercase wins $\to$ return `"matrix"`.

## Brute force
A brute force approach counts uppercase and lowercase letters in an initial pass, determines the winning casing, and then performs a second pass converting every character. Because the string length is at most 100, this two-pass linear solution takes fewer than 200 operations, making it both simple and optimal.

## The key observation
The problem splits into two sequential phases:
1. Count uppercase characters using `isupper(c)` and lowercase characters using `islower(c)`. (Alternatively: $\text{low} = n - \text{up}$).
2. If $\text{up} > \text{low}$, convert each character via `toupper(c)`; otherwise convert each character via `tolower(c)`.
Mutating the string in place in languages with mutable strings uses zero additional memory.

## Optimal approach
1. Initialize two counters: `up = 0` and `low = 0`.
2. Iterate through each character $c$ in string $s$:
   - If `isupper(c)`, increment `up++`.
   - Else, increment `low++`.
3. If `up > low`:
   - Transform every character $c \in s$ to `toupper(c)`.
4. Else:
   - Transform every character $c \in s$ to `tolower(c)`.
5. Return the modified string $s$.
6. Complexity:
   - Time Complexity: $O(n)$, where $n$ is the length of $s$. Two linear scans over at most 100 characters.
   - Space Complexity: $O(1)$ auxiliary space if modifying in-place, or $O(n)$ in languages with immutable strings.

## Code walkthrough
- `int up = 0, low = 0; for (char c : s) if (isupper(c)) up++; else low++;`: Tally character casings.
- `for (char& c : s) c = (up > low) ? toupper(c) : tolower(c);`: In-place mutation applying the winning casing to each character.
- `return s;`: Return the normalized string.

## Test it out loud
- Test 1: `s = "a"` $\to \text{up}=0, \text{low}=1 \to$ `"a"`.
- Test 2: `s = "A"` $\to \text{up}=1, \text{low}=0 \to$ `"A"`.
- Test 3: `s = "maTRIx"` $\to \text{up}=3, \text{low}=3 \to$ tie breaks to lowercase $\to$ `"matrix"`.
- Test 4: `s = "ABCde"` $\to \text{up}=3, \text{low}=2 \to$ uppercase wins $\to$ `"ABCDE"`.
- Test 5: `s = "abCDE"` $\to \text{up}=3, \text{low}=2 \to$ uppercase wins $\to$ `"ABCDE"`.

## Follow-ups
- How to eliminate one counter?
  Count only `up`. Since every character is an English letter, $\text{low} = |s| - \text{up}$. The condition $\text{up} > \text{low}$ is equivalent to $\text{up} > |s| / 2$.
- How would you handle Unicode or localized strings?
  Use locale-aware case conversion like `towupper` / `towlower` in C++ or `toLowerCase(Locale.ROOT)` in Java to avoid language-specific mapping discrepancies (e.g. the Turkish dotless 'i').

## Common mistakes
- Breaking ties in favor of uppercase rather than lowercase (the problem explicitly states lowercase wins on ties).
- Modifying characters during the first pass while counts are still incomplete.
