---
id: abc162-a
pattern: cses-atcoder
difficulty: medium
optimal: "O(1) time, O(1) space"
reviewed: false
---

## Clarify first
- What is the input? An integer $n$ guaranteed to be a 3-digit positive integer ($100 \le n \le 999$).
- What is the condition to check? Whether the decimal digit 7 appears at least once anywhere among the digits of $n$ (hundreds, tens, or units place).
- What should be returned? The string `"Yes"` if $n$ contains the digit 7, and `"No"` otherwise.
- Does 7 need to appear multiple times? No, a single appearance of 7 is sufficient.

## Examples to say out loud
- Consider $n = 117$.
  The digits are 1, 1, 7. The units digit is 7 $\to$ returns `"Yes"`.
- Consider $n = 123$.
  The digits are 1, 2, 3. None is 7 $\to$ returns `"No"`.
- Consider $n = 700$.
  The hundreds digit is 7 $\to$ returns `"Yes"`.
- Consider $n = 777$.
  Contains 7 $\to$ returns `"Yes"`.

## Brute force
A brute force approach turns $n$ into a string and searches for character `'7'`, or extracts each digit using repeated division and modulo 10. Since $n$ has exactly 3 digits, inspecting the digits takes at most 3 operations. The arithmetic approach is both simple and runs in $O(1)$ time and space without string heap allocations.

## The key observation
For any integer $n$, the least significant digit is given by $n \pmod{10}$, and dividing by 10 shifts the remaining digits down ($n \leftarrow \lfloor n / 10 \rfloor$).
While $n > 0$:
- If $n \pmod{10} == 7$, return `"Yes"` immediately.
- Otherwise, $n \leftarrow n / 10$.
If the loop finishes without finding 7, return `"No"`.

## Optimal approach
1. While $n > 0$:
   - Extract the last digit: `d = n % 10`.
   - If `d == 7`, return `"Yes"`.
   - Discard the last digit: `n /= 10`.
2. Return `"No"`.
3. Complexity:
   - Time Complexity: $O(1)$, at most 3 iterations since $n \le 999$.
   - Space Complexity: $O(1)$ auxiliary space.

## Code walkthrough
- `while (n)`: Loop through digits of $n$ until exhausted.
- `if (n % 10 == 7) return "Yes";`: Return `"Yes"` as soon as digit 7 is encountered.
- `n /= 10;`: Truncate the examined unit digit.
- `return "No";`: Return `"No"` if no digit matched 7.

## Test it out loud
- Test 1: $n = 100 \to 0, 0, 1 \to$ `"No"`.
- Test 2: $n = 777 \to$ first digit checked is $7 \to$ `"Yes"`.
- Test 3: $n = 700 \to 0, 0, 7 \to$ `"Yes"`.
- Test 4: $n = 170 \to 0, 7 \to$ `"Yes"`.
- Test 5: $n = 107 \to 7 \to$ `"Yes"`.

## Follow-ups
- How to check without loops for a 3-digit number?
  Extract digits explicitly: `n % 10 == 7 || (n / 10) % 10 == 7 || n / 100 == 7`.
- What if $n$ can be up to $10^{18}$?
  The same while loop runs in at most 18 iterations ($O(\log_{10} n)$ time), well within sub-microsecond constraints.

## Common mistakes
- Confusing string equality with integer comparison (e.g. comparing char `'7'` with int `7`).
- Incomplete checks (e.g. only checking the units digit `n % 10 == 7`).
- Returning boolean `true` / `false` instead of `"Yes"` / `"No"`.
