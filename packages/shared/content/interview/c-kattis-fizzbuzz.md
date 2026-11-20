---
id: c-kattis-fizzbuzz
pattern: cses-kattis
difficulty: easy
optimal: "O(n) time and O(1) space"
reviewed: false
---

## Clarify first
- What are the inputs? Three integers `x`, `y`, and `n`.
- What are the rules?
  - For each integer `i` from 1 to `n`:
    - If `i` is divisible by both `x` and `y`, print `"FizzBuzz"`.
    - Else if `i` is divisible by `x`, print `"Fizz"`.
    - Else if `i` is divisible by `y`, print `"Buzz"`.
    - Otherwise, print `i`.
- What are the constraints? `1 <= x < y <= n <= 100`.

## Examples to say out loud
- Consider `x = 2, y = 3, n = 7`:
  - 1 -> `1`
  - 2 -> `Fizz`
  - 3 -> `Buzz`
  - 4 -> `Fizz`
  - 5 -> `5`
  - 6 -> divisible by 2 and 3 -> `FizzBuzz`
  - 7 -> `7`

## Brute force
A straightforward loop iterating `i` from 1 to `n` and applying the divisibility conditions directly is already the most direct and optimal solution. Since `n <= 100`, the loop runs at most 100 iterations.

## The key observation
The common multiple condition (divisible by both `x` and `y`) must be checked before the individual divisibility conditions, or string concatenation can be used: append "Fizz" if `i % x == 0`, append "Buzz" if `i % y == 0`, and if the resulting string is empty, use `i`.

## Optimal approach
1. Iterate `i` from 1 to `n`.
2. Check if `i % x == 0` and `i % y == 0`. If so, output `"FizzBuzz"`.
3. Otherwise, check if `i % x == 0`. If so, output `"Fizz"`.
4. Otherwise, check if `i % y == 0`. If so, output `"Buzz"`.
5. Otherwise, output `i`.

Complexity:
- Time complexity: O(n) where `n <= 100`, performing O(1) work per number.
- Space complexity: O(1) auxiliary space beyond standard input and output buffers.

## Code walkthrough
- `for (int i = 1; i <= n; i++)`: Loops through numbers from 1 to `n`.
- `if (i % x == 0 && i % y == 0) cout << "FizzBuzz\n"`: Catches numbers divisible by both.
- `else if (i % x == 0) cout << "Fizz\n"`: Catches multiples of `x`.
- `else if (i % y == 0) cout << "Buzz\n"`: Catches multiples of `y`.
- `else cout << i << "\n"`: Handles non-multiples.

## Test it out loud
- `x = 2, y = 3, n = 6`: Output sequence is `1, Fizz, Buzz, Fizz, 5, FizzBuzz`. Correct.
- `x = 3, y = 5, n = 15`: 15 triggers the first `&&` branch and prints `FizzBuzz`. Correct.

## Follow-ups
- How to structure the logic to easily support arbitrary rules (e.g. 7 -> "Bazz", 11 -> "Jazz")? Maintain a list of pairs `(divisor, word)`. For each `i`, iterate through the list and append matching words; if none match, print `i`.

## Common mistakes
- Checking `i % x == 0` before checking both `x` and `y`, printing `"Fizz"` instead of `"FizzBuzz"`.
