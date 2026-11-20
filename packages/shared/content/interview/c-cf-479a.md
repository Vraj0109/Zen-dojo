---
id: c-cf-479a
pattern: cses-codeforces
difficulty: easy
optimal: "O(1) time and O(1) space"
reviewed: false
---

## Clarify first
- What are the inputs? Three integers `a`, `b`, and `c` in that exact order.
- What operations can we insert? We can insert signs `+` and `*`, and arbitrarily place parentheses to dictate the order of operations.
- Can we reorder the integers? No, the order `a`, then `b`, then `c` must remain unchanged.
- What is the goal? Maximize the value of the resulting expression.
- What are the constraints? `1 <= a, b, c <= 10`.

## Examples to say out loud
- Consider `a = 1, b = 2, c = 3`:
  - `(1 + 2) * 3 = 3 * 3 = 9`.
  - `1 + 2 * 3 = 7`.
  - `1 * 2 * 3 = 6`.
  - The maximum is 9.
- Consider `a = 2, b = 10, c = 3`:
  - `2 * 10 * 3 = 60`.
  - The maximum is 60.

## Brute force
There are only two binary operator slots and two ways to parenthesize a sequence of three numbers: `((a op1 b) op2 c)` and `(a op1 (b op2 c))`. With two choices (`+` or `*`) per slot, there are at most `2 * 2 * 2 = 8` possible parenthesized arithmetic expressions. We can simply evaluate all of them and take the maximum.

## The key observation
The possible meaningful expression structures are:
1. `a + b + c`
2. `a * b * c`
3. `(a + b) * c`
4. `a * (b + c)`
5. `a + (b * c)`
6. `(a * b) + c`

Expressions 5 and 6 are never strictly better than either `a + b + c` or `a * b * c` (except trivially tied), but including them costs nothing. Evaluating these expressions explicitly guarantees finding the global maximum in O(1) time.

## Optimal approach
1. Evaluate each of the following candidate values:
   - `val1 = a + b + c`
   - `val2 = a * b * c`
   - `val3 = (a + b) * c`
   - `val4 = a * (b + c)`
   - `val5 = a + b * c`
   - `val6 = a * b + c`
2. Return the maximum among all computed values.

Complexity:
- Time complexity: O(1) because exactly 6 constant arithmetic evaluations are performed.
- Space complexity: O(1) auxiliary space as only a few scalar variables are used.

## Code walkthrough
- `int ans = a + b + c`: Initial baseline using purely addition.
- `ans = max(ans, a * b * c)`: Considers pure multiplication.
- `ans = max(ans, (a + b) * c)`: Considers grouping the first two terms before multiplying.
- `ans = max(ans, a * (b + c))`: Considers grouping the last two terms before multiplying.
- `ans = max({ans, a + b * c, a * b + c})`: Considers mixed precedence without parentheses.
- `return ans`: Returns the maximum possible evaluation.

## Test it out loud
- `a = 1, b = 2, c = 3`: Candidates include `(1 + 2) * 3 = 9`. Result is 9. Correct.
- `a = 1, b = 1, c = 1`: `1 + 1 + 1 = 3`, whereas `(1 + 1) * 1 = 2` and `1 * 1 * 1 = 1`. Result is 3. Correct.
- `a = 2, b = 10, c = 3`: `2 * 10 * 3 = 60`. Result is 60. Correct.

## Follow-ups
- How does this generalize to `n` numbers? If the sequence cannot be reordered and operations are limited to `+` and `*`, we can solve it using interval dynamic programming (matrix chain multiplication style) in O(n^3) time.

## Common mistakes
- Assuming multiplication is always better than addition; when numbers are equal to 1, addition yields a larger result (e.g. `1 + 1 + 1 = 3 > 1 * 1 * 1 = 1`).
- Permuting `a`, `b`, and `c`, which violates the problem rule that operand order is fixed.
