---
id: c-kattis-isithalloween
pattern: cses-kattis
difficulty: easy
optimal: "O(1) time and O(1) space"
reviewed: false
---

## Clarify first
- What does the input consist of? A date given as a string for the month (three uppercase letters, e.g. "OCT" or "DEC") followed by an integer day `d` (1 to 31).
- What is the Halloween rule according to the problem? Halloween is celebrated on October 31 ("OCT 31"), or by computer programmers who confuse OCT 31 with DEC 25 ("DEC 25" because octal 31 equals decimal 25).
- What should be output? Print `"yup"` if the date is October 31 or December 25, otherwise print `"nope"`.
- What are the constraints? Month is a valid 3-letter abbreviation, and `d` is between 1 and 31.

## Examples to say out loud
- Input: `"OCT 31"` -> Matches October 31 -> output `"yup"`.
- Input: `"DEC 25"` -> Matches December 25 -> output `"yup"`.
- Input: `"OCT 25"` -> Does not match -> output `"nope"`.
- Input: `"JUL 4"` -> Does not match -> output `"nope"`.

## Brute force
This is a straightforward equality check against two specific string and integer constants. There is no search, recursion, or loops involved. A conditional check runs in O(1) time.

## The key observation
We check whether `(month == "OCT" && day == 31) || (month == "DEC" && day == 25)`. If either condition is true, output `"yup"`, otherwise output `"nope"`.

## Optimal approach
1. Read the month string `m` and the integer `d`.
2. Evaluate:
   - If `(m == "OCT" && d == 31) || (m == "DEC" && d == 25)`, print `"yup"`.
   - Otherwise, print `"nope"`.

Complexity:
- Time complexity: O(1) as string comparison takes constant time for a 3-character string.
- Space complexity: O(1) auxiliary space.

## Code walkthrough
- `string m; int d; cin >> m >> d;`: Reads the month code and day.
- `if ((m == "OCT" && d == 31) || (m == "DEC" && d == 25)) cout << "yup\n";`: Tests the two target dates.
- `else cout << "nope\n";`: Rejects all other dates.

## Test it out loud
- `"OCT 31"`: First clause matches, outputs `"yup"`. Correct.
- `"DEC 25"`: Second clause matches, outputs `"yup"`. Correct.
- `"JAN 1"`: Neither clause matches, outputs `"nope"`. Correct.

## Follow-ups
- Why does the joke work in computer science? In base 8 (octal), `3 * 8^1 + 1 * 8^0 = 24 + 1 = 25` in base 10 (decimal). Thus 31 Oct == 25 Dec.

## Common mistakes
- Case sensitivity: entering lowercase "oct" instead of uppercase "OCT".
- Misspelling `"yup"` or `"nope"` (e.g. outputting "YES" or "NO").
