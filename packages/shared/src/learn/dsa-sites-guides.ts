import type { PatternGuide } from "./types";

// Pattern guides for the problem-site groups (plan 0022): Project Euler, AtCoder, Codeforces, Kattis. Templates are C++.

export const DSA_SITES_GUIDES: Record<string, PatternGuide> = {
  "cses-euler": {
    idea: "Project Euler asks for one number and gives no method. The input is usually too big for a plain loop, so look for the shortcut: a closed formula, a sieve, modular arithmetic or a search that stops early. Decide the integer type from the largest value every quantity can reach before you write code.",
    signals: [
      "A limit of 10^7 or more, or a value like 10^12, means a loop over every number is too slow.",
      "'Last digits' or 'modulo' means reduce after every step and never build the huge number.",
      "Many questions about many numbers (prime? divisor sum?) point at a sieve that answers all of them at once.",
    ],
    steps: [
      "Run the small example from the statement by hand and keep it as your first test.",
      "Write down the largest value of each sum and product, and pick int, long long or a 128-bit intermediate.",
      "Replace the loop with a formula, a sieve or modular exponentiation.",
      "Check against a slow brute force on small inputs before trusting the fast one.",
    ],
    template: `// Sum of multiples of d below limit; combine two numbers with inclusion and exclusion.
long long multiplesSum(long long d, long long limit) {
    long long m = (limit - 1) / d;
    return d * m * (m + 1) / 2;
}

// Sieve of Eratosthenes: composite[i] is 1 when i is not prime.
vector<char> sieve(int n) {
    vector<char> composite(n + 1, 0);
    if (n >= 0) composite[0] = 1;
    if (n >= 1) composite[1] = 1;
    for (long long i = 2; i * i <= n; i++)
        if (!composite[i])
            for (long long j = i * i; j <= n; j += i) composite[j] = 1;
    return composite;
}`,
    complexity: "Formulas O(1); a sieve O(N log log N); a divisor-sum table O(N log N); modular powers O(log e) each.",
    variations: [
      "Multiples of Two Numbers (Project Euler 1): arithmetic series plus subtracting the lcm multiples.",
      "Circular Primes (Project Euler 35): size the sieve by digit count because rotations can exceed the limit.",
      "Self Powers (Project Euler 48): sum of k^k modulo 10^digits with a 128-bit multiply.",
      "Reciprocal Cycles (Project Euler 26): the cycle length is the order of 10 modulo what is left after removing 2s and 5s.",
    ],
    pitfalls: [
      "Overflow of products of two large residues; use unsigned __int128 for moduli near 10^15.",
      "Off-by-one on 'below the limit': use (limit - 1) / d, not limit / d.",
      "Returning the last digits with leading zeros: the integer 0405 is just 405.",
    ],
    recap: ["Find the formula, sieve or modular trick before coding.", "Pick the integer type from the largest possible value.", "Check the statement's small example first."],
  },
  "cses-atcoder": {
    idea: "AtCoder Beginner Contest tasks are short and exact. Read the constraints first: they tell you the intended method. A small N allows brute force, a large N needs a formula or one pass. State the model in one sentence, then code it and test the edges.",
    signals: [
      "N at most 50 or 100 allows nested loops; N at most 2 * 10^5 wants one pass or a sort.",
      "A value up to 10^12 cannot be looped over: use min, max and bulk arithmetic.",
      "Words like 'how many' over a small range often mean a loop with a counter or a block formula.",
    ],
    steps: [
      "Read the constraints block and decide the target complexity.",
      "Write the model in one sentence (for example: count windows equal to ABC).",
      "Pick the plainest method that fits and write it with 64-bit types where values can pass 2 * 10^9.",
      "Run the samples, then the smallest and largest allowed input.",
    ],
    template: `int countWindows(const string& s) {                // sliding window of length 3
    int count = 0;
    for (size_t i = 0; i + 2 < s.size(); i++)
        if (s[i] == 'A' && s[i + 1] == 'B' && s[i + 2] == 'C') count++;
    return count;
}

// Bulk greedy: spend k actions on the first pile, then on the second, with no simulation.
pair<long long, long long> spend(long long a, long long b, long long k) {
    long long x = min(a, k);
    a -= x;
    k -= x;
    long long y = min(b, k);
    b -= y;
    return {a, b};
}`,
    complexity: "Usually O(N), O(N log N) with a sort, or O(1) with a formula; triple loops only when every limit is about 50.",
    variations: [
      "Coins (AtCoder ABC 087 B): three nested loops over small counts.",
      "Uneven Numbers (AtCoder ABC 136 B): count by digit-length blocks instead of by number.",
      "Takoyaki Festival (AtCoder ABC 143 B): (sum squared minus sum of squares) / 2.",
      "Greedy Takahashi (AtCoder ABC 149 B): two bulk phases with min.",
    ],
    pitfalls: [
      "Using int for values up to 10^12.",
      "Window loops that read past the end (use i + 2 < size).",
      "Misreading inclusive versus exclusive ranges.",
    ],
    recap: ["Constraints decide the method.", "Say the model in one sentence before coding.", "Test smallest, largest and all-equal inputs."],
  },
  "cses-codeforces": {
    idea: "Codeforces Div. 2 A and B tasks hide one observation behind a story: a parity test, a threshold count, a greedy order or a closed formula. Strip the story to input, output and rule, find the observation on small cases, then write the short code and check it against hand-worked examples.",
    signals: [
      "A yes or no about a number often reduces to parity or a power-of-two test.",
      "'Minimum number of' with interchangeable items points at a greedy order (largest first) or counting by category.",
      "Values up to 10^9 or more mean a formula, and the product needs 64 bits.",
    ],
    steps: [
      "Restate the task as input, output and rule.",
      "Work the smallest non-obvious example by hand and look for the pattern.",
      "Justify the greedy or formula in one sentence (an exchange argument or a counting argument).",
      "Code it, then test n = 1, all equal values and the largest sizes.",
    ],
    template: `int fewestCoins(vector<int> coins) {                // greedy: take the biggest coins first
    sort(coins.rbegin(), coins.rend());
    int total = 0;
    for (int c : coins) total += c;
    int mine = 0, taken = 0;
    for (int c : coins) {
        mine += c;
        taken++;
        if (2 * mine > total) break;                    // strictly more than the rest
    }
    return taken;
}

long long ceilDiv(long long a, long long b) { return (a + b - 1) / b; }`,
    complexity: "O(n) for a pass, O(n log n) with a sort, O(1) for a closed form.",
    variations: [
      "Watermelon (Codeforces 4A): the whole condition is 'even and greater than 2'.",
      "Taxi (Codeforces 158B): count the group sizes and combine the counts.",
      "Theatre Square (Codeforces 1A): the product of two ceiling divisions in 64 bits.",
      "Odd Divisor (Codeforces 1475A): no odd divisor above 1 means a power of two.",
    ],
    pitfalls: [
      "Strict versus non-strict inequalities (Twins needs strictly more).",
      "Ceiling division written as a / b + 1.",
      "Overflow when two values near 10^9 are multiplied.",
    ],
    recap: ["Find the one observation behind the story.", "Justify greedy choices with a one-line argument.", "Use 64-bit types for products."],
  },
  "cses-kattis": {
    idea: "Kattis starter problems are tiny and exact: a formula, a clock wrap, a string transform or a cancellation trick. Translate the statement literally, pick the plain tool, and compare the output with the sample character by character. Reduce cases to one representation, such as minutes since midnight, so the rule is uniform.",
    signals: [
      "Time of day or a cycle means convert to one unit and use a modulo.",
      "Pairs of equal values with one odd one out point at XOR cancellation.",
      "A transformation of every character or word is a single pass over the string.",
    ],
    steps: [
      "Write what goes in and what comes out in your own words.",
      "Choose the plain tool: formula, modulo, pass over the string or XOR.",
      "Check the type: sums of powers need 64 bits, negative remainders need a fix.",
      "Run the sample and two edge cases of your own.",
    ],
    template: `pair<int, int> earlier(int h, int m, int minutesBefore) {   // clock wrap-around
    int t = ((h * 60 + m - minutesBefore) % 1440 + 1440) % 1440;
    return {t / 60, t % 60};
}

long long single(const vector<long long>& codes) {      // XOR cancels every pair
    long long x = 0;
    for (long long c : codes) x ^= c;
    return x;
}

string initials(const string& name) {                   // first letter of each hyphen-separated word
    string r;
    for (size_t i = 0; i < name.size(); i++)
        if (i == 0 || name[i - 1] == '-') r += name[i];
    return r;
}`,
    complexity: "O(1) for formulas, O(n) for one pass; nothing here needs more.",
    variations: [
      "Spavanac (Kattis): subtract minutes on a 24-hour clock.",
      "Odd Man Out (Kattis): XOR leaves the single unmatched code.",
      "Pot (Kattis): split a number into base and exponent, then multiply in a loop.",
      "Autori (Kattis): keep the characters that follow a hyphen.",
    ],
    pitfalls: [
      "A negative remainder in C++ when subtracting past zero.",
      "Using int for a sum of powers or for codes near 2 * 10^9.",
      "Misreading what counts as a complete set or an extra month.",
    ],
    recap: ["Use one unit and a modulo for cycles.", "XOR cancels pairs.", "Test the sample first, then the edges."],
  },
};
