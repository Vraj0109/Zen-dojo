---
id: c-kattis-spavanac
pattern: cses-kattis
difficulty: easy
optimal: "O(1) time, O(1) space"
brute: same
reviewed: false
---

## Clarify first
- What is the task? Given an alarm time as hours $h$ ($0 \le h \le 23$) and minutes $m$ ($0 \le m \le 59$) on a 24-hour clock, calculate the time exactly 45 minutes earlier.
- Does the clock wrap around midnight? Yes, rolling back past midnight wraps to the previous day (for example, 45 minutes before 00:30 is 23:45).
- What format should the output take? A pair or two-element array `[hour, minute]`.
- Are there any leap seconds or daylight saving considerations? No, standard 24 hours per day, 60 minutes per hour.

## Examples to say out loud
- Consider $h = 10, m = 10$.
  $10 \times 60 + 10 = 610$ minutes after midnight.
  Subtract 45 minutes: $610 - 45 = 565$ minutes.
  Hour: $565 / 60 = 9$.
  Minute: $565 \% 60 = 25$.
  Result: `[9, 25]`.
- Consider $h = 0, m = 30$.
  Minutes after midnight = 30.
  $30 - 45 = -15$ minutes.
  Adding 1440 minutes (one full 24-hour cycle): $-15 + 1440 = 1425$ minutes.
  Hour: $1425 / 60 = 23$.
  Minute: $1425 \% 60 = 45$.
  Result: `[23, 45]`.

## Brute force
A conditional approach checks if $m \ge 45$. If so, the hour is unchanged and the minute is $m - 45$. If $m < 45$, borrow 60 minutes: minute becomes $m + 15$, and hour is decremented by 1 (wrapping from 0 to 23). While this branch-based method works, converting to total minutes since midnight eliminates branching completely.

## The key observation
A 24-hour day consists of $24 \times 60 = 1440$ minutes.
Converting $(h, m)$ to total minutes from midnight gives $t_0 = h \times 60 + m$.
Subtracting 45 minutes gives $t_0 - 45$.
To safely handle negative values when wrapping past midnight, add 1440 before taking modulo 1440:
$t = (h \times 60 + m - 45 + 1440) \pmod{1440}$.
The resulting hour is $\lfloor t / 60 \rfloor$ and the minute is $t \pmod{60}$.

## Optimal approach
1. Calculate the shifted total minutes since midnight:
   `t = (h * 60 + m - 45 + 1440) % 1440`.
2. Extract the hour component using integer division: `hour = t / 60`.
3. Extract the minute component using remainder: `minute = t % 60`.
4. Return `[hour, minute]`.
5. Complexity:
   - Time Complexity: $O(1)$, executing a constant number of elementary arithmetic operations.
   - Space Complexity: $O(1)$, requiring only one scalar temporary variable.

## Code walkthrough
- `int t = (h * 60 + m - 45 + 1440) % 1440;`: Convert current 24-hour time to total minutes, subtract 45, add 1440 to guarantee positivity across midnight, and wrap modulo 1440.
- `return {t / 60, t % 60};`: Decompose total minutes back into hour and minute components.

## Test it out loud
- Test 1: $h = 0, m = 0 \to t = (0 - 45 + 1440) \% 1440 = 1395 \to 1395 / 60 = 23, 1395 \% 60 = 15 \to [23, 15]$.
- Test 2: $h = 0, m = 44 \to t = (44 - 45 + 1440) \% 1440 = 1439 \to [23, 59]$.
- Test 3: $h = 0, m = 45 \to t = (45 - 45 + 1440) \% 1440 = 0 \to [0, 0]$.
- Test 4: $h = 1, m = 0 \to t = (60 - 45 + 1440) \% 1440 = 1455 \% 1440 = 15 \to [0, 15]$.

## Follow-ups
- How would you generalize this to wake up $K$ minutes earlier for any $K$?
  Compute `t = ((h * 60 + m - K) % 1440 + 1440) % 1440`, which handles arbitrary large positive or negative offsets cleanly.
- What if seconds are also included?
  Convert everything to seconds since midnight ($86400$ seconds per day), subtract the offset in seconds, reduce modulo $86400$, and unpack into $(h, m, s)$.

## Common mistakes
- Forgetting to add 1440 before modulo in languages where `%` can produce negative results for negative operands (e.g. C++ and Java).
- Incorrectly wrapping hour from 0 to 24 instead of 23.
- Trying to decrement hour when $m \ge 45$.
