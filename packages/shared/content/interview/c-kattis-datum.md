---
id: c-kattis-datum
pattern: cses-kattis
difficulty: easy
optimal: "O(1) time and O(1) space"
reviewed: false
---

## Clarify first
- What are the inputs? Two integers `D` (day, 1-31) and `M` (month, 1-12) for a date in the year 2009.
- What day of the week was January 1, 2009? January 1, 2009 was a Thursday.
- What are the names of the days to output? "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday".
- Was 2009 a leap year? No, 2009 is a common year (365 days), meaning February had 28 days.

## Examples to say out loud
- Consider `D = 1, M = 1`: This is January 1, 2009, which is given as "Thursday".
- Consider `D = 2, M = 1`: One day later -> "Friday".
- Consider `D = 17, M = 1`: 16 days after Thursday. `(3 + 16) % 7 = 5` (if Monday is 0), which is "Saturday".

## Brute force
One could simulate day by day starting from January 1, advancing the day of the week by 1 until reaching date `(D, M)`. Since there are at most 365 days in 2009, this takes at most 365 steps. However, an O(1) formula using an array of month day-offsets is cleaner and faster.

## The key observation
We can compute the day of the year (0-indexed offset from Jan 1) by precomputing the number of days preceding each month:
Month lengths in 2009: `[31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]`.
Total days passed before month `M` plus `D - 1` gives the total days elapsed since January 1.
Since January 1 was Thursday, adding the elapsed days modulo 7 to Thursday's day index gives the exact day of the week.

## Optimal approach
1. Define the days-in-months array: `days = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31}`.
2. Define the days of the week starting from Thursday:
   `names = {"Thursday", "Friday", "Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"}`.
3. Sum the days for months `1` to `M - 1` and add `D - 1` to get `total_offset`.
4. Output `names[total_offset % 7]`.

Complexity:
- Time complexity: O(1) as there are at most 12 months to sum.
- Space complexity: O(1) auxiliary space for constant lookup tables.

## Code walkthrough
- `const int mdays[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31}`: Fixed month lengths for a non-leap year.
- `int total = D - 1`: Starts with days elapsed in the current month.
- `for (int i = 0; i < M - 1; i++) total += mdays[i]`: Adds days from all completed preceding months.
- `const string days[] = {"Thursday", "Friday", "Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"}`: Names aligned with index 0 = Thursday.
- `cout << days[total % 7] << "\n"`: Direct modulo lookup.

## Test it out loud
- `D = 1, M = 1`: `total = 0`. `days[0]` is "Thursday". Correct.
- `D = 2, M = 1`: `total = 1`. `days[1]` is "Friday". Correct.
- `D = 1, M = 2`: `total = 31`. `31 % 7 = 3`. `days[3]` is "Sunday". Correct.

## Follow-ups
- How to handle any arbitrary year? Use Zeller's congruence or Tomohiko Sakamoto's algorithm to compute the day of the week for any Gregorian calendar date in O(1) time.

## Common mistakes
- Treating 2009 as a leap year (giving February 29 days instead of 28).
- Off-by-one errors in day offset calculation (e.g. adding `D` instead of `D - 1`).
