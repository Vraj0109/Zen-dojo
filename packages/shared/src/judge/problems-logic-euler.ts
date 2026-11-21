import type { ProblemSpec } from "./types";

// Logic building: Project Euler problems, written in our own words as functions (see projecteuler.net, linked on each problem). The expected outputs of every test were produced by running the C++ reference solution.

export const LOGIC_SPECS_EULER: ProblemSpec[] = [
  {
    id: "c-euler-1",
    source: "euler",
    url: "https://projecteuler.net/problem=1",
    title: "Multiples of Two Numbers",
    statement: [
      "Add up all the positive whole numbers below limit that are divisible by a or by b (numbers divisible by both are added once).",
      "The original Project Euler task fixes a = 3, b = 5 and a small limit. Here all three are inputs, and limit can be so large that looping over every number is too slow. Count with a formula instead.",
    ],
    constraints: ["1 <= limit <= 100000000", "1 <= a, b <= 1000000"],
    fn: {"name":"sumOfMultiples","params":[{"name":"limit","type":"int"},{"name":"a","type":"int"},{"name":"b","type":"int"}],"returns":"long"},
    examples: [
      { input: [10,3,5], output: 23, explanation: "3, 5, 6 and 9 are below 10 and divisible by 3 or 5: 3 + 5 + 6 + 9 = 23." },
      { input: [20,3,5], output: 78, explanation: "The numbers are 3, 5, 6, 9, 10, 12, 15 and 18." },
    ],
    tests: [
      { input: [1,3,5], output: 0 },
      { input: [4,3,5], output: 3 },
      { input: [100,7,7], output: 735 },
      { input: [50,1,2], output: 1225 },
      { input: [1000,6,10], output: 115836 },
      { input: [99999999,2,3], output: 3333333216666668 },
      { input: [100000000,3,5], output: 2333333316666668 },
      { input: [1000,1000000,999999], output: 0 },
    ],
    hints: [
      "Adding every multiple one by one is slow when the limit is large. Is there a formula for the sum of the multiples of a number?",
      "The multiples of d below the limit can be summed with a formula for the first m whole numbers, scaled by d.",
      "Add the sums for a and for b, then subtract the sum for their least common multiple, because numbers divisible by both were counted twice.",
      "Find m as the largest multiple count below the limit, and use 64-bit numbers for the products.",
    ],
    solution: {
      idea: [
        "Let f(d) be the sum of the multiples of d below limit: with m = (limit - 1) / d it is d * m * (m + 1) / 2.",
        "The answer is f(a) + f(b) - f(lcm(a, b)). When a and b are equal, the lcm is a too, so the result is just f(a).",
      ],
      complexity: "O(log(min(a, b))) time for the gcd, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    long long f(long long limit, long long d) {
        long long m = (limit - 1) / d;
        return d * m * (m + 1) / 2;
    }
public:
    long long sumOfMultiples(int limit, int a, int b) {
        long long l = (long long)a / __gcd(a, b) * b;
        return f(limit, a) + f(limit, b) - f(limit, l);
    }
};
`,
    },
  },
  {
    id: "c-euler-2",
    source: "euler",
    url: "https://projecteuler.net/problem=2",
    title: "Even Fibonacci Numbers",
    statement: [
      "Take the Fibonacci numbers 1, 2, 3, 5, 8, 13, ... (each is the sum of the two before it, starting from 1 and 2). Add up the even ones that do not exceed limit.",
      "limit can be as large as 4 * 10^15, so the answer is a 64-bit number. There are fewer than 80 Fibonacci numbers in that range, so generating them one by one is fast.",
    ],
    constraints: ["1 <= limit <= 4000000000000000"],
    fn: {"name":"evenFibonacciSum","params":[{"name":"limit","type":"long"}],"returns":"long"},
    examples: [
      { input: [100], output: 44, explanation: "The even Fibonacci numbers up to 100 are 2, 8 and 34." },
      { input: [10], output: 10 },
    ],
    tests: [
      { input: [1], output: 0 },
      { input: [2], output: 2 },
      { input: [7], output: 2 },
      { input: [8], output: 10 },
      { input: [4000000], output: 4613732 },
      { input: [3999999999999999], output: 2763969850442378 },
      { input: [4000000000000000], output: 2763969850442378 },
    ],
    hints: [
      "You need the even Fibonacci numbers below a bound. How fast does the sequence grow, and how many terms can there be?",
      "Look at the parity pattern of the sequence. Do the even terms follow a regular rule that lets you skip the odd ones?",
      "Generate terms with two running values and add the even ones up to the limit. Every third term is even, so the work is small.",
      "The next term can exceed the limit before you stop, so use 64-bit values.",
    ],
    solution: {
      idea: [
        "Walk through the Fibonacci numbers in order with two variables and add the even ones that are at most limit.",
        "Every third Fibonacci number is even, so the loop could also step by three, but checking parity is just as fast for this size.",
      ],
      complexity: "O(log limit) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    long long evenFibonacciSum(long long limit) {
        long long a = 1, b = 2, total = 0;
        while (a <= limit) {
            if (a % 2 == 0) total += a;
            long long c = a + b;
            a = b;
            b = c;
        }
        return total;
    }
};
`,
    },
  },
  {
    id: "c-euler-3",
    source: "euler",
    url: "https://projecteuler.net/problem=3",
    title: "Largest Prime Factor",
    statement: [
      "Return the largest prime number that divides n evenly. If n itself is prime, that prime is n.",
      "n can be as large as 10^14, so you cannot test every number up to n, and you cannot sieve that range. Divide out each factor as you find it.",
    ],
    constraints: ["2 <= n <= 100000000000000"],
    fn: {"name":"largestPrimeFactor","params":[{"name":"n","type":"long"}],"returns":"long"},
    examples: [
      { input: [13195], output: 29, explanation: "13195 = 5 * 7 * 13 * 29." },
      { input: [12], output: 3 },
    ],
    tests: [
      { input: [2], output: 2 },
      { input: [3], output: 3 },
      { input: [4], output: 2 },
      { input: [97], output: 97 },
      { input: [1024], output: 2 },
      { input: [600851], output: 20719 },
      { input: [99999999999973], output: 99999999999973 },
      { input: [99999980000001], output: 4649 },
      { input: [70000000000000], output: 7 },
    ],
    hints: [
      "The number is too big to sieve and too big to test every divisor. Do you need all the factors, or only the small ones?",
      "If you remove each small factor as soon as you find it, could a divisor you find later be composite?",
      "Divide n by d as long as d divides it, moving d upward. Stop when d times d exceeds what is left; the leftover is a prime.",
      "Track the last factor you removed, and remember that the leftover itself can be the largest prime.",
    ],
    solution: {
      idea: [
        "Trial division: for d = 2, 3, ..., while d * d <= n, remove all factors d from n and remember d as the latest factor.",
        "When the loop ends, a remaining n > 1 is a prime larger than every factor found so far, so it is the answer; otherwise the last d that divided n is.",
      ],
      complexity: "O(sqrt n) time (about 10^7 steps), O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    long long largestPrimeFactor(long long n) {
        long long best = 1;
        for (long long d = 2; d * d <= n; d++) {
            while (n % d == 0) {
                best = d;
                n /= d;
            }
        }
        return n > 1 ? n : best;
    }
};
`,
    },
  },
  {
    id: "c-euler-5",
    source: "euler",
    url: "https://projecteuler.net/problem=5",
    title: "Smallest Common Multiple",
    statement: [
      "Return the smallest positive number that every whole number from 1 to n divides evenly.",
      "For n = 40 the answer is already around 5 * 10^15, so use 64-bit integers. Build the answer step by step with the least common multiple instead of testing candidates one by one.",
    ],
    constraints: ["1 <= n <= 40"],
    fn: {"name":"smallestMultiple","params":[{"name":"n","type":"int"}],"returns":"long"},
    examples: [
      { input: [10], output: 2520, explanation: "2520 is divisible by every number from 1 to 10, and no smaller positive number is." },
      { input: [4], output: 12 },
    ],
    tests: [
      { input: [1], output: 1 },
      { input: [2], output: 2 },
      { input: [3], output: 6 },
      { input: [7], output: 420 },
      { input: [20], output: 232792560 },
      { input: [32], output: 144403552893600 },
      { input: [40], output: 5342931457063200 },
    ],
    hints: [
      "A number divisible by every value from 1 to n must cover the requirements of each value together. Could you combine the numbers one at a time?",
      "Two divisibility requirements combine into the least common multiple of the two numbers. How could you fold that over 1 to n?",
      "Start at 1 and replace the running value with its least common multiple with the next number, using the greatest common divisor for each step.",
      "Divide first and multiply second when computing the least common multiple, to avoid overflow in the intermediate product.",
    ],
    solution: {
      idea: [
        "Start with result = 1 and for i = 1..n replace result by lcm(result, i) = result / gcd(result, i) * i.",
        "Another way: for every prime p <= n, multiply the result by the largest power of p that is at most n.",
      ],
      complexity: "O(n log n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    long long smallestMultiple(int n) {
        long long result = 1;
        for (int i = 2; i <= n; i++) result = result / __gcd(result, (long long)i) * i;
        return result;
    }
};
`,
    },
  },
  {
    id: "c-euler-6",
    source: "euler",
    url: "https://projecteuler.net/problem=6",
    title: "Sum Square Difference",
    statement: [
      "For the numbers 1 to n, compute (the square of their sum) minus (the sum of their squares).",
      "For n = 10 the sum is 55, its square is 3025, the squares add up to 385, and the answer is 3025 - 385 = 2640. n can be as large as 10000, where the square of the sum is about 2.5 * 10^15: use 64-bit integers.",
    ],
    constraints: ["1 <= n <= 10000"],
    fn: {"name":"sumSquareDifference","params":[{"name":"n","type":"int"}],"returns":"long"},
    examples: [
      { input: [10], output: 2640 },
      { input: [3], output: 22, explanation: "(1 + 2 + 3)^2 = 36 and 1 + 4 + 9 = 14, so 36 - 14 = 22." },
    ],
    tests: [
      { input: [1], output: 0 },
      { input: [2], output: 4 },
      { input: [5], output: 170 },
      { input: [100], output: 25164150 },
      { input: [1000], output: 250166416500 },
      { input: [10000], output: 2500166641665000 },
    ],
    hints: [
      "Is there a shortcut for adding up consecutive whole numbers and their squares, instead of adding them one by one?",
      "There are known closed forms for the sum of the first n whole numbers and for the sum of their squares.",
      "Square the sum of 1 to n and subtract the sum of the squares, both from closed forms, using 64-bit integers.",
      "Check that intermediate products fit in 64 bits before dividing, such as n times n plus 1 times 2n plus 1.",
    ],
    solution: {
      idea: [
        "With s = n(n + 1) / 2 and q = n(n + 1)(2n + 1) / 6, the answer is s * s - q.",
        "A simple loop with two accumulators gives the same result in O(n); the formulas make it O(1).",
      ],
      complexity: "O(1) time and space with the formulas.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    long long sumSquareDifference(int n) {
        long long s = (long long)n * (n + 1) / 2;
        long long q = (long long)n * (n + 1) * (2LL * n + 1) / 6;
        return s * s - q;
    }
};
`,
    },
  },
  {
    id: "c-euler-7",
    source: "euler",
    url: "https://projecteuler.net/problem=7",
    title: "The n-th Prime",
    statement: [
      "Return the n-th prime number, counting from the first prime, 2. The first six primes are 2, 3, 5, 7, 11 and 13, so for n = 6 the answer is 13.",
      "n can be as large as one million. Testing each number for primality one at a time is too slow; use a sieve (a table that crosses out multiples) up to a limit that is sure to contain the n-th prime.",
    ],
    constraints: ["1 <= n <= 1000000"],
    fn: {"name":"nthPrime","params":[{"name":"n","type":"int"}],"returns":"int"},
    examples: [
      { input: [6], output: 13 },
      { input: [1], output: 2 },
    ],
    tests: [
      { input: [2], output: 3 },
      { input: [10], output: 29 },
      { input: [100], output: 541 },
      { input: [5000], output: 48611 },
      { input: [78498], output: 999983 },
      { input: [1000000], output: 15485863 },
    ],
    hints: [
      "Testing each number for primality one at a time is slow. Can you find all primes up to some bound in one pass?",
      "You need a safe upper bound that is sure to contain the n-th prime. How do primes thin out as numbers grow?",
      "Use a sieve of Eratosthenes up to a bound such as n times (ln n + ln ln n) plus a margin, then count the primes in order.",
      "Use a fixed bound for small n, and stop as soon as the count reaches n.",
    ],
    solution: {
      idea: [
        "Pick a limit that is at least the n-th prime (n * (ln n + ln ln n) for n >= 6, or a fixed 20 for small n), run the sieve of Eratosthenes, and walk through the table counting primes until you reach the n-th.",
      ],
      complexity: "O(L log log L) time and O(L) space, where L is about n ln n.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int nthPrime(int n) {
        int limit = 100;
        if (n >= 6) limit = (int)(n * (log((double)n) + log(log((double)n)))) + 10;
        vector<char> composite(limit + 1, 0);
        int count = 0;
        for (int i = 2; i <= limit; i++) {
            if (composite[i]) continue;
            if (++count == n) return i;
            for (long long j = (long long)i * i; j <= limit; j += i) composite[j] = 1;
        }
        return -1;
    }
};
`,
    },
  },
  {
    id: "c-euler-8",
    source: "euler",
    url: "https://projecteuler.net/problem=8",
    title: "Largest Product in a Series",
    statement: [
      "digits is a long string of decimal digits. Look at every block of k digits that sit next to each other. Multiply the digits of each block and return the largest product.",
      "A block that contains a 0 has product 0. The string can have up to 1000 digits and k up to 13, so the product can reach 9^13, which needs 64-bit integers.",
    ],
    constraints: ["1 <= k <= digits.length <= 1000", "k <= 13", "digits contains only the characters 0 to 9"],
    fn: {"name":"largestProduct","params":[{"name":"digits","type":"string"},{"name":"k","type":"int"}],"returns":"long"},
    examples: [
      { input: ["123456789",3], output: 504, explanation: "The last block 7, 8, 9 has the largest product, 7 * 8 * 9 = 504." },
      { input: ["12345",2], output: 20, explanation: "The blocks are 12, 23, 34 and 45 with products 2, 6, 12 and 20." },
    ],
    tests: [
      { input: ["0",1], output: 0 },
      { input: ["9",1], output: 9 },
      { input: ["1000000",2], output: 0 },
      { input: ["99999999999999",13], output: 2541865828329 },
      { input: ["9090909090909",2], output: 0 },
      { input: ["1112223334445556667778889990",5], output: 46656 },
      { input: ["31415926535897932384626433832795028841971693993751",7], output: 340200 },
    ],
    hints: [
      "Each block of k adjacent digits needs its own product. Is recomputing every product too slow at this size?",
      "The string has at most 1000 digits and k at most 13, so the total work is small. Do you need a clever trick at all?",
      "Compute each window's product directly and keep the maximum seen. Zeros make sliding with division unreliable, so direct computation is simplest.",
      "Convert each character to its digit value by subtracting the zero character, and use 64-bit integers for the product.",
    ],
    solution: {
      idea: [
        "For each start position i from 0 to n - k multiply digits[i..i + k - 1] and keep the maximum. The cost is O(n * k), at most 13000 multiplications.",
      ],
      complexity: "O(n * k) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    long long largestProduct(string digits, int k) {
        long long best = 0;
        for (int i = 0; i + k <= (int)digits.size(); i++) {
            long long p = 1;
            for (int j = i; j < i + k; j++) p *= digits[j] - '0';
            best = max(best, p);
        }
        return best;
    }
};
`,
    },
  },
  {
    id: "c-euler-9",
    source: "euler",
    url: "https://projecteuler.net/problem=9",
    title: "Pythagorean Triplet by Perimeter",
    statement: [
      "A Pythagorean triplet is a set of positive whole numbers a < b < c with a^2 + b^2 = c^2. Given the perimeter p = a + b + c, find all such triplets and return the largest product a * b * c among them, or -1 if there is no triplet with that perimeter.",
      "p can be up to 30000. Trying every pair (a, b) works for small p but is too slow for the largest ones; solve for b once a is fixed.",
    ],
    constraints: ["1 <= p <= 30000"],
    fn: {"name":"tripletProduct","params":[{"name":"p","type":"int"}],"returns":"long"},
    examples: [
      { input: [12], output: 60, explanation: "3 + 4 + 5 = 12 and 3 * 4 * 5 = 60." },
      { input: [30], output: 780, explanation: "5, 12 and 13 add up to 30." },
    ],
    tests: [
      { input: [1], output: -1 },
      { input: [11], output: -1 },
      { input: [24], output: 480 },
      { input: [60], output: 7500 },
      { input: [90], output: 21060 },
      { input: [840], output: 21047040 },
      { input: [30000], output: 937500000000 },
      { input: [29999], output: -1 },
    ],
    hints: [
      "Trying every pair a and b is slow for a large perimeter. Could you reduce the problem to a single unknown?",
      "Substitute c as the perimeter minus a minus b into a squared plus b squared equals c squared. What does the equation become in terms of a, b and the perimeter?",
      "Solve that relation for b in terms of a and the perimeter, then only try values of a up to a third of the perimeter.",
      "Check that the division is exact and that a < b < c, and use 64-bit numbers for the products. Return -1 if no triplet exists.",
    ],
    solution: {
      idea: [
        "For each a in 1..p/3, compute the numerator p * (p - 2a) and the denominator 2 * (p - a). When the division is exact, b is that quotient and c = p - a - b.",
        "Keep triplets with a < b < c (a equal to b can happen only with an irrational c) and return the maximum of a * b * c, or -1.",
      ],
      complexity: "O(p) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    long long tripletProduct(int p) {
        long long best = -1;
        for (long long a = 1; a <= p / 3; a++) {
            long long num = (long long)p * (p - 2 * a), den = 2 * (p - a);
            if (num % den) continue;
            long long b = num / den, c = p - a - b;
            if (a < b && b < c && a * a + b * b == c * c) best = max(best, a * b * c);
        }
        return best;
    }
};
`,
    },
  },
  {
    id: "c-euler-10",
    source: "euler",
    url: "https://projecteuler.net/problem=10",
    title: "Summation of Primes",
    statement: [
      "Return the sum of all prime numbers that are below limit.",
      "limit can be 20 million, so the sum is far beyond 32 bits, and checking every number one by one with trial division is too slow. A sieve finds all the primes in one pass.",
    ],
    constraints: ["1 <= limit <= 20000000"],
    fn: {"name":"sumOfPrimes","params":[{"name":"limit","type":"int"}],"returns":"long"},
    examples: [
      { input: [10], output: 17, explanation: "The primes below 10 are 2, 3, 5 and 7." },
      { input: [3], output: 2 },
    ],
    tests: [
      { input: [1], output: 0 },
      { input: [2], output: 0 },
      { input: [20], output: 77 },
      { input: [100], output: 1060 },
      { input: [100000], output: 454396537 },
      { input: [20000000], output: 12272577818052 },
    ],
    hints: [
      "Testing each number for primality is slow when the limit is 20 million. What structure finds all primes at once?",
      "When you cross off multiples of a prime, which multiples are new? Do you need to start crossing out earlier than the square?",
      "Use a sieve of Eratosthenes: for each prime, start crossing out at its square. Add each unmarked number to a 64-bit total as you go.",
      "Return 0 when the limit is 2 or less, and remember that the sum is far beyond 32 bits.",
    ],
    solution: {
      idea: [
        "Run the sieve of Eratosthenes up to limit - 1 and sum the indexes left unmarked. The sum of primes below 2 * 10^7 is about 1.2 * 10^13, so it needs a 64-bit integer.",
      ],
      complexity: "O(limit log log limit) time, O(limit) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    long long sumOfPrimes(int limit) {
        vector<char> composite(limit + 1, 0);
        long long total = 0;
        for (long long i = 2; i < limit; i++) {
            if (composite[i]) continue;
            total += i;
            for (long long j = i * i; j < limit; j += i) composite[j] = 1;
        }
        return total;
    }
};
`,
    },
  },
  {
    id: "c-euler-12",
    source: "euler",
    url: "https://projecteuler.net/problem=12",
    title: "Triangle Number With Many Divisors",
    statement: [
      "The triangle numbers are 1, 3, 6, 10, 15, ... where the k-th one is 1 + 2 + ... + k. Return the first triangle number that has more than minDivisors divisors.",
      "For minDivisors = 5 the answer is 28 (its divisors are 1, 2, 4, 7, 14 and 28). Counting divisors of each triangle number by trial division gets slow for large inputs, so factor the numbers cleverly.",
    ],
    constraints: ["1 <= minDivisors <= 500"],
    fn: {"name":"firstTriangleWithDivisors","params":[{"name":"minDivisors","type":"int"}],"returns":"long"},
    examples: [
      { input: [5], output: 28 },
      { input: [1], output: 3, explanation: "1 has one divisor and 3 has two, so 3 is the first with more than one." },
    ],
    tests: [
      { input: [2], output: 6 },
      { input: [4], output: 28 },
      { input: [10], output: 120 },
      { input: [100], output: 73920 },
      { input: [200], output: 2031120 },
      { input: [499], output: 76576500 },
    ],
    hints: [
      "Counting divisors of huge triangle numbers by brute force is slow. What does the number of divisors depend on?",
      "The number of divisors depends on the prime factorisation: add one to each prime's exponent and multiply those results together.",
      "Since k and k+1 share no factor, their divisor counts multiply. Halve the even one first, then count each part's divisors by trial division.",
      "Stop at the first triangle number whose divisor count is more than the minimum asked for.",
    ],
    solution: {
      idea: [
        "Loop k = 1, 2, 3, ... Split k(k + 1) / 2 into two coprime parts (the even one of k and k + 1 is halved) and multiply their divisor counts, each found by trial division up to its square root.",
        "Stop at the first k where the product exceeds minDivisors and return k(k + 1) / 2.",
      ],
      complexity: "About O(k * sqrt k) time where k is a few thousand for the largest input, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    int divisors(long long x) {
        int count = 1;
        for (long long p = 2; p * p <= x; p++) {
            int e = 0;
            while (x % p == 0) { x /= p; e++; }
            count *= e + 1;
        }
        if (x > 1) count *= 2;
        return count;
    }
public:
    long long firstTriangleWithDivisors(int minDivisors) {
        for (long long k = 1;; k++) {
            long long a = k, b = k + 1;
            if (a % 2 == 0) a /= 2; else b /= 2;
            if (divisors(a) * divisors(b) > minDivisors) return k * (k + 1) / 2;
        }
    }
};
`,
    },
  },
  {
    id: "c-euler-14",
    source: "euler",
    url: "https://projecteuler.net/problem=14",
    title: "Longest Collatz Chain",
    statement: [
      "Take a positive number n. If it is even, replace it by n / 2; if it is odd, replace it by 3n + 1. Repeat until you reach 1. The number of terms in this chain, counting the start and the final 1, is the chain length (for 13: 13, 40, 20, 10, 5, 16, 8, 4, 2, 1 has 10 terms).",
      "Among the starting numbers below limit, return the one with the longest chain. If several have the same longest length, return the smallest of them. Values inside a chain can get larger than 32 bits, and long inputs punish code that recomputes chains from scratch.",
    ],
    constraints: ["2 <= limit <= 3000000"],
    fn: {"name":"longestCollatzStart","params":[{"name":"limit","type":"int"}],"returns":"int"},
    examples: [
      { input: [10], output: 9, explanation: "The chain of 9 has 20 terms, longer than all of 1 to 8." },
      { input: [3], output: 2 },
    ],
    tests: [
      { input: [2], output: 1 },
      { input: [7], output: 6 },
      { input: [30], output: 27 },
      { input: [1000], output: 871 },
      { input: [100000], output: 77031 },
      { input: [3000000], output: 2298025 },
    ],
    hints: [
      "Walking each chain from scratch repeats work, because chains run into each other. Which numbers have you already worked out?",
      "Once a walk drops below its starting number, the rest of its length is already known from an earlier start.",
      "Keep a table of chain lengths for numbers below the limit. Walk until the value falls below the start, then add the stored length.",
      "Use 64-bit values while walking, since 3n+1 can exceed 32 bits. Replace the best start only on a strictly longer chain, so the smallest start wins ties.",
    ],
    solution: {
      idea: [
        "Memoise: len[1] = 1. For start s from 2 to limit - 1 walk x = s using collatz steps until x < s, counting steps; then len[s] = steps + len[x].",
        "Return the smallest s with the maximum len[s].",
      ],
      complexity: "O(limit * average walk) time, O(limit) space; fast in practice.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int longestCollatzStart(int limit) {
        vector<int> len(limit, 0);
        len[1] = 1;
        int best = 1;
        for (int s = 2; s < limit; s++) {
            long long x = s;
            int steps = 0;
            while (x >= s) {
                x = (x % 2 == 0) ? x / 2 : 3 * x + 1;
                steps++;
            }
            len[s] = steps + len[x];
            if (len[s] > len[best]) best = s;
        }
        return best;
    }
};
`,
    },
  },
  {
    id: "c-euler-15",
    source: "euler",
    url: "https://projecteuler.net/problem=15",
    title: "Lattice Paths in a Rectangle",
    statement: [
      "A grid has h rows and w columns of squares, so (h + 1) by (w + 1) corner points. Starting at the top left corner and moving only right or down along the lines, count the ways to reach the bottom right corner.",
      "The count gets huge, so return it modulo 1000000007. With h = w = 2 there are 6 ways. h and w can be 100000, which rules out filling a table of that size: use binomial coefficients.",
    ],
    constraints: ["0 <= h, w <= 100000"],
    fn: {"name":"latticePaths","params":[{"name":"h","type":"int"},{"name":"w","type":"int"}],"returns":"int"},
    examples: [
      { input: [2,2], output: 6 },
      { input: [1,3], output: 4, explanation: "Every path has 4 moves, one of which is down: 4 choices for when to go down." },
    ],
    tests: [
      { input: [0,0], output: 1 },
      { input: [0,100000], output: 1 },
      { input: [1,1], output: 2 },
      { input: [3,3], output: 20 },
      { input: [20,20], output: 846527861 },
      { input: [100000,100000], output: 879467333 },
      { input: [99999,100000], output: 939733670 },
    ],
    hints: [
      "Think of a path as a sequence of moves. What do all valid paths have in common, whatever their shape?",
      "Every path uses exactly h down moves and w right moves. A path is decided by which of its moves are down.",
      "The count is the number of ways to choose h positions among h + w moves, a binomial coefficient. Compute it modulo the prime with factorials and inverses.",
      "Get the modular inverse with fast power, using the prime minus 2 as the exponent, and precompute factorials up to h + w.",
    ],
    solution: {
      idea: [
        "Precompute fact[i] mod p up to h + w (at most 200000). Then C(h + w, h) = fact[h + w] * inv(fact[h]) * inv(fact[w]) mod p, with inverses by Fermat's little theorem.",
      ],
      complexity: "O(h + w + log p) time, O(h + w) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    const long long MOD = 1000000007;
    long long power(long long b, long long e) {
        long long r = 1;
        b %= MOD;
        while (e) { if (e & 1) r = r * b % MOD; b = b * b % MOD; e >>= 1; }
        return r;
    }
public:
    int latticePaths(int h, int w) {
        int n = h + w;
        vector<long long> fact(n + 1, 1);
        for (int i = 1; i <= n; i++) fact[i] = fact[i - 1] * i % MOD;
        return (int)(fact[n] * power(fact[h], MOD - 2) % MOD * power(fact[w], MOD - 2) % MOD);
    }
};
`,
    },
  },
  {
    id: "c-euler-16",
    source: "euler",
    url: "https://projecteuler.net/problem=16",
    title: "Digit Sum of a Power of Two",
    statement: [
      "Return the sum of the decimal digits of 2 raised to the power exponent. For exponent 15 the number is 32768 and the answer is 3 + 2 + 7 + 6 + 8 = 26.",
      "The number has no fixed-size type that can hold it when the exponent is large (2^50000 has more than 15000 digits), so you must store it yourself, for example as an array of digits, and double it exponent times.",
    ],
    constraints: ["0 <= exponent <= 50000"],
    fn: {"name":"powerDigitSum","params":[{"name":"exponent","type":"int"}],"returns":"int"},
    examples: [
      { input: [15], output: 26 },
      { input: [10], output: 7, explanation: "2^10 = 1024 and 1 + 0 + 2 + 4 = 7." },
    ],
    tests: [
      { input: [0], output: 1 },
      { input: [1], output: 2 },
      { input: [4], output: 7 },
      { input: [100], output: 115 },
      { input: [1000], output: 1366 },
      { input: [50000], output: 67585 },
    ],
    hints: [
      "2 to the power 50000 is far too big for any built-in integer. How could you store and double a number this large yourself?",
      "A large number can be kept as an array of parts. Doubling each part and passing a carry along gives the doubled number.",
      "Store the number in base one billion, doubling each part with a carry, then add up the decimal digits of every part at the end.",
      "Doubling about 50000 times over a few thousand parts is fast. Check small cases such as 2 to the power 15, which is 32768, to test your code.",
    ],
    solution: {
      idea: [
        "Hold the number as a vector of base 10^9 limbs, least significant first, starting with [1]. Double it exponent times with carry (each cell times 2 plus carry, keep the part below 10^9).",
        "At the end sum the decimal digits of every limb.",
      ],
      complexity: "O(exponent * exponent / 30) time, a few hundred million simple steps at worst but typically well under a second; O(exponent) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int powerDigitSum(int exponent) {
        const long long BASE = 1000000000;
        vector<long long> limbs = {1};
        for (int step = 0; step < exponent; step++) {
            long long carry = 0;
            for (auto& x : limbs) {
                long long v = x * 2 + carry;
                x = v % BASE;
                carry = v / BASE;
            }
            if (carry) limbs.push_back(carry);
        }
        int sum = 0;
        for (long long x : limbs)
            while (x) { sum += x % 10; x /= 10; }
        return sum;
    }
};
`,
    },
  },
  {
    id: "c-euler-24",
    source: "euler",
    url: "https://projecteuler.net/problem=24",
    title: "k-th Lexicographic Permutation",
    statement: [
      "Write all arrangements of the digits 0, 1, ..., n - 1 as strings and sort them in dictionary order. Return the k-th string, counting from 1.",
      "For n = 3 the order is 012, 021, 102, 120, 201, 210, so k = 4 gives 120. The list has n! entries, so you cannot generate it all for larger n; build the answer one digit at a time.",
    ],
    constraints: ["1 <= n <= 10", "1 <= k <= n!"],
    fn: {"name":"kthPermutation","params":[{"name":"n","type":"int"},{"name":"k","type":"int"}],"returns":"string"},
    examples: [
      { input: [3,4], output: "120" },
      { input: [4,1], output: "0123" },
    ],
    tests: [
      { input: [1,1], output: "0" },
      { input: [2,2], output: "10" },
      { input: [3,6], output: "210" },
      { input: [5,100], output: "40231" },
      { input: [8,12345], output: "24073516" },
      { input: [10,3628800], output: "9876543210" },
      { input: [10,1000000], output: "2783915460" },
    ],
    hints: [
      "Listing all arrangements and sorting them is too much work when n is large. How many arrangements start with each digit?",
      "Each choice of first digit leaves a block of arrangements of equal size. Which block does the k-th one fall in, and what remains inside it?",
      "Use factorials to pick each digit in turn: the block size is the factorial of the remaining positions, found by integer division. Then drop the used digit.",
      "Make k zero-based first by subtracting one, and remove each chosen digit from the available list so it cannot repeat.",
    ],
    solution: {
      idea: [
        "Keep a sorted list of unused digits and the zero-based rank k - 1. For position i, let f = (n - 1 - i)!. Take the digit at index k / f from the list, remove it, and set k = k % f.",
      ],
      complexity: "O(n^2) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string kthPermutation(int n, int k) {
        vector<int> fact(n + 1, 1);
        for (int i = 1; i <= n; i++) fact[i] = fact[i - 1] * i;
        string digits;
        for (int i = 0; i < n; i++) digits += char('0' + i);
        k--;
        string out;
        for (int i = 0; i < n; i++) {
            int f = fact[n - 1 - i];
            int idx = k / f;
            out += digits[idx];
            digits.erase(digits.begin() + idx);
            k %= f;
        }
        return out;
    }
};
`,
    },
  },
  {
    id: "c-euler-28",
    source: "euler",
    url: "https://projecteuler.net/problem=28",
    title: "Number Spiral Diagonals",
    statement: [
      "Write the numbers 1, 2, 3, ... in a square spiral: start with 1 in the middle, then go right, down, left and up, winding outward. A spiral with side 5 looks like this: the first ring around 1 holds 2 to 9, the next one 10 to 25.",
      "Add up the numbers on both diagonals, counting 1 once. For side 5 the diagonals hold 1, 3, 5, 7, 9, 13, 17, 21 and 25, which add up to 101. The side is odd and up to 100000, where the answer is far too large to find by building the grid.",
    ],
    constraints: ["1 <= side <= 100000", "side is odd"],
    fn: {"name":"spiralDiagonals","params":[{"name":"side","type":"int"}],"returns":"long"},
    examples: [
      { input: [5], output: 101 },
      { input: [3], output: 25, explanation: "1 + 3 + 5 + 7 + 9 = 25." },
    ],
    tests: [
      { input: [1], output: 1 },
      { input: [7], output: 261 },
      { input: [9], output: 537 },
      { input: [101], output: 692101 },
      { input: [1001], output: 669171001 },
      { input: [99999], output: 666651666899997 },
    ],
    hints: [
      "Building the whole spiral is far too large. Instead, look at the numbers that sit on the diagonals of each ring.",
      "What is the biggest number in each ring, and how far apart are the other corners of that ring?",
      "Each ring's four diagonal corners are side minus 1 apart and the largest is at one corner, so their sum has a simple formula. Add all rings and the centre.",
      "Loop over odd ring sides from 3 up to the given side, add the four corners each time, and start the total at 1 for the centre.",
    ],
    solution: {
      idea: [
        "For each odd s from 3 to side, the four corners of that ring sum to 4 * s * s - 6 * (s - 1). Add them all, plus 1 for the centre.",
      ],
      complexity: "O(side) time with a loop (O(1) with a closed form), O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    long long spiralDiagonals(int side) {
        long long total = 1;
        for (long long s = 3; s <= side; s += 2) total += 4 * s * s - 6 * (s - 1);
        return total;
    }
};
`,
    },
  },
  {
    id: "c-euler-29",
    source: "euler",
    url: "https://projecteuler.net/problem=29",
    title: "Distinct Powers",
    statement: [
      "Take every power a^b where a and b are both whole numbers from 2 to n. Count how many different values appear.",
      "For n = 5 there are 16 powers, but 2^4 and 4^2 are both 16, so only 15 are different. For n up to 1000 there are almost a million powers, many of them huge, so you cannot compare the actual values; compare them in a smarter form.",
    ],
    constraints: ["2 <= n <= 1000"],
    fn: {"name":"distinctPowers","params":[{"name":"n","type":"int"}],"returns":"int"},
    examples: [
      { input: [5], output: 15 },
      { input: [2], output: 1 },
    ],
    tests: [
      { input: [3], output: 4 },
      { input: [4], output: 8 },
      { input: [10], output: 69 },
      { input: [64], output: 3648 },
      { input: [100], output: 9183 },
      { input: [1000], output: 977358 },
    ],
    hints: [
      "Comparing the huge numbers directly is impossible. Can you write each base in a shared form so that equal powers reveal themselves?",
      "Two powers can only be equal if their bases come from the same underlying base. Think about writing each base as a base raised to some power.",
      "Write each base as r to the power k, where r is not itself a perfect power, so that a to the power b becomes r to the power k times b.",
      "Count distinct pairs of r and k times b, for example by storing them in a set. Remember that a prime base has k = 1.",
    ],
    solution: {
      idea: [
        "For each a in 2..n find the smallest root r and exponent k with a = r^k. For every b in 2..n insert the pair (r, k * b) into a set.",
        "Two powers are equal exactly when their pairs are equal, so the size of the set is the answer.",
      ],
      complexity: "O(n^2) pairs inserted, with a hash set or sort: well under a second for n = 1000.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int distinctPowers(int n) {
        set<pair<int, int>> seen;
        for (int a = 2; a <= n; a++) {
            int r = a, k = 1;
            for (int base = 2; base * base <= a; base++) {
                long long x = base;
                int e = 1;
                while (x < a) { x *= base; e++; }
                if (x == a) { r = base; k = e; break; }
            }
            for (int b = 2; b <= n; b++) seen.insert({r, k * b});
        }
        return (int)seen.size();
    }
};
`,
    },
  },
];
