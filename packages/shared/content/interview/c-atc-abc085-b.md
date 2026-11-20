---
id: c-atc-abc085-b
pattern: cses-atcoder
difficulty: easy
optimal: "O(n log n) time with sorting or a set, O(n) space"
reviewed: false
---

## Clarify first

- What condition must a valid stack of rice cakes satisfy? (Every cake in the stack must be strictly smaller in diameter than the cake immediately below it).
- Can we choose any subset of the available cakes? (Yes, any subset of cakes can be used to construct the stack).
- Can two cakes of identical diameter be placed in the same stack? (No, because the requirement is strictly smaller, two cakes of the same diameter can never appear in the same stack).
- What are the constraints on array length and diameters? (`1 <= d.length <= 100000`, and each diameter $1 \le d[i] \le 100000$).
- What should be returned? (The maximum number of cakes that can be included in a single valid stack).

## Examples to say out loud

- Standard case: `d = [10, 8, 8, 6]`. We can pick diameters 10, 8, and 6, stacking them as 6 on top of 8, and 8 on top of 10. The duplicate 8 cannot be used. Maximum height is 3.
- All identical: `d = [15, 15, 15]`. Only one cake can be chosen because no cake is strictly smaller than another. Output is 1.
- All distinct: `d = [1, 2, 3, 4, 5]`. All 5 cakes have different diameters and can be stacked in increasing order: $5, 4, 3, 2, 1$. Output is 5.

## Brute force

A brute-force approach would attempt to generate all $2^n$ subsets of the cakes, filter for those that can be ordered with strictly decreasing diameters, and find the maximum subset size. With $n = 100,000$, $2^{100000}$ is astronomically large and completely impossible to evaluate.

## The key observation

Notice that any two cakes with different diameters can always be ordered such that the smaller cake sits on top of the larger cake. Conversely, two cakes with identical diameters can never be placed in the same stack. Therefore, every distinct diameter present in the input can contribute exactly one cake to the optimal stack. The maximum height of the stack is precisely equal to the number of unique diameters in the array: $|\{d[0], d[1], \dots, d[n - 1]\}|$.

## Optimal approach

1. Collect all elements of the array `d` into a hash set or tree set to automatically eliminate duplicates.
2. Return the number of elements in the set: `set.size()`.
3. Alternatively (to achieve $O(1)$ auxiliary space without extra set overhead):
   - Sort the array `d` in ascending order.
   - Count the number of adjacent elements where `d[i] != d[i - 1]`, plus 1 for the first element.

Complexity:
- Time: `O(n log n)` when using `std::set` in C++ or sorting (or average `O(n)` with `std::unordered_set` / Java `HashSet` / Python `set`). For $n = 100,000$, this executes in under 25 ms.
- Space: `O(n)` auxiliary space to store the distinct elements in the set.

## Code walkthrough

In the reference implementation:
- `set<int>(d.begin(), d.end())`: constructs a balanced binary search tree containing all elements from vector `d`, which filters out duplicate diameters.
- `(int)set<...>.size()`: retrieves the count of unique diameters, which equals the maximum stack height.
- Returns this count directly.

## Test it out loud

- `d = [1]`:
  - Set contains `{1}`. Size is 1. Returns 1.
- `d = [100000, 1, 100000, 1]`:
  - Set contains `{1, 100000}`. Size is 2. Returns 2.
- `d = [5, 5, 5, 5, 4, 4, 3]`:
  - Unique values are 3, 4, 5.
  - Set size is 3. Returns 3.

## Follow-ups

- Can we solve this in $O(n)$ time and $O(1)$ extra space?
  In languages where modifying the input array in-place is permitted, we can sort the array with in-place introsort and use `std::unique`, taking $O(n \log n)$ time and $O(1)$ auxiliary space.
- What if the range of diameters is small ($d[i] \le 100,000$)?
  We can allocate a boolean frequency array of size 100,001 (or a bitset). Set `seen[x] = true` for each cake, then sum all `true` bits. This achieves $O(n + \max(d))$ time and $O(\max(d))$ space without hashing overhead.

## Common mistakes

- Trying to find the Longest Increasing Subsequence (LIS) with dynamic programming, which is unnecessary because any subset of distinct elements can be sorted freely.
- Counting duplicates instead of discarding them.
- Assuming the cakes must be stacked in the original input order rather than arbitrary subset ordering.

## Further reading

- Set data structures and duplicate elimination.
- Counting sort and boolean bitset deduplication.
