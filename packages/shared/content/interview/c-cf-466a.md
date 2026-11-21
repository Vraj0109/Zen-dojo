---
id: c-cf-466a
pattern: cses-codeforces
difficulty: easy
optimal: "O(1) time, O(1) space"
brute: same
reviewed: false
---

## Clarify first

- How many total rides must be covered? (Ann must take at least $n$ rides on the subway).
- What are the ticket options and their costs? (Single ride ticket costs $a$ dollars for 1 ride; special ride ticket costs $b$ dollars for $m$ rides).
- Can extra rides on a special ticket be left unused? (Yes, Ann can take fewer than $m$ rides from a special ticket if it is cheaper overall; unused rides simply expire).
- What are the constraints on $n$, $m$, $a$, and $b$? ($1 \le n, m, a, b \le 1000$).
- What should be returned? (The minimum total cost in dollars to cover all $n$ rides).

## Examples to say out loud

- Special ticket equal rate: `n = 6, m = 2, a = 1, b = 2`.
  - Single ticket costs 1 per ride. Special ticket costs $2 / 2 = 1$ per ride. Both cost 6 for 6 rides. Output is 6.
- Special ticket cheaper per ride: `n = 5, m = 2, a = 2, b = 3`.
  - Single ticket costs 2. Special ticket gives 2 rides for 3 (rate 1.5 per ride).
  - Option 1: all single tickets: $5 \times 2 = 10$.
  - Option 2: 2 special tickets ($2 \times 3 = 6$, covers 4 rides) + 1 single ticket (costs 2): $6 + 2 = 8$.
  - Option 3: 3 special tickets ($3 \times 3 = 9$, covers 6 rides): 9.
  - Minimum is 8. Output is 8.
- Special ticket always cheaper even with waste: `n = 1, m = 10, a = 5, b = 3`.
  - 1 single ticket costs 5. 1 special ticket costs 3 (covers 10 rides, 9 wasted). Cost is 3. Output is 3.

## Brute force

A brute-force strategy enumerates the number of special tickets $k$ from 0 up to $\lceil n / m \rceil$. For each $k$, the remaining rides are $\max(0, n - k \times m)$, which can be bought as single tickets. Evaluate the cost $k \times b + \max(0, n - k \times m) \times a$ and take the minimum. Since $k \le 1000$, this loop runs in $O(n / m)$ time. However, this search is unnecessary because there are only 3 candidate strategies.

## The key observation

The decision depends entirely on whether a special ticket is cheaper than $m$ single tickets (i.e., whether $b < m \times a$):
1. If $b \ge m \times a$, special tickets offer no discount; it is always optimal to buy only single tickets: $n \times a$.
2. If $b < m \times a$, we buy as many full special tickets as possible: $\lfloor n / m \rfloor \times b$. For the remaining $n \bmod m$ rides, we have two choices:
   - Buy individual single tickets for the remainder: $(n \bmod m) \times a$.
   - Buy one additional special ticket that covers the remainder (even though some rides are wasted): $b$.
Thus, the answer is always the minimum of three closed-form candidates:
$$\min(n \times a, \; \lceil n / m \rceil \times b, \; \lfloor n / m \rfloor \times b + (n \bmod m) \times a)$$

## Optimal approach

1. Compute the number of full bundles: `full = n / m`.
2. Compute the remaining rides: `rest = n % m`.
3. Evaluate the three mutually exhaustive options:
   - Option 1 (only single tickets): `n * a`.
   - Option 2 (all special tickets, rounded up): `(full + 1) * b`.
   - Option 3 (full special tickets plus single tickets for remainder): `full * b + rest * a`.
4. Return `min({option1, option2, option3})`.

Complexity:
- Time: `O(1)` because we only perform basic integer division, modulo, and comparisons.
- Space: `O(1)` auxiliary space for scalar registers.

## Code walkthrough

In the reference implementation:
- `int full = n / m, rest = n % m;`: decomposes the target rides $n$ into full $m$-ride passes and remainder rides.
- `min({n * a, (full + 1) * b, full * b + rest * a})`: takes the minimum across all 3 possible cost strategies in $O(1)$ time.
- Returns this minimum directly.

## Test it out loud

- `n = 10, m = 3, a = 1, b = 100`:
  - Special tickets are terrible ($b = 100$).
  - Option 1 is $10 \times 1 = 10$. Returns 10.
- `n = 10, m = 3, a = 5, b = 6`:
  - $full = 3, rest = 1$.
  - Option 1: $10 \times 5 = 50$.
  - Option 2: $(3 + 1) \times 6 = 24$.
  - Option 3: $3 \times 6 + 1 \times 5 = 18 + 5 = 23$.
  - Minimum is 23. Returns 23.
- `n = 1000, m = 1000, a = 1000, b = 1`:
  - 1 special ticket covers 1000 rides for 1 dollar. Returns 1.

## Follow-ups

- What if there are multiple tier tickets (e.g., 1 ride, 5 rides, 30 rides, 100 rides)?
  With multiple denominations, the problem becomes the Unbounded Knapsack / Coin Change DP: `dp[i] = min_{ticket} (dp[i - rides] + cost)`. For $n \le 10^5$, it runs in $O(n \times T)$ where $T$ is the number of ticket types.
- What if tickets have expiration time limits?
  If tickets expire after certain calendar days, we model the problem with interval scheduling and dynamic programming across days.

## Common mistakes

- Forgetting Option 2 (buying one extra special ticket for the remainder), which is cheaper whenever $b < \text{rest} \times a$ (e.g., $rest = 4, a = 5 \implies 20$, but $b = 6$).
- Assuming special tickets are always better, forgetting that $b$ could be more expensive than $m \times a$.
- Off-by-one errors in rounding up when $n$ is an exact multiple of $m$: $(full + 1) \times b$ could overcharge if evaluated carelessly without `rest == 0` handling, though Option 3 ($full \times b + 0 \times a = full \times b$) safely covers this case in the `min`.

## Further reading

- Greedy choice and bundle pricing economics.
- Unbounded knapsack / coin change algorithms.
