---
id: cses-trailing-zeros
pattern: cses-introductory
difficulty: medium
optimal: "O(log_5 n) time and O(1) space"
reviewed: false
---

## Clarify first
- What are we computing? The count of trailing zeros in the decimal representation of $n!$.
- What is the range of $n$? $1 \le n \le 10^9$.
- Can we compute $n!$ directly? No, for $n = 10^9$, $n!$ has billions of digits and cannot be computed directly.
- Does the return value fit in a standard 32-bit integer? Yes, the maximum number of trailing zeros for $10^9!$ is roughly $\frac{10^9}{4} \approx 2.5 \times 10^8$, which fits in a signed 32-bit integer.

## Examples to say out loud
- Consider $n = 20$:
  - Factors of $5$ come from $5, 10, 15, 20$.
  - $\lfloor 20 / 5 \rfloor = 4$.
  - Since $20 < 25$, higher powers contribute 0.
  - Trailing zeros = 4.
- Edge case: $n = 25$:
  - Multiples of $5$: $5, 10, 15, 20, 25 \implies 5$ multiples.
  - Multiples of $25$: $25 = 5^2$ contributes an additional factor of $5$.
  - Total count = $\lfloor 25 / 5 \rfloor + \lfloor 25 / 25 \rfloor = 5 + 1 = 6$.

## Brute force
A brute force approach would multiply numbers from $1$ to $n$ and count trailing zeros. Even with big-integer libraries, computing $n!$ for $n = 10^9$ requires millions of years and astronomical memory. Another approach might iterate $i$ from $1$ to $n$ and count prime factors of $5$ for each $i$, taking $O(n \log_5 n)$ time, which TLEs for $n = 10^9$. We can compute the answer in $O(\log_5 n)$ time using Legendre's formula.

## The key observation
A trailing zero in base 10 is formed by each factor of $10 = 2 \times 5$. In $n! = 1 \times 2 \times \dots \times n$, multiples of $2$ appear far more frequently than multiples of $5$, meaning factors of $5$ are the strict bottleneck.
By Legendre's formula, the number of factors of $5$ in $n!$ is:
$$E_5(n!) = \sum_{k=1}^{\infty} \lfloor \frac{n}{5^k} \rfloor = \lfloor \frac{n}{5} \rfloor + \lfloor \frac{n}{25} \rfloor + \lfloor \frac{n}{125} \rfloor + \dots$$
Each iteration divides $n$ by $5$ and adds the quotient until $n < 5$.

## Optimal approach
1. Initialize `count = 0`.
2. While $n \ge 5$:
   - Add $\lfloor n / 5 \rfloor$ to `count`.
   - Update $n = \lfloor n / 5 \rfloor$.
3. Return `count`.

Complexity:
- Time: $O(\log_5 n)$ because $n$ is divided by $5$ in each step (at most 13 iterations for $n = 10^9$).
- Space: $O(1)$ auxiliary space.

## Code walkthrough
- `int count = 0`: Accumulates the total count of prime factor 5 contributions.
- `while (n >= 5)`: Terminates once the remaining quotient is strictly less than 5.
- `count += n / 5`: Counts how many numbers $\le n$ are multiples of the current power of 5.
- `n /= 5`: Reduces $n$ so the next iteration counts multiples of the next power of 5.

## Test it out loud
- Test case $1$: $n = 1 \implies 1 < 5$, loop does not run, returns 0.
- Test case $2$: $n = 5 \implies 5/5 = 1$, $n$ becomes 1, returns 1.
- Test case $3$: $n = 10 \implies 10/5 = 2$, $n$ becomes 2, returns 2.
- Test case $4$: $n = 25 \implies 25/5 = 5$ ($n$ becomes 5), then $5/5 = 1$ ($n$ becomes 1), returns $5 + 1 = 6$.
- Test case $5$: $n = 100 \implies 20 + 4 = 24$.

## Follow-ups
- How would we find trailing zeros in base $b$ instead of base 10? Factorize $b$ into its prime powers $p_1^{a_1} \dots p_k^{a_k}$, compute the exponent of each prime $p_i$ in $n!$ using Legendre's formula, divide each by $a_i$, and take the minimum across all prime factors.
- What if we need the last non-zero digit of $n!$? We would track factor counts of 2 and 5, cancel them out, and maintain the product of remaining digits modulo 10.

## Common mistakes
- Counting factors of 2 as well: Since 2s are always in surplus compared to 5s in factorials, computing powers of 2 is redundant.
- Accumulating powers of 5 directly in a multiplier variable: Calculating $5^k$ directly can cause 32-bit overflow when $5^k > 2^{31} - 1$. Continually dividing $n$ by 5 avoids power calculation and overflow entirely.

## Further reading
- [Legendre's Formula on Wikipedia](https://en.wikipedia.org/wiki/Legendre%27s_formula)
