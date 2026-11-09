import type { ProblemSpec } from "./types";

// Logic building, round six (Agent 2): 20 more Project Euler problems and 20 AtCoder beginner tasks, written in our own words as functions (each links to the original). The expected outputs of every test were produced by running the C++ reference solution; the published answers are not stored (Euler parameters differ from the originals).

export const LOGIC_SPECS_C: ProblemSpec[] = [
  {
    id: "c-euler-18",
    source: "euler",
    url: "https://projecteuler.net/problem=18",
    title: "Triangle Path Sum",
    statement: [
      "A triangle of numbers has one number in its first row, two in the second, and so on. Start at the top and walk down one row at a time; from a number you may go to the number directly below it or to the one just below and to the right. Return the largest total you can collect on the way to the bottom row.",
      "Trying every route takes 2^(rows-1) walks, far too many for 1000 rows. Work from the bottom up instead.",
    ],
    constraints: ["1 <= triangle.length <= 1000","triangle[i].length == i + 1","0 <= triangle[i][j] <= 99"],
    fn: {"name":"maxPathTriangle","params":[{"name":"triangle","type":"int[][]"}],"returns":"int"},
    examples: [
      { input: [[[3],[7,4],[2,4,6],[8,5,9,3]]], output: 23 },
      { input: [[[5]]], output: 5 },
    ],
    tests: [
      { input: [[[0]]], output: 0 },
      { input: [[[1],[1,1]]], output: 2 },
      { input: [[[99],[0,0],[0,0,0]]], output: 99 },
      { input: [[[1],[2,3],[3,2,1]]], output: 6 },
      { input: [[[64],[6,69],[45,26,40],[4,93,43,81],[69,35,30,34,85],[91,59,75,78,28,88],[87,54,51,81,39,58,3],[95,91,77,8,85,91,89,30],[86,8,24,89,52,11,92,52,53],[87,72,39,10,2,75,33,86,75,9]]], output: 754 },
      { input: [[[81],[4,0],[66,35,25],[5,59,90,11],[54,93,62,46,11],[44,81,77,42,85,86],[87,97,88,88,87,66,61],[85,2,50,77,69,52,51,74],[79,76,70,75,34,26,9,7,6],[25,62,67,59,61,8,69,88,13,54],[8,42,60,65,58,77,28,97,15,62,20],[30,92,72,32,37,27,12,67,16,75,95,70],[90,25,5,80,36,43,99,30,82,9,59,27,90],[60,20,73,41,84,64,30,90,11,60,68,43,48,6],[81,2,82,47,77,74,81,16,56,61,35,16,13,52,30],[64,2,91,26,24,67,37,29,76,78,42,11,62,49,99,49],[19,38,15,8,8,44,55,48,15,14,7,49,20,36,24,77,35],[62,5,32,34,97,31,99,78,45,22,69,9,76,65,29,91,39,46],[37,97,29,6,27,16,44,44,83,21,49,3,99,96,54,93,97,3,0],[90,58,2,29,75,4,82,46,68,61,55,4,35,42,66,82,30,10,42,52],[38,48,24,54,11,60,75,28,21,4,67,11,87,3,7,0,22,23,29,88,84],[33,18,0,6,50,60,65,91,69,97,26,57,61,90,52,84,33,18,76,83,21,54],[90,81,6,18,92,32,77,27,47,90,67,94,54,61,27,54,3,93,61,43,87,81,65],[13,36,95,99,65,33,65,52,40,47,39,99,47,52,71,21,37,53,45,62,45,88,75,42],[79,53,59,31,61,98,92,67,79,52,17,91,85,86,53,77,0,45,28,94,30,27,33,70,83],[41,27,23,73,99,85,22,51,34,87,67,57,31,40,83,2,24,34,64,90,9,35,45,7,39,86],[16,68,37,89,84,50,93,65,61,84,70,99,74,26,44,87,53,85,32,76,0,47,95,20,18,67,84],[45,44,74,91,86,62,48,23,83,23,75,80,63,56,56,40,33,52,78,11,84,32,40,31,1,32,81,75],[55,61,50,73,85,3,64,12,57,93,39,7,15,44,21,27,66,16,53,53,29,71,37,78,8,51,67,22,38],[88,44,9,88,12,83,3,45,6,34,35,44,58,69,69,68,39,42,5,30,0,91,72,96,60,62,28,56,40,95]]], output: 2125 },
      { input: [[[55],[57,88]]], output: 143 },
      { input: [[[50],[50,50],[50,50,50],[50,50,50,50]]], output: 200 },
    ],
    hints: ["Think of the last row first. For a number in the row above, which of the two numbers below it is the better continuation?","Let best[i][j] be the largest total from position (i, j) to the bottom. Then best[i][j] = triangle[i][j] + max(best[i+1][j], best[i+1][j+1]).","Start from the second to last row and overwrite one array of row values in place, going upward. The answer is best[0][0]. Time O(rows^2)."],
    solution: {
      idea: ["Dynamic programming from the bottom: keep an array equal to the last row, then for each row above replace entry j by triangle[i][j] + max(d[j], d[j+1]).","After the top row is processed d[0] holds the best total."],
      complexity: "O(n^2) time for n rows, O(n) extra space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int maxPathTriangle(vector<vector<int>>& triangle) {
        int n = triangle.size();
        vector<int> d = triangle[n - 1];
        for (int i = n - 2; i >= 0; i--)
            for (int j = 0; j <= i; j++) d[j] = triangle[i][j] + max(d[j], d[j + 1]);
        return d[0];
    }
};
`,
    },
  },
  {
    id: "c-euler-20",
    source: "euler",
    url: "https://projecteuler.net/problem=20",
    title: "Factorial Digit Sum",
    statement: [
      "Compute n! (1 * 2 * ... * n) and return the sum of its decimal digits.",
      "n! has thousands of digits for n = 1000, far more than a 64-bit integer holds, so you need to store the number yourself, for example as an array of digits or of base 10^9 chunks, and multiply it by 2, 3, ..., n in turn.",
    ],
    constraints: ["0 <= n <= 3000"],
    fn: {"name":"factorialDigitSum","params":[{"name":"n","type":"int"}],"returns":"int"},
    examples: [
      { input: [5], output: 3 },
      { input: [0], output: 1 },
    ],
    tests: [
      { input: [1], output: 1 },
      { input: [9], output: 27 },
      { input: [12], output: 27 },
      { input: [25], output: 72 },
      { input: [50], output: 216 },
      { input: [200], output: 1404 },
      { input: [1000], output: 10539 },
      { input: [2999], output: 37656 },
    ],
    hints: ["Keep the product as a list of small chunks (least significant first) and multiply the whole list by k for each k = 2..n, carrying as you go.","Using chunks of 10^9 in a 64-bit integer makes it about nine times faster than single digits. The carry fits easily because chunk * k stays below 4 * 10^12.","At the end, add the decimal digits of every chunk (leading zeros add nothing). 0! is 1."],
    solution: {
      idea: ["Big-number multiplication by a small number: store base 10^9 chunks, multiply each by k and carry the overflow upward.","Sum the digits of all chunks at the end."],
      complexity: "O(n * D) time where D is the number of chunks (about 1000 for n = 3000), O(D) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int factorialDigitSum(int n) {
        const long long B = 1000000000LL;
        vector<long long> a{1};
        for (int k = 2; k <= n; k++) {
            long long carry = 0;
            for (auto& x : a) {
                long long cur = x * k + carry;
                x = cur % B;
                carry = cur / B;
            }
            while (carry) { a.push_back(carry % B); carry /= B; }
        }
        int sum = 0;
        for (long long x : a) while (x) { sum += x % 10; x /= 10; }
        return sum;
    }
};
`,
    },
  },
  {
    id: "c-euler-23",
    source: "euler",
    url: "https://projecteuler.net/problem=23",
    title: "Not a Sum of Two Abundant Numbers",
    statement: [
      "A number is abundant when the sum of its proper divisors (divisors smaller than itself) is larger than the number. 12 is the first one. Return the sum of all positive whole numbers up to limit that can NOT be written as the sum of two abundant numbers (the two may be equal).",
      "limit can be as large as 10^9. It is a known fact that every number above 28123 is a sum of two abundant numbers, so you never need to look beyond that.",
    ],
    constraints: ["1 <= limit <= 1000000000"],
    fn: {"name":"nonAbundantSum","params":[{"name":"limit","type":"int"}],"returns":"long"},
    examples: [
      { input: [24], output: 276 },
      { input: [10], output: 55 },
    ],
    tests: [
      { input: [1], output: 1 },
      { input: [23], output: 276 },
      { input: [25], output: 301 },
      { input: [100], output: 2766 },
      { input: [1000], output: 240492 },
      { input: [20161], output: 4179871 },
      { input: [28122], output: 4179871 },
      { input: [100000], output: 4179871 },
      { input: [1000000000], output: 4179871 },
    ],
    hints: ["Only numbers up to 28123 can fail. Use L = min(limit, 28123) and ignore the rest.","Sieve the sum of proper divisors for every number up to L (add d to every multiple of d), and collect the abundant ones in a list.","For every pair of abundant numbers a <= b with a + b <= L, mark a + b. The answer is the sum of unmarked numbers from 1 to L."],
    solution: {
      idea: ["Cap the range at 28123 because above it every integer is a sum of two abundant numbers.","Sieve divisor sums, list abundant numbers, mark every pair sum, then add up the unmarked numbers up to the capped limit."],
      complexity: "About O(L log L + A^2) with L = 28123 and A about 7000 abundant numbers (~25 million pair checks).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    long long nonAbundantSum(int limit) {
        int L = min(limit, 28123);
        vector<int> sig(L + 1, 0);
        for (int d = 1; d <= L / 2; d++)
            for (int m = 2 * d; m <= L; m += d) sig[m] += d;
        vector<int> ab;
        for (int i = 1; i <= L; i++) if (sig[i] > i) ab.push_back(i);
        vector<char> mark(L + 1, 0);
        for (size_t i = 0; i < ab.size(); i++)
            for (size_t j = i; j < ab.size() && ab[i] + ab[j] <= L; j++) mark[ab[i] + ab[j]] = 1;
        long long sum = 0;
        for (int i = 1; i <= L; i++) if (!mark[i]) sum += i;
        return sum;
    }
};
`,
    },
  },
  {
    id: "c-euler-25",
    source: "euler",
    url: "https://projecteuler.net/problem=25",
    title: "First Fibonacci With D Digits",
    statement: [
      "Use the Fibonacci numbers F1 = 1, F2 = 1, F3 = 2, F4 = 3, ... (each is the sum of the two before). Return the index k of the first Fibonacci number that has at least d decimal digits.",
      "For d = 2000 the number has 2000 digits, so you must add big numbers digit by digit.",
    ],
    constraints: ["1 <= d <= 2000"],
    fn: {"name":"firstFibWithDigits","params":[{"name":"d","type":"int"}],"returns":"int"},
    examples: [
      { input: [3], output: 12 },
      { input: [1], output: 1 },
    ],
    tests: [
      { input: [2], output: 7 },
      { input: [4], output: 17 },
      { input: [10], output: 45 },
      { input: [50], output: 237 },
      { input: [100], output: 476 },
      { input: [500], output: 2390 },
      { input: [1999], output: 9563 },
      { input: [2000], output: 9567 },
    ],
    hints: ["Keep two big numbers as arrays of digits (least significant first) and add them like on paper.","Repeat: next = a + b, shift a = b, b = next, k = k + 1, until the number of digits of b reaches d.","d = 1 is already true for F1, so answer 1. Adding digit arrays costs O(digits) per step and there are about 4.8 * d steps."],
    solution: {
      idea: ["Simulate the sequence with digit-array addition and stop at the first term with d digits.","Start with F1 and F2 both equal to 1 and count the index."],
      complexity: "O(d^2) time (about 5d steps of O(d) work), O(d) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int firstFibWithDigits(int d) {
        if (d <= 1) return 1;
        vector<int> a{1}, b{1};
        int k = 2;
        while ((int)b.size() < d) {
            vector<int> c;
            int carry = 0;
            for (size_t i = 0; i < b.size(); i++) {
                int s = b[i] + (i < a.size() ? a[i] : 0) + carry;
                c.push_back(s % 10);
                carry = s / 10;
            }
            if (carry) c.push_back(carry);
            a = b;
            b = c;
            k++;
        }
        return k;
    }
};
`,
    },
  },
  {
    id: "c-euler-27",
    source: "euler",
    url: "https://projecteuler.net/problem=27",
    title: "Longest Prime Run of a Quadratic",
    statement: [
      "For whole numbers a and b consider the formula n * n + a * n + b, evaluated at n = 0, 1, 2, ... Count how many consecutive values, starting at n = 0, are prime (a prime is larger than 1; negative values and 1 are not prime).",
      "Over all a with |a| < aMax and all b with |b| <= bMax, find the pair that gives the longest run. Return the product a * b of that pair. If two pairs tie, return the larger product.",
    ],
    constraints: ["2 <= aMax <= 2000","2 <= bMax <= 2000"],
    fn: {"name":"quadraticPrimes","params":[{"name":"aMax","type":"int"},{"name":"bMax","type":"int"}],"returns":"int"},
    examples: [
      { input: [5,5], output: -5 },
      { input: [3,10], output: -5 },
    ],
    tests: [
      { input: [2,2], output: 0 },
      { input: [10,10], output: -21 },
      { input: [50,100], output: -1455 },
      { input: [100,100], output: -1455 },
      { input: [200,500], output: -18901 },
      { input: [1000,500], output: -18901 },
      { input: [300,1000], output: -59231 },
      { input: [1000,1000], output: -59231 },
    ],
    hints: ["At n = 0 the value is just b, so b itself has to be prime and positive. That removes most of the b values.","Write a small primality test (trial division up to the square root works) and loop n upward until the value is not prime.","Remember to try negative a. Keep the best run length and its product; on equal length keep the larger product."],
    solution: {
      idea: ["Only primes b can start a run, so loop over primes b <= bMax and every a, extending n while the value stays prime.","Track the longest run, breaking ties with the larger product."],
      complexity: "Roughly O(P * aMax * runLength * sqrt(value)) with P the primes up to bMax; runs are short so this is fast.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    static bool isPrime(long long v) {
        if (v < 2) return false;
        for (long long d = 2; d * d <= v; d++) if (v % d == 0) return false;
        return true;
    }
public:
    int quadraticPrimes(int aMax, int bMax) {
        int bestLen = -1, bestProd = 0;
        for (int b = 2; b <= bMax; b++) {
            if (!isPrime(b)) continue;
            for (int a = -(aMax - 1); a <= aMax - 1; a++) {
                int n = 0;
                while (isPrime((long long)n * n + (long long)a * n + b)) n++;
                int prod = a * b;
                if (n > bestLen || (n == bestLen && prod > bestProd)) { bestLen = n; bestProd = prod; }
            }
        }
        return bestProd;
    }
};
`,
    },
  },
  {
    id: "c-euler-30",
    source: "euler",
    url: "https://projecteuler.net/problem=30",
    title: "Digit Power Sums",
    statement: [
      "Take a whole number with at least two digits, raise each of its digits to the power p and add the results. Some numbers equal their own digit power sum: for p = 3, 153 = 1 + 125 + 27. Return the sum of all such numbers (for the given p).",
      "The question looks endless but is not: a number with k digits has a digit power sum of at most k * 9^p, so once 10^(k-1) exceeds that no larger number can work. Work out the upper bound and search up to it.",
    ],
    constraints: ["2 <= p <= 7"],
    fn: {"name":"digitPowerSum","params":[{"name":"p","type":"int"}],"returns":"int"},
    examples: [
      { input: [3], output: 1301 },
      { input: [2], output: 0 },
    ],
    tests: [
      { input: [2], output: 0 },
      { input: [3], output: 1301 },
      { input: [4], output: 19316 },
      { input: [5], output: 443839 },
      { input: [6], output: 548834 },
      { input: [7], output: 40139604 },
    ],
    hints: ["A k-digit number is at least 10^(k-1) but its digit power sum is at most k * 9^p. Find the largest k where the first can still be at most the second.","A safe search limit is (p + 1) * 9^p (for p = 7 that is about 38 million).","Loop n from 10 to that limit, compute the digit power sum with a precomputed table pw[digit], and add n when they match."],
    solution: {
      idea: ["Bound the search at (p + 1) * 9^p and brute force every number from 10 upward with a table of digit powers.","Add up the numbers that equal their digit power sum."],
      complexity: "O(limit * digits), at most about 3 * 10^8 simple steps for p = 7, which runs within a second or so in C++.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int digitPowerSum(int p) {
        long long pw[10];
        for (int d = 0; d < 10; d++) { pw[d] = 1; for (int i = 0; i < p; i++) pw[d] *= d; }
        long long limit = (long long)(p + 1) * pw[9];
        long long total = 0;
        for (long long n = 10; n <= limit; n++) {
            long long s = 0, m = n;
            while (m) { s += pw[m % 10]; m /= 10; }
            if (s == n) total += n;
        }
        return (int)total;
    }
};
`,
    },
  },
  {
    id: "c-euler-34",
    source: "euler",
    url: "https://projecteuler.net/problem=34",
    title: "Digit Factorial Numbers",
    statement: [
      "Some numbers equal the sum of the factorials of their digits: 145 = 1! + 4! + 5!. Return the sum of all such numbers from 10 up to limit (single digits do not count).",
      "limit can be 10^9, but the numbers cannot be big: a k-digit number has a digit factorial sum of at most k * 9!, so beyond about 2.6 million nothing can match. Cap the search.",
    ],
    constraints: ["10 <= limit <= 1000000000"],
    fn: {"name":"digitFactorialSum","params":[{"name":"limit","type":"int"}],"returns":"int"},
    examples: [
      { input: [200], output: 145 },
      { input: [100], output: 0 },
    ],
    tests: [
      { input: [10], output: 0 },
      { input: [144], output: 0 },
      { input: [145], output: 145 },
      { input: [1000], output: 145 },
      { input: [40584], output: 145 },
      { input: [40585], output: 40730 },
      { input: [1000000], output: 40730 },
      { input: [1000000000], output: 40730 },
    ],
    hints: ["Precompute the factorials of 0 to 9. For a k-digit number the digit factorial sum is at most k * 9! = k * 362880.","An 8-digit number is at least 10^7 but the sum is at most 8 * 362880 (about 2.9 million), so no 8-digit number works. A safe cap is 7 * 9! = 2540160.","Loop n from 10 to min(limit, cap), compute the sum of digit factorials, and add n on a match."],
    solution: {
      idea: ["Show that no number above 7 * 9! can match, then brute force up to min(limit, 7 * 9!).","Use a table of factorials for the digits."],
      complexity: "O(cap * digits), about 2 * 10^7 steps.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int digitFactorialSum(int limit) {
        int f[10];
        f[0] = 1;
        for (int i = 1; i < 10; i++) f[i] = f[i - 1] * i;
        int cap = (int)min<long long>(limit, 7LL * f[9]);
        long long total = 0;
        for (int n = 10; n <= cap; n++) {
            int s = 0, m = n;
            while (m) { s += f[m % 10]; m /= 10; }
            if (s == n) total += n;
        }
        return (int)total;
    }
};
`,
    },
  },
  {
    id: "c-euler-36",
    source: "euler",
    url: "https://projecteuler.net/problem=36",
    title: "Palindromes in Two Bases",
    statement: [
      "A number is a palindrome in a base when its digits in that base read the same forwards and backwards. Return the sum of all positive numbers below limit that are palindromes both in base 10 and in the given base (no leading zeros are allowed in either representation).",
      "limit can reach 10^9, so do not test every number. Generate the base 10 palindromes directly (there are only about 200 thousand of them below 10^9) and test each in the other base.",
    ],
    constraints: ["1 <= limit <= 1000000000","2 <= base <= 16"],
    fn: {"name":"doubleBasePalindromes","params":[{"name":"limit","type":"int"},{"name":"base","type":"int"}],"returns":"long"},
    examples: [
      { input: [10,2], output: 25 },
      { input: [600,3], output: 1225 },
    ],
    tests: [
      { input: [1,2], output: 0 },
      { input: [100,2], output: 157 },
      { input: [1000,8], output: 2155 },
      { input: [1000000,3], output: 1342501 },
      { input: [1000000,7], output: 83072 },
      { input: [100000000,2], output: 39347399 },
      { input: [1000000000,16], output: 1336916440 },
      { input: [1000000000,10], output: 50045045045040 },
    ],
    hints: ["A palindrome is determined by its first half. Take h, write h followed by h reversed (even length), or h followed by h without its last digit reversed (odd length).","Loop h from 1 to 99999 and build both an even and an odd palindrome for each; skip those at or above limit.","To test the other base, extract digits with repeated division by the base and compare to the reversed list. Add the number to the sum when both pass."],
    solution: {
      idea: ["Enumerate base 10 palindromes from their halves, then test the second base with a digit array.","Every palindrome is produced exactly once: by its half and by its parity (length)."],
      complexity: "O(H * log limit) where H is about 10^5 halves.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    static bool pal(long long v, int base) {
        vector<int> d;
        while (v) { d.push_back(v % base); v /= base; }
        for (size_t i = 0, j = d.size(); i + 1 < j; i++, j--) if (d[i] != d[j - 1]) return false;
        return true;
    }
public:
    long long doubleBasePalindromes(int limit, int base) {
        long long total = 0;
        for (long long h = 1; h <= 99999; h++) {
            for (int odd = 0; odd < 2; odd++) {
                long long v = h, t = odd ? h / 10 : h;
                while (t) { v = v * 10 + t % 10; t /= 10; }
                if (v < limit && pal(v, base)) total += v;
            }
        }
        return total;
    }
};
`,
    },
  },
  {
    id: "c-euler-37",
    source: "euler",
    url: "https://projecteuler.net/problem=37",
    title: "Truncatable Primes",
    statement: [
      "A prime is truncatable when it stays prime as you remove digits from the left, one at a time (3797 gives 797, 97, 7), and also as you remove digits from the right (3797 gives 379, 37, 3). Single digit primes do not count as truncatable.",
      "Return the sum of all truncatable primes below limit.",
    ],
    constraints: ["1 <= limit <= 10000000"],
    fn: {"name":"truncatablePrimeSum","params":[{"name":"limit","type":"int"}],"returns":"int"},
    examples: [
      { input: [100], output: 186 },
      { input: [30], output: 23 },
    ],
    tests: [
      { input: [1], output: 0 },
      { input: [11], output: 0 },
      { input: [24], output: 23 },
      { input: [800], output: 1986 },
      { input: [4000], output: 8920 },
      { input: [100000], output: 8920 },
      { input: [800000], output: 748317 },
      { input: [10000000], output: 748317 },
    ],
    hints: ["Sieve the primes below limit once so every check is a table lookup.","For each prime of two or more digits, strip digits from the right (divide by 10) and from the left (take the remainder by 10^k) and check every result is prime. A left piece that starts with 0 is not allowed.","Add up those that pass. There are only 11 truncatable primes in total, so the sum stops growing after 739397."],
    solution: {
      idea: ["Sieve of Eratosthenes up to limit, then for each prime test all right and left truncations in the sieve.","Sum the passing primes."],
      complexity: "O(limit log log limit) for the sieve plus O(digits) per prime.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int truncatablePrimeSum(int limit) {
        vector<char> comp(limit + 2, 0);
        comp[0] = comp[1] = 1;
        for (long long i = 2; i * i <= limit; i++)
            if (!comp[i]) for (long long j = i * i; j <= limit; j += i) comp[j] = 1;
        auto prime = [&](int v) { return v >= 2 && v <= limit && !comp[v]; };
        long long total = 0;
        for (int p = 11; p < limit; p++) {
            if (!prime(p)) continue;
            bool ok = true;
            for (int v = p / 10; v > 0 && ok; v /= 10) if (!prime(v)) ok = false;
            for (long long m = 10; m <= p && ok; m *= 10) {
                int v = p % m;
                if (v < m / 10 || !prime(v)) ok = false;
            }
            if (ok) total += p;
        }
        return (int)total;
    }
};
`,
    },
  },
  {
    id: "c-euler-39",
    source: "euler",
    url: "https://projecteuler.net/problem=39",
    title: "Right Triangle Perimeters",
    statement: [
      "For a perimeter p, count how many different right triangles with whole number sides have perimeter exactly p (two triangles are the same if their sides are the same set of three numbers). Among all p up to maxP, return the p with the most triangles. If several have the same count, return the smallest p.",
      "maxP can be 5 million, so do not search for sides directly. Generate the triples with Euclid's formula instead.",
    ],
    constraints: ["12 <= maxP <= 5000000"],
    fn: {"name":"bestPerimeter","params":[{"name":"maxP","type":"int"}],"returns":"int"},
    examples: [
      { input: [12], output: 12 },
      { input: [60], output: 60 },
    ],
    tests: [
      { input: [13], output: 12 },
      { input: [24], output: 12 },
      { input: [100], output: 60 },
      { input: [500], output: 420 },
      { input: [5000], output: 4620 },
      { input: [123456], output: 120120 },
      { input: [1000000], output: 720720 },
      { input: [5000000], output: 4084080 },
    ],
    hints: ["Every Pythagorean triple is k times a primitive one. Primitive triples come from m > n > 0 with gcd(m, n) = 1 and m - n odd: sides m^2 - n^2, 2mn, m^2 + n^2.","The primitive perimeter is 2m(m + n). Loop over (m, n) while that is at most maxP.","For each primitive perimeter q, add 1 to count[q], count[2q], count[3q], ... up to maxP. Then take the p with the largest count, smallest p on ties."],
    solution: {
      idea: ["Generate primitive triples with Euclid's formula, and add each one to all of its multiples in a count array.","Return the perimeter with the highest count, taking the smallest on ties."],
      complexity: "About O(maxP log maxP) time, O(maxP) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int bestPerimeter(int maxP) {
        vector<int> cnt(maxP + 1, 0);
        for (long long m = 2; 2 * m * (m + 1) <= maxP; m++)
            for (long long n = 1; n < m && 2 * m * (m + n) <= maxP; n++) {
                if (((m - n) & 1) == 0 || __gcd(m, n) != 1) continue;
                long long q = 2 * m * (m + n);
                for (long long k = q; k <= maxP; k += q) cnt[k]++;
            }
        int best = 12;
        for (int p = 12; p <= maxP; p++) if (cnt[p] > cnt[best]) best = p;
        return best;
    }
};
`,
    },
  },
  {
    id: "c-euler-40",
    source: "euler",
    url: "https://projecteuler.net/problem=40",
    title: "Digit of the Counting Word",
    statement: [
      "Write the positive whole numbers one after another with no gaps: 123456789101112131415... Return the digit at position k of this endless string (position 1 is the digit 1).",
      "k can be as large as 10^15, so you cannot build the string. Count how many digits the 1-digit, 2-digit, 3-digit, ... numbers use, skip whole groups, then find the exact number and the digit inside it.",
    ],
    constraints: ["1 <= k <= 1000000000000000"],
    fn: {"name":"countingDigit","params":[{"name":"k","type":"long"}],"returns":"int"},
    examples: [
      { input: [12], output: 1 },
      { input: [11], output: 0 },
    ],
    tests: [
      { input: [1], output: 1 },
      { input: [9], output: 9 },
      { input: [10], output: 1 },
      { input: [190], output: 1 },
      { input: [191], output: 0 },
      { input: [2889], output: 9 },
      { input: [2890], output: 1 },
      { input: [1000000], output: 1 },
      { input: [123456789012345], output: 3 },
      { input: [1000000000000000], output: 2 },
    ],
    hints: ["There are 9 one-digit numbers (9 digits), 90 two-digit numbers (180 digits), 900 three-digit numbers (2700 digits), and so on.","Subtract the size of each group from k while k is larger than the group. Now k points into the group of numbers with len digits.","The number is first + (k - 1) / len where first = 10^(len-1); the digit is at index (k - 1) % len of that number written out."],
    solution: {
      idea: ["Skip whole digit-length groups by subtracting their sizes, then locate the exact number as first + (k - 1) / len.","Read the digit at offset (k - 1) % len."],
      complexity: "O(log k) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int countingDigit(long long k) {
        long long len = 1, count = 9, first = 1;
        while (k > len * count) {
            k -= len * count;
            len++;
            count *= 10;
            first *= 10;
        }
        long long num = first + (k - 1) / len;
        string s = to_string(num);
        return s[(k - 1) % len] - '0';
    }
};
`,
    },
  },
  {
    id: "c-euler-41",
    source: "euler",
    url: "https://projecteuler.net/problem=41",
    title: "Largest Pandigital Prime",
    statement: [
      "An n-digit number is pandigital when it uses each of the digits 1 to n exactly once. Return the largest prime that is n-digit pandigital, or 0 if there is none.",
      "There are at most 9! = 362880 candidates, and you can try them from the largest down and stop at the first prime.",
    ],
    constraints: ["1 <= n <= 9"],
    fn: {"name":"pandigitalPrime","params":[{"name":"n","type":"int"}],"returns":"int"},
    examples: [
      { input: [3], output: 0 },
      { input: [2], output: 0 },
    ],
    tests: [
      { input: [1], output: 0 },
      { input: [4], output: 4231 },
      { input: [5], output: 0 },
      { input: [6], output: 0 },
      { input: [7], output: 7652413 },
      { input: [8], output: 0 },
      { input: [9], output: 0 },
    ],
    hints: ["Start with the digits n, n-1, ..., 1 (the largest arrangement) and step to the previous permutation each time (std::prev_permutation).","Test each with trial division up to the square root; stop at the first prime.","If the digits 1..n add up to a multiple of 3, every arrangement is divisible by 3, so n = 8 and n = 9 give 0 (the loop finds that too, just more slowly)."],
    solution: {
      idea: ["Walk the permutations of 1..n in decreasing order and return the first prime.","Return 0 if none is prime."],
      complexity: "O(n! * sqrt(10^n)) in the worst case; primes turn up quickly for n = 4 to 7, and for n = 8, 9 a digit sum check can end it at once.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    static bool isPrime(int v) {
        if (v < 2) return false;
        for (long long d = 2; d * d <= v; d++) if (v % d == 0) return false;
        return true;
    }
public:
    int pandigitalPrime(int n) {
        if (n == 8 || n == 9) return 0;
        string s;
        for (int d = n; d >= 1; d--) s += char('0' + d);
        do {
            int v = stoi(s);
            if (isPrime(v)) return v;
        } while (prev_permutation(s.begin(), s.end()));
        return 0;
    }
};
`,
    },
  },
  {
    id: "c-euler-45",
    source: "euler",
    url: "https://projecteuler.net/problem=45",
    title: "Triangular, Pentagonal and Hexagonal",
    statement: [
      "Triangular numbers are T(n) = n(n+1)/2, pentagonal numbers P(n) = n(3n-1)/2 and hexagonal numbers H(n) = n(2n-1). Some numbers are all three at once (1 is one; so is 40755). Return the smallest number strictly greater than after that is triangular, pentagonal and hexagonal.",
      "A key fact: every hexagonal number is already triangular (H(n) = T(2n - 1)). So walk through the hexagonal numbers and test only pentagonality, using the formula for the inverse.",
    ],
    constraints: ["0 <= after <= 1000000000000"],
    fn: {"name":"nextTriPentHex","params":[{"name":"after","type":"long"}],"returns":"long"},
    examples: [
      { input: [0], output: 1 },
      { input: [1], output: 40755 },
    ],
    tests: [
      { input: [0], output: 1 },
      { input: [1], output: 40755 },
      { input: [2], output: 40755 },
      { input: [40754], output: 40755 },
      { input: [40755], output: 1533776805 },
      { input: [1000000], output: 1533776805 },
      { input: [1533776804], output: 1533776805 },
      { input: [1533776805], output: 57722156241751 },
      { input: [999999999999], output: 57722156241751 },
    ],
    hints: ["Show that H(n) = T(2n - 1), so the hexagonal numbers are a subset of the triangular ones: you need only check pentagonality.","x is pentagonal exactly when (1 + sqrt(1 + 24x)) / 6 is a whole number. Compute an integer square root and confirm with a multiplication.","Loop n = 1, 2, ... computing H(n); return the first one greater than after that passes the check. Use 64-bit integers: values reach 10^14."],
    solution: {
      idea: ["Iterate hexagonal numbers (they are triangular automatically) and test pentagonality with an integer square root check.","Return the first one above the given bound."],
      complexity: "O(sqrt(answer)) iterations, about 5 * 10^6 at most.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    static bool isPent(long long x) {
        long long d = 1 + 24 * x;
        long long r = (long long)sqrtl((long double)d);
        while (r * r > d) r--;
        while ((r + 1) * (r + 1) <= d) r++;
        return r * r == d && (1 + r) % 6 == 0;
    }
public:
    long long nextTriPentHex(long long after) {
        for (long long n = 1;; n++) {
            long long h = n * (2 * n - 1);
            if (h > after && isPent(h)) return h;
        }
    }
};
`,
    },
  },
  {
    id: "c-euler-47",
    source: "euler",
    url: "https://projecteuler.net/problem=47",
    title: "Consecutive Numbers With Distinct Prime Factors",
    statement: [
      "Find the first run of count consecutive whole numbers that each have exactly k different prime factors (12 = 2 * 2 * 3 has two different prime factors, 2 and 3). Return the first number of that run.",
      "For example with k = 2 and count = 2 the answer is 14: 14 = 2 * 7 and 15 = 3 * 5. Count the distinct prime factors of every number with a sieve instead of factoring each number alone.",
    ],
    constraints: ["1 <= k <= 4","1 <= count <= 4","a run always exists below 5000000"],
    fn: {"name":"consecutiveDistinct","params":[{"name":"k","type":"int"},{"name":"count","type":"int"}],"returns":"int"},
    examples: [
      { input: [2,2], output: 14 },
      { input: [3,3], output: 644 },
    ],
    tests: [
      { input: [1,1], output: 2 },
      { input: [2,1], output: 6 },
      { input: [2,3], output: 20 },
      { input: [3,1], output: 30 },
      { input: [3,2], output: 230 },
      { input: [4,1], output: 210 },
      { input: [4,2], output: 7314 },
      { input: [4,3], output: 37960 },
      { input: [4,4], output: 134043 },
    ],
    hints: ["Make an array omega[x] = the number of different primes dividing x, by looping over primes p and adding 1 to every multiple of p.","A prime p is one where omega[p] is still 0 when you reach it. Use a safe limit such as 5 million.","Scan upward keeping a running length of numbers whose omega equals k; when it reaches count, return the start of the run."],
    solution: {
      idea: ["Compute omega (number of distinct prime factors) for all numbers up to a limit with a sieve.","Scan for the first run of count values equal to k."],
      complexity: "O(N log log N) time, O(N) space, with N = 5 * 10^6.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int consecutiveDistinct(int k, int count) {
        const int N = 5000000;
        vector<unsigned char> om(N + 1, 0);
        for (int p = 2; p <= N; p++)
            if (om[p] == 0) for (int m = p; m <= N; m += p) om[m]++;
        int run = 0;
        for (int x = 2; x <= N; x++) {
            if (om[x] == k) { run++; if (run == count) return x - count + 1; }
            else run = 0;
        }
        return -1;
    }
};
`,
    },
  },
  {
    id: "c-euler-52",
    source: "euler",
    url: "https://projecteuler.net/problem=52",
    title: "Multiples With the Same Digits",
    statement: [
      "Find the smallest positive whole number x such that x, 2x, 3x, ..., kx all contain exactly the same digits (the same multiset of digits, in a different order).",
      "k = 1 is trivial. For bigger k the answer is a six figure number or smaller, so a plain search is quick, as long as you compare digits in a clean way.",
    ],
    constraints: ["1 <= k <= 6"],
    fn: {"name":"permutedMultiples","params":[{"name":"k","type":"int"}],"returns":"int"},
    examples: [
      { input: [1], output: 1 },
      { input: [2], output: 125874 },
    ],
    tests: [
      { input: [1], output: 1 },
      { input: [2], output: 125874 },
      { input: [3], output: 142857 },
      { input: [4], output: 142857 },
      { input: [5], output: 142857 },
      { input: [6], output: 142857 },
    ],
    hints: ["Two numbers have the same digits when their digits, sorted, are the same string.","Try x = 1, 2, 3, ... and for each x compare the sorted digits of x with those of 2x, ..., kx; stop at the first that matches all.","You can skip x quickly: x and kx must have the same number of digits, so x cannot be above 10^len / k."],
    solution: {
      idea: ["Brute force x upward; for each, build the sorted-digit signature of x and compare it with those of its multiples up to kx.","The first x passing every comparison is the answer."],
      complexity: "O(answer * k * digits log digits); the answers here are below 150000.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    static string sig(long long v) {
        string s = to_string(v);
        sort(s.begin(), s.end());
        return s;
    }
public:
    int permutedMultiples(int k) {
        for (int x = 1;; x++) {
            string base = sig(x);
            bool ok = true;
            for (int m = 2; m <= k && ok; m++) if (sig((long long)x * m) != base) ok = false;
            if (ok) return x;
        }
    }
};
`,
    },
  },
  {
    id: "c-euler-53",
    source: "euler",
    url: "https://projecteuler.net/problem=53",
    title: "Counting Large Binomials",
    statement: [
      "The number of ways to choose r items from n is C(n, r). Count the pairs (n, r) with 1 <= n <= maxN and 0 <= r <= n for which C(n, r) is strictly greater than threshold.",
      "C(5000, 2500) has about 1500 digits, so you cannot compute the values exactly. But you only need to know whether each exceeds the threshold, so build Pascal's triangle and cap each entry at threshold + 1 (a saturating sum).",
    ],
    constraints: ["1 <= maxN <= 5000","1 <= threshold <= 1000000000000000"],
    fn: {"name":"countLargeBinomials","params":[{"name":"maxN","type":"int"},{"name":"threshold","type":"long"}],"returns":"long"},
    examples: [
      { input: [5,4], output: 5 },
      { input: [4,5], output: 1 },
    ],
    tests: [
      { input: [1,1], output: 0 },
      { input: [10,100], output: 7 },
      { input: [20,1000], output: 76 },
      { input: [60,1000000], output: 1157 },
      { input: [100,100000000], output: 3664 },
      { input: [300,1000000000000000], output: 38624 },
      { input: [1000,500], output: 498415 },
      { input: [5000,1000000000000000], output: 12447418 },
    ],
    hints: ["Pascal's rule: C(n, r) = C(n-1, r-1) + C(n-1, r). You need the whole triangle row by row.","Replace every entry by min(entry, threshold + 1) after adding; the entry is then exact when small and just 'too big' when large. A sum of two capped values stays below 2 * 10^15 + 2, fine in 64 bits.","Keep one row at a time (update from right to left), and for every row count the entries above the threshold."],
    solution: {
      idea: ["Build Pascal's triangle with entries capped at threshold + 1 so nothing overflows.","Count entries (including the 1s at the ends) greater than the threshold, row by row."],
      complexity: "O(maxN^2) time (12.5 million additions for 5000), O(maxN) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    long long countLargeBinomials(int maxN, long long threshold) {
        long long cap = threshold + 1;
        vector<long long> row(maxN + 2, 0);
        row[0] = 1;
        long long total = 0;
        for (int n = 1; n <= maxN; n++) {
            for (int r = n; r >= 1; r--) row[r] = min(cap, row[r] + row[r - 1]);
            for (int r = 0; r <= n; r++) if (row[r] > threshold) total++;
        }
        return total;
    }
};
`,
    },
  },
  {
    id: "c-euler-55",
    source: "euler",
    url: "https://projecteuler.net/problem=55",
    title: "Reverse and Add",
    statement: [
      "Take a number, add to it the number formed by reversing its digits, and repeat with each result. If a palindrome shows up within the given number of steps, the starting number is not counted. Count the starting numbers from 1 to limit - 1 that never reach a palindrome within iterations steps (only the sums are tested, not the starting number itself).",
      "The sums grow larger than 64-bit integers quickly, so add them as digit strings.",
    ],
    constraints: ["1 <= limit <= 100000","1 <= iterations <= 60"],
    fn: {"name":"lychrelCount","params":[{"name":"limit","type":"int"},{"name":"iterations","type":"int"}],"returns":"int"},
    examples: [
      { input: [100,10], output: 2 },
      { input: [200,5], output: 15 },
    ],
    tests: [
      { input: [1,1], output: 0 },
      { input: [100,1], output: 42 },
      { input: [200,2], output: 48 },
      { input: [1000,5], output: 95 },
      { input: [5000,20], output: 120 },
      { input: [10000,50], output: 249 },
      { input: [100000,30], output: 6697 },
      { input: [100000,60], output: 6091 },
    ],
    hints: ["Represent the current number as a string. The reverse is just the reversed string, and the sum is a digit-by-digit addition with carry.","For each start n below limit: repeat up to `iterations` times: s = s + reverse(s); if s is a palindrome the number is not counted.","Count the starts for which no palindrome appeared after all iterations."],
    solution: {
      idea: ["For every n below limit, run up to `iterations` rounds of string reverse-and-add, checking for a palindrome after each.","Count those that never produce one."],
      complexity: "O(limit * iterations * digits), about 10^8 simple operations at the top of the range.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    static string addRev(const string& s) {
        string r(s.rbegin(), s.rend()), out;
        int carry = 0;
        for (int i = (int)s.size() - 1; i >= 0; i--) {
            int v = (s[i] - '0') + (r[i] - '0') + carry;
            out.push_back('0' + v % 10);
            carry = v / 10;
        }
        if (carry) out.push_back('0' + carry);
        reverse(out.begin(), out.end());
        return out;
    }
    static bool pal(const string& s) {
        for (size_t i = 0, j = s.size(); i + 1 < j; i++, j--) if (s[i] != s[j - 1]) return false;
        return true;
    }
public:
    int lychrelCount(int limit, int iterations) {
        int count = 0;
        for (int n = 1; n < limit; n++) {
            string s = to_string(n);
            bool found = false;
            for (int it = 0; it < iterations && !found; it++) {
                s = addRev(s);
                if (pal(s)) found = true;
            }
            if (!found) count++;
        }
        return count;
    }
};
`,
    },
  },
  {
    id: "c-euler-58",
    source: "euler",
    url: "https://projecteuler.net/problem=58",
    title: "Spiral Diagonal Primes",
    statement: [
      "Write 1 in the middle of a square grid and spiral outward: 1, 2, 3, ... The corners of the spiral lie on the diagonals. In the spiral with side length s (odd), the diagonals hold 2s - 1 numbers; the corners of the outer ring are s*s, s*s - (s-1), s*s - 2(s-1) and s*s - 3(s-1).",
      "Return the smallest side length s (3 or more) at which the share of primes among the diagonal numbers is strictly below percent per cent. The numbers get large, so test primality with a fast method such as Miller-Rabin.",
    ],
    constraints: ["8 <= percent <= 60"],
    fn: {"name":"spiralPrimeSide","params":[{"name":"percent","type":"int"}],"returns":"int"},
    examples: [
      { input: [60], output: 5 },
      { input: [50], output: 11 },
    ],
    tests: [
      { input: [60], output: 5 },
      { input: [55], output: 9 },
      { input: [40], output: 31 },
      { input: [30], output: 49 },
      { input: [20], output: 309 },
      { input: [15], output: 981 },
      { input: [12], output: 6523 },
      { input: [10], output: 26241 },
      { input: [8], output: 238733 },
      { input: [9], output: 74373 },
    ],
    hints: ["For side s the three new corner values (the fourth, s*s, is a perfect square) are s*s - (s-1), s*s - 2(s-1) and s*s - 3(s-1). Only these can be prime.","Keep a running count of primes found and the total diagonal count 2s - 1. Stop when primes * 100 < percent * total (integer arithmetic, no floating point).","Numbers can reach about 10^12 or more, so trial division is too slow for the large answers; use deterministic Miller-Rabin with __int128 multiplication."],
    solution: {
      idea: ["Walk rings s = 3, 5, 7, ...; test the three non-square corners with Miller-Rabin and update the prime count.","Return the first ring where primes * 100 < percent * (2s - 1)."],
      complexity: "O(answer * log^2 n) time with Miller-Rabin; the answers in range stay under about 250000.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    typedef unsigned long long ull;
    static ull mulmod(ull a, ull b, ull m) { return (unsigned __int128)a * b % m; }
    static ull powmod(ull a, ull e, ull m) {
        ull r = 1;
        a %= m;
        while (e) { if (e & 1) r = mulmod(r, a, m); a = mulmod(a, a, m); e >>= 1; }
        return r;
    }
    static bool isPrime(ull n) {
        if (n < 2) return false;
        for (ull p : {2ULL, 3ULL, 5ULL, 7ULL, 11ULL, 13ULL, 17ULL, 19ULL, 23ULL, 29ULL, 31ULL, 37ULL}) {
            if (n % p == 0) return n == p;
        }
        ull d = n - 1;
        int r = 0;
        while ((d & 1) == 0) { d >>= 1; r++; }
        for (ull a : {2ULL, 3ULL, 5ULL, 7ULL, 11ULL, 13ULL, 17ULL, 19ULL, 23ULL, 29ULL, 31ULL, 37ULL}) {
            ull x = powmod(a, d, n);
            if (x == 1 || x == n - 1) continue;
            bool comp = true;
            for (int i = 1; i < r; i++) { x = mulmod(x, x, n); if (x == n - 1) { comp = false; break; } }
            if (comp) return false;
        }
        return true;
    }
public:
    int spiralPrimeSide(int percent) {
        long long primes = 0;
        for (long long s = 3;; s += 2) {
            for (int k = 1; k <= 3; k++) if (isPrime((ull)(s * s - k * (s - 1)))) primes++;
            if (primes * 100 < (long long)percent * (2 * s - 1)) return (int)s;
        }
    }
};
`,
    },
  },
  {
    id: "c-euler-92",
    source: "euler",
    url: "https://projecteuler.net/problem=92",
    title: "Square Digit Chains",
    statement: [
      "Replace a number by the sum of the squares of its digits, and repeat. Every chain ends in a loop that contains either 1 or 89 (for example 44 -> 32 -> 13 -> 10 -> 1, and 85 -> 89). Count the starting numbers from 1 to limit - 1 whose chain reaches 89.",
      "limit can be 10^8. After the first step every number is at most 81 * 8 = 648, so first decide the ending (1 or 89) for every small value once, then handle each start with a table lookup.",
    ],
    constraints: ["2 <= limit <= 100000000"],
    fn: {"name":"squareDigitChains","params":[{"name":"limit","type":"int"}],"returns":"int"},
    examples: [
      { input: [100], output: 80 },
      { input: [10], output: 7 },
    ],
    tests: [
      { input: [2], output: 0 },
      { input: [10], output: 7 },
      { input: [90], output: 73 },
      { input: [1000], output: 857 },
      { input: [12345], output: 10484 },
      { input: [100000], output: 85623 },
      { input: [10000000], output: 8581146 },
      { input: [100000000], output: 85744333 },
    ],
    hints: ["A start's next value is its digit square sum, at most 81 * 9 = 729 for fewer than 10^9. Decide the ending of every value up to 729 by following the chain.","Compute the digit square sum of every start quickly: precompute the sum for every number below 10^4 and combine the high and low halves, n / 10^4 and n % 10^4.","Count the starts n < limit for which the end of their digit square sum is 89."],
    solution: {
      idea: ["Precompute the end (1 or 89) for every value up to 729 by following chains.","For each start, get its digit square sum with two lookups into a 10^4 table and count those that end at 89."],
      complexity: "O(limit) time with a couple of table lookups per start.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int squareDigitChains(int limit) {
        vector<int> t(10000, 0);
        for (int i = 1; i < 10000; i++) t[i] = t[i / 10] + (i % 10) * (i % 10);
        vector<char> to89(800, 0);
        for (int v = 1; v < 800; v++) {
            int x = v;
            while (x != 1 && x != 89) { int s = 0, m = x; while (m) { s += (m % 10) * (m % 10); m /= 10; } x = s; }
            to89[v] = (x == 89);
        }
        int count = 0;
        for (int n = 1; n < limit; n++) {
            int s = t[n / 10000] + t[n % 10000];
            if (to89[s]) count++;
        }
        return count;
    }
};
`,
    },
  },
  {
    id: "c-euler-97",
    source: "euler",
    url: "https://projecteuler.net/problem=97",
    title: "Last Digits of a Huge Number",
    statement: [
      "Consider the number a * 2^e + 1, where e can be as large as 10^15. Return its last k decimal digits as a number (that is, the value of a * 2^e + 1 modulo 10^k; leading zeros are simply dropped).",
      "The number has trillions of digits, so never build it. Use fast exponentiation modulo 10^k. Products of two numbers below 10^15 reach 10^30, so multiply with a 128-bit integer.",
    ],
    constraints: ["1 <= a <= 1000000000","0 <= e <= 1000000000000000","1 <= k <= 15"],
    fn: {"name":"lastDigits","params":[{"name":"a","type":"long"},{"name":"e","type":"long"},{"name":"k","type":"int"}],"returns":"long"},
    examples: [
      { input: [3,4,3], output: 49 },
      { input: [1,10,2], output: 25 },
    ],
    tests: [
      { input: [1,0,1], output: 2 },
      { input: [5,3,2], output: 41 },
      { input: [7,100,5], output: 37633 },
      { input: [123456789,1000,9], output: 990193665 },
      { input: [1000000000,1000000000000,15], output: 109376000000001 },
      { input: [28434,7830457,10], output: 8440296449 },
      { input: [999999999,999999999999999,15], output: 684647106445313 },
      { input: [2,62,15], output: 372036854775809 },
    ],
    hints: ["Let M = 10^k. You want ((a % M) * (2^e mod M) + 1) % M.","Compute 2^e mod M by repeated squaring: if the lowest bit of e is set multiply into the result, square the base, shift e right.","Multiply with unsigned __int128 so values up to 10^15 never overflow; M fits in 64 bits for k <= 15."],
    solution: {
      idea: ["Fast modular exponentiation of 2 with modulus 10^k, using 128-bit intermediates for the products.","Multiply by a modulo M and add 1."],
      complexity: "O(log e) multiplications, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    long long lastDigits(long long a, long long e, int k) {
        typedef unsigned long long ull;
        ull M = 1;
        for (int i = 0; i < k; i++) M *= 10;
        ull base = 2 % M, r = 1 % M;
        ull ee = e;
        while (ee) {
            if (ee & 1) r = (unsigned __int128)r * base % M;
            base = (unsigned __int128)base * base % M;
            ee >>= 1;
        }
        ull v = (unsigned __int128)(a % M) * r % M;
        return (long long)((v + 1) % M);
    }
};
`,
    },
  },
  {
    id: "abc151-a",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abc151/tasks/abc151_a",
    title: "Next Alphabet (AtCoder ABC 151 A)",
    statement: [
      "A string c holds one lowercase English letter. Return the letter that comes right after it in the alphabet.",
      "Written for this app from the AtCoder task of the same name (linked above); the original reads from standard input, here you write a function.",
    ],
    constraints: ["c is a single lowercase letter from a to y"],
    fn: {"name":"nextLetter","params":[{"name":"c","type":"string"}],"returns":"string"},
    examples: [
      { input: ["a"], output: "b" },
      { input: ["y"], output: "z" },
    ],
    tests: [
      { input: ["b"], output: "c" },
      { input: ["m"], output: "n" },
      { input: ["x"], output: "y" },
      { input: ["c"], output: "d" },
      { input: ["n"], output: "o" },
      { input: ["q"], output: "r" },
    ],
    hints: ["Letters have consecutive character codes: 'a' + 1 is 'b'.","Take the first character of the string and add 1 to it.","Build a one-character string from the result and return it."],
    solution: {
      idea: ["Add one to the character code of c and return it as a string."],
      complexity: "O(1) time and space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string nextLetter(string c) { return string(1, (char)(c[0] + 1)); }
};
`,
    },
  },
  {
    id: "abc153-a",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abc153/tasks/abc153_a",
    title: "Serval vs Monster (AtCoder ABC 153 A)",
    statement: [
      "A monster has h health points. Each attack takes away a points of health. Return the smallest number of attacks needed to bring its health to 0 or below.",
      "Written for this app from the AtCoder task of the same name (linked above); the original reads from standard input, here you write a function.",
    ],
    constraints: ["1 <= h <= 10000","1 <= a <= 10000"],
    fn: {"name":"attacksNeeded","params":[{"name":"h","type":"int"},{"name":"a","type":"int"}],"returns":"int"},
    examples: [
      { input: [10,4], output: 3 },
      { input: [1,10000], output: 1 },
    ],
    tests: [
      { input: [1,1], output: 1 },
      { input: [10000,1], output: 10000 },
      { input: [10000,10000], output: 1 },
      { input: [10000,9999], output: 2 },
      { input: [7,7], output: 1 },
      { input: [9,2], output: 5 },
      { input: [100,33], output: 4 },
    ],
    hints: ["This is a division, but you need to round up.","Rounding up h / a is the same as (h + a - 1) / a in integer arithmetic.","Return (h + a - 1) / a."],
    solution: {
      idea: ["The answer is ceil(h / a), computed as (h + a - 1) / a."],
      complexity: "O(1) time and space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int attacksNeeded(int h, int a) { return (h + a - 1) / a; }
};
`,
    },
  },
  {
    id: "abc154-a",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abc154/tasks/abc154_a",
    title: "Remaining Balls (AtCoder ABC 154 A)",
    statement: [
      "There are a balls with the word s written on them and b balls with the word t written on them (s and t are different words). One ball is thrown away, and its word is u, which is either s or t. Return the numbers of balls that remain as a list [balls with s, balls with t].",
      "Written for this app from the AtCoder task of the same name (linked above); the original reads from standard input, here you write a function.",
    ],
    constraints: ["s and t are different, u equals s or t","1 <= a, b <= 100","s, t, u have 1 to 10 lowercase letters"],
    fn: {"name":"remainingBalls","params":[{"name":"s","type":"string"},{"name":"t","type":"string"},{"name":"a","type":"int"},{"name":"b","type":"int"},{"name":"u","type":"string"}],"returns":"int[]"},
    examples: [
      { input: ["red","blue",3,4,"red"], output: [2,4] },
      { input: ["red","blue",5,5,"blue"], output: [5,4] },
    ],
    tests: [
      { input: ["a","b",1,1,"a"], output: [0,1] },
      { input: ["a","b",1,1,"b"], output: [1,0] },
      { input: ["apple","pear",100,100,"pear"], output: [100,99] },
      { input: ["apple","pear",100,1,"apple"], output: [99,1] },
      { input: ["xx","x",7,9,"x"], output: [7,8] },
      { input: ["abc","abd",2,3,"abd"], output: [2,2] },
    ],
    hints: ["Compare u with s. If they are equal the thrown ball was one of the first kind.","Subtract 1 from the matching count and leave the other alone.","Return the pair [a, b] after the subtraction."],
    solution: {
      idea: ["If u equals s, decrease a, otherwise decrease b. Return both counts."],
      complexity: "O(1) time and space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> remainingBalls(string s, string t, int a, int b, string u) {
        if (u == s) a--; else b--;
        return {a, b};
    }
};
`,
    },
  },
  {
    id: "abc155-a",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abc155/tasks/abc155_a",
    title: "Poor (AtCoder ABC 155 A)",
    statement: [
      "Three whole numbers a, b and c are given. Return Yes if exactly two of them are equal (so the other one is different), and No otherwise. All three equal does not count.",
      "Written for this app from the AtCoder task of the same name (linked above); the original reads from standard input, here you write a function.",
    ],
    constraints: ["1 <= a, b, c <= 100"],
    fn: {"name":"isPoor","params":[{"name":"a","type":"int"},{"name":"b","type":"int"},{"name":"c","type":"int"}],"returns":"string"},
    examples: [
      { input: [5,7,5], output: "Yes" },
      { input: [4,4,4], output: "No" },
    ],
    tests: [
      { input: [1,1,2], output: "Yes" },
      { input: [1,2,1], output: "Yes" },
      { input: [2,1,1], output: "Yes" },
      { input: [1,2,3], output: "No" },
      { input: [100,100,100], output: "No" },
      { input: [100,99,100], output: "Yes" },
      { input: [7,8,9], output: "No" },
    ],
    hints: ["Look at the three pairs (a, b), (a, c) and (b, c). How many of them are equal?","If exactly two numbers are equal, exactly one of the three pairs is equal. If all three are equal, all three pairs are.","Count the equal pairs and answer Yes when the count is exactly 1."],
    solution: {
      idea: ["Count how many of the pairs (a, b), (b, c), (a, c) are equal. Exactly one equal pair means exactly two equal numbers."],
      complexity: "O(1) time and space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string isPoor(int a, int b, int c) {
        int eq = (a == b) + (b == c) + (a == c);
        return eq == 1 ? "Yes" : "No";
    }
};
`,
    },
  },
  {
    id: "abc156-a",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abc156/tasks/abc156_a",
    title: "Beginner (AtCoder ABC 156 A)",
    statement: [
      "A contest shows a rating r to people who took part in at least 10 contests. Someone who took part in fewer than 10 contests, say n of them, has a shown rating that is lower than their true rating: it is the true rating minus 100 * (10 - n). You are given n and the shown rating r; return the true rating.",
      "Written for this app from the AtCoder task of the same name (linked above); the original reads from standard input, here you write a function.",
    ],
    constraints: ["1 <= n <= 100","0 <= r <= 4111"],
    fn: {"name":"trueRating","params":[{"name":"n","type":"int"},{"name":"r","type":"int"}],"returns":"int"},
    examples: [
      { input: [2,2919], output: 3719 },
      { input: [22,3051], output: 3051 },
    ],
    tests: [
      { input: [1,0], output: 900 },
      { input: [9,100], output: 200 },
      { input: [10,100], output: 100 },
      { input: [11,4111], output: 4111 },
      { input: [5,3000], output: 3500 },
      { input: [100,0], output: 0 },
      { input: [1,4111], output: 5011 },
    ],
    hints: ["Split into two cases: n at least 10 and n below 10.","For n at least 10 the shown rating is the true one, so return r.","For n below 10 the true rating is r + 100 * (10 - n)."],
    solution: {
      idea: ["If n >= 10 return r, otherwise r + 100 * (10 - n)."],
      complexity: "O(1) time and space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int trueRating(int n, int r) { return n >= 10 ? r : r + 100 * (10 - n); }
};
`,
    },
  },
  {
    id: "abc157-a",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abc157/tasks/abc157_a",
    title: "Duplex Printing (AtCoder ABC 157 A)",
    statement: [
      "A printer prints on both sides of each sheet of paper. A document has n pages. Return the smallest number of sheets needed to print it.",
      "Written for this app from the AtCoder task of the same name (linked above); the original reads from standard input, here you write a function.",
    ],
    constraints: ["1 <= n <= 100"],
    fn: {"name":"sheetsNeeded","params":[{"name":"n","type":"int"}],"returns":"int"},
    examples: [
      { input: [5], output: 3 },
      { input: [2], output: 1 },
    ],
    tests: [
      { input: [1], output: 1 },
      { input: [3], output: 2 },
      { input: [4], output: 2 },
      { input: [99], output: 50 },
      { input: [100], output: 50 },
      { input: [57], output: 29 },
    ],
    hints: ["Each sheet holds two pages.","With an odd number of pages the last sheet is only half used, so round up.","Return (n + 1) / 2."],
    solution: {
      idea: ["The answer is ceil(n / 2) = (n + 1) / 2."],
      complexity: "O(1) time and space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int sheetsNeeded(int n) { return (n + 1) / 2; }
};
`,
    },
  },
  {
    id: "abc158-a",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abc158/tasks/abc158_a",
    title: "Station and Bus (AtCoder ABC 158 A)",
    statement: [
      "Three stations each are run by company A or company B, written as a 3-letter string s of A and B. A bus service runs between every pair of stations where one is run by A and the other by B. Return Yes if at least one such pair exists, which means s contains both letters, and No otherwise.",
      "Written for this app from the AtCoder task of the same name (linked above); the original reads from standard input, here you write a function.",
    ],
    constraints: ["s has exactly 3 characters, each A or B"],
    fn: {"name":"hasBus","params":[{"name":"s","type":"string"}],"returns":"string"},
    examples: [
      { input: ["ABA"], output: "Yes" },
      { input: ["BBA"], output: "Yes" },
    ],
    tests: [
      { input: ["AAA"], output: "No" },
      { input: ["BBB"], output: "No" },
      { input: ["AAB"], output: "Yes" },
      { input: ["ABB"], output: "Yes" },
      { input: ["BAB"], output: "Yes" },
      { input: ["BAA"], output: "Yes" },
    ],
    hints: ["A bus exists only if the stations are not all run by the same company.","That means s has at least one A and at least one B.","Check whether s contains 'A' and also contains 'B'."],
    solution: {
      idea: ["Return Yes when both letters occur in s."],
      complexity: "O(1) time and space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string hasBus(string s) {
        bool a = s.find('A') != string::npos, b = s.find('B') != string::npos;
        return (a && b) ? "Yes" : "No";
    }
};
`,
    },
  },
  {
    id: "abc159-a",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abc159/tasks/abc159_a",
    title: "The Number of Even Pairs (AtCoder ABC 159 A)",
    statement: [
      "A bag holds n balls with even numbers written on them and m balls with odd numbers. Count the ways to pick two different balls so that the sum of their numbers is even. The order of the two does not matter.",
      "Written for this app from the AtCoder task of the same name (linked above); the original reads from standard input, here you write a function.",
    ],
    constraints: ["0 <= n, m <= 100","2 <= n + m"],
    fn: {"name":"evenPairs","params":[{"name":"n","type":"int"},{"name":"m","type":"int"}],"returns":"int"},
    examples: [
      { input: [2,1], output: 1 },
      { input: [4,3], output: 9 },
    ],
    tests: [
      { input: [1,1], output: 0 },
      { input: [2,0], output: 1 },
      { input: [0,2], output: 1 },
      { input: [100,0], output: 4950 },
      { input: [0,100], output: 4950 },
      { input: [50,50], output: 2450 },
      { input: [100,100], output: 9900 },
      { input: [3,5], output: 13 },
    ],
    hints: ["The sum of two numbers is even when both are even or both are odd.","The number of ways to pick two of x balls is x * (x - 1) / 2.","Add that for the even balls and for the odd balls."],
    solution: {
      idea: ["Pairs of two evens plus pairs of two odds: n(n-1)/2 + m(m-1)/2."],
      complexity: "O(1) time and space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int evenPairs(int n, int m) { return n * (n - 1) / 2 + m * (m - 1) / 2; }
};
`,
    },
  },
  {
    id: "abc160-a",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abc160/tasks/abc160_a",
    title: "Coffee (AtCoder ABC 160 A)",
    statement: [
      "A string s of six lowercase letters is called coffee-like if its 3rd and 4th letters are equal and its 5th and 6th letters are also equal. Return Yes if s is coffee-like and No otherwise.",
      "Written for this app from the AtCoder task of the same name (linked above); the original reads from standard input, here you write a function.",
    ],
    constraints: ["s has exactly 6 lowercase letters"],
    fn: {"name":"isCoffeeLike","params":[{"name":"s","type":"string"}],"returns":"string"},
    examples: [
      { input: ["sippuu"], output: "Yes" },
      { input: ["iphone"], output: "No" },
    ],
    tests: [
      { input: ["coffee"], output: "Yes" },
      { input: ["aabbcc"], output: "Yes" },
      { input: ["abccdd"], output: "Yes" },
      { input: ["abcdef"], output: "No" },
      { input: ["abccde"], output: "No" },
      { input: ["abcdee"], output: "No" },
      { input: ["zzzzzz"], output: "Yes" },
    ],
    hints: ["Strings are indexed from 0, so the 3rd, 4th, 5th and 6th letters are s[2], s[3], s[4], s[5].","Both conditions must hold: s[2] == s[3] and s[4] == s[5].","Return Yes if both are true, otherwise No."],
    solution: {
      idea: ["Compare s[2] with s[3] and s[4] with s[5]."],
      complexity: "O(1) time and space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string isCoffeeLike(string s) { return (s[2] == s[3] && s[4] == s[5]) ? "Yes" : "No"; }
};
`,
    },
  },
  {
    id: "abc161-a",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abc161/tasks/abc161_a",
    title: "ABC Swap (AtCoder ABC 161 A)",
    statement: [
      "Three boxes hold the numbers x, y and z. First swap the contents of the first and second box, then swap the contents of the first and third box. Return the final contents of the three boxes as a list [first, second, third].",
      "Written for this app from the AtCoder task of the same name (linked above); the original reads from standard input, here you write a function.",
    ],
    constraints: ["1 <= x, y, z <= 100"],
    fn: {"name":"abcSwap","params":[{"name":"x","type":"int"},{"name":"y","type":"int"},{"name":"z","type":"int"}],"returns":"int[]"},
    examples: [
      { input: [1,2,3], output: [3,1,2] },
      { input: [100,100,100], output: [100,100,100] },
    ],
    tests: [
      { input: [1,1,1], output: [1,1,1] },
      { input: [5,7,9], output: [9,5,7] },
      { input: [9,7,5], output: [5,9,7] },
      { input: [1,100,50], output: [50,1,100] },
      { input: [100,1,2], output: [2,100,1] },
      { input: [3,3,8], output: [8,3,3] },
    ],
    hints: ["Follow the values step by step on an example, say x = 1, y = 2, z = 3.","After the first swap the boxes hold (y, x, z). After the second they hold (z, x, y).","Return {z, x, y}."],
    solution: {
      idea: ["Two swaps rotate the values: the result is [z, x, y]."],
      complexity: "O(1) time and space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> abcSwap(int x, int y, int z) {
        swap(x, y);
        swap(x, z);
        return {x, y, z};
    }
};
`,
    },
  },
  {
    id: "abc162-a",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abc162/tasks/abc162_a",
    title: "Lucky 7 (AtCoder ABC 162 A)",
    statement: [
      "A three digit number n is given. Return Yes if the digit 7 appears anywhere in it, and No otherwise.",
      "Written for this app from the AtCoder task of the same name (linked above); the original reads from standard input, here you write a function.",
    ],
    constraints: ["100 <= n <= 999"],
    fn: {"name":"isLucky","params":[{"name":"n","type":"int"}],"returns":"string"},
    examples: [
      { input: [117], output: "Yes" },
      { input: [123], output: "No" },
    ],
    tests: [
      { input: [100], output: "No" },
      { input: [777], output: "Yes" },
      { input: [700], output: "Yes" },
      { input: [170], output: "Yes" },
      { input: [107], output: "Yes" },
      { input: [999], output: "No" },
      { input: [976], output: "Yes" },
      { input: [345], output: "No" },
    ],
    hints: ["You can turn the number into a string, or extract digits with % 10 and / 10.","Check the hundreds, tens and ones digit one by one.","Return Yes as soon as one of them equals 7."],
    solution: {
      idea: ["Loop over the digits (n % 10, then n / 10, ...) and look for a 7."],
      complexity: "O(1) time and space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string isLucky(int n) {
        while (n) { if (n % 10 == 7) return "Yes"; n /= 10; }
        return "No";
    }
};
`,
    },
  },
  {
    id: "abc163-b",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abc163/tasks/abc163_b",
    title: "Homework (AtCoder ABC 163 B)",
    statement: [
      "You have n days of summer holiday and m pieces of homework. Doing the i-th piece takes a[i] days, and you can only do one thing a day (homework or play). Return the largest number of days you can play, or -1 if the homework cannot be finished in n days.",
      "Written for this app from the AtCoder task of the same name (linked above); the original reads from standard input, here you write a function.",
    ],
    constraints: ["1 <= n <= 1000000","1 <= a.length <= 10000","1 <= a[i] <= 10000"],
    fn: {"name":"playDays","params":[{"name":"n","type":"int"},{"name":"a","type":"int[]"}],"returns":"int"},
    examples: [
      { input: [41,[5,6]], output: 30 },
      { input: [10,[5,6]], output: -1 },
    ],
    tests: [
      { input: [1,[1]], output: 0 },
      { input: [5,[5]], output: 0 },
      { input: [5,[6]], output: -1 },
      { input: [100,[1,2,3]], output: 94 },
      { input: [30,[10,10,10]], output: 0 },
      { input: [29,[10,10,10]], output: -1 },
      { input: [1000000,[10000,10000]], output: 980000 },
    ],
    hints: ["The homework takes a fixed total number of days, the sum of the a[i].","You can play on all the other days: n minus that sum.","If the sum is larger than n the answer is -1; otherwise n - sum."],
    solution: {
      idea: ["Add up all a[i] (it can reach 10^8, but a 64-bit sum is safe). If it exceeds n return -1, else n - sum."],
      complexity: "O(m) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int playDays(int n, vector<int>& a) {
        long long sum = 0;
        for (int x : a) sum += x;
        return sum > n ? -1 : (int)(n - sum);
    }
};
`,
    },
  },
  {
    id: "abc165-b",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abc165/tasks/abc165_b",
    title: "1% (AtCoder ABC 165 B)",
    statement: [
      "You deposit 100 yen. At the end of every year the bank adds 1 percent interest, rounded down to a whole number of yen (so 100 becomes 101, and 150 becomes 151). Return the smallest number of years after which you have at least x yen.",
      "The original task allows x up to 10^18; here x is at most 9 * 10^15 so that it is exact in the test data. The balance grows by at least 1 yen a year and by 1 percent when large, so the loop is short.",
    ],
    constraints: ["101 <= x <= 9000000000000000"],
    fn: {"name":"yearsToReach","params":[{"name":"x","type":"long"}],"returns":"int"},
    examples: [
      { input: [103], output: 3 },
      { input: [101], output: 1 },
    ],
    tests: [
      { input: [101], output: 1 },
      { input: [102], output: 2 },
      { input: [150], output: 50 },
      { input: [1000], output: 284 },
      { input: [100000], output: 752 },
      { input: [1000000000], output: 1677 },
      { input: [9000000000000000], output: 3287 },
      { input: [8999999999999999], output: 3287 },
    ],
    hints: ["Simulate year by year: balance = balance + balance / 100 using integer division.","Count the years until balance >= x.","The number of years stays small (a few thousand) because the balance grows 1 percent per year once it is large, so a plain loop is fast. Use a 64-bit integer."],
    solution: {
      idea: ["Simulate the yearly interest with integer arithmetic until the balance reaches x."],
      complexity: "O(answer) iterations, a few thousand at most.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int yearsToReach(long long x) {
        long long b = 100;
        int years = 0;
        while (b < x) { b += b / 100; years++; }
        return years;
    }
};
`,
    },
  },
  {
    id: "abc169-b",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abc169/tasks/abc169_b",
    title: "Multiplication 2 (AtCoder ABC 169 B)",
    statement: [
      "Multiply all numbers of the list a. If the product is larger than 10^15, return -1; otherwise return the product. If the list contains a 0 the product is 0, however large the other numbers are.",
      "The original task uses the limit 10^18; here it is 10^15 so that the answers are exact in the test data. The trap is overflow: multiplying blindly can wrap around and look small. Check before each multiplication, and look for a 0 first.",
    ],
    constraints: ["2 <= a.length <= 100000","0 <= a[i] <= 1000000000000000"],
    fn: {"name":"productOrMinusOne","params":[{"name":"a","type":"long[]"}],"returns":"long"},
    examples: [
      { input: [[1000000000,1000000]], output: 1000000000000000 },
      { input: [[1000000000,1000000,1000000000]], output: -1 },
    ],
    tests: [
      { input: [[2,3]], output: 6 },
      { input: [[0,5]], output: 0 },
      { input: [[1000000000000000,1]], output: 1000000000000000 },
      { input: [[1000000000000000,2]], output: -1 },
      { input: [[1000000000,1000000,0]], output: 0 },
      { input: [[1000000000000000,1000000000000000,0]], output: 0 },
      { input: [[1,1,1,1,7]], output: 7 },
      { input: [[31622777,31622777]], output: -1 },
      { input: [[1000000,1000000,1000]], output: 1000000000000000 },
    ],
    hints: ["If any element is 0 the answer is 0 no matter what else is there, so check that first.","Multiply step by step in a 64-bit integer and compare before you multiply: if cur > limit / x the product will exceed the limit.","Use cur > limit / a[i] (integer division, a[i] > 0). Once you have exceeded the limit, answer -1 (after confirming there is no zero)."],
    solution: {
      idea: ["Scan once for a zero. Otherwise multiply while keeping cur <= 10^15, using the division test to avoid overflow, and return -1 if the limit is passed."],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    long long productOrMinusOne(vector<long long>& a) {
        const long long LIM = 1000000000000000LL;
        for (long long x : a) if (x == 0) return 0;
        long long cur = 1;
        for (long long x : a) {
            if (cur > LIM / x) return -1;
            cur *= x;
        }
        return cur;
    }
};
`,
    },
  },
  {
    id: "abc171-b",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abc171/tasks/abc171_b",
    title: "Mix Juice (AtCoder ABC 171 B)",
    statement: [
      "A shop sells n kinds of fruit, the i-th costs p[i] yen. You buy exactly k different kinds, one of each. Return the smallest total price.",
      "Written for this app from the AtCoder task of the same name (linked above); the original reads from standard input, here you write a function.",
    ],
    constraints: ["1 <= k <= p.length <= 1000","1 <= p[i] <= 1000"],
    fn: {"name":"cheapestMix","params":[{"name":"k","type":"int"},{"name":"p","type":"int[]"}],"returns":"int"},
    examples: [
      { input: [2,[50,100,80,120,80]], output: 130 },
      { input: [1,[1000]], output: 1000 },
    ],
    tests: [
      { input: [1,[5,3,9]], output: 3 },
      { input: [3,[5,3,9]], output: 17 },
      { input: [3,[1,1,1,1]], output: 3 },
      { input: [2,[1000,1000]], output: 2000 },
      { input: [4,[4,3,2,1,10]], output: 10 },
      { input: [5,[10,9,8,7,6,5]], output: 35 },
    ],
    hints: ["Which fruits would you buy if you only wanted the cheapest?","The k cheapest ones, so the order of the prices does not matter.","Sort the prices ascending and add up the first k."],
    solution: {
      idea: ["Sort ascending and sum the first k prices."],
      complexity: "O(n log n) time.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int cheapestMix(int k, vector<int>& p) {
        vector<int> q = p;
        sort(q.begin(), q.end());
        int sum = 0;
        for (int i = 0; i < k; i++) sum += q[i];
        return sum;
    }
};
`,
    },
  },
  {
    id: "abc172-b",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abc172/tasks/abc172_b",
    title: "Minor Change (AtCoder ABC 172 B)",
    statement: [
      "Two strings s and t of the same length are given. In one operation you change one character of s into any other character. Return the smallest number of operations that make s equal to t.",
      "Written for this app from the AtCoder task of the same name (linked above); the original reads from standard input, here you write a function.",
    ],
    constraints: ["1 <= s.length <= 200000","t.length == s.length","lowercase letters only"],
    fn: {"name":"minChanges","params":[{"name":"s","type":"string"},{"name":"t","type":"string"}],"returns":"int"},
    examples: [
      { input: ["cupofcoffee","cupofhottea"], output: 4 },
      { input: ["abcde","bcdea"], output: 5 },
    ],
    tests: [
      { input: ["a","a"], output: 0 },
      { input: ["a","b"], output: 1 },
      { input: ["abc","abc"], output: 0 },
      { input: ["abc","abd"], output: 1 },
      { input: ["aaaa","bbbb"], output: 4 },
      { input: ["abab","baba"], output: 4 },
      { input: ["zyx","xyz"], output: 2 },
    ],
    hints: ["Each operation fixes at most one position, and positions are independent of each other.","A position needs a change exactly when s[i] != t[i].","Count the positions where the two strings differ (the Hamming distance)."],
    solution: {
      idea: ["The answer is the number of indices where s and t differ."],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int minChanges(string s, string t) {
        int c = 0;
        for (size_t i = 0; i < s.size(); i++) if (s[i] != t[i]) c++;
        return c;
    }
};
`,
    },
  },
  {
    id: "abc175-b",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abc175/tasks/abc175_b",
    title: "Making Triangle (AtCoder ABC 175 B)",
    statement: [
      "You have n sticks with lengths l[0..n-1]. Count the ways to choose three sticks (three different positions) so that all three lengths are different from each other and the three sticks form a triangle with positive area. Three lengths a, b, c form a triangle when the longest is shorter than the sum of the other two.",
      "Written for this app from the AtCoder task of the same name (linked above); the original reads from standard input, here you write a function.",
    ],
    constraints: ["3 <= l.length <= 100","1 <= l[i] <= 1000000000"],
    fn: {"name":"countTriangles","params":[{"name":"l","type":"int[]"}],"returns":"int"},
    examples: [
      { input: [[4,4,9,7,5]], output: 5 },
      { input: [[1,2,3]], output: 0 },
    ],
    tests: [
      { input: [[3,4,5]], output: 1 },
      { input: [[1,1,1]], output: 0 },
      { input: [[2,3,4,5]], output: 3 },
      { input: [[1,2,4,8]], output: 0 },
      { input: [[5,5,5,6,7]], output: 3 },
      { input: [[1000000000,999999999,999999998]], output: 1 },
      { input: [[1,2,3,4,5,6,7,8,9,10]], output: 50 },
    ],
    hints: ["With n at most 100 you can try every triple i < j < k: about 160 thousand of them.","For each triple first check the lengths are pairwise different.","Then sort the three (or take the maximum) and check max < sum of the other two. Beware of overflow in the sum: use long long."],
    solution: {
      idea: ["Brute force over all triples, test distinctness and the triangle inequality (using 64-bit sums)."],
      complexity: "O(n^3) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int countTriangles(vector<int>& l) {
        int n = l.size(), count = 0;
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++)
                for (int k = j + 1; k < n; k++) {
                    long long a = l[i], b = l[j], c = l[k];
                    if (a == b || b == c || a == c) continue;
                    long long mx = max(a, max(b, c));
                    if (mx < a + b + c - mx) count++;
                }
        return count;
    }
};
`,
    },
  },
  {
    id: "abc177-b",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abc177/tasks/abc177_b",
    title: "Substring (AtCoder ABC 177 B)",
    statement: [
      "Two strings s and t are given, with t no longer than s. In one operation you change one character of s into any other character. Return the smallest number of operations after which t is a substring of s (it occurs as a block of consecutive characters).",
      "Written for this app from the AtCoder task of the same name (linked above); the original reads from standard input, here you write a function.",
    ],
    constraints: ["1 <= t.length <= s.length <= 1000","lowercase letters only"],
    fn: {"name":"minToContain","params":[{"name":"s","type":"string"},{"name":"t","type":"string"}],"returns":"int"},
    examples: [
      { input: ["cabacc","abc"], output: 1 },
      { input: ["codeforces","atcoder"], output: 6 },
    ],
    tests: [
      { input: ["a","a"], output: 0 },
      { input: ["a","b"], output: 1 },
      { input: ["abc","abc"], output: 0 },
      { input: ["abc","xyz"], output: 3 },
      { input: ["aaaaa","ab"], output: 1 },
      { input: ["abcabc","abd"], output: 1 },
      { input: ["zzzz","z"], output: 0 },
      { input: ["abcdefgh","gh"], output: 0 },
    ],
    hints: ["After the changes t will sit at some starting position i of s. Try every starting position.","For a fixed start, the number of changes is the number of positions j where s[i + j] != t[j].","Take the minimum over all starts i from 0 to |s| - |t|. The total work is |s| * |t| at most 10^6."],
    solution: {
      idea: ["Slide t over s and count mismatches at each offset; return the smallest count."],
      complexity: "O(|s| * |t|) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int minToContain(string s, string t) {
        int best = t.size();
        for (size_t i = 0; i + t.size() <= s.size(); i++) {
            int c = 0;
            for (size_t j = 0; j < t.size(); j++) if (s[i + j] != t[j]) c++;
            best = min(best, c);
        }
        return best;
    }
};
`,
    },
  },
  {
    id: "abc163-c",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abc163/tasks/abc163_c",
    title: "management (AtCoder ABC 163 C)",
    statement: [
      "A company has n employees numbered 1 to n. Employee 1 is the boss of everyone; each employee i from 2 to n has exactly one immediate boss, a[i-2], who has a smaller number than i. You get the list a of length n - 1. Return a list of length n whose i-th entry (employee i + 1) is the number of employees whose immediate boss is that employee.",
      "Written for this app from the AtCoder task of the same name (linked above); the original reads from standard input, here you write a function.",
    ],
    constraints: ["2 <= n <= 200000","a.length == n - 1","1 <= a[i] < i + 2"],
    fn: {"name":"directReports","params":[{"name":"a","type":"int[]"}],"returns":"int[]"},
    examples: [
      { input: [[1,1,2,2]], output: [2,2,0,0,0] },
      { input: [[1,2,3,4,5,6,7,8,9]], output: [1,1,1,1,1,1,1,1,1,0] },
    ],
    tests: [
      { input: [[1]], output: [1,0] },
      { input: [[1,1]], output: [2,0,0] },
      { input: [[1,2]], output: [1,1,0] },
      { input: [[1,1,1,1]], output: [4,0,0,0,0] },
      { input: [[1,2,2,3,3,3]], output: [1,2,3,0,0,0,0] },
      { input: [[1,1,2,3,3,5,6,6,6]], output: [2,1,2,0,1,3,0,0,0,0] },
      { input: [[1,2,3,4,5,6,7,8,9]], output: [1,1,1,1,1,1,1,1,1,0] },
    ],
    hints: ["The size of the answer is one more than the size of a: there is an extra employee, number 1, who is not in a.","Each entry a[i] says 'employee a[i] has one more direct report'.","Keep a counter array of size n and add 1 to counter[a[i] - 1] for every i; return it."],
    solution: {
      idea: ["Count how many times each employee number appears in a."],
      complexity: "O(n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> directReports(vector<int>& a) {
        vector<int> cnt(a.size() + 1, 0);
        for (int b : a) cnt[b - 1]++;
        return cnt;
    }
};
`,
    },
  },
  {
    id: "abc164-c",
    source: "atcoder",
    url: "https://atcoder.jp/contests/abc164/tasks/abc164_c",
    title: "gacha (AtCoder ABC 164 C)",
    statement: [
      "You drew prizes from a lottery n times; draw i gave an item whose name is s[i]. Return the number of different kinds of items you got.",
      "Written for this app from the AtCoder task of the same name (linked above); the original reads from standard input, here you write a function.",
    ],
    constraints: ["1 <= s.length <= 200000","each name has 1 to 10 lowercase letters"],
    fn: {"name":"kindsOfItems","params":[{"name":"s","type":"string[]"}],"returns":"int"},
    examples: [
      { input: [["apple","orange","apple"]], output: 2 },
      { input: [["grape","grape","grape","grape"]], output: 1 },
    ],
    tests: [
      { input: [["a"]], output: 1 },
      { input: [["a","b"]], output: 2 },
      { input: [["a","a"]], output: 1 },
      { input: [["ab","ba","ab","aa","bb","ba"]], output: 4 },
      { input: [["zzzzzzzzzz","zzzzzzzzzy","zzzzzzzzzz"]], output: 2 },
      { input: [["x","y","z","x","y","z","w"]], output: 4 },
    ],
    hints: ["You only need to know whether a name has been seen before.","A set stores each distinct value once; inserting a repeat changes nothing.","Put all names in a set (or sort them and count changes) and return its size."],
    solution: {
      idea: ["Insert every name into a hash set and return the set size."],
      complexity: "O(n) expected time with a hash set, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int kindsOfItems(vector<string>& s) {
        unordered_set<string> seen(s.begin(), s.end());
        return (int)seen.size();
    }
};
`,
    },
  },
];

/**
 * Metadata for the lead to register the problems in dsa.ts. `id` is the argument for `logic(id, title, url, d, why)`
 * (the problem id is "c-" + id); `pattern` is the per-site pattern the problem belongs in.
 */
export interface LogicEntryC {
  id: string;
  title: string;
  url: string;
  /** Key of D in dsa.ts: E, M or H */
  d: "E" | "M" | "H";
  difficulty: "easy" | "medium" | "hard";
  source: "euler" | "atcoder";
  pattern: "cses-euler" | "cses-atcoder";
  tags: string[];
  why: string;
}

export const LOGIC_ENTRIES_C: LogicEntryC[] = [
  {
    "id": "euler-18",
    "title": "Triangle Path Sum (Project Euler 18)",
    "difficulty": "medium",
    "d": "M",
    "source": "euler",
    "url": "https://projecteuler.net/problem=18",
    "pattern": "cses-euler",
    "tags": [
      "dp",
      "grid"
    ],
    "why": "Dynamic programming from the bottom: keep an array equal to the last row, then for each row above replace entry j by triangle[i][j] + max(d[j], d[j+1])."
  },
  {
    "id": "euler-20",
    "title": "Factorial Digit Sum (Project Euler 20)",
    "difficulty": "medium",
    "d": "M",
    "source": "euler",
    "url": "https://projecteuler.net/problem=20",
    "pattern": "cses-euler",
    "tags": [
      "big-number",
      "simulation"
    ],
    "why": "Big-number multiplication by a small number: store base 10^9 chunks, multiply each by k and carry the overflow upward."
  },
  {
    "id": "euler-23",
    "title": "Not a Sum of Two Abundant Numbers (Project Euler 23)",
    "difficulty": "medium",
    "d": "M",
    "source": "euler",
    "url": "https://projecteuler.net/problem=23",
    "pattern": "cses-euler",
    "tags": [
      "sieve",
      "number-theory"
    ],
    "why": "Cap the range at 28123 because above it every integer is a sum of two abundant numbers."
  },
  {
    "id": "euler-25",
    "title": "First Fibonacci With D Digits (Project Euler 25)",
    "difficulty": "medium",
    "d": "M",
    "source": "euler",
    "url": "https://projecteuler.net/problem=25",
    "pattern": "cses-euler",
    "tags": [
      "big-number",
      "simulation"
    ],
    "why": "Simulate the sequence with digit-array addition and stop at the first term with d digits."
  },
  {
    "id": "euler-27",
    "title": "Longest Prime Run of a Quadratic (Project Euler 27)",
    "difficulty": "hard",
    "d": "H",
    "source": "euler",
    "url": "https://projecteuler.net/problem=27",
    "pattern": "cses-euler",
    "tags": [
      "primes",
      "brute-force"
    ],
    "why": "Only primes b can start a run, so loop over primes b <= bMax and every a, extending n while the value stays prime."
  },
  {
    "id": "euler-30",
    "title": "Digit Power Sums (Project Euler 30)",
    "difficulty": "medium",
    "d": "M",
    "source": "euler",
    "url": "https://projecteuler.net/problem=30",
    "pattern": "cses-euler",
    "tags": [
      "brute-force",
      "bounds"
    ],
    "why": "Bound the search at (p + 1) * 9^p and brute force every number from 10 upward with a table of digit powers."
  },
  {
    "id": "euler-34",
    "title": "Digit Factorial Numbers (Project Euler 34)",
    "difficulty": "medium",
    "d": "M",
    "source": "euler",
    "url": "https://projecteuler.net/problem=34",
    "pattern": "cses-euler",
    "tags": [
      "brute-force",
      "bounds"
    ],
    "why": "Show that no number above 7 * 9! can match, then brute force up to min(limit, 7 * 9!)."
  },
  {
    "id": "euler-36",
    "title": "Palindromes in Two Bases (Project Euler 36)",
    "difficulty": "medium",
    "d": "M",
    "source": "euler",
    "url": "https://projecteuler.net/problem=36",
    "pattern": "cses-euler",
    "tags": [
      "palindromes",
      "bases"
    ],
    "why": "Enumerate base 10 palindromes from their halves, then test the second base with a digit array."
  },
  {
    "id": "euler-37",
    "title": "Truncatable Primes (Project Euler 37)",
    "difficulty": "medium",
    "d": "M",
    "source": "euler",
    "url": "https://projecteuler.net/problem=37",
    "pattern": "cses-euler",
    "tags": [
      "primes",
      "sieve"
    ],
    "why": "Sieve of Eratosthenes up to limit, then for each prime test all right and left truncations in the sieve."
  },
  {
    "id": "euler-39",
    "title": "Right Triangle Perimeters (Project Euler 39)",
    "difficulty": "medium",
    "d": "M",
    "source": "euler",
    "url": "https://projecteuler.net/problem=39",
    "pattern": "cses-euler",
    "tags": [
      "pythagorean",
      "counting"
    ],
    "why": "Generate primitive triples with Euclid's formula, and add each one to all of its multiples in a count array."
  },
  {
    "id": "euler-40",
    "title": "Digit of the Counting Word (Project Euler 40)",
    "difficulty": "medium",
    "d": "M",
    "source": "euler",
    "url": "https://projecteuler.net/problem=40",
    "pattern": "cses-euler",
    "tags": [
      "math",
      "digits"
    ],
    "why": "Skip whole digit-length groups by subtracting their sizes, then locate the exact number as first + (k - 1) / len."
  },
  {
    "id": "euler-41",
    "title": "Largest Pandigital Prime (Project Euler 41)",
    "difficulty": "medium",
    "d": "M",
    "source": "euler",
    "url": "https://projecteuler.net/problem=41",
    "pattern": "cses-euler",
    "tags": [
      "primes",
      "permutations"
    ],
    "why": "Walk the permutations of 1..n in decreasing order and return the first prime."
  },
  {
    "id": "euler-45",
    "title": "Triangular, Pentagonal and Hexagonal (Project Euler 45)",
    "difficulty": "hard",
    "d": "H",
    "source": "euler",
    "url": "https://projecteuler.net/problem=45",
    "pattern": "cses-euler",
    "tags": [
      "math",
      "figurate-numbers"
    ],
    "why": "Iterate hexagonal numbers (they are triangular automatically) and test pentagonality with an integer square root check."
  },
  {
    "id": "euler-47",
    "title": "Consecutive Numbers With Distinct Prime Factors (Project Euler 47)",
    "difficulty": "medium",
    "d": "M",
    "source": "euler",
    "url": "https://projecteuler.net/problem=47",
    "pattern": "cses-euler",
    "tags": [
      "sieve",
      "number-theory"
    ],
    "why": "Compute omega (number of distinct prime factors) for all numbers up to a limit with a sieve."
  },
  {
    "id": "euler-52",
    "title": "Multiples With the Same Digits (Project Euler 52)",
    "difficulty": "medium",
    "d": "M",
    "source": "euler",
    "url": "https://projecteuler.net/problem=52",
    "pattern": "cses-euler",
    "tags": [
      "digits",
      "brute-force"
    ],
    "why": "Brute force x upward; for each, build the sorted-digit signature of x and compare it with those of its multiples up to kx."
  },
  {
    "id": "euler-53",
    "title": "Counting Large Binomials (Project Euler 53)",
    "difficulty": "medium",
    "d": "M",
    "source": "euler",
    "url": "https://projecteuler.net/problem=53",
    "pattern": "cses-euler",
    "tags": [
      "combinatorics",
      "saturating-arithmetic"
    ],
    "why": "Build Pascal's triangle with entries capped at threshold + 1 so nothing overflows."
  },
  {
    "id": "euler-55",
    "title": "Reverse and Add (Project Euler 55)",
    "difficulty": "hard",
    "d": "H",
    "source": "euler",
    "url": "https://projecteuler.net/problem=55",
    "pattern": "cses-euler",
    "tags": [
      "palindromes",
      "big-number"
    ],
    "why": "For every n below limit, run up to `iterations` rounds of string reverse-and-add, checking for a palindrome after each."
  },
  {
    "id": "euler-58",
    "title": "Spiral Diagonal Primes (Project Euler 58)",
    "difficulty": "hard",
    "d": "H",
    "source": "euler",
    "url": "https://projecteuler.net/problem=58",
    "pattern": "cses-euler",
    "tags": [
      "primes",
      "miller-rabin"
    ],
    "why": "Walk rings s = 3, 5, 7, ...; test the three non-square corners with Miller-Rabin and update the prime count."
  },
  {
    "id": "euler-92",
    "title": "Square Digit Chains (Project Euler 92)",
    "difficulty": "medium",
    "d": "M",
    "source": "euler",
    "url": "https://projecteuler.net/problem=92",
    "pattern": "cses-euler",
    "tags": [
      "digit-dp",
      "precomputation"
    ],
    "why": "Precompute the end (1 or 89) for every value up to 729 by following chains."
  },
  {
    "id": "euler-97",
    "title": "Last Digits of a Huge Number (Project Euler 97)",
    "difficulty": "medium",
    "d": "M",
    "source": "euler",
    "url": "https://projecteuler.net/problem=97",
    "pattern": "cses-euler",
    "tags": [
      "modular-arithmetic",
      "fast-power"
    ],
    "why": "Fast modular exponentiation of 2 with modulus 10^k, using 128-bit intermediates for the products."
  },
  {
    "id": "atc-abc151-a",
    "title": "Next Alphabet (AtCoder ABC 151 A)",
    "difficulty": "easy",
    "d": "E",
    "source": "atcoder",
    "url": "https://atcoder.jp/contests/abc151/tasks/abc151_a",
    "pattern": "cses-atcoder",
    "tags": [
      "strings",
      "ascii"
    ],
    "why": "Add one to the character code of c and return it as a string."
  },
  {
    "id": "atc-abc153-a",
    "title": "Serval vs Monster (AtCoder ABC 153 A)",
    "difficulty": "easy",
    "d": "E",
    "source": "atcoder",
    "url": "https://atcoder.jp/contests/abc153/tasks/abc153_a",
    "pattern": "cses-atcoder",
    "tags": [
      "math",
      "ceil-division"
    ],
    "why": "The answer is ceil(h / a), computed as (h + a - 1) / a."
  },
  {
    "id": "atc-abc154-a",
    "title": "Remaining Balls (AtCoder ABC 154 A)",
    "difficulty": "easy",
    "d": "E",
    "source": "atcoder",
    "url": "https://atcoder.jp/contests/abc154/tasks/abc154_a",
    "pattern": "cses-atcoder",
    "tags": [
      "implementation"
    ],
    "why": "If u equals s, decrease a, otherwise decrease b. Return both counts."
  },
  {
    "id": "atc-abc155-a",
    "title": "Poor (AtCoder ABC 155 A)",
    "difficulty": "easy",
    "d": "E",
    "source": "atcoder",
    "url": "https://atcoder.jp/contests/abc155/tasks/abc155_a",
    "pattern": "cses-atcoder",
    "tags": [
      "implementation",
      "counting"
    ],
    "why": "Count how many of the pairs (a, b), (b, c), (a, c) are equal. Exactly one equal pair means exactly two equal numbers."
  },
  {
    "id": "atc-abc156-a",
    "title": "Beginner (AtCoder ABC 156 A)",
    "difficulty": "easy",
    "d": "E",
    "source": "atcoder",
    "url": "https://atcoder.jp/contests/abc156/tasks/abc156_a",
    "pattern": "cses-atcoder",
    "tags": [
      "implementation",
      "math"
    ],
    "why": "If n >= 10 return r, otherwise r + 100 * (10 - n)."
  },
  {
    "id": "atc-abc157-a",
    "title": "Duplex Printing (AtCoder ABC 157 A)",
    "difficulty": "easy",
    "d": "E",
    "source": "atcoder",
    "url": "https://atcoder.jp/contests/abc157/tasks/abc157_a",
    "pattern": "cses-atcoder",
    "tags": [
      "math",
      "ceil-division"
    ],
    "why": "The answer is ceil(n / 2) = (n + 1) / 2."
  },
  {
    "id": "atc-abc158-a",
    "title": "Station and Bus (AtCoder ABC 158 A)",
    "difficulty": "easy",
    "d": "E",
    "source": "atcoder",
    "url": "https://atcoder.jp/contests/abc158/tasks/abc158_a",
    "pattern": "cses-atcoder",
    "tags": [
      "strings",
      "implementation"
    ],
    "why": "Return Yes when both letters occur in s."
  },
  {
    "id": "atc-abc159-a",
    "title": "The Number of Even Pairs (AtCoder ABC 159 A)",
    "difficulty": "easy",
    "d": "E",
    "source": "atcoder",
    "url": "https://atcoder.jp/contests/abc159/tasks/abc159_a",
    "pattern": "cses-atcoder",
    "tags": [
      "math",
      "counting"
    ],
    "why": "Pairs of two evens plus pairs of two odds: n(n-1)/2 + m(m-1)/2."
  },
  {
    "id": "atc-abc160-a",
    "title": "Coffee (AtCoder ABC 160 A)",
    "difficulty": "easy",
    "d": "E",
    "source": "atcoder",
    "url": "https://atcoder.jp/contests/abc160/tasks/abc160_a",
    "pattern": "cses-atcoder",
    "tags": [
      "strings",
      "implementation"
    ],
    "why": "Compare s[2] with s[3] and s[4] with s[5]."
  },
  {
    "id": "atc-abc161-a",
    "title": "ABC Swap (AtCoder ABC 161 A)",
    "difficulty": "easy",
    "d": "E",
    "source": "atcoder",
    "url": "https://atcoder.jp/contests/abc161/tasks/abc161_a",
    "pattern": "cses-atcoder",
    "tags": [
      "implementation",
      "swap"
    ],
    "why": "Two swaps rotate the values: the result is [z, x, y]."
  },
  {
    "id": "atc-abc162-a",
    "title": "Lucky 7 (AtCoder ABC 162 A)",
    "difficulty": "easy",
    "d": "E",
    "source": "atcoder",
    "url": "https://atcoder.jp/contests/abc162/tasks/abc162_a",
    "pattern": "cses-atcoder",
    "tags": [
      "digits",
      "implementation"
    ],
    "why": "Loop over the digits (n % 10, then n / 10, ...) and look for a 7."
  },
  {
    "id": "atc-abc163-b",
    "title": "Homework (AtCoder ABC 163 B)",
    "difficulty": "easy",
    "d": "E",
    "source": "atcoder",
    "url": "https://atcoder.jp/contests/abc163/tasks/abc163_b",
    "pattern": "cses-atcoder",
    "tags": [
      "arrays",
      "sum"
    ],
    "why": "Add up all a[i] (it can reach 10^8, but a 64-bit sum is safe). If it exceeds n return -1, else n - sum."
  },
  {
    "id": "atc-abc165-b",
    "title": "1% (AtCoder ABC 165 B)",
    "difficulty": "easy",
    "d": "E",
    "source": "atcoder",
    "url": "https://atcoder.jp/contests/abc165/tasks/abc165_b",
    "pattern": "cses-atcoder",
    "tags": [
      "simulation",
      "math"
    ],
    "why": "Simulate the yearly interest with integer arithmetic until the balance reaches x."
  },
  {
    "id": "atc-abc169-b",
    "title": "Multiplication 2 (AtCoder ABC 169 B)",
    "difficulty": "medium",
    "d": "M",
    "source": "atcoder",
    "url": "https://atcoder.jp/contests/abc169/tasks/abc169_b",
    "pattern": "cses-atcoder",
    "tags": [
      "overflow",
      "math"
    ],
    "why": "Scan once for a zero. Otherwise multiply while keeping cur <= 10^15, using the division test to avoid overflow, and return -1 if the limit is passed."
  },
  {
    "id": "atc-abc171-b",
    "title": "Mix Juice (AtCoder ABC 171 B)",
    "difficulty": "easy",
    "d": "E",
    "source": "atcoder",
    "url": "https://atcoder.jp/contests/abc171/tasks/abc171_b",
    "pattern": "cses-atcoder",
    "tags": [
      "sorting",
      "greedy"
    ],
    "why": "Sort ascending and sum the first k prices."
  },
  {
    "id": "atc-abc172-b",
    "title": "Minor Change (AtCoder ABC 172 B)",
    "difficulty": "easy",
    "d": "E",
    "source": "atcoder",
    "url": "https://atcoder.jp/contests/abc172/tasks/abc172_b",
    "pattern": "cses-atcoder",
    "tags": [
      "strings",
      "counting"
    ],
    "why": "The answer is the number of indices where s and t differ."
  },
  {
    "id": "atc-abc175-b",
    "title": "Making Triangle (AtCoder ABC 175 B)",
    "difficulty": "medium",
    "d": "M",
    "source": "atcoder",
    "url": "https://atcoder.jp/contests/abc175/tasks/abc175_b",
    "pattern": "cses-atcoder",
    "tags": [
      "brute-force",
      "geometry"
    ],
    "why": "Brute force over all triples, test distinctness and the triangle inequality (using 64-bit sums)."
  },
  {
    "id": "atc-abc177-b",
    "title": "Substring (AtCoder ABC 177 B)",
    "difficulty": "easy",
    "d": "E",
    "source": "atcoder",
    "url": "https://atcoder.jp/contests/abc177/tasks/abc177_b",
    "pattern": "cses-atcoder",
    "tags": [
      "strings",
      "brute-force"
    ],
    "why": "Slide t over s and count mismatches at each offset; return the smallest count."
  },
  {
    "id": "atc-abc163-c",
    "title": "management (AtCoder ABC 163 C)",
    "difficulty": "easy",
    "d": "E",
    "source": "atcoder",
    "url": "https://atcoder.jp/contests/abc163/tasks/abc163_c",
    "pattern": "cses-atcoder",
    "tags": [
      "counting",
      "arrays"
    ],
    "why": "Count how many times each employee number appears in a."
  },
  {
    "id": "atc-abc164-c",
    "title": "gacha (AtCoder ABC 164 C)",
    "difficulty": "easy",
    "d": "E",
    "source": "atcoder",
    "url": "https://atcoder.jp/contests/abc164/tasks/abc164_c",
    "pattern": "cses-atcoder",
    "tags": [
      "hashing",
      "sets"
    ],
    "why": "Insert every name into a hash set and return the set size."
  }
];
