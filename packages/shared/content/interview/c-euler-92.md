---
id: c-euler-92
pattern: cses-euler
difficulty: medium
optimal: "O(limit) time, O(1) space"
brute: same
reviewed: false
---

## Clarify first
- What is a square digit chain? Starting with a positive integer, replace the number with the sum of the squares of its decimal digits, and repeat this replacement iteratively.
- What are the cycle endpoints? Every starting number eventually falls into a periodic cycle containing either 1 (the happy number cycle $1 \to 1$) or 89 ($89 \to 145 \to 42 \to 20 \to 4 \to 16 \to 37 \to 58 \to 89$).
- What are we counting? The total count of starting numbers strictly between 1 and $\text{limit} - 1$ ($1 \le n < \text{limit}$) whose chain arrives at 89.
- What are the constraints on `limit`? $2 \le \text{limit} \le 100,000,000$.
- Can we memoize the chain endpoints? Yes, after just one step, any number $< 10^8$ has a sum of squared digits of at most $8 \times 9^2 = 648$. Thus, precomputing the outcome for values up to 800 allows $O(1)$ classification for every number.

## Examples to say out loud
- Consider $n = 44$.
  $4^2 + 4^2 = 16 + 16 = 32$.
  $3^2 + 2^2 = 9 + 4 = 13$.
  $1^2 + 3^2 = 1 + 9 = 10$.
  $1^2 + 0^2 = 1$.
  Chain arrives at 1 $\to$ not counted.
- Consider $n = 85$.
  $8^2 + 5^2 = 64 + 25 = 89$.
  Chain arrives at 89 $\to$ counted.
- Consider `limit = 10`.
  The numbers are $1 \dots 9$:
  1 (ends at 1), 2 (ends at 89), 3 (ends at 89), 4 (ends at 89), 5 (ends at 89), 6 (ends at 89), 7 (ends at 1: $7 \to 49 \to 97 \to 130 \to 10 \to 1$), 8 (ends at 89), 9 (ends at 89).
  Count reaching 89 is 7.

## Brute force
A naive approach would follow the digit square chain step-by-step for every single number from 1 to $\text{limit} - 1$. For $\text{limit} = 10^8$, computing repeated divisions and modulo operations for 100 million numbers takes 10+ seconds and times out. Instead, we can precompute outcomes for small numbers and split 8-digit numbers into two 4-digit lookups.

## The key observation
1. For any number $n < 10^8$, $n$ has at most 8 digits. The maximum possible sum of squares of digits is $8 \times 9^2 = 648$.
2. We can precompute whether each value $v \in [1, 799]$ terminates at 89 in a small boolean table `to89[800]`.
3. To compute the digit square sum of $n \in [1, 10^8 - 1]$ in $O(1)$ time without costly division loops:
   Precompute table `t[10000]` storing the sum of digit squares for all numbers from 0 to 9999.
   Any number $n < 10^8$ can be split into two 4-digit halves: $n / 10000$ and $n \% 10000$.
   The digit square sum of $n$ is simply `t[n / 10000] + t[n % 10000]`.
4. Then check `to89[t[n / 10000] + t[n % 10000]]` in $O(1)$ CPU cycles per number.

## Optimal approach
1. Allocate table `t[10000]` initialized to 0. For $i$ from 1 to 9999, set `t[i] = t[i / 10] + (i % 10)^2`.
2. Allocate boolean table `to89[800]`.
3. For $v$ from 1 to 799:
   - Trace chain: while $x \ne 1$ and $x \ne 89$, replace $x$ by its digit square sum.
   - Set `to89[v] = (x == 89)`.
4. Initialize `count = 0`.
5. Loop $n$ from 1 to $\text{limit} - 1$:
   - Compute `s = t[n / 10000] + t[n % 10000]`.
   - If `to89[s]`, increment `count++`.
6. Return `count`.
7. Complexity:
   - Time Complexity: $O(\text{limit})$. For $\text{limit} = 10^8$, performing two array lookups and one addition per number takes $\approx 150$ milliseconds in C++.
   - Space Complexity: $O(1)$ auxiliary space (tables of size 10,000 and 800 consume negligible memory).

## Code walkthrough
- `vector<int> t(10000, 0);`: Precomputed digit square sums for 4-digit numbers.
- `for (int i = 1; i < 10000; i++) t[i] = t[i / 10] + (i % 10) * (i % 10);`: DP populating the 4-digit lookup table.
- `vector<char> to89(800, 0);`: Classification table for small sums $\le 648$.
- `int s = t[n / 10000] + t[n % 10000];`: Instantaneous $O(1)$ calculation of digit square sum.
- `if (to89[s]) count++;`: Increment count if the resulting sum reaches 89.

## Test it out loud
- Test 1: `limit = 2` $\to$ range $[1, 1]$, 1 ends at $1 \to$ returns 0.
- Test 2: `limit = 10` $\to$ numbers 1 to 9, seven numbers end at $89 \to$ returns 7.
- Test 3: `limit = 90` $\to$ returns 73.
- Test 4: `limit = 100` $\to$ returns 80.
- Test 5: `limit = 1000` $\to$ returns 857.

## Follow-ups
- How would you solve this if `limit` was $10^{18}$?
  When $\text{limit} = 10^{18}$, looping is impossible ($10^{18}$ operations). We would use Digit DP: `dp(index, tight, sum_of_squares)`, where the maximum sum of squares for 18 digits is $18 \times 81 = 1458$. The state space is $18 \times 2 \times 1458 \approx 52,000$ states, solved in under 5 milliseconds.
- What percentage of numbers end in 89 asymptotically?
  Approximately $85.8\%$ of numbers end in 89.

## Common mistakes
- Running inner `while` loops to calculate digit squares for each $n \in [1, 10^8]$, which incurs heavy division/modulo overhead and times out.
- Sizing `to89` too small (must accommodate up to $8 \times 81 = 648$).
- Off-by-one error: iterating up to $\le \text{limit}$ instead of $< \text{limit}$.
