---
id: c-euler-23
pattern: cses-euler
difficulty: medium
optimal: "O(L log L + A^2) time, O(L) space"
reviewed: false
---

## Clarify first
- What is an abundant number? A positive integer $n$ whose sum of proper divisors (divisors strictly less than $n$) is strictly greater than $n$.
- What is the smallest abundant number? 12, because its proper divisors are 1, 2, 3, 4, and 6, which sum to $16 > 12$.
- What is the question asking? The sum of all positive integers up to `limit` that CANNOT be expressed as the sum of two abundant numbers (the two abundant numbers may be equal, such as $12 + 12 = 24$).
- How large can `limit` be? Up to $10^9$.
- Can any number greater than 28123 fail to be the sum of two abundant numbers? No, mathematical analysis proves that every integer strictly greater than 28123 can be written as the sum of two abundant numbers. Therefore, we only need to test numbers up to $\min(\text{limit}, 28123)$.

## Examples to say out loud
- The smallest number that is the sum of two abundant numbers is $12 + 12 = 24$.
- All positive integers from 1 up to 23 cannot be written as the sum of two abundant numbers.
  For `limit = 24`, the unmarked numbers are $1, 2, \dots, 23$.
  Their sum is $\frac{23 \times 24}{2} = 276$.
- For `limit = 10`, the sum of all numbers $1 \dots 10$ is $\frac{10 \times 11}{2} = 55$.

## Brute force
A brute force approach for each number $x \le \text{limit}$ would factorize $x$, check every split $x = a + b$, and determine if both $a$ and $b$ are abundant. Factoring numbers independently up to $10^9$ is impossible. However, the upper bound 28123 caps the search space dramatically, allowing a linear sieve.

## The key observation
1. Every integer $> 28123$ can be proven to be the sum of two abundant numbers. We can immediately cap the search threshold at $L = \min(\text{limit}, 28123)$.
2. We compute the sum of proper divisors for all integers up to $L$ in $O(L \log L)$ time using an additive sieve: for each divisor $d$, add $d$ to all multiples $2d, 3d, \dots \le L$.
3. Collect all abundant numbers ($\sigma(i) > i$) up to $L$ into a list `ab`. There are only 6965 abundant numbers up to 28123.
4. Mark all pairwise sums $ab[i] + ab[j] \le L$ in a boolean array of size $L + 1$.
5. Sum all unmarked integers $1 \le i \le L$.

## Optimal approach
1. Define $L = \min(\text{limit}, 28123)$.
2. Allocate array `sig` of size $L + 1$ initialized to 0.
3. Sieve proper divisor sums:
   - For each $d$ from 1 to $L / 2$:
     - For each multiple $m = 2d, 3d, \dots \le L$:
       - `sig[m] += d`.
4. Collect all abundant numbers:
   - For $i$ from 1 to $L$: if `sig[i] > i`, append $i$ to list `ab`.
5. Allocate a boolean array `mark` of size $L + 1$.
6. For each $i$ from 0 to $|ab| - 1$:
   - For each $j$ from $i$ to $|ab| - 1$:
     - If $ab[i] + ab[j] > L$, break out of inner loop.
     - Set `mark[ab[i] + ab[j]] = true`.
7. Accumulate the sum of all $i \in [1, L]$ where `mark[i] == false` using a 64-bit integer.
8. Return the sum.
9. Complexity:
   - Time Complexity: $O(L \log L + A^2)$, where $L \le 28123$ and $A \le 6965$. Generating pairs with $a + b \le L$ performs only about $2.5 \times 10^7$ iterations, executing in ~40 milliseconds in C++.
   - Space Complexity: $O(L)$ space for divisor sum and marking tables.

## Code walkthrough
- `int L = min(limit, 28123);`: Bound the computation to the proven mathematical limit.
- `for (int d = 1; d <= L / 2; d++) for (int m = 2 * d; m <= L; m += d) sig[m] += d;`: Additive divisor sieve.
- `for (int i = 1; i <= L; i++) if (sig[i] > i) ab.push_back(i);`: Filter abundant numbers.
- `for (size_t j = i; j < ab.size() && ab[i] + ab[j] <= L; j++) mark[ab[i] + ab[j]] = 1;`: Mark sums of two abundant numbers.
- `long long sum = 0; for (int i = 1; i <= L; i++) if (!mark[i]) sum += i;`: Sum unmarked values.

## Test it out loud
- Test 1: `limit = 1` $\to L = 1 \to$ unmarked sum = 1.
- Test 2: `limit = 23` $\to L = 23 \to$ sum of $1 \dots 23 = 276$.
- Test 3: `limit = 24` $\to$ 24 is $12 + 12$ (marked) $\to$ sum of $1 \dots 23 = 276$.
- Test 4: `limit = 25` $\to 25$ cannot be made from abundant numbers $\to 276 + 25 = 301$.

## Follow-ups
- Why is 28123 the critical cutoff?
  Through analytical number theory, it was shown that every even integer greater than 46 is the sum of two abundant numbers, and every integer greater than 28123 can be expressed as such.
- Why iterate $j$ starting at $i$ rather than $0$?
  Addition is commutative ($a + b = b + a$), so checking $j \ge i$ avoids redundant pair checks, halving the inner loop iterations.

## Common mistakes
- Not capping `limit` at 28123, resulting in out-of-memory errors or infinite loops when `limit = 10^9`.
- Including the number itself in the divisor sum (proper divisors strictly exclude $n$).
- Overflowing 32-bit signed integers when summing results; the total sum can exceed $2 \times 10^9$ for intermediate calculations if not using 64-bit integers.
