---
id: c-euler-20
pattern: cses-euler
difficulty: medium
optimal: "O(n * D) time, O(D) space"
reviewed: false
---

## Clarify first
- What is being computed? The factorial $n! = 1 \times 2 \times \cdots \times n$, and the sum of its decimal digits.
- What is $0!$? By mathematical definition, $0! = 1$, whose digit sum is 1.
- What is the range of $n$? $0 \le n \le 3000$.
- Why can't we use standard integer types? For $n = 1000$, $1000!$ has over 2,500 decimal digits; for $n = 3000$, $3000!$ has over 9,000 digits. Standard 64-bit integer types overflow beyond $n = 20$.
- How should the big integer be represented? As an array of digits (base 10) or base $10^9$ chunks (limbs) to perform arbitrary-precision arithmetic.

## Examples to say out loud
- Consider $n = 5$.
  $5! = 120$.
  Digits are 1, 2, 0.
  Sum of digits: $1 + 2 + 0 = 3$.
- Consider $n = 0$.
  $0! = 1$.
  Sum of digits: 1.
- Consider $n = 9$.
  $9! = 362880$.
  Sum: $3 + 6 + 2 + 8 + 8 + 0 = 27$.

## Brute force
Attempting to calculate $n!$ using primitive integer or floating-point types fails immediately due to overflow or precision truncation. A standard arbitrary-precision implementation with a vector of base-10 digits where each digit is multiplied by $k$ ($2 \le k \le n$) takes $O(n \times D_{\text{dec}})$ steps. While acceptable, grouping digits into base $10^9$ limbs accelerates the multiplication by nearly a factor of 9.

## The key observation
We represent the large number in base $B = 10^9$. Each limb stores an integer in $[0, 10^9 - 1]$.
When multiplying the big integer by a scalar $k \le 3000$:
The product of a limb and $k$ plus incoming carry is at most:
$(10^9 - 1) \times 3000 + \text{carry} < 3 \times 10^{12} + 3000$.
This comfortably fits in a standard 64-bit signed integer (`long long`, which holds up to $\approx 9 \times 10^{18}$).
After multiplying all numbers $2 \le k \le n$, we extract and sum the individual decimal digits of each base $10^9$ limb.

## Optimal approach
1. Set base $B = 10^9$.
2. Initialize a dynamic array `a` with a single limb `[1]`.
3. Loop multiplier $k$ from $2$ to $n$:
   - Initialize `carry = 0`.
   - For each limb $x$ in `a`:
     - Compute `cur = x * k + carry`.
     - Update limb `x = cur % B`.
     - Update `carry = cur / B`.
   - While `carry > 0`:
     - Append `carry % B` to `a`.
     - Update `carry /= B`.
4. Initialize `digit_sum = 0`.
5. For each limb $x$ in `a`:
   - While $x > 0$: add $x \% 10$ to `digit_sum`, then $x /= 10$.
6. Return `digit_sum`.
7. Complexity:
   - Time Complexity: $O(n \cdot D)$, where $D \approx \frac{n \log_{10}(n/e)}{9} \approx 1000$ limbs for $n = 3000$. Total operations $\approx 3 \times 10^6$, running in under 20 milliseconds.
   - Space Complexity: $O(D)$ auxiliary space to store the limbs.

## Code walkthrough
- `const long long B = 1000000000LL;`: Base $10^9$ allows grouping 9 decimal digits per limb.
- `vector<long long> a{1};`: Initialize big integer representing $1$.
- `for (int k = 2; k <= n; k++)`: Multiply sequentially by each integer up to $n$.
- `long long cur = x * k + carry; x = cur % B; carry = cur / B;`: Standard column multiplication with carry.
- `while (carry) { a.push_back(carry % B); carry /= B; }`: Propagate lingering overflow limbs.
- `for (long long x : a) while (x) { sum += x % 10; x /= 10; }`: Unpack limbs into decimal digits and accumulate their sum.

## Test it out loud
- Test 1: $n = 0 \to a = [1] \to$ digit sum = 1.
- Test 2: $n = 1 \to a = [1] \to$ digit sum = 1.
- Test 3: $n = 5 \to a = [120] \to 1 + 2 + 0 = 3$.
- Test 4: $n = 9 \to a = [362880] \to 3+6+2+8+8+0 = 27$.
- Test 5: $n = 12 \to 12! = 479001600 \to 4+7+9+0+0+1+6+0+0 = 27$.

## Follow-ups
- Why choose base $10^9$ instead of base $10$?
  Base $10^9$ reduces the number of vector elements by a factor of 9, reducing memory footprint and loop iterations 9-fold while preventing 64-bit overflow since $(10^9) \times 3000 \ll 2^{63}-1$.
- What if $n$ is very large (e.g. $n = 100,000$)?
  Scalar-by-vector multiplication becomes too slow ($O(n^2)$); we would use divide-and-conquer factorial multiplication combined with the Fast Fourier Transform (FFT / Schönhage–Strassen algorithm) for $O(M(L) \log n)$ time.

## Common mistakes
- Using 32-bit integers for the limb multiplication `cur = x * k + carry`, which overflows 32-bit signed int ($2 \times 10^9$) because $10^9 \times 3000 \approx 3 \times 10^{12}$.
- Forgetting that $0! = 1$ and returning 0.
- Missing inner carry propagation when carry $> B$.
