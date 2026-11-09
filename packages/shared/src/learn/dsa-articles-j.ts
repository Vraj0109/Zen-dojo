import type { PatternArticle } from "./types";

// Full pattern articles, group "Dynamic programming, part 2" (step 9): interval-dp, state-machine-dp, digit-dp, tree-dp-2, bitmask-dp-assign, dp-optimizations (plan 0008). Format and rules: plan 0007. Code is C++17. Blocks of one article are
// concatenated and compiled together, so helper names are unique per article.

export const DSA_ARTICLES_J: Record<string, PatternArticle> = {
  "interval-dp": {
    intro:
      "Interval dynamic programming has a state that is a contiguous range of the input, written dp[l][r], and fills the table by increasing range length. You reach for it when the best way to handle a range is to pick one special element or one split point inside it and then solve the two smaller ranges on either side independently: bursting balloons, merging stones, cutting a string into palindromes, matrix chain multiplication.",
    sections: [
      {
        title: "The intuition",
        body: `Some problems cannot be solved by walking left to right because the effect of a choice depends on what is next to it, and that changes as things are removed. Burst Balloons is the standard example. Each balloon has a number; bursting balloon k earns nums[k - 1] * nums[k] * nums[k + 1] using its current neighbours; the neighbours change after every burst. If you think about which balloon to burst first, the subproblems are tangled, because the remaining balloons are now next to each other in a way that depends on your choice.

Flip the question. Ask which balloon in a range is burst last. When balloon k is the last one in the open range between positions l and r, every other balloon in that range is already gone, so its neighbours at the time of bursting are exactly the two borders l and r. The coins it earns are a[l] * a[k] * a[r], and nothing else in the range can interfere. The balloons to the left of k, between l and r, form an independent subproblem bounded by l and k, and those on the right form another bounded by k and r. They no longer influence each other, because k was still standing as a wall between them while they were being burst.

This is the signature move of interval DP: choose the last action, or the split point, so that the range falls into two independent parts. The state is the range, the transition tries every split point, and the answer for the whole input is the cell for the full range. Because the table is indexed by two positions, there are O(n^2) states and each one tries O(n) splits, giving an O(n^3) algorithm that is perfectly fine for n up to a few hundred.`,
      },
      {
        title: "Why it works",
        body: `The correctness argument has two parts: the choice of what to enumerate, and the order of evaluation.

The enumeration must be exhaustive and must produce independent subproblems. In Burst Balloons, every complete bursting order of the balloons strictly between l and r has some last balloon k. Fixing k, the order restricted to the left side is a bursting order of the left range, and the same for the right. Neither side affects the coins earned on the other, because the neighbours of any left balloon are either other left balloons or the walls l and k, which are both still present until the end. So the best total for a fixed k is the best of the left range plus the best of the right range plus the coins for k, and the best overall is the maximum over all k. If you had enumerated the first balloon to burst instead, the two sides would stay coupled and the independence would be lost.

The evaluation order is by increasing length of the range. The cell dp[l][r] reads dp[l][k] and dp[k][r] with l < k < r, both of which are strictly shorter ranges, so computing all ranges of length two, then three, and so on, guarantees every read is ready. A common mistake is to loop l in the outer loop and r in the inner one in increasing order; for that to be valid the inner reads must already be final, which usually requires l to run downward instead. Looping by length avoids the question entirely.

The base case is the empty range: dp[l][l + 1] = 0, because no balloon lies strictly between adjacent borders. Padding the array with a 1 at both ends makes the borders exist for the outermost balloons, so the answer is dp[0][n + 1].`,
      },
      {
        title: "A worked example",
        body: `Trace Burst Balloons on nums = [3, 1, 5, 8]. Pad with ones to get a = [1, 3, 1, 5, 8, 1], positions 0 to 5. Let dp[l][r] be the best coins from bursting everything strictly between l and r.

Ranges with one balloon inside (r = l + 2): dp[0][2] = 1 * 3 * 1 = 3, dp[1][3] = 3 * 1 * 5 = 15, dp[2][4] = 1 * 5 * 8 = 40, dp[3][5] = 5 * 8 * 1 = 40.

Ranges with two balloons inside (r = l + 3):
dp[0][3]: last k = 1 gives 0 + dp[1][3] + 1 * 3 * 5 = 30; last k = 2 gives dp[0][2] + 0 + 1 * 1 * 5 = 8. Best 30.
dp[1][4]: k = 2 gives 0 + 40 + 3 * 1 * 8 = 64; k = 3 gives 15 + 0 + 3 * 5 * 8 = 135. Best 135.
dp[2][5]: k = 3 gives 0 + 40 + 1 * 5 * 1 = 45; k = 4 gives 40 + 0 + 1 * 8 * 1 = 48. Best 48.

Three balloons inside (r = l + 4):
dp[0][4] = max(k = 1: 0 + 135 + 1 * 3 * 8 = 159, k = 2: 3 + 40 + 1 * 1 * 8 = 51, k = 3: 30 + 0 + 1 * 5 * 8 = 70) = 159.
dp[1][5] = max(k = 2: 0 + 48 + 3 * 1 * 1 = 51, k = 3: 15 + 40 + 3 * 5 * 1 = 70, k = 4: 135 + 0 + 3 * 8 * 1 = 159) = 159.

Full range: dp[0][5] = max(k = 1: dp[1][5] + 1 * 3 * 1 = 162, k = 2: 3 + 48 + 1 = 52, k = 3: 30 + 40 + 5 = 75, k = 4: dp[0][4] + 0 + 1 * 8 * 1 = 167) = 167.

The answer is 167. It comes from bursting the balloon with 8 last, after 159 coins from the others.`,
      },
      {
        title: "Implementation",
        body: `The table is (n + 2) by (n + 2) with the padded array. The outer loop is the length of the open range, from 2 up to n + 1, the middle loop is the left border, and the inner loop tries every last balloon k strictly between the borders. All cells for shorter lengths are already final when a longer length starts. The answer sits in the cell that spans the whole padded array.`,
        code: `int maxCoinsBurst(const vector<int>& nums) {
    int n = nums.size();
    vector<int> a(n + 2, 1);
    for (int i = 0; i < n; i++) a[i + 1] = nums[i];
    vector<vector<int>> dp(n + 2, vector<int>(n + 2, 0));
    for (int len = 2; len <= n + 1; len++) {
        for (int l = 0; l + len <= n + 1; l++) {
            int r = l + len;
            for (int k = l + 1; k < r; k++) {  // k is the balloon burst last in (l, r)
                dp[l][r] = max(dp[l][r], dp[l][k] + dp[k][r] + a[l] * a[k] * a[r]);
            }
        }
    }
    return dp[0][n + 1];
}`,
      },
      {
        title: "Implementation: a split point with a cost",
        body: `Palindrome Partitioning II asks for the fewest cuts that split a string into palindromes. It is not a pure interval DP, but it uses an interval table as a helper. First fill a boolean table isPal[i][j], true when the substring from i to j is a palindrome, by increasing length: the ends must match and the inside must already be a palindrome. Then a one-dimensional table cuts[i] holds the fewest cuts for the first i characters; the last piece starts at some j, so cuts[i] = min(cuts[j] + 1) over all j such that the piece from j to i - 1 is a palindrome. The interval table answers the palindrome question in constant time.`,
        code: `int minPalindromeCuts(const string& s) {
    int n = s.size();
    if (n == 0) return 0;
    vector<vector<char>> isPal(n, vector<char>(n, 0));
    for (int len = 1; len <= n; len++) {
        for (int i = 0; i + len <= n; i++) {
            int j = i + len - 1;
            isPal[i][j] = s[i] == s[j] && (len <= 2 || isPal[i + 1][j - 1]);
        }
    }
    vector<int> cuts(n + 1, INT_MAX);
    cuts[0] = -1;  // no cut is needed before the first piece
    for (int i = 1; i <= n; i++) {
        for (int j = 0; j < i; j++) {
            if (isPal[j][i - 1] && cuts[j] != INT_MAX) cuts[i] = min(cuts[i], cuts[j] + 1);
        }
    }
    return cuts[n];
}`,
      },
      {
        title: "Variants",
        body: `Matrix chain multiplication is the classic: dp[i][j] is the fewest scalar multiplications to multiply matrices i through j, and the last multiplication splits the chain at k. Optimal binary search tree, minimum cost to cut a stick, removing boxes and strange printer all follow the same plan: choose the last operation or the root of the range, then add two independent smaller ranges and a cost for the choice. Minimum Cost to Merge Stones, with merges of exactly k piles, adds a third parameter to the state, the number of piles the range has been reduced to, so the table becomes dp[l][r][piles]. Circular versions double the array and look for ranges of length n. Another family cuts a string at a point and counts or minimises something over both halves, which is the same table with a cheaper transition.`,
      },
      {
        title: "Complexity",
        body: `There are about n^2 / 2 ranges and each one tries up to n split points, so the time is O(n^3) and the memory is O(n^2). For n around 500 that is about 20 million simple operations and runs comfortably; for n in the thousands it does not, and you need a stronger idea such as Knuth's optimisation, which reduces some interval DPs to O(n^2) when the optimal split point is monotone. The palindrome helper table is O(n^2) in both time and memory. If memory is tight, interval DP is hard to compress, because a cell reads cells in many different rows, so check the limits before choosing it.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `The most frequent error is the loop order: a table by (l, r) must be filled so that every shorter range is ready, and the safe way is to loop over the length. The second is the choice of what to enumerate; if the two subranges are not independent you picked the wrong thing to fix, so try the last action instead of the first. The third is the boundary: decide whether ranges are closed or open at each end and keep it consistent, because Burst Balloons uses open ranges with sentinel borders while the palindrome table uses closed ranges. Fourth, the padding value matters: pad with one for products, with zero for sums. Fifth, a range of length one or two needs its own base case when it is a special shape, as in the palindrome table where adjacent equal characters form a palindrome without looking inside. Finally, an empty input should return zero without touching the table.`,
      },
      {
        title: "Practice order",
        body: `Begin with Palindrome Partitioning II, which lets you build the palindrome interval table and the simple one-dimensional table on top of it. Then Burst Balloons, the standard teacher of the last-action trick; do not look at the solution until you have tried the first-action version and seen why it fails. Finish with Minimum Cost to Merge Stones, which adds the extra pile-count dimension and tests whether you can extend a familiar table.`,
      },
    ],
  },
  "state-machine-dp": {
    intro:
      "State machine dynamic programming models a process that moves through a few named situations day after day, such as holding a stock, having just sold it, or resting, and records the best value you can have in each situation at each step. You reach for it when a rule couples consecutive choices (a cooldown, a transaction limit, a fee) and a plain best-up-to-i array loses the information the rule needs.",
    sections: [
      {
        title: "The intuition",
        body: `Best Time to Buy and Sell Stock with Cooldown: you may buy and sell as often as you like, but you cannot buy on the day after you sell. A table best[i], the most profit by day i, is not enough, because whether you can buy tomorrow depends on whether you sold today. The missing information is a tiny piece of state: which situation you are in at the end of a day.

Draw the situations as boxes and the allowed moves as arrows. At the end of a day you are in one of three boxes: holding a share (hold), just sold a share today (sold), or free to buy with no share in hand (rest). Every day you move along an arrow. From hold you may keep holding or sell and move to sold. From sold you must move to rest, which is the cooldown. From rest you may stay in rest or buy and move to hold. Each arrow has a price: buying costs the day's price, selling earns it, staying costs nothing.

The dynamic program stores, for each box, the best total profit with which you can be in that box at the end of the day. The update for the next day takes the best over the arrows that lead into each box. The answer is the best of the boxes where you hold nothing, because holding a share at the end is wasted money. The method works for any rule that can be written as "in this situation you may move to those situations", and the number of boxes stays small: two for unlimited trades, three with a cooldown, two per allowed transaction when the number of trades is capped.`,
      },
      {
        title: "Why it works",
        body: `The justification is the same as for any DP, with the state being the pair (day, situation). Two facts have to hold.

First, the situation at the end of a day together with the day number is enough to decide everything that can happen later. The future profit depends only on whether you hold a share and whether you may buy tomorrow, not on the sequence of trades that got you there. If you can describe the rules as "the next allowed actions depend only on this label", the labels are a valid state and the principle of optimality applies: the best way to be in situation s today is the best way to have been in some situation that leads to s yesterday, plus the value of that one move.

Second, the transitions list every legal move exactly once and no illegal ones. For the cooldown problem: hold(today) comes from hold(yesterday) with no action, or from rest(yesterday) by buying; sold(today) comes only from hold(yesterday) by selling; rest(today) comes from rest(yesterday) with no action, or from sold(yesterday) by the forced cooldown. Missing the arrow from sold to rest would forbid ever trading again after a sale; adding an arrow from sold to hold would allow the forbidden buy right after a sale. When the code is wrong, the first thing to check is the list of arrows.

The base case is the starting situation: before the first day you hold nothing, so rest is zero and the other boxes are impossible (negative infinity). Using a very negative number instead of the real infinity keeps arithmetic safe as long as you do not add to it many times; the days are few enough that this is fine, but you should not use the minimum integer, which overflows when a price is subtracted.`,
      },
      {
        title: "A worked example",
        body: `Trace the cooldown problem on prices [1, 2, 3, 0, 2]. Keep three numbers: hold, sold, rest. Before day one: hold = -infinity, sold = -infinity, rest = 0. The update for a price p, using the values from the previous day, is: new hold = max(hold, rest - p); new sold = hold + p; new rest = max(rest, sold).

Day 1, price 1: hold = max(-inf, 0 - 1) = -1; sold = -inf; rest = max(0, -inf) = 0.
Day 2, price 2: hold = max(-1, 0 - 2) = -1; sold = -1 + 2 = 1; rest = max(0, -inf) = 0.
Day 3, price 3: hold = max(-1, 0 - 3) = -1; sold = -1 + 3 = 2; rest = max(0, 1) = 1.
Day 4, price 0: hold = max(-1, 1 - 0) = 1; sold = -1 + 0 = -1; rest = max(1, 2) = 2.
Day 5, price 2: hold = max(1, 2 - 2) = 1; sold = 1 + 2 = 3; rest = max(2, -1) = 2.

The answer is the best of sold and rest on the last day: max(3, 2) = 3. The plan behind it is: buy at 1, sell at 2 (profit 1), cooldown on day 3, buy at 0 on day 4, sell at 2 on day 5 (profit 2), for a total of 3. The tempting plan of selling at the top (buy 1, sell 3) and then buying at 0 would give 4, but the sale on day 3 forces a cooldown on day 4, so the buy at 0 is not allowed. That forbidden plan is exactly what the missing arrow from sold to hold protects against.`,
      },
      {
        title: "Implementation",
        body: `The cooldown problem needs three variables updated together each day; compute all new values from the old ones before overwriting any of them, which is why the code uses temporaries. The function returns the larger of sold and rest, since holding a share at the end earns nothing. The sentinel for impossible states is a large negative number.`,
        code: `int maxProfitCooldown(const vector<int>& prices) {
    const int NEG = -1000000000;
    int hold = NEG, sold = NEG, rest = 0;
    for (int p : prices) {
        int newHold = max(hold, rest - p);
        int newSold = hold == NEG ? NEG : hold + p;
        int newRest = max(rest, sold);
        hold = newHold;
        sold = newSold;
        rest = newRest;
    }
    return max(sold, rest);
}`,
      },
      {
        title: "Implementation: at most k transactions",
        body: `With a cap of k transactions, the state needs the number of transactions used. Keep two arrays indexed by t from 1 to k: buy[t] is the best profit while holding a share in the t-th transaction, and sell[t] is the best profit after completing t transactions. For each price, buying in transaction t starts from the profit after t - 1 completed ones, and selling completes the t-th. If k is at least half the number of days, the cap never binds, and you can just add up every positive day-to-day rise, which also avoids a huge table when k is large.`,
        code: `int maxProfitAtMostK(int k, const vector<int>& prices) {
    int n = prices.size();
    if (n < 2 || k <= 0) return 0;
    if (k >= n / 2) {
        int total = 0;
        for (int i = 1; i < n; i++) total += max(0, prices[i] - prices[i - 1]);
        return total;
    }
    vector<int> buy(k + 1, -1000000000), sell(k + 1, 0);
    for (int p : prices) {
        for (int t = 1; t <= k; t++) {
            buy[t] = max(buy[t], sell[t - 1] - p);
            sell[t] = max(sell[t], buy[t] + p);
        }
    }
    return sell[k];
}`,
      },
      {
        title: "Variants",
        body: `Unlimited transactions with no rules is the two-state version and also equals the sum of positive rises. A fee per transaction is subtracted when selling. Exactly one transaction reduces to tracking the lowest price seen so far. Two transactions is the cap version with k = 2. Outside stocks, the same idea fits any process with a few modes: House Robber with the state "did I rob the previous house", painting fences with a limit on equal neighbours (state: how many in a row), game strategies where the next move depends on the last, and string problems where you are inside or outside a quoted region. If you find yourself adding a flag to a one-dimensional DP, you are building a state machine; name the situations and write the arrows before writing code.`,
      },
      {
        title: "Complexity",
        body: `A machine with s situations over n steps takes O(n * s) time, since each situation reads a constant number of arrows. The cooldown problem is O(n) time and O(1) memory with three variables. With a transaction cap the time is O(n * k) and the memory O(k), because each step updates every t once. The shortcut for large k brings that back to O(n). If the number of situations itself is large, the DP becomes a table with an extra dimension, and the cost grows with it, so keep the labels to what the rules truly need.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `The first pitfall is updating the variables in place in the wrong order: a new value that reads another variable which has already been overwritten uses today's number where yesterday's was needed. Compute every new value from the old ones first. The second is the initial state: hold must start as impossible, not zero, otherwise the table pretends you own a share for free on day zero. The third is the answer: take the best of the situations in which you hold nothing, not the last state of the machine. Fourth, empty and single-day input must return zero. Fifth, when a cap on transactions is large, do not allocate an array of that size; clamp k to half the number of days. Sixth, be careful about what counts as a transaction: counting the buy or the sell changes the index of the arrays by one.`,
      },
      {
        title: "Practice order",
        body: `Start with Best Time to Buy and Sell Stock, which needs no table and shows what a single transaction means. Then Best Time to Buy and Sell Stock II, the unlimited version, and notice that it equals the sum of rises. Best Time to Buy and Sell Stock with Cooldown is the first real state machine: draw the arrows before coding. Then Best Time to Buy and Sell Stock III for two transactions, and finally Best Time to Buy and Sell Stock IV for the general cap, including the large-k shortcut.`,
      },
    ],
  },
  "digit-dp": {
    intro:
      "Digit dynamic programming counts the numbers up to a limit N that satisfy a property of their digits, without looking at the numbers one by one. It builds the number from the most significant digit to the least, tracking whether the prefix is still equal to the limit's prefix, and reuses the answers for the free suffixes. You reach for it when N is huge (up to 10^18) and the property is about digits: no digit four, digit sum divisible by something, all digits distinct, digits from a given set.",
    sections: [
      {
        title: "The intuition",
        body: `Count the numbers from 0 to N that contain no digit 4. For N = 234 you could test all 235 numbers, but for N = 10^18 that is impossible. Instead build the numbers digit by digit, from the left, the way you would write them down.

Write N = 234 as the digits 2, 3, 4. A number not larger than N, padded to three digits, is described by choosing its first digit, then its second, then its third. The first digit can be 0, 1 or 2. If you choose 0 or 1, the number is already smaller than N whatever follows, so the remaining two digits are completely free: each can be any digit except 4, which is nine choices each, so 81 numbers per choice of the first digit. If you choose 2, the number is still tight against N and the next digit is limited by N's second digit, 3.

That splits the count into two kinds of positions. In a free position, any digit may follow and the number of completions depends only on how many positions remain. In a tight position, you must respect the limit and you carry on to the next digit. Because tight positions form a single path (the digits of N itself), you walk down that path once, and at each step you add up the contributions of every smaller digit, which lead to free suffixes whose counts you can compute directly or look up in a table.

The general technique keeps a function count(position, tight, extra) with a memo table. The extra part is whatever the property needs to know about the prefix: the digit sum so far modulo something, a set of digits already used, the previous digit. The answer for the whole range is the call at the first position with tight set to true.`,
      },
      {
        title: "Why it works",
        body: `Every integer from 0 to N, written with the same number of digits as N (with leading zeros if necessary), is either equal to N or has a first position where its digit is smaller than N's digit, with all earlier digits equal to N's. This is a partition: no number belongs to two classes, and every number belongs to one. The class of numbers that first differ at position p with digit d is determined by (p, d), and for a fixed (p, d) the remaining positions after p are completely free.

The tight flag records which class a partial number is in. While tight is true, the digits so far equal the prefix of N and the next digit is capped at N's digit at that position. Once a smaller digit is chosen, tight becomes false for the rest of the number and the cap is 9. The number of valid ways to finish a free suffix depends only on the position and on the information the property needs, not on the actual prefix digits, so the memoisation key is (position, extra) for non-tight states. Tight states occur only along the single path of N's digits, so they need no memoisation at all, and the number of distinct states is the number of positions times the size of the extra information.

Leading zeros need care. A number with fewer digits than N appears with leading zeros, and they must not count as digits for properties like "all digits distinct" or "digit sum". If leading zeros matter, add a flag that says whether the number has started. For the "no digit 4" example, a leading zero is harmless because 0 is not the forbidden digit, but for a property such as "no digit 0" the flag is essential, or the zeros from padding would wrongly reject small numbers.

The correctness of the whole method then follows from the partition: the answer for the range is the sum over the classes, and each class is counted by the recursion.`,
      },
      {
        title: "A worked example",
        body: `Count the integers from 0 to 234 that do not contain the digit 4. Write N = 234 and walk its digits.

Position 0 (hundreds), N's digit is 2. Choosing 0 or 1 makes the number smaller than N, and the last two positions are free with nine allowed digits each: 2 choices * 9 * 9 = 162 numbers. Choosing 2 keeps us tight.
Position 1 (tens), N's digit is 3. Smaller digits are 0, 1, 2, none of them is 4, so each leaves one free position with 9 choices: 3 * 9 = 27 numbers. Choosing 3 keeps us tight.
Position 2 (units), N's digit is 4. Smaller digits are 0, 1, 2, 3, all allowed, and each finishes a number: 4 numbers. Choosing 4 itself is forbidden, so the tight path ends here without adding a number.

The total is 162 + 27 + 4 = 193, which includes the number 0. A check by complement: the numbers from 0 to 234 that do contain a 4 are 19 below 100 (ten with a 4 in the tens place, ten with a 4 in the units place, minus 44 counted twice), 19 from 100 to 199, and four from 200 to 234 (204, 214, 224, 234). That is 42, and 235 - 42 = 193, so both methods agree.

A second quick example, counting numbers up to 100 that use only the digits 1, 3, 5, 7: there are 4 one-digit numbers and 16 two-digit numbers, then at three digits the first digit 1 is tight and the next digit 0 is not in the set, so the path ends. The total is 20.`,
      },
      {
        title: "Implementation",
        body: `A memoised recursion over the digits of N. The state is the position and whether the prefix is tight. For this simple property the free suffix count is the same for every non-tight state at a given position, so the memo stores only non-tight results. The loop at each position tries every digit up to the limit and skips the forbidden one; the call for the next position stays tight only if the chosen digit equals the limit. The function counts numbers from 0 to n inclusive; leading zeros are harmless because the forbidden digit is not zero.`,
        code: `struct CountWithoutDigit {
    string limit;
    int bad;
    vector<long long> memoFree;  // memoFree[pos] = ways to fill positions pos.. when not tight

    long long go(int pos, bool tight) {
        if (pos == (int)limit.size()) return 1;
        if (!tight && memoFree[pos] != -1) return memoFree[pos];
        int top = tight ? limit[pos] - '0' : 9;
        long long total = 0;
        for (int d = 0; d <= top; d++) {
            if (d == bad) continue;
            total += go(pos + 1, tight && d == top);
        }
        if (!tight) memoFree[pos] = total;
        return total;
    }

    long long count(long long n, int forbidden) {
        limit = to_string(n);
        bad = forbidden;
        memoFree.assign(limit.size(), -1);
        return go(0, true);
    }
};`,
      },
      {
        title: "Implementation: counting with a digit set",
        body: `Numbers At Most N Given Digit Set has a closed form because every free position has the same number of choices. All numbers that are shorter than N can be written with any digits from the set: for each length k below the length of N there are D^k of them, where D is the size of the set. For numbers with the same length, walk N's digits from the left. At each position, every set digit smaller than N's digit gives D^(remaining positions) numbers; if N's digit itself is in the set, continue tight, otherwise stop. If the walk finishes, N itself is representable and adds one.`,
        code: `long long powerOf(long long base, int exp) {
    long long result = 1;
    for (int i = 0; i < exp; i++) result *= base;
    return result;
}

long long atMostNGivenDigitSet(const vector<string>& digitSet, long long n) {
    string s = to_string(n);
    int length = s.size();
    int size = digitSet.size();
    long long count = 0;
    for (int k = 1; k < length; k++) count += powerOf(size, k);  // shorter numbers
    for (int i = 0; i < length; i++) {
        bool canStayTight = false;
        for (const string& d : digitSet) {
            if (d[0] < s[i]) count += powerOf(size, length - i - 1);
            else if (d[0] == s[i]) canStayTight = true;
        }
        if (!canStayTight) return count;
    }
    return count + 1;  // n itself uses only digits from the set
}`,
      },
      {
        title: "Implementation: unique digits by length",
        body: `Count Numbers with Unique Digits asks for the numbers below 10^n with no repeated digit. Here no limit digit is involved, so the answer is built from products. For k digits, the first digit has 9 choices (not zero), the second has 9 (zero is now allowed but the first digit is used), the third has 8, and so on, since each new digit must avoid all earlier ones. Add the counts for every length from 1 to n, plus one for the number 0. The loop stops when no digit is left, which happens after ten digits.`,
        code: `int countUniqueDigitNumbers(int n) {
    if (n == 0) return 1;
    int total = 10;      // the numbers 0 to 9
    int uniqueOfLength = 9;
    int available = 9;
    for (int k = 2; k <= n && available > 0; k++) {
        uniqueOfLength *= available;
        total += uniqueOfLength;
        available--;
    }
    return total;
}`,
      },
      {
        title: "Variants",
        body: `For a range from L to R, compute count(R) minus count(L - 1), which turns every range problem into a prefix problem. For properties with a sum, such as the digit sum being divisible by 7, add the sum modulo 7 to the state. For properties about the relation between neighbouring digits (no two equal digits in a row, digits not decreasing), add the previous digit. For distinct digits use a bitmask of the digits used, which gives 1024 extra states. For other bases, replace 10 and 9 by the base and base minus one. Properties on the binary representation, like counting numbers up to N with a given number of one bits, use the same walk with base 2, and are solved faster still with binomial coefficients on the free suffix.`,
      },
      {
        title: "Complexity",
        body: `The number of states is the number of positions (at most 19 for a 64-bit number) times the size of the extra information, and each state loops over at most ten digits. For the simple counting here the total work is tens of operations; for a property with a digit sum modulo m and a bitmask it is positions * m * 1024 * 10, still small. The memory is the size of the memo table. The key point is that the running time depends on the number of digits, which is the logarithm of N, not on N itself, so the method scales to limits of 10^18 where any loop over the numbers is impossible. Without memoisation, the recursion would branch ten ways at each of the positions and be too slow, so the memo for the free states is the part that makes it work.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Leading zeros are the main source of wrong answers; if the property is sensitive to them, add a started flag and do not let a zero count as a digit until the first non-zero digit appears. The second pitfall is memoising tight states together with free ones: the tight state depends on the specific limit, so a memo shared between different limits (for example across the two calls of a range query) gives wrong numbers unless the limit is part of the key or the memo is cleared between calls. The third is the inclusive or exclusive boundary: decide whether N itself counts, and whether 0 counts, and test with N = 0 and N = 9. Fourth, use 64-bit integers for counts. Fifth, when the answer is count(R) - count(L - 1) and L is 0 the second term needs a guard. Finally, test the code against brute force on all numbers up to a few thousand; digit DP bugs are subtle and a brute-force comparison finds them in seconds.`,
      },
      {
        title: "Practice order",
        body: `Begin with Count Numbers with Unique Digits, which has no limit digit and teaches the idea of counting by length. Then Numbers At Most N Given Digit Set, where the tight walk appears in its simplest form with a closed-form count for the free part. After that write the general memoised version with the tight flag and test it against a brute-force loop for a property of your choice, such as no digit 4 or digit sum divisible by 3; this is the template you will reuse in contests.`,
      },
    ],
  },
  "tree-dp-2": {
    intro:
      "Tree dynamic programming computes, for every node, a small set of answers about its subtree and combines the children's answers to get the node's own. The decisions at a node (take it or not, put a camera here or not) constrain its neighbours, so each node returns not one number but one number per situation. You reach for it on optimisation problems over a tree where choices interact along the edges: independent sets, covering, colouring, selecting nodes under a no-two-adjacent rule.",
    sections: [
      {
        title: "The intuition",
        body: `House Robber III puts the houses on a binary tree: a thief may not rob a house and its direct child on the same night. What is the largest amount he can take? On a line, the answer for a prefix needs the best of the two previous prefixes. A tree has no prefixes, but every node has a subtree, and the subtree is independent of everything outside it except through the node's own decision.

So ask, for each node, two questions. What is the most money from its subtree if this node is robbed? And what is the most if it is not robbed? Call them rob and skip. If the node is robbed, its children cannot be, so rob = value + skip(left) + skip(right). If the node is not robbed, each child is free to be either, so skip = max(rob(left), skip(left)) + max(rob(right), skip(right)). The answer for the whole tree is the larger of the two numbers at the root.

This is DP on a tree, and the order is simply post-order: a node's answers need those of its children, so you compute children first. The pair (rob, skip) is the state of the node, a tiny table with two entries. Other problems need more entries: a camera on a tree needs three situations per node, because a node can be covered by itself, by a child, or not yet covered and waiting for its parent. The pattern is the same: list the situations a node can be in that matter to its parent, compute each from the children's situations, and return them as a small tuple.`,
      },
      {
        title: "Why it works",
        body: `The proof is the usual optimal substructure, using the fact that in a tree removing a node splits the problem into independent parts.

Fix a node v and a decision about v. The rest of the subtree of v splits into the subtrees of its children, and these do not share any nodes. The only way they interact is through v, and the interaction is fully described by the decision made at v: for the rob problem, if v is robbed then each child is forced to be skipped, otherwise each child is free. So once the decision at v is fixed, the best total is the sum of the best totals of the children's subtrees under the allowed decisions, and the choices inside different child subtrees can be optimised separately. That is exactly the formula for rob and skip.

The states must be exactly what the parent needs to know. The parent of v only cares whether v was robbed, because that is the only way v affects it. Everything else inside the subtree of v has already been optimised and can be forgotten. This is the test for a good tree state: list what an outside neighbour can observe about the subtree, and make one table entry per possibility.

For the camera problem the observable facts are three: v has a camera (so it covers itself, its children and its parent), v has no camera but is covered by one of its children, or v is not covered at all and needs its parent to have a camera. A node with an uncovered child must place a camera, since nobody else can cover that child except v. This forced move is what lets the problem be solved by a single post-order pass.

The base case is the empty tree: a null child has value zero for rob and skip, and for cameras it counts as covered, so that it neither demands a camera nor offers one.`,
      },
      {
        title: "A worked example",
        body: `Trace House Robber III on the tree with root 3, left child 2, right child 3, where 2 has only a right child 3 and the right 3 has only a right child 1. In level order that is [3, 2, 3, null, 3, null, 1]. For each node write (rob, skip), computed bottom-up.

Leaf 3 (the right child of node 2): rob = 3, skip = 0. So (3, 0).
Leaf 1 (the right child of the right 3): (1, 0).
Node 2 with right child (3, 0) and no left child: rob = 2 + skip(null) + skip(child) = 2 + 0 + 0 = 2. skip = 0 + max(3, 0) = 3. So (2, 3).
Right node 3 with right child (1, 0): rob = 3 + 0 + 0 = 3. skip = 0 + max(1, 0) = 1. So (3, 1).
Root 3 with children (2, 3) and (3, 1): rob = 3 + skip(left) + skip(right) = 3 + 3 + 1 = 7. skip = max(2, 3) + max(3, 1) = 3 + 3 = 6. So (7, 6).

The answer is max(7, 6) = 7: rob the root and the two leaves of value 3 and 1 (3 + 3 + 1). The number 6 from skipping the root corresponds to robbing the two children's best options, 3 and 3. Each node was visited once and the work per node was a few additions.

For the camera problem on the tree [0, 0, null, 0, 0] (a root with a single child B, which has two leaf children), use the code 0 for needs cover, 1 for has a camera, 2 for covered without one, and null counts as 2. Each leaf sees only covered children and has no camera, so it needs cover: 0. Node B sees a child that needs cover, so it takes a camera: 1, and the count becomes 1. The root sees a child with a camera, so it is covered: 2. One camera is enough.`,
      },
      {
        title: "Implementation",
        body: `A post-order function that returns the pair for each node. A null node returns (0, 0). The function is recursive; for trees that may be a long chain (a hundred thousand nodes) the recursion depth is a concern, in which case convert it to an explicit stack with an order list. The caller takes the larger value of the pair at the root. The TreeNode definition is included so the code stands alone.`,
        code: `struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

pair<int, int> robSubtree(TreeNode* node) {  // (best if node is robbed, best if not)
    if (!node) return {0, 0};
    pair<int, int> l = robSubtree(node->left);
    pair<int, int> r = robSubtree(node->right);
    int robbed = node->val + l.second + r.second;
    int skipped = max(l.first, l.second) + max(r.first, r.second);
    return {robbed, skipped};
}

int robTree(TreeNode* root) {
    pair<int, int> best = robSubtree(root);
    return max(best.first, best.second);
}`,
      },
      {
        title: "Implementation: the minimum number of cameras",
        body: `Binary Tree Cameras uses three codes returned by a post-order function. If any child needs cover, the node must carry a camera and the counter increases. Otherwise, if any child has a camera, the node is covered. Otherwise the node is not covered and asks its parent for help. After the traversal, a root that still needs cover needs one more camera. This is a greedy choice in disguise, but its justification is the DP argument: putting the camera on the parent of an uncovered leaf is never worse than putting it on the leaf, since the parent also covers its own parent.`,
        code: `struct CameraCounter {
    int cameras = 0;

    int visit(TreeNode* node) {  // 0 = needs cover, 1 = has a camera, 2 = covered without one
        if (!node) return 2;
        int l = visit(node->left);
        int r = visit(node->right);
        if (l == 0 || r == 0) {
            cameras++;
            return 1;
        }
        if (l == 1 || r == 1) return 2;
        return 0;
    }

    int minCameras(TreeNode* root) {
        cameras = 0;
        if (visit(root) == 0) cameras++;
        return cameras;
    }
};`,
      },
      {
        title: "Variants",
        body: `The maximum independent set and the minimum vertex cover on a general tree use the same pair of values as House Robber III, with any number of children. The minimum dominating set is the camera problem with three situations. The diameter of a tree and the largest sum of a path return, from each node, the best downward path, and update a global answer with the best path that bends at the node. Counting problems return the number of ways instead of a value: for instance, the number of ways to colour a tree with no two neighbours equal. Rerooting extends the idea to answers for every node as the root: compute the downward values, then pass the values of the rest of the tree down to each child in a second pass. For very deep trees, use an explicit post-order list to avoid stack overflow.`,
      },
      {
        title: "Complexity",
        body: `Each node is visited once and does work proportional to its number of children, so the total time is O(n) for a tree with n nodes. The memory is O(h) for the recursion stack, where h is the height, which is O(log n) for a balanced tree and O(n) for a chain. The returned pair or tuple is constant size. If the number of situations per node is s, the time is O(n * s) for binary trees, or O(n * s^2) when combining the children's tuples requires pairing situations, as in some counting problems. Nothing here depends on values being small, unlike knapsack.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `A null child must return the neutral answer for every situation, and it must be the right neutral value: zero for sums, but "covered" for the camera problem, not "needs cover". The second pitfall is mixing up which entry of a child's pair to use: the robbed node uses the child's skip value, never the child's best. Third, in the camera problem forgetting the final check of the root leaves a bare root uncovered. Fourth, a global counter or answer variable must be reset between test cases when it lives in a struct or a static. Fifth, deep recursion on a chain-shaped tree can overflow the stack on large inputs; check the constraints and switch to iteration if needed. Sixth, the empty tree returns zero for both problems. Finally, do not try to apply a greedy rule such as "rob the level with the larger sum": it fails on trees where the best houses sit on different levels.`,
      },
      {
        title: "Practice order",
        body: `Start with House Robber III: the two-value pair is the simplest tree DP and mirrors the line version, so you can compare the two. Then Binary Tree Cameras, where you must find the right set of situations yourself; draw the three cases on paper before writing any code. After these, try the diameter of a binary tree and the maximum path sum, which use the same bottom-up return plus a global answer.`,
      },
    ],
  },
  "bitmask-dp-assign": {
    intro:
      "Bitmask dynamic programming for assignment problems uses a set of already used items, stored as the bits of one integer, as the state. You reach for it when you must order, assign or group at most about twenty items and the cost of a choice depends on which items are already taken: visiting cities (travelling salesman), giving each worker a different job, packing tasks into the fewest sessions. It replaces n! orderings by 2^n subsets.",
    sections: [
      {
        title: "The intuition",
        body: `A salesman must visit n cities once each and return home, minimising the total distance. Trying every order costs n! steps, which is hopeless beyond about twelve cities. But notice what the future cost depends on. Suppose you have already visited a set S of cities and are standing in city j. To finish the tour, it does not matter in which order you visited the cities of S, only which cities they are and where you stand now. Many different orders lead to the same pair (S, j), and the best of them is the only one worth remembering.

So the state is a pair: the set of visited cities and the current city. The value is the shortest distance of a route that starts at city 0, visits exactly the cities in S, and ends at j. There are 2^n sets and n possible endings, so about n * 2^n states, and each one looks at n possible previous cities, for a total of n^2 * 2^n steps. For n = 20 that is a few hundred million simple operations, feasible, where n! would not even be countable.

A set of at most 30 items fits in one integer: bit i is set when item i is in the set. Adding an item is mask | (1 << i), testing is (mask >> i) & 1, and iterating over all subsets is a loop from 0 to 2^n - 1. Because adding an item always makes the integer larger, looping masks in increasing order guarantees every smaller subset has been computed before the bigger one that needs it, so no special evaluation order is needed.

The same idea solves assignment: when you give job number popcount(mask) to one of the workers not yet used, the mask alone says which job comes next, so the state is just the mask.`,
      },
      {
        title: "Why it works",
        body: `The principle of optimality for subsets: an optimal route through the set S that ends at j has a last step from some city p in S minus j, and the part before that step must itself be an optimal route through S minus j ending at p. If it were not, replacing it by a shorter one gives a shorter route through S ending at j, a contradiction. That gives the recurrence dp[S][j] = min over p in S minus j of dp[S minus j][p] + dist[p][j].

The base case is the starting state: dp[{0}][0] = 0, the route that has visited only the start. Every other state with a single element is unreachable. The answer is the best way to visit all cities and return: the minimum over j of dp[all][j] + dist[j][0].

For assignment the argument is simpler. Assign jobs in order 0, 1, 2, ... to workers. After k jobs have been assigned, the set of used workers has exactly k elements, so the mask determines k and therefore the next job. dp[mask] is the cheapest cost of assigning the first popcount(mask) jobs to the workers in the mask. Extending the mask by a free worker w adds cost[popcount(mask)][w]. The number of states is 2^n, and each has up to n transitions.

For grouping problems such as packing tasks into sessions, the state is the set of tasks already placed, and the value is a pair: the number of sessions used and how full the last one is. Pairs compare naturally, with fewer sessions better and, for equal sessions, less time used in the last one better. This is valid because a smaller used time in the last session can only help later tasks fit; a lexicographic minimum is therefore the right thing to keep.

The reason the method is limited to about twenty items is purely the 2^n factor, which grows by a factor of two with each extra item and by a million between twenty and forty.`,
      },
      {
        title: "A worked example",
        body: `Travelling salesman on four cities with distances: 0-1 is 10, 0-2 is 15, 0-3 is 20, 1-2 is 35, 1-3 is 25, 2-3 is 30. Let dp[S][j] be the shortest route from city 0 through exactly the cities in S ending at j.

Sets of two cities (0 and one more): dp[{0,1}][1] = 10, dp[{0,2}][2] = 15, dp[{0,3}][3] = 20.
Sets of three: dp[{0,1,2}][2] = 10 + 35 = 45 (via 1), dp[{0,1,2}][1] = 15 + 35 = 50 (via 2). dp[{0,1,3}][3] = 10 + 25 = 35, dp[{0,1,3}][1] = 20 + 25 = 45. dp[{0,2,3}][3] = 15 + 30 = 45, dp[{0,2,3}][2] = 20 + 30 = 50.
All four cities: dp[all][1] = min(dp[{0,2,3}][2] + 35, dp[{0,2,3}][3] + 25) = min(85, 70) = 70. dp[all][2] = min(dp[{0,1,3}][1] + 35, dp[{0,1,3}][3] + 30) = min(80, 65) = 65. dp[all][3] = min(dp[{0,1,2}][1] + 25, dp[{0,1,2}][2] + 30) = min(75, 75) = 75.

Returning home: 70 + 10 = 80 from city 1, 65 + 15 = 80 from city 2, 75 + 20 = 95 from city 3. The shortest tour has length 80, for example 0, 1, 3, 2, 0 with 10 + 25 + 30 + 15.

For the assignment variant, with four workers and four jobs and a cost matrix, dp[0] = 0, and for each mask the next job index is the number of set bits. For the cost matrix [[9, 2, 7, 8], [6, 4, 3, 7], [5, 8, 1, 8], [7, 6, 9, 4]] the cheapest assignment costs 13: job 0 to worker 1 (2), job 1 to worker 0 (6), job 2 to worker 2 (1), job 3 to worker 3 (4).`,
      },
      {
        title: "Implementation",
        body: `The travelling salesman table has 2^n rows and n columns, with a large value for unreachable states. The loop over masks is increasing. For each mask that contains the start, and each current city in it, try every city not yet visited as the next stop. A mask that does not contain city 0 is never reached and is skipped. The final loop closes the tour. The code returns a large sentinel when n is 1 only if there is no tour, but a single city has length zero, so it is handled first.`,
        code: `int travellingSalesman(const vector<vector<int>>& dist) {
    int n = dist.size();
    if (n <= 1) return 0;
    const int INF = 1000000000;
    vector<vector<int>> dp(1 << n, vector<int>(n, INF));
    dp[1][0] = 0;  // only city 0 visited, standing at city 0
    for (int mask = 1; mask < (1 << n); mask++) {
        if (!(mask & 1)) continue;
        for (int last = 0; last < n; last++) {
            if (dp[mask][last] == INF || !((mask >> last) & 1)) continue;
            for (int next = 0; next < n; next++) {
                if ((mask >> next) & 1) continue;
                int nextMask = mask | (1 << next);
                dp[nextMask][next] = min(dp[nextMask][next], dp[mask][last] + dist[last][next]);
            }
        }
    }
    int best = INF;
    for (int last = 1; last < n; last++) {
        if (dp[(1 << n) - 1][last] != INF) best = min(best, dp[(1 << n) - 1][last] + dist[last][0]);
    }
    return best;
}`,
      },
      {
        title: "Implementation: assigning jobs to workers",
        body: `The assignment problem needs only a one-dimensional table because the number of set bits in the mask tells which job is next. dp[mask] is the cheapest cost of giving the first popcount(mask) jobs to the workers in the mask. Extending the mask by a free worker adds the cost of the next job for that worker. The answer is dp of the full mask. The same table solves any problem in which items are matched one to one and the cost of the next match depends only on which partners are taken.`,
        code: `int minAssignmentCost(const vector<vector<int>>& cost) {
    int n = cost.size();
    const int INF = 1000000000;
    vector<int> dp(1 << n, INF);
    dp[0] = 0;
    for (int mask = 0; mask < (1 << n); mask++) {
        if (dp[mask] == INF) continue;
        int job = __builtin_popcount(mask);  // the next job to hand out
        if (job == n) continue;
        for (int worker = 0; worker < n; worker++) {
            if ((mask >> worker) & 1) continue;
            int nextMask = mask | (1 << worker);
            dp[nextMask] = min(dp[nextMask], dp[mask] + cost[job][worker]);
        }
    }
    return dp[(1 << n) - 1];
}`,
      },
      {
        title: "Implementation: packing tasks into sessions",
        body: `Minimum Number of Work Sessions asks how many sessions of a fixed length are needed to finish all tasks, where a task must fit completely in one session. The state is the set of tasks done. The value is a pair: sessions used and time used in the last session. To add task i to a state, try to put it in the current session; if it does not fit, open a new session. Taking the smallest pair under the lexicographic order keeps the best state for every set. The loop tries every last task for every mask, so the cost is n * 2^n.`,
        code: `int minWorkSessions(const vector<int>& tasks, int sessionTime) {
    int n = tasks.size();
    vector<pair<int, int>> best(1 << n, {n + 1, 0});  // (sessions, time used in the last one)
    best[0] = {1, 0};
    for (int mask = 1; mask < (1 << n); mask++) {
        for (int i = 0; i < n; i++) {
            if (!((mask >> i) & 1)) continue;
            pair<int, int> state = best[mask ^ (1 << i)];
            if (state.second + tasks[i] <= sessionTime) {
                state.second += tasks[i];
            } else {
                state.first++;
                state.second = tasks[i];
            }
            best[mask] = min(best[mask], state);
        }
    }
    return best[(1 << n) - 1].first;
}`,
      },
      {
        title: "Variants",
        body: `Hamiltonian path and cycle existence use boolean tables. Counting the number of Hamiltonian paths replaces the minimum by a sum. Partitioning a set into groups with a limit per group, covering a set with the fewest subsets, and the assignment of people to tasks with a bitmask of skills are the same machinery. When the items are on a grid and one row is the state (broken profile or the profile of a row), the mask describes which cells of the current row are filled, and the table is indexed by the row and the mask. Meet in the middle, with 2^(n/2) on each side, handles n around forty where the full mask table is too large. For subset-sum style counting over submasks, iterating over all submasks of a mask gives a 3^n algorithm, useful for partition into groups.`,
      },
      {
        title: "Complexity",
        body: `The travelling salesman table has n * 2^n states and each tries n transitions, so the time is O(n^2 * 2^n) and the memory O(n * 2^n). For n = 20 that is about 400 million operations and 80 MB with 4-byte integers, close to the practical limit. The assignment and session tables have 2^n states with n transitions each, so O(n * 2^n) time and O(2^n) memory. The numbers grow quickly: n = 15 is instant, n = 20 needs care, n = 25 needs compression such as storing only one layer of masks with the same number of bits. Because the time is exponential in n but only polynomial in everything else, this method is appropriate only when the statement promises a small n, often 15 to 20.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Check n in the constraints before choosing the method: if it is above twenty-something, a mask table cannot work and the problem wants a different idea. Use unsigned or 1LL shifts when n may reach 32 or more; 1 << 31 overflows a signed int. Initialise the table with a large value and skip unreachable states, otherwise adding a distance to infinity overflows. Remember the start: for the tour, only masks that contain the start city are meaningful, and the start must be the first element. Do not forget to close the tour by adding the return distance. Handle n = 0 and n = 1 explicitly. In the pair-valued sessions table, compare pairs lexicographically: sessions first, then time used. Finally, check that a single task never exceeds the session length, otherwise no packing exists and the answer is undefined.`,
      },
      {
        title: "Practice order",
        body: `Start with Travelling Salesman (bitmask DP), which is the canonical example: write the table, trace the four-city case by hand and then code it. Then Minimum Number of Work Sessions to Finish the Tasks, where the value is a pair and the transition decides whether to open a new session. When both feel natural, write the assignment version from the code above without looking and test it on random small matrices against a brute force over permutations.`,
      },
    ],
  },
  "dp-optimizations": {
    intro:
      "DP optimisations are techniques that speed up a dynamic program whose transition looks at many earlier states, by proving that only a few of them can ever be best. They turn an O(n^2) or O(n^2 * k) recurrence into O(n log n) or O(n * k * log n). They are rare in interviews and common in contests; the goal here is to know they exist, to recognise the shape of recurrence each one fits, and to be able to write the two simplest: the monotone queue and divide and conquer.",
    sections: [
      {
        title: "The intuition",
        body: `Many recurrences have the form dp[i] = best over j of (dp[j] + cost(j, i)), where j ranges over some earlier positions. Computing one state takes O(n) steps, so the whole table costs O(n^2), too slow when n is a hundred thousand. An optimisation works when you can say something about which j wins, without trying them all.

There are four standard shapes. First, the window is limited: j must lie in [i - k, i - 1] and the extra cost does not depend on j, so you want the maximum of dp over a sliding window, which a monotone queue maintains in amortised constant time. Second, the cost is a product of a term in j and a term in i, as in cost = a[j] * x[i] + b[j]; each j is a line, the question is the minimum of many lines at a point, and a convex hull of lines answers it quickly. Third, the best j never moves left as i grows (monotone optimum): divide and conquer finds all optima in n log n by solving the middle i first and splitting the search range. Fourth, a special case of the third for interval DPs, Knuth's optimisation, says opt[l][r - 1] <= opt[l][r] <= opt[l + 1][r], which collapses the three nested loops to O(n^2).

You do not need to prove which one applies in an interview. You need to recognise the warning signs: a recurrence with a min or max over a range of earlier indices, n above ten thousand, and a cost function with structure (a window, a product, a convex or monotone shape).`,
      },
      {
        title: "Why it works",
        body: `The monotone queue works because of a dominance argument. When you add a new candidate j' to the window, any older candidate j with dp[j] <= dp[j'] can never be the maximum again: j' is at least as large and it will stay in the window longer, since windows slide forward. So you may delete j from the queue. The queue therefore holds candidates in decreasing order of value, and its front is the maximum of the window. Each element enters once and leaves once, which gives the amortised constant cost.

Divide and conquer optimisation works when the best choice opt(i) is monotone: opt(i) <= opt(i + 1). Compute opt for the middle index mid by scanning the allowed range [lo, hi] of candidates. Then the indices to the left of mid have their optimum in [lo, opt(mid)], and those to the right in [opt(mid), hi]. At each depth of the recursion the candidate ranges overlap only at their boundaries, so the total scanning work at one depth is O(n), and there are O(log n) depths. The monotonicity itself follows from a quadrangle inequality on the cost: cost(a, c) + cost(b, d) <= cost(a, d) + cost(b, c) for a <= b <= c <= d. Squares of sums satisfy it, which is why the example below works; it does not hold for arbitrary costs, so the technique needs a check, usually by brute force on small inputs.

The convex hull trick works because the lower envelope of a set of lines is a convex piecewise linear function, and queries at increasing x move monotonically along it. Lines that are never on the envelope can be discarded, exactly as dominated candidates are discarded in the queue. Knuth's optimisation has a similar monotonicity argument for the split points of an interval DP, and needs the same quadrangle inequality plus monotonicity of the cost on nested intervals.

In every case the proof has the same structure: show that a family of candidates can be pruned or ordered, then show that the pruning loses no optimum.`,
      },
      {
        title: "A worked example",
        body: `Constrained Subsequence Sum: choose a non-empty subsequence of an array such that any two consecutive chosen elements are at most k positions apart, with maximum sum. Let dp[i] be the best sum of a valid subsequence that ends at position i. Then dp[i] = a[i] + max(0, max of dp[j] for j in [i - k, i - 1]). The window maximum is exactly what the monotone queue provides.

Take a = [10, 2, -10, 5, 20] and k = 2.
dp[0] = 10. The queue holds index 0.
dp[1] = 2 + max(0, dp[0]) = 12. Index 1 has a larger value than index 0, so index 0 is dropped; the queue holds index 1.
dp[2] = -10 + max(0, dp[1] = 12) = 2. Index 2 has a smaller value, so it joins behind index 1.
dp[3] = 5 + max(0, max(dp[1], dp[2])) = 5 + 12 = 17. The window for i = 3 is indexes 1 to 2, both still inside, and the front of the queue (index 1) gives the maximum 12. Index 3 has a larger value than the two behind it, so they are dropped and the queue holds index 3.
dp[4] = 20 + max(0, max(dp[2], dp[3])) = 20 + 17 = 37. The window is indexes 2 to 3.

The answer is the largest dp value, 37, from the subsequence 10, 2, 5, 20.

For divide and conquer, take the array [1, 2, 3, 4] to be split into k = 2 groups of consecutive elements, minimising the sum of the squares of the group sums. The split [1, 2, 3] and [4] gives 36 + 16 = 52, the split [1, 2] and [3, 4] gives 9 + 49 = 58, and [1] and [2, 3, 4] gives 1 + 81 = 82. The best is 52, and the best split point moves right as the number of elements grows, which is the monotonicity the method needs.`,
      },
      {
        title: "Implementation",
        body: `The monotone queue for the window maximum. The deque stores indices whose dp values are decreasing from front to back. Before computing dp[i], drop from the front any index that has left the window. The maximum is the front, or zero when taking nothing is better. After computing dp[i], drop from the back every index with a value not larger than dp[i], then push i. The answer is the largest dp value over all positions, and it must be taken over the table because a subsequence may end anywhere.`,
        code: `int constrainedSubsetSum(const vector<int>& a, int k) {
    int n = a.size();
    vector<int> dp(n);
    deque<int> window;  // indices with decreasing dp values
    int answer = INT_MIN;
    for (int i = 0; i < n; i++) {
        while (!window.empty() && window.front() < i - k) window.pop_front();
        int bestBefore = window.empty() ? 0 : max(0, dp[window.front()]);
        dp[i] = a[i] + bestBefore;
        while (!window.empty() && dp[window.back()] <= dp[i]) window.pop_back();
        window.push_back(i);
        answer = max(answer, dp[i]);
    }
    return answer;
}`,
      },
      {
        title: "Implementation: divide and conquer on the best split",
        body: `Split an array into k groups of consecutive elements minimising the sum of squared group sums. Layer g of the table depends only on layer g - 1: cur[i] = min over j < i of prev[j] + (sum of elements j..i-1)^2. Because the best j does not decrease as i grows, a recursive function solves the middle index of a range by scanning only the candidate range it is given, then recurses on both halves with narrowed candidate ranges. Each layer costs O(n log n), so the whole table costs O(k * n log n) instead of O(k * n^2).`,
        code: `struct SquaresPartition {
    vector<long long> pre, prev, cur;

    long long cost(int from, int to) const {  // sum of elements from..to-1, squared
        long long s = pre[to] - pre[from];
        return s * s;
    }

    void solve(int lo, int hi, int optLo, int optHi) {
        if (lo > hi) return;
        int mid = (lo + hi) / 2;
        long long best = LLONG_MAX;
        int bestJ = optLo;
        for (int j = optLo; j <= min(mid - 1, optHi); j++) {
            if (prev[j] == LLONG_MAX) continue;
            long long value = prev[j] + cost(j, mid);
            if (value < best) {
                best = value;
                bestJ = j;
            }
        }
        cur[mid] = best;
        solve(lo, mid - 1, optLo, bestJ);
        solve(mid + 1, hi, bestJ, optHi);
    }
};

long long minSquaresPartition(const vector<int>& a, int groups) {
    int n = a.size();
    SquaresPartition sp;
    sp.pre.assign(n + 1, 0);
    for (int i = 0; i < n; i++) sp.pre[i + 1] = sp.pre[i] + a[i];
    sp.prev.assign(n + 1, LLONG_MAX);
    sp.prev[0] = 0;
    for (int g = 1; g <= groups; g++) {
        sp.cur.assign(n + 1, LLONG_MAX);
        sp.solve(g, n, g - 1, n - 1);  // g groups need at least g elements
        sp.prev = sp.cur;
    }
    return sp.prev[n];
}`,
      },
      {
        title: "Variants",
        body: `The convex hull trick handles recurrences like dp[i] = min over j of (dp[j] + b[j] * a[i]) when the slopes b[j] are monotone: maintain the lower envelope of lines in a deque and pop lines from the back when a new line makes them useless; if the queries a[i] are also monotone, a pointer walks along the hull, and the whole DP is linear. With arbitrary query order, binary search the hull, or use a Li Chao tree, which stores one line per node of a segment tree over the query coordinates and answers in O(log n). Knuth's optimisation applies to interval DPs such as the optimal binary search tree and merging files, reducing O(n^3) to O(n^2). Slope trick maintains a convex function through its breakpoints in a heap and solves problems with absolute-value costs. Aliens trick (lambda optimisation) removes a dimension by adding a penalty per group and binary searching the penalty.`,
      },
      {
        title: "Complexity",
        body: `The monotone queue brings O(n * k) down to O(n), since each index enters and leaves once. Divide and conquer optimisation turns O(k * n^2) into O(k * n log n). The convex hull trick gives O(n) for monotone slopes and queries, O(n log n) otherwise. Knuth's optimisation gives O(n^2) for interval DPs that were O(n^3). The memory stays at the size of the DP table, or one layer for the divide and conquer version if you keep only the previous layer, as the code does. These bounds are worth remembering as a table: when the constraints say n is 10^5 and a quadratic DP is the obvious solution, one of these four is probably the intended one.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `The first pitfall is applying an optimisation to a cost function that does not have the required structure. Divide and conquer silently gives a wrong answer when the optimum is not monotone, so always test against the quadratic version on random small inputs before trusting it. Second, in the monotone queue, drop expired indices before reading the front, and compare with the right strictness when popping from the back; using the wrong sign keeps stale candidates. Third, handle unreachable states in the previous layer: the candidate range must start where the previous layer is valid, as the code does with g - 1. Fourth, use 64-bit integers for sums and squares, and be careful when adding to the sentinel value for impossible states. Fifth, the number of groups cannot exceed the number of elements. Sixth, the convex hull trick needs care with integer overflow in the intersection comparison; cross-multiply with wide integers instead of dividing.`,
      },
      {
        title: "Practice order",
        body: `The roadmap lists this pattern as one entry, Know they exist: monotone queue DP, convex hull trick, divide & conquer DP, Knuth. Treat it as a four-step course. First write the monotone queue solution of Constrained Subsequence Sum and compare it with the quadratic version. Then implement the divide and conquer split above and verify it against the quadratic DP on random arrays. After that read about the convex hull trick and Knuth's optimisation, and implement each once on a small problem so that you can recognise the recurrence shapes. They are unlikely to be asked in an interview, but a quick mention of the technique shows depth when you explain why a quadratic solution is not the end of the road.`,
      },
    ],
  },
};
