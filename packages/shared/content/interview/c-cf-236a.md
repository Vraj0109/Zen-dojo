---
id: c-cf-236a
pattern: cses-codeforces
difficulty: easy
optimal: "O(n) time, O(1) space"
reviewed: false
---

## Clarify first
- What is the rule described in the problem? Given a username string, count the number of distinct characters in it.
- How is the output decided based on distinct character count?
  - If the count of distinct characters is an even number, return `"CHAT WITH HER!"`.
  - If the count of distinct characters is an odd number, return `"IGNORE HIM!"`.
- What characters appear in the username? Only lowercase Latin letters (`'a'` to `'z'`).
- What is the constraint on username length? Between 1 and 100 characters.

## Examples to say out loud
- Consider `name = "wjmzbmr"`.
  The characters are: 'w', 'j', 'm', 'z', 'b', 'm', 'r'.
  Unique characters: {'w', 'j', 'm', 'z', 'b', 'r'} (6 unique characters).
  6 is an even number $\to$ return `"CHAT WITH HER!"`.
- Consider `name = "xiaodao"`.
  Unique characters: {'x', 'i', 'a', 'o', 'd'} (5 unique characters).
  5 is an odd number $\to$ return `"IGNORE HIM!"`.
- Consider `name = "a"`.
  1 unique character (odd) $\to$ return `"IGNORE HIM!"`.

## Brute force
A naive approach would iterate through each character in the string, and for each character, check if it appeared previously in the string using a nested loop. While this runs in $O(n^2)$ time (at most 10,000 comparisons), using a boolean visited array of size 26 or a hash set counts distinct characters in a single linear pass.

## The key observation
Since the alphabet consists only of the 26 lowercase English letters `'a'` to `'z'`, we can track which letters have appeared using a boolean array of size 26 or a 32-bit integer bitmask.
- For each character $c$ in `name`: mark `seen[c - 'a'] = true` (or `mask |= (1 << (c - 'a'))`).
- Count how many bits are set.
- Check the parity of the count:
  - If $\text{count} \pmod 2 == 0$, return `"CHAT WITH HER!"`.
  - Otherwise, return `"IGNORE HIM!"`.

## Optimal approach
1. Initialize an array/set `distinct` from the characters in `name`.
2. Inspect the number of unique elements: `k = distinct.size()`.
3. If $k \pmod 2 == 0$, return `"CHAT WITH HER!"`.
4. Otherwise, return `"IGNORE HIM!"`.
5. Complexity:
   - Time Complexity: $O(n)$, where $n$ is the length of `name` (at most 100). We process each character once.
   - Space Complexity: $O(1)$ auxiliary space, since there are at most 26 distinct lowercase letters.

## Code walkthrough
- `unordered_set<char> distinct(name.begin(), name.end());`: Insert all characters into a hash set to extract unique letters.
- `distinct.size() % 2 == 0`: Check whether the unique character count is even.
- `return ... ? "CHAT WITH HER!" : "IGNORE HIM!";`: Return the corresponding string.

## Test it out loud
- Test 1: `name = "a"` $\to$ distinct size 1 (odd) $\to$ `"IGNORE HIM!"`.
- Test 2: `name = "aa"` $\to$ distinct size 1 (odd) $\to$ `"IGNORE HIM!"`.
- Test 3: `name = "ab"` $\to$ distinct size 2 (even) $\to$ `"CHAT WITH HER!"`.
- Test 4: `name = "sevenkplus"` $\to$ unique letters: s, e, v, n, k, p, l, u (8 letters, even) $\to$ `"CHAT WITH HER!"`.
- Test 5: Full alphabet 26 letters $\to$ even $\to$ `"CHAT WITH HER!"`.

## Follow-ups
- How to implement this with zero heap allocations?
  Use a 32-bit integer bitmask: `int mask = 0; for (char c : name) mask |= (1 << (c - 'a'));`.
  Then `int count = __builtin_popcount(mask);` computes the unique letter count in a single CPU instruction without any allocations.
- What if uppercase and lowercase letters were both present and treated as distinct?
  Size the boolean array to 128 or use `std::unordered_set<char>`.

## Common mistakes
- Counting total characters (`name.length()`) instead of distinct characters.
- Inverting the parity condition (returning `"CHAT WITH HER!"` for odd instead of even).
- Typos in the exact string literals (missing exclamation marks).
