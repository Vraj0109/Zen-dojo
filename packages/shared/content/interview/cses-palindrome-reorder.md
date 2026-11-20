---
id: cses-palindrome-reorder
pattern: cses-introductory
difficulty: medium
optimal: "O(n + \Sigma) time and O(n) space, where \Sigma = 26"
reviewed: false
---

## Clarify first
- What characters does the input string contain? Only uppercase English letters from 'A' through 'Z'.
- What is the tie-breaker if multiple palindromes can be formed? Construct the alphabetically smallest one.
- What should be returned if no palindrome can be constructed? Return the string "NO SOLUTION".
- What are the length constraints? $1 \le |s| \le 10^5$.

## Examples to say out loud
- Consider $s = \text{"AAAACACBA"}$:
  - Frequency count: A: 6, B: 1, C: 2.
  - Notice that only 'B' has an odd frequency (1), while 'A' and 'C' have even frequencies.
  - Left half using alphabetical order: 3 'A's and 1 'C' $\implies$ "AAAC".
  - Center character: "B".
  - Right half: reverse of left half $\implies$ "CAAA".
  - Result: "AAACBCAAA". Reads the same forwards and backwards, and is lexicographically minimal.
- Edge case: $s = \text{"AB"}$:
  - Frequency: A: 1, B: 1. Two characters have odd counts.
  - A palindrome can have at most one character with an odd count.
  - Return "NO SOLUTION".

## Brute force
A brute-force strategy would generate all distinct permutations of the string and verify if any is a palindrome, then pick the lexicographically smallest. For $|s| = 10^5$, $n!$ permutation generation is entirely intractable. We can solve this with frequency counting and a constructive string build in $O(n)$ time.

## The key observation
In any palindrome, characters on the left mirror those on the right. Consequently, every character must appear an even number of times, with at most one exception: a single character with an odd frequency may sit in the exact center of an odd-length string. If more than one character has an odd frequency, forming a palindrome is impossible.
To achieve the alphabetically smallest palindrome, we take $\lfloor \text{count}[c] / 2 \rfloor$ copies of each character in ascending alphabetical order ('A' to 'Z') for the left half, place the odd character (if present) in the middle, and append the reversed left half for the right half.

## Optimal approach
1. Count the frequency of each uppercase letter in an array `cnt` of size 26.
2. Count how many characters have odd frequencies:
   - If `oddCount > 1`, return "NO SOLUTION".
3. Construct the `half` string:
   - For each character from 'A' to 'Z', append `cnt[i] / 2` instances of `char('A' + i)` to `half`.
4. If an odd character index exists, set `mid` to that character, otherwise empty string.
5. Reverse `half` to create `rev`.
6. Return `half + mid + rev`.

Complexity:
- Time: $O(n + \Sigma)$ where $n = |s|$ and $\Sigma = 26$. Counting takes $O(n)$ and building the output takes $O(n)$.
- Space: $O(n)$ auxiliary space to construct the result string.

## Code walkthrough
- `int cnt[26] = {0}`: Tracks occurrences of each character 'A' through 'Z'.
- `for (int i = 0; i < 26; i++) if (cnt[i] % 2) { odd = i; oddCount++; }`: Identifies all odd-frequency characters.
- `if (oddCount > 1) return "NO SOLUTION"`: Flags impossibility if two or more distinct characters have odd counts.
- `half += string(cnt[i] / 2, char('A' + i))`: Distributes half of each character's count in lexicographical order.
- `return half + mid + rev`: Mirrors the left half across the center to guarantee both palindromic symmetry and minimal alphabetical order.

## Test it out loud
- Test case $1$: $s = \text{"A"}$. Count: A: 1. Half: "", Mid: "A", Rev: "". Returns "A".
- Test case $2$: $s = \text{"AA"}$. Count: A: 2. Half: "A", Mid: "", Rev: "A". Returns "AA".
- Test case $3$: $s = \text{"AAB"}$. Count: A: 2, B: 1. Half: "A", Mid: "B", Rev: "A". Returns "ABA".
- Test case $4$: $s = \text{"ABC"}$. Odd counts for A, B, C (3 odd counts > 1). Returns "NO SOLUTION".

## Follow-ups
- What if lowercase letters or punctuation were allowed? Use a hash table or a 256-element frequency array, keeping the same parity counting logic.
- What if we needed to find the number of distinct palindromes that could be formed? Use the multinomial coefficient on the half-string counts: $\frac{(\sum \lfloor \text{cnt}[i]/2 \rfloor)!}{\prod (\lfloor \text{cnt}[i]/2 \rfloor)!}$.

## Common mistakes
- Allowing more than one odd count: Even-length strings require 0 odd counts; odd-length strings allow at most 1 odd count.
- Not ordering the half string alphabetically: Building the half string without sorting the characters fails the requirement to produce the alphabetically smallest palindrome.
- Forgetting the middle character: Leaving out the character with odd frequency truncates the center of odd-length strings.

## Further reading
- [Palindromic Strings on Wikipedia](https://en.wikipedia.org/wiki/Palindrome)
