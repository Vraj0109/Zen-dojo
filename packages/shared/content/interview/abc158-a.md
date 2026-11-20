---
id: abc158-a
pattern: cses-atcoder
difficulty: medium
optimal: "O(1) time, O(1) space"
reviewed: false
---

## Clarify first
- What does the string $s$ represent? Exactly 3 stations along a railway line, where each station is operated by either company 'A' or company 'B'.
- When does a bus service operate? A bus service connects two stations if and only if one station is operated by company 'A' and the other is operated by company 'B'.
- What is being returned? The string `"Yes"` if at least one bus route exists between any pair of stations, and `"No"` otherwise.
- What are the constraints on $s$? $s$ is a 3-character string containing only uppercase characters `'A'` and `'B'`.

## Examples to say out loud
- Consider `s = "ABA"`.
  Stations 0 and 2 are run by 'A', and station 1 is run by 'B'.
  There is a bus service connecting station 0 to station 1, and another connecting station 1 to station 2.
  Result: `"Yes"`.
- Consider `s = "AAA"`.
  All 3 stations are run by company 'A'. No station is run by 'B', so no bus service can connect different companies.
  Result: `"No"`.
- Consider `s = "BBB"`.
  All 3 stations are run by company 'B'. No bus route exists $\to$ returns `"No"`.

## Brute force
A brute force approach would test all $\binom{3}{2} = 3$ pairs of stations: $(0, 1)$, $(0, 2)$, and $(1, 2)$. If any pair of stations has different characters ($s[i] \ne s[j]$), return `"Yes"`. If all pairs share the same company, return `"No"`. While already $O(1)$, analyzing the overall character composition simplifies the logic further.

## The key observation
A pair with different operators exists if and only if the set of stations is NOT homogeneous.
Since each station is either 'A' or 'B':
- A bus route exists $\iff$ $s$ contains both at least one `'A'` and at least one `'B'`.
- Equivalently, no bus route exists $\iff$ $s == \text{"AAA"}$ or $s == \text{"BBB"}$.
Because the string length is fixed at 3, checking whether $s$ contains both letters (or simply checking $s \ne \text{"AAA"} \land s \ne \text{"BBB"}$) resolves the query in $O(1)$ operations.

## Optimal approach
1. Check whether string $s$ contains the character `'A'` and also contains the character `'B'`.
   (Alternatively: check that $s$ is neither `"AAA"` nor `"BBB"`).
2. If both characters are present, return `"Yes"`.
3. Otherwise, return `"No"`.
4. Complexity:
   - Time Complexity: $O(1)$, scanning a fixed-length 3-character string.
   - Space Complexity: $O(1)$ auxiliary memory.

## Code walkthrough
- `bool a = s.find('A') != string::npos;`: Check if company A operates at least one station.
- `bool b = s.find('B') != string::npos;`: Check if company B operates at least one station.
- `return (a && b) ? "Yes" : "No";`: If both companies are present, a cross-company connection exists.

## Test it out loud
- Test 1: `s = "AAA"` $\to$ no 'B' $\to$ returns `"No"`.
- Test 2: `s = "BBB"` $\to$ no 'A' $\to$ returns `"No"`.
- Test 3: `s = "AAB"` $\to$ has 'A' and 'B' $\to$ returns `"Yes"`.
- Test 4: `s = "ABB"` $\to$ has 'A' and 'B' $\to$ returns `"Yes"`.
- Test 5: `s = "BAB"` $\to$ has 'A' and 'B' $\to$ returns `"Yes"`.

## Follow-ups
- What if there are $n$ stations along the line?
  The same condition holds: a bus route exists between two stations with different operators if and only if the string contains at least two distinct characters.
- What if there are $k$ different companies (e.g., 'A', 'B', 'C', ...)?
  A bus service connects any two stations with different companies; such a route exists if and only if the count of unique characters in $s$ is $\ge 2$.

## Common mistakes
- Checking only adjacent pairs ($s[0] \ne s[1]$ or $s[1] \ne s[2]$) and missing whether non-adjacent pairs connect; in a 3-character string containing 'A' and 'B', at least one adjacent pair is always different anyway, but keeping the global set condition avoids edge-case mistakes.
- Returning boolean `true`/`false` instead of `"Yes"`/`"No"`.
