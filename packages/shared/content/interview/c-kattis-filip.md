---
id: c-kattis-filip
pattern: cses-kattis
difficulty: easy
optimal: "O(1) time and O(1) space"
brute: same
reviewed: false
---

## Clarify first
- What are the inputs? Two 3-digit positive integers `A` and `B` with no zeros.
- How does Filip read numbers? He reads them backwards (i.e. reversed digit order). For example, 734 is read as 437.
- What should be output? Compare the reversed numbers and print the larger one.
- What are the constraints? `A` and `B` are 3-digit integers, and `A != B`. No digit is equal to 0.

## Examples to say out loud
- Input: `734 893`
  - Reversed `A`: 437
  - Reversed `B`: 398
  - Since `437 > 398`, output `437`.
- Input: `221 231`
  - Reversed `A`: 122
  - Reversed `B`: 132
  - Since `132 > 122`, output `132`.

## Brute force
We can read `A` and `B` as strings, reverse the character sequences using `std::reverse`, convert them back to integers (or compare lexicographically since both lengths are 3), and print the larger string. For 3-digit strings, this is O(1) time and trivial to implement.

## The key observation
We can reverse a 3-digit number mathematically:
`rev(x) = (x % 10) * 100 + ((x / 10) % 10) * 10 + (x / 100)`.
Then simply return `max(rev(A), rev(B))`. Alternatively, reverse both strings and print the maximum.

## Optimal approach
1. Read `A` and `B` either as strings or integers.
2. If read as strings:
   - Reverse string `A` and reverse string `B`.
   - Output `max(A, B)`.
3. If read as integers:
   - Compute reversed values using modulo and division.
   - Output `max(revA, revB)`.

Complexity:
- Time complexity: O(1) as inputs are strictly 3 digits long.
- Space complexity: O(1) auxiliary space.

## Code walkthrough
- `string a, b; cin >> a >> b;`: Reads both 3-digit representations.
- `reverse(a.begin(), a.end()); reverse(b.begin(), b.end());`: Reverses digit order in place.
- `cout << max(a, b) << "\n"`: Lexicographical comparison for identical-length numeric strings matches numeric comparison.

## Test it out loud
- `734, 893`: `a` becomes `"437"`, `b` becomes `"398"`. `max` is `"437"`. Correct.
- `221, 231`: `a` becomes `"122"`, `b` becomes `"132"`. `max` is `"132"`. Correct.

## Follow-ups
- How to reverse numbers of arbitrary length without string allocations? Use arithmetic digit extraction:
  `int rev = 0; while (x > 0) { rev = rev * 10 + x % 10; x /= 10; }`.

## Common mistakes
- Outputting the original number instead of its reversed representation.
- Inverting the comparison and printing the minimum instead of the maximum.
