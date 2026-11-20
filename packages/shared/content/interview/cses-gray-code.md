---
id: cses-gray-code
pattern: cses-introductory
difficulty: medium
optimal: "O(n \times 2^n) time and O(n \times 2^n) space"
reviewed: false
---

## Clarify first
- What is a Gray code of length $n$? An ordered sequence of all $2^n$ unique $n$-bit binary strings where any two adjacent strings differ by exactly one bit.
- Which specific Gray code construction is required? The standard reflected Gray code: start with the code for $n - 1$ prefixed by '0', followed by the reverse of the code for $n - 1$ prefixed by '1'.
- What are the constraints on $n$? $1 \le n \le 16$.
- What is the output format? A list of strings of length $n$, containing all $2^n$ binary strings in reflected Gray order.

## Examples to say out loud
- For $n = 1$:
  - Base code: `["0", "1"]`.
- For $n = 2$:
  - Take $n = 1$: `["0", "1"]`.
  - First half with '0' prefix: `["00", "01"]`.
  - Second half with reversed order and '1' prefix: `["11", "10"]`.
  - Combined: `["00", "01", "11", "10"]`.
  - Consecutive differences: "00" to "01" (1 bit), "01" to "11" (1 bit), "11" to "10" (1 bit). Valid.
- For $n = 3$:
  - Prefix '0' to $n = 2$: `["000", "001", "011", "010"]`.
  - Prefix '1' to reversed $n = 2$: `["110", "111", "101", "100"]`.
  - Combined: 8 strings. Notice boundary from "010" to "110" differs only in the leading bit.

## Brute force
A brute-force Hamiltonian path search on an $n$-dimensional hypercube would attempt bit transitions using graph DFS/backtracking to visit all $2^n$ vertices. For $n = 16$, the hypercube has $65536$ vertices, and searching without structure is computationally slow and unnecessary when a direct algebraic or recursive construction is available.

## The key observation
There is a direct closed-form formula for the $i$-th reflected Gray code integer value:
$$g(i) = i \oplus (i \gg 1)$$
where $\oplus$ is the bitwise XOR operator and $\gg$ is an arithmetic or logical right shift by 1 bit.
Because consecutive integers $i$ and $i + 1$ differ in their binary representation by flipping a sequence of trailing ones followed by a zero, the XOR transform $i \oplus (i \gg 1)$ causes exactly one bit to change between $g(i)$ and $g(i + 1)$. Converting $g(i)$ to an $n$-bit binary string generates the exact reflected Gray code directly.

## Optimal approach
1. Initialize an empty list of strings `out`.
2. Iterate $i$ from $0$ up to $2^n - 1$:
   - Compute the integer Gray value: $g = i \oplus (i \gg 1)$.
   - Format $g$ as an $n$-character binary string with leading zeros.
   - Append the string to `out`.
3. Return `out`.

Complexity:
- Time: $O(n \times 2^n)$ because there are $2^n$ words, each requiring $O(n)$ bit extractions to construct the string. For $n = 16$, $16 \times 65536 \approx 10^6$ operations, which finishes in a few milliseconds.
- Space: $O(n \times 2^n)$ to store the output list of binary strings.

## Code walkthrough
- `for (int i = 0; i < (1 << n); i++)`: Generates all indices from 0 to $2^n - 1$.
- `int g = i ^ (i >> 1)`: Closed-form formula mapping index $i$ to its reflected Gray code codeword.
- `for (int b = n - 1; b >= 0; b--) s += char('0' + ((g >> b) & 1))`: Extracts bits from most significant (index $n - 1$) to least significant (index 0) to ensure uniform length $n$.
- `out.push_back(s)`: Appends the formatted string to the result.

## Test it out loud
- Test case $1$: $n = 1 \implies i = 0: 0 \oplus 0 = 0 \to \text{"0"}$; $i = 1: 1 \oplus 0 = 1 \to \text{"1"}$. Result: `["0", "1"]`.
- Test case $2$: $n = 2 \implies i = 0 \dots 3$:
  - $0 \to 00$
  - $1 \to 01$
  - $2 \to 2 \oplus 1 = 3 \to 11$
  - $3 \to 3 \oplus 1 = 2 \to 10$
  - Result: `["00", "01", "11", "10"]`.
- Test case $3$: $n = 3 \implies$ Produces `["000","001","011","010","110","111","101","100"]`.

## Follow-ups
- How to convert from a Gray code string back to an integer index? If $g$ is the Gray code, the standard binary value $b$ satisfies $b = g \oplus (g \gg 1) \oplus (g \gg 2) \dots$.
- Why is reflected Gray code used in hardware encoders? Because changing physical positions flips at most one sensor bit at any boundary, preventing spurious intermediate states caused by asynchronous bit transitions.

## Common mistakes
- Inverted bit order: Printing bits from index 0 up to $n - 1$ instead of $n - 1$ down to 0 flips the significance of bits.
- Variable bit-string length: Omitting leading zeros (e.g. printing "1" instead of "001" for $n = 3$) violates the fixed-length output specification.
- Exceeding integer bit limits: For $n \le 16$, standard 32-bit signed integers are fully sufficient since $1 \ll 16 = 65536$.

## Further reading
- [Gray Code on Wikipedia](https://en.wikipedia.org/wiki/Gray_code)
