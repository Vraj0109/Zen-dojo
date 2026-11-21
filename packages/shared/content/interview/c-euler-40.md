---
id: c-euler-40
pattern: cses-euler
difficulty: medium
optimal: "O(log k) time, O(1) space"
brute: same
reviewed: false
---

## Clarify first
- What is the infinite counting string? The concatenation of all positive integers in increasing order without spaces or delimiters: `"1234567891011121314151617181920..."` (Champernowne's constant digits).
- How is position $k$ indexed? 1-based indexing, so position 1 is the digit 1, position 9 is 9, position 10 is the digit 1 (from "10"), and position 11 is 0.
- What is the upper bound on $k$? $k$ can be as large as $10^{15}$.
- What should be returned? An integer representing the single decimal digit at position $k$.
- Can we generate the string in memory? No, for $k \le 10^{15}$, storing or generating the string is impossible. We must use mathematical group skipping.

## Examples to say out loud
- Consider $k = 11$.
  The sequence is:
  Indices 1-9: "1", "2", "3", "4", "5", "6", "7", "8", "9" (9 digits).
  Indices 10-11: "10" $\to$ index 10 is '1', index 11 is '0'.
  Result: 0.
- Consider $k = 12$.
  Index 12 is the first digit of "11" $\to$ result is 1.
- Edge case: $k = 1 \to$ result is 1.
- Edge case: $k = 9 \to$ result is 9.

## Brute force
A brute force approach would incrementally append integers $1, 2, 3, \dots$ to a counter or string until the accumulated digit length reaches $k$. While this works for $k \le 10^6$, for $k = 10^{15}$ it requires iterating through billions of numbers, which will run for days. We need an $O(\log k)$ digit group elimination method.

## The key observation
We can partition the infinite string into blocks based on the number of digits in each number:
- 1-digit numbers: 1 to 9 (9 numbers) $\to 9 \times 1 = 9$ digits.
- 2-digit numbers: 10 to 99 (90 numbers) $\to 90 \times 2 = 180$ digits.
- 3-digit numbers: 100 to 999 (900 numbers) $\to 900 \times 3 = 2700$ digits.
- In general, numbers with $L$ digits: $9 \times 10^{L-1}$ numbers, contributing $L \times 9 \times 10^{L-1}$ digits.
While $k$ is greater than the total digits in the current block, we subtract the block's size from $k$ and advance to $L + 1$ digits.
Once $k$ falls within the $L$-digit block:
- The exact number containing the digit is: $\text{first} + \lfloor (k - 1) / L \rfloor$, where $\text{first} = 10^{L-1}$.
- The digit within that number is at 0-based offset $(k - 1) \pmod L$.

## Optimal approach
1. Initialize `len = 1` (digit length), `count = 9` (count of numbers), and `first = 1` (first number of length `len`).
2. While $k > \text{len} \times \text{count}$:
   - $k \leftarrow k - (\text{len} \times \text{count})$.
   - $\text{len} \leftarrow \text{len} + 1$.
   - $\text{count} \leftarrow \text{count} \times 10$.
   - $\text{first} \leftarrow \text{first} \times 10$.
3. Compute the target number: `num = first + (k - 1) / len`.
4. Convert `num` to a string (or extract digits mathematically).
5. The desired digit is at offset `(k - 1) % len`.
6. Return `s[(k - 1) % len] - '0'`.
7. Complexity:
   - Time Complexity: $O(\log_{10} k)$ iterations, since the number of digits $L \le 16$ for $k \le 10^{15}$. Runs in under 1 microsecond.
   - Space Complexity: $O(1)$ auxiliary space.

## Code walkthrough
- `long long len = 1, count = 9, first = 1;`: Track length group parameters using 64-bit integers.
- `while (k > len * count)`: Skip full groups of numbers having length `len`.
- `long long num = first + (k - 1) / len;`: Pinpoint the exact integer in which position $k$ lands.
- `string s = to_string(num);`: String representation to extract the specific character.
- `return s[(k - 1) % len] - '0';`: Extract the digit at the calculated offset.

## Test it out loud
- Test 1: $k = 1 \to k \le 9 \to \text{num} = 1 + 0 = 1$, offset $0 \to$ returns 1.
- Test 2: $k = 9 \to \text{num} = 1 + 8 = 9$, offset $0 \to$ returns 9.
- Test 3: $k = 10 \to k = 10 - 9 = 1$, length 2 $\to \text{num} = 10 + 0 = 10$, offset $0 \to$ returns 1.
- Test 4: $k = 11 \to k = 2$, length 2 $\to \text{num} = 10 + 0 = 10$, offset $1 \to$ returns 0.
- Test 5: $k = 190 \to k - 9 - 180 = 1$, length 3 $\to \text{num} = 100$, offset $0 \to$ returns 1.

## Follow-ups
- How to extract the digit without converting `num` to a string?
  The digit at index $idx = (k - 1) \pmod L$ corresponds to dividing off the remaining $L - 1 - idx$ trailing digits and taking modulo 10: $\lfloor \frac{\text{num}}{10^{L - 1 - idx}} \rfloor \pmod{10}$.
- What if the sequence used numbers in base $B$ instead of decimal?
  The same group-skipping logic applies with base $B$: there are $(B - 1) \times B^{L-1}$ numbers of length $L$.

## Common mistakes
- Using 32-bit signed integers for $k$ or `count`, which overflow since $k \le 10^{15}$.
- Off-by-one errors using $k / \text{len}$ instead of $(k - 1) / \text{len}$, landing on the wrong number at boundaries.
- Forgetting that the problem uses 1-based indexing.
