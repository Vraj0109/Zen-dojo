---
id: c-euler-4
pattern: cses-euler
difficulty: easy
optimal: "Far less than O((hi - lo)^2) with pruning; bounded by about 5 * 10^7 palindrome checks, O(1) space"
reviewed: false
---

## Clarify first

- What defines a palindromic number? (A number that reads identically forwards and backwards in decimal representation, such as 9009).
- What range do factors $a$ and $b$ come from? (Both $a$ and $b$ are integers satisfying $lo \le a, b \le hi$).
- What should be returned if no product in the range is a palindrome? (Return 0).
- What are the constraints on `lo` and `hi`? ($1 \le lo \le hi \le 9999$).
- Can the product exceed 32-bit signed integers? (For $hi = 9999$, the maximum product is $9999 \times 9999 \approx 10^8$, which fits inside a standard 32-bit signed integer, though 64-bit integers prevent any overflow during digit reversal).

## Examples to say out loud

- Two-digit factors: `lo = 10, hi = 99`.
  - The largest palindrome formed by two 2-digit numbers is $91 \times 99 = 9009$. Output is 9009.
- Single-digit factors: `lo = 1, hi = 9`.
  - The largest palindrome is $3 \times 3 = 9$. Note that $9 \times 9 = 81$ is not a palindrome, nor is $8 \times 9 = 72$. Output is 9.
- No palindrome product: `lo = 10, hi = 10`.
  - Only product is $10 \times 10 = 100$. 100 reversed is 001 = 1, so 100 is not a palindrome. Output is 0.

## Brute force

A brute-force strategy tests all pairs $(a, b)$ with $lo \le a \le hi$ and $lo \le b \le hi$. For each product $p = a \times b$, it converts the product to a string or reverses its digits to check for palindromicity, tracking the maximum. For the maximum range $[1, 9999]$, there are $(9999)^2 / 2 \approx 5 \times 10^7$ pairs. Testing all $5 \times 10^7$ pairs without pruning takes several seconds.

## The key observation

We only care about the largest palindrome product. By searching from the largest factors downward ($a = hi, hi - 1, \dots$ and $b = hi, hi - 1, \dots$), products decrease monotonically as $b$ decreases:
1. Symmetry: assume $b \le a$ (or $b \ge a$) to avoid evaluating symmetric duplicate pairs.
2. Inner loop pruning: as soon as the current product $a \times b \le best$, any smaller values of $b$ will produce even smaller products. We can immediately `break` the inner loop!
3. Outer loop pruning: if the maximum possible product for the current $a$ (which is $a \times hi$) cannot exceed $best$ ($a \times hi \le best$), then no future value of $a$ can ever beat $best$. We can immediately `break` the outer loop!
These two mathematical pruning conditions skip over 99.9% of pairs.

## Optimal approach

1. Implement a helper function `isPal(x)` that reverses the decimal digits of $x$ and checks if `reversed == x`.
2. Initialize `best = 0` as a 64-bit integer.
3. Iterate `a` from `hi` down to `lo`:
   a. If `a * hi <= best`, break the outer loop (no remaining pair can beat `best`).
   b. Iterate `b` from `hi` down to `a`:
      - Calculate product `p = a * b`.
      - If `p <= best`, break the inner loop (further decreasing $b$ only yields smaller products).
      - If `isPal(p)` is true:
        - Update `best = p`.
        - Break the inner loop (since $b$ is decreasing, no smaller $b$ can beat this $p$).
4. Return `best`.

Complexity:
- Time: Far less than $O((hi - lo)^2)$ with pruning; the worst case is bounded by at most a few thousand palindrome checks in practice (under 5 ms for $hi = 9999$).
- Space: `O(1)` auxiliary space as only scalar integer variables are used.

## Code walkthrough

In the reference implementation:
- `bool isPal(long long x)`: reverses the digits of $x$ via `% 10` and `/ 10`, comparing against the original value without string allocation.
- `long long best = 0;`: tracks the highest palindrome product found so far.
- `if (a * hi <= best) break;`: terminates the search as soon as the upper bound for $a$ falls below the incumbent maximum.
- `if (p <= best) break;`: stops the inner loop when subsequent products are guaranteed to be worse.
- `if (isPal(p)) { best = p; break; }`: records the candidate and breaks, as smaller $b$ cannot produce a larger product for this $a$.

## Test it out loud

- `lo = 1, hi = 1`:
  - $a = 1, b = 1 \implies p = 1$. $1$ is a palindrome. Returns 1.
- `lo = 10, hi = 10`:
  - $p = 100$. Not a palindrome. Returns 0.
- `lo = 10, hi = 99`:
  - Starts $a = 99, b = 99 \implies 9801$ (no).
  - Finds $91 \times 99 = 9009$. Prunes all smaller products. Returns 9009.

## Follow-ups

- What if $lo$ and $hi$ have up to 8 digits ($hi \le 10^8$)?
  Instead of multiplying factors and checking for palindromes, we can generate palindromes directly in descending order (e.g. constructing $P$ from upper half $H$), and check whether $P$ has factors in $[lo, hi]$ by trial division up to $\sqrt{P}$.
- Can any mathematical property of palindromes be used?
  Any 6-digit palindrome has the form $100001a + 10010b + 1100c = 11(9091a + 910b + 100c)$, so every 6-digit palindrome is divisible by 11. Therefore, at least one of $a$ or $b$ must be a multiple of 11.

## Common mistakes

- Not breaking the inner loop after finding a palindrome, doing unnecessary work when smaller $b$ cannot beat $p$.
- Missing the outer loop bound `a * hi <= best`, searching thousands of redundant $a$ values after the maximum has already been discovered.
- Allocating strings to reverse numbers on every check, creating heavy garbage collection or memory overhead.

## Further reading

- Palindrome construction algorithms and modular divisibility rules.
- Branch and bound pruning techniques in discrete search spaces.
