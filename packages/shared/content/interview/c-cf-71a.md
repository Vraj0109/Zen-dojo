---
id: c-cf-71a
pattern: cses-codeforces
difficulty: easy
optimal: "O(n) time, O(1) extra space"
brute: same
reviewed: false
---

## Clarify first
- When is a word considered "too long"? A word is strictly too long if its length is strictly greater than 10 characters ($> 10$).
- What is the exact abbreviation format? The first character of the word, followed by the integer count of letters strictly between the first and last characters (i.e. $\text{length} - 2$), followed by the last character.
- What if the word has 10 or fewer characters? It must remain completely unchanged.
- What characters appear in the word? Only lowercase English letters, with lengths between 1 and 100.

## Examples to say out loud
- Consider `word = "localization"`.
  The length is 12, which is $> 10$.
  First letter is `'l'`, last letter is `'n'`.
  Count of letters in between is $12 - 2 = 10$.
  Abbreviation: `"l10n"`.
- Consider `word = "word"`.
  Length is 4, which is $\le 10$.
  Word remains unchanged: `"word"`.
- Consider `word = "abcdefghij"`.
  Length is exactly 10 $\to$ returns `"abcdefghij"`.
- Consider `word = "abcdefghijk"`.
  Length is 11 ($> 10$) $\to$ `'a'` + $9$ + `'k'` $\to$ `"a9k"`.

## Brute force
Checking the string length and formatting the output is already minimal work. There is no simpler alternative: we inspect the length property, and if it exceeds 10, format the abbreviation. The complexity is bounded only by reading the string and outputting the short result.

## The key observation
If $|s| \le 10$, return $s$ as-is.
Otherwise, the abbreviation is uniquely determined by three components:
1. $s[0]$
2. $(|s| - 2)$ formatted as a decimal string
3. $s[|s| - 1]$
Because $|s| \le 100$, the number $|s| - 2$ has at most 2 digits, and the abbreviation has length at most 4.

## Optimal approach
1. Inspect the length $n$ of the string `word`.
2. If $n \le 10$, return `word` unchanged.
3. If $n > 10$:
   - Extract first character `word[0]`.
   - Extract last character `word[n - 1]`.
   - Format the middle length $n - 2$ as a decimal string.
   - Concatenate first character, middle count string, and last character.
4. Return the constructed abbreviation.
5. Complexity:
   - Time Complexity: $O(n)$ time to read the string of length $n$ and format the string.
   - Space Complexity: $O(1)$ auxiliary space beyond returning the output string.

## Code walkthrough
- `if (word.size() <= 10) return word;`: Fast-path exit for words that do not meet the length threshold.
- `word.front()`: Retrieve first character $s[0]$.
- `to_string(word.size() - 2)`: Convert the count of omitted middle characters into string representation.
- `word.back()`: Retrieve the final character $s[n - 1]$.
- `return string(1, word.front()) + ...`: Assemble and return the abbreviated result.

## Test it out loud
- Test 1: `word = "a"` $\to$ length 1 $\le 10 \to$ `"a"`.
- Test 2: `word = "abcdefghij"` $\to$ length 10 $\le 10 \to$ `"abcdefghij"`.
- Test 3: `word = "abcdefghijk"` $\to$ length 11 $> 10 \to$ `"a9k"`.
- Test 4: `word = "internationalization"` $\to$ length 20 $> 10 \to$ `"i18n"`.
- Test 5: `word = "pneumonoultramicroscopicsilicovolcanoconiosis"` $\to$ length 45 $\to$ `"p43s"`.

## Follow-ups
- How would you handle a stream of words?
  Read word by word, check `length() > 10`, and print the abbreviated format or the original token directly, keeping $O(1)$ memory per word.
- What if the threshold $K$ were configurable instead of fixed at 10?
  Parametrize the condition to `word.length() > K` and the middle count to `word.length() - 2`. Note that abbreviations only save characters when $K \ge 4$.

## Common mistakes
- Off-by-one error using $\ge 10$ instead of $> 10$. Words with exactly 10 letters must NOT be abbreviated.
- Calculating the middle count as `length - 1` instead of `length - 2` (forgetting that both the first and last letters are preserved).
- Incorrect index for the last character (using `length` instead of `length - 1` in 0-indexed languages).
