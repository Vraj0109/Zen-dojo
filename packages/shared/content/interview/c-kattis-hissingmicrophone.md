---
id: c-kattis-hissingmicrophone
pattern: cses-kattis
difficulty: easy
optimal: "O(n) time and O(1) space"
brute: same
reviewed: false
---

## Clarify first
- What is the input? A single non-empty string consisting only of lowercase English letters.
- What is the condition for a "hiss"? The string must contain two consecutive `'s'` characters (i.e. the substring `"ss"`).
- What should be output? Output `"hiss"` if the substring `"ss"` appears, and `"no hiss"` otherwise.
- What are the constraints? String length is between 1 and 30 characters.

## Examples to say out loud
- Input: `"amiss"` -> Contains `"ss"` at indices 3 and 4 -> output `"hiss"`.
- Input: `"octopuses"` -> Contains `'s'` at index 6 and index 8, but they are not consecutive -> output `"no hiss"`.
- Input: `"hiss"` -> Contains `"ss"` -> output `"hiss"`.

## Brute force
A linear scan checking adjacent character pairs `(s[i], s[i+1])` checks at most `n - 1` pairs. For `n <= 30`, this takes at most 29 character comparisons. A built-in substring search like `s.find("ss")` also operates in O(n) time.

## The key observation
A hiss occurs if and only if there exists some index `i` such that `s[i] == 's'` and `s[i + 1] == 's'`. We can either search using a native substring finder or write a single loop that terminates as soon as a pair of consecutive `'s'` characters is found.

## Optimal approach
1. Read the input string `s`.
2. Iterate `i` from 0 up to `s.length() - 2`:
   - If `s[i] == 's'` and `s[i + 1] == 's'`, return `"hiss"`.
3. If the loop completes without finding any such pair, return `"no hiss"`.

Complexity:
- Time complexity: O(n) where `n <= 30`, as each character pair is examined at most once.
- Space complexity: O(1) auxiliary space beyond storing the input string.

## Code walkthrough
- `for (size_t i = 0; i + 1 < s.size(); i++)`: Iterates through all adjacent character pairs safely within array bounds.
- `if (s[i] == 's' && s[i + 1] == 's')`: Detects the consecutive `'s'` pattern.
- `return "hiss"`: Early exit when found.
- `return "no hiss"`: Default fallback when no consecutive `'s'` exists.

## Test it out loud
- `"amiss"`: `i = 3` has `s[3] == 's'` and `s[4] == 's'`, returns `"hiss"`. Correct.
- `"octopuses"`: Has 's' separated by other letters, loop finishes, returns `"no hiss"`. Correct.
- `"s"`: Length is 1, loop bounds prevent any iteration, returns `"no hiss"`. Correct.

## Follow-ups
- How to extend this to general regex matching (e.g. `s{k,}` for at least `k` consecutive occurrences)? We maintain a running streak counter of the current character and reset it whenever the character changes.

## Common mistakes
- Checking `s[i] == 's' && s[i - 1] == 's'` starting at `i = 0`, leading to an out-of-bounds indexing error.
- Checking for the presence of character `'s'` rather than two consecutive `'s'` characters.
