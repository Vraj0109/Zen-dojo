import type { ProblemSpec } from "./types";

// Logic building, batch two: 25 more problems from Project Euler, AtCoder, Codeforces and Kattis, rewritten in our own words as functions (each links to the original). The expected outputs of every test were produced by running the C++ reference solution.

export const LOGIC_SPECS_BATCH2: ProblemSpec[] = [
  {
    id: "c-euler-4",
    source: "euler",
    url: "https://projecteuler.net/problem=4",
    title: "Largest Palindrome Product",
    statement: [
      "A number is a palindrome if it reads the same forwards and backwards (9009 is one, 9010 is not). Look at every product a * b where both factors are whole numbers between lo and hi inclusive.",
      "Return the largest product that is a palindrome, or 0 if no product is. The original Project Euler task fixes both factors to three digits; here the range is an input, and it can be wide enough that trying every pair without pruning is slow.",
    ],
    constraints: ["1 <= lo <= hi <= 9999"],
    fn: {"name":"largestPalindromeProduct","params":[{"name":"lo","type":"int"},{"name":"hi","type":"int"}],"returns":"long"},
    examples: [
      { input: [10,99], output: 9009, explanation: "The best pair is 91 * 99 = 9009." },
      { input: [1,9], output: 9, explanation: "3 * 3 = 9 is a palindrome and no larger single-digit product is (for example 8 * 9 = 72 is not)." },
    ],
    tests: [
      { input: [1,1], output: 1 },
      { input: [10,10], output: 0 },
      { input: [11,11], output: 121 },
      { input: [2,3], output: 9 },
      { input: [10,20], output: 323 },
      { input: [100,150], output: 21312 },
      { input: [900,999], output: 906609 },
      { input: [1000,1100], output: 1115111 },
      { input: [5,5], output: 0 },
      { input: [9990,9999], output: 0 },
    ],
    hints: [
      "Write a helper that tests whether a number is a palindrome by reversing its digits.",
      "Let a go down from hi and b go down from a. Each product is a * b with a >= b, so you do not repeat pairs.",
      "Keep the best palindrome so far. As soon as a * b is not larger than the best, stop the inner loop: smaller b only gives smaller products. Also stop the outer loop when a * hi cannot beat the best.",
    ],
    solution: {
      idea: [
        "Scan pairs from the largest factors downwards and remember the best palindrome found. Products only shrink as b decreases, so the inner loop can break at the first palindrome or as soon as the product cannot beat the best.",
        "The outer loop breaks when even a * hi is not larger than the best. With this pruning a range such as 1000 to 9999 runs quickly.",
      ],
      complexity: "Far less than O((hi - lo)^2) with pruning; the worst case is bounded by about 5 * 10^7 palindrome checks.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool isPal(long long x) {
        long long r = 0, y = x;
        while (y > 0) { r = r * 10 + y % 10; y /= 10; }
        return r == x;
    }
    long long largestPalindromeProduct(int lo, int hi) {
        long long best = 0;
        for (long long a = hi; a >= lo; a--) {
            if (a * hi <= best) break;
            for (long long b = hi; b >= a; b--) {
                long long p = a * b;
                if (p <= best) break;
                if (isPal(p)) { best = p; break; }
            }
        }
        return best;
    }
};
`,
    },
  },
  {
    id: "c-euler-17",
    source: "euler",
    url: "https://projecteuler.net/problem=17",
    title: "Number Letter Counts",
    statement: [
      "Write every whole number from 1 to n in British English words and count only the letters: no spaces and no hyphens. So 342 (three hundred and forty-two) has 23 letters. Return the total number of letters used by all the numbers from 1 to n.",
      "The rules: numbers below 20 and the tens have their usual names (one ... nineteen, twenty, thirty ... ninety); a number from 21 to 99 is the tens word followed by the ones word. Hundreds are written 'one hundred', thousands 'one thousand' and so on. The word 'and' is written once, directly before the last one or two digits, whenever the number is above 100 and its last two digits are not 00: 'one hundred and one', 'one thousand and five', 'twelve thousand three hundred and forty-five'. A number with last two digits 00 has no 'and': 'two thousand', 'five hundred'.",
    ],
    constraints: ["1 <= n <= 99999"],
    fn: {"name":"letterCount","params":[{"name":"n","type":"int"}],"returns":"int"},
    examples: [
      { input: [5], output: 19, explanation: "one, two, three, four, five: 3 + 3 + 5 + 4 + 4 = 19." },
      { input: [15], output: 74, explanation: "1 to 9 use 36 letters; ten, eleven, twelve, thirteen, fourteen, fifteen use 3 + 6 + 6 + 8 + 8 + 7 = 38." },
    ],
    tests: [
      { input: [1], output: 3 },
      { input: [20], output: 112 },
      { input: [100], output: 864 },
      { input: [101], output: 880 },
      { input: [115], output: 1133 },
      { input: [342], output: 6117 },
      { input: [999], output: 21113 },
      { input: [1000], output: 21124 },
      { input: [1001], output: 21141 },
      { input: [12345], output: 400954 },
    ],
    hints: [
      "Build a function that counts the letters of one number, then add it up for 1 to n.",
      "Keep two small tables: the names of 0 to 19 and the names of the tens (twenty, thirty ...). Counting only needs the lengths of the words.",
      "Split n into thousands (n / 1000, which is below 100) and the rest (n % 1000). Remember 'hundred' has 7 letters, 'thousand' has 8, 'and' has 3, and that 'and' is added when the rest is not 0 and the number is above 100.",
    ],
    solution: {
      idea: [
        "Count the letters of one number from its pieces: the thousands part (a number below 100 plus 'thousand'), the hundreds part (a digit plus 'hundred') and the last two digits, plus 3 for 'and' when the last two digits are non-zero and something larger comes before them.",
        "Add those counts for every number from 1 to n.",
      ],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    const char* ones[20] = {"", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"};
    const char* tens[10] = {"", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"};
    int below100(int x) {
        if (x < 20) return (int)strlen(ones[x]);
        return (int)strlen(tens[x / 10]) + (int)strlen(ones[x % 10]);
    }
    int below1000(int x) {
        int h = x / 100, r = x % 100, res = 0;
        if (h) res += (int)strlen(ones[h]) + 7;
        if (h && r) res += 3;
        return res + below100(r);
    }
    int one(int x) {
        int t = x / 1000, r = x % 1000, res = 0;
        if (t) res += below100(t) + 8;
        if (r) {
            if (t && r < 100) res += 3;
            res += below1000(r);
        }
        return res;
    }
    int letterCount(int n) {
        int total = 0;
        for (int i = 1; i <= n; i++) total += one(i);
        return total;
    }
};
`,
    },
  },
  {
    id: "c-euler-19",
    source: "euler",
    url: "https://projecteuler.net/problem=19",
    title: "Counting Sundays",
    statement: [
      "Use the Gregorian calendar: a year is a leap year if it is divisible by 4, except years divisible by 100 that are not divisible by 400. You are told that 1 January 1900 was a Monday.",
      "Return how many months, from January of startYear to December of endYear inclusive, began on a Sunday (the 1st of the month was a Sunday). The original task fixes 1901 to 2000; here the years are inputs and the range can be very long.",
    ],
    constraints: ["1900 <= startYear <= endYear <= 100000"],
    fn: {"name":"sundaysOnFirst","params":[{"name":"startYear","type":"int"},{"name":"endYear","type":"int"}],"returns":"int"},
    examples: [
      { input: [1900,1900], output: 2, explanation: "In 1900 the 1st of April and the 1st of July were Sundays." },
      { input: [1900,1901], output: 4, explanation: "Compute by counting the weekday of each 1st of the month." },
    ],
    tests: [
      { input: [1900,1900], output: 2 },
      { input: [1900,1901], output: 4 },
      { input: [1901,1901], output: 2 },
      { input: [2000,2000], output: 1 },
      { input: [1996,1999], output: 7 },
      { input: [1900,2399], output: 860 },
      { input: [2024,2024], output: 2 },
      { input: [1950,1960], output: 20 },
      { input: [99999,100000], output: 2 },
      { input: [1900,1904], output: 9 },
    ],
    hints: [
      "Work out the weekday of 1 January startYear first, by adding up the days of every year since 1900 (365 or 366), modulo 7.",
      "Walk month by month: if the current weekday is Sunday count one, then move the weekday forward by the number of days in that month.",
      "Remember February has 29 days in leap years. For a very long range the walk is still only 12 steps per year, so it is fast enough.",
    ],
    solution: {
      idea: [
        "Find the weekday of 1 January of startYear by counting days since 1900, then step through each month adding its length modulo 7 and counting the months whose first day is Sunday.",
      ],
      complexity: "O(endYear) time.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool leap(int y) { return y % 4 == 0 && (y % 100 != 0 || y % 400 == 0); }
    int sundaysOnFirst(int startYear, int endYear) {
        int dow = 1;  // 0 = Sunday, 1 = Monday, 1 January 1900
        for (int y = 1900; y < startYear; y++) dow = (dow + (leap(y) ? 366 : 365)) % 7;
        int count = 0;
        int len[12] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
        for (int y = startYear; y <= endYear; y++) {
            for (int m = 0; m < 12; m++) {
                if (dow == 0) count++;
                int d = len[m] + (m == 1 && leap(y) ? 1 : 0);
                dow = (dow + d) % 7;
            }
        }
        return count;
    }
};
`,
    },
  },
  {
    id: "c-euler-21",
    source: "euler",
    url: "https://projecteuler.net/problem=21",
    title: "Amicable Numbers",
    statement: [
      "Let d(n) be the sum of the proper divisors of n (the divisors smaller than n; so d(12) = 1 + 2 + 3 + 4 + 6 = 16). A number a is amicable if d(a) = b, d(b) = a and a is different from b.",
      "Return the sum of all amicable numbers a below limit whose partner b is also below limit. For example 220 and 284 are partners: d(220) = 284 and d(284) = 220.",
    ],
    constraints: ["1 <= limit <= 1000000"],
    fn: {"name":"amicableSum","params":[{"name":"limit","type":"int"}],"returns":"long"},
    examples: [
      { input: [300], output: 504, explanation: "Only the pair 220 and 284 is below 300: 220 + 284 = 504." },
      { input: [200], output: 0, explanation: "The first amicable pair starts at 220." },
    ],
    tests: [
      { input: [1], output: 0 },
      { input: [2], output: 0 },
      { input: [220], output: 0 },
      { input: [221], output: 0 },
      { input: [285], output: 504 },
      { input: [1300], output: 2898 },
      { input: [3000], output: 8442 },
      { input: [11000], output: 53226 },
      { input: [70000], output: 249738 },
      { input: [20000], output: 115818 },
    ],
    hints: [
      "Computing d(n) for one n by trial division is fine, but you need d for every number below limit.",
      "Use a sieve: for every i from 1 up, add i to d[j] for every multiple j = 2i, 3i ... below limit. Then d[n] holds the proper divisor sum of n.",
      "For each a, set b = d[a]. If b is below limit, b is different from a and d[b] equals a, add a to the total.",
    ],
    solution: {
      idea: [
        "Fill an array d with all proper divisor sums using a sieve, then check each number a: its partner b = d[a] must be different, below the limit, and map back to a.",
      ],
      complexity: "O(n log n) time (the sieve), O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    long long amicableSum(int limit) {
        vector<int> d(limit + 1, 0);
        for (int i = 1; i < limit; i++)
            for (int j = 2 * i; j < limit; j += i) d[j] += i;
        long long total = 0;
        for (int a = 1; a < limit; a++) {
            int b = d[a];
            if (b != a && b < limit && d[b] == a) total += a;
        }
        return total;
    }
};
`,
    },
  },
  {
    id: "c-euler-26",
    source: "euler",
    url: "https://projecteuler.net/problem=26",
    title: "Reciprocal Cycles",
    statement: [
      "When you write the fraction 1/d as a decimal, the digits after the point may start repeating forever. 1/7 = 0.142857142857... repeats the 6 digits 142857. 1/6 = 0.1666... repeats 1 digit, and 1/8 = 0.125 does not repeat at all (cycle length 0).",
      "Among the denominators d with 2 <= d < limit, return the smallest d whose decimal expansion has the longest repeating cycle. The original task fixes limit at one thousand; here the limit is an input.",
    ],
    constraints: ["3 <= limit <= 20000"],
    fn: {"name":"longestCycleDenominator","params":[{"name":"limit","type":"int"}],"returns":"int"},
    examples: [
      { input: [11], output: 7, explanation: "Among 2..10 the cycle lengths are 0, 1, 0, 0, 1, 6, 0, 1, 0 for d = 2, 3, ... 10. The longest is 6, from d = 7." },
      { input: [3], output: 2, explanation: "Only d = 2 is allowed (cycle length 0), so it is the answer." },
    ],
    tests: [
      { input: [3], output: 2 },
      { input: [4], output: 3 },
      { input: [8], output: 7 },
      { input: [11], output: 7 },
      { input: [12], output: 7 },
      { input: [18], output: 17 },
      { input: [30], output: 29 },
      { input: [100], output: 97 },
      { input: [500], output: 499 },
      { input: [20000], output: 19993 },
    ],
    hints: [
      "Remove all factors of 2 and 5 from d. They only make the decimal terminate or delay the cycle, so they do not change its length. Call the rest m.",
      "If m is 1 the cycle length is 0. Otherwise the cycle length is the smallest k >= 1 with 10^k mod m = 1 (the multiplicative order of 10 modulo m).",
      "Find k by repeated multiplication: r = 10 % m, then r = r * 10 % m until r is 1, counting steps. Keep the best length and the smallest d that reached it.",
    ],
    solution: {
      idea: [
        "The cycle length of 1/d depends only on d with all 2s and 5s removed (call it m): it is the order of 10 modulo m, or 0 if m = 1. Find it by repeated multiplication modulo m, which takes at most m steps.",
        "Keep the largest length and update it only on a strictly larger value, so the first (smallest) d wins ties.",
      ],
      complexity: "O(limit^2) worst case, but cycle lengths are far shorter than m for most d so it runs in well under a second.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int longestCycleDenominator(int limit) {
        int best = -1, bestD = 2;
        for (int d = 2; d < limit; d++) {
            int m = d;
            while (m % 2 == 0) m /= 2;
            while (m % 5 == 0) m /= 5;
            int len = 0;
            if (m > 1) {
                int r = 10 % m;
                len = 1;
                while (r != 1) { r = r * 10 % m; len++; }
            }
            if (len > best) { best = len; bestD = d; }
        }
        return bestD;
    }
};
`,
    },
  },
  {
    id: "c-euler-31",
    source: "euler",
    url: "https://projecteuler.net/problem=31",
    title: "Coin Sums",
    statement: [
      "You have an unlimited supply of coins of the given values (all different). Count the number of different ways to pay exactly target, where two ways are the same if they use the same number of each coin (the order does not matter).",
      "The count can be huge, so return it modulo 1000000007. The original Project Euler task uses the eight British coins and 200 pence; here the coins and the target are inputs.",
    ],
    constraints: ["1 <= coins.length <= 100", "1 <= coins[i] <= 100000, all values different", "0 <= target <= 100000"],
    fn: {"name":"coinWays","params":[{"name":"coins","type":"int[]"},{"name":"target","type":"int"}],"returns":"int"},
    examples: [
      { input: [[1,2,5],5], output: 4, explanation: "5, 2+2+1, 2+1+1+1 and 1+1+1+1+1." },
      { input: [[2],3], output: 0, explanation: "An odd amount cannot be made from 2s." },
    ],
    tests: [
      { input: [[1],0], output: 1 },
      { input: [[3],9], output: 1 },
      { input: [[3],10], output: 0 },
      { input: [[1,2,3],4], output: 4 },
      { input: [[1,2,5,10,20],30], output: 109 },
      { input: [[7,3],100], output: 5 },
      { input: [[2,3,7],1000], output: 12048 },
      { input: [[1,2,5,10,20,50,100],10000], output: 285342956 },
    ],
    hints: [
      "Let ways[s] be the number of ways to make the sum s. Start with ways[0] = 1 (pay nothing).",
      "To avoid counting the same coins in different orders, process one coin at a time (outer loop over coins).",
      "For each coin c, loop s from c up to target and add ways[s - c] to ways[s], modulo 1000000007. The answer is ways[target].",
    ],
    solution: {
      idea: [
        "Classic unbounded knapsack counting. Keep ways[s]; for each coin in turn, add ways[s - c] to ways[s] for s from c to target. Looping coins outermost counts each multiset of coins once.",
      ],
      complexity: "O(coins * target) time, O(target) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int coinWays(vector<int> coins, int target) {
        const long long MOD = 1000000007;
        vector<long long> ways(target + 1, 0);
        ways[0] = 1;
        for (int c : coins)
            for (int s = c; s <= target; s++) ways[s] = (ways[s] + ways[s - c]) % MOD;
        return (int)ways[target];
    }
};
`,
    },
  },
  {
    id: "c-euler-35",
    source: "euler",
    url: "https://projecteuler.net/problem=35",
    title: "Circular Primes",
    statement: [
      "A prime is circular if every number you get by rotating its digits is also prime. 197 is circular: its rotations 971 and 719 are prime too. Single-digit primes are circular.",
      "Return how many circular primes there are below limit. The rotations themselves may be larger than limit; they only have to be prime. The original task fixes limit at one million; here it is an input up to ten million.",
    ],
    constraints: ["2 <= limit <= 10000000"],
    fn: {"name":"circularPrimes","params":[{"name":"limit","type":"int"}],"returns":"int"},
    examples: [
      { input: [100], output: 13, explanation: "2, 3, 5, 7, 11, 13, 17, 31, 37, 71, 73, 79 and 97." },
      { input: [10], output: 4, explanation: "2, 3, 5 and 7." },
    ],
    tests: [
      { input: [2], output: 0 },
      { input: [3], output: 1 },
      { input: [12], output: 5 },
      { input: [20], output: 7 },
      { input: [50], output: 9 },
      { input: [200], output: 17 },
      { input: [1000], output: 25 },
      { input: [5000], output: 29 },
      { input: [99999], output: 43 },
      { input: [1000001], output: 55 },
    ],
    hints: [
      "Sieve of Eratosthenes first, so you can ask 'is x prime' in O(1). Sieve up to the next power of ten above limit, because a rotation can be larger than limit but never has more digits.",
      "A rotation of x moves the first digit to the end: x = d * 10^(k - 1) + rest becomes rest * 10 + d, where k is the number of digits.",
      "For every prime p below limit, rotate it (number of digits) times and check that each result is prime.",
    ],
    solution: {
      idea: [
        "Sieve all primes up to 10^k where k is the digit count of limit - 1. Then for each prime below limit rotate its digits one at a time and require every rotation to be prime. Rotations keep the same digit count so they stay inside the sieve.",
      ],
      complexity: "O(N log log N) for the sieve with N = 10^k, plus O(count * digits) for the rotations.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int circularPrimes(int limit) {
        long long bound = 10;
        while (bound < limit) bound *= 10;
        vector<char> comp(bound + 1, 0);
        comp[0] = comp[1] = 1;
        for (long long i = 2; i * i <= bound; i++)
            if (!comp[i]) for (long long j = i * i; j <= bound; j += i) comp[j] = 1;
        int count = 0;
        for (int p = 2; p < limit; p++) {
            if (comp[p]) continue;
            int digits = 0, pw = 1;
            for (int t = p; t > 0; t /= 10) { digits++; if (t >= 10) pw *= 10; }
            bool ok = true;
            int x = p;
            for (int i = 0; i < digits && ok; i++) {
                x = (x % pw) * 10 + x / pw;
                if (comp[x]) ok = false;
            }
            if (ok) count++;
        }
        return count;
    }
};
`,
    },
  },
  {
    id: "c-euler-48",
    source: "euler",
    url: "https://projecteuler.net/problem=48",
    title: "Self Powers",
    statement: [
      "Consider the sum 1^1 + 2^2 + 3^3 + ... + n^n, where each term k^k means k multiplied by itself k times. The total can have thousands of digits, so you are only asked for its last few: return the last digits digits of the sum, as a number (leading zeros disappear, so 0405 is returned as 405).",
      "The original task asks for the last ten digits of the sum up to 1000. Here n and the number of digits are inputs.",
    ],
    constraints: ["1 <= n <= 100000", "1 <= digits <= 15"],
    fn: {"name":"selfPowersTail","params":[{"name":"n","type":"int"},{"name":"digits","type":"int"}],"returns":"long"},
    examples: [
      { input: [10,10], output: 405071317, explanation: "The full sum is 10405071317; its last ten digits are 0405071317, which is the number 405071317." },
      { input: [3,2], output: 32, explanation: "1 + 4 + 27 = 32." },
    ],
    tests: [
      { input: [1,1], output: 1 },
      { input: [2,1], output: 5 },
      { input: [3,2], output: 32 },
      { input: [10,3], output: 317 },
      { input: [20,5], output: 15024 },
      { input: [100,12], output: 969027641920 },
      { input: [500,15], output: 786071688579600 },
      { input: [12345,9], output: 285349621 },
      { input: [100000,15], output: 133213031782500 },
      { input: [7,15], output: 873612 },
    ],
    hints: [
      "Do not compute the full powers. You only need the sum modulo 10^digits.",
      "Compute k^k modulo m by repeated squaring (fast exponentiation) and add it to a running total modulo m.",
      "With m up to 10^15 a product of two residues reaches 10^30, which overflows 64 bits. Multiply with a 128-bit intermediate (__int128 in C++) or a mulmod routine.",
    ],
    solution: {
      idea: [
        "Let m = 10^digits. For each k from 1 to n compute k^k mod m by fast exponentiation with a safe multiplication (128-bit intermediate), and keep the running sum modulo m.",
      ],
      complexity: "O(n log n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    typedef unsigned long long u64;
    u64 mulmod(u64 a, u64 b, u64 m) { return (u64)((unsigned __int128)a * b % m); }
    u64 powmod(u64 b, u64 e, u64 m) {
        u64 r = 1 % m;
        b %= m;
        while (e) { if (e & 1) r = mulmod(r, b, m); b = mulmod(b, b, m); e >>= 1; }
        return r;
    }
    long long selfPowersTail(int n, int digits) {
        u64 m = 1;
        for (int i = 0; i < digits; i++) m *= 10;
        u64 total = 0;
        for (int k = 1; k <= n; k++) total = (total + powmod(k, k, m)) % m;
        return (long long)total;
    }
};
`,
    },
  },
  {
    id: "c-atc-abc136-b",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abc136/tasks/abc136_b",
    title: "Uneven Numbers (AtCoder ABC 136 B)",
    statement: [
      "Count how many integers from 1 to n have an odd number of digits when written in decimal (without leading zeros). For example 7 has one digit and 100 has three, so both count; 24 has two digits and does not.",
      "Written for this app from the AtCoder problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["1 <= n <= 1000000000"],
    fn: {"name":"oddDigitCount","params":[{"name":"n","type":"int"}],"returns":"int"},
    examples: [
      { input: [11], output: 9, explanation: "Only 1 to 9 have one digit; 10 and 11 have two." },
      { input: [136], output: 46, explanation: "1 to 9 (9 numbers) and 100 to 136 (37 numbers)." },
    ],
    tests: [
      { input: [1], output: 1 },
      { input: [9], output: 9 },
      { input: [10], output: 9 },
      { input: [99], output: 9 },
      { input: [100], output: 10 },
      { input: [999], output: 909 },
      { input: [1000], output: 909 },
      { input: [99999], output: 90909 },
      { input: [100000], output: 90909 },
      { input: [1000000000], output: 909090909 },
    ],
    hints: [
      "Numbers with a given digit count form a block: 1 to 9, 10 to 99, 100 to 999, and so on.",
      "Only the blocks with 1, 3, 5, 7 or 9 digits matter. For a block from lo to hi, if n >= lo it contributes min(n, hi) - lo + 1 numbers.",
      "Add the contributions of the five blocks. No loop over the numbers is needed.",
    ],
    solution: {
      idea: [
        "Walk the digit counts 1, 3, 5, 7 and 9; for each, the block is 10^(d-1) to 10^d - 1. Add the part of the block that is not above n.",
      ],
      complexity: "O(1).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int oddDigitCount(int n) {
        long long lo = 1;
        int total = 0;
        for (int d = 1; d <= 9; d++) {
            long long hi = lo * 10 - 1;
            if (d % 2 == 1 && n >= lo) total += (int)(min<long long>(n, hi) - lo + 1);
            lo *= 10;
        }
        return total;
    }
};
`,
    },
  },
  {
    id: "c-atc-abc143-b",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abc143/tasks/abc143_b",
    title: "Takoyaki Festival (AtCoder ABC 143 B)",
    statement: [
      "There are n takoyaki, the i-th has deliciousness d[i]. Eating two of them gives you x * y health, where x and y are their deliciousness values. Over all the pairs of different takoyaki (each pair counted once), return the total health.",
      "Written for this app from the AtCoder problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["2 <= d.length <= 50", "0 <= d[i] <= 100"],
    fn: {"name":"pairProductSum","params":[{"name":"d","type":"int[]"}],"returns":"int"},
    examples: [
      { input: [[3,1,2]], output: 11, explanation: "3 * 1 + 3 * 2 + 1 * 2 = 11." },
      { input: [[5,0,7,8,3,3,2,9,3,4]], output: 835 },
    ],
    tests: [
      { input: [[0,0]], output: 0 },
      { input: [[1,1]], output: 1 },
      { input: [[100,100]], output: 10000 },
      { input: [[1,2,3,4]], output: 35 },
      { input: [[0,5,0]], output: 0 },
      { input: [[7,7,7,7,7,7]], output: 735 },
      { input: [[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]], output: 12250000 },
      { input: [[1,100]], output: 100 },
    ],
    hints: [
      "Two nested loops over i < j and adding d[i] * d[j] work for 50 numbers.",
      "For a faster way, expand (sum of all)^2: it equals the sum of squares plus twice the sum of all pair products.",
      "So the answer is ((sum)^2 - (sum of squares)) / 2. The result is at most about 1.2 * 10^7, which fits an int.",
    ],
    solution: {
      idea: [
        "(d1 + d2 + ... + dn)^2 contains every square once and every pair product twice. Subtract the squares and halve the rest. A double loop over pairs is also fine for the given limits.",
      ],
      complexity: "O(n) time with the formula.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int pairProductSum(vector<int> d) {
        int sum = 0, squares = 0;
        for (int x : d) { sum += x; squares += x * x; }
        return (sum * sum - squares) / 2;
    }
};
`,
    },
  },
  {
    id: "c-atc-abc146-b",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abc146/tasks/abc146_b",
    title: "ROT N (AtCoder ABC 146 B)",
    statement: [
      "Shift every letter of s forward in the alphabet by n places, wrapping around from Z back to A. For example shifting by 2 turns A into C and Y into A.",
      "Written for this app from the AtCoder problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["0 <= n <= 26", "1 <= s.length <= 10000", "s contains only the capital letters A to Z"],
    fn: {"name":"rotN","params":[{"name":"n","type":"int"},{"name":"s","type":"string"}],"returns":"string"},
    examples: [
      { input: [2,"ABCXYZ"], output: "CDEZAB", explanation: "A to C, B to D, C to E, X to Z, Y to A, Z to B." },
      { input: [0,"ABCXYZ"], output: "ABCXYZ" },
    ],
    tests: [
      { input: [0,"A"], output: "A" },
      { input: [26,"HELLO"], output: "HELLO" },
      { input: [1,"Z"], output: "A" },
      { input: [13,"HELLO"], output: "URYYB" },
      { input: [25,"ABC"], output: "ZAB" },
      { input: [5,"QWERTYUIOPASDFGHJKLZXCVBNM"], output: "VBJWYDZNTUFXIKLMOPQECHAGSR" },
      { input: [13,"NOPQRSTUVWXYZABCDEFGHIJKLM"], output: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" },
      { input: [3,"ZZZZZZ"], output: "CCCCCC" },
    ],
    hints: [
      "Treat a letter as a number from 0 (A) to 25 (Z): c - 'A'.",
      "Add n, then wrap around with a modulo 26, and turn it back into a letter.",
      "Build the answer one character at a time: 'A' + (c - 'A' + n) % 26.",
    ],
    solution: {
      idea: [
        "Map each letter to 0..25, add n, reduce modulo 26 and map back. n = 26 and n = 0 both leave the text unchanged.",
      ],
      complexity: "O(length of s).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string rotN(int n, string s) {
        for (char& c : s) c = (char)('A' + (c - 'A' + n) % 26);
        return s;
    }
};
`,
    },
  },
  {
    id: "c-atc-abc148-b",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abc148/tasks/abc148_b",
    title: "Strings with the Same Length (AtCoder ABC 148 B)",
    statement: [
      "You get two strings s and t of the same length. Build a new string by taking the first character of s, then the first of t, then the second of s, then the second of t, and so on until both are used up.",
      "Written for this app from the AtCoder problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["1 <= s.length <= 100", "t.length = s.length", "both strings contain only lowercase letters"],
    fn: {"name":"interleave","params":[{"name":"s","type":"string"},{"name":"t","type":"string"}],"returns":"string"},
    examples: [
      { input: ["ip","cc"], output: "icpc", explanation: "i, c, p, c." },
      { input: ["ab","cd"], output: "acbd" },
    ],
    tests: [
      { input: ["a","b"], output: "ab" },
      { input: ["aa","bb"], output: "abab" },
      { input: ["abc","xyz"], output: "axbycz" },
      { input: ["zzzz","aaaa"], output: "zazazaza" },
      { input: ["hello","world"], output: "hweolrllod" },
      { input: ["a","a"], output: "aa" },
    ],
    hints: [
      "Loop i from 0 to the length minus one.",
      "In each step append s[i] and then t[i] to the result.",
      "Reserving the result size is optional; plain concatenation is fine for 100 characters.",
    ],
    solution: {
      idea: [
        "One loop over the index: append s[i], then t[i].",
      ],
      complexity: "O(n).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string interleave(string s, string t) {
        string r;
        for (size_t i = 0; i < s.size(); i++) { r += s[i]; r += t[i]; }
        return r;
    }
};
`,
    },
  },
  {
    id: "c-atc-abc149-b",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abc149/tasks/abc149_b",
    title: "Greedy Takahashi (AtCoder ABC 149 B)",
    statement: [
      "Takahashi has a cookies and Aoki has b cookies. Takahashi performs k actions in a row. In each action, if he still has a cookie he eats one of his own; otherwise, if Aoki still has a cookie he eats one of Aoki's; otherwise he does nothing.",
      "Return [a, b] as they are after the k actions (Takahashi's cookies first). The numbers are large, so a loop over the k actions is too slow.",
      "Written for this app from the AtCoder problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["0 <= a, b, k <= 1000000000000"],
    fn: {"name":"greedyTakahashi","params":[{"name":"a","type":"long"},{"name":"b","type":"long"},{"name":"k","type":"long"}],"returns":"long[]"},
    examples: [
      { input: [2,3,3], output: [0,2], explanation: "He eats his 2 cookies, then 1 of Aoki's." },
      { input: [500000000000,500000000000,1000000000000], output: [0,0] },
    ],
    tests: [
      { input: [0,0,0], output: [0,0] },
      { input: [0,0,5], output: [0,0] },
      { input: [5,0,3], output: [2,0] },
      { input: [5,0,9], output: [0,0] },
      { input: [1,1,1], output: [0,1] },
      { input: [3,7,3], output: [0,7] },
      { input: [3,7,4], output: [0,6] },
      { input: [10,10,100], output: [0,0] },
      { input: [1000000000000,1000000000000,1000000000000], output: [0,1000000000000] },
      { input: [0,8,3], output: [0,5] },
    ],
    hints: [
      "Do it in two phases. First he eats from his own pile: he can eat min(a, k) of them.",
      "Subtract that from a and from k. Whatever is left of k is spent on Aoki's pile.",
      "He eats min(b, remaining k) of Aoki's cookies. Any actions still left do nothing. Use 64-bit integers.",
    ],
    solution: {
      idea: [
        "Let x = min(a, k): a -= x, k -= x. Then y = min(b, k): b -= y. Return [a, b].",
      ],
      complexity: "O(1).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<long long> greedyTakahashi(long long a, long long b, long long k) {
        long long x = min(a, k);
        a -= x; k -= x;
        long long y = min(b, k);
        b -= y;
        return {a, b};
    }
};
`,
    },
  },
  {
    id: "c-atc-abc150-b",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abc150/tasks/abc150_b",
    title: "Count ABC (AtCoder ABC 150 B)",
    statement: [
      "Count how many times the three letters ABC appear next to each other, in this order, in the string s. Occurrences are counted by their starting position (they cannot overlap anyway).",
      "Written for this app from the AtCoder problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["3 <= s.length <= 50", "s contains only capital letters"],
    fn: {"name":"countAbc","params":[{"name":"s","type":"string"}],"returns":"int"},
    examples: [
      { input: ["ZABCDBABCQ"], output: 2, explanation: "ABC starts at index 1 and index 6." },
      { input: ["ABCABCABC"], output: 3 },
    ],
    tests: [
      { input: ["ABC"], output: 1 },
      { input: ["ABD"], output: 0 },
      { input: ["AABBCC"], output: 0 },
      { input: ["ABABC"], output: 1 },
      { input: ["CBA"], output: 0 },
      { input: ["ABCABC"], output: 2 },
      { input: ["AAAAAAAAAA"], output: 0 },
      { input: ["ZZABCZZABCZZABC"], output: 3 },
    ],
    hints: [
      "Look at every window of three consecutive characters.",
      "For each start index i from 0 to length - 3 compare s[i], s[i + 1], s[i + 2] with A, B, C.",
      "Increase the count for each window that matches.",
    ],
    solution: {
      idea: [
        "Slide a window of length 3 over the string and count the windows equal to ABC.",
      ],
      complexity: "O(n).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int countAbc(string s) {
        int c = 0;
        for (size_t i = 0; i + 2 < s.size(); i++)
            if (s[i] == 'A' && s[i + 1] == 'B' && s[i + 2] == 'C') c++;
        return c;
    }
};
`,
    },
  },
  {
    id: "c-cf-71a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/71/A",
    title: "Way Too Long Words (Codeforces 71A)",
    statement: [
      "A word is too long if it has more than 10 characters. Replace every too-long word by an abbreviation: its first letter, then the number of letters between the first and the last letter (written as a number), then its last letter. Words of length 10 or less stay as they are.",
      "Given one word, return what should be written. Written for this app from the Codeforces problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["1 <= word.length <= 100", "word contains only lowercase letters"],
    fn: {"name":"abbreviate","params":[{"name":"word","type":"string"}],"returns":"string"},
    examples: [
      { input: ["localization"], output: "l10n", explanation: "12 letters: l, then 10 letters in between, then n." },
      { input: ["word"], output: "word" },
    ],
    tests: [
      { input: ["a"], output: "a" },
      { input: ["abcdefghij"], output: "abcdefghij" },
      { input: ["abcdefghijk"], output: "a9k" },
      { input: ["internationalization"], output: "i18n" },
      { input: ["pneumonoultramicroscopicsilicovolcanoconiosis"], output: "p43s" },
      { input: ["zzzzzzzzzzz"], output: "z9z" },
    ],
    hints: [
      "Check the length first: 10 or fewer, return the word unchanged.",
      "For longer words the middle count is length - 2.",
      "Build the answer from the first character, the number as text (to_string) and the last character.",
    ],
    solution: {
      idea: [
        "If the length is at most 10, return the word. Otherwise return first letter + (length - 2) as a decimal number + last letter.",
      ],
      complexity: "O(n).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string abbreviate(string word) {
        if (word.size() <= 10) return word;
        return string(1, word.front()) + to_string(word.size() - 2) + word.back();
    }
};
`,
    },
  },
  {
    id: "c-cf-118a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/118/A",
    title: "String Task (Codeforces 118A)",
    statement: [
      "Process a string of letters in three ways: delete every vowel (the letters a, o, y, e, u and i, in either case), turn every remaining letter into lowercase, and put a dot in front of every letter that is left.",
      "Return the resulting string. Written for this app from the Codeforces problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["1 <= s.length <= 100", "s contains only English letters, capital or small"],
    fn: {"name":"stringTask","params":[{"name":"s","type":"string"}],"returns":"string"},
    examples: [
      { input: ["tour"], output: ".t.r", explanation: "o and u are vowels and are removed; each remaining letter gets a dot." },
      { input: ["Codeforces"], output: ".c.d.f.r.c.s" },
    ],
    tests: [
      { input: ["aeiouy"], output: "" },
      { input: ["b"], output: ".b" },
      { input: ["B"], output: ".b" },
      { input: ["AbEcIdOfUgY"], output: ".b.c.d.f.g" },
      { input: ["ABCDEFGHIJKLMNOPQRSTUVWXYZ"], output: ".b.c.d.f.g.h.j.k.l.m.n.p.q.r.s.t.v.w.x.z" },
      { input: ["abcdefghijklmnopqrstuvwxyz"], output: ".b.c.d.f.g.h.j.k.l.m.n.p.q.r.s.t.v.w.x.z" },
      { input: ["yyyYYY"], output: "" },
      { input: ["Qwerty"], output: ".q.w.r.t" },
    ],
    hints: [
      "Go through the characters one by one and lowercase each of them first.",
      "If the lowercase letter is one of a, o, y, e, u, i, skip it.",
      "Otherwise append a dot and then the letter to the result.",
    ],
    solution: {
      idea: [
        "Lowercase each character, skip vowels (aoyeui), and for every other character append '.' followed by the character.",
      ],
      complexity: "O(n).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string stringTask(string s) {
        string r;
        for (char c : s) {
            c = (char)tolower((unsigned char)c);
            if (string("aoyeui").find(c) != string::npos) continue;
            r += '.';
            r += c;
        }
        return r;
    }
};
`,
    },
  },
  {
    id: "c-cf-266a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/266/A",
    title: "Stones on the Table (Codeforces 266A)",
    statement: [
      "A row of stones lies on a table, each coloured red (R), green (G) or blue (B). You may take stones off the table. Return the smallest number of stones you must remove so that no two neighbouring stones in the row have the same colour (after a removal the stones on either side become neighbours).",
      "Written for this app from the Codeforces problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["1 <= s.length <= 50", "s contains only the letters R, G and B"],
    fn: {"name":"stonesOnTable","params":[{"name":"s","type":"string"}],"returns":"int"},
    examples: [
      { input: ["RRG"], output: 1, explanation: "Remove one of the two red stones." },
      { input: ["RRRRR"], output: 4, explanation: "Only one stone can stay." },
    ],
    tests: [
      { input: ["R"], output: 0 },
      { input: ["RG"], output: 0 },
      { input: ["RGB"], output: 0 },
      { input: ["RGRGRG"], output: 0 },
      { input: ["RRGGBB"], output: 3 },
      { input: ["BBBBBBBBBB"], output: 9 },
      { input: ["RGGRRGGGB"], output: 4 },
      { input: ["RBBR"], output: 1 },
    ],
    hints: [
      "Think of the row as runs of equal colour. What has to happen inside a run of length 4?",
      "In a run of length L, you must remove L - 1 stones: one stone of the run can stay.",
      "That is the same as counting positions i where s[i] equals s[i - 1]. Count those.",
    ],
    solution: {
      idea: [
        "Removing a stone from the middle of a run does not create a new equal pair, so the minimum is the number of adjacent equal pairs: count i with s[i] == s[i - 1].",
      ],
      complexity: "O(n).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int stonesOnTable(string s) {
        int c = 0;
        for (size_t i = 1; i < s.size(); i++) if (s[i] == s[i - 1]) c++;
        return c;
    }
};
`,
    },
  },
  {
    id: "c-cf-677a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/677/A",
    title: "Vanya and Fence (Codeforces 677A)",
    statement: [
      "Friends walk along a fence of height h. A friend taller than h has to bend down to stay hidden, and then takes up a width of 2. Every other friend (height at most h) takes up a width of 1. They walk in a single row.",
      "Given the heights of the friends, return the minimum width of the road they need. Written for this app from the Codeforces problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["1 <= heights.length <= 1000", "1 <= h <= 1000", "1 <= heights[i] <= 2 * h"],
    fn: {"name":"fenceWidth","params":[{"name":"heights","type":"int[]"},{"name":"h","type":"int"}],"returns":"int"},
    examples: [
      { input: [[4,5,14],7], output: 4, explanation: "4 and 5 fit under 7 (width 1 each); 14 is taller (width 2)." },
      { input: [[1,1,1,1,1,1],1], output: 6 },
    ],
    tests: [
      { input: [[1],1], output: 1 },
      { input: [[2],1], output: 2 },
      { input: [[1000],500], output: 2 },
      { input: [[500,501],500], output: 3 },
      { input: [[1,2,3,4,5],3], output: 7 },
      { input: [[10,10,10,10],5], output: 8 },
      { input: [[3,6,3,6,3,6],3], output: 9 },
      { input: [[7,7,7],7], output: 3 },
    ],
    hints: [
      "Each friend contributes independently: 1 or 2 to the total width.",
      "A friend adds 2 when their height is greater than h, otherwise 1.",
      "Sum the contributions in one pass.",
    ],
    solution: {
      idea: [
        "Sum 1 for every friend with height <= h and 2 for every friend with height > h.",
      ],
      complexity: "O(n).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int fenceWidth(vector<int> heights, int h) {
        int w = 0;
        for (int x : heights) w += x > h ? 2 : 1;
        return w;
    }
};
`,
    },
  },
  {
    id: "c-cf-160a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/160/A",
    title: "Twins (Codeforces 160A)",
    statement: [
      "You and your twin share a pile of coins with the given values. You will take some of the coins for yourself and leave the rest. The sum of the coins you take must be strictly larger than the sum of the coins you leave.",
      "Return the smallest number of coins you must take. Written for this app from the Codeforces problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["1 <= coins.length <= 100", "1 <= coins[i] <= 100"],
    fn: {"name":"twinsCoins","params":[{"name":"coins","type":"int[]"}],"returns":"int"},
    examples: [
      { input: [[3,3]], output: 2, explanation: "One coin gives 3 against 3, not strictly larger; both coins give 6 against 0." },
      { input: [[2,1,2]], output: 2, explanation: "Take the two coins of value 2: 4 against 1." },
    ],
    tests: [
      { input: [[1]], output: 1 },
      { input: [[5,1]], output: 1 },
      { input: [[1,1,1]], output: 2 },
      { input: [[4,4,4,4]], output: 3 },
      { input: [[100,1,1,1]], output: 1 },
      { input: [[1,2,3,4,5]], output: 2 },
      { input: [[10,9,8,7,6,5,4,3,2,1]], output: 4 },
      { input: [[50,50]], output: 2 },
    ],
    hints: [
      "To use as few coins as possible, take the most valuable ones first.",
      "Sort the coins in descending order.",
      "Add coins to your total one by one until your total is greater than the sum of the rest (total sum minus yours). Return how many you took.",
    ],
    solution: {
      idea: [
        "Greedy: taking the largest coins first reaches the required sum with the fewest coins. Stop when 2 * mine > total.",
      ],
      complexity: "O(n log n) for the sort.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int twinsCoins(vector<int> coins) {
        sort(coins.rbegin(), coins.rend());
        int total = 0;
        for (int c : coins) total += c;
        int mine = 0, count = 0;
        for (int c : coins) {
            mine += c;
            count++;
            if (2 * mine > total) break;
        }
        return count;
    }
};
`,
    },
  },
  {
    id: "c-cf-69a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/69/A",
    title: "Young Physicist (Codeforces 69A)",
    statement: [
      "Several forces act on a body at the same time. Each force is a vector of three whole numbers (its x, y and z parts). The body stays at rest (is in equilibrium) when the sum of all the force vectors is the zero vector.",
      "Return true if the body is in equilibrium and false otherwise. Written for this app from the Codeforces problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["1 <= forces.length <= 100", "forces[i] has three entries", "-100 <= forces[i][j] <= 100"],
    fn: {"name":"youngPhysicist","params":[{"name":"forces","type":"int[][]"}],"returns":"bool"},
    examples: [
      { input: [[[4,1,7],[-2,4,-1],[1,-5,-3]]], output: false, explanation: "The x parts add up to 3, not 0." },
      { input: [[[3,-1,7],[-5,2,-4],[2,-1,-3]]], output: true, explanation: "x: 0, y: 0 and z: 0." },
    ],
    tests: [
      { input: [[[0,0,0]]], output: true },
      { input: [[[1,0,0]]], output: false },
      { input: [[[1,2,3],[-1,-2,-3]]], output: true },
      { input: [[[1,2,3],[-1,-2,-2]]], output: false },
      { input: [[[100,100,100],[-100,-100,-100],[5,5,5]]], output: false },
      { input: [[[1,0,0],[0,1,0],[0,0,1],[-1,-1,-1]]], output: true },
      { input: [[[1,1,1],[-1,1,-1],[0,-2,0]]], output: true },
    ],
    hints: [
      "Forces add up component by component: the x parts together, the y parts together, the z parts together.",
      "Keep three running sums, one for each axis.",
      "Return true exactly when all three sums are 0.",
    ],
    solution: {
      idea: [
        "Sum the three coordinates separately over all forces; the body is at rest when all three sums are zero.",
      ],
      complexity: "O(n).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool youngPhysicist(vector<vector<int>> forces) {
        int x = 0, y = 0, z = 0;
        for (auto& f : forces) { x += f[0]; y += f[1]; z += f[2]; }
        return x == 0 && y == 0 && z == 0;
    }
};
`,
    },
  },
  {
    id: "c-cf-110a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/110/A",
    title: "Nearly Lucky Number (Codeforces 110A)",
    statement: [
      "Call the digits 4 and 7 lucky. A number is lucky if all of its digits are lucky (4, 7, 47, 744 ...). A number is nearly lucky if the count of lucky digits in it is a lucky number.",
      "The number is given as a string of digits n (it can have up to 18 digits). Return true if it is nearly lucky, false otherwise. Written for this app from the Codeforces problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["1 <= n.length <= 18", "n has no leading zeros and contains only digits"],
    fn: {"name":"nearlyLucky","params":[{"name":"n","type":"string"}],"returns":"bool"},
    examples: [
      { input: ["40047"], output: false, explanation: "It has 3 lucky digits (4, 4, 7) and 3 is not a lucky number." },
      { input: ["7747774"], output: true, explanation: "It has 7 lucky digits and 7 is lucky." },
    ],
    tests: [
      { input: ["1"], output: false },
      { input: ["4"], output: false },
      { input: ["44"], output: false },
      { input: ["47"], output: false },
      { input: ["444"], output: false },
      { input: ["4444"], output: true },
      { input: ["4477"], output: true },
      { input: ["123456789123456789"], output: true },
      { input: ["777777777777777777"], output: false },
      { input: ["4000000000000000"], output: false },
    ],
    hints: [
      "First count the digits equal to 4 or 7 in the string.",
      "Zero lucky digits is not a lucky number (a lucky number needs at least one digit).",
      "Check that the count itself, written in decimal, contains only 4s and 7s (the count is at most 18).",
    ],
    solution: {
      idea: [
        "Count the characters that are '4' or '7'. Then test that this count is positive and that every digit of the count is 4 or 7.",
      ],
      complexity: "O(n).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool nearlyLucky(string n) {
        int c = 0;
        for (char ch : n) if (ch == '4' || ch == '7') c++;
        if (c == 0) return false;
        while (c > 0) {
            int d = c % 10;
            if (d != 4 && d != 7) return false;
            c /= 10;
        }
        return true;
    }
};
`,
    },
  },
  {
    id: "c-cf-339a",
    source: "codeforces",
    url: "https://codeforces.com/problemset/problem/339/A",
    title: "Helpful Maths (Codeforces 339A)",
    statement: [
      "A sum is written as digits 1, 2 and 3 joined with plus signs, such as 3+2+1. It is easier to calculate when the numbers appear in non-decreasing order. Rearrange the terms of the sum so they are in non-decreasing order and return the new sum as a string.",
      "Written for this app from the Codeforces problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["1 <= s.length <= 100", "s is a valid sum: single digits 1, 2 or 3 separated by single plus signs"],
    fn: {"name":"helpfulMaths","params":[{"name":"s","type":"string"}],"returns":"string"},
    examples: [
      { input: ["3+2+1"], output: "1+2+3" },
      { input: ["2"], output: "2", explanation: "A single number stays as it is." },
    ],
    tests: [
      { input: ["1"], output: "1" },
      { input: ["1+1"], output: "1+1" },
      { input: ["3+1"], output: "1+3" },
      { input: ["2+3+1+2"], output: "1+2+2+3" },
      { input: ["3+3+3+3"], output: "3+3+3+3" },
      { input: ["1+2+3+1+2+3+1+2+3"], output: "1+1+1+2+2+2+3+3+3" },
      { input: ["2+1+2+1+2+1"], output: "1+1+1+2+2+2" },
      { input: ["3+2+1+3+2+1"], output: "1+1+2+2+3+3" },
    ],
    hints: [
      "The plus signs are only separators. Collect the digits first.",
      "Since the digits are only 1, 2 and 3, you can sort them, or count how many of each there are.",
      "Join the sorted digits with '+' between them.",
    ],
    solution: {
      idea: [
        "Take every second character (the digits), sort them, and put plus signs between them again.",
      ],
      complexity: "O(n log n) with sort, O(n) with counting.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string helpfulMaths(string s) {
        string d;
        for (char c : s) if (c != '+') d += c;
        sort(d.begin(), d.end());
        string r;
        for (size_t i = 0; i < d.size(); i++) {
            if (i) r += '+';
            r += d[i];
        }
        return r;
    }
};
`,
    },
  },
  {
    id: "c-kattis-r2",
    source: "kattis",
    url: "https://open.kattis.com/problems/r2",
    title: "R2 (Kattis)",
    statement: [
      "The mean of two numbers r1 and r2 is (r1 + r2) / 2. You know r1 and you know the mean s. Return r2.",
      "Written for this app from the Kattis problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["-1000 <= r1, s <= 1000"],
    fn: {"name":"findR2","params":[{"name":"r1","type":"int"},{"name":"s","type":"int"}],"returns":"int"},
    examples: [
      { input: [11,15], output: 19, explanation: "(11 + 19) / 2 = 15." },
      { input: [4,4], output: 4 },
    ],
    tests: [
      { input: [0,0], output: 0 },
      { input: [1,0], output: -1 },
      { input: [-5,5], output: 15 },
      { input: [1000,-1000], output: -3000 },
      { input: [-1000,1000], output: 3000 },
      { input: [7,-3], output: -13 },
      { input: [-8,-8], output: -8 },
      { input: [123,456], output: 789 },
    ],
    hints: [
      "Write the equation: (r1 + r2) / 2 = s.",
      "Multiply both sides by 2, then move r1 to the other side.",
      "r2 = 2 * s - r1.",
    ],
    solution: {
      idea: [
        "From (r1 + r2) / 2 = s we get r2 = 2 * s - r1.",
      ],
      complexity: "O(1).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int findR2(int r1, int s) {
        return 2 * s - r1;
    }
};
`,
    },
  },
  {
    id: "c-kattis-spavanac",
    source: "kattis",
    url: "https://open.kattis.com/problems/spavanac",
    title: "Spavanac (Kattis)",
    statement: [
      "Mirko wants to be woken exactly 45 minutes earlier than the alarm time he is given, as hours and minutes on a 24-hour clock. The clock wraps around: 45 minutes before 00:30 is 23:45 the day before.",
      "Given the alarm hour h and minute m, return the new time as [hour, minute]. Written for this app from the Kattis problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["0 <= h <= 23", "0 <= m <= 59"],
    fn: {"name":"alarmEarlier","params":[{"name":"h","type":"int"},{"name":"m","type":"int"}],"returns":"int[]"},
    examples: [
      { input: [10,10], output: [9,25], explanation: "10:10 minus 45 minutes is 9:25." },
      { input: [0,30], output: [23,45], explanation: "The time wraps to the previous day." },
    ],
    tests: [
      { input: [0,0], output: [23,15] },
      { input: [0,44], output: [23,59] },
      { input: [0,45], output: [0,0] },
      { input: [1,0], output: [0,15] },
      { input: [12,45], output: [12,0] },
      { input: [23,59], output: [23,14] },
      { input: [5,17], output: [4,32] },
      { input: [23,40], output: [22,55] },
    ],
    hints: [
      "Convert the time to minutes since midnight: h * 60 + m.",
      "Subtract 45 and add 24 * 60 so the value cannot be negative, then take the remainder modulo 24 * 60.",
      "Convert back: hour = total / 60, minute = total % 60.",
    ],
    solution: {
      idea: [
        "Work in minutes since midnight: t = (h * 60 + m - 45 + 1440) % 1440, then the answer is [t / 60, t % 60].",
      ],
      complexity: "O(1).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> alarmEarlier(int h, int m) {
        int t = (h * 60 + m - 45 + 1440) % 1440;
        return {t / 60, t % 60};
    }
};
`,
    },
  },
  {
    id: "c-kattis-autori",
    source: "kattis",
    url: "https://open.kattis.com/problems/autori",
    title: "Autori (Kattis)",
    statement: [
      "A long name is made of several words joined by hyphens, each word starting with a capital letter, such as Knuth-Morris-Pratt. Return the short form made of the first letter of every word, in order: KMP.",
      "Written for this app from the Kattis problem linked above; the original reads standard input, here you write a function.",
    ],
    constraints: ["1 <= name.length <= 100", "name has words of letters separated by single hyphens; every word starts with a capital letter and the rest are lowercase"],
    fn: {"name":"longNameInitials","params":[{"name":"name","type":"string"}],"returns":"string"},
    examples: [
      { input: ["Knuth-Morris-Pratt"], output: "KMP" },
      { input: ["Mirko-Slavko"], output: "MS" },
    ],
    tests: [
      { input: ["Anna"], output: "A" },
      { input: ["A-B"], output: "AB" },
      { input: ["Jean-Claude-Van-Damme"], output: "JCVD" },
      { input: ["Abcdefghijklmnopqrstuvwxyz"], output: "A" },
      { input: ["Zz-Yy-Xx-Ww-Vv-Uu"], output: "ZYXWVU" },
      { input: ["Ab-Cd"], output: "AC" },
    ],
    hints: [
      "Which characters of the string are initials: the first character and the ones right after a hyphen.",
      "Walk through the string. Take the character at index 0, and every character whose previous character is '-'.",
      "Append those to the result in order.",
    ],
    solution: {
      idea: [
        "One pass: keep a character when it is the first of the string or follows a hyphen.",
      ],
      complexity: "O(n).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string longNameInitials(string name) {
        string r;
        for (size_t i = 0; i < name.size(); i++)
            if (i == 0 || name[i - 1] == '-') r += name[i];
        return r;
    }
};
`,
    },
  },
];
