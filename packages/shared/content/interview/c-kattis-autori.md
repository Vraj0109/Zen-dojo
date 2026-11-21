---
id: c-kattis-autori
pattern: cses-kattis
difficulty: easy
optimal: "O(n) time, O(n) space"
brute: same
reviewed: false
---

## Clarify first
- What format does the input name have? Words consisting of letters separated by single hyphens (`'-'`).
- How are words structured? Each word begins with an uppercase letter, and all subsequent letters in that word are lowercase.
- What should be returned? A string containing only the uppercase initial letter of each hyphen-separated word, in order.
- What are the length constraints? String length is between 1 and 100 characters.
- Are there empty words or trailing/leading hyphens? No, valid names with single hyphens between words.

## Examples to say out loud
- Consider `name = "Knuth-Morris-Pratt"`.
  - First word "Knuth" gives `'K'`.
  - Second word "Morris" gives `'M'`.
  - Third word "Pratt" gives `'P'`.
  Output: `"KMP"`.
- Consider `name = "Mirko-Slavko"`.
  Output: `"MS"`.
- Edge case: `name = "Anna"`.
  Only one word, output is `"A"`.

## Brute force
A naive approach might split the entire string by the hyphen delimiter into an array of substrings, then iterate over each substring and extract its first character `part[0]`. While this works, string splitting allocates intermediate substring objects. We can achieve the same result in a single streaming pass over the characters of `name`.

## The key observation
An uppercase initial appears in exactly two positions:
1. The character at index 0 ($i = 0$).
2. Any character immediately preceded by a hyphen ($name[i - 1] == '-'$).
Alternatively, because the problem guarantees that only the first letter of each word is uppercase, filtering for characters that satisfy `isupper(c)` or checking `name[i - 1] == '-'` extracts precisely the desired initials in order.

## Optimal approach
1. Initialize an empty string buffer `initials`.
2. Iterate through each index $i$ from 0 to $n - 1$ in `name`:
   - If $i == 0$ or $name[i - 1] == '-'$, append $name[i]$ to `initials`.
3. Return `initials`.
4. Complexity:
   - Time Complexity: $O(n)$, where $n$ is the length of `name`. We inspect each character once.
   - Space Complexity: $O(n)$ space to hold the output string of initials (at most $n$ characters).

## Code walkthrough
- `string r;`: String buffer to collect the initials.
- `for (size_t i = 0; i < name.size(); i++)`: Iterate through indices of the string.
- `if (i == 0 || name[i - 1] == '-') r += name[i];`: Identify initials at the start of the string or immediately following a hyphen separator.
- `return r;`: Return the acronym string.

## Test it out loud
- Test 1: `name = "Anna"` $\to i = 0$ gives `'A'` $\to$ returns `"A"`.
- Test 2: `name = "A-B"` $\to i = 0$ ('A'), $i = 2$ ('B') $\to$ returns `"AB"`.
- Test 3: `name = "Jean-Claude-Van-Damme"` $\to$ returns `"JCVD"`.
- Test 4: `name = "Zz-Yy-Xx-Ww-Vv-Uu"` $\to$ returns `"ZYXWVU"`.

## Follow-ups
- What if separators could be any punctuation or whitespace (spaces, underscores, hyphens)?
  Maintain a boolean flag `is_start_of_word = true`. When seeing an alphanumeric character, if the flag is true, append it and set flag to false; reset flag to true upon encountering any delimiter.
- What if words could start with lowercase characters?
  Convert each initial to uppercase using `toupper(c)` before appending.

## Common mistakes
- Checking `name[i] == '-'` and appending `name[i + 1]` without bounds checking at the end of the string.
- Splitting strings using regex in loops, incurring unnecessary overhead on large batches.
- Appending hyphens to the output.
