---
id: c-euler-52
pattern: cses-euler
difficulty: medium
optimal: "O(ans * k * d log d) time, O(d) space"
reviewed: false
---

## Clarify first
- What does it mean for numbers to contain the same digits? Two numbers contain the same digits if they have the exact same multiset of digits (i.e. each digit 0-9 appears the exact same number of times).
- What is the question asking? Find the smallest positive integer $x \ge 1$ such that $x, 2x, 3x, \dots, kx$ all share the same multiset of digits.
- What are the bounds on $k$? $1 \le k \le 6$.
- What is the answer for $k = 1$? For $k = 1$, the only multiple is $x$ itself, so the smallest positive integer is 1.

## Examples to say out loud
- Consider $k = 1$.
  $x = 1$, only 1x needs to match $\to$ returns 1.
- Consider $k = 2$.
  The smallest number is $125874$:
  $2 \times 125874 = 251748$.
  Both numbers have the multiset $\{1, 2, 4, 5, 7, 8\}$.
  Result: 125874.
- Consider $k = 6$.
  The answer is the famous cyclic number $142857$:
  - $1 \times 142857 = 142857$
  - $2 \times 142857 = 285714$
  - $3 \times 142857 = 428571$
  - $4 \times 142857 = 571428$
  - $5 \times 142857 = 714285$
  - $6 \times 142857 = 857142$
  All 6 multiples contain the digits $\{1, 2, 4, 5, 7, 8\}$.
  Result: 142857.

## Brute force
A brute force approach tests $x = 1, 2, 3, \dots$ sequentially. For each candidate $x$, we generate the digit signatures of $x, 2x, \dots, kx$ and check if they match. Because the answers are small (at most 142,857), testing candidates upward terminates in fractions of a second.

## The key observation
Two integers have the exact same multiset of digits if and only if their sorted string representations are identical:
$\text{signature}(v) = \text{sort}(\text{to\_string}(v))$.
Furthermore, for $x$ and $kx$ to have the same multiset of digits, they must have the exact same number of digits.
Therefore, if $x$ has $d$ digits, $kx < 10^d \implies x < \frac{10^d}{k}$.
For instance, for $k = 6$, $x$ must begin with the digit 1; any number starting with 2 or more would have $6x$ spill into an extra digit.

## Optimal approach
1. Define a helper `sig(v)`: convert integer $v$ to string, sort its characters, and return the sorted string.
2. If $k == 1$, return 1 immediately.
3. Loop integer $x = 1, 2, 3, \dots$:
   - Compute `base = sig(x)`.
   - Set `ok = true`.
   - For $m = 2$ to $k$:
     - If `sig(x * m) != base`:
       - `ok = false`, break.
   - If `ok` is true, return $x$.
4. Complexity:
   - Time Complexity: $O(\text{ans} \cdot k \cdot d \log d)$, where $d$ is the number of digits ($d \le 6$) and $\text{ans} \le 142857$. Total operations $\approx 1.5 \times 10^5 \times 6 \times 10 \approx 9 \times 10^6$, running in ~30 milliseconds in C++.
   - Space Complexity: $O(d)$ auxiliary space for string sorting.

## Code walkthrough
- `static string sig(long long v)`: Converts integer to string and sorts characters in $O(d \log d)$.
- `for (int x = 1;; x++)`: Search positive integers starting from 1.
- `string base = sig(x);`: Canonical multiset representation of candidate $x$.
- `for (int m = 2; m <= k && ok; m++) if (sig((long long)x * m) != base) ok = false;`: Ensure every multiple $2x, \dots, kx$ has the identical digit multiset.
- `if (ok) return x;`: Return the minimal satisfying integer.

## Test it out loud
- Test 1: $k = 1 \to$ returns 1.
- Test 2: $k = 2 \to$ returns 125874 ($2 \times 125874 = 251748$).
- Test 3: $k = 3 \to$ returns 142857.
- Test 4: $k = 6 \to$ returns 142857 (full cyclic group of $1/7$).

## Follow-ups
- Why is 142857 the answer for $k = 3, 4, 5, 6$?
  $142857$ is the repeating decimal period of $\frac{1}{7} = 0.\overline{142857}$. Multiples $\frac{2}{7}, \frac{3}{7}, \dots, \frac{6}{7}$ are cyclic shifts of the same 6 digits, so all multiples from $1x$ to $6x$ share the identical digits.
- Can we check digit multisets without string sorting?
  Yes, using a 10-element frequency array or a 64-bit integer bitmask with 4 bits per digit count: $\sum 16^{d_i}$. This provides an $O(d)$ equality check without sorting.

## Common mistakes
- Comparing digit sets instead of multisets (e.g. treating 112 and 122 as equal because both use digits {1, 2}).
- Overflowing 32-bit integers during $x \times m$ when testing larger numbers (using 64-bit integers avoids potential overflow).
- Forgetting the base case $k = 1$.
