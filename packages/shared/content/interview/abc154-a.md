---
id: abc154-a
pattern: cses-atcoder
difficulty: medium
optimal: "O(1) time, O(1) space"
reviewed: false
---

## Clarify first
- What does the problem describe? There are two distinct labels/strings $s$ and $t$. Initially, there are $a$ balls labeled with word $s$, and $b$ balls labeled with word $t$.
- What event occurs? One ball labeled with word $u$ is discarded. The word $u$ is guaranteed to be equal to either $s$ or $t$.
- What should be returned? A two-element list or vector $[a', b']$ containing the remaining counts of balls with word $s$ and balls with word $t$.
- What are the constraints? $1 \le a, b \le 100$. The strings $s, t, u$ have lengths between 1 and 10 and contain lowercase English letters.
- Are $s$ and $t$ always different? Yes, the problem guarantees that $s \ne t$.

## Examples to say out loud
- Consider `s = "red"`, `t = "blue"`, `a = 3`, `b = 4`, `u = "red"`.
  The discarded ball has word $u = \text{"red"}$, which matches $s$.
  The count of balls with word $s$ decreases by 1: $a' = 3 - 1 = 2$.
  The count of balls with word $t$ remains unchanged: $b' = 4$.
  Result: `[2, 4]`.
- Consider `s = "red"`, `t = "blue"`, `a = 5`, `b = 5`, `u = "blue"`.
  The discarded ball matches $t$, so $b$ decreases by 1 $\to$ result is `[5, 4]`.
- Edge case: `a = 1, b = 1, u = s` $\to$ result is `[0, 1]`.

## Brute force
Because this is a direct conditional subtraction, there is no simpler brute force: comparing the target word $u$ against $s$ and decrementing the corresponding count takes $O(|s|)$ string comparison time, which is $O(1)$ since lengths are at most 10.

## The key observation
Since $u$ is guaranteed to match either $s$ or $t$, and $s \ne t$:
If $u == s$, we decrement $a$ by 1 ($a \leftarrow a - 1$).
Otherwise ($u == t$), we decrement $b$ by 1 ($b \leftarrow b - 1$).
Returning $[a, b]$ yields the final state in $O(1)$ operations.

## Optimal approach
1. Compare string $u$ with string $s$.
2. If $u == s$, decrement $a$ by 1.
3. Otherwise, decrement $b$ by 1.
4. Return the pair/array `[a, b]`.
5. Complexity:
   - Time Complexity: $O(1)$, since string lengths are bounded by 10 characters.
   - Space Complexity: $O(1)$ auxiliary space beyond returning the two-element output.

## Code walkthrough
- `if (u == s) a--; else b--;`: Compare strings; decrement $a$ if $u$ matches $s$, otherwise decrement $b$.
- `return {a, b};`: Return the updated counts as a two-element vector or array.

## Test it out loud
- Test 1: `s = "a", t = "b", a = 1, b = 1, u = "a"` $\to u == s \to a = 0, b = 1 \to [0, 1]$.
- Test 2: `s = "a", t = "b", a = 1, b = 1, u = "b"` $\to u \ne s \to a = 1, b = 0 \to [1, 0]$.
- Test 3: `s = "apple", t = "pear", a = 100, b = 100, u = "pear"` $\to [100, 99]$.
- Test 4: `s = "apple", t = "pear", a = 100, b = 1, u = "apple"` $\to [99, 1]$.

## Follow-ups
- What if there are $K$ different types of labeled balls?
  Store ball counts in a hash map `unordered_map<string, int> counts` or array. When word $u$ is removed, decrement `counts[u]--` in $O(1)$ average time.
- What if multiple balls are removed in sequence?
  Loop through the list of removed balls and decrement the corresponding counts sequentially.

## Common mistakes
- In Java, using reference equality `u == s` instead of string content equality `u.equals(s)`.
- Reversing the order of elements in the output list (e.g. returning $[b, a]$ instead of $[a, b]$).
