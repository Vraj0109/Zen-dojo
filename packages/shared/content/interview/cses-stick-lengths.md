---
id: cses-stick-lengths
pattern: cses-sorting-and-searching
difficulty: medium
optimal: "O(n \log n) time and O(1) space"
reviewed: false
---

## Clarify first
- What operation is performed on the sticks? Each stick can be lengthened or shortened to target length $m$.
- What is the cost model? Changing stick length from $a$ to $m$ costs $|a - m|$.
- What is the goal? Choose a single integer length $m$ that minimizes the total cost $\sum_{i=1}^n |a_i - m|$.
- Can the total cost exceed 32 bits? Yes, with $n = 200000$ and values up to $10^9$, total cost can reach $2 \times 10^{14}$, requiring 64-bit integers (`long long`).
- What are the constraints? $1 \le n \le 200000$ and $1 \le a_i \le 10^9$.

## Examples to say out loud
- Consider `lengths = [2, 3, 1, 5, 2]`:
  - Sort lengths: `[1, 2, 2, 3, 5]`.
  - Median element at index $\lfloor 5 / 2 \rfloor = 2$ is 2.
  - Cost for each stick to become 2:
    - $|1 - 2| = 1$
    - $|2 - 2| = 0$
    - $|2 - 2| = 0$
    - $|3 - 2| = 1$
    - $|5 - 2| = 3$
    - Total cost = $1 + 0 + 0 + 1 + 3 = 5$.
- Edge case: identical sticks `[10, 10, 10]` $\implies$ median is 10, cost = 0.
- Single stick `[7]` $\implies$ cost = 0.

## Brute force
A brute-force search would test every integer $m$ between $\min(a_i)$ and $\max(a_i)$. Since values can reach $10^9$, searching all candidates takes $O(n \times \max(a_i)) \approx 2 \times 10^{14}$ operations, which is completely intractable. Testing only the numbers present in the array would take $O(n^2)$ time ($4 \times 10^{10}$ operations), also resulting in TLE. Mathematical optimization identifies the exact target in $O(n \log n)$ time.

## The key observation
We want to minimize the convex objective function:
$$f(m) = \sum_{i=1}^n |a_i - m|$$
This is the classic geometric median problem in one dimension ($L_1$ norm minimization). The derivative (or subgradient) of $|a_i - m|$ is $-1$ when $m < a_i$ and $+1$ when $m > a_i$. Thus:
$$f'(m) = (\text{number of elements } < m) - (\text{number of elements } > m)$$
The sum of slopes is 0 precisely when the number of elements below $m$ equals the number of elements above $m$. Therefore, $f(m)$ is globally minimized when $m$ is the **median** of the array.

## Optimal approach
1. Sort the `lengths` array in ascending order.
2. Select the median element: `median = lengths[n / 2]`.
3. Initialize a 64-bit integer `total = 0`.
4. Iterate through each stick length $x$ in `lengths` and add $|x - \text{median}|$ to `total`.
5. Return `total`.

Complexity:
- Time: $O(n \log n)$ for sorting, followed by an $O(n)$ linear summation pass. (Can be $O(n)$ average using `std::nth_element`).
- Space: $O(1)$ auxiliary space beyond the sorting stack.

## Code walkthrough
- `sort(lengths.begin(), lengths.end())`: Arranges sticks in non-decreasing order.
- `int median = lengths[lengths.size() / 2]`: Finds the median element. For even $n$, any value between index $n/2 - 1$ and $n/2$ gives the identical minimal total cost.
- `total += std::abs((long long)x - median)`: Computes the absolute difference using 64-bit integers to prevent overflow.
- `return total`: Returns the minimal accumulated deviation.

## Test it out loud
- Test case $1$: `[1, 100]`. Median at index $2/2 = 1$ is 100. Cost = $|1 - 100| + |100 - 100| = 99$. (Note choosing 1 also gives $|1 - 1| + |100 - 1| = 99$).
- Test case $2$: `[1, 2, 3, 4, 5]`. Median = 3. Cost = $2 + 1 + 0 + 1 + 2 = 6$.
- Test case $3$: `[1000000000, 1, 1000000000]`. Sorted: `[1, 10^9, 10^9]`. Median = $10^9$. Cost = $10^9 - 1 = 999999999$.

## Follow-ups
- How to achieve $O(n)$ time? Use `std::nth_element` (Quickselect) to locate the median in $O(n)$ average time without fully sorting the array.
- What if changing stick length cost $(a - m)^2$ instead of $|a - m|$? The sum of squared differences $\sum (a_i - m)^2$ is minimized by the **mean** (average), rounded to the nearest integer.

## Common mistakes
- Using the mean instead of the median: The mean minimizes squared distances ($\sum (a_i - m)^2$), not absolute distances ($\sum |a_i - m|$).
- 32-bit integer overflow: The sum of absolute differences can easily exceed $2 \times 10^9$. Not using 64-bit integers (`long long`) causes silent numerical overflow.

## Further reading
- [Median and Geometric Median on Wikipedia](https://en.wikipedia.org/wiki/Geometric_median)
