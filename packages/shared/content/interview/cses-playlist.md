---
id: cses-playlist
pattern: cses-sorting-and-searching
difficulty: medium
optimal: "O(n \log n) time and O(n) space"
reviewed: false
---

## Clarify first
- What are the inputs? An array of $n$ integers representing song IDs in a playlist.
- What is the objective? Find the maximum length of a contiguous sequence of songs containing no duplicate IDs.
- What are the constraints on $n$ and IDs? $1 \le n \le 200000$ and $1 \le \text{songs}[i] \le 10^9$.
- Can the playlist have length 1? Yes, in which case the answer is 1.

## Examples to say out loud
- Consider `songs = [1, 2, 1, 3, 2, 7, 4, 2]`:
  - $R = 0$ (val 1): window `[1]`, length 1.
  - $R = 1$ (val 2): window `[1, 2]`, length 2.
  - $R = 2$ (val 1): 1 was previously at index 0. Advance $L$ to $0 + 1 = 1$. Window `[2, 1]`, length 2.
  - $R = 3$ (val 3): window `[2, 1, 3]`, length 3.
  - $R = 4$ (val 2): 2 was previously at index 1. Advance $L$ to $1 + 1 = 2$. Window `[1, 3, 2]`, length 3.
  - $R = 5$ (val 7): window `[1, 3, 2, 7]`, length 4.
  - $R = 6$ (val 4): window `[1, 3, 2, 7, 4]`, length 5.
  - $R = 7$ (val 2): 2 was previously at index 4. Advance $L$ to $4 + 1 = 5$. Window `[7, 4, 2]`, length 3.
  - Maximum unique sequence length is 5.
- Edge case: `songs = [5, 5, 5, 5]`:
  - Every adjacent duplicate shrinks $L$ to $R$, max length = 1.

## Brute force
A brute-force solution would check all $\frac{n(n + 1)}{2}$ contiguous subarrays, storing elements in a hash set to detect duplicates. With $n = 200000$, an $O(n^2)$ or $O(n^3)$ approach performs over $2 \times 10^{10}$ operations, causing a severe Time Limit Exceeded. A two-pointer sliding window tracks unique elements in a single linear pass.

## The key observation
If a contiguous window $[L, R]$ contains all distinct songs, advancing $R$ to include $\text{songs}[R]$ creates a duplicate if and only if $\text{songs}[R]$ already appears at some index $pos \ge L$.
When such a duplicate occurs, the window's left boundary $L$ must jump past that duplicate to $pos + 1$ to restore the all-distinct invariant.
By maintaining the most recent index where each song appeared in a map (`lastPos`), $L$ moves monotonically forward: $L = \max(L, \text{lastPos}[\text{songs}[R]] + 1)$. The maximum window length $R - L + 1$ across all steps yields the optimal answer.

## Optimal approach
1. Initialize a map `lastPos` from song ID to its latest index.
2. Initialize pointers `left = 0`, `best = 0`.
3. Loop `right` from $0$ to $n - 1$:
   - Look up $\text{songs}[right]$ in `lastPos`.
   - If found and its recorded index is $\ge left$:
     - Jump `left = lastPos[songs[right]] + 1`.
   - Update `lastPos[songs[right]] = right`.
   - Update `best = max(best, right - left + 1)`.
4. Return `best`.

Complexity:
- Time: $O(n \log n)$ using a balanced binary search map (`std::map`), or $O(n)$ average with an unordered hash map.
- Space: $O(n)$ to store up to $n$ distinct song IDs in the map.

## Code walkthrough
- `map<int, int> lastPos`: Maps song ID to its latest observed 0-based index.
- `int left = 0, best = 0`: Sliding window start pointer and global maximum length tracker.
- `if (it != lastPos.end() && it->second >= left) left = it->second + 1`: Advances the left boundary past the previous occurrence if it lies within the active window.
- `lastPos[songs[right]] = right`: Overwrites with the current index.
- `best = max(best, right - left + 1)`: Evaluates current valid window length.

## Test it out loud
- Test case $1$: `[1, 2, 3, 4, 5]`. No duplicates $\implies$ window expands from 0 to 4, length 5.
- Test case $2$: `[42]`. Single element $\implies$ length 1.
- Test case $3$: `[1, 2, 1, 2, 1, 2]`. Alternating elements $\implies$ window length oscillates at 2, returns 2.
- Test case $4$: `[1000000000, 999999999, 1000000000]`. Song IDs up to $10^9$ handled seamlessly by map keys, returns 2.

## Follow-ups
- How to achieve guaranteed $O(n)$ time? Coordinate compress the unique song IDs into indices $0 \dots U - 1$ in $O(n \log n)$, then use a direct vector of size $U$ for $O(1)$ lookups.
- Can we return the starting and ending indices of the longest unique playlist? Maintain `bestStart = left` whenever `right - left + 1 > best`.

## Common mistakes
- Moving `left` backward: Forgetting the check `it->second >= left` can cause `left` to move backward to an earlier duplicate outside the current window, erroneously expanding the window.
- Using an array sized $10^9$: Song IDs range up to $10^9$. Direct array indexing causes immediate memory exhaustion; a hash map or balanced tree map is required.

## Further reading
- [Sliding Window Technique on Wikipedia](https://en.wikipedia.org/wiki/Sliding_window_protocol)
