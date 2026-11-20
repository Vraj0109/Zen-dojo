---
id: c-atc-abc086-a
pattern: cses-atcoder
difficulty: easy
optimal: "O(1) time, O(1) space"
reviewed: false
---

## Clarify first

- What are the ranges of $a$ and $b$? (Both $a$ and $b$ are integers between 1 and 10,000).
- Exactly what strings should be returned? (The exact strings `"Even"` or `"Odd"` with matching capitalization).
- Can $a$ or $b$ be negative or zero? (No, constraints specify $1 \le a, b \le 10,000$).
- Can the product overflow standard 32-bit integers? (The maximum product is $10000 \times 10000 = 10^8$, which fits easily inside standard 32-bit signed integers).

## Examples to say out loud

- Mixed parity: $a = 3, b = 4$. Product is $3 \times 4 = 12$, which is divisible by 2. Returns `"Even"`.
- Both odd: $a = 1, b = 21$. Product is $1 \times 21 = 21$, which leaves a remainder of 1 when divided by 2. Returns `"Odd"`.
- Both even: $a = 2, b = 2$. Product is 4, which is even. Returns `"Even"`.

## Brute force

A direct simulation computes the product $p = a \times b$, checks the parity using the modulo operator `p % 2 == 0`, and returns `"Even"` if true, else `"Odd"`. While this works directly and runs in $O(1)$ time, calculating the full multiplication can cause integer overflow if the inputs are scaled up to $10^{18}$. Checking parity without performing full multiplication is more robust.

## The key observation

The parity of a multiplication follows elementary modular arithmetic:
$$\text{odd} \times \text{odd} = \text{odd}$$
$$\text{even} \times \text{even} = \text{even}$$
$$\text{even} \times \text{odd} = \text{even}$$
A product $a \times b$ is odd if and only if both factors $a$ and $b$ are odd. If either factor is even, the product is even. Thus, we only need to inspect the least significant bit or parity of each factor directly: $(a \bmod 2 == 1) \land (b \bmod 2 == 1)$.

## Optimal approach

1. Test if both $a$ and $b$ are odd:
   - Check if `a % 2 == 1 && b % 2 == 1` (or bitwise `(a & 1) && (b & 1)`).
2. If both conditions hold, return `"Odd"`.
3. Otherwise, return `"Even"`.

Complexity:
- Time: `O(1)` as only basic bitwise/modulo operations and conditionals are executed.
- Space: `O(1)` auxiliary space beyond returning the literal string.

## Code walkthrough

In the reference implementation:
- `a % 2 == 1`: checks whether the first number is odd.
- `b % 2 == 1`: checks whether the second number is odd.
- `(a % 2 == 1 && b % 2 == 1) ? "Odd" : "Even"`: returns `"Odd"` when both conditions are satisfied, otherwise returns `"Even"`.

## Test it out loud

- `a = 1, b = 1`:
  - `1 % 2 == 1` is true; `1 % 2 == 1` is true. Both true, returns `"Odd"`.
- `a = 2, b = 2`:
  - `2 % 2 == 0`. Condition fails, returns `"Even"`.
- `a = 9999, b = 9999`:
  - Both 9999 are odd. Returns `"Odd"`.
- `a = 10000, b = 9999`:
  - First is even, returns `"Even"`.

## Follow-ups

- What if $a$ and $b$ can be up to $10^{18}$?
  The parity logic `(a & 1) && (b & 1)` remains identical and requires no large multiplication, completely preventing 64-bit overflow.
- What if there is an array of $n$ numbers and we want the parity of their total product?
  The product of an entire array is odd if and only if every single element in the array is odd. We can check if any element has `num % 2 == 0` in $O(n)$ time and return `"Even"` immediately upon seeing the first even number.

## Common mistakes

- Performing full multiplication when inputs might be larger than 32-bit limits, causing arithmetic overflow.
- Capitalization bugs: returning `"even"` or `"odd"` instead of `"Even"` or `"Odd"`.
- Checking `(a % 2 == 1 || b % 2 == 1)` instead of `&&`, mistaking the condition for addition rather than multiplication.

## Further reading

- Elementary number theory on parity and modular arithmetic mod 2.
- Bitwise operators and fast bit inspection techniques.
