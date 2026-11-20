---
id: c-euler-16
pattern: cses-euler
difficulty: medium
optimal: "O(exponent * exponent / 30) time, O(exponent) space"
reviewed: false
---

## Clarify first

- What is the range of `exponent`? (`0 <= exponent <= 50000`).
- What is the value when `exponent = 0`? ($2^0 = 1$, which has a single digit 1, so the digit sum is 1).
- How large can $2^{\text{exponent}}$ become? (For $\text{exponent} = 50,000$, the number has approximately $50,000 \times \log_{10}(2) \approx 15,052$ decimal digits, which far exceeds 64-bit integer limits).
- What should be returned? (The sum of all decimal digits in base 10).
- Can arbitrary precision libraries like `BigInteger` be assumed, or should we design the multi-precision arithmetic directly? (In an interview, implementing multi-limb big-integer doubling directly demonstrates algorithmic and systems understanding).

## Examples to say out loud

- Base case: `exponent = 0`. $2^0 = 1$. The sum of digits is 1.
- Small case: `exponent = 4`. $2^4 = 16$. Digits are 1 and 6; sum is $1 + 6 = 7$.
- Medium case: `exponent = 10`. $2^{10} = 1024$. Digit sum is $1 + 0 + 2 + 4 = 7$.
- Stated example: `exponent = 15`. $2^{15} = 32768$. Digit sum is $3 + 2 + 7 + 6 + 8 = 26$.

## Brute force

A direct computation using fixed-width primitives like 64-bit integers overflows when $\text{exponent} \ge 63$. A naive arbitrary-precision approach represents the big number as an array of individual base-10 digits. Doubling the number takes one loop over all digits with carry. For $\text{exponent} = 50,000$, the array grows to 15,052 elements, and performing 50,000 passes of single-digit multiplication requires $\approx 50,000 \times 15,052 / 2 \approx 3.7 \times 10^8$ operations. While feasible, it is slower than necessary.

## The key observation

Instead of base 10, we can group digits into larger limbs using base $10^9$ (or $10^8$). Because multiplying a limb by 2 produces at most $2 \times 10^9 - 2$, the result fits easily into a standard 64-bit integer (`long long`). This reduces the number of limbs by a factor of 9, making array iterations 9 times faster. After performing all doublings, we extract and sum the base-10 digits of each limb.

## Optimal approach

1. Define `BASE = 1,000,000,000` ($10^9$).
2. Initialize an array/vector `limbs = [1]` representing the number 1.
3. Repeat `exponent` times:
   a. Initialize `carry = 0`.
   b. For each limb `x` from index 0 to `limbs.size() - 1`:
      - Compute `v = x * 2 + carry`.
      - Update `x = v % BASE`.
      - Update `carry = v / BASE`.
   c. If `carry > 0`, append `carry` to `limbs`.
4. Initialize `sum = 0`.
5. For each limb `x` in `limbs`:
   - While `x > 0`: add `x % 10` to `sum`, and divide `x /= 10`.
6. Return `sum`.

Complexity:
- Time: `O(exponent * exponent / 30)` because there are $\text{exponent}$ doubling steps, and the average number of base-$10^9$ limbs is $\frac{\text{exponent} \times \log_{10}(2)}{2 \times 9} \approx \frac{\text{exponent}}{60}$. Total limb operations are roughly $\frac{50000^2}{60} \approx 4 \times 10^7$, taking about 60 ms.
- Space: `O(exponent)` auxiliary space to store $\approx 1,673$ limbs of 64-bit integers.

## Code walkthrough

In the reference implementation:
- `const long long BASE = 1000000000;`: packs 9 decimal digits per element to maximize CPU register utilization.
- `vector<long long> limbs = {1};`: starts with $2^0 = 1$.
- `for (int step = 0; step < exponent; step++)`: executes the doubling process iteratively.
- `long long v = x * 2 + carry; x = v % BASE; carry = v / BASE;`: performs schoolbook multiplication with carry in base $10^9$.
- `if (carry) limbs.push_back(carry);`: dynamically expands the array as powers grow.
- `while (x) { sum += x % 10; x /= 10; }`: decomposes each limb into its constituent base-10 digits at the end.

## Test it out loud

- `exponent = 0`:
  - `limbs = {1}`. Outer loop runs 0 times.
  - Final sum extracts digits of 1: `sum = 1`. Returns 1.
- `exponent = 1`:
  - 1 doubling: `v = 1 * 2 + 0 = 2`. `limbs = {2}`.
  - Digit sum: 2. Returns 2.
- `exponent = 4`:
  - Successive doublings: {1} $\to$ {2} $\to$ {4} $\to$ {8} $\to$ {16}.
  - Final digits of 16: $6 + 1 = 7$. Returns 7.

## Follow-ups

- Can we compute $2^{\text{exponent}}$ faster using binary exponentiation?
  Yes, using big-integer squaring and multiplication (Karatsuba or FFT), $2^{\text{exponent}}$ can be computed via repeated squaring in $O(M(D) \log \text{exponent})$ time where $D \approx 15,000$. However, repeatedly shifting or doubling is already fast enough for this constraint.
- What if we needed to compute $a^b$ for general $a$?
  Base-$10^9$ limb multiplication scales directly by multiplying each limb by $a$, provided $a \times \text{BASE} < 2^{63} - 1$.

## Common mistakes

- Trying to compute `pow(2, exponent)` using floating-point types (`double`), which loses all precision past 53 bits ($2^{53} \approx 9 \times 10^{15}$).
- In Python, exceeding the default string digit conversion limit (`sys.set_int_max_str_digits`) introduced in newer Python versions for large integer to string conversions.
- Choosing a base too large for 64-bit integer registers, leading to integer overflow during `x * 2 + carry`. Base $10^9$ safely satisfies $2 \times 10^9 < 2^{63} - 1$.

## Further reading

- Arbitrary-precision arithmetic and limb-based big integer representation.
- Karatsuba multiplication and fast integer exponentiation.
