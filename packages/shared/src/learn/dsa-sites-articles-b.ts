import type { PatternArticle } from "./types";

// Pattern articles for the problem sites, part two: Codeforces and Kattis (plan 0022). The C++ blocks of an article are
// concatenated and compiled together, so helper names are unique per article.

export const DSA_SITES_ARTICLES_B: Record<string, PatternArticle> = {
  "cses-codeforces": {
    intro:
      "Codeforces Div. 2 problems A and B are the first two tasks of a contest. They are rated roughly 800 to 1400 and test implementation, greedy choices, simple math and careful reading. This article shows how to turn a wordy statement into a short solution and how to avoid the wrong answers that eat most beginners' time.",
    sections: [
      {
        title: "The intuition",
        body: `The first two problems of a Codeforces round are written to be solved fast by someone who reads carefully. The story may be a watermelon split between two friends, a taxi with four seats or a row of stones, but behind the story there is usually one observation, and once you see it the code is a handful of lines.

The skill is to strip the story down. Ask three questions. What is the input, in plain terms: a number, a list of values, a string? What is the output: a yes or no, a count, a minimum? And what is the rule that connects them? Watermelon asks whether a weight can be split into two even positive parts; that is the same as asking whether it is even and larger than 2. Team asks how many rows of three flags have at least two ones; that is a threshold on a row sum. Stones on the Table asks for the minimum removals so that no neighbours match; that is the number of adjacent equal pairs.

Notice that none of these needed a data structure or an advanced algorithm. They needed the right reading of the rule. Greedy reasoning appears often too: Twins asks for the fewest coins whose sum beats the rest, and the answer is to take the biggest coins first.

Rated problems also train a habit that matters on every platform: before you code, find the smallest example where the answer is not obvious, and work it by hand. If your idea fails there, it fails everywhere.`,
      },
      {
        title: "Why it works",
        body: `There are three kinds of reasoning behind most of these tasks, and each has a one-line justification you can check.

Direct simulation works when the process is short. If the input has at most 100 items, you can follow the rules literally, and correctness is obvious because you do exactly what the statement says. Stones on the Table could be simulated by deleting stones, but the simulation is wasteful and tricky; the count of equal neighbours is the same number and needs one comparison per position.

Greedy choice works when taking the best option now never blocks a better result later. The usual proof is an exchange argument. For Twins, suppose an optimal answer takes a coin c while leaving a larger coin d. Swap them: your sum does not decrease and the number of coins is the same, so taking the largest first is at least as good. Repeating the swap turns any optimal answer into the greedy one.

Counting by categories works when the order of items does not matter. In Taxi, groups of 4 fill a taxi alone, groups of 3 can share with a group of 1, and groups of 2 pair up. Only the number of groups of each size matters, so you count the sizes and combine the counts with simple arithmetic.

Math characterisations work when a condition turns out to be equivalent to something simple. A number is a power of two exactly when n & (n - 1) is 0, so having no odd divisor above 1 means being a power of two. Proving the equivalence once saves you from searching.

When you cannot explain why a solution is right in a sentence, keep thinking before you submit.`,
      },
      {
        title: "A worked example",
        body: `Take Taxi. There are n groups of children, each of size 1 to 4, and every group must ride in the same taxi. A taxi holds four passengers. Find the minimum number of taxis.

Begin by counting how many groups there are of each size. Call these c1, c2, c3 and c4. The order of groups does not matter, so these four numbers are the whole input.

Groups of size 4 fill a taxi alone: add c4 taxis. A group of size 3 leaves one free seat; the best companion is a group of size 1. So pair each 3 with a 1 while there are both. That uses min(c3, c1) taxis for pairs, then the leftover threes each need their own taxi, and the leftover ones are handled with the other small groups.

Two groups of size 2 fill a taxi: use c2 / 2 taxis. If c2 is odd, one group of 2 remains. It can take up to two extra single children (2 + 1 + 1), so one more taxi, and any remaining singles share it.

Finally the remaining singles go four to a taxi, rounded up.

Check this on a case: groups 1, 2, 4, 3, 3, 1. Then c1 = 2, c2 = 1, c3 = 2, c4 = 1. One taxi for the 4. Two threes pair with the two ones: two taxis. The single 2 needs its own taxi. Total 4. Could three do it? The groups sum to 14 children, and three taxis hold only 12, so four is the minimum. The count matches the lower bound.

The solution is short because we reduced the problem to counting, and the code just follows the case analysis. Never write the analysis in the code without checking it against a small case, as we just did.`,
        code: `// Taxi: only the number of groups of each size matters.
int cfTaxis(const vector<int>& groups) {
    int c[5] = {0, 0, 0, 0, 0};
    for (int g : groups) c[g]++;
    int taxis = c[4];                                  // a group of four rides alone
    int pairs = min(c[3], c[1]);                       // a three plus a one share a taxi
    taxis += pairs;
    int threesLeft = c[3] - pairs;
    int onesLeft = c[1] - pairs;
    taxis += threesLeft;                               // each remaining three rides alone
    taxis += c[2] / 2;                                 // two twos share a taxi
    int rest = onesLeft;
    if (c[2] % 2 == 1) { taxis++; rest = max(0, rest - 2); }   // a lone two takes up to two singles
    taxis += (rest + 3) / 4;                           // remaining singles, four to a taxi
    return taxis;
}`,
      },
      {
        title: "Implementation",
        body: `Most Div. 2 A and B solutions are built from a handful of small pieces. Learn to write them quickly and correctly.

Counting: keep a small array indexed by value, or a map when the values are large. In Taxi the sizes are 1 to 4, so an array of five counters works.

Sorting: sort in descending order with sort(v.rbegin(), v.rend()) when the greedy step is to take the biggest first, as in Twins. Then accumulate with a running total and stop as soon as the condition holds.

Sliding windows: to find the best fixed-length block, such as the fence of k boards with the smallest total height, keep a running sum, add the entering element and subtract the leaving one. Return the earliest start index when the statement says to, because the answer must be unique.

String processing: iterate over characters, filter with a test, transform with tolower, and append to a result string. For the abbreviation task, take the first character, the number of characters in between as text (to_string(size - 2)) and the last character.

Fast arithmetic: use long long whenever a product or a sum can exceed about 2 * 10^9. Ceiling division for positive integers is (a + b - 1) / b. A k-th number not divisible by n can be found without a loop with a short formula.

In this app you write a function, so there is no input parsing. That removes one common source of errors, but the type of every parameter and the return type still decide whether large values survive.`,
        code: `vector<int> cfCountSizes(const vector<int>& groups, int maxSize) {
    vector<int> counts(maxSize + 1, 0);
    for (int g : groups) counts[g]++;
    return counts;
}

int cfFewestCoins(vector<int> coins) {              // greedy: biggest coins first
    sort(coins.rbegin(), coins.rend());
    int total = 0;
    for (int c : coins) total += c;
    int mine = 0, taken = 0;
    for (int c : coins) {
        mine += c;
        taken++;
        if (2 * mine > total) break;                // strictly more than the rest
    }
    return taken;
}

string cfShortWord(const string& word) {            // abbreviate words longer than ten letters
    if (word.size() <= 10) return word;
    return string(1, word.front()) + to_string(word.size() - 2) + word.back();
}

long long cfCeilDiv(long long a, long long b) { return (a + b - 1) / b; }`,
      },
      {
        title: "Variants",
        body: `Once you recognise the shapes, a new problem often turns out to be an old one.

Parity and divisibility: Watermelon and Odd Divisor both reduce to a short test on the number, an even check or a power-of-two check. Look at small cases (n = 1 to 10) and write down which ones answer yes; the pattern usually jumps out.

Threshold counting: Team and Next Round count rows or scores that pass a threshold, sometimes defined by a rank (at least as large as the k-th score) and sometimes with an exception (and the score must be positive).

Grid and coordinate tasks: Beautiful Matrix places a single 1 in a 5 by 5 grid and asks for the number of moves to the centre. That is a Manhattan distance, with no simulation. Domino Piling is an area argument: a board of m by n cells holds m * n / 2 dominoes, rounded down.

Sequence tasks: Kefa and First Steps asks for the longest non-decreasing run. One pass with a counter that resets when the order breaks is enough.

Constructive and formula tasks: K-th Not Divisible by n looks like a search but has a closed form: among every n numbers exactly one is skipped, so the answer is k plus the number of skipped values before it.

Vector and geometry tasks: Young Physicist sums the coordinates of vectors separately and tests for zero.

In every variant the discipline is the same: find the invariant or the formula, check it on small cases, then code it.`,
      },
      {
        title: "Complexity",
        body: `Codeforces problems A and B have small limits, often n up to 100 or 1000, so the main complexity decision is whether a formula exists, not whether an O(n log n) method is fast enough. Even so, the larger tasks in this tier have n up to 10^5 or values up to 10^9, and then the choice matters.

A single pass is O(n). Sorting adds O(n log n), which is fine up to about 10^6 elements. A sliding window is O(n), against O(n * k) for recomputing every window, which can be 10^10 when both are 10^5.

A closed formula is O(1) and is the intended answer when a value can be 10^9 or more. Theatre Square with sides up to 10^9 needs the product of two ceilings, computed in 64 bits; a loop over the stones would never finish.

Memory is rarely an issue at this level, but remember the types: an array indexed by a value up to 10^9 is impossible, so use a map or sort and compress instead.

When in doubt, work out the worst case on paper. If n is 10^5 and your method does n^2 operations, that is 10^10 and too slow; if it does n log n, that is under two million. This five-second estimate saves failed submissions.

In this app, the large stress inputs test exactly this: they use the biggest allowed sizes, so a method that is too slow shows up as a time limit failure.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Wrong answer on a Codeforces problem usually has one of five causes.

Overflow: a product of two values up to 10^9 needs long long, and Theatre Square reaches about 10^18 in the original task. In this app answers must stay below 2^53, which is why the limits are smaller, but the habit of choosing 64-bit types is the same.

Off-by-one errors: ceiling division is (a + b - 1) / b, not a / b + 1. A window of length k over n elements has n - k + 1 starting positions. Stones on the Table compares each stone with the one before it, so the loop starts at index 1.

Strictness: Twins asks for a sum strictly greater than the rest, not greater or equal. With coins 3 and 3 one coin is not enough. Read every inequality twice.

Reading the output requirement: some tasks want yes or no, others want a number; some want the smallest index when several are equally good. When the original asks for any valid answer, this app asks for a unique checkable one, so follow the statement given.

Edge inputs: n = 1, all elements equal, the smallest and largest allowed values, and an input where the answer is 0 or where no valid choice exists. Letters in both cases need tolower; strings may be all vowels (the filtered result is empty).

Before you submit, run all samples and at least two cases you made up, one tiny and one at the limit.`,
      },
      {
        title: "Practice order",
        body: `Start with the one-line observations: Watermelon (Codeforces 4A), Team (Codeforces 231A) and Stones on the Table (Codeforces 266A). Each one is a single condition or a single count.

Next come the string and counting problems: Way Too Long Words (Codeforces 71A), String Task (Codeforces 118A), Vanya and Fence (Codeforces 677A) and Young Physicist (Codeforces 69A). They test careful implementation rather than ideas.

Then practise greedy and counting with Twins (Codeforces 160A) and Taxi (Codeforces 158B), where you need to justify why the order of choices is right.

Finish with the formula problems that punish loops and overflow: Theatre Square (Codeforces 1A), K-th Not Divisible by n (Codeforces 1352C) and Odd Divisor (Codeforces 1475A). After each solution, write one sentence that states why it is correct. If you cannot, you got lucky and should look again.`,
      },
    ],
  },
  "cses-kattis": {
    intro:
      "Kattis starter problems are small programs with a clear rule: a bit of arithmetic, a string transformation or a count. They are the easiest place on the problem sites to practise turning a short statement into code exactly. This article covers the few techniques they use and the habits that keep a short solution correct.",
    sections: [
      {
        title: "The intuition",
        body: `Kattis hosts thousands of problems from programming contests around the world, and many of the early ones are tiny. A farmer divides a pie, a clock moves back 45 minutes, a long author name is shortened to initials. The statement is short, and so is the solution. What makes them valuable is that they leave no room for hand-waving: the output must match exactly.

Because the tasks are small, the work is mostly translation. Read the statement and write down, in your own words, what goes in and what comes out. Then pick the plain tool for the job: a loop with a counter, a remainder for wrap-around, an XOR for pairs that cancel, an exponent loop for a power.

Three patterns do most of the work. The first is arithmetic on a small formula: the missing value of a mean is two times the mean minus the known value. The second is clock or cyclic arithmetic: convert to a single unit (minutes since midnight), do the subtraction, and wrap with a modulo. The third is processing a string character by character, keeping the characters you need and transforming the others.

A fourth, less obvious idea is cancellation. Odd Man Out gives a list where every code appears twice except one. XOR of all the values cancels the pairs and leaves the single one, in one pass and with no extra memory.

These are the same instincts as in harder contests, in miniature: choose the simplest correct method, and check the edges.`,
      },
      {
        title: "Why it works",
        body: `Each of the small techniques has a short proof you can keep in your head.

The mean equation works by algebra. If the mean of r1 and r2 is s, then (r1 + r2) / 2 = s, so r1 + r2 = 2s and r2 = 2s - r1. Nothing more is needed. Using the integer form, with no division, avoids rounding problems.

Clock arithmetic works because the day is a cycle of 1440 minutes. Time t minutes after midnight is the same time as t + 1440. Subtracting 45 minutes might give a negative number, so add 1440 first and then take the remainder. After that the hour is the quotient by 60 and the minute the remainder.

XOR cancellation works because x ^ x = 0, x ^ 0 = x, and XOR is commutative and associative, so the order does not matter. XORing a list in which every value appears an even number of times except one leaves exactly that one value.

Character processing works because each output character depends only on the input character and, sometimes, the one before it. Initials are the characters at index 0 and just after a hyphen. A single pass that looks one position back does exactly that.

Power and counting tasks work because the limits are tiny. A power with an exponent from 0 to 9 can be computed by multiplying in a loop. A count of letters of three kinds can use three counters. When a limit is that small, the straightforward method is also the correct and efficient one.

Knowing the one-sentence reason helps you notice when a case is not covered by it.`,
      },
      {
        title: "A worked example",
        body: `Take Spavanac. Mirko wants to be woken exactly 45 minutes before the time he is given. The time has an hour from 0 to 23 and a minute from 0 to 59. Print the new time. For 10:10 the answer is 9:25, and for 0:30 it wraps to 23:45.

The first idea people have is to subtract 45 from the minutes and then fix things up with cases: if the minutes go negative, borrow an hour, and if the hour goes negative, wrap to 23. That works but has several branches, and each branch is a chance for a mistake: what if the minutes are 44 and the hour is 0?

A cleaner way is to work in one unit. Convert the time to minutes since midnight: t = h * 60 + m. Subtract 45. The result can be negative, for example 0:30 gives 30 - 45 = -15. Add 1440, the number of minutes in a day, so that the value is not negative, and take the remainder by 1440 so that values that did not wrap stay in range. Now t = (h * 60 + m - 45 + 1440) % 1440. For 0:30 it is (30 - 45 + 1440) % 1440 = 1425, which is 23 * 60 + 45, so 23:45. For 10:10, t = 610 - 45 = 565 = 9 * 60 + 25, so 9:25.

Check the edges: 0:00 gives 1395, which is 23:15, and 0:44 gives (44 - 45 + 1440) = 1439, which is 23:59. Both are correct. There are no branches, so there is nothing to forget.

The lesson is general: reduce a problem with several cases to a single representation where the rule is uniform.`,
        code: `// Spavanac: work in minutes since midnight so the wrap-around is one modulo.
pair<int, int> kattisEarlier(int h, int m, int minutesBefore) {
    int t = ((h * 60 + m - minutesBefore) % 1440 + 1440) % 1440;
    return {t / 60, t % 60};
}`,
      },
      {
        title: "Implementation",
        body: `Four short functions cover the Kattis starter set. They are worth writing from memory.

Powers by loop: multiply the base into a running result the number of times given by the exponent. With a base up to 30 and an exponent up to 9 the largest result is 30^9, about 2 * 10^13, so use long long. For bigger exponents, use repeated squaring.

Splitting a number into parts: x / 10 gives everything but the last digit and x % 10 gives the last digit. This is how Pot separates a base from an exponent.

Initials from a hyphenated name: keep the character at position 0 and every character whose predecessor is a hyphen. Do not search for hyphens with find and index arithmetic; the one-pass version has fewer places to go wrong.

XOR of a list: start with 0 and XOR each value. In C++ the value type must hold the largest input: codes up to 2 * 10^9 need unsigned int or long long, since a signed int tops out near 2.1 * 10^9.

The mean problem is a single return statement. Return the type the signature asks for.

For output, this app compares the returned value with the expected one, so the function must return a string or an array in the exact form: the initials as one string, the new time as an array of two ints.

Small solutions are easy to test: write the example from the statement, then two or three of your own, before you run the large inputs.`,
        code: `long long kattisPower(long long base, int exponent) {
    long long result = 1;
    for (int i = 0; i < exponent; i++) result *= base;
    return result;
}

long long kattisPotSum(const vector<int>& nums) {   // each number is base digits followed by one exponent digit
    long long total = 0;
    for (int x : nums) total += kattisPower(x / 10, x % 10);
    return total;
}

string kattisInitials(const string& name) {         // first letter of every hyphen-separated word
    string result;
    for (size_t i = 0; i < name.size(); i++)
        if (i == 0 || name[i - 1] == '-') result += name[i];
    return result;
}

long long kattisSingle(const vector<long long>& codes) {   // every value appears twice except one
    long long x = 0;
    for (long long c : codes) x ^= c;
    return x;
}`,
      },
      {
        title: "Variants",
        body: `The starter problems vary the story but reuse a small set of ideas.

Cumulative balance tasks, such as a data plan with carry-over, look like a month-by-month simulation but have a closed form: what you have received minus what you have used. Simulating is also fine for 100 months. Pick the one you can write without a mistake.

Counting with scoring, such as Seven Wonders, counts letters of each kind, squares each count and adds a bonus for each complete set, which is the smallest of the counts. Using a small array of counters keeps the code clear.

Pattern-finding tasks, such as Planina, give the first few results of a process (2, 3, 5, 9 points per side for n = 0, 1, 2, 3) and ask for a later one. Compute the first terms by hand, spot the pattern (2^n + 1 per side), then apply it. Always check the pattern against a term you did not use to find it.

Set difference tasks, such as Bijele, subtract what you have from a fixed target list, and the answer may be negative where you have too many.

String and clock tasks, such as Autori and Spavanac, are one-pass transforms.

When a Kattis problem feels harder than these, the same approach still helps: solve a tiny case by hand, find the rule, and keep the code as short as the rule.`,
      },
      {
        title: "Complexity",
        body: `The starter problems have tiny limits, so complexity rarely decides the outcome, but it is good practice to state it anyway.

A formula or a few arithmetic operations is O(1). A single pass over a list or a string is O(n). Powers with a tiny exponent cost at most nine multiplications per number, so a list of 100 numbers costs under a thousand operations. XOR cancellation is O(n) time and O(1) space, which beats the obvious solution of counting with a map (O(n) space) or sorting (O(n log n) time).

In the larger stress inputs of this app, lists reach 10^5 elements and strings reach 10^5 characters. A method that is linear in the input finishes in a millisecond; a method that is quadratic does not. That is enough to catch the nested-loop version of a one-pass problem. The Odd Man Out stress input has about 10^5 codes, so any solution that checks each code against every other one fails the time limit.

Memory is not a concern at this level, provided you do not store more than the input. XOR needs one variable. A single pass over a string builds an output of at most the same length.

Knowing the cost also tells you when not to worry. If a problem has n at most 100, choose the clearest code. Spend your effort on correctness, not on speed.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Short problems hide short traps.

Types: a sum of powers needs long long, because 30^9 does not fit in an int. XOR of codes up to 2 * 10^9 needs a type wider than int, or an unsigned one. The mean formula 2 * s - r1 can reach 3000 in magnitude and still fits an int.

Signs and negative remainders: in C++ the remainder of a negative number is negative, so (-15) % 1440 is -15, not 1425. That is why the clock formula adds 1440 before taking the modulo. Write the wrap as ((x % m) + m) % m when x may be negative.

Boundaries of the cycle: 0:00 minus 45 minutes is 23:15, and 0:44 minus 45 minutes is 23:59. Test the times at hour boundaries: 1:00, 12:45, 23:59.

Misread rules: Seven Wonders adds 7 points per complete set, and the number of complete sets is the minimum of the three counts, not the maximum. Tarifa counts the month you are asking about as well as the ones already used, so the number of months with a data allowance is one more than the number of used entries.

Single element inputs: a name with no hyphen has one initial, a list with one code returns that code, and a power with exponent 0 is 1.

Always run the sample from the statement first. If the sample fails, the misunderstanding is in the rule, not in the code.`,
      },
      {
        title: "Practice order",
        body: `Begin with the arithmetic ones: R2 (Kattis), Pot (Kattis) and Tarifa (Kattis). They check that you read the rule exactly and pick a wide enough type.

Then do the clock and string problems: Spavanac (Kattis) for wrap-around arithmetic and Autori (Kattis) for a one-pass string transform.

Move on to Odd Man Out (Kattis), where XOR cancellation replaces counting, and finish with the pattern-finding problems Planina (Kattis) and Bijele (Kattis), where you compute a few cases by hand before you write a formula.

For each problem, run the statement's sample, then at least two inputs of your own: the smallest allowed and one at the largest limit. When all of these pass, read the large stress input labels in the app and make sure your solution has no hidden quadratic step.`,
      },
    ],
  },
};
