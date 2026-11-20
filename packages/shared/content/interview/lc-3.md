---
id: lc-3
pattern: sliding-window
difficulty: medium
optimal: "O(n) time, O(min(n, m)) space"
reviewed: true
---

## Clarify first

- Can the string be empty? (Yes, length 0 to 50,000; an empty string returns 0).
- What character set should be supported? (Any standard printable ASCII characters including letters, digits, symbols, and spaces).
- Is it substring or subsequence? (Contiguous substring; characters must be consecutive in the original string).
- Are uppercase and lowercase letters treated as distinct? (Yes, 'a' and 'A' are distinct characters).
- What should be returned if all characters in the string are identical? (Return 1, e.g., "bbbbb" -> 1).

## Examples to say out loud

- Example with repeat: `s = "abcabcbb"`. Starting at index 0, substring "abc" has length 3. When encountering the second 'a' at index 3, the window must shift left past the first 'a' (to index 1). The maximum length observed across the entire string is 3.
- All identical characters: `s = "bbbbb"`. The longest substring without repeating characters is "b" of length 1.
- Jump over earlier duplicates: `s = "abba"`. At index 2 ('b'), left boundary shifts to 2. When encountering 'a' at index 3, its previous position was 0, which is behind the current left boundary (2). Left must not move backwards; it stays at 2, giving length `3 - 2 + 1 = 2`.

## Brute force

The brute-force solution checks all possible substrings. For each start position `i` from `0` to `n - 1` and end position `j` from `i` to `n - 1`, verify whether substring `s[i...j]` contains unique characters using a hash set. Generating all substrings takes `O(n^2)` and verifying each takes `O(n)`, totaling `O(n^3)` time, or `O(n^2)` if we expand from `i` incrementally. With `n = 50,000`, `n^2` is `2.5 * 10^9` operations, causing a time limit exceeded.

## The key observation

As we expand a contiguous window `[left, right]` by incrementing `right`, a duplicate character only invalidates the window if its previous occurrence falls within the current window (`last_seen[c] >= left`). Rather than restarting the search from `left + 1`, we can instantly jump `left` forward to `last_seen[c] + 1`, maintaining an optimal active window in a single pass.

## Optimal approach

1. Track the last seen index of each character using an array or hash map `last_seen` initialized to -1.
2. Initialize pointers `left = 0`, `max_len = 0`.
3. Iterate `right` from `0` to `n - 1`:
   a. Let `c = s[right]`.
   b. If `c` was seen and `last_seen[c] >= left`, update `left = last_seen[c] + 1`.
   c. Update `last_seen[c] = right`.
   d. Update `max_len = max(max_len, right - left + 1)`.
4. Return `max_len`.

Complexity:
- Time: `O(n)` because `right` moves forward from 0 to `n - 1` once, and `left` only increases monotonically.
- Space: `O(min(n, m))` where `m` is the size of the character set (for ASCII, at most 128 or 256 integers, which is `O(1)` memory).

## Code walkthrough

In the reference implementation:
- `vector<int> last(256, -1);`: directly indexes ASCII character bytes in `O(1)` space and time.
- `if (last[c] >= left) left = last[c] + 1;`: shifts the left boundary forward past the duplicate without ever moving backwards.
- `last[c] = r;`: records the latest position of character `c`.
- `best = max(best, r - left + 1);`: maintains the maximum window size seen so far.

## Test it out loud

- Empty string `s = ""`: loop does not execute; returns initial `best = 0`.
- Single space `s = " "`: `r = 0`, `left = 0`, `best = 1`. Returns 1.
- `s = "pwwkew"`:
  - `p` -> len 1, `w` -> len 2.
  - second `w`: `last['w'] = 1 >= left (0)`, so `left` jumps to 2.
  - `k` -> len 1, `e` -> len 2, `w` -> `last['w'] = 2 == left (2)`, so `left` jumps to 3 (`kew` len 3). Max is 3.

## Follow-ups

- What if we need to return the actual substring itself rather than just its length?
  Track `start_index` whenever `r - left + 1 > best`, then return `s.substr(start_index, best)`.
- What if up to `k` duplicate characters are allowed?
  Use a frequency map with sliding window, shrinking `left` with a while loop whenever the count of any character exceeds `k`.
- What if the input stream is infinite or cannot fit in memory?
  Keep the sliding window buffer in memory; the maximum window size never exceeds the alphabet size `m`.

## Common mistakes

- Moving `left` backwards on an old duplicate: forgetting the `last_seen[c] >= left` check in inputs like `"abba"`.
- Using a set and removing elements one-by-one with `left++` inside a loop; while still `O(n)` amortized, direct jumping with an index map is cleaner and faster.
- Off-by-one errors in window size calculation (`r - left + 1` versus `r - left`).

## Further reading

- Sliding window pattern in string algorithms.
- Hash map versus direct array indexing trade-offs for character sets.
