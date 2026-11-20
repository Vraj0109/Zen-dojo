---
id: c-euler-19
pattern: cses-euler
difficulty: medium
optimal: "O(endYear) time, O(1) space"
reviewed: false
---

## Clarify first

- What date range is evaluated? (From January 1st of `startYear` through December 31st of `endYear` inclusive).
- What calendar rules apply? (Standard Gregorian calendar rules: a year is a leap year if divisible by 4, except century years which must be divisible by 400).
- What is the reference anchor date? (1 January 1900 was a Monday).
- What should be counted? (The number of months whose first day, the 1st of the month, fell on a Sunday).
- What are the constraints on years? (`1900 <= startYear <= endYear <= 100000`).

## Examples to say out loud

- Single year 1900: `startYear = 1900, endYear = 1900`.
  - In 1900, the 1st of April and the 1st of July were Sundays. Total Sundays on the 1st is 2. Output is 2.
- Two years: `startYear = 1900, endYear = 1901`.
  - 1900 has 2 Sundays on the 1st. 1901 has 2 Sundays on the 1st. Total is 4. Output is 4.
- Leap century year 2000: `startYear = 2000, endYear = 2000`. Output is 1.

## Brute force

A brute-force strategy tracks every single day from 1 January 1900 to 31 December `endYear`, incrementing day-by-day and tracking weekday, day-of-month, month, and year. For `endYear = 100,000`, there are $\approx 36.5 \times 10^6$ days. Stepping day-by-day takes tens of millions of operations. Instead, we can advance month-by-month in steps of month lengths, taking only 12 steps per year.

## The key observation

The weekday of the 1st of each month advances by the length of the preceding month modulo 7:
$$\text{next\_weekday} = (\text{current\_weekday} + \text{days\_in\_month}) \bmod 7$$
Month lengths are constant (31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31), except February which has 29 days in leap years.
1. Leap year rule: $y$ is a leap year if $(y \bmod 4 == 0) \land (y \bmod 100 \ne 0 \lor y \bmod 400 == 0)$.
2. We can fast-forward the weekday from 1 Jan 1900 to 1 Jan `startYear` year-by-year, adding 366 for leap years and 365 for normal years modulo 7.
3. Then, from `startYear` to `endYear`, we advance month-by-month (12 steps per year), checking if `weekday == 0` (Sunday).

## Optimal approach

1. Define a helper `leap(y)` returning whether year $y$ is a leap year.
2. Initialize `dow = 1` (since 1 January 1900 was a Monday, with 0 = Sunday, 1 = Monday, ..., 6 = Saturday).
3. Fast-forward `dow` to 1 January `startYear`:
   - For year $y$ from 1900 to `startYear - 1`: `dow = (dow + (leap(y) ? 366 : 365)) % 7`.
4. Initialize `count = 0`.
5. Define standard month lengths array: `len = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]`.
6. For year $y$ from `startYear` to `endYear`:
   - For month $m$ from 0 to 11:
     - If `dow == 0`, increment `count++`.
     - Calculate month days: `d = len[m] + (m == 1 && leap(y) ? 1 : 0)`.
     - Update `dow = (dow + d) % 7`.
7. Return `count`.

Complexity:
- Time: `O(endYear)` time. Advancing from 1900 to `startYear` takes $O(\text{startYear})$ steps, and iterating through months takes $12 \times (\text{endYear} - \text{startYear} + 1)$ steps. For $\text{endYear} \le 100,000$, this requires $\approx 1.3 \times 10^6$ operations, executing in under 5 ms.
- Space: `O(1)` auxiliary space for month lengths table and scalar counters.

## Code walkthrough

In the reference implementation:
- `bool leap(int y)`: implements the 400-year Gregorian leap year rule.
- `dow = (dow + (leap(y) ? 366 : 365)) % 7;`: shifts the starting day-of-week directly to `startYear` in $O(\text{startYear})$ steps.
- `int len[12] = {31, 28, ...};`: stores non-leap days per month.
- `if (dow == 0) count++;`: identifies months whose 1st day coincides with Sunday.
- `dow = (dow + d) % 7;`: advances the weekday by the exact length of the month just completed.

## Test it out loud

- `startYear = 1900, endYear = 1900`:
  - 1900 is not a leap year ($1900 \bmod 100 == 0$ and $1900 \bmod 400 \ne 0$).
  - Months starting on Sunday: April and July. Returns 2.
- `startYear = 2000, endYear = 2000`:
  - 2000 is a leap year ($2000 \bmod 400 == 0$).
  - Returns 1.
- `startYear = 1901, endYear = 1901`:
  - Returns 2.

## Follow-ups

- Can we answer queries in $O(1)$ time?
  Yes, notice that the Gregorian calendar repeats in an exact 400-year cycle of $400 \times 365 + 97 = 146,097$ days, which is exactly $20,871$ weeks (an exact multiple of 7). Therefore, the pattern of weekdays repeats every 400 years. We can precompute the count for a single 400-year cycle (which has 688 Sundays on the 1st) and use modular division to answer any year range in $O(1)$ time.
- What if Zeller's congruence is used?
  Zeller's congruence computes the day of the week for any specific $(d, m, y)$ directly in $O(1)$ arithmetic without needing to roll forward from 1900.

## Common mistakes

- Treating 1900 as a leap year: 1900 is divisible by 100 but not 400, so it is a common year (365 days, 28 days in Feb).
- Treating 2000 as a common year: 2000 is divisible by 400, so it is a leap year (366 days, 29 days in Feb).
- Advancing the day-of-week before checking if the 1st of the current month is Sunday, shifting every month by one.

## Further reading

- Gregorian calendar 400-year cycle properties.
- Zeller's congruence and Doomsday rule for mental calendar calculation.
