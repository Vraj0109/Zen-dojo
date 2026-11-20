---
id: c-cf-118a
pattern: cses-codeforces
difficulty: easy
optimal: "O(n) time, O(n) space"
reviewed: false
---

## Clarify first
- What letters are considered vowels? The letters 'a', 'o', 'y', 'e', 'u', and 'i' (note that 'y' is explicitly treated as a vowel).
- Are vowels case-insensitive? Yes, both uppercase and lowercase forms ('A', 'a', 'Y', 'y', etc.) must be deleted.
- What transformation is applied to consonants? Every remaining consonant must be converted to lowercase and preceded by a period (`'.'`).
- What are the length and character constraints? The string length is between 1 and 100, containing only uppercase and lowercase English letters.
- What happens if all characters are vowels? The output is the empty string `""`.

## Examples to say out loud
- Consider `s = "tour"`.
  - 't' $\to$ consonant $\to$ `".t"`
  - 'o' $\to$ vowel $\to$ skip
  - 'u' $\to$ vowel $\to$ skip
  - 'r' $\to$ consonant $\to$ `".r"`
  Result: `".t.r"`.
- Consider `s = "Codeforces"`.
  - Lowercased: `"codeforces"`.
  - Vowels: 'o', 'e', 'o', 'e' removed.
  - Consonants: 'c', 'd', 'f', 'r', 'c', 's'.
  Result: `".c.d.f.r.c.s"`.
- Edge case: `s = "aeiouy"` $\to$ all vowels deleted $\to$ `""`.

## Brute force
A brute force approach might perform multiple full-string passes: first pass converts the entire string to lowercase, second pass scans and removes each vowel character (shifting elements in place), and third pass inserts `'.'` before each remaining character. While this works in $O(n^2)$ time with in-place shifts, a single linear pass building the output string into a buffer is both simpler and optimal.

## The key observation
We can process each character of the input string independently in a single forward pass:
1. Convert character $c$ to lowercase.
2. Check if $c \in \{'a', 'o', 'y', 'e', 'u', 'i'\}$.
3. If it is a vowel, skip it.
4. If it is a consonant, append `'.'` followed by $c$.
Each character requires $O(1)$ lookup time against the 6-vowel set.

## Optimal approach
1. Define a lookup structure (or small string `"aoyeui"`) for the 6 vowels.
2. Initialize an empty string buffer `result`.
3. Iterate through each character $c$ in the string $s$:
   - Convert $c$ to lowercase: $c \leftarrow \text{tolower}(c)$.
   - Check if $c$ is present in the vowel set.
   - If not in the vowel set, append `'.'` and $c$ to `result`.
4. Return `result`.
5. Complexity:
   - Time Complexity: $O(n)$, where $n$ is the length of $s$. Each character undergoes constant-time operations.
   - Space Complexity: $O(n)$, since the output string has length at most $2n$.

## Code walkthrough
- `string r;`: Buffer to hold the transformed string.
- `for (char c : s)`: Iterate through the characters of input string $s$.
- `c = (char)tolower((unsigned char)c);`: Safely convert character to lowercase.
- `if (string("aoyeui").find(c) != string::npos) continue;`: Skip if the lowercase letter is any of the six specified vowels.
- `r += '.'; r += c;`: Append period prefix and the lowercase consonant.
- `return r;`: Return the constructed string.

## Test it out loud
- Test 1: `s = "aeiouy"` $\to$ all letters match vowels $\to$ returns `""`. Correct.
- Test 2: `s = "b"` $\to$ lowercase `'b'`, not vowel $\to$ returns `".b"`. Correct.
- Test 3: `s = "B"` $\to$ lowercased to `'b'` $\to$ returns `".b"`. Correct.
- Test 4: `s = "AbEcIdOfUgY"` $\to$ preserves consonants b, c, d, f, g $\to$ returns `".b.c.d.f.g"`. Correct.

## Follow-ups
- Why is 'y' included as a vowel?
  The problem definition explicitly lists 'y' alongside 'a', 'o', 'e', 'u', 'i'. Following exact problem specifications rather than default linguistic rules is essential.
- How would you optimize allocations in memory-constrained environments?
  Pre-allocate capacity up to $2n$ using `reserve(2 * s.size())` or use an array of bytes.

## Common mistakes
- Forgetting that `'y'` and `'Y'` are treated as vowels in this specific problem.
- Not lowercasing before checking vowels, or forgetting to lowercase uppercase consonants in the output.
- Modifying string indices during iteration, which can cause skipped characters or buffer errors.
