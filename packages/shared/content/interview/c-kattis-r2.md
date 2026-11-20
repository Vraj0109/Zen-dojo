---
id: c-kattis-r2
pattern: cses-kattis
difficulty: easy
optimal: "O(1) time, O(1) space"
reviewed: false
---

## Clarify first
- What is the relationship between $R_1$, $R_2$, and $S$? $S$ is the arithmetic mean of two numbers $R_1$ and $R_2$: $S = \frac{R_1 + R_2}{2}$.
- Which values are known, and which value must be found? $R_1$ and $S$ are given; we need to find $R_2$.
- What is the range of $R_1$ and $S$? Integers between $-1000$ and $1000$.
- Can $R_2$ be negative? Yes, depending on $R_1$ and $S$, $R_2$ can be negative or positive.

## Examples to say out loud
- Consider $R_1 = 11$ and $S = 15$.
  The formula is $\frac{11 + R_2}{2} = 15$.
  Multiplying both sides by 2 gives $11 + R_2 = 30$.
  Subtracting 11 yields $R_2 = 19$.
  Check: $\frac{11 + 19}{2} = \frac{30}{2} = 15$.
- Consider $R_1 = 4$ and $S = 4$.
  $R_2 = 2 \times 4 - 4 = 4$.
- Consider $R_1 = 1000$ and $S = -1000$.
  $R_2 = 2 \times (-1000) - 1000 = -3000$.

## Brute force
A brute force approach might iterate over potential integer values of $R_2$ in some range and test whether $(R_1 + R_2) / 2 == S$. But linear search is completely unnecessary since a direct algebraic manipulation isolates $R_2$ in a single constant-time arithmetic statement.

## The key observation
Starting with the definition of arithmetic mean:
$\frac{R_1 + R_2}{2} = S$.
Multiply both sides by 2:
$R_1 + R_2 = 2S$.
Subtract $R_1$ from both sides:
$R_2 = 2S - R_1$.
This provides an exact, closed-form expression executable in $O(1)$ operations.

## Optimal approach
1. Compute the product $2 \times S$.
2. Subtract $R_1$ from the product.
3. Return the resulting integer $2S - R_1$.
4. Complexity:
   - Time Complexity: $O(1)$, exactly one multiplication and one subtraction.
   - Space Complexity: $O(1)$, no auxiliary storage required.

## Code walkthrough
- `return 2 * s - r1;`: Directly compute the unknown number by doubling the desired mean and subtracting the known first value.

## Test it out loud
- Test 1: $R_1 = 0, S = 0 \to 2(0) - 0 = 0$.
- Test 2: $R_1 = 1, S = 0 \to 2(0) - 1 = -1$.
- Test 3: $R_1 = -5, S = 5 \to 2(5) - (-5) = 10 + 5 = 15$.
- Test 4: $R_1 = -1000, S = 1000 \to 2(1000) - (-1000) = 3000$.

## Follow-ups
- What if there are $k$ numbers where $k - 1$ are known, with a target mean $S$?
  The mean is $\frac{\sum_{i=1}^k R_i}{k} = S$.
  The unknown value is $R_k = k \cdot S - \sum_{i=1}^{k-1} R_i$.
  Sum the known values and subtract from $k \cdot S$ in $O(k)$ time.
- What if numbers are floating-point values?
  The same formula $2S - R_1$ holds directly for floating-point arithmetic.

## Common mistakes
- Confusing which variable is the mean and which is a number (e.g. computing $2R_1 - S$ instead of $2S - R_1$).
- Using floating-point division when integer operations are exact.
