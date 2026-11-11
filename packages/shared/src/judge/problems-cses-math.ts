import type { ProblemSpec } from "./types";

// CSES Mathematics problem specifications.
// Statements, hints, and explanations are written for this app in our own words; the original tasks are linked.

export const CSES_SPECS_MATH: ProblemSpec[] = [
  {
    id: "cses-josephus-queries",
    source: "cses",
    title: "Josephus Queries",
    url: "https://cses.fi/problemset/task/2164",
    statement: [
      "Consider a game where n children (numbered 1, 2, ..., n) are seated in a circle.",
      "Starting from child 1, every second child is removed from the circle until no children remain: first child 2 is removed, then child 4, and so on.",
      "You are given several queries. Each query consists of a pair [n, k]. Your task is to determine which child is removed at step k."
    ],
    constraints: [
      "1 <= queries.length <= 100000",
      "1 <= k <= n <= 1000000000"
    ],
    fn: {
      name: "josephusQueries",
      params: [{ name: "queries", type: "int[][]" }],
      returns: "int[]"
    },
    examples: [
      {
        input: [[[7, 1], [7, 3], [2, 2], [1337, 42]]],
        output: [2, 6, 1, 84],
        explanation: "For n = 7: child 2 is removed 1st, child 6 is removed 3rd. For n = 2: child 2 is removed 1st, leaving child 1 to be removed 2nd. For n = 1337, the 42nd removed child is 84."
      },
      {
        input: [[[7, 4], [7, 7]]],
        output: [1, 7],
        explanation: "For n = 7: the full removal sequence is 2, 4, 6, 1, 5, 3, 7. Thus the 4th removed is 1 and the 7th removed is 7."
      }
    ],
    tests: [
      { input: [[[1, 1]]], output: [1] },
      { input: [[[2, 1], [2, 2]]], output: [2, 1] },
      { input: [[[4, 1], [4, 2], [4, 3], [4, 4]]], output: [2, 4, 3, 1] },
      { input: [[[5, 1], [5, 2], [5, 3], [5, 4], [5, 5]]], output: [2, 4, 1, 5, 3] },
      { input: [[[10, 1], [10, 5], [10, 10]]], output: [2, 10, 5] },
      { input: [[[100, 50], [100, 100]]], output: [100, 73] },
      { input: [[[1000000000, 1], [1000000000, 500000000]]], output: [2, 1000000000] }
    ],
    hints: [
      "In the first round around the circle, all even-indexed children 2, 4, 6, ... are removed.",
      "If 2 * k <= n, then child 2 * k is removed during this first round.",
      "If 2 * k > n, reduce the problem recursively to a circle of size n / 2. Pay close attention to whether n is odd or even to properly remap the child indices after wrapping around."
    ],
    solution: {
      idea: [
        "If k <= (n + 1) / 2: during the first pass all even numbers up to n are removed. If 2 * k <= n, the answer is 2 * k. If n is odd and k = (n + 1) / 2, the next child removed after wrapping is child 1.",
        "Otherwise, we recursively solve for the remaining children of size n / 2. When n is even, the remaining odd indices map to 2 * res - 1. When n is odd, the shift maps to 2 * res + 1.",
        "Each query runs in O(log n) time by halving n at each recursive step."
      ],
      complexity: "O(q log n) time, O(log n) space where q is queries.length.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    int solve(int n, int k) {
        if (n == 1) return 1;
        if (k <= (n + 1) / 2) {
            if (2 * k > n) return 1;
            return 2 * k;
        }
        int temp = solve(n / 2, k - (n + 1) / 2);
        if (n % 2 == 1) {
            return 2 * temp + 1;
        } else {
            return 2 * temp - 1;
        }
    }
public:
    vector<int> josephusQueries(vector<vector<int>>& queries) {
        vector<int> ans;
        ans.reserve(queries.size());
        for (const auto& q : queries) {
            ans.push_back(solve(q[0], q[1]));
        }
        return ans;
    }
};
`
    }
  },
  {
    id: "cses-exponentiation-ii",
    source: "cses",
    title: "Exponentiation II",
    url: "https://cses.fi/problemset/task/1712",
    statement: [
      "Given a series of queries where each query consists of three integers [a, b, c], calculate a^(b^c) modulo 10^9 + 7.",
      "Note that 0^0 = 1."
    ],
    constraints: [
      "1 <= queries.length <= 100000",
      "0 <= a, b, c <= 1000000000"
    ],
    fn: {
      name: "exponentiationII",
      params: [{ name: "queries", type: "int[][]" }],
      returns: "int[]"
    },
    examples: [
      {
        input: [[[3, 7, 1], [15, 2, 2]]],
        output: [2187, 50625],
        explanation: "3^(7^1) = 3^7 = 2187. 15^(2^2) = 15^4 = 50625."
      },
      {
        input: [[[3, 4, 5]]],
        output: [763327764],
        explanation: "4^5 = 1024, and 3^1024 mod (10^9 + 7) = 763327764."
      }
    ],
    tests: [
      { input: [[[0, 0, 0]]], output: [0] },
      { input: [[[2, 0, 0]]], output: [2] },
      { input: [[[0, 5, 2]]], output: [0] },
      { input: [[[5, 0, 5]]], output: [1] },
      { input: [[[2, 2, 3], [5, 2, 3]]], output: [256, 390625] },
      { input: [[[2, 3, 2]]], output: [512] },
      { input: [[[10, 10, 10]]], output: [206165314] },
      { input: [[[2, 10, 9]]], output: [140625001] }
    ],
    hints: [
      "You cannot simply compute (b^c) modulo 10^9 + 7 because the modulus in the exponent behaves differently.",
      "By Fermat's Little Theorem, if p is prime and gcd(a, p) = 1, then a^(p - 1) = 1 (mod p).",
      "Therefore, compute the exponent e = b^c modulo (p - 1), where p = 10^9 + 7. Then compute a^e modulo p."
    ],
    solution: {
      idea: [
        "Since MOD = 10^9 + 7 is prime, by Fermat's Little Theorem the exponent works modulo (MOD - 1) = 10^9 + 6.",
        "First compute exp = b^c mod (MOD - 1) using binary exponentiation.",
        "Then compute a^exp mod MOD using binary exponentiation.",
        "Each query requires two binary exponentiation calculations, each taking O(log MOD) steps."
      ],
      complexity: "O(q log MOD) time, O(1) space where q is queries.length.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    long long power(long long base, long long exp, long long mod) {
        long long res = 1;
        base %= mod;
        while (exp > 0) {
            if (exp & 1) res = (res * base) % mod;
            base = (base * base) % mod;
            exp >>= 1;
        }
        return res;
    }
public:
    vector<int> exponentiationII(vector<vector<int>>& queries) {
        const long long MOD = 1000000007;
        const long long PHI = 1000000006;
        vector<int> ans;
        ans.reserve(queries.size());
        for (const auto& q : queries) {
            long long a = q[0], b = q[1], c = q[2];
            long long exp = power(b, c, PHI);
            long long res = power(a, exp, MOD);
            ans.push_back((int)res);
        }
        return ans;
    }
};
`
    }
  },
  {
    id: "cses-sum-of-divisors",
    source: "cses",
    title: "Sum of Divisors",
    url: "https://cses.fi/problemset/task/1082",
    statement: [
      "Let sigma(x) be the sum of divisors of an integer x.",
      "Given an integer n, calculate the sum of sigma(x) for all x from 1 to n modulo 10^9 + 7."
    ],
    constraints: [
      "1 <= n <= 1000000000000"
    ],
    fn: {
      name: "sumOfDivisors",
      params: [{ name: "n", type: "long" }],
      returns: "int"
    },
    examples: [
      {
        input: [3],
        output: 8,
        explanation: "sigma(1) = 1, sigma(2) = 1 + 2 = 3, and sigma(3) = 1 + 3 = 4. The total sum is 1 + 3 + 4 = 8."
      },
      {
        input: [5],
        output: 21,
        explanation: "sigma(1..5) are 1, 3, 4, 7, 6. The sum is 1 + 3 + 4 + 7 + 6 = 21."
      }
    ],
    tests: [
      { input: [1], output: 1 },
      { input: [2], output: 4 },
      { input: [4], output: 15 },
      { input: [10], output: 87 },
      { input: [100], output: 8299 },
      { input: [1000], output: 823081 },
      { input: [1000000], output: 468112683 },
      { input: [1000000000000], output: 146462362 }
    ],
    hints: [
      "Instead of summing divisors per number, change the perspective: count how many times each divisor d in [1, n] divides a number <= n.",
      "The divisor d divides exactly floor(n / d) numbers. Therefore, the total sum is sum_{d=1}^n d * floor(n / d).",
      "Since n <= 10^12, looping up to n is impossible. However, floor(n / d) only takes at most 2 * sqrt(n) distinct values. Group values of d where floor(n / d) is constant and compute their sum with an arithmetic progression formula."
    ],
    solution: {
      idea: [
        "The problem asks for sum_{d=1}^n d * floor(n / d) mod (10^9 + 7).",
        "For a fixed lower bound l, let q = floor(n / l). The maximum r such that floor(n / r) == q is r = floor(n / q).",
        "For all d in [l, r], floor(n / d) is constant equal to q. The sum of d for d in [l, r] is an arithmetic series: (l + r) * (r - l + 1) / 2.",
        "Add q * ((l + r) * (r - l + 1) / 2) mod MOD to the total, then advance l = r + 1. There are at most 2 * sqrt(n) such blocks, completing in O(sqrt(n)) time."
      ],
      complexity: "O(sqrt(n)) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int sumOfDivisors(long long n) {
        const long long MOD = 1000000007;
        const long long INV2 = 500000004; // modular inverse of 2 mod 10^9 + 7
        long long ans = 0;
        long long l = 1;
        while (l <= n) {
            long long q = n / l;
            long long r = n / q;
            long long count = (r - l + 1) % MOD;
            long long sumLR = (l % MOD + r % MOD) % MOD;
            long long termSum = (sumLR * count) % MOD * INV2 % MOD;
            ans = (ans + (q % MOD) * termSum) % MOD;
            l = r + 1;
        }
        return (int)ans;
    }
};
`
    }
  },
  {
    id: "cses-prime-multiples",
    source: "cses",
    title: "Prime Multiples",
    url: "https://cses.fi/problemset/task/2185",
    statement: [
      "You are given an integer n and a list of k distinct prime numbers.",
      "Count how many integers between 1 and n are divisible by at least one of the prime numbers."
    ],
    constraints: [
      "1 <= n <= 1000000000000000000",
      "1 <= primes.length <= 20",
      "2 <= primes[i] <= n for each prime"
    ],
    fn: {
      name: "primeMultiples",
      params: [{ name: "n", type: "long" }, { name: "primes", type: "long[]" }],
      returns: "long"
    },
    examples: [
      {
        input: [20, [2, 5, 7]],
        output: 13,
        explanation: "Between 1 and 20, the 13 numbers divisible by 2, 5, or 7 are 2, 4, 5, 6, 7, 8, 10, 12, 14, 15, 16, 18, 20."
      },
      {
        input: [10, [2, 3]],
        output: 7,
        explanation: "The multiples are 2, 3, 4, 6, 8, 9, 10 (7 numbers)."
      }
    ],
    tests: [
      { input: [1, [2, 3]], output: 0 },
      { input: [10, [5]], output: 2 },
      { input: [100, [2, 3, 5]], output: 74 },
      { input: [1000, [2, 3, 5, 7]], output: 772 },
      { input: [1000000000000, [2, 3]], output: 666666666666 },
      { input: [1000000000000000000, [2]], output: 500000000000000000 }
    ],
    hints: [
      "The number of primes k is very small (at most 20). This suggests an exponential approach in k.",
      "Use the Principle of Inclusion-Exclusion (PIE) over all 2^k - 1 non-empty subsets of primes.",
      "For each subset of primes, compute their product P. The number of multiples <= n is floor(n / P). Beware of 64-bit integer overflow when multiplying primes together: check if p > n / P before multiplying."
    ],
    solution: {
      idea: [
        "By the Principle of Inclusion-Exclusion, the union of multiples across the k primes is sum_{S} (-1)^{|S| - 1} * floor(n / prod_{p in S} p).",
        "Since k <= 20, 2^k <= 1048576, so iterating through all non-empty subsets via bitmask takes under 0.1 seconds.",
        "To avoid 64-bit overflow, when building the product of primes in a subset, check if primes[i] > n / prod. If so, prod exceeds n, meaning floor(n / prod) is 0, so we can discard the subset immediately."
      ],
      complexity: "O(2^k * k) time, O(1) space where k is primes.length <= 20.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    long long primeMultiples(long long n, vector<long long>& primes) {
        int k = primes.size();
        long long ans = 0;
        int totalSubsets = 1 << k;
        for (int mask = 1; mask < totalSubsets; mask++) {
            int bits = 0;
            long long prod = 1;
            bool overflow = false;
            for (int i = 0; i < k; i++) {
                if ((mask >> i) & 1) {
                    bits++;
                    if (primes[i] > n / prod) {
                        overflow = true;
                        break;
                    }
                    prod *= primes[i];
                }
            }
            if (overflow) continue;
            long long count = n / prod;
            if (bits % 2 == 1) {
                ans += count;
            } else {
                ans -= count;
            }
        }
        return ans;
    }
};
`
    }
  },
  {
    id: "cses-counting-coprime-pairs",
    source: "cses",
    title: "Counting Coprime Pairs",
    url: "https://cses.fi/problemset/task/2417",
    statement: [
      "Given an array of n integers, count the number of pairs (i, j) with 1 <= i < j <= n such that gcd(arr[i], arr[j]) == 1."
    ],
    constraints: [
      "1 <= arr.length <= 100000",
      "1 <= arr[i] <= 1000000"
    ],
    fn: {
      name: "countingCoprimePairs",
      params: [{ name: "arr", type: "int[]" }],
      returns: "long"
    },
    examples: [
      {
        input: [[5, 4, 20, 15, 4]],
        output: 4,
        explanation: "The 4 coprime pairs are (arr[0], arr[1]) = (5, 4), (arr[0], arr[4]) = (5, 4), (arr[1], arr[3]) = (4, 15), and (arr[3], arr[4]) = (15, 4)."
      },
      {
        input: [[2, 3, 5]],
        output: 3,
        explanation: "All 3 pairs (2, 3), (2, 5), and (3, 5) have GCD 1."
      }
    ],
    tests: [
      { input: [[2, 4, 6]], output: 0 },
      { input: [[1, 1, 1]], output: 3 },
      { input: [[2, 3, 4, 5, 6]], output: 6 },
      { input: [[10, 15, 21, 35]], output: 1 },
      { input: [[6, 10, 15]], output: 0 },
      { input: [[7, 11, 13, 17, 19]], output: 10 }
    ],
    hints: [
      "Directly testing all pairs takes O(n^2) GCD checks, which will time out for n = 10^5.",
      "Use Möbius inversion. For any pair (a, b), sum_{d | gcd(a, b)} mu(d) equals 1 if gcd(a, b) == 1, and 0 otherwise.",
      "Therefore, the total number of coprime pairs is sum_{d >= 1} mu(d) * (cnt[d] * (cnt[d] - 1) / 2), where cnt[d] is the number of elements in arr that are multiples of d."
    ],
    solution: {
      idea: [
        "Precompute the Möbius function mu[1..M] using a linear sieve up to M = max(arr) <= 10^6.",
        "Record the occurrences of each number in a frequency table freq[1..M].",
        "For every d from 1 to M with mu[d] != 0, compute cnt[d] = sum_{k=1}^{floor(M/d)} freq[k * d].",
        "Add mu[d] * (cnt[d] * (cnt[d] - 1) / 2) to the total. The total number of divisor steps is O(M log M)."
      ],
      complexity: "O(n + M log M) time, O(M) space where M = max(arr) <= 10^6.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    long long countingCoprimePairs(vector<int>& arr) {
        int maxVal = 0;
        for (int x : arr) if (x > maxVal) maxVal = x;
        if (maxVal < 1) return 0;

        vector<int> mu(maxVal + 1, 0);
        vector<int> primes;
        vector<bool> isPrime(maxVal + 1, true);
        mu[1] = 1;
        for (int i = 2; i <= maxVal; i++) {
            if (isPrime[i]) {
                primes.push_back(i);
                mu[i] = -1;
            }
            for (int p : primes) {
                if (i * p > maxVal) break;
                isPrime[i * p] = false;
                if (i % p == 0) {
                    mu[i * p] = 0;
                    break;
                } else {
                    mu[i * p] = -mu[i];
                }
            }
        }

        vector<int> freq(maxVal + 1, 0);
        for (int x : arr) freq[x]++;

        long long totalCoprime = 0;
        for (int d = 1; d <= maxVal; d++) {
            if (mu[d] == 0) continue;
            long long cnt = 0;
            for (int mult = d; mult <= maxVal; mult += d) {
                cnt += freq[mult];
            }
            long long pairs = cnt * (cnt - 1) / 2;
            totalCoprime += (long long)mu[d] * pairs;
        }

        return totalCoprime;
    }
};
`
    }
  },
  {
    id: "cses-creating-strings-ii",
    source: "cses",
    title: "Creating Strings II",
    url: "https://cses.fi/problemset/task/1715",
    statement: [
      "Given a string s consisting of lowercase English letters, count the number of different strings that can be created using all its letters.",
      "Since the answer can be very large, return it modulo 10^9 + 7."
    ],
    constraints: [
      "1 <= s.length <= 1000000",
      "s contains only lowercase English letters ('a'-'z')"
    ],
    fn: {
      name: "creatingStringsII",
      params: [{ name: "s", type: "string" }],
      returns: "int"
    },
    examples: [
      {
        input: ["aab"],
        output: 3,
        explanation: "The 3 distinct permutations are 'aab', 'aba', and 'baa'."
      },
      {
        input: ["abc"],
        output: 6,
        explanation: "All 3! = 6 permutations are distinct because all characters are unique."
      }
    ],
    tests: [
      { input: ["a"], output: 1 },
      { input: ["aaaa"], output: 1 },
      { input: ["aabb"], output: 6 },
      { input: ["aabac"], output: 20 },
      { input: ["abcdefgh"], output: 40320 },
      { input: ["mississippi"], output: 34650 },
      { input: ["zzzzzzzzzz"], output: 1 }
    ],
    hints: [
      "By the multinomial formula, the number of distinct anagrams of a string of length n with character frequencies c_1, c_2, ..., c_26 is n! / (c_1! * c_2! * ... * c_26!).",
      "Compute n! modulo 10^9 + 7 iteratively in O(n) time.",
      "Multiply the denominator factorials together modulo 10^9 + 7, and use modular inverse via Fermat's Little Theorem to divide by the denominator."
    ],
    solution: {
      idea: [
        "Count the frequency c of each letter 'a' through 'z'.",
        "Precompute factorials up to n = s.length modulo 10^9 + 7.",
        "The number of unique anagrams is n! divided by prod_{c} (count[c]!).",
        "Compute the product of all factorials of character counts, invert it using binary exponentiation denom^(MOD - 2) mod MOD, and multiply with fact[n]."
      ],
      complexity: "O(n + 26) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    long long power(long long base, long long exp, long long mod) {
        long long res = 1;
        base %= mod;
        while (exp > 0) {
            if (exp & 1) res = (res * base) % mod;
            base = (base * base) % mod;
            exp >>= 1;
        }
        return res;
    }
public:
    int creatingStringsII(string s) {
        const long long MOD = 1000000007;
        int n = s.size();
        vector<long long> fact(n + 1, 1);
        for (int i = 2; i <= n; i++) {
            fact[i] = (fact[i - 1] * i) % MOD;
        }
        vector<int> cnt(26, 0);
        for (char c : s) cnt[c - 'a']++;

        long long denom = 1;
        for (int i = 0; i < 26; i++) {
            if (cnt[i] > 1) {
                denom = (denom * fact[cnt[i]]) % MOD;
            }
        }
        long long ans = fact[n] * power(denom, MOD - 2, MOD) % MOD;
        return (int)ans;
    }
};
`
    }
  },
  {
    id: "cses-distributing-apples",
    source: "cses",
    title: "Distributing Apples",
    url: "https://cses.fi/problemset/task/1716",
    statement: [
      "There are n children and m apples.",
      "Calculate the number of ways to distribute all m apples to the n children such that each child can receive any non-negative number of apples (including zero).",
      "Since the answer can be very large, return it modulo 10^9 + 7."
    ],
    constraints: [
      "1 <= n, m <= 1000000"
    ],
    fn: {
      name: "distributingApples",
      params: [{ name: "n", type: "int" }, { name: "m", type: "int" }],
      returns: "int"
    },
    examples: [
      {
        input: [3, 2],
        output: 6,
        explanation: "The 6 ways to distribute 2 apples to 3 children are: (2,0,0), (0,2,0), (0,0,2), (1,1,0), (1,0,1), and (0,1,1)."
      },
      {
        input: [1, 10],
        output: 1,
        explanation: "With only 1 child, all 10 apples must go to that child."
      }
    ],
    tests: [
      { input: [2, 3], output: 4 },
      { input: [5, 0], output: 1 },
      { input: [4, 4], output: 35 },
      { input: [10, 5], output: 2002 },
      { input: [100, 100], output: 703668401 },
      { input: [1000000, 1000000], output: 96075800 }
    ],
    hints: [
      "This is a classic Stars and Bars combinatorics problem.",
      "Distributing m indistinguishable items among n distinguishable bins is equivalent to placing n - 1 dividers among m items.",
      "The formula is binom(n + m - 1, m) = binom(n + m - 1, n - 1) modulo 10^9 + 7."
    ],
    solution: {
      idea: [
        "By the Stars and Bars theorem, the number of ways to distribute m identical apples into n distinct bins is (m + n - 1) choose m.",
        "Compute (n + m - 1)! / ((n - 1)! * m!) modulo 10^9 + 7.",
        "Precompute factorials up to n + m - 1 in O(n + m) time, multiply the denominator factorials, and invert using Fermat's Little Theorem."
      ],
      complexity: "O(n + m) time, O(n + m) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    long long power(long long base, long long exp, long long mod) {
        long long res = 1;
        base %= mod;
        while (exp > 0) {
            if (exp & 1) res = (res * base) % mod;
            base = (base * base) % mod;
            exp >>= 1;
        }
        return res;
    }
public:
    int distributingApples(int n, int m) {
        const long long MOD = 1000000007;
        int total = n + m - 1;
        vector<long long> fact(total + 1, 1);
        for (int i = 2; i <= total; i++) {
            fact[i] = (fact[i - 1] * i) % MOD;
        }
        long long denom = (fact[n - 1] * fact[m]) % MOD;
        long long ans = fact[total] * power(denom, MOD - 2, MOD) % MOD;
        return (int)ans;
    }
};
`
    }
  },
  {
    id: "cses-christmas-party",
    source: "cses",
    title: "Christmas Party",
    url: "https://cses.fi/problemset/task/1717",
    statement: [
      "There are n children at a Christmas party, and each child brings one gift.",
      "During the gift exchange, every child receives one gift.",
      "Count the number of ways to distribute the gifts such that no child receives their own gift (the number of derangements of n elements).",
      "Since the answer can be very large, return it modulo 10^9 + 7."
    ],
    constraints: [
      "1 <= n <= 1000000"
    ],
    fn: {
      name: "christmasParty",
      params: [{ name: "n", type: "int" }],
      returns: "int"
    },
    examples: [
      {
        input: [4],
        output: 9,
        explanation: "There are 9 valid derangements of 4 items."
      },
      {
        input: [1],
        output: 0,
        explanation: "A single child must receive their own gift, so 0 derangements are possible."
      }
    ],
    tests: [
      { input: [2], output: 1 },
      { input: [3], output: 2 },
      { input: [5], output: 44 },
      { input: [6], output: 265 },
      { input: [10], output: 1334961 },
      { input: [100], output: 944828409 },
      { input: [1000000], output: 102701088 }
    ],
    hints: [
      "A permutation where no element appears in its original position is called a derangement D_n.",
      "Consider child 1: they can receive any of the other n - 1 gifts (say child 2's gift). Now consider who receives child 1's gift.",
      "If child 2 receives child 1's gift, the remaining n - 2 children form a derangement (D_{n-2} ways). If child 2 does not receive child 1's gift, this is equivalent to a derangement of n - 1 children (D_{n-1} ways). Thus D_n = (n - 1) * (D_{n-1} + D_{n-2})."
    ],
    solution: {
      idea: [
        "Use the standard recurrence for derangements: D_1 = 0, D_2 = 1, and D_i = (i - 1) * (D_{i-1} + D_{i-2}) mod (10^9 + 7) for all i >= 3.",
        "We can evaluate this sequentially using two state variables in O(n) time and O(1) space."
      ],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int christmasParty(int n) {
        if (n <= 1) return 0;
        if (n == 2) return 1;
        const long long MOD = 1000000007;
        long long prev2 = 0; // D_1
        long long prev1 = 1; // D_2
        for (int i = 3; i <= n; i++) {
            long long cur = ((long long)(i - 1) * (prev1 + prev2)) % MOD;
            prev2 = prev1;
            prev1 = cur;
        }
        return (int)prev1;
    }
};
`
    }
  },
  {
    id: "cses-bracket-sequences-i",
    source: "cses",
    title: "Bracket Sequences I",
    url: "https://cses.fi/problemset/task/2064",
    statement: [
      "Calculate the number of valid bracket sequences of length n consisting of opening '(' and closing ')' brackets.",
      "A bracket sequence is valid if every opening bracket has a matching closing bracket and in every prefix the count of '(' is greater than or equal to the count of ')'.",
      "Since the answer can be very large, return it modulo 10^9 + 7."
    ],
    constraints: [
      "1 <= n <= 1000000"
    ],
    fn: {
      name: "bracketSequencesI",
      params: [{ name: "n", type: "int" }],
      returns: "int"
    },
    examples: [
      {
        input: [6],
        output: 5,
        explanation: "The 5 valid bracket sequences of length 6 are ((())), (()()), (())(), ()(()), and ()()()."
      },
      {
        input: [7],
        output: 0,
        explanation: "An odd length cannot form balanced parentheses, so the answer is 0."
      }
    ],
    tests: [
      { input: [1], output: 0 },
      { input: [2], output: 1 },
      { input: [4], output: 2 },
      { input: [8], output: 14 },
      { input: [10], output: 42 },
      { input: [20], output: 16796 },
      { input: [100], output: 265470434 },
      { input: [1000000], output: 213941567 }
    ],
    hints: [
      "If n is odd, can opening and closing brackets ever be balanced?",
      "If n is even, let k = n / 2 be the number of pairs of parentheses. The number of valid bracket sequences with k pairs is given by the Catalan number C_k.",
      "The formula for the k-th Catalan number is C_k = binom(2k, k) / (k + 1) = (2k)! / (k! * (k + 1)!). Compute this modulo 10^9 + 7 using factorials and modular inverse."
    ],
    solution: {
      idea: [
        "If n is odd, return 0 immediately because a valid bracket sequence must have an equal number of '(' and ')'.",
        "If n is even, let k = n / 2. The number of valid sequences is the k-th Catalan number C_k = (2k)! / (k! * (k + 1)!).",
        "Precompute factorials up to 2k, compute the denominator (k! * (k + 1)!) % MOD, invert using Fermat's Little Theorem, and multiply by (2k)!."
      ],
      complexity: "O(n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    long long power(long long base, long long exp, long long mod) {
        long long res = 1;
        base %= mod;
        while (exp > 0) {
            if (exp & 1) res = (res * base) % mod;
            base = (base * base) % mod;
            exp >>= 1;
        }
        return res;
    }
public:
    int bracketSequencesI(int n) {
        if (n % 2 != 0) return 0;
        int k = n / 2;
        if (k == 0) return 1;
        const long long MOD = 1000000007;
        vector<long long> fact(2 * k + 1, 1);
        for (int i = 2; i <= 2 * k; i++) {
            fact[i] = (fact[i - 1] * i) % MOD;
        }
        long long denom = (fact[k] * fact[k]) % MOD;
        denom = (denom * (k + 1)) % MOD;
        long long ans = fact[2 * k] * power(denom, MOD - 2, MOD) % MOD;
        return (int)ans;
    }
};
`
    }
  },
  {
    id: "cses-counting-necklaces",
    source: "cses",
    title: "Counting Necklaces",
    url: "https://cses.fi/problemset/task/2209",
    statement: [
      "Count the number of different necklaces that can be made using n pearls, where each pearl can have one of m colors.",
      "Two necklaces are considered equivalent if one can be rotated to obtain the other (rotational symmetry only).",
      "Since the answer can be very large, return it modulo 10^9 + 7."
    ],
    constraints: [
      "1 <= n, m <= 1000000"
    ],
    fn: {
      name: "countingNecklaces",
      params: [{ name: "n", type: "int" }, { name: "m", type: "int" }],
      returns: "int"
    },
    examples: [
      {
        input: [4, 3],
        output: 24,
        explanation: "There are 24 distinct rotational equivalence classes of necklaces with 4 pearls in 3 colors."
      },
      {
        input: [1, 5],
        output: 5,
        explanation: "With 1 pearl and 5 colors, there are 5 necklaces."
      }
    ],
    tests: [
      { input: [2, 2], output: 3 },
      { input: [3, 2], output: 4 },
      { input: [6, 2], output: 14 },
      { input: [5, 3], output: 51 },
      { input: [10, 2], output: 108 },
      { input: [100, 2], output: 139466407 },
      { input: [1000, 1000], output: 376317251 }
    ],
    hints: [
      "Use Burnside's Lemma. The number of orbits under the cyclic group C_n is (1 / n) * sum_{k=0}^{n-1} |Fix(r^k)|.",
      "A rotation by k positions has gcd(k, n) cycles. For a configuration to remain invariant, all pearls in the same cycle must have the same color. Thus |Fix(r^k)| = m^{gcd(k, n)}.",
      "Summing over all divisors d of n, the formula simplifies to (1 / n) * sum_{d | n} phi(n / d) * m^d mod 10^9 + 7."
    ],
    solution: {
      idea: [
        "By Burnside's Lemma, the number of distinct rotational necklaces is (1 / n) * sum_{k=0}^{n-1} m^{gcd(k, n)} mod (10^9 + 7).",
        "Grouping terms by divisor d = gcd(k, n), we have (1 / n) * sum_{d | n} phi(n / d) * m^d mod MOD.",
        "We iterate over all divisors d of n in O(sqrt(n)) time, compute Euler's totient function phi(n / d) in O(sqrt(n / d)) time, sum the contributions, and multiply by n^(MOD - 2) mod MOD."
      ],
      complexity: "O(sqrt(n)) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    long long power(long long base, long long exp, long long mod) {
        long long res = 1;
        base %= mod;
        while (exp > 0) {
            if (exp & 1) res = (res * base) % mod;
            base = (base * base) % mod;
            exp >>= 1;
        }
        return res;
    }
    long long getPhi(long long x) {
        long long result = x;
        for (long long p = 2; p * p <= x; p++) {
            if (x % p == 0) {
                while (x % p == 0) x /= p;
                result -= result / p;
            }
        }
        if (x > 1) result -= result / x;
        return result;
    }
public:
    int countingNecklaces(int n, int m) {
        const long long MOD = 1000000007;
        long long sum = 0;
        for (int d = 1; (long long)d * d <= n; d++) {
            if (n % d == 0) {
                long long phi1 = getPhi(n / d) % MOD;
                long long term1 = (phi1 * power(m, d, MOD)) % MOD;
                sum = (sum + term1) % MOD;
                if (d * d != n) {
                    int d2 = n / d;
                    long long phi2 = getPhi(n / d2) % MOD;
                    long long term2 = (phi2 * power(m, d2, MOD)) % MOD;
                    sum = (sum + term2) % MOD;
                }
            }
        }
        long long ans = (sum * power(n, MOD - 2, MOD)) % MOD;
        return (int)ans;
    }
};
`
    }
  },
  {
    id: "cses-nim-game-i",
    source: "cses",
    title: "Nim Game I",
    url: "https://cses.fi/problemset/task/1730",
    statement: [
      "There are n heaps of sticks. Two players move alternately.",
      "In each turn, a player chooses one non-empty heap and removes any positive number of sticks from it.",
      "The player who removes the last stick wins the game (normal play convention).",
      "Assuming both players play optimally, determine whether the first or second player wins. Return 'first' if the first player wins, and 'second' otherwise."
    ],
    constraints: [
      "1 <= heaps.length <= 200000",
      "1 <= heaps[i] <= 1000000000"
    ],
    fn: {
      name: "nimGameI",
      params: [{ name: "heaps", type: "int[]" }],
      returns: "string"
    },
    examples: [
      {
        input: [[1, 2, 3]],
        output: "second",
        explanation: "1 XOR 2 XOR 3 = 0, which is a losing position (P-position) for the first player. The second player can mirror any move to secure a win."
      },
      {
        input: [[1, 2, 4]],
        output: "first",
        explanation: "1 XOR 2 XOR 4 = 7 != 0, so the first player can transition to a losing state and win."
      },
      {
        input: [[5]],
        output: "first",
        explanation: "The first player takes all 5 sticks from the single heap and wins on the first move."
      }
    ],
    tests: [
      { input: [[1, 1]], output: "second" },
      { input: [[1, 1, 1]], output: "first" },
      { input: [[3, 5, 6]], output: "second" },
      { input: [[2, 5, 7]], output: "second" },
      { input: [[10, 20, 30]], output: "second" },
      { input: [[100, 100, 50, 50]], output: "second" },
      { input: [[1000000000, 1000000000, 1]], output: "first" }
    ],
    hints: [
      "This is the standard game of Nim under normal play convention.",
      "By the Bouton theorem, a Nim position is losing (a P-position) if and only if the XOR sum (Nim-sum) of all heap sizes is 0.",
      "If the XOR sum is non-zero, the first player can always make a move that leaves an XOR sum of 0, forcing a win."
    ],
    solution: {
      idea: [
        "Compute the XOR sum (Nim-sum) of all heap sizes: S = heaps[0] ^ heaps[1] ^ ... ^ heaps[n-1].",
        "If S == 0, the starting state is a P-position (losing state for the mover), so the second player wins.",
        "If S != 0, the starting state is an N-position (winning state), so the first player wins."
      ],
      complexity: "O(n) time, O(1) space where n is heaps.length.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string nimGameI(vector<int>& heaps) {
        int xorSum = 0;
        for (int x : heaps) {
            xorSum ^= x;
        }
        return (xorSum != 0) ? "first" : "second";
    }
};
`
    }
  }
];
