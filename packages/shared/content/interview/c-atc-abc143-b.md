---
id: c-atc-abc143-b
pattern: cses-atcoder
difficulty: easy
optimal: "O(n) time, O(1) extra space"
reviewed: false
---

## Clarify first
- Are we summing the product of every distinct pair of indices $(i, j)$ with $i < j$? Yes, each unordered pair of elements is counted exactly once.
- Can elements in array `d` be zero or duplicate values? Yes, deliciousness values are non-negative integers up to 100, and duplicates are treated as separate items by their distinct indices.
- How large can $n$ and the deliciousness values be? The length $n$ is up to 50, and values are up to 100.
- Can the total sum exceed standard 32-bit signed integers? With $n \le 50$ and $d[i] \le 100$, the maximum possible sum is around $\binom{50}{2} \times 100^2 \approx 1225 \times 10000 \approx 1.225 \times 10^7$, which safely fits in a 32-bit signed integer.

## Examples to say out loud
- Consider `d = [3, 1, 2]`.
  The pairs are $(3, 1)$, $(3, 2)$, and $(1, 2)$.
  Their products are $3 \times 1 = 3$, $3 \times 2 = 6$, and $1 \times 2 = 2$.
  The total sum of pair products is $3 + 6 + 2 = 11$.
- Consider an edge case with identical elements `d = [0, 0]`.
  There is only one pair $(0, 0)$ giving product $0$. The result is $0$.

## Brute force
A straightforward brute force iterates through all pairs of indices $0 \le i < j < n$ using two nested loops, accumulating $d[i] \times d[j]$ into a running total. For $n \le 50$, there are $\binom{50}{2} = 1225$ iterations, which easily passes within milliseconds. However, we can also compute the answer in a single linear pass using a clean algebraic identity.

## The key observation
Recall the algebraic expansion of the square of a sum:
$(\sum_{i=1}^n d[i])^2 = \sum_{i=1}^n d[i]^2 + 2 \sum_{1 \le i < j \le n} d[i] \cdot d[j]$.
Rearranging terms gives:
$\sum_{1 \le i < j \le n} d[i] \cdot d[j] = \frac{(\sum_{i=1}^n d[i])^2 - \sum_{i=1}^n d[i]^2}{2}$.
Thus, by tracking the sum of elements and the sum of their squares in a single loop, we obtain the exact answer in $O(n)$ time.

## Optimal approach
1. Initialize two variables `sum = 0` and `sum_sq = 0`.
2. Iterate through each deliciousness value $x$ in array `d`:
   - Add $x$ to `sum`.
   - Add $x \times x$ to `sum_sq`.
3. Compute `(sum * sum - sum_sq) / 2` and return the result.
4. Complexity:
   - Time Complexity: $O(n)$, making a single pass over the array of size $n$.
   - Space Complexity: $O(1)$, requiring only two integer accumulators.

## Code walkthrough
- `int sum = 0, squares = 0;`: Maintain running totals for the first and second moments of the elements.
- `for (int x : d) { sum += x; squares += x * x; }`: Process each takoyaki's deliciousness, updating total sum and squared sum.
- `return (sum * sum - squares) / 2;`: Subtract the diagonal elements of the multiplication matrix and divide off symmetry to isolate off-diagonal pair products.

## Test it out loud
- Test 1: `d = [0, 0]` $\to$ `sum = 0`, `squares = 0` $\to$ `(0 - 0) / 2 = 0`. Correct.
- Test 2: `d = [1, 1]` $\to$ `sum = 2`, `squares = 2` $\to$ `(4 - 2) / 2 = 1`. Correct.
- Test 3: `d = [3, 1, 2]` $\to$ `sum = 6`, `squares = 9 + 1 + 4 = 14` $\to$ `(36 - 14) / 2 = 11`. Correct.
- Test 4: `d = [100, 100]` $\to$ `sum = 200`, `squares = 20000` $\to$ `(40000 - 20000) / 2 = 10000`. Correct.

## Follow-ups
- How would you handle stream inputs where numbers arrive one at a time?
  Maintain running `sum` and running `pair_sum`. Whenever a new element $x$ arrives, add $x \times \text{sum}$ to `pair_sum`, then add $x$ to `sum`. This updates in $O(1)$ per element without requiring division.
- What if the sum can overflow 32-bit integers?
  Use 64-bit integer accumulators (`long long` in C++, `long` in Java) before division.

## Common mistakes
- Off-by-one errors in nested loops if choosing the brute force approach (e.g. iterating $j$ from $0$ instead of $i + 1$, which double counts pairs and includes self-pairs).
- Integer overflow if deliciousness values or $n$ are significantly larger (not an issue for $n \le 50$, but good practice to consider for larger limits).
- Forgetting integer division precedence when writing `sum * sum - squares / 2` without parentheses around the numerator.
