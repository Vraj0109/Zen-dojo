import type { PatternArticle } from "./types";

// Full pattern articles, group "Greedy, math, advanced" (step 10): greedy-proof, exchange-argument, number-theory, combinatorics, geometry, segment-tree, sparse-table, ordered-set, randomized, design-ds (plan 0008). Format and rules: plan 0007. Code is C++17. Blocks of one article are
// concatenated and compiled together, so helper names are unique per article.

export const DSA_ARTICLES_K: Record<string, PatternArticle> = {
  "greedy-proof": {
    intro:
      "A greedy algorithm builds an answer by making the choice that looks best right now and never revisiting it. It is the fastest kind of algorithm when it is correct and the most dangerous when it is not, because a wrong greedy looks convincing on small examples. This article is about the second half of the job: how to convince yourself, and an interviewer, that a local choice is globally safe, using the stays-ahead argument and the invariant a greedy loop carries.",
    sections: [
      {
        title: "The intuition",
        body: `Jump Game gives you an array where each number is the farthest you can jump from that position, and asks whether you can reach the last index starting from the first. A search over all jump sequences would be exponential. A greedy view is much simpler: walk from left to right and remember the farthest index you can reach so far. If you ever stand at an index that is beyond that frontier, you are stuck. If the frontier reaches the last index, you win. You never need to decide which jump to take, because any position at or before the frontier is reachable, and the farthest one you can get to is all that matters for the future.

That is the shape of a good greedy: the state you carry is a single number or a small summary (the frontier), the summary can only improve as you scan, and a better summary is never worse for what comes later. Other familiar examples: Gas Station (keep a running tank and restart the start point when it goes negative), Candy (satisfy the left neighbours in one pass and the right neighbours in another), Partition Labels (cut as soon as the farthest last occurrence of everything seen so far is behind you), Task Scheduler (always run the task with the most work left).

Greedy is tempting because it is short, but short code is not evidence. The test is a proof, and the proof has a recognisable form: show that after each step, the greedy solution is at least as good as any other solution could be at that step, and that being at least as good now means being at least as good at the end. The rest of this article shows how to write that proof in a few sentences.`,
      },
      {
        title: "Why it works",
        body: `There are two standard proof styles. In both you compare the greedy solution G with an arbitrary optimal solution O.

Stays ahead. Define a measure of progress after each step, such as the farthest index reached, the number of intervals scheduled, or the total fuel in the tank. Prove by induction that after step k the greedy measure is at least as good as the measure of any other strategy after k steps. The base case is the empty prefix, where both are equal. In the induction step, any strategy's next step is one of the options greedy also had, and greedy picked the option that gives the best measure, so it stays ahead. When the process ends, being ahead on the measure means greedy's final answer is at least as good as the optimum, which means it is optimal. For Jump Game the measure is the frontier: after processing index i, greedy's frontier is the maximum over all positions up to i of position plus jump length, and no strategy can reach farther.

Exchange (covered in the next article). Take an optimal solution that differs from greedy in the first choice and swap its first choice for greedy's without making it worse. Repeating the swap turns O into G without losing quality, so G is optimal.

For Gas Station the proof has two parts. First, a solution exists exactly when the total fuel is at least the total cost, because going around the circle once uses each segment once. Second, if you start at A and first run out of fuel at B, then no station between A and B can be a valid start either: each of them would arrive at B with no more fuel than A had, because A reached them with a non-negative tank. So you can skip all of them and try B + 1. This skipping is what makes one pass enough, and the argument that no skipped station could have worked is the proof that the greedy restart is safe.

A greedy proof also tells you when the method fails. If a local choice can hurt a later option in a way you cannot undo, as in coin change with coins 1, 3, 4 and amount 6 (greedy takes 4 + 1 + 1 but 3 + 3 is shorter), the stays-ahead step breaks: the best measure now is not best for the future.`,
      },
      {
        title: "A worked example",
        body: `Trace Gas Station with gas = [1, 2, 3, 4, 5] and cost = [3, 4, 5, 1, 2]. At station i you gain gas[i] and then pay cost[i] to reach the next station. The differences gas[i] - cost[i] are [-2, -2, -2, 3, 3], and their sum is 0, which is not negative, so a valid start exists.

Scan with a running tank and a candidate start s = 0.
Station 0: tank = 0 + (-2) = -2, which is negative, so no start at or before this station can work. Reset: s = 1, tank = 0.
Station 1: tank = -2, negative. Reset: s = 2, tank = 0.
Station 2: tank = -2, negative. Reset: s = 3, tank = 0.
Station 3: tank = 3.
Station 4: tank = 6.

The scan finishes with tank non-negative, and the total is non-negative, so the answer is s = 3. Check by driving: start at station 3 with 0, gain 4, pay 1, tank 3, arrive at station 4; gain 5, pay 2, tank 6, arrive at station 0; gain 1, pay 3, tank 4, arrive at station 1; gain 2, pay 4, tank 2, arrive at station 2; gain 3, pay 5, tank 0, arrive at station 3. The tank never went negative.

For Jump Game on [2, 3, 1, 1, 4]: at index 0 the frontier is 0 + 2 = 2. At index 1 (inside the frontier) it becomes max(2, 1 + 3) = 4, which is the last index, so the answer is true. On [3, 2, 1, 0, 4] the frontier is 3 after index 0 and stays 3, and at index 4 we are beyond it, so the answer is false.`,
      },
      {
        title: "Implementation",
        body: `The two single-pass loops. canJump keeps the frontier and returns false the moment the current index is beyond it. canCompleteCircuit keeps two sums: the total over the whole circle, to decide if any start exists, and the tank since the last reset, to find where the valid start is. When the tank goes negative, the next station becomes the candidate start and the tank restarts at zero. Each function reads every element exactly once.`,
        code: `bool canJump(const vector<int>& nums) {
    int frontier = 0;  // farthest index reachable so far
    for (int i = 0; i < (int)nums.size(); i++) {
        if (i > frontier) return false;
        frontier = max(frontier, i + nums[i]);
    }
    return true;
}

int canCompleteCircuit(const vector<int>& gas, const vector<int>& cost) {
    int total = 0, tank = 0, start = 0;
    for (int i = 0; i < (int)gas.size(); i++) {
        int diff = gas[i] - cost[i];
        total += diff;
        tank += diff;
        if (tank < 0) {  // nobody from start to i can make it past i
            start = i + 1;
            tank = 0;
        }
    }
    return total >= 0 ? start : -1;
}`,
      },
      {
        title: "Implementation: scanning from both sides and cutting early",
        body: `Candy gives each child at least one candy and more than a neighbour with a lower rating; the minimum total is found with two passes. A left-to-right pass makes every child with a higher rating than the left neighbour exceed it, and a right-to-left pass does the same for the right neighbour, keeping the larger of the two requirements. Partition Labels cuts a string into as many parts as possible so that each letter appears in one part only: record the last position of every letter, then extend the current part to the farthest last position seen, and cut when the scan reaches it.`,
        code: `int minCandies(const vector<int>& ratings) {
    int n = ratings.size();
    vector<int> candies(n, 1);
    for (int i = 1; i < n; i++) {
        if (ratings[i] > ratings[i - 1]) candies[i] = candies[i - 1] + 1;
    }
    for (int i = n - 2; i >= 0; i--) {
        if (ratings[i] > ratings[i + 1]) candies[i] = max(candies[i], candies[i + 1] + 1);
    }
    return accumulate(candies.begin(), candies.end(), 0);
}

vector<int> partitionLabelSizes(const string& s) {
    int last[26] = {0};
    for (int i = 0; i < (int)s.size(); i++) last[s[i] - 'a'] = i;
    vector<int> sizes;
    int start = 0, end = 0;
    for (int i = 0; i < (int)s.size(); i++) {
        end = max(end, last[s[i] - 'a']);
        if (i == end) {
            sizes.push_back(end - start + 1);
            start = i + 1;
        }
    }
    return sizes;
}`,
      },
      {
        title: "Variants",
        body: `Greedy appears in many guises. Interval scheduling picks the job that ends first. Huffman coding repeatedly merges the two lightest nodes. Minimum spanning trees (Kruskal and Prim) take the cheapest safe edge, with the cut property as the proof. Dijkstra settles the nearest unsettled vertex. Fractional knapsack takes items by value per weight. Many array problems reduce to a frontier or a running balance, like the two functions above. Task Scheduler and Reorganize String use a priority queue to always take the most frequent item. In each case the proof is the same pair of ideas: a measure that greedy keeps maximal, or a swap that never hurts. If you cannot write the proof in three sentences, suspect the greedy and test it against brute force on small random inputs.`,
      },
      {
        title: "Complexity",
        body: `Most greedy loops are a single pass, O(n) time and O(1) extra memory, as in Jump Game and Gas Station. Greedy that needs an ordering costs O(n log n) for the sort, and greedy that selects the best from a changing set costs O(n log n) with a heap. Candy and Partition Labels use O(n) extra memory for their arrays. The low cost is the reason to look for a greedy solution first and the reason to be careful: a greedy that is fast and wrong is worse than a slower dynamic program that is right. The standard way to protect yourself is to implement the obvious exhaustive or DP solution for small inputs and compare outputs on random cases before trusting the greedy.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `The commonest error is to accept a greedy because it works on the examples. Coin systems, knapsack with indivisible items and shortest paths with negative edges all have natural greedy rules that fail; the proof, not the examples, is what counts. Second, check the loop invariants at the boundaries: an empty array, a single element, and the case where the first element is zero in Jump Game (you cannot move, unless the array has length one). Third, in Gas Station remember to check the total, because the single pass finds a start but does not by itself prove that the whole circle is possible. Fourth, ties: when two choices look equally good, make sure the proof does not depend on how you break the tie, or say how it is broken. Fifth, in two-pass solutions like Candy, take the maximum of the two passes, not the second pass alone. Sixth, integer overflow in frontier arithmetic (i + nums[i]) is not an issue for small inputs but should be checked against the constraints.`,
      },
      {
        title: "Practice order",
        body: `Start with Jump Game and prove it with the frontier measure. Gas Station comes next: write the two-sentence argument for why skipping stations is safe before you code it. Candy teaches the two-pass pattern and the idea that a constraint on both neighbours can be satisfied one side at a time. Partition Labels shows a greedy that is driven by precomputed information about the future (the last occurrence of each letter). Task Scheduler brings in a counting argument for the idle slots; do it after the exchange argument article, because the proof is easier with that tool.`,
      },
    ],
  },
  "exchange-argument": {
    intro:
      "The exchange argument is the standard tool for proving that a greedy ordering is optimal: take any optimal solution, show that you can swap two adjacent items into the greedy order without making it worse, and conclude that the greedy order is optimal too. It tells you what to sort by. You reach for it whenever a problem asks you to order, schedule or pick items and the right order is not obvious: intervals by end time, jobs by deadline, tasks by ratio.",
    sections: [
      {
        title: "The intuition",
        body: `Balloons are spread along a line, each one a horizontal interval. An arrow shot straight up bursts every balloon whose interval contains the arrow's x position. What is the fewest arrows that burst all the balloons? Each arrow position is a free choice on a continuous line, so the search space looks enormous. The exchange idea cuts it to one natural candidate.

Sort the balloons by where they end. Look at the balloon that ends first, at position e. Some arrow must burst it, so some arrow lies at or before e and at or after the balloon's start. Suppose an optimal solution places that arrow at x < e. Move it right to e. Could that lose a balloon? Any balloon that contained x ends at or after e, because no balloon ends before the first-ending one, and it starts at or before x, which is before e, so it contains e as well. Nothing is lost. Hence there is an optimal solution with an arrow at the end of the first-ending balloon. Fire it, remove every balloon it bursts, and repeat on what is left.

That small argument, "my optimal solution can be changed to agree with greedy without getting worse", is an exchange argument. It does not say the greedy choice is the only good one. It says it is never worse than the alternatives, which is all you need. The same pattern gives interval scheduling (pick the job that ends first), the minimum number of removals to make intervals non-overlapping, and many ordering problems where you compare two adjacent items and show that one order is at least as good as the other.`,
      },
      {
        title: "Why it works",
        body: `A formal exchange proof has four steps, and writing them in this order keeps you honest.

First, state the greedy rule: for example, sort by end point and always take the next compatible item. Second, take an optimal solution O that disagrees with the greedy solution G; look at the first place where they differ. Third, construct a new solution O' by swapping, in O, the item that O chose at that place for the item greedy chose, adjusting anything affected. Prove that O' is still valid (it respects all constraints) and no worse than O. Fourth, since O' agrees with G on a longer prefix than O did, repeat. After finitely many steps O is transformed into G without ever getting worse, so G is optimal.

The delicate step is the third. For arrows, validity means every balloon is still burst, and the check is the one in the intuition: moving an arrow right to the first end point cannot expose a balloon. For scheduling jobs with deadlines, the swap is of two adjacent jobs: if the one with the later deadline is first, exchanging them cannot increase the lateness of either, because the job moved earlier finishes earlier and the job moved later finishes at the same time the pair used to finish, which is still within the later deadline.

Adjacent swaps give a general recipe for sorting problems. If the cost of a sequence depends on the order, compare two neighbours a and b. If putting a before b is no worse than b before a exactly when some key(a) <= key(b), then sorting by that key is optimal, because any order that is not sorted has an adjacent pair out of order, and fixing that pair does not hurt. The proof is the same as bubble sort terminating.

The counting variant works for Task Scheduler. The most frequent task must be separated by the cooldown, so it forms a skeleton of chunks, and every other task can be placed into the gaps; swapping any task into a gap never creates a new conflict as long as there are enough gaps. When there are more tasks than gaps, no idle time is needed and the answer is just the number of tasks.`,
      },
      {
        title: "A worked example",
        body: `Trace Minimum Number of Arrows to Burst Balloons on the intervals [10, 16], [2, 8], [1, 6], [7, 12]. Sort by end point: [1, 6], [2, 8], [7, 12], [10, 16].

Take the first balloon [1, 6]. Shoot an arrow at its end, x = 6. Which balloons does it burst? [1, 6] contains 6. [2, 8] starts at 2, which is at most 6, so it contains 6 as well. [7, 12] starts at 7, which is greater than 6, so it survives. Arrows so far: 1.

The next surviving balloon is [7, 12], the one ending first among the remaining. Shoot at its end, x = 12. [10, 16] starts at 10 which is at most 12, so it is burst. Arrows: 2. No balloons remain.

The answer is 2. In code this is one scan after the sort: keep the position of the last arrow; if a balloon starts after it, shoot a new arrow at the end of this balloon.

A second example, Reorganize String on "aab": the letter a has two copies and b has one. Always place the most frequent letter that is not the one just placed. The first letter is a. The next candidate cannot be a, so b is used. Then only a is left and the last letter is a. The result is "aba". On "aaab" the heap runs out of other letters while a still has copies left, so the answer is impossible: a needs at least one other letter between each pair of copies, and three copies need two separators, but only one is available.`,
      },
      {
        title: "Implementation",
        body: `The arrows solution. Sort by the end of the interval and compare with less-than rather than subtracting, because subtracting two integers near the limits overflows. Keep the position of the last arrow and count a new arrow when the next balloon starts strictly after it. The related problem of the fewest intervals to remove so that the rest do not overlap uses the same sort: keep an interval if it starts at or after the end of the last kept one, and count the others as removals.`,
        code: `int minArrowShots(vector<vector<int>> points) {
    if (points.empty()) return 0;
    sort(points.begin(), points.end(), [](const vector<int>& a, const vector<int>& b) { return a[1] < b[1]; });
    int arrows = 1;
    long long lastArrow = points[0][1];
    for (size_t i = 1; i < points.size(); i++) {
        if (points[i][0] > lastArrow) {  // this balloon was missed
            arrows++;
            lastArrow = points[i][1];
        }
    }
    return arrows;
}

int minIntervalsToRemove(vector<vector<int>> intervals) {
    if (intervals.empty()) return 0;
    sort(intervals.begin(), intervals.end(), [](const vector<int>& a, const vector<int>& b) { return a[1] < b[1]; });
    int kept = 1;
    int lastEnd = intervals[0][1];
    for (size_t i = 1; i < intervals.size(); i++) {
        if (intervals[i][0] >= lastEnd) {
            kept++;
            lastEnd = intervals[i][1];
        }
    }
    return (int)intervals.size() - kept;
}`,
      },
      {
        title: "Implementation: always take the most frequent",
        body: `Reorganize String rearranges the letters so that no two equal letters are adjacent, or reports that it is impossible. Count the letters, put them in a max-heap by count, and repeatedly take the most frequent letter that differs from the one just written. The letter just used is held back for one step and returned to the heap with a reduced count. If the heap is empty while a held-back letter still has copies, the arrangement is impossible. The exchange argument is that the most frequent letter is the one at greatest risk of running out of separators, so it must be placed as early as allowed.`,
        code: `string reorganizeString(const string& s) {
    int count[26] = {0};
    for (char c : s) count[c - 'a']++;
    priority_queue<pair<int, char>> heap;
    for (int i = 0; i < 26; i++) {
        if (count[i] > 0) heap.push({count[i], char('a' + i)});
    }
    string result;
    pair<int, char> held = {0, 0};  // the letter used on the previous step
    while (!heap.empty()) {
        pair<int, char> top = heap.top();
        heap.pop();
        result.push_back(top.second);
        top.first--;
        if (held.first > 0) heap.push(held);
        held = top;
    }
    return held.first > 0 ? string() : result;
}`,
      },
      {
        title: "Variants",
        body: `The same proof technique covers a wide range. Interval scheduling by earliest end time maximises the number of compatible intervals. Scheduling to minimise maximum lateness sorts by deadline (earliest deadline first). Minimising the weighted sum of completion times sorts by the ratio of weight to duration. Merging files with the smallest total cost always merges the two smallest, which is Huffman coding. The minimum number of platforms or meeting rooms sorts start and end times separately. Largest Number (arrange numbers to form the largest concatenation) sorts with the comparator a + b > b + a, which an adjacent-swap argument shows to be a valid total order. Task Scheduler has a closed form: with the highest frequency f and m tasks sharing that frequency, the answer is max(number of tasks, (f - 1) * (cooldown + 1) + m). If you find a rule, test it by trying to break it with a swap of two neighbours.`,
      },
      {
        title: "Complexity",
        body: `Exchange-argument algorithms are dominated by the sort or the heap: O(n log n) time. The scans after sorting are O(n), and the extra memory is O(1) for interval problems and O(k) for the heap of k distinct items in Reorganize String. A closed-form answer such as the Task Scheduler formula is O(n) to count frequencies and O(1) to evaluate. The speed is the payoff of the proof: without the exchange argument you would be searching permutations, which is factorial. When the proof fails, the same problem often needs dynamic programming with a much higher cost, so the argument is also a quick way to decide which approach to use.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Choosing the wrong sort key is the main trap. For arrows and non-overlapping intervals the key is the end point; sorting by start point gives wrong answers on a long interval that contains many short ones. Second, boundary conditions: whether touching intervals overlap depends on the statement. In the arrows problem a balloon that starts exactly where an arrow lands is burst, so the comparison is strictly greater; in the removal problem an interval that starts at the previous end is compatible, so the comparison is greater or equal. Third, ties in the sort do not matter for correctness here, but check that your comparator is a strict weak ordering, because a comparator using less-or-equal can crash std::sort. Fourth, subtracting two ints in a comparator can overflow; compare instead. Fifth, an empty input should return zero without indexing the first element. Sixth, for the heap solution, remember to put the held-back letter back after one step, and to detect an impossible case when the heap empties early.`,
      },
      {
        title: "Practice order",
        body: `Begin with Minimum Number of Arrows to Burst Balloons: write the exchange proof in three sentences, then code it. Do the removal variant (Non-overlapping Intervals) right after, to see that only the comparison changes. Then Reorganize String, which uses a heap to apply the same idea to an arrangement problem, and finish with Task Scheduler, where the exchange argument becomes a counting argument and the answer has a closed form that you can check against a simulation.`,
      },
    ],
  },
  "number-theory": {
    intro:
      "Number theory in interviews and contests is a small toolbox: the greatest common divisor, the sieve of Eratosthenes for primes, fast exponentiation, and arithmetic modulo a prime including modular inverses and binomial coefficients. You reach for it when a problem asks about divisibility or primes up to a limit, when the answer must be reported modulo 10^9 + 7, or when a power is so large that you cannot multiply it out.",
    sections: [
      {
        title: "The intuition",
        body: `Four ideas cover most problems.

First, the greatest common divisor. Euclid's observation is that gcd(a, b) = gcd(b, a mod b): any common divisor of a and b also divides the remainder, and the other way round. Repeating the step shrinks the numbers quickly and ends when the remainder is zero. The least common multiple follows as a / gcd * b, divided first to avoid overflow.

Second, primes below a limit. To list the primes below n, write all numbers from 2 up, take the smallest unmarked number, call it prime, and cross out its multiples. Every composite number has a prime factor not larger than its square root, so it is crossed out by the time you have processed the primes up to the square root. The remaining numbers are the primes. That is the sieve of Eratosthenes, and it is the answer to Count Primes.

Third, fast exponentiation. To compute x to the power n you do not need n multiplications. Write n in binary. Squaring repeatedly gives x^1, x^2, x^4, x^8 and so on, and the powers needed for n are the ones at the positions of the one bits. About log n squarings and at most log n extra multiplications suffice. With a modulus, take the remainder after every multiplication so the numbers stay small.

Fourth, modular arithmetic. Many answers are huge and the statement asks for them modulo a prime p such as 10^9 + 7. Addition, subtraction and multiplication can be done on remainders. Division cannot: you multiply by the modular inverse instead, the number y with x * y = 1 modulo p. When p is prime, Fermat's little theorem says x^(p - 1) = 1 modulo p, so the inverse of x is x^(p - 2), which fast exponentiation computes. With inverses, binomial coefficients modulo p follow from precomputed factorials.`,
      },
      {
        title: "Why it works",
        body: `Each tool has a short justification worth knowing.

Euclid's algorithm. Let d be a common divisor of a and b. Then d divides a - q * b for every integer q, so it divides the remainder a mod b. Conversely any common divisor of b and the remainder divides a = q * b + r. The two pairs have the same set of common divisors, hence the same greatest one. Termination: the remainder is smaller than b each time, so the second argument strictly decreases. Moreover after two steps the larger number at least halves, so the number of steps is logarithmic.

The sieve. A composite number m has a divisor d with 2 <= d <= sqrt(m). Take the smallest prime factor p of m; then p <= sqrt(m) and m is a multiple of p that is at least p * p. So it is enough to cross out multiples of p starting from p * p, and it is enough to process primes up to the square root of the limit. Every number that survives has no prime factor up to its own square root, so it is prime. The total work is the sum over primes p of n / p, which is about n log log n.

Fast power. If n is even, x^n = (x^(n/2))^2; if n is odd, x^n = x * x^(n-1). Each step halves the exponent or reduces it to an even number, so there are at most two multiplications per bit. For a negative exponent use 1 / x^|n|, and be careful with the minimum integer, whose absolute value does not fit in an int.

Modular inverse. If p is prime and x is not a multiple of p, Fermat gives x^(p-1) = 1 modulo p, so x * x^(p-2) = 1 and x^(p-2) is the inverse. For a modulus that is not prime, the inverse exists only when gcd(x, m) = 1 and is found with the extended Euclidean algorithm. Binomials: C(n, k) = n! / (k! (n - k)!), and modulo a prime larger than n each factorial is non-zero, so the division is a multiplication by inverse factorials.

The reason every operation can be reduced modulo p at every step is that (a + b) mod p, (a - b) mod p and (a * b) mod p depend only on a mod p and b mod p. Results of subtractions must be adjusted by adding p to avoid negative remainders.`,
      },
      {
        title: "A worked example",
        body: `Count the primes below 30 with the sieve. Start with 2 to 29 unmarked. Take 2 and cross out 4, 6, 8, ..., 28. Take 3 and cross out multiples starting from 9: 9, 12, 15, 18, 21, 24, 27. Take 5 and cross out from 25: 25 only, since 30 is outside the range. The next unmarked number is 7, but 7 * 7 = 49 is beyond the limit, so we stop. The unmarked numbers are 2, 3, 5, 7, 11, 13, 17, 19, 23, 29: ten primes.

Compute 3 to the power 13 modulo 1000 with fast exponentiation. Write 13 in binary: 1101. Keep result = 1 and base = 3, and process the bits from the lowest.
Bit 1 (set): result = 1 * 3 = 3. base = 3 * 3 = 9.
Bit 0 (clear): result stays 3. base = 9 * 9 = 81.
Bit 1 (set): result = 3 * 81 = 243. base = 81 * 81 = 6561, which is 561 modulo 1000.
Bit 1 (set): result = 243 * 561 = 136323, which is 323 modulo 1000. base is no longer needed.

The answer is 323. Check: 3^13 = 1594323, and its last three digits are 323. Only four squarings and three multiplications were needed instead of twelve multiplications.

The inverse of 3 modulo 7 is 3^(7 - 2) = 3^5 = 243, and 243 mod 7 = 5. Indeed 3 * 5 = 15, which is 1 modulo 7. For the binomial coefficient C(5, 2) modulo any large prime, factorials give 120 / (2 * 6) = 10.`,
      },
      {
        title: "Implementation",
        body: `The gcd and the sieve. The gcd uses the loop form of Euclid's algorithm. The sieve marks composites in a boolean array; for each prime p it starts at p * p and steps by p, using a 64-bit index for p * p to avoid overflow when the limit is large. Count Primes asks for the primes strictly below n, so the array has n entries and indices 0 and 1 are not prime.`,
        code: `long long gcdOf(long long a, long long b) {
    while (b != 0) {
        long long r = a % b;
        a = b;
        b = r;
    }
    return a;
}

int countPrimesBelow(int n) {
    if (n < 3) return 0;
    vector<char> composite(n, 0);
    int count = 0;
    for (int i = 2; i < n; i++) {
        if (composite[i]) continue;
        count++;
        for (long long j = (long long)i * i; j < n; j += i) composite[j] = 1;
    }
    return count;
}`,
      },
      {
        title: "Implementation: powers and inverses",
        body: `Fast exponentiation with a modulus processes the exponent bit by bit; the intermediate products fit in 64 bits as long as the modulus is below about 3 * 10^9. The inverse for a prime modulus is a call with exponent p - 2. The real-valued power for Pow(x, n) uses the same halving, handling a negative exponent by inverting at the end; the exponent is widened to a 64-bit integer first so that the most negative value can be negated safely.`,
        code: `long long powMod(long long base, long long exp, long long mod) {
    long long result = 1 % mod;
    base %= mod;
    while (exp > 0) {
        if (exp & 1) result = result * base % mod;
        base = base * base % mod;
        exp >>= 1;
    }
    return result;
}

long long modInverse(long long x, long long primeMod) {
    return powMod(x, primeMod - 2, primeMod);  // Fermat's little theorem
}

double powReal(double x, long long n) {
    bool negative = n < 0;
    unsigned long long e = negative ? 0ULL - (unsigned long long)n : (unsigned long long)n;
    double result = 1.0;
    while (e > 0) {
        if (e & 1) result *= x;
        x *= x;
        e >>= 1;
    }
    return negative ? 1.0 / result : result;
}`,
      },
      {
        title: "Implementation: binomial coefficients modulo a prime",
        body: `When many binomials are needed, precompute factorials and inverse factorials once. The inverse factorials are computed from the top: the inverse of n! by one modular power, and each smaller one by multiplying by the next index. Then C(n, k) is three multiplications. The struct below stores the tables for one prime modulus and answers zero for impossible arguments, which is the convention in counting problems.`,
        code: `struct BinomialMod {
    long long mod;
    vector<long long> fact, invFact;

    BinomialMod(int limit, long long primeMod) : mod(primeMod), fact(limit + 1, 1), invFact(limit + 1, 1) {
        for (int i = 1; i <= limit; i++) fact[i] = fact[i - 1] * i % mod;
        invFact[limit] = powMod(fact[limit], mod - 2, mod);
        for (int i = limit; i > 0; i--) invFact[i - 1] = invFact[i] * i % mod;
    }

    long long choose(int n, int k) const {
        if (k < 0 || k > n) return 0;
        return fact[n] * invFact[k] % mod * invFact[n - k] % mod;
    }
};`,
      },
      {
        title: "Variants",
        body: `The extended Euclidean algorithm finds integers x and y with a * x + b * y = gcd(a, b), which gives inverses for any modulus coprime to a and solves linear Diophantine equations. Prime factorisation by trial division up to the square root handles a single number; a smallest-prime-factor sieve factorises many numbers quickly. Euler's totient counts the numbers up to n that are coprime to it, and generalises Fermat's theorem to composite moduli. The Chinese remainder theorem combines congruences with coprime moduli. Super Pow computes a to a huge exponent given as an array of digits, by applying x^(10 * d + e) = (x^d)^10 * x^e digit by digit, or by reducing the exponent modulo the totient. Matrix exponentiation uses the same halving as fast power and computes linear recurrences such as Fibonacci in logarithmic time. Segmented sieves find primes in a range far from zero.`,
      },
      {
        title: "Complexity",
        body: `Euclid's algorithm takes O(log min(a, b)) steps. The sieve takes O(n log log n) time and O(n) memory, which is fine for n up to about 10^7. Fast power takes O(log n) multiplications. Factorial tables take O(n) time to build and give O(1) binomials after that. Trial division factorisation takes O(sqrt n). Because every operation works on remainders, the numbers never exceed the modulus squared, so with a modulus near 10^9 the products fit in a signed 64-bit integer. A modulus near 10^18 needs 128-bit multiplication or a different method.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Overflow is the main danger: multiply two numbers below 10^9 + 7 in 64 bits, never in 32. Reduce after every multiplication, not at the end. Negative remainders: in C++ the remainder of a negative number is negative, so after subtraction add the modulus and reduce again. The inverse by Fermat only works for a prime modulus and for an argument that is not a multiple of it. In the sieve start crossing out at i * i with a wide index, and remember that the limit is exclusive in Count Primes. For Pow(x, n), the exponent -2^31 cannot be negated in a 32-bit int, and x = 0 with a negative exponent is undefined. The least common multiple a * b / gcd overflows if you multiply first; divide first. Finally, compute factorial tables up to the largest argument you will need, and check that the limit is below the modulus, otherwise a factorial is zero and the inverse does not exist.`,
      },
      {
        title: "Practice order",
        body: `Start with Count Primes to write the sieve and understand why it starts at i * i. Then Pow(x, n), which forces you to handle negative exponents and the overflow of the minimum integer. Super Pow combines fast power with modular reduction of a very large exponent. After these, implement Modular inverse and nCr mod p from the roadmap on your own: build the factorial tables, test them against Pascal's triangle for small n, and use them in a counting problem such as the number of paths in a grid.`,
      },
    ],
  },
  combinatorics: {
    intro:
      "Combinatorics and probability problems ask how many arrangements satisfy a condition, or what is the chance or the average outcome of a random process. The interview versions are mostly counting by formula (choose, arrange, split into cases) and sampling algorithms that must give every item the right probability. You reach for it when brute-force enumeration is impossible but the structure of the problem has a clean count, or when a random pick must be uniform or weighted.",
    sections: [
      {
        title: "The intuition",
        body: `Start with a robot on a grid with m rows and n columns that moves only right or down from the top-left to the bottom-right. How many routes? Any route consists of exactly m - 1 moves down and n - 1 moves right, in some order. A route is therefore completely described by choosing which of the m + n - 2 move slots are the down moves. The count is the number of ways to choose m - 1 positions out of m + n - 2, written C(m + n - 2, m - 1). For a grid with 3 rows and 7 columns that is C(8, 2) = 28. No search was needed: the problem was turned into choosing a subset.

Counting problems rest on a few rules. The rule of sum: if a task can be done in one of two exclusive ways, the counts add. The rule of product: if you make independent choices one after another, the counts multiply. Permutations count ordered selections, n! for all items and n! / (n - k)! for k of them. Combinations count unordered selections, C(n, k) = n! / (k! (n - k)!). When items repeat, divide by the factorials of the repeat counts. Inclusion and exclusion counts the union of overlapping cases by adding the singles, subtracting the pairs, adding the triples, and so on.

Probability uses the same counting. When all outcomes are equally likely, the probability of an event is the number of favourable outcomes over the total. Expected value is the sum of value times probability, and the linearity of expectation says that the expected value of a sum is the sum of the expected values, even when the parts depend on each other. That fact solves many problems in one line: the expected number of fixed points of a random permutation is n * (1 / n) = 1.

Sampling problems turn probabilities into algorithms. Pick an element with probability proportional to its weight, or pick uniformly from a stream whose length you do not know: the answer is reservoir sampling.`,
      },
      {
        title: "Why it works",
        body: `Each counting formula is justified by a bijection: a one-to-one correspondence between the objects you want to count and objects whose number you know. Routes in a grid correspond to subsets of move slots, which is why the binomial coefficient counts them. The identity C(n, k) = C(n - 1, k - 1) + C(n - 1, k) comes from splitting the subsets by whether they contain a particular element; it is the recurrence behind Pascal's triangle and gives a dynamic programming way to compute binomials without division or overflow from large factorials.

For sampling, correctness is a probability statement that you can verify directly. Weighted random pick: build the prefix sums of the weights, draw a uniform integer r from 1 to the total weight, and return the first index whose prefix sum is at least r. Index i owns exactly w[i] of the values from 1 to the total, so it is chosen with probability w[i] / total.

Reservoir sampling of one item from a stream: keep the first item; when the k-th item arrives, replace the current choice with it with probability 1 / k. Claim: after k items each has probability 1 / k of being the chosen one. Induction: for k = 1 it is trivial. For k + 1, the new item is chosen with probability 1 / (k + 1), and an old item survives if it was chosen (probability 1 / k) and was not replaced (probability k / (k + 1)), giving 1 / (k + 1). So the invariant holds. This works without knowing the stream length and with memory for a single item, which is what makes it the right tool for Linked List Random Node.

Linearity of expectation needs no independence, which is why it is so powerful, but it applies to expectations only; the probability of an event is not the product of probabilities unless the events are independent. Mixing these up is the classic mistake in probability questions.`,
      },
      {
        title: "A worked example",
        body: `Count the routes through a 3 by 7 grid with Pascal's triangle. The number of routes to a cell equals the number to the cell above plus the number to the cell on its left, with ones along the first row and first column. Row one: 1 1 1 1 1 1 1. Row two: 1 2 3 4 5 6 7. Row three: 1 3 6 10 15 21 28. The corner holds 28, matching C(8, 2) = 8 * 7 / 2 = 28. The same numbers appear as a diagonal of Pascal's triangle, which is why the two methods agree.

A weighted random pick with weights [1, 3, 2]. The prefix sums are [1, 4, 6] and the total is 6. Draw r from 1 to 6. Values 1 give index 0, values 2, 3, 4 give index 1, values 5 and 6 give index 2. Their probabilities are 1/6, 3/6 and 2/6, proportional to the weights. The lookup is a binary search for the first prefix sum that is at least r: for r = 4 the first prefix sum at least 4 is 4 at index 1.

An expected value example: how many fair die rolls are needed on average to see every face at least once? After you have seen i distinct faces, the chance that the next roll shows a new one is (6 - i) / 6, and the expected number of rolls to get it is 6 / (6 - i). Summing for i from 0 to 5 gives 6 * (1 + 1/2 + 1/3 + 1/4 + 1/5 + 1/6) = 14.7. Linearity of expectation turned a hard-looking process into six easy waiting times.`,
      },
      {
        title: "Implementation",
        body: `Binomial coefficients by Pascal's recurrence, with a table so that no division is needed and no factorial overflows. The table has (n + 1) rows and entries up to k; the value C(n, k) is built from the row above. The unique paths function then reduces the grid problem to a single binomial. For numbers too big for 64 bits, take the remainder at every addition, which Pascal's recurrence allows because it only adds.`,
        code: `long long choose(int n, int k) {
    if (k < 0 || k > n) return 0;
    k = min(k, n - k);
    vector<vector<long long>> table(n + 1, vector<long long>(k + 1, 0));
    for (int i = 0; i <= n; i++) {
        table[i][0] = 1;
        for (int j = 1; j <= min(i, k); j++) {
            table[i][j] = table[i - 1][j - 1] + (j <= i - 1 ? table[i - 1][j] : 0);
        }
    }
    return table[n][k];
}

long long uniquePathsByChoice(int rows, int cols) {
    return choose(rows + cols - 2, rows - 1);
}`,
      },
      {
        title: "Implementation: weighted and streaming random picks",
        body: `Random Pick with Weight stores the prefix sums once and answers each pick with a binary search, so a pick costs O(log n). Linked List Random Node uses reservoir sampling because the length of the list is not known and the list should be read once: the k-th node replaces the current choice with probability 1 / k. Both structures take a random generator so that tests can fix the seed and check the frequencies.`,
        code: `struct WeightedPicker {
    vector<long long> prefix;
    mt19937 rng;

    WeightedPicker(const vector<int>& weights, unsigned seed) : rng(seed) {
        long long running = 0;
        for (int w : weights) {
            running += w;
            prefix.push_back(running);
        }
    }

    int pick() {
        long long r = uniform_int_distribution<long long>(1, prefix.back())(rng);
        return int(lower_bound(prefix.begin(), prefix.end(), r) - prefix.begin());
    }
};

int reservoirPick(const vector<int>& stream, mt19937& rng) {
    int chosen = 0;
    for (int k = 1; k <= (int)stream.size(); k++) {
        if (uniform_int_distribution<int>(1, k)(rng) == 1) chosen = stream[k - 1];  // chance 1 / k
    }
    return chosen;
}`,
      },
      {
        title: "Variants",
        body: `Counting variants include arrangements with repeated letters (divide by the factorials of the counts), derangements (permutations with no fixed point, by inclusion and exclusion or the recurrence D(n) = (n - 1) * (D(n - 1) + D(n - 2))), Catalan numbers (balanced parentheses, binary trees, paths that do not cross a diagonal), and stars and bars (distributing identical items into boxes: C(n + k - 1, k - 1)). Counting modulo a prime uses the factorial and inverse tables from the number theory article. Probability variants include conditional probability and Bayes' rule, expected values by linearity, and random processes that you can simulate and check. Sampling variants include reservoir sampling of k items, shuffling with Fisher-Yates (swap each position with a random earlier or equal position), and random pick with blacklist. For hard counting problems that do not have a closed form, dynamic programming over a state describing the partial arrangement is the usual tool.`,
      },
      {
        title: "Complexity",
        body: `A binomial coefficient by the table costs O(n * k) time and memory, or O(k) with one row. With precomputed factorials modulo a prime it is O(1) per query after an O(n) setup. A weighted pick costs O(n) to build the prefix sums and O(log n) per pick. Reservoir sampling costs O(n) time and O(1) memory for one pick. Linearity of expectation turns many exponential processes into closed forms evaluated in constant or linear time. For counting by formula the main cost is the size of the numbers: factorials exceed 64 bits at 21, so either use the multiplicative form with early division, Pascal's recurrence, or modular arithmetic.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Overflow comes first: n! does not fit in 64 bits beyond 20, and even C(n, k) can overflow for moderate n, so use Pascal's recurrence, reduce modulo the prime, or multiply and divide alternately. Second, double counting: when you split into cases, make sure the cases are disjoint, or use inclusion and exclusion. Third, order matters or not: check whether the statement counts arrangements or selections. Fourth, probability pitfalls: events are multiplied only when independent, and equally likely outcomes must really be equally likely (two dice give 36 outcomes, not 11 sums). Fifth, off-by-one in random ranges: draw from 1 to the total so that the prefix lookup matches, or from 0 to total minus one with a strict comparison. Sixth, use a fixed seed when testing random code, and check the distribution with many samples instead of a single run. Finally, check small cases by brute force enumeration before trusting a formula.`,
      },
      {
        title: "Practice order",
        body: `Begin with Unique Paths, solving it twice: by the grid recurrence and by the binomial formula, and check that they agree. Then Random Pick with Weight, which combines prefix sums and binary search into a sampling algorithm and makes the idea of probability proportional to weight concrete. Linked List Random Node shows reservoir sampling; prove the invariant by induction as in the article. For extra practice write a brute-force checker that counts arrangements for small inputs and compare it with your formulas, which is the best habit for combinatorial problems.`,
      },
    ],
  },
  geometry: {
    intro:
      "Geometry basics in coding problems means working with integer points, segments and axis-aligned rectangles, and avoiding floating point wherever possible. The tools are the cross product (which side of a line a point is on), exact slope comparison with the gcd, and interval overlap in each axis. You reach for it when a problem has points on a plane, overlapping rectangles, or collinearity, and the aim is a correct answer that does not depend on rounding.",
    sections: [
      {
        title: "The intuition",
        body: `Geometry problems in interviews are rarely about angles and trigonometry. They are about deciding relations between simple shapes using integer arithmetic, so that the answer is exact.

Overlapping rectangles show the first idea. Two axis-aligned rectangles overlap in a rectangle whose width is the overlap of their x-intervals and whose height is the overlap of their y-intervals. The overlap of two intervals [a, b] and [c, d] is the length min(b, d) - max(a, c), or zero if that is negative. So the area of the union is the sum of the two areas minus the overlap area. The problem splits into two one-dimensional problems, one per axis, and you already know how to do those.

Collinearity shows the second idea. Three points are on one line exactly when the cross product of two of the vectors between them is zero. The cross product of vectors (ax, ay) and (bx, by) is ax * by - ay * bx. Its sign tells you the turn direction: positive for a counter-clockwise turn, negative for clockwise, zero when the vectors are parallel. No division, no angles, no floating point, just two multiplications and a subtraction on integers.

The third idea is slope as a fraction. To count how many points lie on one line through a fixed point, you group the other points by direction. Two points have the same direction from the anchor if their difference vectors are parallel. Reduce each difference (dx, dy) by dividing by the gcd and fixing the sign, and the reduced pair is a canonical name for the direction. Equal pairs mean collinear with the anchor. This avoids the classic bug of comparing slopes as doubles, where two different slopes can compare equal after rounding.`,
      },
      {
        title: "Why it works",
        body: `The cross product is the signed area of the parallelogram spanned by the two vectors. It is zero exactly when the parallelogram is flat, which means the vectors point along the same line, in the same or opposite directions. That is the algebraic form of "three points are collinear": the vectors from the first point to the other two are parallel. Because it uses only multiplication and subtraction, it is exact for integers as long as the intermediate values fit in the integer type. With coordinates up to 10^4 in absolute value the products reach 4 * 10^8, which fits in 32 bits, and for larger coordinates you use 64-bit integers.

The sign of the cross product also decides the orientation of three points, which is the building block of segment intersection, convex hulls and point-in-polygon tests. Two segments properly cross when the endpoints of each lie on opposite sides of the line through the other, which is a pair of sign tests. The special cases, where an endpoint lies exactly on the other segment, are handled by checking that a collinear point lies within the bounding box of the segment.

For the direction canonicalisation, dividing (dx, dy) by g = gcd(|dx|, |dy|) gives the smallest integer vector in that direction, and fixing the sign so that dx is positive (or dy is positive when dx is zero) identifies opposite directions that lie on the same line through the anchor. Two difference vectors are parallel exactly when their reduced forms are equal, so a hash map from the reduced pair to a count finds the line with the most points through the anchor. Trying every point as the anchor and keeping the best gives the answer, because any line with at least two points passes through some point of the set that you tried as the anchor.

For rectangles, the interval overlap formula works because two intervals intersect exactly when the larger of the left ends is less than the smaller of the right ends, and the length of the intersection is the difference. Two rectangles overlap if and only if both axes overlap, since a point lies in a rectangle exactly when each coordinate lies in the corresponding interval.`,
      },
      {
        title: "A worked example",
        body: `Rectangle Area: the first rectangle has corners (-3, 0) and (3, 4), the second has corners (0, -1) and (9, 2). The first has width 6 and height 4, so area 24. The second has width 9 and height 3, so area 27. The x-intervals are [-3, 3] and [0, 9]: the overlap is min(3, 9) - max(-3, 0) = 3 - 0 = 3. The y-intervals are [0, 4] and [-1, 2]: the overlap is min(4, 2) - max(0, -1) = 2 - 0 = 2. The overlap area is 3 * 2 = 6. The total covered area is 24 + 27 - 6 = 45.

Max Points on a Line with the points (1, 1), (3, 2), (5, 3), (4, 1), (2, 3), (1, 4). Take the anchor (1, 1). The difference vectors to the later points are (2, 1), (4, 2), (3, 0), (1, 2), (0, 3). Reduced by their gcd they are (2, 1), (2, 1), (1, 0), (1, 2), (0, 1). The direction (2, 1) appears twice, so the line through (1, 1), (3, 2) and (5, 3) has 2 + 1 = 3 points. Now take the anchor (3, 2). The vectors to the later points are (2, 1) for (5, 3), (1, -1) for (4, 1), (-1, 1) for (2, 3) and (-2, 2) for (1, 4). The last two reduce to (-1, 1) and then, after fixing the sign, to (1, -1), the same as the vector to (4, 1). The direction (1, -1) appears three times, so the line x + y = 5 holds 3 + 1 = 4 points. No other anchor does better, so the answer is 4. Sign fixing is what made (-1, 1) and (1, -1) count as one line.

Take the simpler set (1, 1), (2, 2), (3, 3): from the anchor (1, 1) the vectors are (1, 1) and (2, 2), both reducing to (1, 1), so the count for that direction is 2, and the line holds 3 points.`,
      },
      {
        title: "Implementation",
        body: `The rectangle union area uses the overlap of the two intervals on each axis, clamped at zero. The result can exceed 32 bits for large coordinates, so the arithmetic uses 64-bit integers. Max Points on a Line fixes each point as an anchor in turn and counts the reduced directions to the points after it, so each line is considered once from its first point. The best count for an anchor is the largest direction count plus one for the anchor itself.`,
        code: `long long coveredArea(int ax1, int ay1, int ax2, int ay2, int bx1, int by1, int bx2, int by2) {
    long long areaA = (long long)(ax2 - ax1) * (ay2 - ay1);
    long long areaB = (long long)(bx2 - bx1) * (by2 - by1);
    long long overlapW = max(0LL, (long long)min(ax2, bx2) - max(ax1, bx1));
    long long overlapH = max(0LL, (long long)min(ay2, by2) - max(ay1, by1));
    return areaA + areaB - overlapW * overlapH;
}

int maxPointsOnLine(const vector<vector<int>>& points) {
    int n = points.size();
    if (n <= 2) return n;
    int best = 1;
    for (int i = 0; i < n; i++) {
        map<pair<int, int>, int> direction;
        int local = 0;
        for (int j = i + 1; j < n; j++) {
            int dx = points[j][0] - points[i][0];
            int dy = points[j][1] - points[i][1];
            int g = __gcd(abs(dx), abs(dy));
            dx /= g;
            dy /= g;
            if (dx < 0 || (dx == 0 && dy < 0)) {
                dx = -dx;
                dy = -dy;
            }
            local = max(local, ++direction[{dx, dy}]);
        }
        best = max(best, local + 1);
    }
    return best;
}`,
      },
      {
        title: "Implementation: orientation and segment intersection",
        body: `The orientation of three points is the sign of a cross product: positive for a counter-clockwise turn, negative for clockwise, zero for collinear. Two segments intersect if their endpoints are on opposite sides of each other's lines, or if an endpoint lies on the other segment. The collinear cases are the ones that need the bounding box check. Using 64-bit products keeps the arithmetic exact for coordinates up to a billion.`,
        code: `struct Pt {
    long long x, y;
};

int orientationOf(Pt a, Pt b, Pt c) {
    long long cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    return cross > 0 ? 1 : cross < 0 ? -1 : 0;
}

bool onSegmentBox(Pt a, Pt b, Pt p) {  // p is collinear with a-b; is it between them?
    return min(a.x, b.x) <= p.x && p.x <= max(a.x, b.x) && min(a.y, b.y) <= p.y && p.y <= max(a.y, b.y);
}

bool segmentsIntersect(Pt a, Pt b, Pt c, Pt d) {
    int o1 = orientationOf(a, b, c), o2 = orientationOf(a, b, d);
    int o3 = orientationOf(c, d, a), o4 = orientationOf(c, d, b);
    if (o1 != o2 && o3 != o4) return true;  // proper crossing
    if (o1 == 0 && onSegmentBox(a, b, c)) return true;
    if (o2 == 0 && onSegmentBox(a, b, d)) return true;
    if (o3 == 0 && onSegmentBox(c, d, a)) return true;
    if (o4 == 0 && onSegmentBox(c, d, b)) return true;
    return false;
}`,
      },
      {
        title: "Variants",
        body: `The same tools extend in several directions. The area of a polygon comes from the shoelace formula, a sum of cross products of consecutive vertices, giving twice the signed area as an exact integer. A point is inside a convex polygon if it is on the same side of every edge. Convex hull algorithms (Andrew's monotone chain) sort the points and use the orientation test to discard points that make a clockwise turn. The closest pair of points uses sorting and a sweep, or divide and conquer. Rectangle problems extend to the union of many rectangles (sweep line with a segment tree), the skyline problem and the number of rectangles that contain a point. Distance between points can be compared as squared distance to stay in integers. Whenever a problem seems to need a square root or an angle, ask whether comparing squared lengths or cross products does the job without them.`,
      },
      {
        title: "Complexity",
        body: `Rectangle area is O(1). Max Points on a Line with the anchor method is O(n^2) map operations, or O(n^2 log n) with an ordered map; for a few hundred points that is instant. The orientation test and segment intersection are O(1). A convex hull takes O(n log n) for the sort. The shoelace area is O(n). Memory is O(n) for the direction map of one anchor. The map keys are reduced integer pairs, so there is no tolerance parameter to tune, which is a benefit of staying in exact arithmetic: the cost is only the gcd per pair, O(log C) for coordinates up to C.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Do not use doubles for slopes: two different slopes can round to the same double, and a vertical line has no slope at all. Use reduced integer direction vectors and fix the sign. Duplicate points make the difference vector (0, 0), whose gcd is zero and causes a division by zero; the problem statement usually promises distinct points, but check, and count duplicates separately if they are allowed. Overflow: products of coordinate differences need 64 bits when coordinates reach 10^9. In rectangle problems, clamp the overlap at zero for disjoint rectangles, and be careful that the subtraction itself fits in the type. In segment intersection, the collinear and touching cases are where most solutions fail; test segments that share an endpoint, that overlap along a line, and that are collinear but disjoint. Finally, with one or two points the answer is the number of points, because any two points define a line.`,
      },
      {
        title: "Practice order",
        body: `Start with Rectangle Area, which needs only the interval overlap idea and teaches you to clamp at zero. Then Max Points on a Line, which introduces the canonical direction and the idea of an anchor point; first write the version with doubles, find an input that breaks it, then replace it with the reduced integer pair. After these, implement the orientation test and the segment intersection function on your own and test them against the degenerate cases listed above, since those are what interviewers like to probe.`,
      },
    ],
  },
  "segment-tree": {
    intro:
      "A segment tree or a Fenwick tree (binary indexed tree) answers range queries such as the sum or the minimum of a stretch of an array while the array is being changed. A plain prefix-sum array answers queries in constant time but needs linear time per update; these trees make both operations logarithmic. You reach for them whenever a problem mixes point or range updates with range queries, or asks you to count elements in a value range while scanning.",
    sections: [
      {
        title: "The intuition",
        body: `Suppose you keep an array of numbers and must answer many questions of the form what is the sum of positions l to r, interleaved with updates that change one position. Recomputing the sum for each query costs O(n). A prefix-sum array makes queries O(1) but an update changes every prefix after it, costing O(n). With a hundred thousand operations either choice is too slow.

The fix is to store partial sums over blocks of different sizes, so that any range can be assembled from a few blocks and any update touches only a few blocks. A segment tree stores the sum of the whole array at the root, the sums of the two halves in its children, the sums of the four quarters in the next level, and so on down to single elements. A query for a range descends from the root and takes whole blocks that fit inside the range: at most two blocks per level, so about 2 log n blocks. An update changes one leaf and recomputes the sums of its ancestors, log n of them.

The Fenwick tree is a more compact cousin for prefix sums. Position i stores the sum of a block that ends at i and whose length is the lowest set bit of i. So position 6 (binary 110) stores positions 5 to 6, position 4 (100) stores positions 1 to 4, position 8 stores positions 1 to 8. A prefix sum up to 6 adds the block at 6 and then the block at 4, because removing the lowest bit of 6 gives 4. An update at position 3 adds to the block at 3, then at 4 (3 plus its lowest bit), then at 8. The code is a few lines and the constant factor is tiny.

Pick the Fenwick tree when the operation is invertible (sum, xor, count) and the updates are point updates; pick the segment tree when the operation is min, max, gcd or something that cannot be subtracted, or when you need range updates with lazy propagation.`,
      },
      {
        title: "Why it works",
        body: `Both structures rest on the same decomposition: any prefix, and therefore any range, is a union of a small number of precomputed blocks, and any position belongs to a small number of blocks.

For the Fenwick tree, write the prefix length i in binary. Removing the lowest set bit repeatedly splits the prefix 1..i into blocks, one per set bit, each block (j - lowbit(j), j] ending at a value j along the way. For i = 6 the blocks are (4, 6] and (0, 4]. They are disjoint and cover the prefix exactly, and there are at most log n of them, one per set bit. The update goes the other way: position p is contained in the blocks stored at p, p + lowbit(p), and so on, each larger by the lowest bit, until the index exceeds n. Each step at least doubles the lowest bit, so there are at most log n steps. A range sum is a prefix sum minus another prefix sum.

For the segment tree, the invariant is that each node stores the combination of its two children, for example the sum. A query asks for the combination over [l, r). Whenever a node's segment lies completely inside the query range you can use its stored value; if it lies completely outside you skip it; if it partly overlaps you recurse into both children. At each level at most two nodes are partially overlapped, those containing the boundaries l and r, so only O(log n) nodes are visited. The iterative bottom-up version stores the leaves at positions n to 2n - 1 and each internal node i has children 2i and 2i + 1; moving the two boundaries up one level at a time and collecting the nodes they step over visits the same canonical blocks without recursion.

The operation must be associative, so that combining blocks in any grouping gives the same answer. It does not need to be invertible for the segment tree, which is why min and max work there and not in a Fenwick tree. Lazy propagation extends the idea to range updates: a node stores a pending change for its whole segment and applies it to the children only when a later operation needs to look inside.`,
      },
      {
        title: "A worked example",
        body: `Trace a Fenwick tree over a = [3, 2, -1, 6, 5, 4, -3, 3], positions 1 to 8. The tree stores t[i] = the sum of the block ending at i with length lowbit(i).
t[1] = 3 (block 1..1). t[2] = 3 + 2 = 5 (1..2). t[3] = -1 (3..3). t[4] = 3 + 2 - 1 + 6 = 10 (1..4). t[5] = 5 (5..5). t[6] = 5 + 4 = 9 (5..6). t[7] = -3 (7..7). t[8] = 19 (1..8, the total of all eight numbers).

Prefix sum of the first 6 elements: start at i = 6, add t[6] = 9, remove the lowest bit to get i = 4, add t[4] = 10, remove the lowest bit to get 0 and stop. The sum is 19, which matches 3 + 2 - 1 + 6 + 5 + 4 = 19.

Add 4 to position 3. Start at i = 3: t[3] becomes 3. Add the lowest bit: i = 4, t[4] becomes 14. Add the lowest bit: i = 8, t[8] becomes 23. Next would be 16, beyond n, so stop. Now the prefix sum of 6 elements is t[6] + t[4] = 9 + 14 = 23, which is the old 19 plus 4. A range sum from 3 to 6 is prefix(6) - prefix(2) = 23 - 5 = 18; check: -1 + 4 + 6 + 5 + 4 = 18.

Three block reads and three block writes replaced a scan of eight elements. For a million elements the same operations touch about twenty blocks.

A second use is counting. Count of Range Sum asks how many ranges of the array have a sum between two bounds. With prefix sums p, a range (j, i] has sum p[i] - p[j], so for each i you count earlier prefix sums in the interval [p[i] - upper, p[i] - lower]. A Fenwick tree indexed by the rank of each prefix sum answers "how many earlier values fall in this interval" in logarithmic time as you scan.`,
      },
      {
        title: "Implementation",
        body: `A Fenwick tree with zero-based public indices and a one-based internal array, which is what makes the lowest-bit trick work (index 0 would loop forever). The methods are add at a position, the prefix sum up to a position, and the sum of a range. The lowest set bit of i is i & -i. It stores 64-bit values because sums of many elements overflow 32 bits.`,
        code: `class FenwickTree {
    vector<long long> t;

public:
    explicit FenwickTree(int n) : t(n + 1, 0) {}

    void add(int index, long long delta) {  // index is zero-based
        for (int i = index + 1; i < (int)t.size(); i += i & -i) t[i] += delta;
    }

    long long prefix(int index) const {  // sum of positions 0..index
        long long sum = 0;
        for (int i = index + 1; i > 0; i -= i & -i) sum += t[i];
        return sum;
    }

    long long range(int left, int right) const {  // sum of positions left..right
        if (left > right) return 0;
        return prefix(right) - (left > 0 ? prefix(left - 1) : 0);
    }
};`,
      },
      {
        title: "Implementation: an iterative segment tree",
        body: `The bottom-up segment tree for sums with point updates, the shape of Range Sum Query - Mutable. The leaves live at positions n to 2n - 1 of one array, and each internal node holds the sum of its two children. A point update overwrites a leaf and walks up, recomputing parents. A query over the half-open range [l, r) lifts both ends up the tree: when the left end is a right child it is taken and moved right, when the right end is a right child its left sibling is taken. Replace the addition with min, max or gcd to get those queries; only the identity value changes.`,
        code: `class SumSegmentTree {
    int n;
    vector<long long> t;

public:
    explicit SumSegmentTree(const vector<int>& a) : n(a.size()), t(2 * a.size()) {
        for (int i = 0; i < n; i++) t[n + i] = a[i];
        for (int i = n - 1; i > 0; i--) t[i] = t[2 * i] + t[2 * i + 1];
    }

    void set(int index, int value) {
        int i = index + n;
        t[i] = value;
        for (; i > 1; i >>= 1) t[i >> 1] = t[i] + t[i ^ 1];
    }

    long long query(int left, int right) const {  // sum of positions in [left, right)
        long long sum = 0;
        for (int l = left + n, r = right + n; l < r; l >>= 1, r >>= 1) {
            if (l & 1) sum += t[l++];
            if (r & 1) sum += t[--r];
        }
        return sum;
    }
};`,
      },
      {
        title: "Implementation: counting with a Fenwick tree",
        body: `Count of Range Sum. Build the prefix sums, sort and deduplicate them to give each value a rank, and keep a Fenwick tree of how many earlier prefix sums have each rank. For each prefix sum, the number of earlier ones in [p - upper, p - lower] is a range sum over ranks found with two binary searches; then insert the current prefix sum. The same coordinate compression plus Fenwick idea counts inversions and solves many "how many earlier elements are smaller" problems.`,
        code: `int countRangeSum(const vector<int>& nums, int lower, int upper) {
    int n = nums.size();
    vector<long long> prefix(n + 1, 0);
    for (int i = 0; i < n; i++) prefix[i + 1] = prefix[i] + nums[i];
    vector<long long> sorted(prefix);
    sort(sorted.begin(), sorted.end());
    sorted.erase(unique(sorted.begin(), sorted.end()), sorted.end());
    FenwickTree seen(sorted.size());
    int count = 0;
    for (int i = 0; i <= n; i++) {
        int from = lower_bound(sorted.begin(), sorted.end(), prefix[i] - upper) - sorted.begin();
        int to = int(upper_bound(sorted.begin(), sorted.end(), prefix[i] - lower) - sorted.begin()) - 1;
        count += (int)seen.range(from, to);
        int rank = lower_bound(sorted.begin(), sorted.end(), prefix[i]) - sorted.begin();
        seen.add(rank, 1);
    }
    return count;
}`,
      },
      {
        title: "Variants",
        body: `Range updates with range queries use lazy propagation: each node carries a pending addition or assignment that is pushed down only when needed, which is the tool for Falling Squares (assign a height over a range, query the maximum). A Fenwick tree can support range add with point query by storing differences, and range add with range sum with two trees. A segment tree can store tuples, such as the best prefix, best suffix, total and best subarray sum of a segment, to answer maximum subarray queries. Dynamic or sparse segment trees create nodes on demand for coordinates up to 10^9. Persistent segment trees keep every version and answer queries on old versions, for k-th smallest in a range. Merge sort trees and wavelet trees answer more complex counting queries. A two-dimensional Fenwick tree handles rectangle sums with point updates. If you only need static queries, a sparse table or a prefix array is simpler and faster.`,
      },
      {
        title: "Complexity",
        body: `Both structures build in O(n) (the Fenwick tree can also be built by n updates in O(n log n)), answer queries in O(log n) and apply point updates in O(log n). Memory is O(n): one array of n + 1 values for the Fenwick tree and two arrays' worth, 2n values, for the iterative segment tree. A recursive segment tree is usually allocated with 4n entries for safety. Lazy propagation keeps the logarithmic bounds but increases the constant. The counting application above costs O(n log n) in total: the sort, the binary searches and the Fenwick operations are each logarithmic per element. Compared with a plain array, which offers O(1) updates and O(n) queries, or a prefix array with the opposite trade-off, the trees balance the two to O(log n) each, which is what a mixed workload needs.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `A Fenwick tree is one-indexed: index zero makes i & -i equal to zero and the loop never ends, so convert at the boundary. Decide once whether ranges are inclusive or half-open and keep it consistent between the two structures. Use 64-bit sums, because the total of many 32-bit values overflows. In the iterative segment tree the array size is exactly 2n and n need not be a power of two for commutative operations; for non-commutative ones (such as string concatenation) the order of combining matters and needs care. Remember the identity element for min and max queries (a very large or very small value), and do not initialise empty nodes to zero for those. Coordinate compression requires sorting and removing duplicates before ranking, and the ranks must be found with lower_bound on the same array. Finally, an empty array must not build a tree, and a query with the left end beyond the right end should return the identity value.`,
      },
      {
        title: "Practice order",
        body: `Begin with Range Sum Query - Mutable, solving it twice: with a Fenwick tree and with the iterative segment tree, and compare the code. Then Count of Range Sum, which combines prefix sums, coordinate compression and a Fenwick tree and is the best exercise for seeing the structure as a counting tool. Falling Squares needs a segment tree with range assignment and range maximum, so it introduces lazy propagation; do it last, and write a brute-force version first to test against.`,
      },
    ],
  },
  "sparse-table": {
    intro:
      "A sparse table answers range minimum or maximum queries on an array that never changes, in constant time per query after an O(n log n) preparation. Sqrt decomposition is the more flexible sibling: it splits the array into blocks of about the square root of n and answers queries and updates in O(sqrt n). You reach for them when queries vastly outnumber updates (sparse table), or when the operation is awkward for a segment tree and a simple blocked scan is enough (sqrt decomposition).",
    sections: [
      {
        title: "The intuition",
        body: `Imagine a long array and a million questions of the form what is the smallest value between positions l and r. Scanning the range for each question costs O(n). A segment tree answers in O(log n). But if the array is fixed, we can do better by paying up front.

Precompute, for every position i and every power of two 2^k, the minimum of the block of length 2^k that starts at i. Call it table[k][i]. The blocks of length one are the array itself. A block of length two is the minimum of two blocks of length one, a block of length four is the minimum of two blocks of length two, and so on: table[k][i] = min(table[k - 1][i], table[k - 1][i + 2^(k-1)]). There are about log n levels of n entries each.

Now any query range [l, r] of length len can be covered by two blocks of length 2^k, where 2^k is the largest power of two not exceeding len: one starting at l and one ending at r. They overlap in the middle, and the overlap does not matter, because the minimum of a value counted twice is the same as counted once. So the answer is min(table[k][l], table[k][r - 2^k + 1]), two lookups. The overlap trick only works for operations where counting an element twice is harmless (min, max, gcd, bitwise and or), which are called idempotent. For sums you cannot overlap, and the sparse table loses its constant-time property.

Sqrt decomposition takes a different route: cut the array into blocks of size about the square root of n, store one summary per block, and answer a query by combining whole blocks in the middle with a scan of the partial blocks at the two ends. An update recomputes one block's summary. Each operation touches at most about 3 * sqrt(n) items, which for n = 10^5 is under a thousand.`,
      },
      {
        title: "Why it works",
        body: `The sparse table has two facts to check: the table is built correctly, and two overlapping blocks suffice for any range.

Construction. The block of length 2^k starting at i is the concatenation of two adjacent blocks of length 2^(k-1): the one starting at i and the one starting at i + 2^(k-1). The minimum of a union of two parts is the minimum of their minima, so the recurrence is exact. Levels are filled in increasing k, and a block of level k exists only if i + 2^k <= n, so row k has n - 2^k + 1 entries. The total is less than n log n entries.

Query. Let len = r - l + 1 and let k be the largest integer with 2^k <= len, that is k = floor(log2(len)). Then 2^k <= len < 2^(k+1), so two blocks of length 2^k starting at l and at r - 2^k + 1 together cover the whole range: the first covers positions l to l + 2^k - 1, the second covers r - 2^k + 1 to r, and since 2^(k+1) > len the second starts no later than the position right after the first ends. Every position in [l, r] is in at least one of them, and no position outside [l, r] is in either. For an idempotent operation min(a, a) = a, so the double-covered middle is harmless. To get k quickly, precompute floor(log2) for all lengths in a small array, or use the number of leading zeros of the length.

Sqrt decomposition. A block size of B gives n / B blocks. A query takes at most two partial blocks of up to B elements each and up to n / B whole blocks, so the cost is about 2B + n / B, which is minimised at B near sqrt(n) giving O(sqrt n). A point update changes one element and recomputes its block summary: for a sum you can adjust the summary by the difference in O(1), for a min you may need to rescan the block in O(B). The structure is easy to adapt to unusual operations, such as counting how many values in a range are below a threshold (keep each block sorted and binary search), where a segment tree would be awkward.

Offline alternatives such as Mo's algorithm reorder the queries so that a sliding window moves little, with a similar square root bound.`,
      },
      {
        title: "A worked example",
        body: `Build a sparse table for minimum over a = [5, 2, 4, 7, 6, 3, 1, 2], eight elements, positions 0 to 7.
Level 0 (blocks of length 1): [5, 2, 4, 7, 6, 3, 1, 2].
Level 1 (length 2): min of neighbouring pairs: [2, 2, 4, 6, 3, 1, 1]. For example the entry at position 3 is min(7, 6) = 6.
Level 2 (length 4): min of two level-1 blocks two apart: position 0 is min(2, 4) = 2, position 1 is min(2, 6) = 2, position 2 is min(4, 3) = 3, position 3 is min(6, 1) = 1, position 4 is min(3, 1) = 1. So the level is [2, 2, 3, 1, 1].
Level 3 (length 8): position 0 is min(level-2 at 0, level-2 at 4) = min(2, 1) = 1.

Query the minimum of positions 1 to 6. The length is 6, and the largest power of two not exceeding 6 is 4, so k = 2. The two blocks are level 2 at position 1 (covering positions 1 to 4) and level 2 at position 6 - 4 + 1 = 3 (covering positions 3 to 6). Their values are 2 and 1, so the answer is min(2, 1) = 1. The positions 3 and 4 were covered twice, which does not change a minimum. The true minimum of 2, 4, 7, 6, 3, 1 is 1, as expected.

A query for positions 0 to 2 has length 3 and k = 1: min(level 1 at 0, level 1 at 1) = min(2, 2) = 2, again covering position 1 twice.

For sqrt decomposition on ten numbers 1 to 10 with blocks of size 3 the block sums are 6, 15, 24 and 10. The sum of positions 2 to 8 (values 3 to 9) takes the tail of block 0 (value 3), the whole of blocks 1 and 2 (15 + 24), and nothing more: 3 + 15 + 24 = 42, which equals 3 + 4 + ... + 9.`,
      },
      {
        title: "Implementation",
        body: `A sparse table for range minimum. The log table stores floor(log2) for every length so that a query does no floating point. The table has one vector per level. The constructor fills level 0 with the array and each next level from the previous one, stopping when the block length exceeds n. The query function expects zero-based inclusive bounds with left <= right.`,
        code: `class SparseTableMin {
    vector<vector<int>> table;
    vector<int> logOf;

public:
    explicit SparseTableMin(const vector<int>& a) {
        int n = a.size();
        logOf.assign(n + 2, 0);
        for (int i = 2; i <= n + 1; i++) logOf[i] = logOf[i / 2] + 1;
        int levels = n > 0 ? logOf[n] + 1 : 0;
        table.assign(levels, vector<int>());
        if (n == 0) return;
        table[0] = a;
        for (int k = 1; k < levels; k++) {
            int half = 1 << (k - 1);
            table[k].resize(n - (1 << k) + 1);
            for (int i = 0; i + (1 << k) <= n; i++) {
                table[k][i] = min(table[k - 1][i], table[k - 1][i + half]);
            }
        }
    }

    int query(int left, int right) const {  // minimum of positions left..right
        int k = logOf[right - left + 1];
        return min(table[k][left], table[k][right - (1 << k) + 1]);
    }
};`,
      },
      {
        title: "Implementation: sqrt decomposition with updates",
        body: `A blocked array for range sums with point updates. The block size is the integer square root of n rounded up. A query adds single elements while the left end is not at a block start, then whole blocks, then single elements again. An update changes the element and adjusts its block's sum by the difference. This structure is slower than a Fenwick tree for sums, but the same layout works for operations where a Fenwick tree does not, such as keeping each block sorted to count values below a limit.`,
        code: `class SqrtSum {
    int n, blockSize;
    vector<long long> value, blockSum;

public:
    explicit SqrtSum(const vector<int>& a) : n(a.size()) {
        blockSize = max(1, (int)ceil(sqrt((double)max(1, n))));
        value.assign(a.begin(), a.end());
        blockSum.assign(n / blockSize + 1, 0);
        for (int i = 0; i < n; i++) blockSum[i / blockSize] += a[i];
    }

    void update(int index, long long newValue) {
        blockSum[index / blockSize] += newValue - value[index];
        value[index] = newValue;
    }

    long long query(int left, int right) const {  // sum of positions left..right
        long long sum = 0;
        int i = left;
        while (i <= right && i % blockSize != 0) sum += value[i++];
        while (i + blockSize - 1 <= right) {
            sum += blockSum[i / blockSize];
            i += blockSize;
        }
        while (i <= right) sum += value[i++];
        return sum;
    }
};`,
      },
      {
        title: "Variants",
        body: `The same table works for any idempotent operation: maximum, gcd, bitwise and, bitwise or. For non-idempotent operations such as sum you can still use a sparse table with a different query that splits the range into disjoint power-of-two blocks along the binary representation of the length, at O(log n) per query, or use the disjoint sparse table, which restores O(1) queries with a different layout. To return the position of the minimum, store indices and compare by the value at each index. A two-dimensional sparse table answers rectangle minimum queries in constant time with O(n m log n log m) memory. Sqrt decomposition has several cousins: Mo's algorithm for offline range queries, sqrt decomposition on queries (rebuild every sqrt(q) operations), and sqrt on values to count frequencies. It is also a practical fallback when a problem needs an operation a segment tree makes hard, such as range assignment combined with counting distinct values.`,
      },
      {
        title: "Complexity",
        body: `The sparse table takes O(n log n) time and memory to build and O(1) per query, so it wins when there are many queries and no updates; for n = 10^6 the table has about twenty million entries, which is 80 MB of 32-bit integers, so check the memory limit. Sqrt decomposition takes O(n) to build, O(sqrt n) per query, and O(1) to O(sqrt n) per update depending on the operation. A segment tree gives O(log n) for both and is the usual choice when updates exist. In practice the ordering from fastest queries to slowest is sparse table, segment tree, sqrt decomposition, but the simplest code is often the blocked array, which is why it is popular in contests for tricky operations.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `The sparse table is for static arrays: after any update the table is invalid and must be rebuilt, so check that the problem has no updates. It only gives O(1) for idempotent operations. Mind the bounds: the query is inclusive of both ends here, with left <= right, and a reversed range must be swapped or rejected. The log table must be indexed by the length, which can be n, so size it n + 1 or more. For n = 0 do not build any level. In sqrt decomposition, the block size must be at least 1, and the last block may be partial, so the number of blocks is n / blockSize + 1 and the loops must stop at the array end. When updating a block summary for a min, adjusting by a difference is wrong; recompute the block. Finally, test both structures against a plain loop on random arrays and random ranges, because off-by-one errors in the partial blocks are easy to make and hard to see.`,
      },
      {
        title: "Practice order",
        body: `Start with Sparse table: O(1) static range min/max. Implement it, test it against brute force on random ranges, and make sure you can explain the overlapping two-block trick without notes. Then do Sqrt decomposition: write the blocked sum with updates, and afterwards change it to answer minimum queries to feel the difference between adjusting a summary and recomputing it. If you want a third exercise, compare both with a segment tree on the same random workload and measure which is fastest for a read-heavy mix.`,
      },
    ],
  },
  "ordered-set": {
    intro:
      "An ordered set or ordered map keeps its elements sorted at all times and finds the nearest element above or below any value in logarithmic time: in C++ std::set, std::map and std::multiset, in Java TreeSet and TreeMap. You reach for it when a problem needs floor and ceiling queries on a changing collection: the closest booked slot, the nearest earlier value within a window, the smallest element larger than x, or a sorted window with deletions.",
    sections: [
      {
        title: "The intuition",
        body: `A hash set answers whether a value is present in constant time, but it knows nothing about order. A sorted array answers nearest-neighbour questions by binary search, but inserting into the middle costs O(n). Many problems need both at once: insert a value, remove a value, and ask for the closest value above or below x.

A balanced binary search tree does all three in O(log n). Elements are kept in sorted order, and the library exposes the order through iterators. In C++, lower_bound(x) returns the first element not less than x, which is the ceiling of x, and upper_bound(x) returns the first element greater than x. The floor of x, the largest element not greater than x, is the element just before upper_bound(x) (if there is one). The same queries in Java are ceiling, floor, higher and lower.

My Calendar I shows the pattern. You hold a set of booked intervals that never overlap, so they are ordered by start time and also by end time. A new interval [s, e) conflicts only with its neighbours in this order: the first booking that starts at or after s, and the booking just before it. If the next booking starts before e, there is an overlap; if the previous booking ends after s, there is an overlap. Two neighbour checks replace a scan of all bookings. The set gives you the neighbours in O(log n).

Contains Duplicate III asks whether some pair of indices at most k apart has values at most t apart. Keep a sorted window of the last k values. For a new value x, ask for the smallest window value that is at least x - t; if it exists and is at most x + t, you found a pair. Then insert x and drop the value that left the window. The ordered set provides the one query a hash set cannot: the nearest value in a range.`,
      },
      {
        title: "Why it works",
        body: `The correctness of these solutions depends on two facts: the tree keeps its order after every update, and the nearest-neighbour query is enough to decide the question.

The balance guarantee. A red-black tree (behind std::set and TreeMap) or another self-balancing tree keeps its height at O(log n) through rotations after insertions and deletions, so every operation walks one root-to-leaf path. The in-order traversal always lists the elements in sorted order, and the library's iterators step along that order, which is why the predecessor and successor of any element are found by moving one step. The key must define a strict weak ordering, otherwise the tree structure is meaningless.

Sufficiency of the nearest neighbour. For the window problem, a pair with values differing by at most t exists for the new value x exactly when some window value lies in [x - t, x + t]. If any value lies in that interval, then the smallest value that is at least x - t also lies in it (it is no larger than that value and no smaller than x - t). So checking one candidate, the ceiling of x - t, is both necessary and sufficient. For the calendar, a new interval overlaps some booking exactly when it overlaps one of its two neighbours in start order: any booking that overlaps it and starts before s must end after s, and the one just before s in start order has the largest end among the bookings that start before s because they are disjoint and sorted; any booking that overlaps it and starts at or after s must start before e, and the first one at or after s has the smallest start. So looking at the two neighbours decides the question.

Multisets allow equal keys and need extra care in deletion: erase(value) removes all copies, while erase(find(value)) removes one. This distinction is crucial in sliding window problems with duplicates.`,
      },
      {
        title: "A worked example",
        body: `Trace Contains Duplicate III on nums = [1, 5, 9, 1, 5, 9] with index distance k = 2 and value distance t = 3. Keep a set of the last k values. For each x, find the first set element that is at least x - t and check whether it is at most x + t.

i = 0, x = 1: the set is empty, no candidate. Insert: {1}.
i = 1, x = 5: first element at least 5 - 3 = 2: none (1 is too small). Insert: {1, 5}.
i = 2, x = 9: first at least 6: none. Insert: {1, 5, 9}. The set has 3 elements, more than k = 2, so remove nums[0] = 1: {5, 9}.
i = 3, x = 1: first at least -2 is 5, and 5 is not at most 1 + 3 = 4. No pair. Insert: {1, 5, 9}, remove nums[1] = 5: {1, 9}.
i = 4, x = 5: first at least 2 is 9, which is greater than 8. No pair. Insert and remove nums[2] = 9: {1, 5}.
i = 5, x = 9: first at least 6: none. No pair.

The answer is false. With nums = [1, 2, 3, 1], k = 3, t = 0: at i = 3, x = 1, the set holds {1, 2, 3}, the first element at least 1 is 1, which is at most 1, so the answer is true.

My Calendar I with bookings (10, 20), (15, 25), (20, 30). The first is accepted. For (15, 25): the first booking starting at or after 15 does not exist; the previous booking (10, 20) ends at 20, which is after 15, so it overlaps: rejected. For (20, 30): the first booking at or after 20 does not exist; the previous one ends at 20, not after 20, so it is accepted. The results are true, false, true.`,
      },
      {
        title: "Implementation",
        body: `Contains Duplicate III with a std::set of 64-bit values, since x + t may overflow a 32-bit integer. For each element, lower_bound finds the ceiling of x - t, and the pair exists if that element is at most x + t. After the check, insert x and, if the window is larger than k, erase the element that fell out. With distinct values in the set this is correct because a pair of equal values would have been found before the second one was inserted, so the set never holds duplicates when the answer is still false.`,
        code: `bool containsNearbyAlmostDuplicate(const vector<int>& nums, int indexDiff, int valueDiff) {
    set<long long> window;
    for (int i = 0; i < (int)nums.size(); i++) {
        long long x = nums[i];
        auto it = window.lower_bound(x - valueDiff);  // smallest value >= x - t
        if (it != window.end() && *it <= x + valueDiff) return true;
        window.insert(x);
        if ((int)window.size() > indexDiff) window.erase((long long)nums[i - indexDiff]);
    }
    return false;
}`,
      },
      {
        title: "Implementation: a calendar and a sorted window",
        body: `The calendar keeps bookings in a map from start to end. The ceiling lookup finds the next booking, and stepping back one gives the previous. A multiset is the natural container for a sliding window maximum when you also need to remove elements by value: it allows duplicates, its largest element is the last one, and erasing a single copy needs the iterator returned by find. The window function below returns the maximum of every window of k consecutive elements.`,
        code: `class CalendarOne {
    map<int, int> booked;  // start -> end

public:
    bool book(int start, int end) {
        auto next = booked.lower_bound(start);
        if (next != booked.end() && next->first < end) return false;
        if (next != booked.begin() && prev(next)->second > start) return false;
        booked[start] = end;
        return true;
    }
};

vector<int> windowMaximums(const vector<int>& nums, int k) {
    multiset<int> window;
    vector<int> result;
    for (int i = 0; i < (int)nums.size(); i++) {
        window.insert(nums[i]);
        if (i >= k) window.erase(window.find(nums[i - k]));  // remove one copy only
        if (i >= k - 1) result.push_back(*window.rbegin());
    }
    return result;
}`,
      },
      {
        title: "Variants",
        body: `Ordered maps store a value for each key and answer floor and ceiling by key; they back interval maps (merging adjacent intervals as in Data Stream as Disjoint Intervals), event counting for My Calendar II and III (map of boundary changes with a running sum), and time-based stores. A multiset gives sliding window medians with two sets or with one set and a moving iterator. Order-statistic trees also answer the k-th smallest and the rank of an element in logarithmic time; in C++ they are available as a policy-based data structure in GNU extensions, and in Java you can build them on a Fenwick tree over compressed values. A Fenwick tree over ranks does the work of an ordered set offline, with smaller constants. In Python there is no built-in ordered set, so people use a sorted list with bisect, which has O(n) insertion but a small constant, or the sortedcontainers library. When values are small integers, a bitset or a Fenwick tree beats a balanced tree.`,
      },
      {
        title: "Complexity",
        body: `Insertion, deletion, lower_bound and upper_bound all take O(log n) in a balanced tree, and stepping to the next or previous element takes amortised O(1). A solution that does one such operation per element runs in O(n log n) total. Memory is O(n) with a larger constant than an array, because each node stores pointers and colour information, so for tens of millions of elements a sorted array or a Fenwick tree is a better fit. In the window problem the set holds at most k + 1 elements, so the time is O(n log k). Comparing with the alternatives: a hash set cannot answer nearest queries, a sorted array has O(n) insertion, a heap supports only the extreme element, and a balanced tree is the only one that supports all of them.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Use a wide integer type for x - t and x + t, because the sums overflow 32 bits for values near the limits. In a multiset, erase(value) removes every copy, which silently breaks sliding windows with duplicates; erase the iterator from find instead. Check for end() before dereferencing the result of lower_bound, and before stepping back from it. The comparison for a set or map must be a strict weak ordering; a comparator that uses less-or-equal causes undefined behaviour. Iterators to erased elements are invalid, so read what you need first. Decide whether the booking intervals are half-open: touching intervals do not overlap when the end is exclusive. When the window size k is zero the set should stay empty and the answer is false. And remember that the problem may want the index difference to be at most k, so the window holds k previous elements, not k + 1.`,
      },
      {
        title: "Practice order",
        body: `Start with My Calendar I, which needs only the two-neighbour check and a map. Then My Calendar II and My Calendar III, which use the same ordered structure for event counting: record plus one at the start and minus one at the end, and scan the running total. Contains Duplicate III is the best test of the ceiling query inside a sliding window and the first problem where overflow matters. All three calendar problems are runnable in the Practice section of this app, so you can check your solutions against large inputs.`,
      },
    ],
  },
  randomized: {
    intro:
      "Randomised and probabilistic techniques use chance on purpose: to sample fairly from data too big or too unpredictable to hold, to break the worst case of an algorithm, or to trade a tiny chance of error for a large saving in memory. The ones worth knowing are reservoir sampling, the Fisher-Yates shuffle, the Bloom filter and consistent hashing. You reach for them when a problem says pick uniformly at random from a stream, test membership with almost no memory, or spread keys over servers that come and go.",
    sections: [
      {
        title: "The intuition",
        body: `Four small problems, one idea each.

Pick a random node of a linked list whose length you do not know, using constant memory and one pass. You cannot pick an index in advance, because you do not know the length. Instead keep a current choice and, as you read the k-th node, replace the choice with it with probability 1 / k. The first node is chosen at once, the second replaces it half the time, the third replaces the current choice a third of the time, and so on. At the end every node had the same chance of being the survivor. This is reservoir sampling, and it works on streams that never fit in memory.

Shuffle an array so that every ordering is equally likely. Walk from the last position down to the second, and swap each position with a uniformly random position at or before it. Each position is fixed once and never touched again, and the number of possible outcomes of the n - 1 random choices is n * (n - 1) * ... * 2 = n!, one per permutation. That is the Fisher-Yates shuffle. A tempting shortcut, swapping every position with a random position anywhere in the array, produces n^n equally likely sequences of swaps, which cannot divide evenly among n! permutations, so it is biased.

Test whether a word is in a huge set using a few bits per word. A Bloom filter keeps a bit array and several hash functions. To add a key, set the bits at its hash positions. To test a key, check that all its bits are set. If some bit is clear, the key is certainly absent. If all are set, the key is probably present, with a false positive rate you can tune. It never gives false negatives.

Assign keys to servers so that adding or removing a server moves only a small share of the keys. Place the servers on a circle by hashing their names, hash each key onto the same circle, and give the key to the first server clockwise. When a server leaves, only its keys move, to the next server. This is consistent hashing, the basis of distributed caches and storage systems.`,
      },
      {
        title: "Why it works",
        body: `Each technique comes with a short probabilistic argument.

Reservoir sampling. Claim: after k elements, each has probability 1 / k of being the current choice. For k = 1 it is true. Suppose it holds for k. The new element becomes the choice with probability 1 / (k + 1). An earlier element stays the choice if it was the choice (probability 1 / k) and the new element did not replace it (probability k / (k + 1)); the product is 1 / (k + 1). So the claim holds for k + 1 and, by induction, for any length. For k items instead of one, keep the first k, then replace a random reservoir slot with probability k / i for the i-th element.

Fisher-Yates. Count outcomes: the last position has n choices, the next n - 1, and so on, so there are n! equally likely sequences of random choices, and each leads to a different permutation, since the position assigned at each step is different. Therefore every permutation has probability 1 / n!.

Bloom filter. After inserting m keys with k hash functions into a filter of b bits, a given bit is still zero with probability about (1 - 1 / b)^(k * m), which is close to e^(-k * m / b). A key that was never inserted looks present only if all its k bits are set, with probability about (1 - e^(-k * m / b))^k. Minimising this over k gives k near (b / m) * ln 2, which makes about half of the bits set and a false positive rate near 0.6185^(b / m). At 10 bits per key and 7 hashes the rate is about one percent. There are no false negatives, because bits are never cleared.

Consistent hashing. With the points spread evenly, each of n servers owns about 1 / n of the circle. Removing one server affects only the arcs it owned, which are taken over by its clockwise neighbour, so about 1 / n of the keys move; a plain hash modulo n would move almost all keys. A single point per server gives an uneven split, so each server is hashed many times as virtual nodes, which smooths the shares towards 1 / n each.

Randomised algorithms in general (random pivots in quickselect and quicksort) rest on expectation: a random pivot lands in the middle half of the data with probability one half, so the expected recursion depth is logarithmic regardless of the input order.`,
      },
      {
        title: "A worked example",
        body: `Reservoir sampling over the stream a, b, c. Read a: choice = a (probability 1). Read b: replace with probability 1/2. Read c: replace with probability 1/3. The probability that the final choice is a: a is chosen at step 1, survives step 2 with probability 1/2, survives step 3 with probability 2/3: (1)(1/2)(2/3) = 1/3. For b: chosen at step 2 with probability 1/2, survives step 3 with probability 2/3: 1/3. For c: chosen at step 3 with probability 1/3. All three are 1/3.

A Bloom filter with 16 bits and two hash functions. Add "cat": its hashes give positions 3 and 9, so those bits become 1. Add "dog": positions 9 and 14, so bit 14 becomes 1 and bit 9 stays 1. The array now has ones at 3, 9, 14. Query "cat": bits 3 and 9 are set, answer probably present (correct). Query "emu" with positions 3 and 14: both are set, answer probably present, which is a false positive caused by the other keys. Query "owl" with positions 5 and 9: bit 5 is clear, answer certainly absent. Increasing the number of bits makes false positives rarer.

Consistent hashing with servers A, B, C placed at positions 10, 40 and 70 on a ring of size 100. A key hashed to 25 goes to the first server clockwise, B at 40. A key at 75 wraps around to A at 10. If B is removed, the keys that were assigned to B (those hashed into 11 to 40) now go to C at 70; keys that belonged to A or C do not move. Only the removed server's keys changed owner.

Fisher-Yates on [1, 2, 3]: i = 2, pick j in 0..2, say 0, swap positions 2 and 0 to get [3, 2, 1]. i = 1, pick j in 0..1, say 1, no change. The result [3, 2, 1] was one of 3 * 2 = 6 equally likely outcomes.`,
      },
      {
        title: "Implementation",
        body: `The shuffle and the sampler. fisherYatesShuffle walks from the end and swaps with a uniform index in the range from zero to the current position inclusive; the inclusive upper bound is essential, because excluding the position itself makes certain permutations impossible. reservoirSample keeps the first k items and then, for the i-th item, draws a random number in 1..i and replaces a slot if the number is at most k. A small mixing function, mix64, turns a hash into a well spread 64-bit value and is used by the structures that follow.`,
        code: `unsigned long long mix64(unsigned long long x) {
    x += 0x9e3779b97f4a7c15ULL;
    x = (x ^ (x >> 30)) * 0xbf58476d1ce4e5b9ULL;
    x = (x ^ (x >> 27)) * 0x94d049bb133111ebULL;
    return x ^ (x >> 31);
}

void fisherYatesShuffle(vector<int>& a, mt19937& rng) {
    for (int i = (int)a.size() - 1; i > 0; i--) {
        int j = uniform_int_distribution<int>(0, i)(rng);  // inclusive: j may equal i
        swap(a[i], a[j]);
    }
}

vector<int> reservoirSample(const vector<int>& stream, int k, mt19937& rng) {
    vector<int> reservoir;
    for (int i = 0; i < (int)stream.size(); i++) {
        if (i < k) {
            reservoir.push_back(stream[i]);
        } else {
            int j = uniform_int_distribution<int>(0, i)(rng);  // uniform over the i + 1 items seen
            if (j < k) reservoir[j] = stream[i];
        }
    }
    return reservoir;
}`,
      },
      {
        title: "Implementation: a Bloom filter",
        body: `A Bloom filter with a bit vector and k hash positions derived from two base hashes by double hashing: position i is h1 + i * h2 modulo the size, which gives k well-spread positions from two hash computations. The second hash is forced odd so that it is never zero. The class offers add and mightContain; there is no remove, because clearing a bit could erase the evidence of other keys.`,
        code: `class BloomFilter {
    vector<bool> bits;
    int hashes;

    size_t slot(const string& key, int i) const {
        unsigned long long h1 = mix64(hash<string>{}(key));
        unsigned long long h2 = mix64(h1 ^ 0xabcdefULL) | 1ULL;
        return (size_t)((h1 + (unsigned long long)i * h2) % bits.size());
    }

public:
    BloomFilter(size_t bitCount, int hashCount) : bits(bitCount, false), hashes(hashCount) {}

    void add(const string& key) {
        for (int i = 0; i < hashes; i++) bits[slot(key, i)] = true;
    }

    bool mightContain(const string& key) const {
        for (int i = 0; i < hashes; i++) {
            if (!bits[slot(key, i)]) return false;  // certainly absent
        }
        return true;  // probably present
    }
};`,
      },
      {
        title: "Implementation: consistent hashing",
        body: `The ring is an ordered map from a position to a server name. Each server is inserted at many positions, one per virtual node, named by the server name plus a counter. A lookup hashes the key and takes the first position at or after it, wrapping to the beginning of the map when it falls past the last position. Removing a server erases exactly its virtual nodes, which leaves every other key where it was.`,
        code: `class HashRing {
    map<unsigned long long, string> ring;
    int replicas;

    static unsigned long long point(const string& s) { return mix64(hash<string>{}(s)); }

public:
    explicit HashRing(int virtualNodes) : replicas(virtualNodes) {}

    void addServer(const string& name) {
        for (int r = 0; r < replicas; r++) ring[point(name + "#" + to_string(r))] = name;
    }

    void removeServer(const string& name) {
        for (int r = 0; r < replicas; r++) ring.erase(point(name + "#" + to_string(r)));
    }

    string serverFor(const string& key) const {
        if (ring.empty()) return "";
        auto it = ring.lower_bound(point(key));
        if (it == ring.end()) it = ring.begin();  // wrap around the circle
        return it->second;
    }
};`,
      },
      {
        title: "Variants",
        body: `Reservoir sampling with weights picks items with probability proportional to their weights from a stream, using random keys raised to the inverse weight. Random Pick with Weight, covered under combinatorics, uses prefix sums when the data fits in memory. Randomised quickselect and quicksort choose a random pivot to defeat adversarial inputs. Hash tables with random seeds resist attackers who craft colliding keys. Counting Bloom filters keep small counters instead of bits to allow deletion; cuckoo filters give deletion with better space; HyperLogLog estimates the number of distinct elements with a few kilobytes; count-min sketch estimates frequencies. Monte Carlo methods estimate quantities by simulation, such as pi by random points, with error shrinking like one over the square root of the number of samples. Skip lists and treaps use random levels or priorities to stay balanced in expectation. Rendezvous hashing is an alternative to the ring: each key picks the server with the highest hash of the pair.`,
      },
      {
        title: "Complexity",
        body: `Reservoir sampling reads the stream once in O(n) time with O(k) memory, which does not depend on the length of the stream. Fisher-Yates runs in O(n) time and O(1) extra memory. A Bloom filter with b bits and k hashes adds and tests in O(k) time and uses b bits in total; at ten bits per element it is about ten times smaller than storing small keys, and far smaller than long ones. A consistent hash lookup is O(log(n * replicas)) in an ordered map, and adding or removing a server costs O(replicas * log(n * replicas)). The numbers worth remembering are the Bloom filter trade-off, about 1 percent false positives at 10 bits per key with 7 hashes, and the consistent hashing guarantee, that only about 1 / n of the keys move when a server is added or removed.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `The shuffle must draw from the inclusive range zero to i. Drawing from zero to n - 1 for every position, or excluding i, gives a biased result that looks random on small tests; verify by counting the outcomes over many runs for an array of three elements. In reservoir sampling the probabilities are 1 / k for the k-th item with k counting from one; an off-by-one makes the first elements more likely. Use a proper random generator, seeded once, and use the standard distributions rather than the remainder operator, which is biased when the range does not divide the generator range. A Bloom filter has no deletion and its false positive rate rises as it fills, so size it for the largest expected number of keys. Never use a bad hash with identical low bits, which the mixing function above avoids. With consistent hashing, too few virtual nodes give uneven load; a hundred or more per server is typical. Finally, for tests, fix the seed so failures can be reproduced, and check distributions statistically with generous tolerances rather than exact counts.`,
      },
      {
        title: "Practice order",
        body: `Begin with Linked List Random Node: implement reservoir sampling and prove the one-over-k invariant by induction, then test it by sampling a short list many times and counting. Then Bloom filter idea: write the filter above, measure the false positive rate for several sizes and compare it with the formula. Finish with Consistent hashing (links to system design): build the ring with virtual nodes, add and remove servers, and measure how many keys move; this is the version of the idea that interviewers expect you to describe when a distributed cache comes up in a design question.`,
      },
    ],
  },
  "design-ds": {
    intro:
      "A data-structure design question describes a class with a few operations and a complexity target, and asks you to build it from standard parts. The skill is not a new algorithm but a method: write down the operations, ask which one is the bottleneck, and choose the structures so that every operation meets its bound. You reach for it on questions that start with design a class that supports insert, remove and get in constant time, or that keeps recent events, versions or a cache.",
    sections: [
      {
        title: "The intuition",
        body: `Every design problem is a table: a list of operations on the left and the cost you need for each on the right. The structures you know each have a strength and a weakness, and a design is a combination whose weaknesses are covered by another part.

A hash map finds a key in O(1) but has no order. A dynamic array gives O(1) random access and O(1) append but slow removal from the middle. A linked list removes a known node in O(1) but cannot find one. A heap gives the smallest element in O(1) and removal in O(log n), but cannot find an arbitrary element. A queue gives first-in first-out access. A balanced tree gives everything in O(log n) including order. A sorted array supports binary search.

Insert Delete GetRandom O(1) asks for insert, remove and getRandom, all in constant time. getRandom needs random access by index, so an array. Remove by value needs to find the value, so a hash map from value to index. The array cannot delete from the middle in O(1), but it can delete the last element in O(1), so swap the doomed element with the last one, update the moved element's index in the map and pop the end. Two structures, each covering the other's weakness.

Design Hit Counter asks for the number of hits in the last five minutes. Hits arrive in time order, so a queue of timestamps works: add at the back, drop from the front what is older than five minutes, and the size is the answer. If many hits can share a second, store one counter per second in a circular buffer of 300 slots, which has fixed memory.

A time-based key-value store needs the value at the latest time not after a given time. Per key, values arrive with increasing timestamps, so a sorted vector with binary search answers in O(log n). Snapshot Array stores only the changes per index for the same reason. The recurring pattern: identify what is ordered, and use that order.`,
      },
      {
        title: "Why it works",
        body: `A design is correct when it keeps an invariant that ties its parts together, and fast when each operation touches a constant or logarithmic number of items. Writing the invariant explicitly is what separates a design that works from one that works until the first edge case.

For the randomised set the invariant is: the hash map holds exactly the values in the array, and map[v] is the index of v. Insert appends and records the index: the invariant holds. Remove of v with index i and last element w: copy w into slot i, set map[w] = i, pop the array, erase v from the map. After the copy, the array holds every value except v, in some order, and the map is correct for every element, including w. When v is the last element itself, w equals v, and the order of the two map updates matters: set the index first, then erase v, so the map does not keep a dangling entry. getRandom picks a uniform index of the array, so each stored value has equal probability.

For the hit counter the invariant is: the circular buffer holds, for each of the last 300 seconds, a timestamp and a count; a slot is valid only if its stored timestamp is within the last 300 seconds. A hit at time t uses slot t modulo 300. If the slot holds an older timestamp, the old count is discarded and replaced by 1 and the new timestamp; otherwise the count increases. getHits sums the counts of slots whose timestamp is in the window. Memory is constant and both operations take O(300), which is O(1) in the input size.

For the key-value store with time, the invariant is: for each key, the list is sorted by timestamp because sets arrive in increasing time. get uses the position after the last timestamp not greater than the query time, found by binary search; the entry before it is the answer. Without the increasing-time promise you would need a sorted insert, which costs more.

Always check each operation against the table of required costs, and for every operation list which parts of the invariant it can break. That list is the proof.`,
      },
      {
        title: "A worked example",
        body: `Trace Design Hit Counter, which counts hits in the past 300 seconds, using a queue of timestamps. The window for a query at time t is the timestamps greater than t - 300 and at most t.

hit(1), hit(2), hit(3): the queue holds 1, 2, 3.
getHits(4): drop timestamps that are at most 4 - 300 = -296: none. The queue size is 3. Answer 3.
hit(300): the queue holds 1, 2, 3, 300.
getHits(300): drop timestamps at most 0: none. The queue size is 4. Answer 4.
getHits(301): drop timestamps at most 1: the 1 is removed. The queue holds 2, 3, 300, size 3. Answer 3.

The oldest hit expired exactly when it left the window. Each timestamp was added once and removed at most once, so the amortised cost of an operation is constant.

Trace the randomised set: insert(5), insert(7), insert(9). The array is [5, 7, 9] and the map is {5: 0, 7: 1, 9: 2}. remove(5): the last element is 9, copy it into slot 0: [9, 7, 9]; set map[9] = 0; pop: [9, 7]; erase 5 from the map: {7: 1, 9: 0}. The array and the map agree. getRandom picks index 0 or 1 with equal chance, returning 9 or 7. remove(7) now removes the last element: the last element is 7 itself, so set map[7] = 1 (unchanged), pop, erase 7: array [9], map {9: 0}.

The same two traces show the method: write the state after each operation and check the invariant against it.`,
      },
      {
        title: "Implementation",
        body: `A hit counter as a circular buffer of 300 one-second slots. Each slot stores the timestamp it was last written for and a count. A hit at time t goes to slot t % 300, resetting the slot if it still holds a different second. getHits adds the counts of slots whose timestamp lies within the last 300 seconds of the query time. The memory does not grow with the number of hits, so it also works when millions of hits arrive each second.`,
        code: `class HitCounter {
    static const int WINDOW = 300;
    int stamp[WINDOW];
    int count[WINDOW];

public:
    HitCounter() {
        for (int i = 0; i < WINDOW; i++) stamp[i] = count[i] = 0;
    }

    void hit(int timestamp) {
        int slot = timestamp % WINDOW;
        if (stamp[slot] != timestamp) {  // the slot still holds an old second
            stamp[slot] = timestamp;
            count[slot] = 0;
        }
        count[slot]++;
    }

    int getHits(int timestamp) const {
        int total = 0;
        for (int i = 0; i < WINDOW; i++) {
            if (count[i] > 0 && timestamp - stamp[i] < WINDOW) total += count[i];
        }
        return total;
    }
};`,
      },
      {
        title: "Implementation: a hash map with an array",
        body: `The randomised set from the intuition. The array holds the values and the map holds each value's position. Removal swaps the removed value with the last one and pops, in the order that stays correct when the removed value is the last one: set the moved element's position, then erase. The time-based store uses a sorted vector of pairs per key and binary search to find the last entry at or before the query time. Both classes use the same recipe: say what each part is responsible for and what the invariant is.`,
        code: `class IndexedSet {
    vector<int> items;
    unordered_map<int, int> where;  // value -> position in items

public:
    bool insert(int value) {
        if (where.count(value)) return false;
        where[value] = items.size();
        items.push_back(value);
        return true;
    }

    bool remove(int value) {
        auto it = where.find(value);
        if (it == where.end()) return false;
        int last = items.back();
        items[it->second] = last;
        where[last] = it->second;  // before erasing, so removing the last element works too
        items.pop_back();
        where.erase(value);
        return true;
    }

    int randomItem(mt19937& rng) const {
        return items[uniform_int_distribution<size_t>(0, items.size() - 1)(rng)];
    }
};

class TimedStore {
    unordered_map<string, vector<pair<int, string>>> data;

public:
    void set(const string& key, const string& value, int timestamp) {
        data[key].push_back({timestamp, value});  // timestamps for a key only increase
    }

    string get(const string& key, int timestamp) const {
        auto it = data.find(key);
        if (it == data.end()) return "";
        const auto& v = it->second;
        int lo = 0, hi = v.size();
        while (lo < hi) {
            int mid = (lo + hi) / 2;
            if (v[mid].first <= timestamp) lo = mid + 1;
            else hi = mid;
        }
        return lo == 0 ? "" : v[lo - 1].second;
    }
};`,
      },
      {
        title: "Variants",
        body: `The same method covers the classic designs. An LRU cache combines a hash map with a doubly linked list so that lookup and eviction of the oldest are constant time. An LFU cache adds a list per use count. A min stack stores the running minimum next to each element. A queue from two stacks has amortised constant cost. A twitter feed merges the recent tweets of followed users with a heap. A rate limiter keeps a window of timestamps or counters, as in the hit counter. An autocomplete system is a trie with ranked completions. A snapshot array keeps per-index change lists. A phone directory or an iterator over nested lists is a pointer plus a stack. Time-ordered data is almost always best served by a sorted list with binary search, and key-ordered data by a tree map. Most of these appear as runnable problems in the Practice section: Design Twitter, Time Based Key-Value Store, Snapshot Array and Insert Delete GetRandom O(1) have class-style judges here.`,
      },
      {
        title: "Complexity",
        body: `State the complexity of every operation separately, because the interviewer will ask. The randomised set is O(1) average for all three operations (the hash map is average case) and O(n) space. The hit counter is O(1) time per hit and O(300) time per query with fixed memory, or amortised O(1) with a queue and O(h) memory for h hits in the window. The time-based store is O(1) per set and O(log m) per get, with O(total sets) memory. A heap-based news feed is O(f log f) per read for f followed accounts. A trade-off is often explicit: you can make a query faster by storing more, as when caching a running total, at the cost of making every update maintain it. When two operations compete, say which one you optimise and why, based on the expected mix of operations.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `The first pitfall is solving only the happy path: define the behaviour for an empty structure, a missing key, a duplicate insert and a removal of the last element. Second, keep the parts consistent: every operation must update every structure that holds the same information, and the order of updates can matter, as in the swap-and-pop removal. Third, say what happens to ties and to equal timestamps. Fourth, constants: a circular buffer has fixed memory, a queue of timestamps does not, so ask about the rate of hits. Fifth, average versus worst case: hash maps are constant on average only; say so. Sixth, thread safety and persistence are out of scope unless the interviewer raises them, but name them as extensions. Seventh, randomness must be uniform: use the library's distribution, not the remainder of a random integer. Finally, write a short list of invariants before the code, and test the invariants by hand on a three-operation trace.`,
      },
      {
        title: "Practice order",
        body: `Start with Insert Delete GetRandom O(1), the cleanest example of two structures covering each other's weakness. Then Time Based Key-Value Store, where the key is noticing that sets arrive in order so that binary search applies, and Snapshot Array, which stores only the changes. Design Hit Counter introduces the sliding window and the choice between a queue and a circular buffer. Design Twitter combines several parts: per-user tweet lists, follow sets and a merge for the feed. For each one, write the table of operations and required costs before choosing a structure, and say the invariant aloud.`,
      },
    ],
  },
};
