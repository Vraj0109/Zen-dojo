---
id: cses-digit-queries
pattern: cses-introductory
difficulty: medium
optimal: "O(log_{10} k) time and O(1) space"
reviewed: false
---

## Clarify first
- How is the sequence formed? All positive integers $1, 2, 3, 4, \dots$ are concatenated in ascending order without spaces to create an infinite string of digits: $12345678910111213\dots$.
- How are positions indexed? 1-indexed (position 1 is '1', position 9 is '9', position 10 is '1', position 11 is '0').
- What is the range of $k$? $1 \le k \le 10^{18}$. Because $k$ is up to $10^{18}$, it is provided as a string to avoid precision loss in certain runtime environments.
- What should be returned? The single decimal digit at position $k$ as an integer.

## Examples to say out loud
- Consider $k = 7$:
  - Digits 1 to 9 correspond directly to integers $1$ to $9$.
  - At position 7, the digit is 7.
- Consider $k = 19$:
  - The first 9 digits correspond to numbers $1 \dots 9$. Remaining $k = 19 - 9 = 10$.
  - 2-digit numbers start at 10. Each number contributes 2 digits.
  - Number index: $\lfloor (10 - 1) / 2 \rfloor = 4$.
  - The number is $10 + 4 = 14$.
  - Digit offset inside the number: $(10 - 1) \pmod 2 = 1$ (the second digit of 14).
  - The second digit of "14" is 4. Returns 4.

## Brute force
A brute-force solution would construct the sequence by appending numbers $1, 2, 3, \dots$ to a string buffer or counting digits sequentially until reaching $k$. With $k$ up to $10^{18}$, generating or iterating $10^{18}$ digits would take thousands of years. Grouping numbers by digit length enables skipping whole blocks in $O(\log_{10} k)$ operations.

## The key observation
We can group integers by their digit length $L$:
- Length $L = 1$: numbers $1 \dots 9$ (9 numbers, $9 \times 1 = 9$ digits).
- Length $L = 2$: numbers $10 \dots 99$ (90 numbers, $90 \times 2 = 180$ digits).
- Length $L = 3$: numbers $100 \dots 999$ (900 numbers, $900 \times 3 = 2700$ digits).
- Length $L$: starts at $10^{L-1}$, contains $9 \times 10^{L-1}$ numbers, contributing $L \times 9 \times 10^{L-1}$ digits.
By subtracting the total digits in each group from $k$ while $k > \text{group\_digits}$, we locate the exact length $L$. From there, integer division identifies the specific number, and modulo identifies the target digit within that number.

## Optimal approach
1. Parse the string $k$ into a 64-bit integer (`long long`).
2. Initialize `len = 1`, `count = 9`, and `start = 1`.
3. While $k > \text{len} \times \text{count}$:
   - Subtract $\text{len} \times \text{count}$ from $k$.
   - Increment `len` by 1.
   - Multiply `count` and `start` by 10.
4. Calculate the specific number:
   $$\text{num} = \text{start} + \frac{k - 1}{\text{len}}$$
5. Convert $\text{num}$ to a string, and pick the character at index $(k - 1) \pmod{\text{len}}$.
6. Return the character converted to an integer.

Complexity:
- Time: $O(\log_{10} k)$ since $k \le 10^{18}$, the loop runs at most 18 times.
- Space: $O(1)$ auxiliary space as the string representation of $\text{num}$ is at most 18 characters.

## Code walkthrough
- `long long k = stoll(ks)`: Parses the input string into a 64-bit signed integer.
- `while (k > len * count)`: Skips preceding digit-length blocks where $k$ does not land.
- `k -= len * count; len++; count *= 10; start *= 10`: Moves to the next length block.
- `long long num = start + (k - 1) / len`: Pinpoints the exact integer containing the $k$-th digit (0-indexed using $k - 1$).
- `s[(k - 1) % len] - '0'`: Extracts the exact digit within `num` based on the remainder.

## Test it out loud
- Test case $1$: $k = 1$. Does not enter loop. $\text{num} = 1 + 0 = 1$. Digit index $0 \implies 1$.
- Test case $2$: $k = 9$. Does not enter loop. $\text{num} = 1 + 8/1 = 9$. Digit index $0 \implies 9$.
- Test case $3$: $k = 10$. Loops once ($k = 10 - 9 = 1, \text{len} = 2, \text{start} = 10$). $\text{num} = 10 + 0 = 10$. Digit $(1 - 1) \% 2 = 0$ of "10" $\implies 1$.
- Test case $4$: $k = 11$. After loop, $k = 2$. $\text{num} = 10 + 1/2 = 10$. Digit $(2 - 1) \% 2 = 1$ of "10" $\implies 0$.

## Follow-ups
- How to avoid 64-bit integer overflow during $\text{len} \times \text{count}$? For $k \le 10^{18}$, $L \le 18$. At $L = 18$, $9 \times 10^{17} \times 18 \approx 1.6 \times 10^{19}$, which can exceed signed 64-bit integer max ($9.22 \times 10^{18}$). To prevent overflow, check `k > len * count` safely or use `unsigned long long`.
- What if the sequence used base 2 or base 16 instead of decimal? Group by powers of the base ($2$ or $16$) and digit length in that base using the identical logic.

## Common mistakes
- Off-by-one errors in division and remainder: Using $k / \text{len}$ instead of $(k - 1) / \text{len}$ causes shifts at every boundary between numbers.
- 32-bit integer overflow: $k$ up to $10^{18}$ requires 64-bit arithmetic everywhere; standard 32-bit `int` overflows immediately.

## Further reading
- [Champernowne Constant on Wikipedia](https://en.wikipedia.org/wiki/Champernowne_constant)
