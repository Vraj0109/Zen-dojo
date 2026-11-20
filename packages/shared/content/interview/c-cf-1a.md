---
id: c-cf-1a
pattern: cses-codeforces
difficulty: easy
optimal: "O(1) time, O(1) space"
reviewed: false
---

## Clarify first

- What are the dimensions of the rectangular square and the flagstones? (The square measures $n \times m$ meters, and each square flagstone has side length $a$ meters).
- Can the flagstones be broken or cut? (No, flagstones cannot be broken; they must be laid as whole $a \times a$ squares).
- Can flagstones extend beyond the boundary of the square? (Yes, stones may stick out past the edges of the $n \times m$ square, provided the entire area is covered).
- Must the edges of the flagstones align with the edges of the square? (Yes, the sides of the flagstones must be parallel to the sides of the square).
- What are the constraints on $n$, $m$, and $a$? ($1 \le n, m, a \le 10^7$).
- Can the required stone count exceed 32-bit signed integers? (Yes, with $n = 10^7, m = 10^7, a = 1$, the answer is $10^{14}$, which requires a 64-bit integer type like `long long` in C++ or `long` in Java).

## Examples to say out loud

- Standard case: `n = 6, m = 6, a = 4`.
  - Along the length $n = 6$, we need $\lceil 6 / 4 \rceil = 2$ stones (covering 8 meters, sticking out by 2 meters).
  - Along the width $m = 6$, we need $\lceil 6 / 4 \rceil = 2$ stones.
  - Total stones required: $2 \times 2 = 4$. Output is 4.
- Single stone case: `n = 1, m = 1, a = 1`. One $1 \times 1$ stone covers a $1 \times 1$ area. Output is 1.
- Huge stone case: `n = 1, m = 1, a = 10000000`. One stone covers the entire area and sticks out. Output is 1.

## Brute force

A simulation that tries placing stones one by one on a grid or subtracting areas does not work because flagstones cannot be split. Trying to divide the total area $(n \times m)$ by the area of a stone $a^2$ is incorrect because leftover space cannot be filled with fragments of stones. The two dimensions are orthogonal and independent.

## The key observation

Because stone sides must be parallel to the boundaries and stones cannot be broken, the placement along the length $n$ and along the width $m$ decouples completely into two independent 1D tiling problems.
To cover a length of $n$ with segments of length $a$, we need $\lceil n / a \rceil$ stones. In integer arithmetic without floating-point errors, $\lceil n / a \rceil = \lfloor (n + a - 1) / a \rfloor$.
Similarly, covering $m$ requires $\lfloor (m + a - 1) / a \rfloor$ stones.
The total number of stones is the product of the stones needed in both dimensions:
$$\lceil n / a \rceil \times \lceil m / a \rceil$$

## Optimal approach

1. Cast numbers to 64-bit integers to prevent arithmetic overflow.
2. Calculate the number of stones needed along the first dimension:
   `x = (n + (long long)a - 1) / a`.
3. Calculate the number of stones needed along the second dimension:
   `y = (m + (long long)a - 1) / a`.
4. Return the product `x * y`.

Complexity:
- Time: `O(1)` as only basic arithmetic operations are performed.
- Space: `O(1)` auxiliary space for scalar registers.

## Code walkthrough

In the reference implementation:
- `long long x = (n + (long long)a - 1) / a;`: computes $\lceil n / a \rceil$ in integer arithmetic using 64-bit casting.
- `long long y = (m + (long long)a - 1) / a;`: computes $\lceil m / a \rceil$ similarly along the second dimension.
- `return x * y;`: multiplies the stone counts along both dimensions, resulting in up to $10^{14}$.

## Test it out loud

- `n = 1, m = 1, a = 10000000`:
  - $x = (1 + 10^7 - 1) / 10^7 = 1$.
  - $y = 1$. Product is 1. Returns 1.
- `n = 10, m = 10, a = 5`:
  - $x = 10 / 5 = 2$, $y = 10 / 5 = 2$.
  - $x \times y = 4$. Returns 4.
- `n = 7, m = 3, a = 2`:
  - $x = (7 + 1) / 2 = 4$.
  - $y = (3 + 1) / 2 = 2$.
  - Product is $4 \times 2 = 8$. Returns 8.

## Follow-ups

- What if flagstones can be rotated and are rectangular ($a \times b$ instead of $a \times a$)?
  Tiling a rectangle with general $a \times b$ tiles without breaking becomes an NP-hard packing problem in general or requires checking both uniform orientation choices ($\lceil n / a \rceil \lceil m / b \rceil$ vs $\lceil n / b \rceil \lceil m / a \rceil$).
- What if flagstones could be cut and recombined?
  If cutting were allowed, the minimum number of stones would simply be $\lceil (n \times m) / (a \times a) \rceil$.

## Common mistakes

- Computing total area divided by stone area: $\lceil (n \times m) / a^2 \rceil$. For $n = 6, m = 6, a = 4$, $(6 \times 6) / 16 = 36 / 16 = 2.25 \to 3$, but 3 stones cannot physically cover the $6 \times 6$ square without cutting.
- 32-bit integer overflow: for $n = 10^7, m = 10^7, a = 1$, the product is $10^{14} > 2^{31} - 1$, overflowing a 32-bit `int`.
- Using floating point functions like `ceil((double)n / a)`: doubles have precision issues when integers approach $10^7$ or larger.

## Further reading

- Ceiling division trick in integer arithmetic: `(n + d - 1) / d`.
- Tiling problems and discrete geometry.
