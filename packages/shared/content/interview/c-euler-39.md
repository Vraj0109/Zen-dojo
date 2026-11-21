---
id: c-euler-39
pattern: cses-euler
difficulty: medium
optimal: "O(maxP log maxP) time, O(maxP) space"
brute: same
reviewed: false
---

## Clarify first
- What is being counted? The number of distinct right-angled triangles with integer side lengths $(a, b, c)$ whose perimeter is exactly $p = a + b + c \le \text{maxP}$.
- When are two triangles considered identical? Two triangles are identical if their set of sides $\{a, b, c\}$ is the same (i.e. order does not matter: $a \le b < c$).
- What should be returned? The integer perimeter $p \le \text{maxP}$ that maximizes the count of valid triangles.
- How are ties broken? If multiple perimeters achieve the same maximum count, return the smallest perimeter among them.
- What are the bounds on $\text{maxP}$? $12 \le \text{maxP} \le 5,000,000$.

## Examples to say out loud
- For $p = 12$, the only integer right triangle is $(3, 4, 5)$ with $3^2 + 4^2 = 9 + 16 = 25 = 5^2$. Perimeter $3 + 4 + 5 = 12$. Count is 1.
- For $p = 120$, there are 3 solutions:
  - $(20, 48, 52)$
  - $(24, 45, 51)$
  - $(30, 40, 50)$
- For $\text{maxP} = 100$, the perimeter maximizing the count is $p = 60$.

## Brute force
A brute force approach would iterate over all possible perimeters $p \le \text{maxP}$, then loop over side $a$ and side $b$, computing $c = p - a - b$, and checking if $a^2 + b^2 = c^2$. For $\text{maxP} = 5,000,000$, an $O(\text{maxP}^2)$ search involves $1.25 \times 10^{13}$ operations, which is completely unfeasible. We need a way to generate Pythagorean triples directly.

## The key observation
By Euclid's formula, every primitive Pythagorean triple $(a, b, c)$ is uniquely parameterized by two coprime integers $m > n > 0$ of opposite parity:
$a = m^2 - n^2$, $b = 2mn$, $c = m^2 + n^2$.
The perimeter of this primitive triple is:
$q = a + b + c = (m^2 - n^2) + 2mn + (m^2 + n^2) = 2m(m + n)$.
Every right triangle (primitive or non-primitive) is an integer multiple $k \ge 1$ of some unique primitive triple.
Therefore, if a primitive triple has perimeter $q$, it generates a right triangle for every multiple $k \cdot q \le \text{maxP}$.
We can loop over all valid $(m, n)$ pairs, and for each primitive perimeter $q$, increment a count array at all multiples $q, 2q, 3q, \dots \le \text{maxP}$.

## Optimal approach
1. Allocate an integer count array `cnt` of size $\text{maxP} + 1$ initialized to 0.
2. Iterate $m \ge 2$ while the minimum perimeter $2m(m + 1) \le \text{maxP}$:
   - Iterate $n$ from 1 to $m - 1$ while $2m(m + n) \le \text{maxP}$:
     - If $(m - n)$ is even (not opposite parity) or $\gcd(m, n) \ne 1$, continue.
     - Compute primitive perimeter: $q = 2m(m + n)$.
     - Increment multiples: for $k = q, 2q, 3q, \dots \le \text{maxP}$, increment `cnt[k]++`.
3. Find the best perimeter:
   - Initialize `best = 12`.
   - Iterate $p$ from 12 to $\text{maxP}$:
     - If `cnt[p] > cnt[best]`, update `best = p`.
4. Return `best`.
5. Complexity:
   - Time Complexity: $O(\text{maxP} \log \text{maxP})$. Generating primitive triples and sieving multiples takes harmonic series time $\sum \frac{\text{maxP}}{q} = O(\text{maxP} \log \text{maxP})$, running in $\approx 250$ milliseconds for $\text{maxP} = 5 \times 10^6$.
   - Space Complexity: $O(\text{maxP})$ space for the count array.

## Code walkthrough
- `vector<int> cnt(maxP + 1, 0);`: Frequency array for triangle counts per perimeter.
- `if (((m - n) & 1) == 0 || __gcd(m, n) != 1) continue;`: Enforce Euclid's conditions for primitive triples (coprime and opposite parity).
- `long long q = 2 * m * (m + n);`: Perimeter of the primitive triple.
- `for (long long k = q; k <= maxP; k += q) cnt[k]++;`: Distribute to all similar triangles with scaled perimeters.
- `if (cnt[p] > cnt[best]) best = p;`: Track maximum, strictly retaining smaller $p$ on ties.

## Test it out loud
- Test 1: $\text{maxP} = 13 \to$ only $p = 12$ has a triple $\to$ returns 12.
- Test 2: $\text{maxP} = 24 \to$ count for 12 is 1, count for 24 is 1 $\to$ tie goes to smaller $\to$ returns 12.
- Test 3: $\text{maxP} = 100 \to p = 60$ has 2 triples $\to$ returns 60.
- Test 4: $\text{maxP} = 500 \to$ returns 420.

## Follow-ups
- Why must $m - n$ be odd?
  If both $m$ and $n$ were odd, $m^2 - n^2$, $2mn$, and $m^2 + n^2$ would all be even, meaning the triple would not be primitive and would be double-counted under a smaller $m, n$.
- Can perimeters ever be odd?
  No, $a + b + c = 2m(m + n)$ is always even, so odd perimeters never form integer right triangles.

## Common mistakes
- Not checking that $m$ and $n$ have opposite parity, leading to double-counting non-primitive triples.
- Updating `cnt[best]` on $\ge$ instead of $>$, which would violate the tie-breaking rule of returning the smallest $p$.
- Starting search at $p = 1$ or omitting the base perimeter constraint (the smallest right triangle perimeter is 12).
