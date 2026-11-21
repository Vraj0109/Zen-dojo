---
id: c-cf-282a
pattern: cses-codeforces
difficulty: easy
optimal: "O(n) time, O(1) space"
brute: same
reviewed: false
---

## Clarify first
- What is the initial state? The single integer variable $x$ starts at value 0.
- What operations exist in Bit++?
  - Increment operations: `"++X"` and `"X++"`, which both increment $x$ by 1 ($x \leftarrow x + 1$).
  - Decrement operations: `"--X"` and `"X--"`, which both decrement $x$ by 1 ($x \leftarrow x - 1$).
- Does prefix versus postfix matter? No, every statement executes as an isolated statement, so `"++X"` and `"X++"` have identical effects.
- What are the constraints? The number of statements $n$ is between 1 and 150.
- What should be returned? The final integer value of $x$.

## Examples to say out loud
- Consider `statements = ["++X", "X++", "--X"]`.
  - Initial: $x = 0$.
  - After `"++X"`: $x = 1$.
  - After `"X++"`: $x = 2$.
  - After `"--X"`: $x = 1$.
  Result: 1.
- Consider `statements = ["--X", "X--"]`.
  - Initial: $x = 0$.
  - Two decrements: $x = -2$.
  Result: -2.

## Brute force
Because every statement must be executed in order, simulating the execution statement by statement is already the minimal necessary work. There is no simpler brute force; we inspect each statement string and update $x$.

## The key observation
Notice the characters inside the four possible statements:
- `"++X"` and `"X++"` both contain the `'+'` character.
- `"--X"` and `"X--"` both contain the `'-'` character.
We do not need to check full string equality against four patterns. Checking whether the statement string contains `'+'` (or simply inspecting the middle character `s[1] == '+'`) uniquely distinguishes an increment from a decrement in $O(1)$ operations per statement.

## Optimal approach
1. Initialize an accumulator variable `x = 0`.
2. Iterate through each statement string $s$ in the array `statements`:
   - If $s$ contains `'+'` (or $s[1] == '+'$), increment $x \leftarrow x + 1$.
   - Otherwise, decrement $x \leftarrow x - 1$.
3. Return `x`.
4. Complexity:
   - Time Complexity: $O(n)$, where $n$ is the number of statements (at most 150). Each statement of length 3 is inspected in $O(1)$ time.
   - Space Complexity: $O(1)$, using only a single integer variable.

## Code walkthrough
- `int x = 0;`: Initialize the Bit++ program variable to 0.
- `for (const string& s : statements)`: Loop through each instruction in execution order.
- `if (s.find('+') != string::npos) x++; else x--;`: Add 1 if the instruction contains `'+'`, subtract 1 otherwise.
- `return x;`: Return the final evaluated value.

## Test it out loud
- Test 1: `["++X"]` $\to x = 0 + 1 = 1$.
- Test 2: `["X++"]` $\to x = 0 + 1 = 1$.
- Test 3: `["--X"]` $\to x = 0 - 1 = -1$.
- Test 4: `["X--"]` $\to x = 0 - 1 = -1$.
- Test 5: `["++X", "++X", "++X"]` $\to x = 3$.

## Follow-ups
- Can we write this in a branchless way?
  Yes, using character arithmetic on the middle character: $x += (s[1] == '+') ? 1 : -1$, or $x += 44 - s[1]$ (since ASCII '+' is 43 and '-' is 45, $44 - 43 = +1$ and $44 - 45 = -1$).
- What if the language supported other arithmetic operators like multiplication or division?
  Parse the operator and operand tokens and maintain the state machine appropriately.

## Common mistakes
- Differentiating between prefix and postfix increments (thinking `"X++"` and `"++X"` behave differently in standalone statements).
- Case sensitivity: the problem guarantees uppercase `'X'`, but checking for `'+'` avoids any dependency on variable letter casing.
