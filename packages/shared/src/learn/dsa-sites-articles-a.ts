import type { PatternArticle } from "./types";

// Pattern articles for the problem sites, part one: Project Euler and AtCoder (plan 0022). The C++ blocks of an article are
// concatenated and compiled together, so helper names are unique per article.

export const DSA_SITES_ARTICLES_A: Record<string, PatternArticle> = {
  "cses-euler": {
    intro:
      "Project Euler problems ask for one number and give no hints about the method. The input is usually too large for a plain loop, so the work is to find the mathematical shortcut: a closed formula, a sieve, modular arithmetic or a smarter search order. This article shows the habits that make those problems routine.",
    sections: [
      {
        title: "The intuition",
        body: `A Project Euler task looks innocent: add the multiples of 3 or 5 below a limit, find the largest prime factor of a big number, count the ways to make a sum from coins. With a small limit a loop works. The trouble starts when you change the limit to a hundred million, or a trillion. Then the loop that took a blink takes minutes, and you have to replace it with something that does the same job in far fewer steps.

The shortcut almost always comes from one of four places. First, a formula: sums of arithmetic series, squares and binomial coefficients have exact expressions, so a loop of a hundred million steps becomes three multiplications. Second, a sieve: when you need many answers about many numbers (is it prime, what is the sum of its divisors), computing them all together is much cheaper than testing each one alone. Third, modular arithmetic: when only the last digits or a remainder matters, you never build the huge number. Fourth, pruning: when you search for the best of many candidates, visit them in an order where you can stop early.

The second habit is about size. Project Euler answers can exceed 32 bits easily, and intermediate products can exceed 64 bits. A good solver asks of every quantity: what is the largest value this can take? That question decides between int, long long and a 128-bit intermediate before a single line is written.

Finally, these problems reward checking small cases by hand. The statement usually gives one: the multiples of 3 or 5 below 10 add up to 23. Run your code on it first. If it is wrong there, it will be wrong everywhere.`,
      },
      {
        title: "Why it works",
        body: `Each technique is correct for a reason you can state in one sentence, and stating it is what protects you from silly mistakes.

A closed formula works because a sum over a regular pattern has structure. The multiples of d below a limit are d, 2d, 3d and so on up to d times m, where m is the limit minus one, divided by d and rounded down. Their sum is d times the sum of 1 to m, which is d * m * (m + 1) / 2. Adding the multiples of two numbers counts the common multiples twice, so you subtract the multiples of their least common multiple once. That is inclusion and exclusion, and it is exact.

A sieve works because composites have small factors. To find all primes up to N you cross out the multiples of each prime from its square onwards, since a smaller multiple has a smaller prime factor that already crossed it out. The same idea, run with divisors instead of primes, fills a table of divisor sums in about N log N steps: for each i add i to every multiple of i. The total number of additions is the sum of N / i over i, which is about N times the natural logarithm of N.

Modular arithmetic works because addition and multiplication commute with taking remainders. The last ten digits of a sum of powers equal the sum, taken modulo ten to the tenth, of the powers taken modulo the same number. You can reduce after every step and the numbers never grow.

Pruning works because the candidate order carries information. If you test factor pairs from the largest downwards, then once a product is no better than your best palindrome, every later product in that row is smaller and can be skipped.`,
      },
      {
        title: "A worked example",
        body: `Take the first problem in the list: add all numbers below a limit that are divisible by a or by b. With a = 3, b = 5 and limit 10 the answer is 23, from 3, 5, 6 and 9.

The loop version tests every number below the limit. For limit 10 that is nine steps; for a hundred million it is a hundred million steps, which is slow but still possible. Make the limit larger than that, or ask for many queries, and it fails. The formula version needs a constant number of steps.

Define f(d) as the sum of the multiples of d below the limit. Let m = (limit - 1) / d. Then f(d) = d * m * (m + 1) / 2. For d = 3 and limit 10, m = 3 and f(3) = 3 * 3 * 4 / 2 = 18, which is 3 + 6 + 9. For d = 5, m = 1 and f(5) = 5. The number 15 would be counted twice for larger limits, so subtract f(lcm(a, b)). Here the lcm is 15 and m = 0, so f(15) = 0, and the answer is 18 + 5 - 0 = 23, matching the statement.

Now check the sizes. With limit up to 10^8, the product d * m is at most the limit, so d * m * (m + 1) is at most about 10^16, well inside a signed 64-bit integer (about 9.2 * 10^18). But the final answer must also fit the judge's number format, which holds integers exactly up to 2^53, about 9 * 10^15. That is why the limits of these problems are chosen with care.

Notice what happened: a loop became three calls to one function, the function was checked against the example in the statement, and the sizes were checked before coding.`,
        code: `// Sum of the multiples of a or b below limit, by inclusion and exclusion.
long long eulerMultiplesSum(long long d, long long limit) {
    long long m = (limit - 1) / d;
    return d * m * (m + 1) / 2;
}

long long eulerEitherMultiple(long long limit, long long a, long long b) {
    long long l = a / __gcd(a, b) * b;               // least common multiple
    return eulerMultiplesSum(a, limit) + eulerMultiplesSum(b, limit) - eulerMultiplesSum(l, limit);
}`,
      },
      {
        title: "Implementation",
        body: `Three small tools cover most of the Euler problems you will meet in this app: a sieve, a modular power and a divisor-sum table.

The sieve below marks composites for all numbers up to a bound and runs in about N log log N steps. Use a vector of char or bool. For problems that rotate or reverse digits (circular primes, for example) remember that the transformed number can be larger than the limit, so size the sieve by the number of digits, not by the limit itself.

The modular power uses repeated squaring and a safe multiplication. When the modulus is below about 3 * 10^9 the product of two residues fits in an unsigned 64-bit integer. When the modulus can reach 10^15, as in the self powers problem with 15 digits, use a 128-bit intermediate. GCC and Clang provide the type as __int128; with it the multiplication is a * b % m.

The divisor-sum table is the third tool. It gives the sum of proper divisors of every number below N in N log N time, which solves the amicable numbers problem directly, and it is the same loop shape as the sieve.

Keep each of these as a short function with a clear name. The whole point is that the problem statement changes while the tools do not.`,
        code: `vector<char> eulerSieve(int n) {                     // composite[i] == 1 when i is not prime
    vector<char> composite(n + 1, 0);
    if (n >= 0) composite[0] = 1;
    if (n >= 1) composite[1] = 1;
    for (long long i = 2; i * i <= n; i++)
        if (!composite[i])
            for (long long j = i * i; j <= n; j += i) composite[j] = 1;
    return composite;
}

unsigned long long eulerPowMod(unsigned long long base, unsigned long long exp, unsigned long long mod) {
    unsigned long long result = 1 % mod;
    base %= mod;
    while (exp > 0) {
        if (exp & 1) result = (unsigned long long)((unsigned __int128)result * base % mod);
        base = (unsigned long long)((unsigned __int128)base * base % mod);
        exp >>= 1;
    }
    return result;
}

vector<int> eulerDivisorSums(int n) {               // sum of proper divisors of every number below n
    vector<int> d(n, 0);
    for (int i = 1; i < n; i++)
        for (int j = 2 * i; j < n; j += i) d[j] += i;
    return d;
}`,
      },
      {
        title: "Variants",
        body: `The same four ideas return in different clothes, and it helps to recognise them.

Digit problems, such as the digit sum of a power of two or the largest product in a series of digits, call for working digit by digit: either keep the number as an array of limbs (base 10^9 chunks in a vector) or slide a window over the digits of a string. Zeros are the classic trap in windows of products, because one zero kills the whole product until it leaves the window.

Counting problems, such as lattice paths or coin sums, are usually binomial coefficients or knapsack tables. For binomials modulo a prime, precompute factorials and use Fermat's little theorem for the inverse. For coin sums, loop the coins in the outer loop so each multiset of coins is counted once, not once per order.

Sequence problems, such as the longest Collatz chain, are made fast by remembering results: store the chain length of every number you have seen and stop a new chain when it reaches a stored one. Be careful that the values inside a chain can leave the range of int even when the starting values are small.

Number theory problems, such as the longest repeating decimal cycle, reduce to a known object. The cycle length of 1 over d is the multiplicative order of 10 modulo what is left of d after removing every factor of 2 and 5. Recognising this removes the need to do long division at all.

When none of these fit, search is still possible, but order the search so that it can stop early.`,
      },
      {
        title: "Complexity",
        body: `Measure the cost of the intended method and compare it with the size of the input before you start.

A formula costs O(1) or O(log n) for a gcd. A sieve of size N costs O(N log log N) time and O(N) memory; for N = 10^7 that is about 10 MB as a vector of char and a fraction of a second. The divisor-sum table costs O(N log N), which is about 1.6 * 10^7 additions for N = 10^6. Modular exponentiation costs O(log e) multiplications, so summing n powers costs O(n log n); with n = 10^5 that is under two million multiplications.

Search with pruning has no tidy bound, but you can reason about it. In the largest palindrome product problem the inner loop breaks at the first palindrome or as soon as the product cannot beat the best, so most rows do almost no work once a good palindrome has been found.

The limits in this app are chosen so that the intended method finishes comfortably and the naive one does not: a loop up to 10^8 in the multiples problem is possible but a brute force over 10^7 by 10^7 pairs is not. If your solution takes more than a second in C++ on the largest stress input, the method, not the code, needs to change.

Memory matters too. A sieve of ten million flags is fine; a table of a billion entries is not. If memory is the problem, look for a segmented sieve or a formula.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Overflow is the main enemy. A product of two numbers below 10^9 does not fit in a signed 32-bit integer and a product of two residues below 10^15 does not fit in 64 bits. Decide the type from the largest possible value, not from the statement's examples. In the judge, answers are compared as JSON numbers, so they must also stay below 2^53; the problems in this app were set up that way on purpose.

Off-by-one errors in limits come next. Is the limit included or excluded? Below 10 means 1 to 9. The sum of the multiples of d below the limit uses m = (limit - 1) / d, not limit / d, and the two differ when limit is itself a multiple of d.

Small inputs break assumptions. The sieve must handle n = 0 and n = 1 without indexing out of range. A loop for primes up to the square root must use i * i <= n with a 64-bit i, since i * i overflows int near 46341. Largest prime factor must report the number itself when it is prime, and must not loop forever when it is 1.

Leading zeros disappear when you return the last digits of a number as an integer: 0405071317 is returned as 405071317. Do not pad the result.

Finally, do not trust an answer you did not check. When the statement quotes a known value, run it. When it does not, write a slow brute force for small inputs and compare it with your fast solution on a few hundred cases.`,
      },
      {
        title: "Practice order",
        body: `Start with the ones where a formula replaces a loop: Multiples of Two Numbers (Project Euler 1), then Even Fibonacci Numbers (Project Euler 2) to practise generating a sequence with two variables, and Largest Prime Factor (Project Euler 3) for trial division up to the square root.

Move on to sieves with Summation of Primes (Project Euler 10) and Circular Primes (Project Euler 35). The second one teaches you to size the sieve by digits, not by the limit. Add Amicable Numbers (Project Euler 21) for the divisor-sum table.

Then try counting and modular problems: Coin Sums (Project Euler 31) for the knapsack loop order and Self Powers (Project Euler 48) for fast exponentiation with a 128-bit multiply.

Finish with the ones that need an idea more than a tool: Reciprocal Cycles (Project Euler 26), Counting Sundays (Project Euler 19) and Largest Palindrome Product (Project Euler 4) with its pruned search. After each one, write down the quantity that would overflow and the formula or table that replaced the loop.`,
      },
    ],
  },
  "cses-atcoder": {
    intro:
      "AtCoder Beginner Contest tasks are short, exact and fair: the statement tells you everything, the limits tell you the intended method, and a small amount of careful thinking beats a clever trick. This article explains how to read an ABC task, choose between brute force and a formula, and avoid the small mistakes that cost points.",
    sections: [
      {
        title: "The intuition",
        body: `An AtCoder Beginner Contest has tasks lettered A, B, C, D and later E, F. The early ones are meant to be solved in a few minutes. They do not hide a deep algorithm. They test whether you can read the statement exactly, turn it into a loop or a formula, and write it without a slip.

The most useful reading habit is to look at the constraints before the story. AtCoder prints them in a block, and they tell you the size of the intended solution. If N is at most 50, almost anything works, including a triple loop. If N is at most 10^5 you need about N log N or better. If a value goes up to 10^12 you must not loop over it at all; there is a formula or a min and a subtraction waiting for you. The Greedy Takahashi task is a good example: with up to 10^12 actions you cannot simulate them one by one, but you can spend them in two bulk phases.

The second habit is to separate the model from the code. Say the model in one sentence: count windows of three letters equal to ABC, or add up the products of all pairs. Then ask whether there is a trick: the sum of the pair products is half of the square of the total minus the sum of the squares. Even when you do not use the trick, saying the model first prevents most misreadings.

Finally, AtCoder statements give sample inputs and outputs. Run all of them. Then invent one edge case of your own and compute it by hand.`,
      },
      {
        title: "Why it works",
        body: `Reading constraints works because contest setters choose them to separate the intended solution from slower ones. A time limit of two seconds allows roughly 10^8 simple operations in C++. If N is 50, then N^3 is 125000 and nothing is at risk. If N is 2 * 10^5, then N^2 is 4 * 10^10 and a double loop will not finish, so the setter wants an O(N) or O(N log N) idea. You can read the intended complexity straight out of the largest constraint.

Brute force over small ranges is correct because it enumerates every possibility and checks the condition directly; it cannot miss a case. In the Coins task you choose how many coins of three kinds to use. Each count is at most 50, so there are at most 51 * 51 * 51 combinations, and you count those with the right total. The proof of correctness is the loop itself.

Formulas are correct because they count the same thing in a different way. For the numbers from 1 to n with an odd digit count, you can test each number, or notice that the numbers with a given digit count form one block, and add the sizes of the blocks with 1, 3, 5, 7 and 9 digits. Both count exactly the same set.

Greedy steps are correct when taking the local best choice cannot hurt later. In Greedy Takahashi, eating your own cookies first is forced by the rules, so the bulk computation with min is not a heuristic: it is the rules written down once.`,
      },
      {
        title: "A worked example",
        body: `Take Greedy Takahashi. Takahashi has a cookies, Aoki has b, and Takahashi acts k times. Each action: if he has a cookie of his own, he eats it; otherwise, if Aoki has one, he eats that; otherwise nothing happens. All three numbers can be 10^12.

First read the constraints: 10^12. A loop of 10^12 steps is out of the question, so the answer must be computed in O(1).

Second, say the model. The actions fall into three phases in time: eating his own cookies, eating Aoki's cookies, and doing nothing. The phases happen in this order because a phase can only start when the previous one has run out of material.

Third, write the bulk version. In the first phase he eats x = min(a, k) cookies. Subtract x from a and from k. Whatever is left of k goes to the second phase: he eats y = min(b, k) of Aoki's cookies. Subtract y from b. If k is still positive, the extra actions do nothing, so we do not need to track them.

Check the sample: a = 2, b = 3, k = 3. Then x = min(2, 3) = 2, so a becomes 0 and k becomes 1. Then y = min(3, 1) = 1, so b becomes 2. The answer is 0 and 2, which matches. Check an edge: a = 0, b = 0 and k = 5 gives x = 0, y = 0, and the answer is 0 and 0. Use long long for all three numbers, since 10^12 does not fit in an int.

The solution is four lines. The thinking, not the typing, is the work.`,
        code: `// Greedy Takahashi: spend k actions on the first pile, then on the second, in bulk.
pair<long long, long long> atcGreedyTakahashi(long long a, long long b, long long k) {
    long long x = min(a, k);
    a -= x;
    k -= x;
    long long y = min(b, k);
    b -= y;
    return {a, b};
}`,
      },
      {
        title: "Implementation",
        body: `A few short patterns cover most beginner tasks, and you should be able to write each of them without thinking.

Window counting: loop i from 0 while i + 2 is a valid index and compare three characters. The loop condition i + 2 < size is the single most common place for an off-by-one error; with an unsigned size, never write size - 3 when the size can be below 3.

Digit work: to get a digit sum, repeat s += n % 10 and n /= 10 until n is 0. To reverse a number, build r = r * 10 + n % 10. To rotate letters, convert to a number, add the shift, take the modulo 26 and convert back.

Small brute force: three nested loops over counts, checking a total, as in the Coins task. Keep the loop bounds exactly as the statement gives them and test the boundaries, including a count of 0.

Counting blocks: when numbers are grouped by some property, such as the number of digits, iterate over the groups, not over the numbers. For group lo to hi, the part not above n is min(n, hi) - lo + 1 when n is at least lo, and 0 otherwise.

Input and output are replaced in this app by function arguments and return values, so you do not need cin or cout. Return the exact type the signature asks for: long long where the statement says the value can pass 2 * 10^9.`,
        code: `int atcCountWindows(const string& s) {            // count the substring ABC
    int count = 0;
    for (size_t i = 0; i + 2 < s.size(); i++)
        if (s[i] == 'A' && s[i + 1] == 'B' && s[i + 2] == 'C') count++;
    return count;
}

int atcDigitSum(int n) {                           // digit sum by repeated remainder
    int total = 0;
    for (; n > 0; n /= 10) total += n % 10;
    return total;
}

int atcOddDigitNumbers(int n) {                    // numbers from 1 to n with an odd number of digits
    long long lo = 1;
    int total = 0;
    for (int digits = 1; digits <= 9; digits++, lo *= 10) {
        long long hi = lo * 10 - 1;
        if (digits % 2 == 1 && n >= lo) total += (int)(min<long long>(n, hi) - lo + 1);
    }
    return total;
}`,
      },
      {
        title: "Variants",
        body: `The same few shapes appear again and again in beginner tasks, with the story changed.

Parity and divisibility tasks, such as the product of two numbers being even or odd, are about remainders: a product is even as soon as one factor is. Shift Only asks how many times you can halve every number in a list; the answer is the smallest count of trailing zero bits among the numbers.

Greedy and sorting tasks, such as Card Game for Two, are solved by sorting in descending order and alternating who takes the next card, because each player takes the largest remaining card.

Distinct counting tasks, such as Kagami Mochi, reduce to the size of a set of values. Reading the constraints tells you whether a set, a sorted array with unique, or a boolean table is simplest.

Geometry on a grid, such as Traveling, uses the Manhattan distance and parity: reaching a point in exactly t steps is possible when the distance is at most t and has the same parity as t.

String tasks, such as Daydream, check whether a text is a concatenation of fixed words. Matching from the end avoids the ambiguity between dream and dreamer, which can start identically and differ only later.

When a task grows beyond the beginner level, the same discipline holds: read the constraints, name the model, pick the simplest method that fits, and test the edges.`,
      },
      {
        title: "Complexity",
        body: `Match your method to the largest constraint, and you rarely need to measure anything.

For N at most 50 or 100, a triple loop (about 10^6 steps) is fine. For N at most 10^3, a double loop (10^6 steps) is fine and a triple loop (10^9) is too slow. For N at most 2 * 10^5 you want O(N) or O(N log N): one pass, a sort, or a set. For values up to 10^9 or 10^12 you want O(1) or O(log), meaning formulas, min and max, and divisions.

Space follows the same logic. A string of 10^5 characters is nothing. A table indexed by a value up to 10^9 is impossible, so an array indexed by value is only allowed when the value range is small; otherwise use a sorted array or a hash set.

Counting by blocks turns a loop over 10^9 numbers into a loop over 9 digit lengths. The window counter and the digit sum are linear in the input size, which is trivially fast. The interleave and rotation tasks are linear in the string length.

Do not optimise tasks that are already fast. In a beginner contest the risk is a wrong answer, not a slow one. Use the time you save on edge cases.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Integer overflow is the first pitfall. Greedy Takahashi uses values up to 10^12, so int is wrong; use long long for the arguments and the answer. In pair product sums, the total is at most about 1.2 * 10^7, which fits an int, but check before you rely on it.

Off-by-one errors are the second. A window of three characters needs i + 2 < size. A block from lo to hi has hi - lo + 1 elements. Letters have 26 values, so the wrap is modulo 26, not 25.

Misreading the statement is the third, and the costliest. Does the count include equal elements? Is the range inclusive? Does the string use uppercase letters only? Reread the statement after you write the code, comparing each sentence with a line of your program.

Edge cases worth testing every time: the smallest allowed input, the largest allowed input, all elements equal, all elements zero, and an input where the answer is 0. For string tasks, try a string of length 1 and a string where every character is the same.

Output format also matters in the real contest: one line, no extra spaces. In this app the judge compares the returned value, so the type has to match exactly: a bool, a string, an array of two long values, whatever the signature says.`,
      },
      {
        title: "Practice order",
        body: `Warm up with the shortest ones: Product (AtCoder ABC 086 A), Shift Only (AtCoder ABC 081 B) and Coins (AtCoder ABC 087 B), where the whole skill is reading the constraints and picking a loop.

Then try digit and counting tasks: Some Sums (AtCoder ABC 083 B) for digit sums, Uneven Numbers (AtCoder ABC 136 B) for counting by blocks, and Count ABC (AtCoder ABC 150 B) for a sliding window.

Practise bulk arithmetic with Greedy Takahashi (AtCoder ABC 149 B), where the values are too large to simulate, and Takoyaki Festival (AtCoder ABC 143 B), where a formula replaces a double loop.

Finish with string and parity ideas: ROT N (AtCoder ABC 146 B), Strings with the Same Length (AtCoder ABC 148 B) and Daydream (AtCoder ABC 049 C). For each task, write the model in one sentence before you code, and write down the edge case you tested.`,
      },
    ],
  },
};
