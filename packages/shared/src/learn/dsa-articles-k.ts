import type { PatternArticle } from "./types";

// Full pattern articles, group "Greedy, math, advanced" (step 10): greedy-proof, exchange-argument, number-theory, combinatorics, geometry (part 1 of 2) (plan 0008). Format and rules: plan 0007. Code is C++17. Blocks of one article are
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
};
