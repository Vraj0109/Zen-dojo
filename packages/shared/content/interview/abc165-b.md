---
id: abc165-b
pattern: cses-atcoder
difficulty: medium
optimal: "O(years) time, O(1) space"
reviewed: false
---

## Clarify first
- What is the initial deposit? You deposit 100 yen at year 0.
- How does the interest compound? At the end of every year, the bank adds 1% interest to the balance, rounded down to the nearest integer yen:
  $B_{\text{new}} = B + \lfloor \frac{B}{100} \rfloor$.
- What is the goal? Find the minimum integer number of years needed for the balance to reach at least $x$ yen ($B \ge x$).
- What are the constraints on $x$? $101 \le x \le 9 \times 10^{15}$.
- Does the calculation require arbitrary precision? Since $x \le 9 \times 10^{15}$, the balance and target easily fit in a standard 64-bit integer (`long long` in C++, `long` in Java), which supports values up to $\approx 9.22 \times 10^{18}$.

## Examples to say out loud
- Consider $x = 101$.
  - End of year 1: $100 + \lfloor 100 / 100 \rfloor = 100 + 1 = 101$.
  $101 \ge 101 \to$ returns 1 year.
- Consider $x = 103$.
  - Year 1: $100 + 1 = 101$.
  - Year 2: $101 + \lfloor 101 / 100 \rfloor = 101 + 1 = 102$.
  - Year 3: $102 + \lfloor 102 / 100 \rfloor = 102 + 1 = 103$.
  $103 \ge 103 \to$ returns 3 years.
- Consider $x = 1000$.
  Takes 284 years to reach 1000 yen.

## Brute force
Can we use a continuous formula like $100 \times 1.01^t \ge x$?
No! Because interest is floored to integer yen every single year, floor truncation causes compounding to diverge from pure floating-point exponential growth (for example, balances between 100 and 199 only gain 1 yen per year instead of fractional yen). Therefore, we must simulate the exact year-by-year integer growth.

## The key observation
Although $x$ can reach $9 \times 10^{15}$, exponential compounding means the balance grows rapidly:
$1.01^{3760} \approx 10^{16}$.
Even for the maximum possible target $x = 9 \times 10^{15}$, the number of simulated years is under 3,800.
A simple while loop updating `b += b / 100` and `years++` runs in fewer than 4,000 iterations, completing in less than 0.1 milliseconds.

## Optimal approach
1. Initialize 64-bit balance `b = 100` and year counter `years = 0`.
2. While $b < x$:
   - Increment balance: `b += b / 100` (integer division).
   - Increment `years++`.
3. Return `years`.
4. Complexity:
   - Time Complexity: $O(\text{years})$, where $\text{years} \le 3760$ for $x \le 9 \times 10^{15}$.
   - Space Complexity: $O(1)$ auxiliary space.

## Code walkthrough
- `long long b = 100; int years = 0;`: Initialize starting deposit and timer.
- `while (b < x)`: Continue until balance meets or exceeds the target.
- `b += b / 100;`: Apply 1% integer interest truncated toward zero.
- `years++;`: Advance clock by 1 year.
- `return years;`: Return elapsed years.

## Test it out loud
- Test 1: $x = 101 \to 1$ year.
- Test 2: $x = 102 \to 2$ years.
- Test 3: $x = 150 \to$ balance grows by 1 each year until 50 years $\to 50$ years.
- Test 4: $x = 1000 \to 284$ years.
- Test 5: $x = 100000 \to 752$ years.

## Follow-ups
- Why does a closed-form formula like $\lceil \log_{1.01}(x / 100) \rceil$ produce wrong answers?
  Floor truncation at early stages causes the initial 100 yen to grow by only 1 yen/year for the first 100 years, whereas continuous compounding would have yielded $100 \times 1.01^{100} \approx 270.48$. That cumulative truncation difference shifts the year count significantly.
- What if $x \le 10^{18}$?
  At $x = 10^{18}$, $B \times 1.01$ remains within 64-bit unsigned bounds, and the loop requires fewer than 4,300 iterations.

## Common mistakes
- Using floating-point variables `double balance`, which introduces decimal precision and skips the mandatory integer floor truncation rule.
- Using 32-bit signed integers for the balance `b`, which overflows at $2 \times 10^9$ and triggers an infinite loop.
- Using continuous logarithm formulas instead of step simulation.
