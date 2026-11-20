---
id: c-kattis-oddmanout
pattern: cses-kattis
difficulty: easy
optimal: "O(n) time, O(1) space"
reviewed: false
---

## Clarify first

- How are codes structured in the list? (Every invitation code appears exactly twice, except for one unique code that appears exactly once).
- Is the list sorted? (No, the codes can appear in arbitrary unsorted order).
- What are the constraints on array length and values? (`1 <= codes.length <= 99999` with `codes.length` always odd, and each code $1 \le codes[i] \le 2,000,000,000$).
- Can the answer be found without allocating extra heap memory? (Yes, bitwise XOR allows finding the lone element in $O(1)$ space).
- What should be returned? (The integer invitation code of the guest who came alone).

## Examples to say out loud

- Standard case: `codes = [1, 2, 3, 2, 1]`.
  - Codes 1 and 2 appear twice each. Code 3 appears once. Output is 3.
- Single element: `codes = [7]`. Only one code exists. Output is 7.
- Adjacent pairs: `codes = [5, 5, 9]`. 5 appears twice, 9 appears once. Output is 9.
- Distant pairs: `codes = [4, 8, 4, 8, 15]`. Pairs $(4, 4)$ and $(8, 8)$ cancel. Lone code is 15.

## Brute force

A brute-force strategy compares each element against every other element in the list using nested loops, checking if any element has no duplicate. With $n \le 99,999$, an $O(n^2)$ search evaluates roughly $10^{10}$ comparisons, which takes several seconds and times out. Alternatively, a hash map or hash set takes $O(n)$ time but requires $O(n)$ extra memory.

## The key observation

The bitwise XOR operator ($\oplus$) has three fundamental algebraic properties:
1. Self-inverse: $x \oplus x = 0$ (any number XORed with itself cancels to zero).
2. Identity: $x \oplus 0 = x$.
3. Commutative and associative: the order in which numbers are XORed does not affect the final result.
If we compute the cumulative XOR sum of all elements in the array:
$$\text{result} = codes[0] \oplus codes[1] \oplus \dots \oplus codes[n - 1]$$
Every number that appears twice will pair up and cancel to 0: $c \oplus c = 0$. The single number that appears once XORed with 0 leaves its original value unchanged: $\text{lone\_code} \oplus 0 = \text{lone\_code}$.

## Optimal approach

1. Initialize a variable `x = 0`.
2. Iterate through each element `c` in `codes`:
   - Compute `x = x ^ c`.
3. Return `x`.

Complexity:
- Time: `O(n)` where $n$ is the length of `codes`. We perform a single linear scan with one bitwise XOR instruction per element. For $n = 99,999$, this executes in under 2 ms.
- Space: `O(1)` auxiliary space because we only maintain a single integer register without allocating data structures.

## Code walkthrough

In the reference implementation:
- `int x = 0;`: initializes the XOR identity accumulator.
- `for (int c : codes) x ^= c;`: folds each invitation code into the running bitwise sum, naturally canceling all duplicate pairs.
- `return x;`: returns the unique leftover code that appeared only once.

## Test it out loud

- `codes = [7]`:
  - $x = 0 \oplus 7 = 7$. Returns 7.
- `codes = [5, 5, 9]`:
  - $x = 0 \oplus 5 = 5$.
  - $x = 5 \oplus 5 = 0$.
  - $x = 0 \oplus 9 = 9$. Returns 9.
- `codes = [2000000000, 1, 2000000000]`:
  - The two instances of 2,000,000,000 cancel out: $2 \times 10^9 \oplus 2 \times 10^9 = 0$.
  - Leaves 1. Returns 1.

## Follow-ups

- What if two different codes appear once and all others appear twice? (Single Number III):
  XORing all elements yields $a \oplus b$. We find any set bit where $a$ and $b$ differ, partition the numbers into two groups based on that bit, and XOR each group separately to isolate both numbers in $O(n)$ time and $O(1)$ space.
- What if every number appears three times except one that appears once? (Single Number II):
  XOR cancels even counts; for odd multiples like 3, we count set bits modulo 3 across each of the 32 bit positions in $O(32n)$ time and $O(1)$ space.

## Common mistakes

- Using a hash map or hash set when the interviewer explicitly asks for $O(1)$ extra space.
- Sorting the array first ($O(n \log n)$), which requires mutating the array or allocating extra memory.
- Initializing the accumulator to a non-zero value or omitting 64-bit consideration if numbers exceeded 32-bit signed range (here values fit in standard 32-bit signed integers $\le 2 \times 10^9$).

## Further reading

- Bitwise XOR properties and Boolean ring algebra.
- LeetCode 136 (Single Number) and variations (Single Number II and III).
