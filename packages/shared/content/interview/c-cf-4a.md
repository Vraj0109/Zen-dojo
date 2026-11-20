---
id: c-cf-4a
pattern: cses-codeforces
difficulty: easy
optimal: "O(1) time, O(1) space"
reviewed: false
---

## Clarify first

- What weight ranges are given? (Watermelon weight w is an integer between 1 and 100 kilograms).
- What conditions must the two divided parts satisfy? (Each part must be a strictly positive integer, and each part must be an even number of kilograms: w1 > 0, w2 > 0, w1 % 2 == 0, w2 % 2 == 0, and w1 + w2 == w).
- Must the two parts be equal in weight? (No, the two parts do not need to be equal; for example, 8 = 2 + 6 is valid).
- What should be returned? (A boolean true if a valid partition into two positive even numbers exists, otherwise false).

## Examples to say out loud

- Standard even case: `w = 8`. We can split into 2 + 6 or 4 + 4. Both 2 and 6 are positive even integers. Output is true.
- Odd case: `w = 5`. Any split of 5 into two integers consists of one even and one odd integer (such as 1 + 4 or 2 + 3). It is impossible to form two even integers. Output is false.
- Tricky boundary case: `w = 2`. The only positive integer partition is 1 + 1. Neither 1 is an even number. The split 2 + 0 is disallowed because parts must be strictly positive. Output is false.

## Brute force

A brute-force strategy enumerates all possible integer splits w1 from 1 to w - 1, setting w2 = w - w1. For each pair, it tests if w1 % 2 == 0 and w2 % 2 == 0. If any such pair is found, it returns true. Since w <= 100, checking at most 100 pairs runs in O(w) time. However, this iteration is unnecessary because arithmetic parity rules determine the answer in O(1) operations.

## The key observation

The sum of any two even numbers is always even: 2k1 + 2k2 = 2(k1 + k2). Thus, w must be an even number; if w is odd, no valid split exists. Furthermore, because each part must be a positive even integer, the smallest possible part is 2. The smallest possible sum of two positive even integers is 2 + 2 = 4. For any even integer w >= 4, we can always pick w1 = 2 and w2 = w - 2, both of which are positive even integers. Thus, a valid split exists if and only if w is even and w > 2.

## Optimal approach

1. Check whether w is even: `w % 2 == 0`.
2. Check whether w is strictly greater than 2: `w > 2`.
3. Return true if both conditions hold, otherwise false.

Complexity:
- Time: `O(1)` because we perform a single modulo and comparison operation.
- Space: `O(1)` auxiliary space as no additional memory is allocated.

## Code walkthrough

In the reference implementation:
- `w % 2 == 0`: ensures the total weight has even parity, an absolute prerequisite for summing two even numbers.
- `w > 2`: excludes the edge case w = 2, which cannot be divided into two positive even numbers.
- `return w % 2 == 0 && w > 2;`: combines both necessary and sufficient conditions into a single constant-time boolean expression.

## Test it out loud

- `w = 1`: odd, returns false.
- `w = 2`: even, but 2 > 2 is false; returns false.
- `w = 4`: even and 4 > 2 is true (2 + 2); returns true.
- `w = 8`: even and 8 > 2 is true (2 + 6); returns true.
- `w = 99`: odd, returns false.

## Follow-ups

- What if the watermelon must be split into k positive even parts?
  By induction, w must be even and w >= 2k. We can assign k - 1 parts of weight 2, leaving the last part with weight w - 2(k - 1), which is even and positive.
- What if parts can be odd numbers instead?
  The sum of two odd numbers is even. Thus w must still be even, and w >= 2 (1 + 1).

## Common mistakes

- Missing the boundary case w = 2: assuming that all even numbers are valid, which produces an incorrect true for w = 2.
- Checking parity with floating-point division instead of integer remainder.
- Testing non-positive parts: assuming 2 + 0 is a valid division when parts must be positive.

## Further reading

- Elementary parity properties in integer arithmetic.
- Codeforces Div. 2 problem analysis and edge cases.
