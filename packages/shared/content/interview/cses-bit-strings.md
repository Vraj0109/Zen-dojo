---
id: cses-bit-strings
pattern: cses-introductory
difficulty: medium
optimal: "O(log n) time and O(1) space"
reviewed: false
---

## Clarify first
- What is a bit string? A string composed solely of binary digits '0' and '1'.
- How many choices exist per position? Exactly 2 choices (0 or 1) for each of the $n$ independent positions.
- What modulo should be applied? Modulo $10^9 + 7$ ($1000000007$).
- What are the bounds on $n$? $1 \le n \le 10^6$.

## Examples to say out loud
- Consider $n = 3$:
  - The bit strings are: "000", "001", "010", "011", "100", "101", "110", "111".
  - Total count = $2^3 = 8$. Modulo $10^9 + 7$ is $8$.
- Consider $n = 1$:
  - Bit strings are "0" and "1". Count = $2^1 = 2$.
- Consider $n = 4$:
  - Count = $2^4 = 16$.

## Brute force
A brute-force generation would enumerate all strings of length $n$ using recursion or bit masking and count them. Enumerating strings takes $O(2^n)$ time, which TLEs almost instantly for $n > 30$. Even a linear loop multiplying by 2 modulo $10^9 + 7$ takes $O(n)$ time. We can achieve $O(\log n)$ time using binary exponentiation.

## The key observation
By the fundamental counting principle, each of the $n$ positions has 2 independent possibilities. Therefore, the total number of bit strings is $2^n$. Because $n$ can be up to $10^6$, $2^n$ is astronomically large, but we only need the result modulo $10^9 + 7$. Binary exponentiation (exponentiation by squaring) computes $(2^n) \pmod{10^9 + 7}$ in $O(\log n)$ multiplications.

## Optimal approach
1. Define modulo $M = 1000000007$.
2. Initialize `res = 1` and `base = 2`.
3. While $n > 0$:
   - If the least significant bit of $n$ is 1 (i.e. $n \pmod 2 == 1$), multiply `res = (res * base) % M`.
   - Square the base: `base = (base * base) % M`.
   - Right shift $n$ by 1 ($n = n / 2$).
4. Return `res`.

Complexity:
- Time: $O(\log n)$ because $n$ is halved on every iteration, taking at most 20 iterations for $n = 10^6$.
- Space: $O(1)$ auxiliary space.

## Code walkthrough
- `long long res = 1, base = 2, mod = 1000000007`: Uses 64-bit integers to prevent overflow during intermediate multiplications before modulo.
- `while (n > 0)`: Standard binary exponentiation loop.
- `if (n & 1) res = (res * base) % mod`: If the current bit in the binary representation of $n$ is set, fold the accumulated base into the answer.
- `base = (base * base) % mod`: Squares the base for the next higher bit power.
- `n >>= 1`: Shifts to process the next bit.

## Test it out loud
- Test case $1$: $n = 1 \implies 2^1 \pmod M = 2$.
- Test case $2$: $n = 2 \implies 2^2 \pmod M = 4$.
- Test case $3$: $n = 4 \implies 2^4 \pmod M = 16$.
- Test case $4$: $n = 10 \implies 2^{10} = 1024$.
- Test case $5$: $n = 30 \implies 2^{30} \pmod{10^9 + 7} = 1073741824 \pmod{10^9 + 7} = 73741817$.

## Follow-ups
- Why is binary exponentiation preferred over linear multiplication? While $O(n)$ runs within time limits for $n = 10^6$, $O(\log n)$ executes in under 25 operations and scales effortlessly up to $n = 10^{18}$.
- Could Fermat's Little Theorem be applied if $n$ is even larger? Yes, since $10^9 + 7$ is prime, $2^n \equiv 2^{n \pmod{M - 1}} \pmod M$.

## Common mistakes
- Intermediate 32-bit overflow: If `res` or `base` is typed as a 32-bit `int`, the product `res * base` can reach $(10^9)^2 = 10^{18}$, which overflows a 32-bit signed integer before the modulo operation is applied.
- Forgetting to modulo after each multiplication: Performing modulo only at the end causes integer overflow on the very first few powers.

## Further reading
- [Modular Exponentiation on Wikipedia](https://en.wikipedia.org/wiki/Modular_exponentiation)
