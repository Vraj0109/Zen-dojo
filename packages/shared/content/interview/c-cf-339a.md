---
id: c-cf-339a
pattern: cses-codeforces
difficulty: easy
optimal: "O(n) time, O(n) space"
reviewed: false
---

## Clarify first
- What format does the input string have? A valid mathematical sum containing single-digit terms '1', '2', or '3', separated by plus signs `'+'`.
- What is the goal? Rearrange the terms of the sum in non-decreasing order, keeping plus signs between them.
- Can there be numbers other than 1, 2, and 3? No, the problem specifies only terms 1, 2, and 3.
- What if there is only a single number without any plus sign (e.g. `"2"`)? Return the single digit string unchanged.
- What are the length bounds? The string length is between 1 and 100 characters.

## Examples to say out loud
- Consider `s = "3+2+1"`.
  The terms are 3, 2, 1.
  Sorted order: 1, 2, 3.
  Formatted with plus signs: `"1+2+3"`.
- Consider `s = "2"`.
  Only a single term.
  Result: `"2"`.
- Consider `s = "2+3+1+2"`.
  The terms are 2, 3, 1, 2.
  Sorted order: 1, 2, 2, 3.
  Result: `"1+2+2+3"`.

## Brute force
A naive approach extracts all summands into a list of characters, sorts them using comparison sort ($O(n \log n)$), and joins them back with `'+'` characters. Given $n \le 100$, this passes in microseconds. However, because the terms can only be 1, 2, or 3, we can count frequencies in $O(n)$ time using bucket sort / counting sort.

## The key observation
Since the only possible summands are 1, 2, and 3, counting how many 1s, 2s, and 3s appear allows us to reconstruct the sorted expression in a single linear pass without comparison sorting. Either comparison sort or frequency counting runs well within the time limit.

## Optimal approach
1. Iterate over the string `s` and collect the digits (or count frequencies of 1, 2, and 3).
2. Sort the collected digits in non-decreasing order (or iterate counts of 1, then 2, then 3).
3. Initialize a result string builder.
4. For each sorted digit, append `'+'` if it is not the first term, then append the digit.
5. Return the resulting formatted string.
6. Complexity:
   - Time Complexity: $O(n \log n)$ with comparison sort, or $O(n)$ with frequency counting, where $n$ is the length of `s`.
   - Space Complexity: $O(n)$ to store the digits and the reconstructed string.

## Code walkthrough
- `string d; for (char c : s) if (c != '+') d += c;`: Filter out the separator `'+'` and collect the digits into string `d`.
- `sort(d.begin(), d.end());`: Sort the digit characters in ascending order.
- `for (size_t i = 0; i < d.size(); i++)`: Iterate over the sorted digits.
- `if (i) r += '+'; r += d[i];`: Prepend `'+'` before every digit except the first one.
- `return r;`: Return the reordered expression.

## Test it out loud
- Test 1: `s = "1"` $\to$ digits `['1']` $\to$ returns `"1"`.
- Test 2: `s = "1+1"` $\to$ digits `['1', '1']` $\to$ returns `"1+1"`.
- Test 3: `s = "3+1"` $\to$ digits `['3', '1']` $\to$ sorted `['1', '3']` $\to$ returns `"1+3"`.
- Test 4: `s = "3+3+3+3"` $\to$ identical digits $\to$ returns `"3+3+3+3"`.

## Follow-ups
- How would you handle arbitrary multi-digit numbers (e.g. `"100+25+3"`)?
  Split the string on `'+'`, parse tokens into integers, sort the integer array, and join with `'+'`.
- How would you implement this with $O(1)$ extra memory?
  In C++, you can gather the digits at the even indices $0, 2, 4, \dots$, sort them in place, and leave the plus signs at odd indices untouched.

## Common mistakes
- Adding a trailing `'+'` at the very end of the string (e.g. `"1+2+3+"`).
- Splitting strings inefficiently in languages with heavy regex engines for a simple single-character delimiter.
- Forgetting that the input can contain only one number with no plus signs.
