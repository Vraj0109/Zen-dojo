---
id: cses-distinct-values-subarrays
pattern: cses-sorting-and-searching
difficulty: medium
optimal: "O(n \log n) time and O(n) space"
reviewed: false
---

## Clarify first
- What defines a valid subarray? A contiguous, non-empty subarray where every element is distinct (no duplicate values).
- What should be returned? The total count of such valid subarrays across the entire array.
- Can the total count exceed 32-bit integer limits? Yes, for an array of $200000$ distinct integers, the total count is $\frac{n(n + 1)}{2} \approx 2 \times 10^{10}$, requiring a 64-bit integer (`long long`).
- What are the input constraints? $1 \le n \le 200000$ and $1 \le \text{arr}[i] \le 10^9$.

## Examples to say out loud
- Consider `arr = [1, 2, 1, 3]`:
  - Subarrays of length 1: `[1]`, `[2]`, `[1]`, `[3]` (4 total, all distinct).
  - Subarrays of length 2: `[1, 2]`, `[2, 1]`, `[1, 3]` (3 total). Note `[1, 2, 1]` is invalid because 1 repeats.
  - Subarrays of length 3: `[2, 1, 3]` (1 total).
  - Subarrays of length 4: `[1, 2, 1, 3]` (invalid).
  - Total valid subarrays = $4 + 3 + 1 = 8$.
- Edge case: `arr = [1, 1, 1]`:
  - Only subarrays of length 1 contain distinct values: $1 + 1 + 1 = 3$.
- All distinct `arr = [1, 2, 3, 4, 5]`:
  - Count = $\frac{5 \times 6}{2} = 15$.

## Brute force
A brute force approach would enumerate all $\frac{n(n + 1)}{2}$ contiguous subarrays and verify each for duplicates using a hash set. This takes $O(n^2)$ time with incremental checking, or $O(n^3)$ without. For $n = 200000$, $2 \times 10^{10}$ subarrays would result in a severe Time Limit Exceeded. A sliding window counts valid subarrays in a single linear pass.

## The key observation
Consider all valid distinct-element subarrays that **end** at index $r$.
If $l$ is the smallest (leftmost) index such that the entire window $[l, r]$ has all distinct elements, then any subsegment starting at $k \in [l, r]$ and ending at $r$ is also guaranteed to have all distinct elements.
The number of valid subarrays ending at index $r$ is exactly:
$$\text{count}(r) = r - l + 1$$
As $r$ advances from $0$ to $n - 1$, if $\text{arr}[r]$ was previously seen at index $\text{prev} \ge l$, we advance $l$ to $\text{prev} + 1$. Summing $(r - l + 1)$ across all $r$ yields the total count.

## Optimal approach
1. Initialize an empty map `lastPos` mapping each value to its latest seen index.
2. Initialize `l = 0` and a 64-bit accumulator `total = 0`.
3. Iterate $r$ from $0$ to $n - 1$:
   - Check if $\text{arr}[r]$ exists in `lastPos` with an index $\ge l$.
   - If so, update $l = \text{lastPos}[\text{arr}[r]] + 1$.
   - Update `lastPos[arr[r]] = r`.
   - Add $(r - l + 1)$ to `total`.
4. Return `total`.

Complexity:
- Time: $O(n \log n)$ using a balanced binary search map (`std::map`), or $O(n)$ average using an unordered hash map.
- Space: $O(n)$ to store up to $n$ unique values in the map.

## Code walkthrough
- `map<int, int> lastPos`: Tracks the most recent 0-based index of each value.
- `long long total = 0`: 64-bit counter for the aggregate count of valid subarrays.
- `int l = 0`: Left boundary of the largest duplicate-free window ending at $r$.
- `if (it != lastPos.end() && it->second >= l) l = it->second + 1`: Advances the left pointer past any duplicate within the current window.
- `total += (r - l + 1)`: Contributes the count of all valid subarrays ending at $r$.

## Test it out loud
- Test case $1$: `[1, 2, 1, 3]`:
  - $r = 0$: $l = 0$, window $[0, 0] \implies +1$.
  - $r = 1$: $l = 0$, window $[0, 1] \implies +2$.
  - $r = 2$ (val 1): duplicate at 0, $l$ becomes 1. Window $[1, 2] \implies +2$.
  - $r = 3$ (val 3): $l = 1$, window $[1, 3] \implies +3$.
  - Total = $1 + 2 + 2 + 3 = 8$.
- Test case $2$: `[7]`. Single element $\implies +1$.
- Test case $3$: `[1000000000, 1000000000]`. $r = 0 \to +1$; $r = 1 \to l = 1, +1 \implies 2$.
- Test case $4$: `[1, 2, 3, 4, 5]`. $1 + 2 + 3 + 4 + 5 = 15$.

## Follow-ups
- How to achieve strictly $O(n)$ worst-case time? Coordinate compress the unique values into integers $0 \dots U - 1$ in $O(n \log n)$, then use a direct vector array for $O(1)$ lookups.
- What if we need to count subarrays with at most $k$ distinct values? Use standard two-pointer sliding window maintaining frequency counts and decrementing frequencies as $l$ advances.

## Common mistakes
- 32-bit integer overflow: The total number of valid subarrays can exceed $2 \times 10^9$ (up to $2 \times 10^{10}$). `total` must be a 64-bit integer (`long long`).
- Advancing $l$ without checking `it->second >= l`: Moving $l$ to a stale position before the current $l$ will pull $l$ backwards and allow duplicate elements into the window.

## Further reading
- [Two Pointers and Sliding Window on Wikipedia](https://en.wikipedia.org/wiki/Two-pointer_technique)
