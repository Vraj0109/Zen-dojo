---
id: c-cf-977a
pattern: cses-codeforces
difficulty: easy
optimal: "O(k) time, O(1) space"
reviewed: false
---

## Clarify first
- What are Tanya's custom subtraction rules?
  - If the last digit of $n$ is non-zero ($n \pmod{10} \ne 0$), subtract 1: $n \leftarrow n - 1$.
  - If the last digit of $n$ is zero ($n \pmod{10} == 0$), divide by 10 (drop the trailing zero): $n \leftarrow n / 10$.
- How many operations are performed? Exactly $k$ sequential operations.
- What are the constraints? $2 \le n \le 10^9$ and $1 \le k \le 50$.
- What is guaranteed about the result? The problem guarantees that $n$ remains a positive integer throughout the operations.
- What should be returned? The final integer value of $n$ after $k$ steps.

## Examples to say out loud
- Consider $n = 512$ and $k = 4$.
  - Step 1: $512 \pmod{10} = 2 \ne 0 \to 512 - 1 = 511$.
  - Step 2: $511 \pmod{10} = 1 \ne 0 \to 511 - 1 = 510$.
  - Step 3: $510 \pmod{10} = 0 \to 510 / 10 = 51$.
  - Step 4: $51 \pmod{10} = 1 \ne 0 \to 51 - 1 = 50$.
  Result: 50.
- Consider $n = 1000000000$ and $k = 9$.
  9 trailing zeros are stripped one by one $\to$ returns 1.
- Consider $n = 10$ and $k = 1$.
  $10 \pmod{10} = 0 \to 10 / 10 = 1$.

## Brute force
Because $k \le 50$, simulating the process step by step in a loop of $k$ iterations takes at most 50 integer arithmetic operations. An explicit simulation is already minimal work and runs in sub-microsecond time.

## The key observation
Each step examines the units digit $n \pmod{10}$:
- If $n \pmod{10} == 0$: division by 10 ($n \leftarrow n / 10$).
- Otherwise: decrement by 1 ($n \leftarrow n - 1$).
A simple for-loop running $k$ times perfectly matches the specification and runs in $O(k)$ time with $O(1)$ space.

## Optimal approach
1. Run a loop for $i$ from 0 to $k - 1$:
   - If $n \% 10 == 0$, set $n \leftarrow n / 10$.
   - Else, set $n \leftarrow n - 1$.
2. Return $n$.
3. Complexity:
   - Time Complexity: $O(k)$, where $k \le 50$. Exactly $k$ basic arithmetic operations.
   - Space Complexity: $O(1)$, using no additional memory.

## Code walkthrough
- `for (int i = 0; i < k; i++)`: Execute the operation $k$ times.
- `if (n % 10 == 0) n /= 10;`: When the last digit is zero, strip it via integer division.
- `else n--;`: When the last digit is non-zero, subtract 1.
- `return n;`: Return the resulting integer value.

## Test it out loud
- Test 1: $n = 10, k = 1 \to 10 / 10 = 1$.
- Test 2: $n = 9, k = 1 \to 9 - 1 = 8$.
- Test 3: $n = 100, k = 2 \to 100 \to 10 \to 1$.
- Test 4: $n = 15, k = 3 \to 15 \to 14 \to 13 \to 12$.
- Test 5: $n = 23, k = 5 \to 23 \to 22 \to 21 \to 20 \to 2 \to 1$.

## Follow-ups
- How would you optimize if $k$ could be up to $10^9$?
  Instead of decrementing 1 by 1 until reaching zero, batch the decrements:
  Let $rem = n \pmod{10}$.
  If $rem \le k$ and $rem > 0$: subtract $rem$ from $n$, reduce $k \leftarrow k - rem$. If $k > 0$, divide $n \leftarrow n / 10$ and decrement $k \leftarrow k - 1$.
  This batches all subtraction steps up to the nearest multiple of 10, reducing runtime to $O(\log_{10} n)$ operations.
- Could $n$ overflow standard 32-bit signed integers?
  $n$ is at most $10^9$ and strictly decreases, so it comfortably stays within standard 32-bit signed integer limits ($2 \times 10^9$).

## Common mistakes
- Checking $n \% 10 != 0$ first and accidentally doing both subtraction and division in the same step.
- Off-by-one errors in the loop counter running $k - 1$ or $k + 1$ iterations.
