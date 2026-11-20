---
id: c-atc-abc081-b
pattern: cses-atcoder
difficulty: easy
optimal: "O(n log max) time, O(1) space"
reviewed: false
---

## Clarify first

- What operation is performed on the array in each step? (If every number in the array is even, replace each number with its half; otherwise, the process halts).
- What should be returned? (The maximum number of simultaneous halving operations performed before at least one number becomes odd).
- What are the constraints on array length and elements? (`1 <= a.length <= 200` and each element $1 \le a[i] \le 10^9$).
- Can any element start as odd? (Yes, if any initial element is odd, zero moves can be made; the function returns 0).
- Are elements guaranteed to be strictly positive? (Yes, $a[i] \ge 1$, so numbers never reach 0).

## Examples to say out loud

- Standard case: `a = [8, 12, 40]`.
  - Initial: all even. Halve once $\to [4, 6, 20]$ (1 move).
  - Second step: all even. Halve again $\to [2, 3, 10]$ (2 moves).
  - Third step: 3 is odd, so halving cannot continue. Total moves = 2.
- Starts with odd: `a = [5, 6, 8, 10]`. Element 5 is odd from the start. Returns 0.
- Single power of two: `a = [536870912]`. $536870912 = 2^{29}$. Can be halved 29 times until reaching 1. Returns 29.

## Brute force

A direct simulation repeatedly scans the array in a `while` loop. In each round, it iterates through all $n$ numbers to verify if all are even. If true, it divides all $n$ numbers by 2 in-place and increments a move counter. If any odd number is found, it terminates and returns the counter. Because numbers are bounded by $10^9 < 2^{30}$, each number can be halved at most 30 times. The simulation runs at most 30 rounds of size $n$, running in $O(30n)$ time. While fast enough for $n \le 200$, modifying the array across rounds is unnecessary.

## The key observation

The entire array halts as soon as any single element becomes odd. An integer $x$ can be halved as many times as the exponent of 2 in its prime factorization (or the number of trailing zero bits in its binary representation, $\nu_2(x)$). Because every halving step halves all elements simultaneously, the total number of operations possible is strictly constrained by the element that runs out of factors of 2 first. Therefore, the answer is simply the minimum count of factors of 2 across all elements: $\min_{x \in a} \nu_2(x)$.

## Optimal approach

1. Initialize a variable `best` to a large number (e.g., 100, since no 32-bit positive integer has more than 30 factors of 2).
2. For each number `x` in the array `a`:
   a. Count how many times `x` can be divided by 2:
      - Initialize `c = 0`.
      - While `x % 2 == 0`: divide `x /= 2` and increment `c`.
   b. Update `best = min(best, c)`.
   c. (Optional early exit): If `best == 0`, return 0 immediately.
3. Return `best`.

Complexity:
- Time: `O(n log max)` where $n$ is the number of elements and $\log(\max) \le 30$. Each number is divided by 2 at most 30 times, requiring at most $200 \times 30 = 6,000$ operations.
- Space: `O(1)` auxiliary space because we only maintain scalar loop variables without allocating additional memory or modifying the input array.

## Code walkthrough

In the reference implementation:
- `int best = 100;`: establishes an upper bound sentinel that will be minimized.
- `for (int x : a)`: examines each element in the input list independently.
- `while (x % 2 == 0) { x /= 2; c++; }`: extracts the 2-adic valuation $\nu_2(x)$ by repeatedly halving until an odd quotient is reached.
- `best = min(best, c);`: keeps track of the element that limits the maximum halving depth of the array.
- `return best;`: returns the bottleneck operation count.

## Test it out loud

- `a = [1]`:
  - `x = 1`: `1 % 2 != 0`, `c = 0`. `best = min(100, 0) = 0`. Returns 0.
- `a = [2]`:
  - `x = 2`: `2 % 2 == 0 \implies x = 1, c = 1`. `best = 1`. Returns 1.
- `a = [8, 12, 40]`:
  - $8 = 2^3 \implies c = 3$.
  - $12 = 2^2 \times 3 \implies c = 2$.
  - $40 = 2^3 \times 5 \implies c = 3$.
  - `best = min(3, 2, 3) = 2`. Returns 2.

## Follow-ups

- Can we count the trailing zeros in $O(1)$ per element using bitwise intrinsics?
  Yes, using `__builtin_ctz(x)` in C++ (Count Trailing Zeros) or `Integer.numberOfTrailingZeros(x)` in Java. This computes $\nu_2(x)$ in a single CPU instruction, reducing the runtime to $O(n)$.
- What if we compute the bitwise OR of all elements first?
  The operation $\nu_2(\text{bit\_or}_{i} a[i])$ equals the minimum number of trailing zeros among all $a[i]$. Folding the entire array into a single cumulative bitwise OR in $O(n)$ and counting trailing zeros gives the exact answer with zero division operations.

## Common mistakes

- Re-checking the entire array inside a nested while loop instead of observing the independence of prime factors of 2.
- Modifying the original input array when it may be needed by the caller.
- Forgetting to reset the counter `c = 0` between iterations over elements.

## Further reading

- 2-adic valuation and trailing zero bit manipulation (`__builtin_ctz`).
- Bitwise reduction operations in hardware.
