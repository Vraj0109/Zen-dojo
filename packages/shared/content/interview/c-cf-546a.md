---
id: c-cf-546a
pattern: cses-codeforces
difficulty: easy
optimal: "O(1) time, O(1) space"
reviewed: false
---

## Clarify first

- How is the price of each banana calculated? (The $i$-th banana costs $i \times k$ dollars, for $i = 1, 2, \dots, w$).
- How much money does the soldier start with? (He begins with $n$ dollars).
- What should be returned if the soldier already has enough money? (Return 0 if his initial dollars $n$ are greater than or equal to the total cost).
- What are the constraints on $k$, $n$, and $w$? ($1 \le k, w \le 100,000$ and $0 \le n \le 1,000,000,000$).
- Can the total cost exceed standard 32-bit signed integers? (Yes: for $k = 100,000$ and $w = 100,000$, total cost is $k \times \frac{w(w + 1)}{2} \approx 5 \times 10^{14}$, which requires 64-bit integer types like `long long`).

## Examples to say out loud

- Borrowing needed: `k = 3, n = 17, w = 4`.
  - Costs of the 4 bananas: $3 \times 1 = 3$, $3 \times 2 = 6$, $3 \times 3 = 9$, $3 \times 4 = 12$.
  - Total cost: $3 + 6 + 9 + 12 = 30$.
  - He has 17 dollars, so he must borrow $30 - 17 = 13$ dollars. Output is 13.
- Enough money: `k = 1, n = 100, w = 3`.
  - Bananas cost $1 + 2 + 3 = 6$.
  - He has 100 dollars, so he needs to borrow 0. Output is 0.
- Exactly enough money: `k = 5, n = 30, w = 3`. Cost is $5 \times 6 = 30$. Borrow amount is 0.

## Brute force

A direct simulation loops $i$ from 1 to $w$, accumulating the cost `total += i * k`. After the loop, it returns `max(0, total - n)`. While $w \le 100,000$ runs in $O(w)$ time, looping is completely unnecessary because the costs form an arithmetic progression with a well-known closed-form formula.

## The key observation

The total cost is an arithmetic progression:
$$\text{total} = k + 2k + 3k + \dots + wk = k \times (1 + 2 + \dots + w) = k \times \frac{w(w + 1)}{2}$$
Evaluating this expression in 64-bit arithmetic gives the exact total cost in $O(1)$ operations. The dollars borrowed is simply $\max(0, \text{total} - n)$.

## Optimal approach

1. Calculate the total cost using the arithmetic sum formula:
   `total = (long long)k * w * (w + 1) / 2`.
2. Compute the deficit: `total - n`.
3. Return `max(0LL, total - n)`.

Complexity:
- Time: `O(1)` as only basic constant-time arithmetic operations are performed.
- Space: `O(1)` auxiliary space for scalar registers.

## Code walkthrough

In the reference implementation:
- `long long total = (long long)k * w * (w + 1) / 2;`: computes the Gaussian summation scaled by unit cost $k$, using 64-bit casting to prevent overflow.
- `return max(0LL, total - n);`: returns the borrowed amount, clamped to 0 when the soldier has sufficient funds.

## Test it out loud

- `k = 1, n = 0, w = 1`:
  - $\text{total} = 1 \times 1 \times 2 / 2 = 1$. Borrow is $1 - 0 = 1$. Returns 1.
- `k = 5, n = 15, w = 3`:
  - $\text{total} = 5 \times 3 \times 4 / 2 = 30$. Borrow is $30 - 15 = 15$. Returns 15.
- `k = 5, n = 30, w = 3`:
  - $\text{total} = 30$. Borrow is $30 - 30 = 0$. Returns 0.
- `k = 100000, n = 0, w = 100000`:
  - $\text{total} = 10^5 \times 10^5 \times 100001 / 2 = 500005000000000$. Returns 500005000000000.

## Follow-ups

- What if banana costs increase quadratically ($i^2 \times k$)?
  We would use the sum of squares formula: $\text{total} = k \times \frac{w(w + 1)(2w + 1)}{6}$ in $O(1)$ time.
- What if the soldier can buy bananas in any order with limited budget, maximizing bananas bought?
  Because prices increase monotonically with index, he should greedily buy the cheapest bananas first, finding the largest $w$ such that $k \cdot \frac{w(w+1)}{2} \le n$ via quadratic formula or binary search.

## Common mistakes

- 32-bit signed integer overflow: when $k = 100,000$ and $w = 100,000$, $k \cdot w(w + 1) / 2 \approx 5 \times 10^{14}$, which exceeds $2^{31} - 1$.
- Returning negative values when $n > \text{total}$ instead of clamping to 0 with `max(0, total - n)`.
- Multiplying in 32-bit mode before assigning to 64-bit integer, causing overflow during intermediate calculation.

## Further reading

- Arithmetic progression summation formulas.
- Integer overflow prevention in high-precision competitive programming.
