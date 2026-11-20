---
id: cses-fibonacci-numbers
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O(log n) time, O(1) space"
reviewed: false
---

## Clarify first
- How is the Fibonacci sequence defined? F_0 = 0, F_1 = 1, and F_n = F_{n - 1} + F_{n - 2} for all n >= 2.
- What modulo is used? Modulo 10^9 + 7 (1,000,000,007).
- What are the constraints on n? 0 <= n <= 10^18.
- Can n = 0? Yes, F_0 = 0.
- What should be returned? An integer representing F_n modulo 10^9 + 7.

## Examples to say out loud
Suppose n = 8.
The Fibonacci sequence starts: 0, 1, 1, 2, 3, 5, 8, 13, 21.
F_8 is 21.

For edge case n = 0, F_0 = 0.
For n = 1, F_1 = 1.
For n = 2, F_2 = 1.
For n = 10, F_10 = 55.

## Brute force
A standard iterative loop computes each Fibonacci number using two variables:
`for (long long i = 2; i <= n; i++) { c = (a + b) % MOD; a = b; b = c; }`
While this uses O(1) memory, the runtime is O(n).
When n is up to 10^18, a linear loop performs 10^18 operations, which would take centuries to run.
Because the transition is a linear recurrence, we can express it in matrix form and use binary matrix exponentiation to solve it in O(log n) time.

## The key observation
The linear recurrence F_{k+1} = F_k + F_{k-1} can be written in 2x2 matrix form:
`[F_{k+1}, F_k]^T = [[1, 1], [1, 0]] * [F_k, F_{k-1}]^T`.
By induction, applying this transition matrix M = [[1, 1], [1, 0]] n times gives:
`M^n = [[F_{n+1}, F_n], [F_n, F_{n-1}]]`.
Therefore, raising matrix M to the power n gives F_n directly at position (0, 1) or (1, 0) of the resulting matrix.
Using repeated squaring on matrices computes M^n in O(log n) multiplications, where each 2x2 matrix multiplication takes constant time.

## Optimal approach
1. Handle base cases: if n == 0 return 0; if n == 1 return 1.
2. Define a 2x2 matrix multiplication helper modulo 1000000007.
3. Initialize the result matrix `res` to the 2x2 identity matrix: `[[1, 0], [0, 1]]`.
4. Initialize the base transition matrix `base` to `[[1, 1], [1, 0]]`.
5. Set `exp = n`. While `exp > 0`:
   - If `exp & 1` is true, set `res = multiply(res, base)`.
   - Set `base = multiply(base, base)`.
   - Shift `exp >>= 1`.
6. Return `(int)res[0][1]`.

Complexity: O(log n) time (at most ~60 matrix multiplications for n <= 10^18), and O(1) space.

## Code walkthrough
In C++, the `multiply` lambda takes two 2x2 matrices `A` and `B` and computes `C[i][j] = sum(A[i][k] * B[k][j]) % MOD`.
Because matrix dimensions are fixed at 2x2, the inner loops execute exactly 8 multiplications and additions.
The binary exponentiation loop checks bits of `exp = n`.
When `exp & 1` is set, `res` accumulates the current power of `base`.
Then `base` is squared to advance to the next binary power.
Finally, `res[0][1]` holds F_n modulo 10^9 + 7.

## Test it out loud
- Base case n = 0: returns 0 immediately via early check.
- Base case n = 1: returns 1 immediately via early check.
- Small power n = 2: M^2 = [[1, 1], [1, 0]] * [[1, 1], [1, 0]] = [[2, 1], [1, 1]]. `res[0][1] = 1`, which is F_2.
- Power n = 10: binary exponentiation takes 4 squarings and yields F_10 = 55.
- Huge power n = 10^18: takes ~60 iterations, executes in less than a millisecond without precision loss.

## Follow-ups
- Can this be done without matrices? Yes, using fast doubling formulas: F_{2k} = F_k * (2 * F_{k+1} - F_k) and F_{2k+1} = F_{k+1}^2 + F_k^2. Fast doubling requires only 2 state variables per step.
- What if the recurrence had k terms instead of 2? Matrix exponentiation generalizes to any k-th order linear recurrence using a k x k companion matrix in O(k^3 * log n) time.
- What is the Pisano period? The sequence of Fibonacci numbers modulo m is strictly periodic. Modulo 10^9 + 7, the period is 2 * 10^9 + 16, though matrix exponentiation is fast enough that computing the period is unnecessary.

## Common mistakes
- Using 32-bit integers for matrix products: `A[i][k] * B[k][j]` can reach (10^9 + 7)^2 approx 10^18 before modulo is taken, which overflows 32-bit signed integers. 64-bit integers (`long long`) are required.
- Incorrect identity matrix: starting `res` as all zeroes instead of identity `[[1, 0], [0, 1]]` will result in all matrix products being zero.
- Confusing 0-based and 1-based Fibonacci indexing: verifying with n = 2 (F_2 = 1) and n = 3 (F_3 = 2) prevents off-by-one errors in which matrix element is returned.

## Further reading
- Matrix exponentiation for linear recurrence relations
- Fast doubling algorithm for Fibonacci numbers
- Pisano period properties of modular Fibonacci sequences
