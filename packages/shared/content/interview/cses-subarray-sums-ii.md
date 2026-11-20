---
id: cses-subarray-sums-ii
pattern: cses-sorting-and-searching
difficulty: medium
optimal: "O(n \log n) time and O(n) space"
reviewed: false
---

## Clarify first
- Can array elements be negative, zero, or positive? Yes, array elements range from $-10^9$ to $10^9$.
- Can the target sum be negative, zero, or positive? Yes, target is between $-10^9$ and $10^9$.
- What should be returned? The total count of contiguous subarrays whose elements sum to `target`.
- Can the total count exceed 32-bit limits? Yes, for an array of $200000$ zeros and target 0, the count is $\frac{n(n + 1)}{2} \approx 2 \times 10^{10}$, requiring a 64-bit integer (`long long`).
- What are the constraints? $1 \le n \le 200000$ and $-10^9 \le \text{arr}[i], \text{target} \le 10^9$.

## Examples to say out loud
- Consider `arr = [2, -1, 3, 5, -2]` and `target = 7`:
  - Prefix sums:
    - Initially: $P_0 = 0$.
    - After 2: $P_1 = 2$.
    - After -1: $P_2 = 1$.
    - After 3: $P_3 = 4$.
    - After 5: $P_4 = 9$. We need $P_k = 9 - 7 = 2$. $P_1 = 2$ exists (subarray $[-1, 3, 5]$ sums to 7). Count = 1.
    - After -2: $P_5 = 7$. We need $P_k = 7 - 7 = 0$. $P_0 = 0$ exists (entire array sums to 7). Count = 2.
  - Returns 2.
- Consider `arr = [0, 0, 0]` and `target = 0`:
  - Every non-empty subarray has sum 0: 6 subarrays.

## Brute force
A brute-force solution would compute the sum of all $\frac{n(n + 1)}{2}$ subarrays. For $n = 200000$, checking $2 \times 10^{10}$ subarrays in $O(n^2)$ time will exceed the time limit. Notice that two pointers does **not** work here because elements can be negative or zero, destroying monotonicity. A hash map with prefix sums computes the answer in $O(n)$ or $O(n \log n)$ time.

## The key observation
The sum of any subarray $\text{arr}[i \dots j]$ can be written as the difference of two prefix sums:
$$\text{sum}(\text{arr}[i \dots j]) = \text{pref}[j + 1] - \text{pref}[i]$$
We want this sum to equal `target`:
$$\text{pref}[j + 1] - \text{pref}[i] = \text{target} \iff \text{pref}[i] = \text{pref}[j + 1] - \text{target}$$
Therefore, as we iterate through the array and compute the current cumulative sum `pref`, any prior prefix sum equal to `pref - target` corresponds to a valid subarray ending at the current index. Maintaining a frequency map of prefix sums counts all valid matches in $O(1)$ or $O(\log n)$ per element.

## Optimal approach
1. Initialize a frequency map `freq` mapping prefix sums to their occurrence counts.
2. Seed the map with `freq[0] = 1` (representing an empty prefix before index 0).
3. Initialize 64-bit variables `pref = 0` and `count = 0`.
4. For each element $x$ in `arr`:
   - Add $x$ to `pref`.
   - Check if `pref - target` exists in `freq`. If so, add its stored count to `count`.
   - Increment `freq[pref]`.
5. Return `count`.

Complexity:
- Time: $O(n \log n)$ using an ordered map (`std::map`), or $O(n)$ average using an unordered hash map (`std::unordered_map`).
- Space: $O(n)$ to store prefix sums in the frequency map.

## Code walkthrough
- `map<long long, int> freq`: Stores frequencies of previously seen prefix sums.
- `freq[0] = 1`: Essential base case: accounts for subarrays starting at index 0 whose sum equals target.
- `long long pref = 0, count = 0`: 64-bit integers to prevent numerical overflow for both sums and total answer.
- `pref += x`: Accumulates running prefix sum.
- `auto it = freq.find(pref - target)`: Looks up how many earlier prefix boundaries complete a subarray of sum `target`.
- `freq[pref]++`: Records current prefix sum for future elements.

## Test it out loud
- Test case $1$: `arr = [1, 2, 3]`, target = 3. Prefixes: 0 (count 1), 1, 3 (finds 0 $\to +1$), 6 (finds 3 $\to +1$). Returns 2 (`[1, 2]` and `[3]`).
- Test case $2$: `arr = [-1, 1, -1, 1]`, target = 0. Multiple overlapping cancellations $\implies$ returns 4.
- Test case $3$: `arr = [0, 0, 0]`, target = 0. Prefix 0 frequency builds $1 \to 2 \to 3 \to 4$. Contributions: $1 + 2 + 3 = 6$.
- Test case $4$: Values up to $10^9$ with cancellations $\implies$ 64-bit prefix math prevents overflow.

## Follow-ups
- Why doesn't two-pointer sliding window work here? With negative numbers, expanding the window can decrease the sum, and shrinking can increase the sum, breaking the monotonic invariant required by two pointers.
- What if we need to find the maximum length of a subarray summing to target? Store the *earliest* index where each prefix sum was seen instead of the frequency count.

## Common mistakes
- Forgetting `freq[0] = 1`: Without seeding 0, any valid subarray starting at index 0 (e.g. `arr[0] == target`) will be missed.
- 32-bit integer overflow: Prefix sums can range from $-2 \times 10^{14}$ to $+2 \times 10^{14}$, and `count` can reach $2 \times 10^{10}$. Both must be 64-bit (`long long`).
- Inserting `freq[pref]++` before querying: If `target == 0`, adding to `freq` before querying counts an empty subarray rather than non-empty subarrays.

## Further reading
- [Prefix Sums on Wikipedia](https://en.wikipedia.org/wiki/Prefix_sum)
