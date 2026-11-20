---
id: c-atc-abc146-b
pattern: cses-atcoder
difficulty: easy
optimal: "O(n) time, O(1) extra space"
reviewed: false
---

## Clarify first
- What alphabet characters are present in the string? Only uppercase English letters 'A' through 'Z'.
- What is the shift amount $N$? An integer from $0$ to $26$.
- Does shifting wrap around circularly? Yes, shifting 'Z' by $1$ yields 'A', 'Y' by $2$ yields 'A', etc.
- What should be returned if $N = 0$ or $N = 26$? Shifting by $0$ or by $26$ leaves the string completely unchanged.
- Can we mutate the string in place or should we return a new string? In languages like C++, in-place mutation avoids allocations; in Java and Python, strings are immutable so we construct a new string.

## Examples to say out loud
- Consider `n = 2` and `s = "ABCXYZ"`.
  - 'A' shifted by 2 becomes 'C'.
  - 'B' shifted by 2 becomes 'D'.
  - 'C' shifted by 2 becomes 'E'.
  - 'X' shifted by 2 becomes 'Z'.
  - 'Y' shifted by 2 wraps around to 'A'.
  - 'Z' shifted by 2 wraps around to 'B'.
  Result: `"CDEZAB"`.
- Edge case: `n = 0` or `n = 26` with `s = "HELLO"`.
  Every character remains identical: `"HELLO"`.

## Brute force
A brute force approach might simulate the shift by repeatedly advancing each character one step at a time $N$ times, wrapping 'Z' to 'A' manually. While that is $O(N \cdot |s|)$, which runs easily because $N \le 26$, repeating single steps is unnecessarily verbose when modular arithmetic gives the direct target character in $O(1)$ operations per letter.

## The key observation
Each uppercase letter can be mapped to an index from $0$ to $25$ by subtracting the ASCII value of `'A'`: `index = c - 'A'`.
Adding the shift offset $N$ and reducing modulo $26$ handles circular wraparound seamlessly:
`new_index = (c - 'A' + N) % 26`.
Converting back to a character via `'A' + new_index` directly yields the shifted letter.

## Optimal approach
1. Iterate over each character $c$ in the input string $s$.
2. Compute the 0-indexed position in the alphabet: `pos = c - 'A'`.
3. Shift and wrap: `new_pos = (pos + n) % 26`.
4. Convert back to an uppercase character: `new_char = 'A' + new_pos`.
5. Update or append `new_char` to the output string.
6. Complexity:
   - Time Complexity: $O(n)$, where $n$ is the length of string $s$, since each letter is transformed in $O(1)$ time.
   - Space Complexity: $O(1)$ auxiliary space if modifying in-place, or $O(n)$ to store the output string.

## Code walkthrough
- `for (char& c : s)`: Iterate through each character of the string by reference.
- `(c - 'A' + n) % 26`: Normalize the character to $[0, 25]$, add the forward shift $n$, and take remainder modulo $26$ to wrap past 'Z'.
- `c = (char)('A' + ...)`: Cast the shifted integer back to an ASCII character and assign it back into the string.
- `return s;`: Return the modified string.

## Test it out loud
- Test 1: `n = 0, s = "A"` $\to$ `('A' - 'A' + 0) % 26 = 0` $\to$ `'A' + 0 = 'A'`. Matches `"A"`.
- Test 2: `n = 1, s = "Z"` $\to$ `('Z' - 'A' + 1) % 26 = (25 + 1) % 26 = 0` $\to$ `'A' + 0 = 'A'`. Matches `"A"`.
- Test 3: `n = 13, s = "HELLO"` $\to$ Classic ROT13 $\to$ `"URYYB"`.
- Test 4: `n = 26, s = "HELLO"` $\to$ Shift $26 \equiv 0 \pmod{26}$, returns `"HELLO"`.

## Follow-ups
- How would you handle both lowercase and uppercase letters?
  Check `isupper(c)` versus `islower(c)` and apply the shift relative to `'A'` or `'a'` respectively, leaving non-alphabetic characters intact.
- What if $N$ can be arbitrary large or negative?
  Normalize the shift first using `n = ((n % 26) + 26) % 26`. This maps any integer shift (even negative ones like -3) to a valid non-negative offset in $[0, 25]$.

## Common mistakes
- Forgetting to subtract `'A'` before applying `% 26`, which results in erroneous modulo calculations against raw ASCII code points.
- Missing parentheses or incorrect precedence, like `c - 'A' + (n % 26)` without wrapping the combined sum modulo $26$.
- String concatenation inside a loop in Java or Python without `StringBuilder` or `''.join()`, which creates $O(n^2)$ garbage string allocations.
