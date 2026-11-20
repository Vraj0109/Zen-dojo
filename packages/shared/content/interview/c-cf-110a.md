---
id: c-cf-110a
pattern: cses-codeforces
difficulty: easy
optimal: "O(n) time, O(1) space"
reviewed: false
---

## Clarify first
- What defines a "lucky digit"? Only the digits 4 and 7 are lucky.
- What defines a "lucky number"? A positive integer consisting entirely of lucky digits (e.g. 4, 7, 47, 74, 444).
- What defines a "nearly lucky number"? A number whose count of lucky digits is itself a lucky number.
- How large can the input number $n$ be? Given as a string of up to 18 decimal digits with no leading zeros.
- What if the count of lucky digits is 0? 0 is not a lucky number (lucky numbers contain only 4s and 7s), so the result must be false.

## Examples to say out loud
- Consider $n = \text{"7747774"}$.
  The string contains 7 lucky digits (six 7s and one 4).
  The count is 7.
  Is 7 a lucky number? Yes, its only digit is 7.
  Result: `true`.
- Consider $n = \text{"40047"}$.
  The string contains 3 lucky digits (two 4s and one 7).
  The count is 3.
  Is 3 a lucky number? No, 3 is neither 4 nor 7.
  Result: `false`.
- Edge case: $n = \text{"4"}$.
  Count of lucky digits is 1. Since 1 is not lucky, return `false`.

## Brute force
Because the input is a short string of at most 18 digits, counting occurrences of '4' and '7' takes a single pass. Then, inspecting the digits of the resulting count (which is an integer between 0 and 18) takes $O(1)$ operations. The direct approach is already optimal in $O(n)$ time and $O(1)$ space.

## The key observation
The problem has two distinct phases:
1. Count the occurrences of '4' and '7' in the string $n$. Let this count be $c$.
2. Check whether $c$ is a lucky number: $c > 0$, and every digit in the base-10 representation of $c$ must be either 4 or 7.
Since the string length is at most 18, the only possible lucky counts are 4 and 7 (the next lucky numbers are 44 and 47, which exceed 18). However, writing a general check on the digits of $c$ makes the solution general for arbitrarily long inputs.

## Optimal approach
1. Initialize an integer counter `count = 0`.
2. Iterate through each character $ch$ in string $n$:
   - If $ch == '4'$ or $ch == '7'$, increment `count` by 1.
3. If `count == 0`, return `false`.
4. Check every digit of `count`:
   - While `count > 0`:
     - Extract last digit: `d = count % 10`.
     - If `d != 4` and `d != 7`, return `false`.
     - Update `count /= 10`.
5. Return `true`.
6. Complexity:
   - Time Complexity: $O(n)$, where $n$ is the number of digits in the input string (up to 18). Checking the digits of `count` takes $O(\log_{10} \text{count}) = O(1)$.
   - Space Complexity: $O(1)$, using only scalar integer variables.

## Code walkthrough
- `int c = 0;`: Counter for lucky digits found in string $n$.
- `for (char ch : n) if (ch == '4' || ch == '7') c++;`: Count the number of 4s and 7s.
- `if (c == 0) return false;`: Zero is not a lucky number.
- `while (c > 0) { ... }`: Verify that every decimal digit of count `c` is either 4 or 7.
- `return true;`: If all digits of `c` are lucky, return true.

## Test it out loud
- Test 1: $n = \text{"1"} \to c = 0 \to$ `false`.
- Test 2: $n = \text{"4"} \to c = 1 \to$ digit is 1 (not 4 or 7) $\to$ `false`.
- Test 3: $n = \text{"47"} \to c = 2 \to$ digit is 2 $\to$ `false`.
- Test 4: $n = \text{"4444"} \to c = 4 \to$ digit is 4 $\to$ `true`.
- Test 5: $n = \text{"7747774"} \to c = 7 \to$ digit is 7 $\to$ `true`.

## Follow-ups
- Why is the answer for $n = \text{"4"}$ false?
  Because the question asks whether the *count* of lucky digits is a lucky number, not whether the number itself is lucky. In "4", the count is 1, and 1 is not a lucky number.
- What if the input string can have up to $10^5$ digits?
  The algorithm remains unchanged and runs in $O(n)$ time. The digit check on $c$ still takes at most 5 iterations since $c \le 100,000$.

## Common mistakes
- Confusing the condition: checking if $n$ itself is lucky instead of checking whether the *count* of lucky digits is lucky.
- Treating $c = 0$ as lucky; 0 is not a lucky number.
- Parsing the 18-digit string into a 32-bit integer, which causes integer overflow (18 digits requires 64-bit `unsigned long long` or handling directly as a string).
