---
id: c-cf-443a
pattern: cses-codeforces
difficulty: easy
optimal: "O(n) time and O(1) space"
reviewed: false
---

## Clarify first
- What does the input look like? A string formatted as a set of letters enclosed in curly braces, such as `"{a, b, c}"` or `"{}"`.
- What are we asked to find? The number of distinct lowercase English letters inside the set.
- What characters can appear? Curly brackets `{`, `}`, lowercase English letters `a`-`z`, commas `,`, and spaces `' '`.
- What are the constraints on the length of the string? Length up to 1000 characters.

## Examples to say out loud
- Input: `"{a, b, c}"` -> The distinct letters are `'a'`, `'b'`, `'c'`. Output is 3.
- Input: `"{b, a, b, a}"` -> The distinct letters are `'a'` and `'b'`. Output is 2.
- Edge case: Input: `"{}"` -> An empty set contains no letters. Output is 0.

## Brute force
We could split the string on commas and spaces, trim the braces, insert the resulting tokens into a hash set, and return the set size. In terms of complexity, this is O(n), but parsing with string splits requires extra memory allocations. A single scan checking whether each character is between `'a'` and `'z'` is both simpler and more efficient.

## The key observation
We only care about distinct characters from `'a'` to `'z'`. Any other characters (braces, commas, spaces) can simply be ignored. Since the English alphabet has only 26 lowercase letters, we can collect valid letters into a hash set or a boolean frequency array of size 26. The size of the set or the number of true values in the boolean array gives the exact answer.

## Optimal approach
1. Initialize a boolean array `seen` of size 26 to `false` (or an integer bitmask / hash set).
2. Read the entire line containing the set.
3. Iterate through each character `c` in the string.
4. If `c >= 'a' && c <= 'z'`, mark `seen[c - 'a'] = true`.
5. Count the number of `true` values in `seen`.
6. Return the count.

Complexity:
- Time complexity: O(n) where `n` is the length of the string (up to 1000 characters), as we inspect each character once.
- Space complexity: O(1) auxiliary space, since the alphabet size is bounded by 26 characters.

## Code walkthrough
- `vector<bool> seen(26, false)`: Tracks whether each lowercase English letter has appeared.
- `for (char c : s)`: Inspects each character in the input string.
- `if (c >= 'a' && c <= 'z') seen[c - 'a'] = true`: Records the occurrence of any lowercase letter.
- `int ans = count(seen.begin(), seen.end(), true)`: Counts how many unique letters were encountered.

## Test it out loud
- `"{a, b, c}"`: Encounters `'a'`, `'b'`, `'c'`. Unique count = 3. Correct.
- `"{}"`: Encounters no letters. Unique count = 0. Correct.
- `"{z}"`: Encounters `'z'`. Unique count = 1. Correct.

## Follow-ups
- How to represent this using bitwise operations? Use an `int mask = 0`. For each lowercase character, do `mask |= (1 << (c - 'a'))`. The final answer is the popcount `__builtin_popcount(mask)`.

## Common mistakes
- Reading input with standard `cin >> s`, which stops at whitespace; the full line must be read using `getline`.
- Treating curly braces or commas as letters if only non-space characters are counted.
