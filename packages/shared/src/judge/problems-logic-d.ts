import type { ProblemSpec } from "./types";

// Logic building, batch D: 41 competitive programming logic problems (25 Codeforces + 16 Kattis)
// Rewritten as clean function-based specifications with compiling C++17 reference solutions.

export const PROBLEMS_LOGIC_D: ProblemSpec[] = [
  // ==========================================
  // CODEFORCES (25 problems)
  // ==========================================
  {
    id: "c-cf-282a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/282/A",
    title: "Bit++ (Codeforces 282A)",
    difficulty: "easy",
    pattern: "cses-codeforces",
    description: "The language Bit++ has a single integer variable x, initially 0, and four operations: ++X, X++, --X, and X--. Execute a list of statements and return the final value of x.",
    inputFormat: "statements: string[] containing statements like ++X, X++, --X, X--.",
    outputFormat: "int representing the final value of x.",
    statement: [
      "The classic language Bit++ has a single integer variable x which starts with the value 0.",
      "Programs consist of statements that either increment x by 1 ('++X' or 'X++') or decrement x by 1 ('--X' or 'X--'). Given a list of statements in execution order, return the final value of x.",
      "Rewritten for this app from Codeforces 282A as a function.",
    ],
    constraints: ["1 <= statements.length <= 150", "Each statement is '++X', 'X++', '--X', or 'X--'"],
    fn: { name: "executeBitProgram", params: [{ name: "statements", type: "string[]" }], returns: "int" },
    examples: [
      { input: [["++X", "X++", "--X"]], output: 1, explanation: "x becomes 1, then 2, then decrements back to 1." },
      { input: [["--X", "X--"]], output: -2, explanation: "Two decrements produce -2." },
    ],
    sampleCases: [
      { input: [["++X", "X++", "--X"]], output: 1, explanation: "x becomes 1, then 2, then decrements back to 1." },
      { input: [["--X", "X--"]], output: -2, explanation: "Two decrements produce -2." },
    ],
    tests: [
      { input: [["++X"]], output: 1 },
      { input: [["X++"]], output: 1 },
      { input: [["--X"]], output: -1 },
      { input: [["X--"]], output: -1 },
      { input: [["++X", "++X", "++X"]], output: 3 },
      { input: [["--X", "--X", "--X", "--X"]], output: -4 },
      { input: [["X++", "X--", "++X", "--X"]], output: 0 },
      { input: [["++X", "X++", "++X", "X++", "++X"]], output: 5 },
    ],
    testCases: [
      { input: [["++X"]], output: 1 },
      { input: [["X++"]], output: 1 },
      { input: [["--X"]], output: -1 },
      { input: [["X--"]], output: -1 },
      { input: [["++X", "++X", "++X"]], output: 3 },
      { input: [["--X", "--X", "--X", "--X"]], output: -4 },
      { input: [["X++", "X--", "++X", "--X"]], output: 0 },
      { input: [["++X", "X++", "++X", "X++", "++X"]], output: 5 },
    ],
    hints: [
      "Each statement is short and has one of two effects. Which single character tells you which effect it has?",
      "Every increment statement contains a plus sign and every decrement contains a minus sign, so checking for one character is enough.",
      "Start a counter at 0, add one or subtract one for each statement depending on that character, and return the counter.",
      "Check whether the statement contains a plus sign anywhere, rather than matching the exact four spellings.",
    ],
    solution: {
      idea: ["Iterate through all statements. If the string contains '+', increment x; otherwise decrement x."],
      complexity: "O(n) time where n is the number of statements, O(1) auxiliary space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int executeBitProgram(vector<string> statements) {
        int x = 0;
        for (const string& s : statements) {
            if (s.find('+') != string::npos) x++;
            else x--;
        }
        return x;
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int executeBitProgram(vector<string> statements) {
        int x = 0;
        for (const string& s : statements) {
            if (s.find('+') != string::npos) x++;
            else x--;
        }
        return x;
    }
};
`,
  },
  {
    id: "c-cf-112a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/112/A",
    title: "Petya and Strings (Codeforces 112A)",
    difficulty: "easy",
    pattern: "cses-codeforces",
    description: "Compare two strings of the same length lexicographically, ignoring case differences.",
    inputFormat: "a: string, b: string of equal length consisting of uppercase and lowercase English letters.",
    outputFormat: "int: -1 if a < b, 1 if a > b, 0 if equal (case-insensitive).",
    statement: [
      "Little Petya loves strings and wants to compare two strings of equal length lexicographically.",
      "The comparison must be case-insensitive, meaning uppercase and lowercase letters are considered equal. Return -1 if the first string is strictly smaller, 1 if the second string is strictly smaller, or 0 if they are equal.",
      "Rewritten for this app from Codeforces 112A as a function.",
    ],
    constraints: ["1 <= a.length == b.length <= 100", "Strings contain only latin letters"],
    fn: { name: "compareCaseInsensitive", params: [{ name: "a", type: "string" }, { name: "b", type: "string" }], returns: "int" },
    examples: [
      { input: ["aaaa", "aaaA"], output: 0, explanation: "Both strings are equivalent when case is ignored." },
      { input: ["abs", "Abz"], output: -1, explanation: "'abs' is lexicographically smaller than 'abz'." },
    ],
    sampleCases: [
      { input: ["aaaa", "aaaA"], output: 0, explanation: "Both strings are equivalent when case is ignored." },
      { input: ["abs", "Abz"], output: -1, explanation: "'abs' is lexicographically smaller than 'abz'." },
    ],
    tests: [
      { input: ["abcdefg", "AbCdEfF"], output: 1 },
      { input: ["a", "z"], output: -1 },
      { input: ["Z", "a"], output: 1 },
      { input: ["HELLO", "hello"], output: 0 },
      { input: ["abc", "abd"], output: -1 },
      { input: ["xyz", "XYA"], output: 1 },
    ],
    testCases: [
      { input: ["abcdefg", "AbCdEfF"], output: 1 },
      { input: ["a", "z"], output: -1 },
      { input: ["Z", "a"], output: 1 },
      { input: ["HELLO", "hello"], output: 0 },
      { input: ["abc", "abd"], output: -1 },
      { input: ["xyz", "XYA"], output: 1 },
    ],
    hints: [
      "Think about how letter case should affect the comparison. What is the usual way to compare two strings letter by letter?",
      "Compare the letters at each position after converting both to the same case. The first difference decides the answer.",
      "Walk both strings from left to right. Return -1 or 1 at the first mismatch, and 0 if you reach the end without one.",
      "Both strings have the same length, so one loop over that length is enough.",
    ],
    solution: {
      idea: ["Iterate character by character, converting each to lowercase. Compare values and return immediately on mismatch."],
      complexity: "O(n) time, O(1) auxiliary space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int compareCaseInsensitive(string a, string b) {
        for (size_t i = 0; i < a.size(); i++) {
            char ca = tolower(a[i]);
            char cb = tolower(b[i]);
            if (ca < cb) return -1;
            if (ca > cb) return 1;
        }
        return 0;
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int compareCaseInsensitive(string a, string b) {
        for (size_t i = 0; i < a.size(); i++) {
            char ca = tolower(a[i]);
            char cb = tolower(b[i]);
            if (ca < cb) return -1;
            if (ca > cb) return 1;
        }
        return 0;
    }
};
`,
  },
  {
    id: "c-cf-281a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/281/A",
    title: "Word Capitalization (Codeforces 281A)",
    difficulty: "easy",
    pattern: "cses-codeforces",
    description: "Capitalize the first letter of a word if it is lowercase, leaving the rest untouched.",
    inputFormat: "s: string consisting of English letters.",
    outputFormat: "string with the first character capitalized.",
    statement: [
      "Capitalization is writing a word with its first letter as a capital letter.",
      "Your task is to capitalize the given word: if the first letter is lowercase, make it uppercase. Keep all other characters unchanged.",
      "Rewritten for this app from Codeforces 281A as a function.",
    ],
    constraints: ["1 <= s.length <= 1000", "s contains only lowercase and uppercase English letters"],
    fn: { name: "capitalizeWord", params: [{ name: "s", type: "string" }], returns: "string" },
    examples: [
      { input: ["ApPLe"], output: "ApPLe", explanation: "The first letter is already capitalized, so no change is made." },
      { input: ["konjac"], output: "Konjac", explanation: "'k' is converted to uppercase 'K'." },
    ],
    sampleCases: [
      { input: ["ApPLe"], output: "ApPLe", explanation: "The first letter is already capitalized, so no change is made." },
      { input: ["konjac"], output: "Konjac", explanation: "'k' is converted to uppercase 'K'." },
    ],
    tests: [
      { input: ["z"], output: "Z" },
      { input: ["A"], output: "A" },
      { input: ["apple"], output: "Apple" },
      { input: ["cODING"], output: "CODING" },
      { input: ["testCase"], output: "TestCase" },
      { input: ["alreadyCapital"], output: "AlreadyCapital" },
    ],
    testCases: [
      { input: ["z"], output: "Z" },
      { input: ["A"], output: "A" },
      { input: ["apple"], output: "Apple" },
      { input: ["cODING"], output: "CODING" },
      { input: ["testCase"], output: "TestCase" },
      { input: ["alreadyCapital"], output: "AlreadyCapital" },
    ],
    hints: [
      "Only one letter changes. Which position is it?",
      "Only the first character is affected. The rest of the word must stay exactly as it is.",
      "Convert the first character to uppercase with a character function, then return the word.",
      "A first character that is already uppercase is left unchanged by the conversion, so no extra check is needed.",
    ],
    solution: {
      idea: ["Convert the first character of the string to uppercase using toupper() and return the result."],
      complexity: "O(1) time beyond string copy, O(1) auxiliary space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string capitalizeWord(string s) {
        if (!s.empty()) s[0] = toupper(s[0]);
        return s;
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string capitalizeWord(string s) {
        if (!s.empty()) s[0] = toupper(s[0]);
        return s;
    }
};
`,
  },
  {
    id: "c-cf-236a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/236/A",
    title: "Boy or Girl (Codeforces 236A)",
    difficulty: "easy",
    pattern: "cses-codeforces",
    description: "Determine whether the number of distinct characters in a username is even or odd.",
    inputFormat: "name: string consisting of lowercase English letters.",
    outputFormat: "string: 'CHAT WITH HER!' if the count of distinct characters is even, else 'IGNORE HIM!'.",
    statement: [
      "A hero uses a method to identify gender from usernames: count the distinct characters in the username.",
      "If the count of distinct characters is even, the user is female; return 'CHAT WITH HER!'. If odd, the user is male; return 'IGNORE HIM!'.",
      "Rewritten for this app from Codeforces 236A as a function.",
    ],
    constraints: ["1 <= name.length <= 100", "name consists of lowercase Latin letters"],
    fn: { name: "determineGender", params: [{ name: "name", type: "string" }], returns: "string" },
    examples: [
      { input: ["wjmzbmr"], output: "CHAT WITH HER!", explanation: "Distinct characters are {w, j, m, z, b, r} (6 characters, even)." },
      { input: ["xiaodao"], output: "IGNORE HIM!", explanation: "Distinct characters are {x, i, a, o, d} (5 characters, odd)." },
    ],
    sampleCases: [
      { input: ["wjmzbmr"], output: "CHAT WITH HER!", explanation: "Distinct characters are {w, j, m, z, b, r} (6 characters, even)." },
      { input: ["xiaodao"], output: "IGNORE HIM!", explanation: "Distinct characters are {x, i, a, o, d} (5 characters, odd)." },
    ],
    tests: [
      { input: ["sevenkplus"], output: "CHAT WITH HER!" },
      { input: ["a"], output: "IGNORE HIM!" },
      { input: ["aa"], output: "IGNORE HIM!" },
      { input: ["ab"], output: "CHAT WITH HER!" },
      { input: ["abcdefghijklmnopqrstuvwxyz"], output: "CHAT WITH HER!" },
      { input: ["banana"], output: "IGNORE HIM!" },
    ],
    testCases: [
      { input: ["sevenkplus"], output: "CHAT WITH HER!" },
      { input: ["a"], output: "IGNORE HIM!" },
      { input: ["aa"], output: "IGNORE HIM!" },
      { input: ["ab"], output: "CHAT WITH HER!" },
      { input: ["abcdefghijklmnopqrstuvwxyz"], output: "CHAT WITH HER!" },
      { input: ["banana"], output: "IGNORE HIM!" },
    ],
    hints: [
      "Ignore repeats for a moment. What does the username tell you once every letter is counted only once?",
      "Only the number of different letters matters, so you never need to know how often each letter appears.",
      "Gather the distinct letters with a set or a table of seen letters, then check whether that count is even or odd.",
      "Count distinct letters, not total letters. A name like aaa has one distinct letter, which is odd.",
    ],
    solution: {
      idea: ["Collect unique letters into an unordered_set. If the size of the set is even, return 'CHAT WITH HER!', else 'IGNORE HIM!'."],
      complexity: "O(n) time, O(1) auxiliary space (at most 26 characters).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string determineGender(string name) {
        unordered_set<char> distinct(name.begin(), name.end());
        return (distinct.size() % 2 == 0) ? "CHAT WITH HER!" : "IGNORE HIM!";
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string determineGender(string name) {
        unordered_set<char> distinct(name.begin(), name.end());
        return (distinct.size() % 2 == 0) ? "CHAT WITH HER!" : "IGNORE HIM!";
    }
};
`,
  },
  {
    id: "c-cf-791a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/791/A",
    title: "Bear and Big Brother (Codeforces 791A)",
    difficulty: "easy",
    pattern: "cses-codeforces",
    description: "Calculate how many full years it takes for Limak's weight to strictly exceed Bob's weight.",
    inputFormat: "a: int (Limak's initial weight), b: int (Bob's initial weight) with a <= b.",
    outputFormat: "int: number of years until Limak becomes strictly heavier than Bob.",
    statement: [
      "Bear Limak wants to become larger than his brother Bob. Currently, Limak weighs a and Bob weighs b, with a <= b.",
      "Limak eats a lot, so his weight triples every year (multiplied by 3). Bob's weight doubles every year (multiplied by 2).",
      "Return the minimum number of full years until Limak's weight is strictly greater than Bob's.",
      "Rewritten for this app from Codeforces 791A as a function.",
    ],
    constraints: ["1 <= a <= b <= 10"],
    fn: { name: "yearsUntilBigger", params: [{ name: "a", type: "int" }, { name: "b", type: "int" }], returns: "int" },
    examples: [
      { input: [4, 7], output: 2, explanation: "After 1 year: 12 vs 14. After 2 years: 36 vs 28. 36 > 28, so 2 years." },
      { input: [4, 9], output: 3, explanation: "Year 1: 12 vs 18. Year 2: 36 vs 36. Year 3: 108 vs 72, so 3 years." },
    ],
    sampleCases: [
      { input: [4, 7], output: 2, explanation: "After 1 year: 12 vs 14. After 2 years: 36 vs 28. 36 > 28, so 2 years." },
      { input: [4, 9], output: 3, explanation: "Year 1: 12 vs 18. Year 2: 36 vs 36. Year 3: 108 vs 72, so 3 years." },
    ],
    tests: [
      { input: [1, 1], output: 1 },
      { input: [1, 2], output: 2 },
      { input: [2, 5], output: 3 },
      { input: [10, 10], output: 1 },
      { input: [1, 10], output: 6 },
      { input: [3, 8], output: 3 },
    ],
    testCases: [
      { input: [1, 1], output: 1 },
      { input: [1, 2], output: 2 },
      { input: [2, 5], output: 3 },
      { input: [10, 10], output: 1 },
      { input: [1, 10], output: 6 },
      { input: [3, 8], output: 3 },
    ],
    hints: [
      "Forget the years for a moment. How does each weight change, and which one overtakes the other first?",
      "The two weights grow at different rates, so there is a fixed number of years before the faster-growing one wins.",
      "Simulate the growth year by year: triple one weight, double the other, and count years until the first is strictly larger.",
      "Use strictly larger, not larger or equal. The starting weights can already be equal, and that still needs a year.",
    ],
    solution: {
      idea: ["Simulate year by year: multiply a by 3, b by 2, and increment the year counter until a > b."],
      complexity: "O(log(b/a)) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int yearsUntilBigger(int a, int b) {
        int years = 0;
        while (a <= b) {
            a *= 3;
            b *= 2;
            years++;
        }
        return years;
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int yearsUntilBigger(int a, int b) {
        int years = 0;
        while (a <= b) {
            a *= 3;
            b *= 2;
            years++;
        }
        return years;
    }
};
`,
  },
  {
    id: "c-cf-59a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/59/A",
    title: "Word (Codeforces 59A)",
    difficulty: "easy",
    pattern: "cses-codeforces",
    description: "Convert a word to all uppercase or all lowercase depending on which case occurs more frequently.",
    inputFormat: "s: string consisting of uppercase and lowercase English letters.",
    outputFormat: "string converted entirely to uppercase or lowercase.",
    statement: [
      "Vasya is annoyed by words written in mixed case like 'HoUse'.",
      "He wants to correct the casing: if the word contains strictly more uppercase letters than lowercase letters, convert the entire word to uppercase. Otherwise (if lowercase letters are equal or greater in number), convert the entire word to lowercase.",
      "Rewritten for this app from Codeforces 59A as a function.",
    ],
    constraints: ["1 <= s.length <= 100", "s contains only English letters"],
    fn: { name: "normalizeWord", params: [{ name: "s", type: "string" }], returns: "string" },
    examples: [
      { input: ["HoUse"], output: "house", explanation: "2 uppercase ('H','U') and 3 lowercase ('o','s','e'). Lowercase wins." },
      { input: ["ViP"], output: "VIP", explanation: "2 uppercase ('V','P') and 1 lowercase ('i'). Uppercase wins." },
    ],
    sampleCases: [
      { input: ["HoUse"], output: "house", explanation: "2 uppercase ('H','U') and 3 lowercase ('o','s','e'). Lowercase wins." },
      { input: ["ViP"], output: "VIP", explanation: "2 uppercase ('V','P') and 1 lowercase ('i'). Uppercase wins." },
    ],
    tests: [
      { input: ["maTRIx"], output: "matrix" },
      { input: ["a"], output: "a" },
      { input: ["A"], output: "A" },
      { input: ["ABCde"], output: "ABCDE" },
      { input: ["abCDE"], output: "ABCDE" },
      { input: ["coDe"], output: "code" },
    ],
    testCases: [
      { input: ["maTRIx"], output: "matrix" },
      { input: ["a"], output: "a" },
      { input: ["A"], output: "A" },
      { input: ["ABCde"], output: "ABCDE" },
      { input: ["abCDE"], output: "ABCDE" },
      { input: ["coDe"], output: "code" },
    ],
    hints: [
      "Look at the word as a whole. Which single case would need the fewest letters changed?",
      "Counting capital and small letters tells you which case the word mostly uses.",
      "Count uppercase and lowercase letters in one pass, then convert the whole word to whichever case has more letters.",
      "A tie goes to lowercase. The word switches to uppercase only when capitals are strictly more numerous.",
    ],
    solution: {
      idea: ["Count uppercase letters in the string. If count > length / 2 (or count > lowercase count), convert all to upper; else to lower."],
      complexity: "O(n) time, O(1) auxiliary space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string normalizeWord(string s) {
        int up = 0, low = 0;
        for (char c : s) {
            if (isupper(c)) up++;
            else low++;
        }
        for (char& c : s) {
            c = (up > low) ? toupper(c) : tolower(c);
        }
        return s;
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string normalizeWord(string s) {
        int up = 0, low = 0;
        for (char c : s) {
            if (isupper(c)) up++;
            else low++;
        }
        for (char& c : s) {
            c = (up > low) ? toupper(c) : tolower(c);
        }
        return s;
    }
};
`,
  },
  {
    id: "c-cf-977a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/977/A",
    title: "Wrong Subtraction (Codeforces 977A)",
    difficulty: "easy",
    pattern: "cses-codeforces",
    description: "Simulate Tanya's wrong subtraction algorithm on an integer n performed k times.",
    inputFormat: "n: int, k: int.",
    outputFormat: "int: final value of n after k operations.",
    statement: [
      "Little girl Tanya has a peculiar way of subtracting: if the last digit of n is non-zero, she subtracts 1 from n.",
      "If the last digit of n is zero, she divides n by 10 (removes the trailing zero).",
      "Given initial integer n and step count k, return the result after applying this operation k times.",
      "Rewritten for this app from Codeforces 977A as a function.",
    ],
    constraints: ["2 <= n <= 10^9", "1 <= k <= 50", "The result will always be a positive integer"],
    fn: { name: "wrongSubtraction", params: [{ name: "n", type: "int" }, { name: "k", type: "int" }], returns: "int" },
    examples: [
      { input: [512, 4], output: 50, explanation: "512 -> 511 -> 510 -> 51 -> 50." },
      { input: [1000000000, 9], output: 1, explanation: "Divided by 10 nine times, resulting in 1." },
    ],
    sampleCases: [
      { input: [512, 4], output: 50, explanation: "512 -> 511 -> 510 -> 51 -> 50." },
      { input: [1000000000, 9], output: 1, explanation: "Divided by 10 nine times, resulting in 1." },
    ],
    tests: [
      { input: [10, 1], output: 1 },
      { input: [9, 1], output: 8 },
      { input: [100, 2], output: 1 },
      { input: [15, 3], output: 12 },
      { input: [23, 5], output: 1 },
      { input: [109, 1], output: 108 },
    ],
    testCases: [
      { input: [10, 1], output: 1 },
      { input: [9, 1], output: 8 },
      { input: [100, 2], output: 1 },
      { input: [15, 3], output: 12 },
      { input: [23, 5], output: 1 },
      { input: [109, 1], output: 108 },
    ],
    hints: [
      "Simulate exactly what the rule says, one step at a time. What decides which operation to apply?",
      "At each step only the last digit matters: it either drops by one or is removed by dividing by ten.",
      "Repeat the rule k times in a simple loop, checking whether the number ends in zero before choosing the operation.",
      "A number that ends in zero loses that zero when divided by ten. Check the zero case before the other one.",
    ],
    solution: {
      idea: ["Iterate k times: check the last digit with n % 10. If it is 0, divide by 10, otherwise subtract 1."],
      complexity: "O(k) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int wrongSubtraction(int n, int k) {
        for (int i = 0; i < k; i++) {
            if (n % 10 == 0) n /= 10;
            else n--;
        }
        return n;
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int wrongSubtraction(int n, int k) {
        for (int i = 0; i < k; i++) {
            if (n % 10 == 0) n /= 10;
            else n--;
        }
        return n;
    }
};
`,
  },
  {
    id: "c-cf-617a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/617/A",
    title: "Elephant (Codeforces 617A)",
    difficulty: "easy",
    pattern: "cses-codeforces",
    description: "Find the minimum number of steps of size 1, 2, 3, 4, or 5 needed to travel distance x.",
    inputFormat: "x: int (the coordinate to reach from 0).",
    outputFormat: "int: minimum steps required.",
    statement: [
      "An elephant wants to visit his friend whose house is located at coordinate point x on a line. The elephant starts at coordinate 0.",
      "In one step, the elephant can move forward by 1, 2, 3, 4, or 5 positions. Return the minimum number of steps required to reach coordinate x.",
      "Rewritten for this app from Codeforces 617A as a function.",
    ],
    constraints: ["1 <= x <= 1000000"],
    fn: { name: "minStepsToFriend", params: [{ name: "x", type: "int" }], returns: "int" },
    examples: [
      { input: [5], output: 1, explanation: "A single step of length 5 reaches position 5." },
      { input: [12], output: 3, explanation: "Two steps of size 5 and one step of size 2 reach 12." },
    ],
    sampleCases: [
      { input: [5], output: 1, explanation: "A single step of length 5 reaches position 5." },
      { input: [12], output: 3, explanation: "Two steps of size 5 and one step of size 2 reach 12." },
    ],
    tests: [
      { input: [1], output: 1 },
      { input: [4], output: 1 },
      { input: [6], output: 2 },
      { input: [10], output: 2 },
      { input: [1000000], output: 200000 },
      { input: [14], output: 3 },
    ],
    testCases: [
      { input: [1], output: 1 },
      { input: [4], output: 1 },
      { input: [6], output: 2 },
      { input: [10], output: 2 },
      { input: [1000000], output: 200000 },
      { input: [14], output: 3 },
    ],
    hints: [
      "Suppose the elephant wants as few jumps as possible. Which jump size should it prefer whenever it can?",
      "Taking the largest jump each time leaves only a short remainder, and one final jump can cover that remainder.",
      "The answer is x divided by 5, rounded up. Integer arithmetic does this by adding 4 to x and then dividing by 5.",
      "Zero needs zero jumps, and the rounding formula gives zero for x = 0, so no special case is needed.",
    ],
    solution: {
      idea: ["Greedily use step size 5 as much as possible. The minimum steps is ceiling division of x by 5: (x + 4) / 5."],
      complexity: "O(1) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int minStepsToFriend(int x) {
        return (x + 4) / 5;
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int minStepsToFriend(int x) {
        return (x + 4) / 5;
    }
};
`,
  },
  {
    id: "c-cf-271a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/271/A",
    title: "Beautiful Year (Codeforces 271A)",
    difficulty: "easy",
    pattern: "cses-codeforces",
    description: "Find the smallest year strictly greater than y whose four digits are all distinct.",
    inputFormat: "y: int representing a four-digit year.",
    outputFormat: "int: the next beautiful year with distinct digits.",
    statement: [
      "A year is called 'beautiful' if all of its digits are pairwise distinct.",
      "Given a year y, find the minimum year strictly greater than y that has all distinct digits.",
      "Rewritten for this app from Codeforces 271A as a function.",
    ],
    constraints: ["1000 <= y <= 9000"],
    fn: { name: "findNextDistinctYear", params: [{ name: "y", type: "int" }], returns: "int" },
    examples: [
      { input: [1987], output: 2013, explanation: "2013 is the first year after 1987 with all four digits distinct." },
      { input: [2013], output: 2014, explanation: "2014 has distinct digits 2, 0, 1, 4." },
    ],
    sampleCases: [
      { input: [1987], output: 2013, explanation: "2013 is the first year after 1987 with all four digits distinct." },
      { input: [2013], output: 2014, explanation: "2014 has distinct digits 2, 0, 1, 4." },
    ],
    tests: [
      { input: [1000], output: 1023 },
      { input: [2000], output: 2013 },
      { input: [9000], output: 9012 },
      { input: [1999], output: 2013 },
      { input: [1234], output: 1235 },
      { input: [8999], output: 9012 },
    ],
    testCases: [
      { input: [1000], output: 1023 },
      { input: [2000], output: 2013 },
      { input: [9000], output: 9012 },
      { input: [1999], output: 2013 },
      { input: [1234], output: 1235 },
      { input: [8999], output: 9012 },
    ],
    hints: [
      "The year has only four digits. What is the simplest search you could run, starting from the year after y?",
      "Any year after y is a candidate, and you need the first one whose four digits are all different.",
      "Try y + 1, y + 2 and so on, splitting each year into its thousands, hundreds, tens and units digits and comparing all pairs.",
      "The answer must be strictly greater than y, so the first year you test is y + 1, not y.",
    ],
    solution: {
      idea: ["Iterate year by year starting from y + 1. Decompose into four digits and test for pairwise inequality."],
      complexity: "O(1) iterations on average, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int findNextDistinctYear(int y) {
        while (true) {
            y++;
            int a = y / 1000;
            int b = (y / 100) % 10;
            int c = (y / 10) % 10;
            int d = y % 10;
            if (a != b && a != c && a != d && b != c && b != d && c != d) {
                return y;
            }
        }
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int findNextDistinctYear(int y) {
        while (true) {
            y++;
            int a = y / 1000;
            int b = (y / 100) % 10;
            int c = (y / 10) % 10;
            int d = y % 10;
            if (a != b && a != c && a != d && b != c && b != d && c != d) {
                return y;
            }
        }
    }
};
`,
  },
  {
    id: "c-cf-1030a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/1030/A",
    title: "In Search of an Easy Problem (Codeforces 1030A)",
    difficulty: "easy",
    pattern: "cses-codeforces",
    description: "Determine whether any surveyed person considers the problem hard (1), or all agree it is easy (0).",
    inputFormat: "opinions: int[] where 0 means easy and 1 means hard.",
    outputFormat: "string: 'HARD' if at least one opinion is 1, otherwise 'EASY'.",
    statement: [
      "When preparing a contest, the coordinator asked n people their opinion about a problem.",
      "Each person answered either 0 (the problem is easy) or 1 (the problem is hard). If at least one person found it hard, the coordinator considers it 'HARD'. If everyone found it easy, it is considered 'EASY'.",
      "Rewritten for this app from Codeforces 1030A as a function.",
    ],
    constraints: ["1 <= opinions.length <= 100", "Each opinion is 0 or 1"],
    fn: { name: "evaluateDifficulty", params: [{ name: "opinions", type: "int[]" }], returns: "string" },
    examples: [
      { input: [[0, 0, 1]], output: "HARD", explanation: "The third person thought the problem was hard." },
      { input: [[0]], output: "EASY", explanation: "The only respondent thought it was easy." },
    ],
    sampleCases: [
      { input: [[0, 0, 1]], output: "HARD", explanation: "The third person thought the problem was hard." },
      { input: [[0]], output: "EASY", explanation: "The only respondent thought it was easy." },
    ],
    tests: [
      { input: [[1]], output: "HARD" },
      { input: [[0, 0, 0, 0]], output: "EASY" },
      { input: [[1, 0, 0, 0]], output: "HARD" },
      { input: [[0, 1, 0, 0]], output: "HARD" },
      { input: [[0, 0, 0, 1]], output: "HARD" },
      { input: [[0, 0]], output: "EASY" },
    ],
    testCases: [
      { input: [[1]], output: "HARD" },
      { input: [[0, 0, 0, 0]], output: "EASY" },
      { input: [[1, 0, 0, 0]], output: "HARD" },
      { input: [[0, 1, 0, 0]], output: "HARD" },
      { input: [[0, 0, 0, 1]], output: "HARD" },
      { input: [[0, 0]], output: "EASY" },
    ],
    hints: [
      "Do you need to know how many people said hard, or only whether anyone did?",
      "One hard vote decides the answer, so you can stop reading as soon as you see one.",
      "Scan the list and return the hard answer at the first 1. If the scan finishes without a 1, the answer is easy.",
      "A list of all zeros must still give the easy answer, not an error or a count.",
    ],
    solution: {
      idea: ["Linearly search for 1. If found, return 'HARD', else return 'EASY'."],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string evaluateDifficulty(vector<int> opinions) {
        for (int op : opinions) {
            if (op == 1) return "HARD";
        }
        return "EASY";
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string evaluateDifficulty(vector<int> opinions) {
        for (int op : opinions) {
            if (op == 1) return "HARD";
        }
        return "EASY";
    }
};
`,
  },
  {
    id: "c-cf-41a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/41/A",
    title: "Translation (Codeforces 41A)",
    difficulty: "easy",
    pattern: "cses-codeforces",
    description: "Check whether string t is the exact reverse of string s.",
    inputFormat: "s: string, t: string consisting of lowercase English letters.",
    outputFormat: "bool: true if t is the reverse of s, false otherwise.",
    statement: [
      "The translation from the Berlandish language to the Birlandish language reverses words: 'code' becomes 'edoc'.",
      "Given two words s and t, determine whether word t is the valid translation (exact reverse) of word s.",
      "Rewritten for this app from Codeforces 41A as a function.",
    ],
    constraints: ["1 <= s.length, t.length <= 100", "Words contain only lowercase Latin letters"],
    fn: { name: "checkTranslation", params: [{ name: "s", type: "string" }, { name: "t", type: "string" }], returns: "bool" },
    examples: [
      { input: ["code", "edoc"], output: true, explanation: "'edoc' is the reversed word 'code'." },
      { input: ["abb", "aba"], output: false, explanation: "The reverse of 'abb' is 'bba', which differs from 'aba'." },
    ],
    sampleCases: [
      { input: ["code", "edoc"], output: true, explanation: "'edoc' is the reversed word 'code'." },
      { input: ["abb", "aba"], output: false, explanation: "The reverse of 'abb' is 'bba', which differs from 'aba'." },
    ],
    tests: [
      { input: ["go", "og"], output: true },
      { input: ["a", "a"], output: true },
      { input: ["a", "b"], output: false },
      { input: ["racecar", "racecar"], output: true },
      { input: ["ab", "ab"], output: false },
      { input: ["hello", "olleh"], output: true },
    ],
    testCases: [
      { input: ["go", "og"], output: true },
      { input: ["a", "a"], output: true },
      { input: ["a", "b"], output: false },
      { input: ["racecar", "racecar"], output: true },
      { input: ["ab", "ab"], output: false },
      { input: ["hello", "olleh"], output: true },
    ],
    hints: [
      "For one word to be the translation of another, what should the letters look like when read from the end?",
      "Read the first word backwards and compare it letter by letter with the second word.",
      "Check the lengths first. Then compare the first letter of one word with the last letter of the other, moving inward with two indices.",
      "Different lengths mean the answer is no straight away. Equal lengths still need a full comparison, since one mismatch fails.",
    ],
    solution: {
      idea: ["Check length equality, reverse s, and check if it equals t."],
      complexity: "O(n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool checkTranslation(string s, string t) {
        reverse(s.begin(), s.end());
        return s == t;
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool checkTranslation(string s, string t) {
        reverse(s.begin(), s.end());
        return s == t;
    }
};
`,
  },
  {
    id: "c-cf-734a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/734/A",
    title: "Anton and Danik (Codeforces 734A)",
    difficulty: "easy",
    pattern: "cses-codeforces",
    description: "Determine who won more games between Anton ('A') and Danik ('D'), or if they tied.",
    inputFormat: "s: string consisting of characters 'A' and 'D'.",
    outputFormat: "string: 'Anton', 'Danik', or 'Friendship'.",
    statement: [
      "Anton and Danik like to play chess. The string s records the outcomes of their games: 'A' means Anton won, 'D' means Danik won.",
      "Determine who won more games overall. Return 'Anton' if Anton won more, 'Danik' if Danik won more, or 'Friendship' if they won an equal number of games.",
      "Rewritten for this app from Codeforces 734A as a function.",
    ],
    constraints: ["1 <= s.length <= 100000", "s contains only 'A' and 'D'"],
    fn: { name: "determineChessWinner", params: [{ name: "s", type: "string" }], returns: "string" },
    examples: [
      { input: ["ADAAAA"], output: "Anton", explanation: "Anton won 5 games, Danik won 1. Anton wins." },
      { input: ["DDDAADA"], output: "Danik", explanation: "Danik won 4 games, Anton won 3. Danik wins." },
    ],
    sampleCases: [
      { input: ["ADAAAA"], output: "Anton", explanation: "Anton won 5 games, Danik won 1. Anton wins." },
      { input: ["DDDAADA"], output: "Danik", explanation: "Danik won 4 games, Anton won 3. Danik wins." },
    ],
    tests: [
      { input: ["DADADA"], output: "Friendship" },
      { input: ["A"], output: "Anton" },
      { input: ["D"], output: "Danik" },
      { input: ["AD"], output: "Friendship" },
      { input: ["AAAA"], output: "Anton" },
      { input: ["DDDD"], output: "Danik" },
    ],
    testCases: [
      { input: ["DADADA"], output: "Friendship" },
      { input: ["A"], output: "Anton" },
      { input: ["D"], output: "Danik" },
      { input: ["AD"], output: "Friendship" },
      { input: ["AAAA"], output: "Anton" },
      { input: ["DDDD"], output: "Danik" },
    ],
    hints: [
      "You only need to know which side won more games. Does the order of the games matter?",
      "Each game is a single letter, so the order does not matter. What matters is how many of each letter there are.",
      "Count the A letters, then the D letters, and compare the two counts. The total length gives you one count from the other.",
      "Equal counts give the tie answer, which is the third option, not either name.",
    ],
    solution: {
      idea: ["Iterate through the string, counting 'A' and 'D'. Return 'Anton', 'Danik', or 'Friendship' based on the comparison."],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string determineChessWinner(string s) {
        int a = 0, d = 0;
        for (char c : s) {
            if (c == 'A') a++;
            else d++;
        }
        if (a > d) return "Anton";
        if (d > a) return "Danik";
        return "Friendship";
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string determineChessWinner(string s) {
        int a = 0, d = 0;
        for (char c : s) {
            if (c == 'A') a++;
            else d++;
        }
        if (a > d) return "Anton";
        if (d > a) return "Danik";
        return "Friendship";
    }
};
`,
  },
  {
    id: "c-cf-344a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/344/A",
    title: "Magnets (Codeforces 344A)",
    difficulty: "easy",
    pattern: "cses-codeforces",
    description: "Count the number of contiguous groups formed by domino-like magnets laid in a row.",
    inputFormat: "magnets: string[] where each element is '10' or '01'.",
    outputFormat: "int: the number of magnet groups.",
    statement: [
      "Mad scientist Mike arranges domino-shaped magnets in a line. Each magnet is represented by '10' (positive-negative) or '01' (negative-positive).",
      "Magnets with like poles touching repel each other and form separate groups, while opposite poles attract and cling together. Return the number of separated groups of magnets.",
      "Rewritten for this app from Codeforces 344A as a function.",
    ],
    constraints: ["1 <= magnets.length <= 100000", "Each magnet is '10' or '01'"],
    fn: { name: "countMagnetGroups", params: [{ name: "magnets", type: "string[]" }], returns: "int" },
    examples: [
      { input: [["10", "10", "10", "01", "10", "10"]], output: 3, explanation: "Groups are [10, 10, 10], [01], [10, 10]." },
      { input: [["01", "10", "10", "01"]], output: 3, explanation: "Groups are [01], [10, 10], [01]." },
    ],
    sampleCases: [
      { input: [["10", "10", "10", "01", "10", "10"]], output: 3, explanation: "Groups are [10, 10, 10], [01], [10, 10]." },
      { input: [["01", "10", "10", "01"]], output: 3, explanation: "Groups are [01], [10, 10], [01]." },
    ],
    tests: [
      { input: [["10"]], output: 1 },
      { input: [["01", "01", "01"]], output: 1 },
      { input: [["10", "01", "10", "01"]], output: 4 },
      { input: [["01", "10"]], output: 2 },
      { input: [["10", "10"]], output: 1 },
      { input: [["10", "01", "01", "10"]], output: 3 },
    ],
    testCases: [
      { input: [["10"]], output: 1 },
      { input: [["01", "01", "01"]], output: 1 },
      { input: [["10", "01", "10", "01"]], output: 4 },
      { input: [["01", "10"]], output: 2 },
      { input: [["10", "10"]], output: 1 },
      { input: [["10", "01", "01", "10"]], output: 3 },
    ],
    hints: [
      "Look at neighbouring magnets. When do two of them stay stuck together, and when do they push apart?",
      "Two neighbours that are different touch like poles and split into separate groups. Two that are the same stay together.",
      "Start with one group, then add one each time a magnet differs from the magnet before it.",
      "A single magnet is one group, so the answer is never zero, even for a short list.",
    ],
    solution: {
      idea: ["Count transitions where adjacent magnets differ: groups = 1 + count(magnets[i] != magnets[i-1])."],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int countMagnetGroups(vector<string> magnets) {
        if (magnets.empty()) return 0;
        int groups = 1;
        for (size_t i = 1; i < magnets.size(); i++) {
            if (magnets[i] != magnets[i - 1]) groups++;
        }
        return groups;
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int countMagnetGroups(vector<string> magnets) {
        if (magnets.empty()) return 0;
        int groups = 1;
        for (size_t i = 1; i < magnets.size(); i++) {
            if (magnets[i] != magnets[i - 1]) groups++;
        }
        return groups;
    }
};
`,
  },
  {
    id: "c-cf-486a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/486/A",
    title: "Calculating Function (Codeforces 486A)",
    difficulty: "easy",
    pattern: "cses-codeforces",
    description: "Compute f(n) = -1 + 2 - 3 + 4 - ... + (-1)^n * n in O(1) time.",
    inputFormat: "n: long representing the upper bound.",
    outputFormat: "long: the value of the alternating sum.",
    statement: [
      "For a positive integer n, function f is defined as f(n) = -1 + 2 - 3 + 4 - 5 + ... + (-1)^n * n.",
      "Calculate f(n) for a given positive integer n. Note that n can be up to 10^15, so an O(1) formula is required.",
      "Rewritten for this app from Codeforces 486A as a function.",
    ],
    constraints: ["1 <= n <= 10^15"],
    fn: { name: "evalCalculatingFunction", params: [{ name: "n", type: "long" }], returns: "long" },
    examples: [
      { input: [4], output: 2, explanation: "-1 + 2 - 3 + 4 = 2." },
      { input: [5], output: -3, explanation: "-1 + 2 - 3 + 4 - 5 = -3." },
    ],
    sampleCases: [
      { input: [4], output: 2, explanation: "-1 + 2 - 3 + 4 = 2." },
      { input: [5], output: -3, explanation: "-1 + 2 - 3 + 4 - 5 = -3." },
    ],
    tests: [
      { input: [1], output: -1 },
      { input: [2], output: 1 },
      { input: [1000000000000], output: 500000000000 },
      { input: [1000000000001], output: -500000000001 },
      { input: [7], output: -4 },
      { input: [8], output: 4 },
    ],
    testCases: [
      { input: [1], output: -1 },
      { input: [2], output: 1 },
      { input: [1000000000000], output: 500000000000 },
      { input: [1000000000001], output: -500000000001 },
      { input: [7], output: -4 },
      { input: [8], output: 4 },
    ],
    hints: [
      "Write out the first few terms and group them in some way. What does each group add up to?",
      "Each pair of terms starting from 1 adds to the same value, so the result depends on how many pairs there are.",
      "Use the parity of n. An even n gives n divided by 2. An odd n has one extra term, which gives minus half of n plus one.",
      "n can be as large as 10 to the power of 15, so use 64-bit integers and do not simulate the terms.",
    ],
    solution: {
      idea: ["If n is even, f(n) = n / 2. If n is odd, f(n) = -(n + 1) / 2. Both computed in O(1) using 64-bit integers."],
      complexity: "O(1) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    long long evalCalculatingFunction(long long n) {
        if (n % 2 == 0) return n / 2;
        return -((n + 1) / 2);
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    long long evalCalculatingFunction(long long n) {
        if (n % 2 == 0) return n / 2;
        return -((n + 1) / 2);
    }
};
`,
  },
  {
    id: "c-cf-703a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/703/A",
    title: "Mishka and Chris (Codeforces 703A)",
    difficulty: "easy",
    pattern: "cses-codeforces",
    description: "Determine the overall winner of a series of dice rolls between Mishka and Chris.",
    inputFormat: "rounds: int[][] where each element is [m, c] (Mishka's and Chris's dice values).",
    outputFormat: "string: 'Mishka', 'Chris', or 'Friendship is magic!^^'.",
    statement: [
      "Mishka and Chris play a game consisting of several rounds. In each round, both players roll a die.",
      "The player with the higher roll wins the round; equal rolls result in a draw. The player with more round wins wins the game.",
      "Return 'Mishka' if Mishka wins, 'Chris' if Chris wins, or 'Friendship is magic!^^' if they tie.",
      "Rewritten for this app from Codeforces 703A as a function.",
    ],
    constraints: ["1 <= rounds.length <= 100", "1 <= m, c <= 6"],
    fn: { name: "diceGameWinner", params: [{ name: "rounds", type: "int[][]" }], returns: "string" },
    examples: [
      { input: [[[3, 5], [2, 1], [4, 2]]], output: "Mishka", explanation: "Mishka won 2 rounds, Chris won 1. Mishka wins." },
      { input: [[[6, 1], [1, 6], [3, 3]]], output: "Friendship is magic!^^", explanation: "Each won 1 round and 1 round was a draw." },
    ],
    sampleCases: [
      { input: [[[3, 5], [2, 1], [4, 2]]], output: "Mishka", explanation: "Mishka won 2 rounds, Chris won 1. Mishka wins." },
      { input: [[[6, 1], [1, 6], [3, 3]]], output: "Friendship is magic!^^", explanation: "Each won 1 round and 1 round was a draw." },
    ],
    tests: [
      { input: [[[2, 4], [3, 5]]], output: "Chris" },
      { input: [[[1, 1]]], output: "Friendship is magic!^^" },
      { input: [[[5, 2]]], output: "Mishka" },
      { input: [[[1, 6]]], output: "Chris" },
      { input: [[[6, 6], [2, 1], [1, 2]]], output: "Friendship is magic!^^" },
      { input: [[[4, 1], [3, 2], [1, 5]]], output: "Mishka" },
    ],
    testCases: [
      { input: [[[2, 4], [3, 5]]], output: "Chris" },
      { input: [[[1, 1]]], output: "Friendship is magic!^^" },
      { input: [[[5, 2]]], output: "Mishka" },
      { input: [[[1, 6]]], output: "Chris" },
      { input: [[[6, 6], [2, 1], [1, 2]]], output: "Friendship is magic!^^" },
      { input: [[[4, 1], [3, 2], [1, 5]]], output: "Mishka" },
    ],
    hints: [
      "Each round is decided by a single comparison. What do you need to keep track of across all rounds?",
      "You only need the total number of rounds each player won, not the full list of rolls.",
      "Keep two counters, one per player, and add one to the winner of each round. Draws add to neither counter.",
      "A draw in a round counts for nobody, and equal totals give the friendship answer.",
    ],
    solution: {
      idea: ["Iterate through each round, compare dice values, increment win counts, and return the winner."],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string diceGameWinner(vector<vector<int>> rounds) {
        int mWins = 0, cWins = 0;
        for (const auto& r : rounds) {
            if (r[0] > r[1]) mWins++;
            else if (r[1] > r[0]) cWins++;
        }
        if (mWins > cWins) return "Mishka";
        if (cWins > mWins) return "Chris";
        return "Friendship is magic!^^";
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string diceGameWinner(vector<vector<int>> rounds) {
        int mWins = 0, cWins = 0;
        for (const auto& r : rounds) {
            if (r[0] > r[1]) mWins++;
            else if (r[1] > r[0]) cWins++;
        }
        if (mWins > cWins) return "Mishka";
        if (cWins > mWins) return "Chris";
        return "Friendship is magic!^^";
    }
};
`,
  },
  {
    id: "c-cf-1328a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/1328/A",
    title: "Divisibility Problem (Codeforces 1328A)",
    difficulty: "easy",
    pattern: "cses-codeforces",
    description: "Find the minimum number of increment moves to make a divisible by b.",
    inputFormat: "a: int, b: int.",
    outputFormat: "int: minimum moves required.",
    statement: [
      "You are given two positive integers a and b.",
      "In one move, you can increase a by 1. Find the minimum number of moves you need to make a divisible by b.",
      "Rewritten for this app from Codeforces 1328A as a function.",
    ],
    constraints: ["1 <= a, b <= 10^9"],
    fn: { name: "movesToDivisible", params: [{ name: "a", type: "int" }, { name: "b", type: "int" }], returns: "int" },
    examples: [
      { input: [10, 4], output: 2, explanation: "Increasing 10 to 12 requires 2 moves (12 is divisible by 4)." },
      { input: [13, 9], output: 5, explanation: "Increasing 13 to 18 requires 5 moves." },
    ],
    sampleCases: [
      { input: [10, 4], output: 2, explanation: "Increasing 10 to 12 requires 2 moves (12 is divisible by 4)." },
      { input: [13, 9], output: 5, explanation: "Increasing 13 to 18 requires 5 moves." },
    ],
    tests: [
      { input: [100, 13], output: 4 },
      { input: [123, 456], output: 333 },
      { input: [92, 46], output: 0 },
      { input: [1, 1], output: 0 },
      { input: [1, 2], output: 1 },
      { input: [7, 5], output: 3 },
    ],
    testCases: [
      { input: [100, 13], output: 4 },
      { input: [123, 456], output: 333 },
      { input: [92, 46], output: 0 },
      { input: [1, 1], output: 0 },
      { input: [1, 2], output: 1 },
      { input: [7, 5], output: 3 },
    ],
    hints: [
      "Ask how far a is past the last multiple of b. What does the remainder tell you?",
      "If the remainder is zero, a is already a multiple. Otherwise you have to climb to the next multiple.",
      "Subtract the remainder from b to get the gap to the next multiple of b.",
      "When the remainder is zero, b minus the remainder would give b instead of 0, so handle that case separately.",
    ],
    solution: {
      idea: ["If a % b == 0, return 0. Otherwise, the next multiple of b is at distance b - (a % b)."],
      complexity: "O(1) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int movesToDivisible(int a, int b) {
        int rem = a % b;
        return rem == 0 ? 0 : b - rem;
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int movesToDivisible(int a, int b) {
        int rem = a % b;
        return rem == 0 ? 0 : b - rem;
    }
};
`,
  },
  {
    id: "c-cf-467a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/467/A",
    title: "George and Accommodation (Codeforces 467A)",
    difficulty: "easy",
    pattern: "cses-codeforces",
    description: "Count the number of dorm rooms that have room for at least two more people.",
    inputFormat: "rooms: int[][] where each element is [p, q] (current occupants and room capacity).",
    outputFormat: "int: number of rooms where q - p >= 2.",
    statement: [
      "George and Alex want to move into a dormitory room together.",
      "There are several rooms available. For each room, you are given p (the number of people already living in it) and q (the room's total capacity).",
      "Return the number of rooms where both George and Alex can move in (i.e., at least 2 free beds: q - p >= 2).",
      "Rewritten for this app from Codeforces 467A as a function.",
    ],
    constraints: ["1 <= rooms.length <= 100", "0 <= p <= q <= 100"],
    fn: { name: "countAvailableRooms", params: [{ name: "rooms", type: "int[][]" }], returns: "int" },
    examples: [
      { input: [[[1, 1], [2, 2], [3, 3]]], output: 0, explanation: "All rooms are completely full." },
      { input: [[[1, 10], [0, 10], [10, 10]]], output: 2, explanation: "First room has 9 free beds, second has 10, third is full." },
    ],
    sampleCases: [
      { input: [[[1, 1], [2, 2], [3, 3]]], output: 0, explanation: "All rooms are completely full." },
      { input: [[[1, 10], [0, 10], [10, 10]]], output: 2, explanation: "First room has 9 free beds, second has 10, third is full." },
    ],
    tests: [
      { input: [[[0, 2]]], output: 1 },
      { input: [[[1, 2]]], output: 0 },
      { input: [[[0, 1]]], output: 0 },
      { input: [[[2, 5], [1, 3], [4, 4]]], output: 2 },
      { input: [[[5, 10], [4, 5]]], output: 1 },
      { input: [[[0, 0]]], output: 0 },
    ],
    testCases: [
      { input: [[[0, 2]]], output: 1 },
      { input: [[[1, 2]]], output: 0 },
      { input: [[[0, 1]]], output: 0 },
      { input: [[[2, 5], [1, 3], [4, 4]]], output: 2 },
      { input: [[[5, 10], [4, 5]]], output: 1 },
      { input: [[[0, 0]]], output: 0 },
    ],
    hints: [
      "For each room, what does the question require? How many free beds does it need?",
      "Two people need two beds, so a room works only if at least two beds are free.",
      "Loop through the rooms, compare capacity minus occupants with two, and count the rooms that pass.",
      "Check for at least two free beds, not exactly two. A room with more free beds also works.",
    ],
    solution: {
      idea: ["Iterate through all rooms and count those where the available capacity (q - p) is at least 2."],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int countAvailableRooms(vector<vector<int>> rooms) {
        int ans = 0;
        for (const auto& r : rooms) {
            if (r[1] - r[0] >= 2) ans++;
        }
        return ans;
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int countAvailableRooms(vector<vector<int>> rooms) {
        int ans = 0;
        for (const auto& r : rooms) {
            if (r[1] - r[0] >= 2) ans++;
        }
        return ans;
    }
};
`,
  },
  {
    id: "c-cf-136a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/136/A",
    title: "Presents (Codeforces 136A)",
    difficulty: "easy",
    pattern: "cses-codeforces",
    description: "Invert a 1-based permutation to find who gave a gift to each person.",
    inputFormat: "p: int[] of length n where p[i] is the person who received a gift from person i + 1.",
    outputFormat: "int[] of length n where the j-th element is the person who gave a gift to person j + 1.",
    statement: [
      "Little Petya organized a New Year's party with n friends numbered 1 through n.",
      "You are given an array p where p[i] is the 1-based index of the friend who received a gift from friend (i + 1).",
      "Return an array where the j-th entry is the 1-based index of the friend who gave a gift to friend (j + 1). This is the inverse permutation.",
      "Rewritten for this app from Codeforces 136A as a function.",
    ],
    constraints: ["1 <= p.length <= 100", "p is a permutation of integers from 1 to n"],
    fn: { name: "reconstructGiftGivers", params: [{ name: "p", type: "int[]" }], returns: "int[]" },
    examples: [
      { input: [[2, 3, 4, 1]], output: [4, 1, 2, 3], explanation: "1 gave to 2, 2 gave to 3, 3 gave to 4, 4 gave to 1. Inverting gives [4, 1, 2, 3]." },
      { input: [[1, 3, 2]], output: [1, 3, 2], explanation: "1 gave to 1, 2 gave to 3, 3 gave to 2." },
    ],
    sampleCases: [
      { input: [[2, 3, 4, 1]], output: [4, 1, 2, 3], explanation: "1 gave to 2, 2 gave to 3, 3 gave to 4, 4 gave to 1. Inverting gives [4, 1, 2, 3]." },
      { input: [[1, 3, 2]], output: [1, 3, 2], explanation: "1 gave to 1, 2 gave to 3, 3 gave to 2." },
    ],
    tests: [
      { input: [[1, 2, 3, 4]], output: [1, 2, 3, 4] },
      { input: [[1]], output: [1] },
      { input: [[2, 1]], output: [2, 1] },
      { input: [[3, 1, 2]], output: [2, 3, 1] },
      { input: [[4, 3, 2, 1]], output: [4, 3, 2, 1] },
      { input: [[2, 4, 1, 3]], output: [3, 1, 4, 2] },
    ],
    testCases: [
      { input: [[1, 2, 3, 4]], output: [1, 2, 3, 4] },
      { input: [[1]], output: [1] },
      { input: [[2, 1]], output: [2, 1] },
      { input: [[3, 1, 2]], output: [2, 3, 1] },
      { input: [[4, 3, 2, 1]], output: [4, 3, 2, 1] },
      { input: [[2, 4, 1, 3]], output: [3, 1, 4, 2] },
    ],
    hints: [
      "Think about the reverse question. For a person who received a gift, how could you find out who gave it?",
      "Each giver appears once in the input, so you can fill the answer in a single pass by writing each giver into their receiver's slot.",
      "Create an answer array of the same size and, for every giver i, store i at the index of the receiver.",
      "The input numbers start at 1, but arrays start at 0. Shift the index by one when you store and read.",
    ],
    solution: {
      idea: ["Construct the inverse permutation: for each 0 <= i < n, place i + 1 at index p[i] - 1."],
      complexity: "O(n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> reconstructGiftGivers(vector<int> p) {
        int n = p.size();
        vector<int> ans(n);
        for (int i = 0; i < n; i++) {
            ans[p[i] - 1] = i + 1;
        }
        return ans;
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> reconstructGiftGivers(vector<int> p) {
        int n = p.size();
        vector<int> ans(n);
        for (int i = 0; i < n; i++) {
            ans[p[i] - 1] = i + 1;
        }
        return ans;
    }
};
`,
  },
  {
    id: "c-cf-148a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/148/A",
    title: "Insomnia Cure (Codeforces 148A)",
    difficulty: "easy",
    pattern: "cses-codeforces",
    description: "Count how many dragons numbered 1 through d are divisible by at least one of k, l, m, or n.",
    inputFormat: "k: int, l: int, m: int, n: int, d: int.",
    outputFormat: "int: count of damaged dragons.",
    statement: [
      "One princess has trouble falling asleep, so she imagines d dragons numbered 1 through d.",
      "Every k-th dragon was punched in the face; every l-th got its tail shut in the balcony door; every m-th had its paws trampled; every n-th was threatened.",
      "Return the total number of damaged dragons (dragons whose index is divisible by at least one of k, l, m, or n).",
      "Rewritten for this app from Codeforces 148A as a function.",
    ],
    constraints: ["1 <= k, l, m, n <= 10", "1 <= d <= 100000"],
    fn: { name: "countDamagedDragons", params: [{ name: "k", type: "int" }, { name: "l", type: "int" }, { name: "m", type: "int" }, { name: "n", type: "int" }, { name: "d", type: "int" }], returns: "int" },
    examples: [
      { input: [1, 2, 3, 4, 12], output: 12, explanation: "Since k = 1, every dragon from 1 to 12 is damaged." },
      { input: [2, 3, 4, 5, 24], output: 17, explanation: "Dragons 1, 7, 11, 13, 17, 19, 23 (7 dragons) escaped; 24 - 7 = 17." },
    ],
    sampleCases: [
      { input: [1, 2, 3, 4, 12], output: 12, explanation: "Since k = 1, every dragon from 1 to 12 is damaged." },
      { input: [2, 3, 4, 5, 24], output: 17, explanation: "Dragons 1, 7, 11, 13, 17, 19, 23 (7 dragons) escaped; 24 - 7 = 17." },
    ],
    tests: [
      { input: [2, 4, 6, 8, 10], output: 5 },
      { input: [10, 10, 10, 10, 9], output: 0 },
      { input: [5, 5, 5, 5, 5], output: 1 },
      { input: [3, 5, 7, 11, 30], output: 19 },
      { input: [2, 3, 5, 7, 10], output: 9 },
      { input: [4, 4, 4, 4, 8], output: 2 },
    ],
    testCases: [
      { input: [2, 4, 6, 8, 10], output: 5 },
      { input: [10, 10, 10, 10, 9], output: 0 },
      { input: [5, 5, 5, 5, 5], output: 1 },
      { input: [3, 5, 7, 11, 30], output: 19 },
      { input: [2, 3, 5, 7, 10], output: 9 },
      { input: [4, 4, 4, 4, 8], output: 2 },
    ],
    hints: [
      "The number of dragons is at most 100,000. What is the simplest thing you could do with each of them?",
      "A dragon is damaged if its number is a multiple of at least one of the four given numbers.",
      "Loop through the dragons, run the four divisibility tests for each one, and count the ones that pass.",
      "The numbers are small enough that a plain loop is fast. A formula with overlaps is only needed for huge inputs.",
    ],
    solution: {
      idea: ["Iterate i from 1 to d. If i is divisible by k, l, m, or n, increment the damaged count."],
      complexity: "O(d) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int countDamagedDragons(int k, int l, int m, int n, int d) {
        int count = 0;
        for (int i = 1; i <= d; i++) {
            if (i % k == 0 || i % l == 0 || i % m == 0 || i % n == 0) {
                count++;
            }
        }
        return count;
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int countDamagedDragons(int k, int l, int m, int n, int d) {
        int count = 0;
        for (int i = 1; i <= d; i++) {
            if (i % k == 0 || i % l == 0 || i % m == 0 || i % n == 0) {
                count++;
            }
        }
        return count;
    }
};
`,
  },
  {
    id: "c-cf-443a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/443/A",
    title: "Anton and Letters (Codeforces 443A)",
    difficulty: "easy",
    pattern: "cses-codeforces",
    description: "Count distinct lowercase English letters contained in a curly-brace-enclosed set representation.",
    inputFormat: "s: string representing a set, e.g. '{a, b, c}'.",
    outputFormat: "int: number of distinct letters.",
    statement: [
      "Anton recently learned about sets and wrote down a set of letters in standard mathematical notation: '{a, b, c}' or '{}'.",
      "Your task is to find the number of distinct lowercase Latin letters in Anton's set.",
      "Rewritten for this app from Codeforces 443A as a function.",
    ],
    constraints: ["2 <= s.length <= 1000", "s begins with '{' and ends with '}'", "Elements are separated by commas and spaces"],
    fn: { name: "countDistinctLetters", params: [{ name: "s", type: "string" }], returns: "int" },
    examples: [
      { input: ["{a, b, c}"], output: 3, explanation: "There are three distinct letters: 'a', 'b', and 'c'." },
      { input: ["{a, b, c, c}"], output: 3, explanation: "'c' is repeated, so there are still only 3 distinct letters." },
    ],
    sampleCases: [
      { input: ["{a, b, c}"], output: 3, explanation: "There are three distinct letters: 'a', 'b', and 'c'." },
      { input: ["{a, b, c, c}"], output: 3, explanation: "'c' is repeated, so there are still only 3 distinct letters." },
    ],
    tests: [
      { input: ["{}"], output: 0 },
      { input: ["{a}"], output: 1 },
      { input: ["{z, z, z}"], output: 1 },
      { input: ["{x, y, z, w}"], output: 4 },
      { input: ["{b, a, b, a}"], output: 2 },
      { input: ["{m, n, o, p, q, r}"], output: 6 },
    ],
    testCases: [
      { input: ["{}"], output: 0 },
      { input: ["{a}"], output: 1 },
      { input: ["{z, z, z}"], output: 1 },
      { input: ["{x, y, z, w}"], output: 4 },
      { input: ["{b, a, b, a}"], output: 2 },
      { input: ["{m, n, o, p, q, r}"], output: 6 },
    ],
    hints: [
      "The braces, commas and spaces are noise. What is the only thing you need to count?",
      "You only care about distinct lowercase letters, so a letter that repeats should count once.",
      "Mark each lowercase letter in a set or a table of 26 true or false slots, then count the marked slots.",
      "Ignore the braces and spaces. The empty set has no letters, so its answer is zero.",
    ],
    solution: {
      idea: ["Filter characters in the string for lowercase Latin letters 'a' through 'z' and collect them in a set."],
      complexity: "O(n) time, O(1) auxiliary space (at most 26 elements).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int countDistinctLetters(string s) {
        unordered_set<char> letters;
        for (char c : s) {
            if (c >= 'a' && c <= 'z') {
                letters.insert(c);
            }
        }
        return letters.size();
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int countDistinctLetters(string s) {
        unordered_set<char> letters;
        for (char c : s) {
            if (c >= 'a' && c <= 'z') {
                letters.insert(c);
            }
        }
        return letters.size();
    }
};
`,
  },
  {
    id: "c-cf-520a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/520/A",
    title: "Pangram (Codeforces 520A)",
    difficulty: "easy",
    pattern: "cses-codeforces",
    description: "Determine whether a string contains every letter of the English alphabet at least once (case-insensitive).",
    inputFormat: "s: string consisting of English letters.",
    outputFormat: "bool: true if s is a pangram, false otherwise.",
    statement: [
      "A word or a sentence in some language is called a pangram if all the characters of the alphabet of this language appear at least once in the word.",
      "Case is ignored: 'A' and 'a' represent the same letter of the Latin alphabet.",
      "Return true if the given string s is a pangram containing all 26 English letters, and false otherwise.",
      "Rewritten for this app from Codeforces 520A as a function.",
    ],
    constraints: ["1 <= s.length <= 1000", "s contains uppercase and lowercase English letters"],
    fn: { name: "isPangramString", params: [{ name: "s", type: "string" }], returns: "bool" },
    examples: [
      { input: ["TheQuickBrownFoxJumpsOverTheLazyDog"], output: true, explanation: "Every letter from 'a' to 'z' is present." },
      { input: ["toosmallword"], output: false, explanation: "Many letters such as 'a', 'b', 'c', etc. are missing." },
    ],
    sampleCases: [
      { input: ["TheQuickBrownFoxJumpsOverTheLazyDog"], output: true, explanation: "Every letter from 'a' to 'z' is present." },
      { input: ["toosmallword"], output: false, explanation: "Many letters such as 'a', 'b', 'c', etc. are missing." },
    ],
    tests: [
      { input: ["abcdefghijklmnopqrstuvwxyz"], output: true },
      { input: ["BCDEFGHIJKLMNOPQRSTUVWXYZ"], output: false },
      { input: ["ABCDEFGHIJKLMNOPQRSTUVWXYZ"], output: true },
      { input: ["PackMyBoxWithFiveDozenLiquorJugs"], output: true },
      { input: ["short"], output: false },
      { input: ["QuickzephyrsblowvexingdaftJim"], output: true },
    ],
    testCases: [
      { input: ["abcdefghijklmnopqrstuvwxyz"], output: true },
      { input: ["BCDEFGHIJKLMNOPQRSTUVWXYZ"], output: false },
      { input: ["ABCDEFGHIJKLMNOPQRSTUVWXYZ"], output: true },
      { input: ["PackMyBoxWithFiveDozenLiquorJugs"], output: true },
      { input: ["short"], output: false },
      { input: ["QuickzephyrsblowvexingdaftJim"], output: true },
    ],
    hints: [
      "What does a pangram need? Which letters must all be present, and how many distinct letters is that?",
      "Letter case does not matter, so A and a count as the same letter. A short text cannot cover all 26 letters.",
      "Lowercase each letter as you read it and record it in a set or a table of 26 slots. Then check that all 26 are filled.",
      "A string of 26 or more letters can still miss one letter if some letters repeat, so check all 26 slots, not the length.",
    ],
    solution: {
      idea: ["Collect unique lowercase letters into a set and check if the set contains all 26 letters."],
      complexity: "O(n) time, O(1) auxiliary space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool isPangramString(string s) {
        unordered_set<char> seen;
        for (char c : s) {
            seen.insert(tolower(c));
        }
        return seen.size() == 26;
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool isPangramString(string s) {
        unordered_set<char> seen;
        for (char c : s) {
            seen.insert(tolower(c));
        }
        return seen.size() == 26;
    }
};
`,
  },
  {
    id: "c-cf-996a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/996/A",
    title: "Hit the Lottery (Codeforces 996A)",
    difficulty: "easy",
    pattern: "cses-codeforces",
    description: "Find the minimum number of bills needed to withdraw n dollars using denominations 100, 20, 10, 5, 1.",
    inputFormat: "n: int representing the total amount of money.",
    outputFormat: "int: minimum total bills.",
    statement: [
      "Allen has a lot of money in his bank account after winning a lottery and wants to withdraw n dollars.",
      "The bank produces bills of values 1, 5, 10, 20, and 100 dollars. Allen wants to receive as few total bills as possible.",
      "Return the minimum number of bills that sum up to n.",
      "Rewritten for this app from Codeforces 996A as a function.",
    ],
    constraints: ["1 <= n <= 10^9"],
    fn: { name: "minimumBills", params: [{ name: "n", type: "int" }], returns: "int" },
    examples: [
      { input: [125], output: 3, explanation: "One $100 bill, one $20 bill, and one $5 bill." },
      { input: [43], output: 5, explanation: "Two $20 bills and three $1 bills." },
    ],
    sampleCases: [
      { input: [125], output: 3, explanation: "One $100 bill, one $20 bill, and one $5 bill." },
      { input: [43], output: 5, explanation: "Two $20 bills and three $1 bills." },
    ],
    tests: [
      { input: [1000000000], output: 10000000 },
      { input: [1], output: 1 },
      { input: [100], output: 1 },
      { input: [99], output: 10 },
      { input: [10], output: 1 },
      { input: [4], output: 4 },
    ],
    testCases: [
      { input: [1000000000], output: 10000000 },
      { input: [1], output: 1 },
      { input: [100], output: 1 },
      { input: [99], output: 10 },
      { input: [10], output: 1 },
      { input: [4], output: 4 },
    ],
    hints: [
      "Imagine paying out money with as few bills as possible. Which bill should you reach for first?",
      "Each large bill is worth several small ones, so use as many of the largest bill as the amount allows.",
      "Go through the bill values from largest to smallest, take as many of each as fit, and carry the remainder to the next size.",
      "Some bill counts will be zero, and the loop should still work for amounts like 100 or 1.",
    ],
    solution: {
      idea: ["Greedily take the largest available bill denominations: 100, 20, 10, 5, and 1 using integer division and modulo."],
      complexity: "O(1) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int minimumBills(int n) {
        int bills = 0;
        int denom[] = {100, 20, 10, 5, 1};
        for (int d : denom) {
            bills += n / d;
            n %= d;
        }
        return bills;
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int minimumBills(int n) {
        int bills = 0;
        int denom[] = {100, 20, 10, 5, 1};
        for (int d : denom) {
            bills += n / d;
            n %= d;
        }
        return bills;
    }
};
`,
  },
  {
    id: "c-cf-705a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/705/A",
    title: "Hulk (Codeforces 705A)",
    difficulty: "easy",
    pattern: "cses-codeforces",
    description: "Generate Hulk's alternating emotional phrase with n layers ('I hate', 'I love') joined by 'that' and ending with 'it'.",
    inputFormat: "n: int representing the number of emotion layers.",
    outputFormat: "string: the complete constructed phrase.",
    statement: [
      "Dr. Banner's inner feelings alternate between hate and love in successive layers.",
      "For n = 1: 'I hate it'. For n = 2: 'I hate that I love it'. For n = 3: 'I hate that I love that I hate it', and so on.",
      "Odd layers use 'I hate', even layers use 'I love'. Consecutive layers are separated by ' that ', and the entire phrase terminates with ' it'.",
      "Rewritten for this app from Codeforces 705A as a function.",
    ],
    constraints: ["1 <= n <= 100"],
    fn: { name: "hulkFeelings", params: [{ name: "n", type: "int" }], returns: "string" },
    examples: [
      { input: [1], output: "I hate it", explanation: "One single layer ending with 'it'." },
      { input: [2], output: "I hate that I love it", explanation: "Two layers alternating between hate and love." },
    ],
    sampleCases: [
      { input: [1], output: "I hate it", explanation: "One single layer ending with 'it'." },
      { input: [2], output: "I hate that I love it", explanation: "Two layers alternating between hate and love." },
    ],
    tests: [
      { input: [3], output: "I hate that I love that I hate it" },
      { input: [4], output: "I hate that I love that I hate that I love it" },
      { input: [5], output: "I hate that I love that I hate that I love that I hate it" },
      { input: [6], output: "I hate that I love that I hate that I love that I hate that I love it" },
      { input: [7], output: "I hate that I love that I hate that I love that I hate that I love that I hate it" },
      { input: [8], output: "I hate that I love that I hate that I love that I hate that I love that I hate that I love it" },
    ],
    testCases: [
      { input: [3], output: "I hate that I love that I hate it" },
      { input: [4], output: "I hate that I love that I hate that I love it" },
      { input: [5], output: "I hate that I love that I hate that I love that I hate it" },
      { input: [6], output: "I hate that I love that I hate that I love that I hate that I love it" },
      { input: [7], output: "I hate that I love that I hate that I love that I hate that I love that I hate it" },
      { input: [8], output: "I hate that I love that I hate that I love that I hate that I love that I hate that I love it" },
    ],
    hints: [
      "Write out n = 1, 2 and 3 and look at the pattern. What changes from one layer to the next?",
      "The verb alternates between hate and love from layer to layer, and the phrase always ends with ' it'.",
      "Loop from layer 1 to n. Odd layers add I hate, even layers add I love, and ' that ' goes between layers.",
      "Only the last layer is followed by ' it'. Be careful with spaces so there is no double space at the joins.",
    ],
    solution: {
      idea: ["Construct the sentence by alternating 'I hate' and 'I love' across n layers, joined by ' that ' and ending with ' it'."],
      complexity: "O(n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string hulkFeelings(int n) {
        string res = "";
        for (int i = 1; i <= n; i++) {
            if (i > 1) res += " that ";
            if (i % 2 == 1) res += "I hate";
            else res += "I love";
        }
        res += " it";
        return res;
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string hulkFeelings(int n) {
        string res = "";
        for (int i = 1; i <= n; i++) {
            if (i > 1) res += " that ";
            if (i % 2 == 1) res += "I hate";
            else res += "I love";
        }
        res += " it";
        return res;
    }
};
`,
  },
  {
    id: "c-cf-1335a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/1335/A",
    title: "Candies and Two Sisters (Codeforces 1335A)",
    difficulty: "easy",
    pattern: "cses-codeforces",
    description: "Calculate the number of ways to distribute n candies to two sisters Alice (a) and Betty (b) such that a > b > 0.",
    inputFormat: "n: int representing total candies.",
    outputFormat: "int: number of valid distributions.",
    statement: [
      "Two sisters Alice and Betty have n candies. You need to distribute all n candies between them such that:",
      "Alice gets a candies, Betty gets b candies, both a and b are positive integers, a + b = n, and Alice gets strictly more candies than Betty (a > b).",
      "Return the number of ways to distribute the candies.",
      "Rewritten for this app from Codeforces 1335A as a function.",
    ],
    constraints: ["1 <= n <= 10^9"],
    fn: { name: "waysToDistributeCandies", params: [{ name: "n", type: "int" }], returns: "int" },
    examples: [
      { input: [7], output: 3, explanation: "Valid pairs (a, b) are (6, 1), (5, 2), and (4, 3)." },
      { input: [1], output: 0, explanation: "Cannot distribute 1 candy to two sisters such that both get positive amounts." },
    ],
    sampleCases: [
      { input: [7], output: 3, explanation: "Valid pairs (a, b) are (6, 1), (5, 2), and (4, 3)." },
      { input: [1], output: 0, explanation: "Cannot distribute 1 candy to two sisters such that both get positive amounts." },
    ],
    tests: [
      { input: [2], output: 0 },
      { input: [3], output: 1 },
      { input: [4], output: 1 },
      { input: [5], output: 2 },
      { input: [6], output: 2 },
      { input: [1000000000], output: 499999999 },
    ],
    testCases: [
      { input: [2], output: 0 },
      { input: [3], output: 1 },
      { input: [4], output: 1 },
      { input: [5], output: 2 },
      { input: [6], output: 2 },
      { input: [1000000000], output: 499999999 },
    ],
    hints: [
      "Set up the condition. Betty gets b candies and Alice gets the rest. What is the largest b that is allowed?",
      "Betty must have at least one candy and strictly less than half of the total, so her count stays below n divided by 2.",
      "Valid values for Betty run from 1 up to the largest whole number below half of n. Count those values.",
      "For even n the largest b is n over 2 minus 1, and for odd n it is the rounded-down half. Integer division of n minus 1 by 2 covers both.",
    ],
    solution: {
      idea: ["Betty can take anywhere from 1 to floor((n - 1) / 2) candies, leaving Alice with strictly more. The formula is (n - 1) / 2."],
      complexity: "O(1) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int waysToDistributeCandies(int n) {
        if (n <= 2) return 0;
        return (n - 1) / 2;
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int waysToDistributeCandies(int n) {
        if (n <= 2) return 0;
        return (n - 1) / 2;
    }
};
`,
  },
  {
    id: "c-cf-479a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/479/A",
    title: "Expression (Codeforces 479A)",
    difficulty: "medium",
    pattern: "cses-codeforces",
    description: "Maximize the value of an arithmetic expression by inserting '+' and '*' operators and parentheses among three integers a, b, and c.",
    inputFormat: "a: int, b: int, c: int in fixed order.",
    outputFormat: "int: maximum possible expression value.",
    statement: [
      "Petya is given three integers a, b, and c in that exact order.",
      "He can insert '+' and '*' operations between the numbers and use brackets as needed without changing the order of the numbers.",
      "Find the maximum value he can obtain from the expression.",
      "Rewritten for this app from Codeforces 479A as a function.",
    ],
    constraints: ["1 <= a, b, c <= 10"],
    fn: { name: "maximizeExpression", params: [{ name: "a", type: "int" }, { name: "b", type: "int" }, { name: "c", type: "int" }], returns: "int" },
    examples: [
      { input: [1, 2, 3], output: 9, explanation: "(1 + 2) * 3 = 9." },
      { input: [2, 10, 3], output: 60, explanation: "2 * 10 * 3 = 60." },
    ],
    sampleCases: [
      { input: [1, 2, 3], output: 9, explanation: "(1 + 2) * 3 = 9." },
      { input: [2, 10, 3], output: 60, explanation: "2 * 10 * 3 = 60." },
    ],
    tests: [
      { input: [1, 1, 1], output: 3 },
      { input: [2, 1, 2], output: 6 },
      { input: [10, 10, 10], output: 1000 },
      { input: [1, 1, 10], output: 20 },
      { input: [10, 1, 1], output: 20 },
      { input: [3, 3, 3], output: 27 },
    ],
    testCases: [
      { input: [1, 1, 1], output: 3 },
      { input: [2, 1, 2], output: 6 },
      { input: [10, 10, 10], output: 1000 },
      { input: [1, 1, 10], output: 20 },
      { input: [10, 1, 1], output: 20 },
      { input: [3, 3, 3], output: 27 },
    ],
    hints: [
      "There are only three numbers. How many different ways could you combine them with plus, times and brackets?",
      "The best value comes from one of a small, fixed set of groupings, so you can list them all and compare.",
      "Evaluate the six possible placements of plus, times and brackets on a, b and c, then return the largest value.",
      "Include the all-plus and all-times forms. With values from 1 to 10 there is no risk of overflow.",
    ],
    solution: {
      idea: ["Evaluate all 6 possible parenthesized expressions with '+' and '*' and return the maximum."],
      complexity: "O(1) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int maximizeExpression(int a, int b, int c) {
        int v1 = a + b + c;
        int v2 = a * b * c;
        int v3 = (a + b) * c;
        int v4 = a * (b + c);
        int v5 = a + b * c;
        int v6 = a * b + c;
        return max({v1, v2, v3, v4, v5, v6});
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int maximizeExpression(int a, int b, int c) {
        int v1 = a + b + c;
        int v2 = a * b * c;
        int v3 = (a + b) * c;
        int v4 = a * (b + c);
        int v5 = a + b * c;
        int v6 = a * b + c;
        return max({v1, v2, v3, v4, v5, v6});
    }
};
`,
  },

  // ==========================================
  // KATTIS (16 problems)
  // ==========================================
  {
    id: "c-kattis-fizzbuzz",
    source: "kattis",
    url: "https://open.kattis.com/problems/fizzbuzz",
    title: "FizzBuzz (Kattis)",
    difficulty: "easy",
    pattern: "cses-kattis",
    description: "Generate the FizzBuzz sequence for integers from 1 to n with divisibility rules for x and y.",
    inputFormat: "x: int, y: int, n: int.",
    outputFormat: "string[]: array of length n containing numbers, 'Fizz', 'Buzz', or 'FizzBuzz'.",
    statement: [
      "In the game FizzBuzz, players count from 1 to n, replacing certain numbers:",
      "If the number is divisible by x, say 'Fizz'. If divisible by y, say 'Buzz'. If divisible by both x and y, say 'FizzBuzz'. Otherwise, say the number itself.",
      "Return the sequence of strings for all numbers from 1 to n.",
      "Rewritten for this app from Kattis fizzbuzz as a function.",
    ],
    constraints: ["1 <= x < y <= n <= 100"],
    fn: { name: "generateFizzBuzz", params: [{ name: "x", type: "int" }, { name: "y", type: "int" }, { name: "n", type: "int" }], returns: "string[]" },
    examples: [
      { input: [2, 3, 7], output: ["1", "Fizz", "Buzz", "Fizz", "5", "FizzBuzz", "7"], explanation: "Multiples of 2 are Fizz, 3 are Buzz, 6 is FizzBuzz." },
      { input: [2, 4, 7], output: ["1", "Fizz", "3", "FizzBuzz", "5", "Fizz", "7"], explanation: "4 is divisible by both 2 and 4, so it is FizzBuzz." },
    ],
    sampleCases: [
      { input: [2, 3, 7], output: ["1", "Fizz", "Buzz", "Fizz", "5", "FizzBuzz", "7"], explanation: "Multiples of 2 are Fizz, 3 are Buzz, 6 is FizzBuzz." },
      { input: [2, 4, 7], output: ["1", "Fizz", "3", "FizzBuzz", "5", "Fizz", "7"], explanation: "4 is divisible by both 2 and 4, so it is FizzBuzz." },
    ],
    tests: [
      { input: [3, 5, 5], output: ["1", "2", "Fizz", "4", "Buzz"] },
      { input: [1, 1, 3], output: ["FizzBuzz", "FizzBuzz", "FizzBuzz"] },
      { input: [5, 7, 4], output: ["1", "2", "3", "4"] },
      { input: [2, 5, 10], output: ["1", "Fizz", "3", "Fizz", "Buzz", "Fizz", "7", "Fizz", "9", "FizzBuzz"] },
      { input: [3, 4, 12], output: ["1", "2", "Fizz", "Buzz", "5", "Fizz", "7", "Buzz", "Fizz", "10", "11", "FizzBuzz"] },
      { input: [2, 3, 1], output: ["1"] },
    ],
    testCases: [
      { input: [3, 5, 5], output: ["1", "2", "Fizz", "4", "Buzz"] },
      { input: [1, 1, 3], output: ["FizzBuzz", "FizzBuzz", "FizzBuzz"] },
      { input: [5, 7, 4], output: ["1", "2", "3", "4"] },
      { input: [2, 5, 10], output: ["1", "Fizz", "3", "Fizz", "Buzz", "Fizz", "7", "Fizz", "9", "FizzBuzz"] },
      { input: [3, 4, 12], output: ["1", "2", "Fizz", "Buzz", "5", "Fizz", "7", "Buzz", "Fizz", "10", "11", "FizzBuzz"] },
      { input: [2, 3, 1], output: ["1"] },
    ],
    hints: [
      "What is the same for every number from 1 to n, and what changes depending on divisibility?",
      "A number divisible by both x and y needs its own answer, so the combined case has to be handled before the single cases.",
      "Loop through the numbers. Check the both case first, then the single cases, and fall back to printing the number itself.",
      "Checking divisibility by x first would print Fizz instead of FizzBuzz for a number divisible by both.",
    ],
    solution: {
      idea: ["Iterate 1..n, checking modulo against x and y to push the correct string."],
      complexity: "O(n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<string> generateFizzBuzz(int x, int y, int n) {
        vector<string> ans;
        for (int i = 1; i <= n; i++) {
            bool fx = (i % x == 0);
            bool fy = (i % y == 0);
            if (fx && fy) ans.push_back("FizzBuzz");
            else if (fx) ans.push_back("Fizz");
            else if (fy) ans.push_back("Buzz");
            else ans.push_back(to_string(i));
        }
        return ans;
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<string> generateFizzBuzz(int x, int y, int n) {
        vector<string> ans;
        for (int i = 1; i <= n; i++) {
            bool fx = (i % x == 0);
            bool fy = (i % y == 0);
            if (fx && fy) ans.push_back("FizzBuzz");
            else if (fx) ans.push_back("Fizz");
            else if (fy) ans.push_back("Buzz");
            else ans.push_back(to_string(i));
        }
        return ans;
    }
};
`,
  },
  {
    id: "c-kattis-nastyhacks",
    source: "kattis",
    url: "https://open.kattis.com/problems/nastyhacks",
    title: "Nasty Hacks (Kattis)",
    difficulty: "easy",
    pattern: "cses-kattis",
    description: "Determine whether a company should advertise by comparing expected profit with advertising costs.",
    inputFormat: "r: int (revenue without advertising), e: int (expected revenue with advertising), c: int (cost of advertising).",
    outputFormat: "string: 'advertise', 'do not advertise', or 'does not matter'.",
    statement: [
      "A startup wants to decide whether advertising is profitable.",
      "You are given r (expected revenue without advertising), e (expected revenue with advertising), and c (cost of advertising).",
      "Net revenue with advertising is e - c. Return 'advertise' if e - c > r, 'do not advertise' if e - c < r, or 'does not matter' if e - c == r.",
      "Rewritten for this app from Kattis nastyhacks as a function.",
    ],
    constraints: ["-10^6 <= r, e <= 10^6", "0 <= c <= 10^6"],
    fn: { name: "nastyHacksDecision", params: [{ name: "r", type: "int" }, { name: "e", type: "int" }, { name: "c", type: "int" }], returns: "string" },
    examples: [
      { input: [0, 100, 70], output: "advertise", explanation: "100 - 70 = 30 > 0, so advertising is profitable." },
      { input: [100, 130, 30], output: "does not matter", explanation: "130 - 30 = 100 == 100, so revenue is identical." },
    ],
    sampleCases: [
      { input: [0, 100, 70], output: "advertise", explanation: "100 - 70 = 30 > 0, so advertising is profitable." },
      { input: [100, 130, 30], output: "does not matter", explanation: "130 - 30 = 100 == 100, so revenue is identical." },
    ],
    tests: [
      { input: [-500, -700, 1000], output: "do not advertise" },
      { input: [10, 20, 5], output: "advertise" },
      { input: [10, 20, 10], output: "does not matter" },
      { input: [10, 20, 15], output: "do not advertise" },
      { input: [0, 0, 0], output: "does not matter" },
      { input: [100, 50, 10], output: "do not advertise" },
    ],
    testCases: [
      { input: [-500, -700, 1000], output: "do not advertise" },
      { input: [10, 20, 5], output: "advertise" },
      { input: [10, 20, 10], output: "does not matter" },
      { input: [10, 20, 15], output: "do not advertise" },
      { input: [0, 0, 0], output: "does not matter" },
      { input: [100, 50, 10], output: "do not advertise" },
    ],
    hints: [
      "Compare the two options in money. What is the real profit with advertising once its cost is taken off?",
      "Subtract the advertising cost from the revenue with ads, then compare the result with the revenue without ads.",
      "Compare that net figure with r. Greater means advertise, smaller means do not, and equal means it does not matter.",
      "The cost is subtracted from the revenue with ads, not from the revenue without ads.",
    ],
    solution: {
      idea: ["Compute net = e - c and compare with r."],
      complexity: "O(1) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string nastyHacksDecision(int r, int e, int c) {
        int net = e - c;
        if (net > r) return "advertise";
        if (net == r) return "does not matter";
        return "do not advertise";
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string nastyHacksDecision(int r, int e, int c) {
        int net = e - c;
        if (net > r) return "advertise";
        if (net == r) return "does not matter";
        return "do not advertise";
    }
};
`,
  },
  {
    id: "c-kattis-quadrant",
    source: "kattis",
    url: "https://open.kattis.com/problems/quadrant",
    title: "Quadrant Selection (Kattis)",
    difficulty: "easy",
    pattern: "cses-kattis",
    description: "Determine which of the four Cartesian quadrants a given point (x, y) lies in.",
    inputFormat: "x: int, y: int with x != 0 and y != 0.",
    outputFormat: "int: quadrant number (1, 2, 3, or 4).",
    statement: [
      "A common problem in mathematics is to determine the quadrant of a given point (x, y) on a 2D Cartesian plane:",
      "Quadrant 1: x > 0 and y > 0. Quadrant 2: x < 0 and y > 0. Quadrant 3: x < 0 and y < 0. Quadrant 4: x > 0 and y < 0.",
      "Given non-zero coordinates x and y, return the quadrant number.",
      "Rewritten for this app from Kattis quadrant as a function.",
    ],
    constraints: ["-1000 <= x, y <= 1000", "x != 0", "y != 0"],
    fn: { name: "selectQuadrant", params: [{ name: "x", type: "int" }, { name: "y", type: "int" }], returns: "int" },
    examples: [
      { input: [10, 6], output: 1, explanation: "Both coordinates are positive, so Quadrant 1." },
      { input: [9, -12], output: 4, explanation: "x is positive and y is negative, so Quadrant 4." },
    ],
    sampleCases: [
      { input: [10, 6], output: 1, explanation: "Both coordinates are positive, so Quadrant 1." },
      { input: [9, -12], output: 4, explanation: "x is positive and y is negative, so Quadrant 4." },
    ],
    tests: [
      { input: [-10, 5], output: 2 },
      { input: [-5, -5], output: 3 },
      { input: [1, 1], output: 1 },
      { input: [-1, -1], output: 3 },
      { input: [-1, 1], output: 2 },
      { input: [1, -1], output: 4 },
    ],
    testCases: [
      { input: [-10, 5], output: 2 },
      { input: [-5, -5], output: 3 },
      { input: [1, 1], output: 1 },
      { input: [-1, -1], output: 3 },
      { input: [-1, 1], output: 2 },
      { input: [1, -1], output: 4 },
    ],
    hints: [
      "A quadrant is decided by two questions about the point. What are they?",
      "Only the signs of x and y matter, not their exact values.",
      "First ask whether x is positive, then ask whether y is positive. Two questions give four possible answers.",
      "Both coordinates are non-zero, so there is no sign case to handle beyond the two checks.",
    ],
    solution: {
      idea: ["Branch based on the signs of x and y to return 1, 2, 3, or 4."],
      complexity: "O(1) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int selectQuadrant(int x, int y) {
        if (x > 0 && y > 0) return 1;
        if (x < 0 && y > 0) return 2;
        if (x < 0 && y < 0) return 3;
        return 4;
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int selectQuadrant(int x, int y) {
        if (x > 0 && y > 0) return 1;
        if (x < 0 && y > 0) return 2;
        if (x < 0 && y < 0) return 3;
        return 4;
    }
};
`,
  },
  {
    id: "c-kattis-hissingmicrophone",
    source: "kattis",
    url: "https://open.kattis.com/problems/hissingmicrophone",
    title: "Hissing Microphone (Kattis)",
    difficulty: "easy",
    pattern: "cses-kattis",
    description: "Detect whether a word contains two consecutive 's' letters (a hiss).",
    inputFormat: "s: string consisting of lowercase English letters.",
    outputFormat: "string: 'hiss' if 'ss' is present, else 'no hiss'.",
    statement: [
      "A microphone with poor shielding produces a hissing sound whenever two consecutive 's' letters occur in speech.",
      "Given a single word s, determine whether it contains the substring 'ss'. Return 'hiss' if it does, and 'no hiss' otherwise.",
      "Rewritten for this app from Kattis hissingmicrophone as a function.",
    ],
    constraints: ["1 <= s.length <= 30", "s contains only lowercase English letters"],
    fn: { name: "detectHiss", params: [{ name: "s", type: "string" }], returns: "string" },
    examples: [
      { input: ["amiss"], output: "hiss", explanation: "'amiss' contains 'ss' at the end." },
      { input: ["octopuses"], output: "no hiss", explanation: "The two 's' letters in 'octopuses' are not adjacent." },
    ],
    sampleCases: [
      { input: ["amiss"], output: "hiss", explanation: "'amiss' contains 'ss' at the end." },
      { input: ["octopuses"], output: "no hiss", explanation: "The two 's' letters in 'octopuses' are not adjacent." },
    ],
    tests: [
      { input: ["hiss"], output: "hiss" },
      { input: ["password"], output: "hiss" },
      { input: ["cat"], output: "no hiss" },
      { input: ["sss"], output: "hiss" },
      { input: ["s"], output: "no hiss" },
      { input: ["mississippi"], output: "hiss" },
    ],
    testCases: [
      { input: ["hiss"], output: "hiss" },
      { input: ["password"], output: "hiss" },
      { input: ["cat"], output: "no hiss" },
      { input: ["sss"], output: "hiss" },
      { input: ["s"], output: "no hiss" },
      { input: ["mississippi"], output: "hiss" },
    ],
    hints: [
      "What pattern in the word would cause a hiss, and where in the word would you look for it?",
      "A hiss needs two s letters next to each other, so you only need to compare each letter with the one after it.",
      "Scan the word once, checking each pair of neighbours, and answer hiss at the first matching pair.",
      "A single s does not hiss, and the last letter has no partner, so do not read past the end of the word.",
    ],
    solution: {
      idea: ["Check whether the substring 'ss' occurs anywhere in s using string search."],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string detectHiss(string s) {
        return (s.find("ss") != string::npos) ? "hiss" : "no hiss";
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string detectHiss(string s) {
        return (s.find("ss") != string::npos) ? "hiss" : "no hiss";
    }
};
`,
  },
  {
    id: "c-kattis-cold",
    source: "kattis",
    url: "https://open.kattis.com/problems/cold",
    title: "Cold-puter Science (Kattis)",
    difficulty: "easy",
    pattern: "cses-kattis",
    description: "Count the number of days with temperatures strictly below zero.",
    inputFormat: "temps: int[] representing daily recorded temperatures.",
    outputFormat: "int: count of temperatures less than 0.",
    statement: [
      "We're building a Cold-puter and need to know how many days had sub-zero temperatures.",
      "Given an array of recorded temperatures, return the count of temperatures that are strictly negative (< 0).",
      "Rewritten for this app from Kattis cold as a function.",
    ],
    constraints: ["1 <= temps.length <= 100", "-1000000 <= temps[i] <= 1000000"],
    fn: { name: "countNegativeTemperatures", params: [{ name: "temps", type: "int[]" }], returns: "int" },
    examples: [
      { input: [[5, -10, 15]], output: 1, explanation: "Only -10 is strictly less than 0." },
      { input: [[-14, -5, -39, -5, -7]], output: 5, explanation: "All 5 temperatures are negative." },
    ],
    sampleCases: [
      { input: [[5, -10, 15]], output: 1, explanation: "Only -10 is strictly less than 0." },
      { input: [[-14, -5, -39, -5, -7]], output: 5, explanation: "All 5 temperatures are negative." },
    ],
    tests: [
      { input: [[0, 1, 2]], output: 0 },
      { input: [[-1]], output: 1 },
      { input: [[0]], output: 0 },
      { input: [[10, -1, 0, -2, 5]], output: 2 },
      { input: [[-1000000, 1000000]], output: 1 },
      { input: [[-5, -4, -3, -2, -1, 0]], output: 5 },
    ],
    testCases: [
      { input: [[0, 1, 2]], output: 0 },
      { input: [[-1]], output: 1 },
      { input: [[0]], output: 0 },
      { input: [[10, -1, 0, -2, 5]], output: 2 },
      { input: [[-1000000, 1000000]], output: 1 },
      { input: [[-5, -4, -3, -2, -1, 0]], output: 5 },
    ],
    hints: [
      "Think about what the question asks. How many readings meet a single condition?",
      "You do not need to store the temperatures, because each value can be judged the moment it is read.",
      "Read each value in turn, add one to a counter when it is below zero, and print the counter at the end.",
      "Zero is not sub-zero, so the test is strictly less than zero.",
    ],
    solution: {
      idea: ["Iterate through the array and count elements strictly less than 0."],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int countNegativeTemperatures(vector<int> temps) {
        int count = 0;
        for (int t : temps) {
            if (t < 0) count++;
        }
        return count;
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int countNegativeTemperatures(vector<int> temps) {
        int count = 0;
        for (int t : temps) {
            if (t < 0) count++;
        }
        return count;
    }
};
`,
  },
  {
    id: "c-kattis-faktor",
    source: "kattis",
    url: "https://open.kattis.com/problems/faktor",
    title: "Faktor (Kattis)",
    difficulty: "easy",
    pattern: "cses-kattis",
    description: "Find the minimum number of citations required to achieve an impact factor, where impact factor is ceiling-rounded.",
    inputFormat: "articles: int, impact: int.",
    outputFormat: "int: minimum total citations needed.",
    statement: [
      "A scientific journal's impact factor is calculated as ceil(total citations / published articles).",
      "You are given articles (number of articles to publish) and impact (the required impact factor after ceiling rounding).",
      "Find the minimum number of citations needed so that ceil(citations / articles) == impact.",
      "Rewritten for this app from Kattis faktor as a function.",
    ],
    constraints: ["1 <= articles, impact <= 100"],
    fn: { name: "minCitationsNeeded", params: [{ name: "articles", type: "int" }, { name: "impact", type: "int" }], returns: "int" },
    examples: [
      { input: [38, 24], output: 875, explanation: "38 * 23 + 1 = 875. ceil(875 / 38) = 24." },
      { input: [1, 100], output: 100, explanation: "1 * 99 + 1 = 100. ceil(100 / 1) = 100." },
    ],
    sampleCases: [
      { input: [38, 24], output: 875, explanation: "38 * 23 + 1 = 875. ceil(875 / 38) = 24." },
      { input: [1, 100], output: 100, explanation: "1 * 99 + 1 = 100. ceil(100 / 1) = 100." },
    ],
    tests: [
      { input: [10, 10], output: 91 },
      { input: [1, 1], output: 1 },
      { input: [5, 2], output: 6 },
      { input: [100, 1], output: 1 },
      { input: [50, 50], output: 2451 },
      { input: [10, 1], output: 1 },
    ],
    testCases: [
      { input: [10, 10], output: 91 },
      { input: [1, 1], output: 1 },
      { input: [5, 2], output: 6 },
      { input: [100, 1], output: 1 },
      { input: [50, 50], output: 2451 },
      { input: [10, 1], output: 1 },
    ],
    hints: [
      "Work backwards. What is the smallest citation count that still rounds up to the target impact?",
      "Rounding up to the target means the exact average is above the target minus one but not above the target.",
      "Multiply the number of articles by one less than the target impact, then add one citation to step just above that edge.",
      "The lower edge itself is excluded, which is why exactly one citation is added at the end.",
    ],
    solution: {
      idea: ["The threshold for ceiling division to reach impact is articles * (impact - 1) + 1."],
      complexity: "O(1) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int minCitationsNeeded(int articles, int impact) {
        return articles * (impact - 1) + 1;
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int minCitationsNeeded(int articles, int impact) {
        return articles * (impact - 1) + 1;
    }
};
`,
  },
  {
    id: "c-kattis-filip",
    source: "kattis",
    url: "https://open.kattis.com/problems/filip",
    title: "Filip (Kattis)",
    difficulty: "easy",
    pattern: "cses-kattis",
    description: "Compare two three-digit numbers after reading their digits backwards and return the larger value.",
    inputFormat: "a: int, b: int (both three-digit numbers with no zeros).",
    outputFormat: "int: the larger number after reversing digits.",
    statement: [
      "Filip has a peculiar habit: he reads all numbers from right to left (backwards).",
      "Given two distinct three-digit numbers a and b, reverse the digits of both numbers and compare them.",
      "Return the larger reversed number.",
      "Rewritten for this app from Kattis filip as a function.",
    ],
    constraints: ["100 <= a, b <= 999", "a != b", "Neither a nor b contains 0"],
    fn: { name: "reverseAndCompare", params: [{ name: "a", type: "int" }, { name: "b", type: "int" }], returns: "int" },
    examples: [
      { input: [734, 893], output: 437, explanation: "Reversed numbers are 437 and 398. 437 > 398, so return 437." },
      { input: [221, 231], output: 132, explanation: "Reversed numbers are 122 and 132. 132 is larger." },
    ],
    sampleCases: [
      { input: [734, 893], output: 437, explanation: "Reversed numbers are 437 and 398. 437 > 398, so return 437." },
      { input: [221, 231], output: 132, explanation: "Reversed numbers are 122 and 132. 132 is larger." },
    ],
    tests: [
      { input: [123, 321], output: 321 },
      { input: [456, 654], output: 654 },
      { input: [111, 222], output: 222 },
      { input: [100, 200], output: 2 },
      { input: [987, 879], output: 978 },
      { input: [541, 145], output: 541 },
    ],
    testCases: [
      { input: [123, 321], output: 321 },
      { input: [456, 654], output: 654 },
      { input: [111, 222], output: 222 },
      { input: [100, 200], output: 2 },
      { input: [987, 879], output: 978 },
      { input: [541, 145], output: 541 },
    ],
    hints: [
      "What does it mean to read a number backwards? Which digit is read first?",
      "Reading backwards makes the last digit come first, so reversing a three-digit number swaps its ones and hundreds digits.",
      "Reverse each number digit by digit, either as text or with arithmetic, then print the larger of the two reversed values.",
      "Leading zeros disappear after reversing, so 100 reversed is 1. Compare the numbers the reversed digits form.",
    ],
    solution: {
      idea: ["Reverse the digits of both numbers using modulo and division, then return their maximum."],
      complexity: "O(1) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int rev(int x) {
        int r = 0;
        while (x > 0) {
            r = r * 10 + x % 10;
            x /= 10;
        }
        return r;
    }
    int reverseAndCompare(int a, int b) {
        return max(rev(a), rev(b));
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int rev(int x) {
        int r = 0;
        while (x > 0) {
            r = r * 10 + x % 10;
            x /= 10;
        }
        return r;
    }
    int reverseAndCompare(int a, int b) {
        return max(rev(a), rev(b));
    }
};
`,
  },
  {
    id: "c-kattis-sibice",
    source: "kattis",
    url: "https://open.kattis.com/problems/sibice",
    title: "Sibice (Kattis)",
    difficulty: "easy",
    pattern: "cses-kattis",
    description: "Determine whether matches of various lengths can fit into a rectangular box of dimension w by h (possibly diagonally).",
    inputFormat: "w: int, h: int, matches: int[].",
    outputFormat: "bool[]: true for each match that fits in the box, false otherwise.",
    statement: [
      "Young Mirko threw matches onto the floor. To clean them up, he has a rectangular matchbox of width w and height h.",
      "A match fits in the box if it can lie flat on the bottom, either parallel to the sides or along the diagonal.",
      "Given the box dimensions w and h, and the lengths of several matches, return a boolean array indicating whether each match fits (length^2 <= w^2 + h^2).",
      "Rewritten for this app from Kattis sibice as a function.",
    ],
    constraints: ["1 <= w, h <= 100", "1 <= matches.length <= 50", "1 <= matches[i] <= 1000"],
    fn: { name: "checkMatchesFit", params: [{ name: "w", type: "int" }, { name: "h", type: "int" }, { name: "matches", type: "int[]" }], returns: "bool[]" },
    examples: [
      { input: [3, 4, [3, 4, 5, 6, 7]], output: [true, true, true, false, false], explanation: "Diagonal length is sqrt(9 + 16) = 5. Matches of lengths 3, 4, 5 fit; 6 and 7 do not." },
      { input: [12, 17, [21, 20]], output: [false, true], explanation: "Diagonal squared is 144 + 289 = 433. 21^2 = 441 (no), 20^2 = 400 (yes)." },
    ],
    sampleCases: [
      { input: [3, 4, [3, 4, 5, 6, 7]], output: [true, true, true, false, false], explanation: "Diagonal length is sqrt(9 + 16) = 5. Matches of lengths 3, 4, 5 fit; 6 and 7 do not." },
      { input: [12, 17, [21, 20]], output: [false, true], explanation: "Diagonal squared is 144 + 289 = 433. 21^2 = 441 (no), 20^2 = 400 (yes)." },
    ],
    tests: [
      { input: [1, 1, [1, 2]], output: [true, false] },
      { input: [5, 12, [13, 14]], output: [true, false] },
      { input: [10, 10, [14, 15]], output: [true, false] },
      { input: [6, 8, [10]], output: [true] },
      { input: [8, 15, [17, 18]], output: [true, false] },
      { input: [20, 20, [28, 29]], output: [true, false] },
    ],
    testCases: [
      { input: [1, 1, [1, 2]], output: [true, false] },
      { input: [5, 12, [13, 14]], output: [true, false] },
      { input: [10, 10, [14, 15]], output: [true, false] },
      { input: [6, 8, [10]], output: [true] },
      { input: [8, 15, [17, 18]], output: [true, false] },
      { input: [20, 20, [28, 29]], output: [true, false] },
    ],
    hints: [
      "What is the longest straight stick that could lie flat inside a rectangle of width w and height h?",
      "The corner-to-corner line is longer than any side, so the longest match that fits is the rectangle's diagonal.",
      "Compare the square of each match length with the sum of the squares of w and h. This avoids square roots.",
      "Use less than or equal to, since a match exactly as long as the diagonal still fits.",
    ],
    solution: {
      idea: ["A match of length m fits if m^2 <= w^2 + h^2. Compute the diagonal squared and compare."],
      complexity: "O(n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<bool> checkMatchesFit(int w, int h, vector<int> matches) {
        int maxSq = w * w + h * h;
        vector<bool> ans;
        for (int m : matches) {
            ans.push_back(m * m <= maxSq);
        }
        return ans;
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<bool> checkMatchesFit(int w, int h, vector<int> matches) {
        int maxSq = w * w + h * h;
        vector<bool> ans;
        for (int m : matches) {
            ans.push_back(m * m <= maxSq);
        }
        return ans;
    }
};
`,
  },
  {
    id: "c-kattis-isithalloween",
    source: "kattis",
    url: "https://open.kattis.com/problems/isithalloween",
    title: "IsItHalloween.com (Kattis)",
    difficulty: "easy",
    pattern: "cses-kattis",
    description: "Determine whether a given date is Halloween (OCT 31) or Christmas (DEC 25).",
    inputFormat: "month: string (three uppercase letters), day: int.",
    outputFormat: "string: 'yup' if OCT 31 or DEC 25, else 'nope'.",
    statement: [
      "Hippo loves Halloween so much that he sometimes confuses it with Christmas (since OCT 31 == DEC 25 in octal vs decimal!).",
      "Given a date with a three-letter month ('OCT', 'DEC', etc.) and an integer day, return 'yup' if the date is October 31 or December 25. Otherwise, return 'nope'.",
      "Rewritten for this app from Kattis isithalloween as a function.",
    ],
    constraints: ["month is a 3-letter uppercase month abbreviation", "1 <= day <= 31"],
    fn: { name: "checkHalloween", params: [{ name: "month", type: "string" }, { name: "day", type: "int" }], returns: "string" },
    examples: [
      { input: ["OCT", 31], output: "yup", explanation: "October 31 is Halloween." },
      { input: ["DEC", 25], output: "yup", explanation: "December 25 is Christmas (equivalent in octal notation)." },
    ],
    sampleCases: [
      { input: ["OCT", 31], output: "yup", explanation: "October 31 is Halloween." },
      { input: ["DEC", 25], output: "yup", explanation: "December 25 is Christmas (equivalent in octal notation)." },
    ],
    tests: [
      { input: ["OCT", 30], output: "nope" },
      { input: ["DEC", 24], output: "nope" },
      { input: ["JAN", 1], output: "nope" },
      { input: ["JUN", 25], output: "nope" },
      { input: ["OCT", 25], output: "nope" },
      { input: ["NOV", 30], output: "nope" },
    ],
    testCases: [
      { input: ["OCT", 30], output: "nope" },
      { input: ["DEC", 24], output: "nope" },
      { input: ["JAN", 1], output: "nope" },
      { input: ["JUN", 25], output: "nope" },
      { input: ["OCT", 25], output: "nope" },
      { input: ["NOV", 30], output: "nope" },
    ],
    hints: [
      "Two specific dates count as yes. What are they, and what does each condition check?",
      "The answer is yes only when the month and the day match one of the two special dates together.",
      "Check the month and day as a pair for both special dates. Answer yes if either pair matches, otherwise no.",
      "The month and day must match on the same line: October with 31, or December with 25. October with 25 is a no.",
    ],
    solution: {
      idea: ["Check if the date matches either OCT 31 or DEC 25."],
      complexity: "O(1) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string checkHalloween(string month, int day) {
        if ((month == "OCT" && day == 31) || (month == "DEC" && day == 25)) {
            return "yup";
        }
        return "nope";
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string checkHalloween(string month, int day) {
        if ((month == "OCT" && day == 31) || (month == "DEC" && day == 25)) {
            return "yup";
        }
        return "nope";
    }
};
`,
  },
  {
    id: "c-kattis-datum",
    source: "kattis",
    url: "https://open.kattis.com/problems/datum",
    title: "Datum (Kattis)",
    difficulty: "easy",
    pattern: "cses-kattis",
    description: "Determine the day of the week for a given date in the year 2009 (which began on a Thursday).",
    inputFormat: "d: int (day), m: int (month).",
    outputFormat: "string: day of the week ('Monday', 'Tuesday', ..., 'Sunday').",
    statement: [
      "In the non-leap year 2009, January 1 was a Thursday.",
      "Given a day d and month m in 2009, determine what day of the week it was.",
      "The days of the week are: 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'.",
      "Rewritten for this app from Kattis datum as a function.",
    ],
    constraints: ["1 <= m <= 12", "1 <= d <= days in month m for year 2009"],
    fn: { name: "get2009DayOfWeek", params: [{ name: "d", type: "int" }, { name: "m", type: "int" }], returns: "string" },
    examples: [
      { input: [1, 1], output: "Thursday", explanation: "January 1, 2009 was a Thursday." },
      { input: [17, 1], output: "Saturday", explanation: "16 days after Thursday is a Saturday." },
    ],
    sampleCases: [
      { input: [1, 1], output: "Thursday", explanation: "January 1, 2009 was a Thursday." },
      { input: [17, 1], output: "Saturday", explanation: "16 days after Thursday is a Saturday." },
    ],
    tests: [
      { input: [24, 12], output: "Thursday" },
      { input: [25, 12], output: "Friday" },
      { input: [1, 2], output: "Sunday" },
      { input: [31, 12], output: "Thursday" },
      { input: [15, 8], output: "Saturday" },
      { input: [4, 7], output: "Saturday" },
    ],
    testCases: [
      { input: [24, 12], output: "Thursday" },
      { input: [25, 12], output: "Friday" },
      { input: [1, 2], output: "Sunday" },
      { input: [31, 12], output: "Thursday" },
      { input: [15, 8], output: "Saturday" },
      { input: [4, 7], output: "Saturday" },
    ],
    hints: [
      "January 1 is a known starting point. How could you count how far a later date is from it?",
      "Count the days in the months before the given month, then add the day of the month minus one to get the offset from January 1.",
      "Store the month lengths for 2009 and sum the earlier months. Then take the total offset modulo 7 to index the weekday names, starting from Thursday.",
      "2009 is not a leap year, so February has 28 days. Using a different length gives the wrong weekday.",
    ],
    solution: {
      idea: ["Calculate total elapsed days from January 1, 2009 and compute day of the week using modulo 7."],
      complexity: "O(1) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string get2009DayOfWeek(int d, int m) {
        int daysPerMonth[] = {0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
        int totalDays = d - 1;
        for (int i = 1; i < m; i++) {
            totalDays += daysPerMonth[i];
        }
        string days[] = {"Thursday", "Friday", "Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"};
        return days[totalDays % 7];
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string get2009DayOfWeek(int d, int m) {
        int daysPerMonth[] = {0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
        int totalDays = d - 1;
        for (int i = 1; i < m; i++) {
            totalDays += daysPerMonth[i];
        }
        string days[] = {"Thursday", "Friday", "Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"};
        return days[totalDays % 7];
    }
};
`,
  },
  {
    id: "c-kattis-dicecup",
    source: "kattis",
    url: "https://open.kattis.com/problems/dicecup",
    title: "Dice Cup (Kattis)",
    difficulty: "easy",
    pattern: "cses-kattis",
    description: "Determine the most probable sum(s) of two dice with n and m sides.",
    inputFormat: "n: int, m: int.",
    outputFormat: "int[]: sorted array of the most likely sum values.",
    statement: [
      "In a game, two dice are rolled with n and m faces respectively, numbered 1 to n and 1 to m.",
      "Each face has equal probability. Find all sum outcomes that have the maximum probability of appearing.",
      "Return the most likely sums in ascending sorted order.",
      "Rewritten for this app from Kattis dicecup as a function.",
    ],
    constraints: ["1 <= n, m <= 20"],
    fn: { name: "mostLikelyDiceSums", params: [{ name: "n", type: "int" }, { name: "m", type: "int" }], returns: "int[]" },
    examples: [
      { input: [6, 6], output: [7], explanation: "For two 6-sided dice, the single most probable sum is 7." },
      { input: [6, 4], output: [5, 6, 7], explanation: "Sums 5, 6, and 7 each appear with maximum probability (4/24)." },
    ],
    sampleCases: [
      { input: [6, 6], output: [7], explanation: "For two 6-sided dice, the single most probable sum is 7." },
      { input: [6, 4], output: [5, 6, 7], explanation: "Sums 5, 6, and 7 each appear with maximum probability (4/24)." },
    ],
    tests: [
      { input: [12, 20], output: [13, 14, 15, 16, 17, 18, 19, 20, 21] },
      { input: [1, 1], output: [2] },
      { input: [2, 3], output: [3, 4] },
      { input: [4, 4], output: [5] },
      { input: [3, 5], output: [4, 5, 6] },
      { input: [10, 10], output: [11] },
    ],
    testCases: [
      { input: [12, 20], output: [13, 14, 15, 16, 17, 18, 19, 20, 21] },
      { input: [1, 1], output: [2] },
      { input: [2, 3], output: [3, 4] },
      { input: [4, 4], output: [5] },
      { input: [3, 5], output: [4, 5, 6] },
      { input: [10, 10], output: [11] },
    ],
    hints: [
      "Two dice can be added in many ways. Which sums are reached by the most pairs of faces?",
      "A band of middle sums is tied for the most ways. Find where that band starts and where it ends, using the smaller and the larger die.",
      "Find the smaller and larger face counts, then list every sum from one more than the smaller count to one more than the larger count.",
      "If both dice have the same number of faces, the band is a single sum, so the answer has just one value.",
    ],
    solution: {
      idea: ["The plateau of maximum frequencies for rolling dice of sizes n and m is between min(n, m) + 1 and max(n, m) + 1 inclusive."],
      complexity: "O(|n - m| + 1) time, O(1) auxiliary space beyond result.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> mostLikelyDiceSums(int n, int m) {
        int lo = min(n, m) + 1;
        int hi = max(n, m) + 1;
        vector<int> ans;
        for (int s = lo; s <= hi; s++) {
            ans.push_back(s);
        }
        return ans;
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> mostLikelyDiceSums(int n, int m) {
        int lo = min(n, m) + 1;
        int hi = max(n, m) + 1;
        vector<int> ans;
        for (int s = lo; s <= hi; s++) {
            ans.push_back(s);
        }
        return ans;
    }
};
`,
  },
  {
    id: "c-kattis-speedlimit",
    source: "kattis",
    url: "https://open.kattis.com/problems/speedlimit",
    title: "Speed Limit (Kattis)",
    difficulty: "easy",
    pattern: "cses-kattis",
    description: "Calculate total distance driven from a log of speed and elapsed cumulative time.",
    inputFormat: "logs: int[][] where each row is [speed, totalElapsedHours].",
    outputFormat: "int: total distance driven in miles.",
    statement: [
      "Bill and Ted are taking a road trip. The car's computer logs driving segments as pairs of integers: [s, t], where s is the speed in miles per hour and t is the total cumulative time in hours since the start of the trip.",
      "Notice that t is the total elapsed time since the beginning, not the time spent driving at speed s.",
      "Compute the total distance driven across all segments.",
      "Rewritten for this app from Kattis speedlimit as a function.",
    ],
    constraints: ["1 <= logs.length <= 10", "1 <= s <= 90", "1 <= t <= 12", "Cumulative times t are strictly increasing"],
    fn: { name: "calculateTotalDistance", params: [{ name: "logs", type: "int[][]" }], returns: "int" },
    examples: [
      { input: [[[20, 2], [30, 6], [10, 7]]], output: 170, explanation: "20 * 2 + 30 * (6 - 2) + 10 * (7 - 6) = 40 + 120 + 10 = 170 miles." },
      { input: [[[60, 1], [30, 2], [40, 6]]], output: 250, explanation: "60 * 1 + 30 * 1 + 40 * 4 = 60 + 30 + 160 = 250 miles." },
    ],
    sampleCases: [
      { input: [[[20, 2], [30, 6], [10, 7]]], output: 170, explanation: "20 * 2 + 30 * (6 - 2) + 10 * (7 - 6) = 40 + 120 + 10 = 170 miles." },
      { input: [[[60, 1], [30, 2], [40, 6]]], output: 250, explanation: "60 * 1 + 30 * 1 + 40 * 4 = 60 + 30 + 160 = 250 miles." },
    ],
    tests: [
      { input: [[[50, 2]]], output: 100 },
      { input: [[[15, 1], [25, 2]]], output: 40 },
      { input: [[[30, 1], [30, 2], [30, 3]]], output: 90 },
      { input: [[[80, 5]]], output: 400 },
      { input: [[[45, 2], [55, 3]]], output: 145 },
      { input: [[[70, 1], [65, 3], [50, 4]]], output: 250 },
    ],
    testCases: [
      { input: [[[50, 2]]], output: 100 },
      { input: [[[15, 1], [25, 2]]], output: 40 },
      { input: [[[30, 1], [30, 2], [30, 3]]], output: 90 },
      { input: [[[80, 5]]], output: 400 },
      { input: [[[45, 2], [55, 3]]], output: 145 },
      { input: [[[70, 1], [65, 3], [50, 4]]], output: 250 },
    ],
    hints: [
      "The times in the log are not segment lengths. What does each time value measure?",
      "Each time counts from the start of the trip, so you need the gap between consecutive readings to know how long each segment lasted.",
      "Track the previous time, starting from zero. For each entry, add speed times the gap, then move the previous time forward.",
      "The first gap is measured from time zero, so the first entry's time is itself the first gap.",
    ],
    solution: {
      idea: ["Iterate through segments, multiplying each speed by the elapsed duration (current time minus previous time) and sum up."],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int calculateTotalDistance(vector<vector<int>> logs) {
        int total = 0;
        int prev = 0;
        for (const auto& log : logs) {
            int speed = log[0];
            int curr = log[1];
            total += speed * (curr - prev);
            prev = curr;
        }
        return total;
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int calculateTotalDistance(vector<vector<int>> logs) {
        int total = 0;
        int prev = 0;
        for (const auto& log : logs) {
            int speed = log[0];
            int curr = log[1];
            total += speed * (curr - prev);
            prev = curr;
        }
        return total;
    }
};
`,
  },
  {
    id: "c-kattis-trik",
    source: "kattis",
    url: "https://open.kattis.com/problems/trik",
    title: "Trik (Kattis)",
    difficulty: "easy",
    pattern: "cses-kattis",
    description: "Track the location of a ball under three cups numbered 1, 2, 3 subjected to swaps 'A', 'B', and 'C'.",
    inputFormat: "moves: string consisting of characters 'A', 'B', and 'C'.",
    outputFormat: "int: final position of the ball (1, 2, or 3).",
    statement: [
      "A street hustler hides a ball under one of three cups positioned in a line, labeled 1, 2, and 3 from left to right. Initially, the ball is under cup 1.",
      "He performs a sequence of moves:",
      "'A' swaps the left and middle cups (1 and 2). 'B' swaps the middle and right cups (2 and 3). 'C' swaps the left and right cups (1 and 3).",
      "Return the cup number (1, 2, or 3) under which the ball is located after all moves.",
      "Rewritten for this app from Kattis trik as a function.",
    ],
    constraints: ["1 <= moves.length <= 50", "moves contains only 'A', 'B', and 'C'"],
    fn: { name: "findBallPosition", params: [{ name: "moves", type: "string" }], returns: "int" },
    examples: [
      { input: ["AB"], output: 3, explanation: "Ball starts at 1. 'A' moves it to 2. 'B' moves it to 3." },
      { input: ["CBABCACCC"], output: 1, explanation: "After all 9 moves, the ball ends up back under cup 1." },
    ],
    sampleCases: [
      { input: ["AB"], output: 3, explanation: "Ball starts at 1. 'A' moves it to 2. 'B' moves it to 3." },
      { input: ["CBABCACCC"], output: 1, explanation: "After all 9 moves, the ball ends up back under cup 1." },
    ],
    tests: [
      { input: ["A"], output: 2 },
      { input: ["B"], output: 1 },
      { input: ["C"], output: 3 },
      { input: ["AA"], output: 1 },
      { input: ["ABC"], output: 1 },
      { input: ["BAC"], output: 2 },
    ],
    testCases: [
      { input: ["A"], output: 2 },
      { input: ["B"], output: 1 },
      { input: ["C"], output: 3 },
      { input: ["AA"], output: 1 },
      { input: ["ABC"], output: 1 },
      { input: ["BAC"], output: 2 },
    ],
    hints: [
      "Rather than tracking three cups, what single thing do you need to know after each move?",
      "Each move either moves the ball or leaves it where it is, so one number is enough: the cup the ball is under.",
      "Store the ball's cup number. For each move, check whether the ball sits under one of the two swapped cups, and if so move it to the other.",
      "A move that does not involve the ball's current cup changes nothing, so do not reset the position on each move.",
    ],
    solution: {
      idea: ["Simulate ball transitions: track the ball's current cup index across each move in the string."],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int findBallPosition(string moves) {
        int pos = 1;
        for (char m : moves) {
            if (m == 'A') {
                if (pos == 1) pos = 2;
                else if (pos == 2) pos = 1;
            } else if (m == 'B') {
                if (pos == 2) pos = 3;
                else if (pos == 3) pos = 2;
            } else if (m == 'C') {
                if (pos == 1) pos = 3;
                else if (pos == 3) pos = 1;
            }
        }
        return pos;
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int findBallPosition(string moves) {
        int pos = 1;
        for (char m : moves) {
            if (m == 'A') {
                if (pos == 1) pos = 2;
                else if (pos == 2) pos = 1;
            } else if (m == 'B') {
                if (pos == 2) pos = 3;
                else if (pos == 3) pos = 2;
            } else if (m == 'C') {
                if (pos == 1) pos = 3;
                else if (pos == 3) pos = 1;
            }
        }
        return pos;
    }
};
`,
  },
  {
    id: "c-kattis-zamka",
    source: "kattis",
    url: "https://open.kattis.com/problems/zamka",
    title: "Zamka (Kattis)",
    difficulty: "easy",
    pattern: "cses-kattis",
    description: "Find the smallest integer N and largest integer M in [L, D] whose decimal digit sums equal X.",
    inputFormat: "l: int, d: int, x: int.",
    outputFormat: "int[]: [N, M] representing minimum and maximum matching integers.",
    statement: [
      "The fast-paced game Zamka requires determining two secret numbers N and M within the interval [L, D]:",
      "N is the minimal integer in [L, D] such that its sum of digits is equal to X.",
      "M is the maximal integer in [L, D] such that its sum of digits is equal to X.",
      "Return an array [N, M]. The problem guarantees that at least one such integer exists.",
      "Rewritten for this app from Kattis zamka as a function.",
    ],
    constraints: ["1 <= l <= d <= 10000", "1 <= x <= 36", "A matching integer is guaranteed to exist"],
    fn: { name: "findZamkaMinMax", params: [{ name: "l", type: "int" }, { name: "d", type: "int" }, { name: "x", type: "int" }], returns: "int[]" },
    examples: [
      { input: [1, 100, 4], output: [4, 40], explanation: "Smallest number with digit sum 4 is 4; largest is 40." },
      { input: [100, 500, 12], output: [129, 480], explanation: "1 + 2 + 9 = 12 and 4 + 8 + 0 = 12." },
    ],
    sampleCases: [
      { input: [1, 100, 4], output: [4, 40], explanation: "Smallest number with digit sum 4 is 4; largest is 40." },
      { input: [100, 500, 12], output: [129, 480], explanation: "1 + 2 + 9 = 12 and 4 + 8 + 0 = 12." },
    ],
    tests: [
      { input: [1, 10, 1], output: [1, 10] },
      { input: [10, 20, 2], output: [11, 20] },
      { input: [50, 60, 5], output: [50, 50] },
      { input: [1, 1000, 1], output: [1, 1000] },
      { input: [100, 200, 10], output: [109, 190] },
      { input: [2000, 3000, 5], output: [2003, 2300] },
    ],
    testCases: [
      { input: [1, 10, 1], output: [1, 10] },
      { input: [10, 20, 2], output: [11, 20] },
      { input: [50, 60, 5], output: [50, 50] },
      { input: [1, 1000, 1], output: [1, 1000] },
      { input: [100, 200, 10], output: [109, 190] },
      { input: [2000, 3000, 5], output: [2003, 2300] },
    ],
    hints: [
      "The range is small. What is the simplest search that is guaranteed to find the answer?",
      "The first number in the range with the right digit sum is the smallest, and the first one found scanning down is the largest.",
      "Write a helper that sums the digits of a number. Scan up from the low end for the minimum and down from the high end for the maximum.",
      "Stop each scan at the first match. The problem guarantees a match exists, so no failure case is needed.",
    ],
    solution: {
      idea: ["Iterate upwards from l to find min N, and downwards from d to find max M with digit sum equal to x."],
      complexity: "O((d - l) * log10(d)) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int digitSum(int num) {
        int sum = 0;
        while (num > 0) {
            sum += num % 10;
            num /= 10;
        }
        return sum;
    }
    vector<int> findZamkaMinMax(int l, int d, int x) {
        int n = -1, m = -1;
        for (int i = l; i <= d; i++) {
            if (digitSum(i) == x) {
                n = i;
                break;
            }
        }
        for (int i = d; i >= l; i--) {
            if (digitSum(i) == x) {
                m = i;
                break;
            }
        }
        return {n, m};
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int digitSum(int num) {
        int sum = 0;
        while (num > 0) {
            sum += num % 10;
            num /= 10;
        }
        return sum;
    }
    vector<int> findZamkaMinMax(int l, int d, int x) {
        int n = -1, m = -1;
        for (int i = l; i <= d; i++) {
            if (digitSum(i) == x) {
                n = i;
                break;
            }
        }
        for (int i = d; i >= l; i--) {
            if (digitSum(i) == x) {
                m = i;
                break;
            }
        }
        return {n, m};
    }
};
`,
  },
  {
    id: "c-kattis-pieceofcake2",
    source: "kattis",
    url: "https://open.kattis.com/problems/pieceofcake2",
    title: "Piece of Cake! (Kattis)",
    difficulty: "easy",
    pattern: "cses-kattis",
    description: "Calculate the volume of the largest piece from cutting a square cake of side n and thickness 4 with cuts at h and v.",
    inputFormat: "n: int (side length of square cake), h: int (horizontal cut distance from top), v: int (vertical cut distance from left).",
    outputFormat: "int: volume of the largest of the four cake pieces in cubic centimeters.",
    statement: [
      "It is your birthday, and you receive a square cake of side length n cm and thickness 4 cm.",
      "You make two straight cuts across the entire cake: a horizontal cut h cm from the top edge, and a vertical cut v cm from the left edge. This divides the cake into four rectangular pieces.",
      "Return the volume of the largest piece in cm^3.",
      "Rewritten for this app from Kattis pieceofcake2 as a function.",
    ],
    constraints: ["2 <= n <= 10000", "0 < h, v < n"],
    fn: { name: "largestCakeVolume", params: [{ name: "n", type: "int" }, { name: "h", type: "int" }, { name: "v", type: "int" }], returns: "int" },
    examples: [
      { input: [10, 4, 7], output: 168, explanation: "Largest dimensions are max(4, 6) = 6 and max(7, 3) = 7. Volume is 6 * 7 * 4 = 168." },
      { input: [5, 2, 2], output: 36, explanation: "max(2, 3) = 3 and max(2, 3) = 3. Volume is 3 * 3 * 4 = 36." },
    ],
    sampleCases: [
      { input: [10, 4, 7], output: 168, explanation: "Largest dimensions are max(4, 6) = 6 and max(7, 3) = 7. Volume is 6 * 7 * 4 = 168." },
      { input: [5, 2, 2], output: 36, explanation: "max(2, 3) = 3 and max(2, 3) = 3. Volume is 3 * 3 * 4 = 36." },
    ],
    tests: [
      { input: [4, 2, 2], output: 16 },
      { input: [10, 5, 5], output: 100 },
      { input: [100, 1, 1], output: 39204 },
      { input: [10, 1, 9], output: 324 },
      { input: [50, 10, 40], output: 6400 },
      { input: [20, 15, 8], output: 720 },
    ],
    testCases: [
      { input: [4, 2, 2], output: 16 },
      { input: [10, 5, 5], output: 100 },
      { input: [100, 1, 1], output: 39204 },
      { input: [10, 1, 9], output: 324 },
      { input: [50, 10, 40], output: 6400 },
      { input: [20, 15, 8], output: 720 },
    ],
    hints: [
      "Each cut splits one side of the square. For each cut, which of the two pieces is the bigger one?",
      "The horizontal and vertical choices are independent, so the biggest piece uses the larger part from each cut.",
      "Find the bigger part for each cut, multiply those two lengths together, then multiply by the thickness of 4.",
      "A cut near one edge still leaves a big piece on the other side, so always take the larger part of each cut.",
    ],
    solution: {
      idea: ["The largest piece takes the maximal dimension along both axes: max(h, n - h) * max(v, n - v) * 4."],
      complexity: "O(1) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int largestCakeVolume(int n, int h, int v) {
        int side1 = max(h, n - h);
        int side2 = max(v, n - v);
        return side1 * side2 * 4;
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int largestCakeVolume(int n, int h, int v) {
        int side1 = max(h, n - h);
        int side2 = max(v, n - v);
        return side1 * side2 * 4;
    }
};
`,
  },
  {
    id: "c-kattis-judgingmoose",
    source: "kattis",
    url: "https://open.kattis.com/problems/judgingmoose",
    title: "Judging Moose (Kattis)",
    difficulty: "easy",
    pattern: "cses-kattis",
    description: "Determine whether a moose is even, odd, or not a moose based on its left and right antler point counts.",
    inputFormat: "left: int, right: int (number of points on left and right antlers).",
    outputFormat: "string: 'Not a moose', 'Even 2k', or 'Odd 2m'.",
    statement: [
      "When hunting for moose, hunters look at the antlers to determine the moose's points.",
      "If the moose has no points at all (left == 0 and right == 0), it's 'Not a moose'.",
      "If both antlers have equal points p (left == right), it is an even moose with 2 * p points: 'Even 2p'.",
      "If the antler counts differ, it is an odd moose whose points are twice the larger antler count: 'Odd 2 * max(left, right)'.",
      "Rewritten for this app from Kattis judgingmoose as a function.",
    ],
    constraints: ["0 <= left, right <= 20"],
    fn: { name: "describeMoose", params: [{ name: "left", type: "int" }, { name: "right", type: "int" }], returns: "string" },
    examples: [
      { input: [2, 3], output: "Odd 6", explanation: "Antlers differ, so it is odd with 2 * max(2, 3) = 6 points." },
      { input: [3, 3], output: "Even 6", explanation: "Antlers are equal, so it is an even moose with 6 points." },
    ],
    sampleCases: [
      { input: [2, 3], output: "Odd 6", explanation: "Antlers differ, so it is odd with 2 * max(2, 3) = 6 points." },
      { input: [3, 3], output: "Even 6", explanation: "Antlers are equal, so it is an even moose with 6 points." },
    ],
    tests: [
      { input: [0, 0], output: "Not a moose" },
      { input: [0, 5], output: "Odd 10" },
      { input: [5, 0], output: "Odd 10" },
      { input: [1, 1], output: "Even 2" },
      { input: [4, 5], output: "Odd 10" },
      { input: [10, 10], output: "Even 20" },
    ],
    testCases: [
      { input: [0, 0], output: "Not a moose" },
      { input: [0, 5], output: "Odd 10" },
      { input: [5, 0], output: "Odd 10" },
      { input: [1, 1], output: "Even 2" },
      { input: [4, 5], output: "Odd 10" },
      { input: [10, 10], output: "Even 20" },
    ],
    hints: [
      "Think about what zero tines on both sides means before you compare the two sides.",
      "Equal antlers mean the moose is symmetric. Unequal antlers mean the bigger side tells you the true count.",
      "Check the zero-and-zero case first, then compare the two sides. The answer is twice the common count, or twice the larger count.",
      "Test the zero case before the equal case, since zero and zero are equal and would otherwise print Even 0.",
    ],
    solution: {
      idea: ["Check if 0 on both sides. Otherwise check equality: if equal return Even 2*left, else Odd 2*max(left, right)."],
      complexity: "O(1) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string describeMoose(int left, int right) {
        if (left == 0 && right == 0) return "Not a moose";
        if (left == right) return "Even " + to_string(left * 2);
        return "Odd " + to_string(max(left, right) * 2);
    }
};
`,
    },
    referenceSolution: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string describeMoose(int left, int right) {
        if (left == 0 && right == 0) return "Not a moose";
        if (left == right) return "Even " + to_string(left * 2);
        return "Odd " + to_string(max(left, right) * 2);
    }
};
`,
  },
];
