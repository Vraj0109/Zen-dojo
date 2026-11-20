---
id: c-cf-705a
pattern: cses-codeforces
difficulty: easy
optimal: "O(n) time and O(n) space"
reviewed: false
---

## Clarify first
- What does the problem describe? Hulk expresses feelings that alternate between "I hate" and "I love" across `n` layers.
- What is the structure of the phrase?
  - For layer 1: "I hate"
  - For layer 2: "that I love"
  - For layer 3: "that I hate"
  - At the very end of layer `n`, it finishes with " it". Inner layers are connected by " that ".
- What are the constraints on `n`? `1 <= n <= 100`.
- What should be returned? A single combined string.

## Examples to say out loud
- For `n = 1`: "I hate it".
- For `n = 2`: "I hate that I love it".
- For `n = 3`: "I hate that I love that I hate it".

## Brute force
Since `n <= 100`, generating each segment one by one in a loop and concatenating them produces a string of length roughly 15 * 100 = 1500 characters. There is no complex algorithmic search needed; building the string directly is both straightforward and optimal.

## The key observation
Each layer `i` from 1 to `n`:
- If `i` is odd, the verb is "I hate".
- If `i` is even, the verb is "I love".
- If `i < n`, it is followed by " that ".
- If `i == n`, it is followed by " it".

## Optimal approach
1. Initialize an empty result string or string builder `res`.
2. Iterate `i` from 1 to `n`.
3. If `i > 1`, append `" that "`.
4. If `i % 2 != 0`, append `"I hate"`.
5. Otherwise, append `"I love"`.
6. After finishing all `n` layers, append `" it"`.
7. Return `res`.

Complexity:
- Time complexity: O(n) because each layer appends a constant number of characters, and `n <= 100`.
- Space complexity: O(n) auxiliary space to store the constructed result string.

## Code walkthrough
- `string res = ""`: Holds the generated output phrase.
- `for (int i = 1; i <= n; i++)`: Iterates through the 1-based layer index.
- `if (i % 2 == 1) res += "I hate"; else res += "I love";`: Alternates the feeling according to parity.
- `if (i == n) res += " it"; else res += " that ";`: Appends either the continuation conjunction or the final terminator.
- `return res`: Returns the complete phrase.

## Test it out loud
- `n = 1`: `i = 1` -> appends "I hate", since `i == n` appends " it" -> "I hate it". Correct.
- `n = 2`: `i = 1` -> "I hate that ", `i = 2` -> "I love it" -> "I hate that I love it". Correct.
- `n = 3`: `i = 1` -> "I hate that ", `i = 2` -> "I love that ", `i = 3` -> "I hate it" -> "I hate that I love that I hate it". Correct.

## Follow-ups
- How to avoid repeated memory allocations in languages with immutable strings like Java or Python? Use `StringBuilder` in Java or `' that '.join(...) + ' it'` in Python.

## Common mistakes
- Misplacing the space between "that" and "I".
- Inverting odd and even indices, causing "I love" to appear first.
