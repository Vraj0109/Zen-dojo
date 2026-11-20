---
id: cses-missing-coin-sum-queries
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O((n + q * log C) log n) time, O(n log n) space"
reviewed: false
---

## Clarify first
- What is the question for each query? Using coins in subarray [a, b] (1-based, each coin used at most once), find the smallest positive sum that cannot be formed.
- What is the single-set greedy logic? Sort coins ascending. If reachable sums are 0..s and the next coin has v <= s + 1, reach extends to s + v. If v > s + 1, s + 1 is the answer.
- Can values exceed 32 bits? Yes, answers can reach 2 * 10^14, requiring 64-bit integers.
- What are the constraints? Up to 200,000 coins and 200,000 queries, with coin values up to 10^9.
- Does the coin array mutate? No, the coin array is static.

## Examples to say out loud
Suppose coins are [2, 9, 1, 2, 7] and query is [1, 5] (all coins).
Sorted coins: [1, 2, 2, 7, 9].
Start with s = 0.
- Coin 1: 1 <= s + 1, s = 0 + 1 = 1.
- Coin 2: 2 <= s + 1, s = 1 + 2 = 3.
- Coin 2: 2 <= s + 1, s = 3 + 2 = 5.
- Coin 7: 7 > s + 1 (7 > 6). We cannot make sum 6!
Answer is 6.

For query [1, 3] on coins [2, 9, 1]: sorted is [1, 2, 9]. Reach 1, then 3, then 9 > 4, so answer is 4.

## Brute force
For each query [a, b], copying and sorting subarray coins takes O((b - a) log(b - a)) time.
With 200,000 queries, this takes O(q * n log n) time (> 10^11 operations) and times out.
Instead of inspecting coins one by one, we can batch all coins with value <= s + 1 using a Persistent Segment Tree.

## The key observation
If sums 0..s are currently reachable, we can include all coins in range [a, b] with value <= s + 1.
Let `t` be the sum of all coins in [a, b] with value <= s + 1:
- If t == s, no more coins in [a, b] can bridge the gap at s + 1; answer is s + 1.
- If t > s, reachable sum expands to t (`s = t`).
Because newly included coins exceed earlier thresholds, s roughly doubles whenever it does not terminate.
Thus the loop runs at most O(log C) approx 30 to 40 rounds per query.
A Persistent Segment Tree built over coin values allows range sum queries for all coins with value <= v in O(log n) time.

## Optimal approach
1. Sort coin indices by value into `order` and keep `sortedVals`.
2. Build a Persistent Segment Tree over positions 0 to n - 1:
   - Root 0 is empty.
   - Root i + 1 inserts coin at position `order[i]` with its value into root i.
3. For each query [a, b]:
   - Initialize `s = 0`.
   - While true:
     - Find count of coins with value <= s + 1: `c = upper_bound(sortedVals, s + 1) - sortedVals.begin()`.
     - Query range sum in version c: `t = query(root[c], 0, n - 1, a - 1, b - 1)`.
     - If `t == s`, break loop.
     - Set `s = t`.
   - Output `s + 1`.
4. Return answers list.

Complexity: O((n + q * log C) log n) time and O(n log n) space.

## Code walkthrough
In C++, `order` is sorted using a comparator on `coins[x]`.
`root[i + 1] = add(...)` creates versions containing the i + 1 smallest coins.
In each query loop:
`upper_bound` identifies version `c` containing all coins with value <= s + 1.
`query(root[c], ...)` returns the sum of these coins in [a, b].
When `t == s`, the expansion terminates and `s + 1` is appended.

## Test it out loud
- Missing 1: coins = [5], query [1, 1]. s = 0. No coins <= 1. t = 0 == s, returns 1.
- Has 1: coins = [1], query [1, 1]. s = 0. Coin 1 gives t = 1. Next round finds no coins <= 2, returns 2.
- Powers of two: coins = [1, 2, 4, 8, 16], query [1, 5]. Reachable sums double: 1, 3, 7, 15, 31, returning 32.
- 64-bit bounds: values up to 10^9 accumulate past 2^31 - 1, safely handled by `long long`.

## Follow-ups
- Why does s double? Adding coins <= s + 1 either contains a large sum or adds coins close to s + 1, doubling s.
- How does this compare to Wavelet trees? Wavelet trees can also answer range value-sum queries in O(log C) time.
- What if updates were allowed? Requires dynamic 2D Segment Trees or Fenwick trees with Treaps.

## Common mistakes
- Running linear scan per query: sorting causes severe TLE.
- Using 32-bit integers: reachable sums exceed 2^31 - 1, so `long long` is mandatory.
- Testing `< s + 1` instead of `<= s + 1`: coins up to s + 1 extend the reach without gaps.

## Further reading
- Persistent Segment Trees for orthogonal range queries
- Smallest unformable subset sum greedy algorithm
- Wavelet trees for range value sum queries
