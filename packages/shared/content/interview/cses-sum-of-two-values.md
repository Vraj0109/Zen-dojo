---
id: cses-sum-of-two-values
pattern: cses-sorting-and-searching
difficulty: medium
optimal: "O(n \log n) time and O(n) space"
reviewed: false
---

## Clarify first
- How are indices indexed in the return value? 1-based indexing ($1 \le i < j \le n$).
- What should be returned if multiple valid pairs exist? Return the pair $[i, j]$ with the smallest index $i$, and the smallest $j$ to break ties.
- What should be returned if no such pair exists? Return `[-1, -1]`.
- Can the elements be paired with themselves? No, $i$ and $j$ must be distinct positions ($i < j$).
- What are the constraints? $1 \le n \le 200000$ and $1 \le \text{target}, \text{arr}[i] \le 10^9$.

## Examples to say out loud
- Consider `arr = [2, 7, 5, 1]` and `target = 8`:
  - 1-based indices: $1 \to 2$, $2 \to 7$, $3 \to 5$, $4 \to 1$.
  - At index $i = 1$ (value 2): needed is $8 - 2 = 6$. No 6 exists at $j > 1$.
  - At index $i = 2$ (value 7): needed is $8 - 7 = 1$. Value 1 exists at 1-based index $j = 4$.
  - $2 < 4$ and $7 + 1 = 8$. Return `[2, 4]`.
- Consider `arr = [1, 2, 3]` and `target = 10`:
  - No two values sum to 10. Return `[-1, -1]`.
- Consider `arr = [3, 3]` and `target = 6`:
  - Index 1 (3) pairs with index 2 (3). Return `[1, 2]`.

## Brute force
A brute-force solution would check all pairs of indices $1 \le i < j \le n$ and test if $\text{arr}[i - 1] + \text{arr}[j - 1] == \text{target}$. There are $\binom{n}{2} \approx 2 \times 10^{10}$ pairs for $n = 200000$, resulting in Time Limit Exceeded. A hash map can find pairs in $O(n)$ time on average, but to strictly satisfy the tie-breaking condition (minimum $i$, then minimum $j > i$) and avoid hash collision exploits, sorting indexed pairs with binary search gives a guaranteed $O(n \log n)$ solution.

## The key observation
For any fixed index $i$ (iterated from $1$ to $n$), the required complementary value is $\text{needed} = \text{target} - \text{arr}[i - 1]$, and it must appear at some index $j \ge i + 1$.
If we store all pairs $(\text{value}, \text{index})$ in a sorted array, we can use binary search (`std::lower_bound`) on the sorted array for the tuple $(\text{needed}, i + 1)$.
Since we iterate $i$ from 1 to $n$, the very first $i$ that finds a match at index $j > i$ naturally guarantees the minimum 1-based index $i$, and `lower_bound` on $(needed, i + 1)$ finds the smallest index $j > i$.

## Optimal approach
1. Create an array of pairs `sorted_arr` of size $n$, storing $(\text{arr}[k], k + 1)$ for $k = 0 \dots n - 1$.
2. Sort `sorted_arr` in ascending order (first by value, then by 1-based index).
3. Loop $i$ from $1$ to $n$:
   - Calculate $\text{needed} = \text{target} - \text{arr}[i - 1]$.
   - Use binary search (`lower_bound`) in `sorted_arr` for the pair $(\text{needed}, i + 1)$.
   - If a matching pair is found and its value equals $\text{needed}$, return `[i, it->second]`.
4. If no pair is found after checking all $i$, return `[-1, -1]`.

Complexity:
- Time: $O(n \log n)$ to sort the $n$ pairs, followed by $n$ binary searches each taking $O(\log n)$.
- Space: $O(n)$ to store the array of value-index pairs.

## Code walkthrough
- `vector<pair<int, int>> sorted_arr(n)`: Holds `(value, 1-based index)`.
- `sort(sorted_arr.begin(), sorted_arr.end())`: Lexicographically sorts by value, then index.
- `for (int i = 1; i <= n; i++)`: Iterates sequentially to prioritize the minimal 1-based index $i$.
- `auto it = lower_bound(..., make_pair(needed, i + 1))`: Locates the first element with value $\ge \text{needed}$ and index $\ge i + 1$.
- `if (it != sorted_arr.end() && it->first == needed)`: Confirms an exact value match at index $j > i$.

## Test it out loud
- Test case $1$: `arr = [3, 3]`, `target = 6`. $i = 1$, needed = 3. `lower_bound` searches for $(3, 2)$, finds $(3, 2)$. Returns `[1, 2]`.
- Test case $2$: `arr = [1, 3, 3, 5]`, `target = 6`. $i = 1$ (val 1), needed = 5. Finds $(5, 4)$. Returns `[1, 4]`.
- Test case $3$: `arr = [5, 4, 3, 2, 1]`, `target = 6`. $i = 1$ (val 5), needed = 1. Finds $(1, 5)$. Returns `[1, 5]`.
- Test case $4$: No match $\implies$ loop completes, returns `[-1, -1]`.

## Follow-ups
- Can we solve this in $O(n)$ time using a hash map? Yes, map each value to its list of indices. For each $i$ from 1 to $n$, look up `needed`. If found, pick the smallest index greater than $i$. Average time is $O(n)$, but requires care with hash collisions and memory allocations.
- What if the array was already sorted? Two pointers from left and right find a pair in $O(n)$ time and $O(1)$ space.

## Common mistakes
- Allowing $i == j$: A single element matching $\text{target} / 2$ cannot pair with itself; the search must enforce $j \ge i + 1$.
- Violating tie-breaking rules: Returning an arbitrary pair instead of the one with the smallest $i$ will fail validation tests.
- 0-based vs 1-based indices: The problem asks for 1-based positions in the output.

## Further reading
- [Binary Search on Wikipedia](https://en.wikipedia.org/wiki/Binary_search_algorithm)
