---
id: cses-sum-of-three-values
pattern: cses-sorting-and-searching
difficulty: medium
optimal: "O(n^2) time and O(n) space"
reviewed: false
---

## Clarify first
- What are we searching for? Three distinct positions $i, j, k$ (1-based indices with $1 \le i < j < k \le n$) such that $\text{arr}[i - 1] + \text{arr}[j - 1] + \text{arr}[k - 1] == \text{target}$.
- What should be returned if no such triplet exists? Return `[-1, -1, -1]`.
- How should the indices be ordered? Return the 1-based indices in strictly increasing order ($i < j < k$).
- Can a position be used more than once? No, the three positions must be mutually distinct.
- What are the constraints? $1 \le n \le 5000$ and $1 \le \text{arr}[i], \text{target} \le 10^9$.

## Examples to say out loud
- Consider `arr = [2, 7, 5, 1]` and `target = 8`:
  - 1-based positions: $1 \to 2$, $2 \to 7$, $3 \to 5$, $4 \to 1$.
  - Triplet: positions 1 (2), 3 (5), and 4 (1) sum to $2 + 5 + 1 = 8$.
  - Output: `[1, 3, 4]`.
- Consider `arr = [1, 2, 3]` and `target = 10`:
  - The maximum possible sum is $1 + 2 + 3 = 6 < 10$.
  - Output: `[-1, -1, -1]`.

## Brute force
A brute-force solution would check all $\binom{n}{3}$ triplets of indices in $O(n^3)$ time. For $n = 5000$, $\binom{5000}{3} \approx 2.08 \times 10^{10}$ triplets, which will result in a severe Time Limit Exceeded. Sorting indexed pairs followed by the two-pointer technique solves the problem in $O(n^2)$ time, which takes only $\approx 1.25 \times 10^7$ operations for $n = 5000$ and finishes well within limits.

## The key observation
If we store each element alongside its original 1-based index as a pair $(\text{value}, \text{index})$ and sort the array by value:
We can fix the first element $a[i]$ of the triplet using an outer loop from $i = 0$ to $n - 3$.
For each fixed $i$, finding two remaining elements that sum to $\text{target} - a[i].\text{value}$ reduces to the classic two-sum problem on a sorted array!
Using two pointers $l = i + 1$ and $r = n - 1$:
- If $a[i] + a[l] + a[r] == \text{target}$, we have found the triplet.
- If the sum is strictly less than target, increment $l$ to increase the sum.
- If the sum is strictly greater than target, decrement $r$ to decrease the sum.
Each outer iteration takes $O(n)$ two-pointer steps, giving $O(n^2)$ time overall.

## Optimal approach
1. Pair each element $\text{arr}[i]$ with its 1-based index $i + 1$ in an array $a$.
2. Sort array $a$ in ascending order of values.
3. For each index $i$ from $0$ to $n - 3$:
   - Set $l = i + 1$ and $r = n - 1$.
   - While $l < r$:
     - Compute the 64-bit sum: $s = (\text{long long})a[i].\text{val} + a[l].\text{val} + a[r].\text{val}$.
     - If $s == \text{target}$:
       - Collect their original indices: $\{a[i].\text{idx}, a[l].\text{idx}, a[r].\text{idx}\}$.
       - Sort the three indices ascending and return them.
     - Else if $s < \text{target}$: increment $l$.
     - Else: decrement $r$.
4. If no triplet is found, return `[-1, -1, -1]`.

Complexity:
- Time: $O(n^2)$ because sorting takes $O(n \log n)$ and the nested loops run $n$ passes of $O(n)$ two-pointer sweeps. For $n = 5000$, this finishes in $\approx 25$ ms.
- Space: $O(n)$ to store the array of value-index pairs.

## Code walkthrough
- `vector<pair<int, int>> a(n)`: Stores `(value, 1-based index)`.
- `sort(a.begin(), a.end())`: Orders elements ascending to enable two-pointer sweeps.
- `for (int i = 0; i < n - 2; i++)`: Fixes the first element of the candidate triplet.
- `int l = i + 1, r = n - 1`: Two pointers on the remaining elements to the right of $i$.
- `long long s = (long long)a[i].first + a[l].first + a[r].first`: Evaluates the triplet sum with 64-bit precision to prevent overflow.
- `sort(ans.begin(), ans.end())`: Restores strictly increasing order ($i < j < k$) among the three original indices.

## Test it out loud
- Test case $1$: `arr = [1, 2, 3, 4]`, target = 9. Triplet $2 + 3 + 4 = 9 \implies `[2, 3, 4]`$.
- Test case $2$: `arr = [1, 2, 3]`, target = 6. All three elements sum to $6 \implies `[1, 2, 3]`$.
- Test case $3$: `arr = [10, 20, 30, 40]`, target = 50. No three elements sum to $50 \implies `[-1, -1, -1]`$.
- Test case $4$: `target = 10^9` with large values $\implies$ 64-bit sum check handles values without overflow.

## Follow-ups
- What if we need to find all unique triplets without duplicates (like LeetCode 15)? Skip identical consecutive values for $i$, $l$, and $r$ after finding a match.
- What if $n = 200000$ and we want Sum of Four Values? $O(n^2)$ using a hash map or sorted list of all pairwise sums with index disjointness checks.

## Common mistakes
- 32-bit integer overflow: Adding three values each up to $10^9$ can reach $3 \times 10^9$, exceeding the 32-bit signed limit ($2.14 \times 10^9$). The sum must be computed using 64-bit integers.
- Returning sorted array positions instead of original indices: You must preserve original 1-based indices before sorting.
- Returning indices out of order: The problem requires $i < j < k$. Sorting the three original indices before returning ensures correctness.

## Further reading
- [3Sum Problem on Wikipedia](https://en.wikipedia.org/wiki/3SUM)
