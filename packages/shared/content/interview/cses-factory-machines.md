---
id: cses-factory-machines
pattern: cses-sorting-and-searching
difficulty: medium
optimal: "O(n \log(\min(m) \times t)) time and O(1) space"
reviewed: false
---

## Clarify first
- How do machines operate? Each machine $i$ takes $\text{machines}[i]$ units of time to produce 1 product. All machines work simultaneously, independently, and continuously.
- What is the objective? Find the minimum total time required to produce at least $t$ products across all machines.
- Can products be produced in partial time? No, product counts from machine $i$ in time $T$ are discrete integer completions: $\lfloor T / \text{machines}[i] \rfloor$.
- What are the constraints? $1 \le n \le 200000$, $1 \le t \le 10^9$, and $1 \le \text{machines}[i] \le 10^9$.
- Can the answer exceed 32 bits? Yes, if a single machine has time $10^9$ and $t = 10^9$, total time required is $10^{18}$, which requires a 64-bit integer (`long long`).

## Examples to say out loud
- Consider `machines = [3, 2, 5]` and $t = 7$:
  - In $T = 7$ units of time:
    - Machine 1 (time 3): produces $\lfloor 7 / 3 \rfloor = 2$ products.
    - Machine 2 (time 2): produces $\lfloor 7 / 2 \rfloor = 3$ products.
    - Machine 3 (time 5): produces $\lfloor 7 / 5 \rfloor = 1$ product.
    - Total = $2 + 3 + 1 = 6 < 7$ products. Time 7 is insufficient.
  - In $T = 8$ units of time:
    - Machine 1: $\lfloor 8 / 3 \rfloor = 2$.
    - Machine 2: $\lfloor 8 / 2 \rfloor = 4$.
    - Machine 3: $\lfloor 8 / 5 \rfloor = 1$.
    - Total = $2 + 4 + 1 = 7 \ge 7$ products.
  - Minimum time is 8.
- Edge case: single machine `machines = [2]`, $t = 5$:
  - Total time = $2 \times 5 = 10$.

## Brute force
A brute force approach would increment time $T = 1, 2, 3, \dots$ second by second and calculate total products until reaching $t$. Because $T$ can reach $10^{18}$, sequential simulation would take billions of years. Since the total number of products produced is monotonically non-decreasing with respect to time $T$, binary search on the answer determines the exact threshold in $O(n \log(\text{max\_time}))$ time.

## The key observation
Define the predicate $f(T)$:
$$f(T) = \sum_{i=1}^n \lfloor \frac{T}{\text{machines}[i]} \rfloor \ge t$$
- If $T_1 \le T_2$, then $f(T_1) \le f(T_2)$. The function is monotonic.
- If $f(T)$ is true, any time $> T$ is also sufficient.
- If $f(T)$ is false, any time $< T$ is insufficient.
This monotonicity allows binary searching over the time domain $[1, \min(\text{machines}) \times t]$. In each binary search step, evaluating $\sum \lfloor T / m_i \rfloor$ takes $O(n)$ time.

## Optimal approach
1. Find the fastest machine: $\text{min\_val} = \min_{i}(\text{machines}[i])$.
2. Set search range: $\text{lo} = 1$, $\text{hi} = \text{min\_val} \times t$ (all in 64-bit integers).
3. Initialize `ans = hi`.
4. While $\text{lo} \le \text{hi}$:
   - Compute $\text{mid} = \text{lo} + (\text{hi} - \text{lo}) / 2$.
   - Compute total products produced at time `mid`:
     - Accumulate $\text{products} += \text{mid} / m$ for each machine $m$.
     - Early break: if $\text{products} \ge t$, stop summing to prevent 64-bit overflow.
   - If $\text{products} \ge t$:
     - Record `ans = mid`.
     - Try smaller times: $\text{hi} = \text{mid} - 1$.
   - Else:
     - Try larger times: $\text{lo} = \text{mid} + 1$.
5. Return `ans`.

Complexity:
- Time: $O(n \log(\min(m) \times t))$. With $\text{hi} \le 10^{18}$, $\log_2(10^{18}) \approx 60$ iterations. For $n = 200000$, total operations $\approx 1.2 \times 10^7$, completing in under 40 ms.
- Space: $O(1)$ auxiliary space.

## Code walkthrough
- `long long hi = (long long)min_val * t`: Upper bound on time using only the fastest machine.
- `long long mid = lo + (hi - lo) / 2`: Middle time query to test feasibility.
- `products += mid / m`: Discrete products completed by machine $m$ by time `mid`.
- `if (products >= t) break`: Prevents 64-bit integer overflow when summing across $200000$ machines.
- `if (products >= t) { ans = mid; hi = mid - 1; }`: Searches the lower half for an even earlier completion time.

## Test it out loud
- Test case $1$: `machines = [1, 1, 1]`, $t = 10$. At $T = 3$, $3 \times 3 = 9$. At $T = 4$, $4 \times 3 = 12 \ge 10 \implies$ returns 4.
- Test case $2$: `machines = [1000000000]`, $t = 10^9 \implies$ upper bound $10^{18}$, binary search converges to $10^{18}$.
- Test case $3$: `machines = [10, 20, 30]`, $t = 1 \implies$ fastest machine takes 10 $\implies$ returns 10.
- Test case $4$: `machines = [4, 6, 8, 10]`, $t = 15 \implies$ returns 24 ($6 + 4 + 3 + 2 = 15$).

## Follow-ups
- How to avoid overflow when summing $\text{products}$? Always break out of the summation loop immediately once `products >= t`.
- What if each machine has a setup delay before it starts producing? Subtract the setup delay from $T$ (clamped at 0) before dividing by machine production time.

## Common mistakes
- Unbounded upper bound: Setting $\text{hi} = \max(\text{machines}) \times t$ can reach $10^9 \times 10^9 = 10^{18}$, which fits in `long long`, but if chosen carelessly as $2 \times 10^{18}$, adding $\text{mid}$ could overflow. Using $\min(\text{machines}) \times t$ gives the tightest guaranteed upper bound.
- Not breaking early on $\text{products} \ge t$: If $mid = 10^{18}$ and all machines have speed 1, summing $200000 \times 10^{18}$ causes standard 64-bit integer overflow.

## Further reading
- [Binary Search on Answer on Wikipedia](https://en.wikipedia.org/wiki/Binary_search_algorithm)
