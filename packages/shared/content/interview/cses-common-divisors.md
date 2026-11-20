---
id: cses-common-divisors
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O(n + M log M) time, O(M) space"
reviewed: false
---

## Clarify first
- What are we asked to find? The maximum greatest common divisor (GCD) among all pairs of distinct array elements (arr[i], arr[j] with i != j).
- Can the two elements have the same value? Yes, if an element appears multiple times (e.g. arr = [5, 5]), their GCD is 5.
- What are the constraints on array length and values? Length n is between 2 and 200,000; values arr[i] are between 1 and 1,000,000.
- Is the return value an integer? Yes, the maximum possible GCD.
- What is the guaranteed minimum possible answer? Any two integers share 1 as a common divisor, so the answer is always at least 1.

## Examples to say out loud
Suppose arr = [3, 14, 15, 7, 9].
Consider pairs:
- Pair (14, 7): gcd(14, 7) = 7.
- Pair (15, 9): gcd(15, 9) = 3.
- Pair (15, 3): gcd(15, 3) = 3.
The maximum GCD across all pairs is 7.

Suppose arr = [2, 4, 8, 16].
The pair (8, 16) has gcd(8, 16) = 8, which is the maximum.

## Brute force
A brute-force solution evaluates `gcd(arr[i], arr[j])` for every pair (i, j) with i < j.
There are n * (n - 1) / 2 pairs. With n = 200,000, that is roughly 2 * 10^10 pairs, and computing Euclidean GCD per pair takes logarithmic time.
This O(n^2 * log(max_val)) approach will cause a massive time limit exceeded.
Instead of testing pairs of numbers, we can invert the search and test candidate common divisors directly.

## The key observation
An integer g is a common divisor of at least two numbers in `arr` if and only if at least two elements in `arr` are multiples of g (i.e. among g, 2g, 3g, ...).
Because the maximum value M in arr is at most 1,000,000, we can iterate candidate divisor g backwards from M down to 1.
For each g, we count how many array elements are multiples of g.
The first (largest) g for which the count of multiples is >= 2 is guaranteed to be the maximum GCD of any pair.
The total number of multiples checked across all g is M/1 + M/2 + M/3 + ... + M/M = M * H_M approx M * ln(M), which is around 1.4 * 10^7 operations.

## Optimal approach
1. Find the maximum value M in arr: `maxVal = max(arr)`.
2. Construct a frequency array `cnt` of size M + 1 where `cnt[x]` stores the count of occurrences of number x in arr.
3. Iterate candidate divisor g from `maxVal` down to 1:
   - Initialize `multiples = 0`.
   - Iterate through multiples k = g, 2g, 3g, ... up to `maxVal`:
     - Add `cnt[k]` to `multiples`.
     - Early exit: if `multiples >= 2`, return `g` immediately.
4. If no g > 1 meets the condition, return 1.

Complexity: O(n + M log M) time where M <= 10^6 (harmonic series summation), and O(M) space for the frequency table.

## Code walkthrough
In step 1, a single pass over `arr` finds `maxVal` and populates `cnt[x]++`.
In step 2, the outer loop `for (int g = maxVal; g >= 1; g--)` guarantees that the first valid g found is the maximum possible.
The inner step loop `for (int k = g; k <= maxVal; k += g)` jumps directly through multiples of g.
Accumulating `multiples += cnt[k]` handles duplicates correctly: if value 8 appears twice, `cnt[8] == 2`, which immediately fulfills `multiples >= 2` when g = 8.
The condition `if (multiples >= 2) return g;` terminates as soon as two multiples are identified.

## Test it out loud
- Two identical elements: arr = [5, 5, 5]. `cnt[5] = 3`. For g = 5, multiples = 3 >= 2. Returns 5.
- Coprime set: arr = [7, 11, 13]. No candidate g > 1 has >= 2 multiples. g = 1 counts 3 multiples >= 2. Returns 1.
- Multiple of another: arr = [10, 20]. For g = 10, multiples are 10 and 20 (count = 2). Returns 10.
- Mixed multiples: arr = [12, 18, 24, 30]. For g = 12, multiples are 12 and 24 (count = 2). Returns 12.

## Follow-ups
- Why is harmonic series sum O(M log M)? The sum of 1/k from 1 to M is bounded by ln(M) + gamma. Multiplying by M gives M * ln(M). For M = 10^6, this is about 1.4 * 10^7 operations, completing well within a fraction of a second.
- What if M was 10^9 and n was small (n = 1000)? Then iterating up to M would fail. An O(n^2 * log(max_val)) all-pairs check or factoring each number into divisors would be appropriate instead.
- Can we parallelize the search? Because the search terminates on the first g >= 1 from top down, candidate checks can be split into chunks, though single-threaded harmonic sieve is already extremely fast.

## Common mistakes
- Counting unique values instead of total occurrences: if an element appears twice, its frequency is 2; ignoring duplicates would miss cases where a pair consists of two identical numbers.
- Checking candidate g up to 10^9: the upper bound is strictly the maximum element present in arr, not theoretical maximum constraints.
- Iterating g from 1 up to M: iterating upwards requires finding all valid g and taking the maximum, whereas iterating downwards enables an immediate early return on the first match.

## Further reading
- Harmonic series and divisor sieve analysis
- Euclidean greatest common divisor algorithm
- Fast factor sieve methods in competitive programming
