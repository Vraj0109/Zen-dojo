---
id: cses-prime-multiples
pattern: cses-range-tree-math-string
difficulty: medium
optimal: "O(2^k * k) time, O(1) space where k is primes.length <= 20"
reviewed: false
---

## Clarify first
- How large can `n` be? Up to `10^18`.
- How many primes are in the list? Up to `k = 20` distinct primes.
- Are all primes guaranteed to be prime and distinct? Yes, constraints specify distinct prime numbers.
- What value should be returned? A 64-bit integer representing the total count of numbers between 1 and `n` divisible by at least one of the primes.

## Examples to say out loud
- Consider `n = 10, primes = [2, 3]`:
  - Multiples of 2 up to 10: `10 / 2 = 5`.
  - Multiples of 3 up to 10: `10 / 3 = 3`.
  - Multiples of both (i.e. multiples of 6): `10 / 6 = 1`.
  - Total coprime union by inclusion-exclusion: `5 + 3 - 1 = 7`.
  - Indeed, multiples are 2, 3, 4, 6, 8, 9, 10 (7 numbers).
- Consider `n = 20, primes = [2, 5, 7]`:
  - Union count is 13.
- Consider `n = 1, primes = [2, 3]`:
  - No integer between 1 and 1 is divisible by 2 or 3. Returns 0.

## Brute force
Checking every integer from 1 to `n` takes `O(n * k)` time. Because `n` can reach `10^18`, any linear or polynomial scan over the domain `n` is out of the question. We must exploit the small size `k <= 20`.

## The key observation
Since `k <= 20`, the total number of non-empty subsets of primes is `2^k - 1 <= 1048575`.
By the Principle of Inclusion-Exclusion (PIE):
The size of the union of multiples is:
`sum_{S ⊆ primes, S != ∅} (-1)^{|S| - 1} * floor(n / prod_{p in S} p)`.
Subsets with an odd number of primes are added, while subsets with an even number of primes are subtracted. To prevent 64-bit integer multiplication overflow when forming the product of primes in subset `S`, if any `p > n / prod`, the product exceeds `n`, meaning `floor(n / prod) = 0`, so that subset can be pruned immediately.

## Optimal approach
1. Let `k = primes.length`.
2. Initialize `ans = 0`.
3. Loop through all bitmasks `mask` from `1` to `(1 << k) - 1`:
   - Initialize `prod = 1`, `bits = 0`, and `overflow = false`.
   - Iterate bit `i` from 0 to `k - 1`:
     - If `(mask >> i) & 1`:
       - Increment `bits`.
       - Check if `primes[i] > n / prod`. If so, set `overflow = true` and break.
       - Otherwise, multiply `prod *= primes[i]`.
   - If `overflow` is true, continue to the next mask.
   - Compute `count = n / prod`.
   - If `bits` is odd, `ans += count`; if `bits` is even, `ans -= count`.
4. Return `ans`.

Complexity:
- Time: `O(2^k * k)` time because there are `2^k` subsets, and each bitmask inspects `k` bits. For `k = 20`, `20 * 2^20 ≈ 2 * 10^7` operations, running in under 0.1 seconds.
- Space: `O(1)` auxiliary space.

## Code walkthrough
- `int totalSubsets = 1 << k;` iterates through all non-empty prime subsets.
- `if (primes[i] > n / prod)` safely guards against 64-bit signed integer overflow before multiplying `prod *= primes[i]`.
- `long long count = n / prod;` calculates multiples of the current prime combination up to `n`.
- `if (bits % 2 == 1) ans += count; else ans -= count;` applies the inclusion-exclusion sign.

## Test it out loud
- Test `n = 1, primes = [2, 3]`: Both `1 / 2 = 0` and `1 / 3 = 0`, returns 0.
- Test `n = 10, primes = [5]`: `10 / 5 = 2`, returns 2.
- Test `n = 100, primes = [2, 3, 5]`: Sum of singles `(50 + 33 + 20) = 103`, minus pairs `(16 + 10 + 6) = 32`, plus triple `3`, gives `103 - 32 + 3 = 74`.
- Test `n = 1000000000000, primes = [2, 3]`: `n / 2 + n / 3 - n / 6 = 500000000000 + 333333333333 - 166666666667 = 666666666666`. Accurate.

## Follow-ups
- What if `k` were up to 100?
  - Inclusion-exclusion would not scale to `2^100`. One would need combinatorial approximations or min-heap / branch-and-bound pruning.
- Why check `primes[i] > n / prod` instead of `prod * primes[i] > n`?
  - Direct multiplication can silently overflow `long long` wrap-around, leading to negative products or undefined behavior.

## Common mistakes
- Not guarding against 64-bit overflow when taking products of primes, causing negative numbers and incorrect quotient counts.
- Using 32-bit integers for `n`, `prod`, or `ans`.
