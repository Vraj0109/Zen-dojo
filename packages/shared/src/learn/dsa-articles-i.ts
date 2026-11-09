import type { PatternArticle } from "./types";

// Full pattern articles, group "Dynamic programming, part 1" (step 8): dp-1d, knapsack, lis, grid-dp, two-string-dp (plan 0008). Format and rules: plan 0007. Code is C++17. Blocks of one article are
// concatenated and compiled together, so helper names are unique per article.

export const DSA_ARTICLES_I: Record<string, PatternArticle> = {
  "dp-1d": {
    intro:
      "One-dimensional dynamic programming solves problems where you walk along a line of positions and at each one make a choice that depends only on a few earlier answers. You reach for it when a brute-force recursion would branch twice at every index (take it or skip it, one step or two) and the same sub-question keeps coming back. The whole technique is: name the sub-question, write the recurrence, fill a table in an order that always has the needed answers ready.",
    sections: [
      {
        title: "The intuition",
        body: `Start with a question you can answer by hand. A staircase has n steps and you climb one or two at a time. How many ways are there to reach the top? Think about the last move. You arrived on step n either from step n - 1 (a one-step move) or from step n - 2 (a two-step move). Every way to reach step n is a way to reach one of those two steps, followed by one fixed final move. So ways(n) = ways(n - 1) + ways(n - 2). You did not need to list the paths. You only needed to believe that the answer for n is built from smaller answers of the same question.

That is the whole idea of dynamic programming on a line. A state is a small description of "where I am" (here, just the step number). The recurrence says how the answer for a state is built from answers of earlier states. The base cases are the states you can answer directly (zero steps: one way, the empty climb). If you code the recurrence as plain recursion, the same states are solved again and again and the running time is exponential. If you remember each answer the first time you compute it, every state is solved once and the running time is the number of states times the work per state.

For optimisation problems the same shape appears with max or min instead of a sum. House Robber: you may not rob two neighbouring houses. Let best(i) be the most money from the first i houses. Either you skip house i, and you have best(i - 1), or you rob it, add its money to best(i - 2) (the previous house is off limits), and take the larger. The question you ask at each index is always the same: what are my choices here, and which earlier answers does each choice lead to?

A practical test for whether 1D DP applies: can you describe the situation after processing a prefix of the input with a single number or a very small tuple, such that the future only depends on that description and not on how you got there? If yes, that description is your state.`,
      },
      {
        title: "Why it works",
        body: `Two properties make the method correct, and you should check both before trusting a recurrence.

Optimal substructure: an optimal answer for a state is built from optimal answers of smaller states. For House Robber, suppose the best plan for the first i houses robs house i. Then the other houses in that plan form a plan for the first i - 2 houses, and it must be an optimal one. If it were not, you could swap in a better plan for those houses, keep house i, and get a better plan overall, which contradicts the assumption. The same exchange argument works for every recurrence of this kind: a better sub-solution can always be pasted into the big solution.

Overlapping subproblems: the number of distinct states is small even though the number of paths is huge. For a line of n positions there are only n states, but there are about 2^n ways to choose subsets of positions. Memoisation collapses all paths that arrive at the same state into one computation.

The evaluation order is the third thing to get right. A table entry may only be computed after every entry it reads. With a recurrence that reads smaller indices (i - 1, i - 2) you simply fill the array from left to right. If the recurrence ever reads a larger index, the order has to change, or the problem is not a simple line DP. When in doubt, write the recursion with memoisation first: it computes entries in whatever order is needed and fails loudly (infinite recursion) if the dependencies are circular.

Correctness of the base cases matters as much as the recurrence. best(0) = 0 means "no houses, no money". best(1) = a[0]. If you start the loop at i = 2 and forget best(1), every later answer is wrong. Prove each base case in one sentence, the way you proved the recurrence.`,
      },
      {
        title: "A worked example",
        body: `Trace House Robber on the houses with money a = [2, 7, 9, 3, 1]. Let best[i] be the most money from the first i houses, with best[0] = 0.

best[1] = 2. Only one house, rob it.
best[2] = max(best[1], best[0] + a[1]) = max(2, 0 + 7) = 7. Robbing house two alone beats house one alone.
best[3] = max(best[2], best[1] + a[2]) = max(7, 2 + 9) = 11. Houses one and three together give 11.
best[4] = max(best[3], best[2] + a[3]) = max(11, 7 + 3) = 11. Adding house four to the best plan for two houses gives only 10, so skipping wins.
best[5] = max(best[4], best[3] + a[4]) = max(11, 11 + 1) = 12. Houses one, three and five give 2 + 9 + 1 = 12.

The answer is 12. To recover which houses, walk back from i = 5. best[5] = 12 differs from best[4] = 11, so house five was robbed; jump to i = 3. best[3] = 11 differs from best[2] = 7, so house three was robbed; jump to i = 1. best[1] = 2 differs from best[0] = 0, so house one was robbed. The chosen houses are one, three and five.

Notice how little work this is. Five states, one max per state. The brute force would have tried every subset with no two neighbours, which grows like the Fibonacci numbers.`,
      },
      {
        title: "Implementation",
        body: `The direct table version. best[i] is the answer for the first i items, so the table has n + 1 entries and the base case best[0] = 0 sits naturally in front. Each iteration reads the two entries just behind it, which is why a left-to-right loop is a valid order. The function handles the empty input explicitly because indexing a[0] would otherwise be undefined.`,
        code: `int robLinear(const vector<int>& a) {
    int n = a.size();
    if (n == 0) return 0;
    vector<int> best(n + 1, 0);  // best[i] = most money from the first i houses
    best[1] = a[0];
    for (int i = 2; i <= n; i++) {
        best[i] = max(best[i - 1], best[i - 2] + a[i - 1]);
    }
    return best[n];
}`,
      },
      {
        title: "Implementation: two variables instead of a table",
        body: `Each entry reads only the two entries behind it, so the rest of the table is never looked at again. Keep just those two numbers and slide them forward. This takes the memory from O(n) to O(1) and is what an interviewer expects once the table version works. The names say what the variables hold at the start of each iteration: before is best for the first i - 2 houses, after is best for the first i - 1 houses.`,
        code: `int robTwoVariables(const vector<int>& a) {
    int before = 0;  // best for the houses up to two steps back
    int after = 0;   // best for the houses up to the previous one
    for (int money : a) {
        int now = max(after, before + money);
        before = after;
        after = now;
    }
    return after;
}`,
      },
      {
        title: "Implementation: recovering the choice",
        body: `A table also lets you answer "which houses?" without storing any extra decisions. Walk backwards from the end. If best[i] equals best[i - 1], house i was skipped and you move to i - 1. Otherwise house i must have been robbed, because the only other value the maximum could take is the one that includes it; record it and jump to i - 2. Reversing at the end puts the houses in order. This works for any recurrence that is a max or min over a few options: re-evaluate which option produced the stored value.`,
        code: `vector<int> robChosenHouses(const vector<int>& a) {
    int n = a.size();
    if (n == 0) return {};
    vector<int> best(n + 1, 0);
    best[1] = a[0];
    for (int i = 2; i <= n; i++) best[i] = max(best[i - 1], best[i - 2] + a[i - 1]);
    vector<int> picked;
    int i = n;
    while (i >= 1) {
        if (best[i] == best[i - 1]) {
            i--;  // house i was skipped
        } else {
            picked.push_back(i - 1);  // zero-based index of the robbed house
            i -= 2;
        }
    }
    reverse(picked.begin(), picked.end());
    return picked;
}`,
      },
      {
        title: "Variants",
        body: `The same skeleton appears under many names. Counting problems replace max with a sum (Climbing Stairs, Decode Ways). Reachability problems store a boolean (Word Break asks whether a prefix of the string can be cut into dictionary words). Minimising problems store a cost (Jump Game II, the fewest jumps to reach the end). Circular arrangements, like houses on a ring, are solved by running the linear version twice: once without the first house and once without the last, and taking the larger answer. A state with a small extra flag (did I take the previous item?) becomes two variables per index and leads towards the state-machine pattern.

When the transition looks back a variable distance instead of a fixed one (Word Break checks every dictionary word length ending at i), the work per state grows to the number of choices, and the total is states times choices.`,
      },
      {
        title: "Variants: counting ways",
        body: `Decode Ways maps a string of digits to letters (1 is A up to 26 is Z) and asks in how many ways the string can be read. Let ways[i] be the count for the first i characters. A single non-zero digit extends every reading of the prefix of length i - 1. A valid two-digit number from 10 to 26 extends every reading of the prefix of length i - 2. The two contributions are added. A digit 0 on its own is invalid, which is the classic trap: it only works as the second half of 10 or 20.`,
        code: `int decodeWays(const string& s) {
    int n = s.size();
    vector<long long> ways(n + 1, 0);
    ways[0] = 1;  // one way to read the empty prefix
    for (int i = 1; i <= n; i++) {
        if (s[i - 1] != '0') ways[i] += ways[i - 1];
        if (i >= 2) {
            int two = (s[i - 2] - '0') * 10 + (s[i - 1] - '0');
            if (two >= 10 && two <= 26) ways[i] += ways[i - 2];
        }
    }
    return (int)ways[n];
}`,
      },
      {
        title: "Complexity",
        body: `The running time is the number of states times the work to compute one state. A line of n positions with a constant number of earlier entries read per state is O(n) time. If each state tries every earlier position (Word Break, the longest jump options), the cost is O(n) per state and O(n^2) overall, sometimes improved with a hash set or a trie. The memory is O(n) for the table and O(1) when only a fixed window of earlier entries is read. Counting problems can overflow: the number of ways grows like a Fibonacci number, so use long long or the modulus the problem asks for, and apply it after every addition, not only at the end.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Check the empty input and the single element first; many wrong answers come from reading a[0] or best[1] when they do not exist. Be precise about what an index means: best[i] for the first i items versus best[i] for the item at position i leads to off-by-one bugs, so write the meaning in a comment. Initialise to the right neutral value: 0 for sums and maxima of non-negative numbers, a very large number for minima, but remember that adding to a "very large" value can overflow, so test for it before adding. If values can be negative, a maximum that starts at 0 is wrong, because the best plan might be to take nothing only when that is allowed. Finally, do not apply a greedy rule to a problem that needs DP: robbing the richest house first and then banning its neighbours fails on 2, 3, 2, where greedy takes the 3 and stops at 3, while the right answer is 2 + 2 = 4.`,
      },
      {
        title: "Practice order",
        body: `Start with Climbing Stairs, where the recurrence is the Fibonacci rule and you can focus on the base cases. Then House Robber, to practise a max with a skip, and extend it to the circular variant. Decode Ways adds conditions on which transitions are legal and the zero trap. Word Break moves from a fixed lookback to a variable one and from numbers to booleans. Finish with Jump Game II, which has a DP solution that is easy to write and a greedy one that is faster; compare them and see why the greedy works here but not for House Robber.`,
      },
    ],
  },
  knapsack: {
    intro:
      "Knapsack problems ask you to choose items under a budget, such as a weight limit, a target sum or an amount of money, and either maximise a value, minimise a count or count the ways. The state is the budget used so far, and the table is indexed by that budget. You reach for it when the numbers in the problem are small enough to index an array (a target of a few thousand) but the number of subsets is far too large to try.",
    sections: [
      {
        title: "The intuition",
        body: `You have items with a weight and a value and a bag that holds capacity W. Each item can be taken once or left. A brute force tries all 2^n subsets. The saving comes from noticing that the subsets matter only through two numbers: the weight they use and the value they hold. Two different subsets with the same weight are interchangeable for the future, so you only need to remember the best value for each possible weight.

That gives the state: dp[c] is the best value achievable using total weight at most c. When you consider one more item (weight w, value v) you have two choices for each capacity c. Leave the item, and the answer stays dp[c]. Take it, and you need room for it, so you add v to the best you could do with the remaining capacity c - w, which is dp[c - w] measured before this item was considered. The new dp[c] is the larger of the two.

There are three common flavours. In 0/1 knapsack each item is used at most once. In unbounded knapsack each item may be used any number of times, as with coins. In bounded knapsack there are k copies of an item, which you can treat as k separate items. Many interview problems hide the knapsack: Partition Equal Subset Sum is "can I reach exactly half the total", Target Sum is "count ways to reach a signed sum", and Coin Change is "fewest items to reach exactly an amount". Recognise it by the phrase "choose some items so that a total equals or stays under a number".`,
      },
      {
        title: "Why it works",
        body: `The correctness argument is the same optimal-substructure argument as for any DP, with one subtlety that is the source of most bugs: the order in which you loop decides whether an item can be reused.

Think of the table after processing the first k items: dp_k[c] is the best value using only those k items with capacity c. The recurrence is dp_k[c] = max(dp_{k-1}[c], dp_{k-1}[c - w_k] + v_k). Both terms on the right belong to the previous round, k - 1. That is exactly the rule "item k is used at most once": the second term spends item k once, and it adds to an answer that has not used item k yet.

When you compress the two-dimensional table into a single array, you overwrite dp in place. If you loop capacities from small to large, then when you compute dp[c] the entry dp[c - w] has already been updated in this same round, so it may already include item k. The item is counted twice, and the loop has silently turned into the unbounded version. If you loop capacities from large to small, dp[c - w] has not been touched yet this round and still holds the previous round's value, which is what the recurrence needs. So 0/1 knapsack loops downward and unbounded knapsack loops upward, and the difference is the entire difference between the problems.

For counting problems the loop order has a second meaning. With items on the outer loop and amounts on the inner loop, each combination is counted once, in a fixed item order. With amounts on the outer loop and items on the inner loop, the same set of items in a different order is counted again, which counts permutations. Coin Change II asks for combinations, so the coin loop is the outer one.`,
      },
      {
        title: "A worked example",
        body: `Trace 0/1 knapsack with capacity 7 and four items given as (weight, value): (1, 1), (3, 4), (4, 5), (5, 7). Keep one array dp[0..7], all zeros at the start, and for each item update capacities from 7 down to the item's weight.

Item (1, 1): every capacity from 1 up can hold it, giving dp = [0, 1, 1, 1, 1, 1, 1, 1].
Item (3, 4): dp[7] = max(1, dp[4] + 4) = 5, dp[6] = max(1, dp[3] + 4) = 5, dp[5] = 5, dp[4] = max(1, dp[1] + 4) = 5, dp[3] = max(1, dp[0] + 4) = 4. Now dp = [0, 1, 1, 4, 5, 5, 5, 5].
Item (4, 5): dp[7] = max(5, dp[3] + 5) = 9, dp[6] = max(5, dp[2] + 5) = 6, dp[5] = max(5, dp[1] + 5) = 6, dp[4] = max(5, dp[0] + 5) = 5. Now dp = [0, 1, 1, 4, 5, 6, 6, 9].
Item (5, 7): dp[7] = max(9, dp[2] + 7) = 9, dp[6] = max(6, dp[1] + 7) = 8, dp[5] = max(6, dp[0] + 7) = 7. Now dp = [0, 1, 1, 4, 5, 7, 8, 9].

The answer dp[7] = 9 comes from the items of weight 3 and 4. Look at what the downward order protected. When item (4, 5) set dp[7], it read dp[3], which still held 4 from the previous round. Had we looped upward on the very first item (1, 1), dp[2] would have read the freshly updated dp[1] and become 2, using the single item twice, and the whole table would have answered the unbounded problem instead.`,
      },
      {
        title: "Implementation",
        body: `0/1 knapsack in one array. The outer loop is over items, the inner loop runs capacities downward and stops at the item's weight, since smaller capacities cannot hold it. The array has capacity + 1 entries because capacity 0 is a valid state. For a "can I reach exactly this sum" question, replace the values with booleans, start with reachable[0] = true and use the same downward loop with an or.`,
        code: `int knapsack01(const vector<int>& weight, const vector<int>& value, int capacity) {
    vector<int> dp(capacity + 1, 0);  // dp[c] = best value with total weight at most c
    for (size_t i = 0; i < weight.size(); i++) {
        for (int c = capacity; c >= weight[i]; c--) {
            dp[c] = max(dp[c], dp[c - weight[i]] + value[i]);
        }
    }
    return dp[capacity];
}

bool canReachSum(const vector<int>& nums, int target) {
    vector<char> reachable(target + 1, 0);
    reachable[0] = 1;  // the empty subset makes sum 0
    for (int x : nums) {
        for (int s = target; s >= x; s--) {
            if (reachable[s - x]) reachable[s] = 1;
        }
    }
    return reachable[target];
}`,
      },
      {
        title: "Implementation: unbounded items and coin change",
        body: `When items may repeat, loop capacities upward so that an item can build on an answer that already used it. Coin Change asks for the fewest coins that sum to exactly an amount. Here dp[a] is the fewest coins for amount a, with dp[0] = 0 and a large sentinel meaning "unreachable". The sentinel must be checked before adding one, otherwise the sentinel plus one overflows or looks reachable. If the final entry is still the sentinel, return -1.`,
        code: `int coinChangeFewest(const vector<int>& coins, int amount) {
    const int INF = 1000000000;
    vector<int> dp(amount + 1, INF);  // dp[a] = fewest coins to make a
    dp[0] = 0;
    for (int a = 1; a <= amount; a++) {
        for (int c : coins) {
            if (c <= a && dp[a - c] != INF) dp[a] = min(dp[a], dp[a - c] + 1);
        }
    }
    return dp[amount] == INF ? -1 : dp[amount];
}`,
      },
      {
        title: "Implementation: counting combinations",
        body: `To count the ways to make an amount where the order of coins does not matter, put the coin loop on the outside and the amount loop on the inside, both increasing. Each coin is then introduced once, and every way is built by adding coins in the order they appear in the list, which counts each multiset exactly once. Swapping the two loops would count sequences, so 1 + 2 and 2 + 1 would be two different ways. Use a wide integer or the modulus from the problem statement, because these counts grow very fast.`,
        code: `long long countCoinCombinations(const vector<int>& coins, int amount) {
    vector<long long> ways(amount + 1, 0);
    ways[0] = 1;  // one way to make 0: use no coins
    for (int c : coins) {
        for (int a = c; a <= amount; a++) {
            ways[a] += ways[a - c];
        }
    }
    return ways[amount];
}`,
      },
      {
        title: "Variants",
        body: `Target Sum (put a plus or minus in front of each number to reach a target) is a counting subset-sum in disguise. If P is the set with plus signs and N the set with minus signs, then sum(P) - sum(N) = target and sum(P) + sum(N) = total, so sum(P) = (total + target) / 2. The problem becomes "count subsets with a given sum", provided that quantity is a non-negative integer. Ones and Zeroes has two budgets, zeros and ones, so the table is two-dimensional and both indices loop downward. Partition Equal Subset Sum asks whether half of the total is reachable. Bounded knapsack with many copies of the same item can be solved by splitting counts into powers of two, which turns k copies into about log k separate 0/1 items.`,
      },
      {
        title: "Complexity",
        body: `The time is the number of items times the capacity, O(n * W), and the memory is O(W) with the one-dimensional array. This is called pseudo-polynomial because W is a value, not the size of the input: a capacity of a billion makes the table unusable even with three items, and then you need a different method such as meet in the middle. The unbounded versions cost the same, O(n * W). For two budgets the cost is O(n * W1 * W2). If you only need feasibility, a bitset shifts the whole reachable set at once and divides the time by the word size.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `The first pitfall is the direction of the capacity loop, which was explained above: downward for each item at most once, upward for unlimited use. The second is the sentinel for impossible states in minimisation, which must be tested before it is added to. The third is forgetting the base case dp[0]: the empty selection makes sum zero reachable and gives one way. Fourth, in counting problems the order of the two loops changes the meaning from combinations to permutations. Fifth, a target of zero, an empty item list and items heavier than the capacity are all legal inputs, and the loops must simply do nothing for them. Finally, check the parity and range conditions before running the DP when a problem is reduced to a subset-sum target: an odd total can never be split into two equal halves, and a negative target for the subset sum means the answer is zero.`,
      },
      {
        title: "Practice order",
        body: `Begin with Coin Change, because it uses the unbounded upward loop and a minimum with a sentinel. Then Coin Change II, to feel how the loop order separates combinations from permutations. Partition Equal Subset Sum is the cleanest 0/1 feasibility problem. Target Sum is the reduction exercise, where the real work is turning signs into a subset sum. Finish with Ones and Zeroes, which has two budgets and teaches you to loop both indices downward.`,
      },
    ],
  },
  lis: {
    intro:
      "The longest increasing subsequence problem asks for the longest chain of elements, not necessarily next to each other, that go strictly up from left to right. It appears directly, and also in disguise whenever you must nest, stack or order items by two properties (envelopes, boxes, pairs). The simple solution is a quadratic dynamic program; the fast one keeps, for every length, the smallest possible last value and finds its place with binary search.",
    sections: [
      {
        title: "The intuition",
        body: `Take the array 10, 9, 2, 5, 3, 7, 101, 18. A subsequence keeps the original order but may skip elements, and increasing means each chosen element is larger than the one before it. One longest answer is 2, 3, 7, 18 with length 4.

The first way to think about it is by endpoints. Let L[i] be the length of the longest increasing subsequence that ends exactly at position i. To compute it, look at every earlier position j with a[j] < a[i]: any chain ending at j can be extended by a[i]. So L[i] = 1 + max(L[j]) over those j, or 1 if there is none. The answer is the maximum over all i, not L[n - 1], because the best chain does not have to end at the last element.

The second way to think about it is by length. For each length k, remember the smallest value that can end an increasing subsequence of length k. Call the list tails. Smaller tails are better because they are easier to extend. As you read a new number x, you ask: what is the longest chain x can extend? That is the first length whose tail is not smaller than x. Putting x there either lengthens the best chain (if x is larger than every tail) or lowers one tail to make future extensions easier. The list tails stays sorted, so the place for x is found by binary search. The size of tails at the end is the answer.`,
      },
      {
        title: "Why it works",
        body: `The quadratic recurrence is correct by the usual substructure argument: a longest chain ending at i, with its last element removed, is a chain ending at some j before i with a[j] < a[i], and it must be a longest one for j, otherwise a longer chain at j could be extended by a[i].

The fast method needs a real proof because tails does not itself contain a subsequence. The claim is an invariant: after reading a prefix, tails[k] is the minimum possible last value of an increasing subsequence of length k + 1 inside that prefix, and tails is strictly increasing. To see that tails is increasing, take a chain of length k + 2 that ends at value t. Remove its last element and you get a chain of length k + 1 that ends at a value smaller than t, so the best tail for length k + 1 is smaller than the best tail for length k + 2.

Now read x. Let p be the first index with tails[p] >= x. A chain of length p + 1 ending at x exists, because tails[p - 1] < x is the end of a chain of length p that x can extend. The smallest end for length p + 1 was tails[p], and x is not larger, so the entry is replaced by x. If no tail is >= x, then x extends the longest chain and a new length appears. All other entries stay valid because x cannot improve them. The invariant is restored after every element, so the final length of tails is the length of the longest increasing subsequence.

The word strictly matters. For strictly increasing chains you replace the first tail that is greater than or equal to x (lower bound). For non-decreasing chains, equal elements are allowed, so you replace the first tail that is greater than x (upper bound).`,
      },
      {
        title: "A worked example",
        body: `Run the tails method on 10, 9, 2, 5, 3, 7, 101, 18.

Read 10: tails is empty, so append. tails = [10].
Read 9: the first tail >= 9 is 10, replace it. tails = [9]. A chain of length one can now end at 9.
Read 2: the first tail >= 2 is 9, replace it. tails = [2].
Read 5: all tails are smaller, append. tails = [2, 5]. A chain of length two ends at 5 (2, 5).
Read 3: the first tail >= 3 is 5, replace it. tails = [2, 3]. The chain 2, 3 ends lower than 2, 5, so it is a better base for the future.
Read 7: append. tails = [2, 3, 7].
Read 101: append. tails = [2, 3, 7, 101].
Read 18: the first tail >= 18 is 101, replace it. tails = [2, 3, 7, 18].

The length is 4. Note that tails = [2, 3, 7, 18] happens to be an actual longest chain here, but that is luck: in general tails holds only the best possible ends and may mix elements that never appear together in one subsequence. For the quadratic method on the same input the table is L = [1, 1, 1, 2, 2, 3, 4, 4]. For example L[5] = 3 for the value 7, because L[3] = 2 for value 5 and a[3] = 5 < 7, so 7 extends a chain of length 2.`,
      },
      {
        title: "Implementation",
        body: `The quadratic table. L[i] starts at 1 because every element is a chain of length one by itself. The inner loop looks at all earlier positions that are smaller. Use it when n is a few thousand, when you need the actual subsequence (by keeping a parent array), or when the problem adds conditions between the elements that a pure comparison cannot express.`,
        code: `int lisQuadratic(const vector<int>& a) {
    int n = a.size();
    if (n == 0) return 0;
    vector<int> len(n, 1);  // len[i] = longest increasing chain ending at i
    int best = 1;
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < i; j++) {
            if (a[j] < a[i]) len[i] = max(len[i], len[j] + 1);
        }
        best = max(best, len[i]);
    }
    return best;
}`,
      },
      {
        title: "Implementation: tails and binary search",
        body: `The fast method keeps the sorted list of smallest tails and uses lower_bound to find the first entry that is not smaller than x. If it returns the end, x extends the longest chain and is appended; otherwise the entry is overwritten. Each element costs one binary search. To allow equal elements in the chain (non-decreasing), change lower_bound to upper_bound.`,
        code: `int lisFast(const vector<int>& a) {
    vector<int> tails;  // tails[k] = smallest possible last value of a chain of length k + 1
    for (int x : a) {
        auto it = lower_bound(tails.begin(), tails.end(), x);
        if (it == tails.end()) tails.push_back(x);
        else *it = x;
    }
    return (int)tails.size();
}`,
      },
      {
        title: "Implementation: counting the longest chains",
        body: `Number of Longest Increasing Subsequence asks how many different chains reach the maximum length. Keep two arrays in the quadratic method: len[i], the length of the best chain ending at i, and cnt[i], how many chains of that length end at i. When an earlier j gives a longer chain for i, the count is replaced by cnt[j]. When it gives an equally long one, the count is increased by cnt[j]. At the end, add the counts of every position whose length equals the global best.`,
        code: `int countLongestChains(const vector<int>& a) {
    int n = a.size();
    if (n == 0) return 0;
    vector<int> len(n, 1), cnt(n, 1);
    int best = 1;
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < i; j++) {
            if (a[j] >= a[i]) continue;
            if (len[j] + 1 > len[i]) {
                len[i] = len[j] + 1;
                cnt[i] = cnt[j];
            } else if (len[j] + 1 == len[i]) {
                cnt[i] += cnt[j];
            }
        }
        best = max(best, len[i]);
    }
    int total = 0;
    for (int i = 0; i < n; i++) {
        if (len[i] == best) total += cnt[i];
    }
    return total;
}`,
      },
      {
        title: "Variants",
        body: `Many problems are LIS after a reduction. Longest non-decreasing subsequence switches to upper_bound. Longest decreasing subsequence reverses the comparison. The minimum number of deletions to make an array increasing is n minus the LIS. Russian Doll Envelopes asks how many envelopes nest when both width and height must be strictly larger: sort by width ascending and, for equal widths, by height descending, then take the LIS of the heights. The descending tie-break is what stops two envelopes of equal width from being chained, because within a group of equal widths the heights go down and a strictly increasing chain can use at most one of them.`,
      },
      {
        title: "Variants: nesting two dimensions",
        body: `The sort-then-LIS trick turns a two-dimensional nesting problem into a one-dimensional one. After sorting by the first coordinate, the order of the array guarantees the first coordinate is non-decreasing, so the second coordinate alone decides whether a chain is valid, and the tie-break removes the equal-first-coordinate cases. The same idea solves the box stacking and the longest chain of pairs problems, as long as the relation you need is "strictly smaller in every coordinate".`,
        code: `int maxEnvelopes(vector<vector<int>> envelopes) {
    sort(envelopes.begin(), envelopes.end(), [](const vector<int>& x, const vector<int>& y) {
        return x[0] != y[0] ? x[0] < y[0] : x[1] > y[1];  // width up, height down for ties
    });
    vector<int> heights;
    for (const auto& e : envelopes) {
        auto it = lower_bound(heights.begin(), heights.end(), e[1]);
        if (it == heights.end()) heights.push_back(e[1]);
        else *it = e[1];
    }
    return (int)heights.size();
}`,
      },
      {
        title: "Complexity",
        body: `The endpoint table takes O(n^2) time and O(n) memory. The tails method takes O(n log n) time, since each element needs one binary search over a list of at most n entries, and O(n) memory. The count of longest chains is O(n^2) in the simple form and can be brought to O(n log n) with a Fenwick tree over compressed values. The Russian Doll solution costs O(n log n) for the sort and the same for the search. If n is at most about five thousand the quadratic table is fine and easier to extend; beyond that use the binary search method.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `The commonest mistake is to return the last table entry instead of the maximum over all positions. The second is mixing up strict and non-strict: lower_bound for strictly increasing, upper_bound for non-decreasing, and the same distinction in the comparison a[j] < a[i]. The third is to treat the tails array as the answer sequence: it has the right length, but it is not always a valid subsequence, so to print the chain you need parent pointers or a position array. Fourth, an empty array has length zero and a one-element array has length one; both must work without special code paths beyond the empty check. Fifth, in the envelope problem, forgetting the descending tie-break gives answers that are too large when widths repeat. Finally, remember that LIS works on the order of the given array, so sort only when the problem lets you reorder the items.`,
      },
      {
        title: "Practice order",
        body: `Start with Longest Increasing Subsequence and write both the quadratic and the binary search versions, checking them against each other on random arrays. Then Number of Longest Increasing Subsequence, which forces you to carry a second array alongside the first. Finish with Russian Doll Envelopes to practise the sort-and-reduce trick, and notice that it fails if you forget the tie-break rule for equal widths.`,
      },
    ],
  },
  "grid-dp": {
    intro:
      "Grid dynamic programming fills a table the same shape as the input grid, where each cell's answer depends on cells above it, to its left or diagonally behind it. It covers counting paths, cheapest paths, the largest square or rectangle of a kind, and longest runs through a matrix. You reach for it whenever a problem lets you move in a fixed direction (right and down) and asks for a count, a minimum or a maximum over all routes.",
    sections: [
      {
        title: "The intuition",
        body: `Picture a robot in the top-left corner of a grid that may only move right or down. How many routes lead to the bottom-right corner? Stand on any cell and ask how the robot got there. It came either from the cell above or from the cell to the left, and nowhere else. So the number of routes to a cell is the number of routes to the cell above plus the number to the left. The first row and first column have only one way in, so they are all ones. Every other cell is one addition. The grid is the table, and the order in which you fill it is simply the order in which the robot could have arrived: row by row, left to right.

The same picture gives the cheapest path. If each cell has a cost, the cheapest route to a cell is its own cost plus the cheaper of the two ways in. A grid problem is therefore a line problem in two dimensions: the state is a pair (row, column), the recurrence looks at a constant number of neighbours that come earlier in the filling order, and the answer sits in a corner or is the best value anywhere in the table.

Some problems let you move in more than two directions, or in a direction that depends on the values (the longest increasing path in a matrix). There the neighbour cells are not always earlier in a simple order, but the dependency graph between cells still has no cycles because each step must go strictly up in value. Then you use memoised recursion instead of a fixed loop order and let the recursion find a valid order.`,
      },
      {
        title: "Why it works",
        body: `Correctness rests on three observations. First, every route to a cell passes through exactly one of the allowed predecessor cells just before it, so the set of routes to the cell splits into disjoint groups, one per predecessor. That is why counting adds the predecessor counts without double counting, and why minimising takes the minimum over the predecessors: the best route to the cell is the best route to some predecessor plus the final step.

Second, the table is filled in an order that guarantees each predecessor is final before the cell reads it. For moves right and down, row-major order does this. If the allowed moves were also left, a cell could depend on a cell to its right and the simple loops would be wrong; you would need a shortest-path algorithm like Dijkstra instead of DP.

Third, the base cases are the border. Cells in the first row have no predecessor above, and cells in the first column have none to the left. The cleanest way to handle them is to pad the table with an extra row and column of neutral values, or to write the border initialisation separately. Obstacles are cells whose count is forced to zero, which also stops them from contributing to later cells.

For the largest-square problem the recurrence is less obvious. Let side[i][j] be the side length of the largest all-ones square whose bottom-right corner is the cell (i, j). If the cell is zero, the side is zero. Otherwise the square can be at most one larger than the smallest of the squares ending at the three cells above, to the left and diagonally above-left, because a larger square would need all three of them to be large enough. The minimum of the three plus one is both an upper bound and achievable, which proves the recurrence.`,
      },
      {
        title: "A worked example",
        body: `Trace Minimum Path Sum on the grid with rows [1, 3, 1], [1, 5, 1], [4, 2, 1]. The robot starts at the top-left and moves right or down, and the cost of a route is the sum of the cells it visits. Let cost[i][j] be the cheapest route sum to cell (i, j).

First row: you can only come from the left, so cost = [1, 1 + 3, 1 + 3 + 1] = [1, 4, 5].
Second row: the first cell can only come from above, 1 + 1 = 2. The middle cell has cost 5 and can come from above (4) or from the left (2): 5 + min(4, 2) = 7. The last cell has cost 1 and can come from above (5) or from the left (7): 1 + min(5, 7) = 6. Row two is [2, 7, 6].
Third row: the first cell is 4 + 2 = 6. The middle cell has cost 2 and can come from above (7) or from the left (6): 2 + min(7, 6) = 8. The last cell has cost 1: 1 + min(6, 8) = 7.

The answer is 7, from the route right, right, down, down: 1 + 3 + 1 + 1 + 1. The table at the end is [1, 4, 5], [2, 7, 6], [6, 8, 7]. To print the route, walk back from the corner and at each cell step to whichever predecessor has the smaller value.`,
      },
      {
        title: "Implementation",
        body: `The cheapest-path table. The first cell is its own cost, the first row and column accumulate along the border, and every other cell adds the smaller of its two predecessors. The function copies nothing: it reuses the input grid as the table, which is acceptable when the caller does not need the original values. If you must not modify the input, use a separate table of the same size.`,
        code: `int minPathSum(vector<vector<int>> grid) {
    int rows = grid.size();
    int cols = rows ? grid[0].size() : 0;
    for (int i = 0; i < rows; i++) {
        for (int j = 0; j < cols; j++) {
            if (i == 0 && j == 0) continue;
            int fromAbove = i > 0 ? grid[i - 1][j] : INT_MAX;
            int fromLeft = j > 0 ? grid[i][j - 1] : INT_MAX;
            grid[i][j] += min(fromAbove, fromLeft);
        }
    }
    return rows ? grid[rows - 1][cols - 1] : 0;
}`,
      },
      {
        title: "Implementation: one row of memory and obstacles",
        body: `Each row depends only on the row above it, so keep a single array of length cols and update it in place. When you read ways[j] before overwriting it, it still holds the value from the row above; ways[j - 1] has already been updated for the current row, so it is the value from the left. An obstacle cell sets its count to zero. The first cell starts the counting with one way, unless it is itself an obstacle, in which case the answer is zero.`,
        code: `int uniquePathsWithObstacles(const vector<vector<int>>& blocked) {
    int rows = blocked.size();
    int cols = rows ? blocked[0].size() : 0;
    if (rows == 0 || blocked[0][0] == 1) return 0;
    vector<long long> ways(cols, 0);
    ways[0] = 1;
    for (int i = 0; i < rows; i++) {
        for (int j = 0; j < cols; j++) {
            if (blocked[i][j] == 1) ways[j] = 0;
            else if (j > 0) ways[j] += ways[j - 1];
        }
    }
    return (int)ways[cols - 1];
}`,
      },
      {
        title: "Implementation: the largest square",
        body: `Maximal Square asks for the area of the biggest square made only of ones. The table stores the side of the largest square ending at each cell as its bottom-right corner, using the minimum-of-three rule. The answer is the largest side anywhere, squared. A padded first row and column of zeros removes the special cases at the border and keeps the loop uniform.`,
        code: `int maximalSquare(const vector<vector<char>>& matrix) {
    int rows = matrix.size();
    int cols = rows ? matrix[0].size() : 0;
    vector<vector<int>> side(rows + 1, vector<int>(cols + 1, 0));
    int best = 0;
    for (int i = 1; i <= rows; i++) {
        for (int j = 1; j <= cols; j++) {
            if (matrix[i - 1][j - 1] == '1') {
                side[i][j] = 1 + min({side[i - 1][j], side[i][j - 1], side[i - 1][j - 1]});
                best = max(best, side[i][j]);
            }
        }
    }
    return best * best;
}`,
      },
      {
        title: "Variants",
        body: `Counting routes, cheapest routes and squares are the core. Related problems change the moves or the goal. Unique Paths with obstacles zeroes blocked cells. Dungeon-style problems (minimum starting health) are solved backwards from the goal, because the quantity you need at a cell depends on what comes later. Cherry Pickup sends two walkers at once, so the state grows to a row and two columns. The Longest Increasing Path in a Matrix allows four directions but only to strictly larger values, which makes the dependency graph acyclic; solve it with memoised depth-first search where each cell stores the longest path starting there. Triangle and falling-path problems are grids with a different shape of predecessors.`,
      },
      {
        title: "Variants: memoised search when the order is not obvious",
        body: `When the neighbours are not all earlier in row-major order, write the recursion on cells and cache the result of each one. The cache turns the exponential search into one visit per cell, because each cell's answer is computed once. This is the right tool for the longest increasing path: the longest path starting at a cell is one plus the best of the longest paths starting at its larger neighbours, and since values strictly increase no cell can depend on itself.`,
        code: `int longestIncreasingPathFrom(const vector<vector<int>>& m, vector<vector<int>>& memo, int r, int c) {
    if (memo[r][c] != 0) return memo[r][c];
    static const int dr[4] = {1, -1, 0, 0};
    static const int dc[4] = {0, 0, 1, -1};
    int best = 1;
    for (int k = 0; k < 4; k++) {
        int nr = r + dr[k], nc = c + dc[k];
        if (nr < 0 || nc < 0 || nr >= (int)m.size() || nc >= (int)m[0].size()) continue;
        if (m[nr][nc] > m[r][c]) best = max(best, 1 + longestIncreasingPathFrom(m, memo, nr, nc));
    }
    return memo[r][c] = best;
}

int longestIncreasingPath(const vector<vector<int>>& m) {
    if (m.empty()) return 0;
    vector<vector<int>> memo(m.size(), vector<int>(m[0].size(), 0));
    int best = 0;
    for (int r = 0; r < (int)m.size(); r++)
        for (int c = 0; c < (int)m[0].size(); c++) best = max(best, longestIncreasingPathFrom(m, memo, r, c));
    return best;
}`,
      },
      {
        title: "Complexity",
        body: `A grid with R rows and C columns has R * C states, and with a constant number of neighbours per state the time is O(R * C). The memory is O(R * C) for the full table, or O(C) when each row depends only on the previous one. The memoised search has the same time bound, plus the recursion depth, which can reach R * C in the worst case for a snake-shaped increasing path; on large inputs convert it to an iterative order (sort cells by value) to avoid a stack overflow. Counting problems may overflow quickly, since the number of routes in a 17 by 17 grid already exceeds the range of a 32-bit integer.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Off-by-one errors on the border are the most common bug; padding the table with a row and column removes most of them. Check an empty grid and a grid with one row or one column, where the answer is a straight line. When using the one-row optimisation, be careful about which value is old and which is new at the moment you read it. When obstacles exist, the start or the end can itself be blocked, which makes the answer zero. For the minimum-path problems, do not use a zero border: it would make the cheapest route sneak along a fake row of free cells, so use a large value for out-of-range predecessors instead. In the square problem, the answer is the area, so square the side before returning it. Finally, make sure a cell's meaning is stated once, in a comment, and kept consistent: the largest square ending here, the cheapest route to here, the longest path starting here.`,
      },
      {
        title: "Practice order",
        body: `Begin with Unique Paths to see counting on a grid and the border of ones. Add obstacles and the one-row memory trick, then do Minimum Path Sum to switch from sums of counts to minima. Maximal Square is the first problem where the recurrence is not an obvious two-neighbour rule, and is a good proof exercise. Then Longest Increasing Path in a Matrix for memoised search, and Cherry Pickup as a hard follow-up with two walkers and a larger state.`,
      },
    ],
  },
  "two-string-dp": {
    intro:
      "Two-string dynamic programming compares two sequences by letting the state be a pair of prefixes: how much of the first string and how much of the second have been used so far. It solves alignment problems (edit distance, longest common subsequence), counting problems (distinct subsequences) and pattern matching with wildcards. You reach for it whenever the question is how two strings relate, and a greedy left-to-right scan would have to guess which letters to pair up.",
    sections: [
      {
        title: "The intuition",
        body: `Suppose you must turn the word horse into the word ros with the fewest single-letter edits (insert a letter, delete a letter, replace a letter). Look at the last letters of both words. If they are equal, they can simply be matched and the problem shrinks to the words without their last letters. If they differ, the last step must have been one of three things: replace the last letter of the first word by the last letter of the second, delete the last letter of the first word, or insert the last letter of the second word at the end of the first. Each of the three choices leaves a smaller pair of prefixes to solve.

That observation defines the state. Let dp[i][j] be the answer for the first i letters of the first string and the first j letters of the second string. The table has (n + 1) rows and (m + 1) columns, with row zero and column zero standing for the empty prefix. The answer for the full strings is in the bottom-right corner. Every cell is computed from at most three neighbours: above, to the left, and diagonally above-left, so a row-by-row fill is a valid order.

The same shape solves different questions by changing what the cell means and how the neighbours are combined. For the longest common subsequence, equal letters extend the diagonal by one and unequal letters take the larger of above and left. For wildcard matching, a star may consume zero or more letters, which adds a transition from the left or from above. The technique is a way of thinking about alignment: each cell asks what happens if the two prefixes end here.`,
      },
      {
        title: "Why it works",
        body: `The correctness argument looks at the last character of each prefix and shows that the set of ways to finish a pair of prefixes is split by the choice made last.

For edit distance, take any optimal sequence of edits that turns a[0..i) into b[0..j). Consider what happens to the last character of a and the last character of b. Either they are aligned with each other (a match when equal, a replacement when different), or the last character of a is deleted, or the last character of b is inserted. These cases are exhaustive and exclusive. In each case what remains is an optimal sequence for a smaller pair of prefixes, because if it were not optimal we could improve the whole solution by swapping in a better one. That gives dp[i][j] = min(dp[i-1][j-1] + (a[i-1] != b[j-1]), dp[i-1][j] + 1, dp[i][j-1] + 1), where dp[i-1][j-1] is used with cost zero for equal letters.

The base cases come from empty prefixes: turning an empty string into j letters costs j insertions, so dp[0][j] = j, and turning i letters into the empty string costs i deletions, so dp[i][0] = i. They are not an afterthought: if you forget them, every cell on the first row and column is wrong, and the errors spread to the whole table.

For the longest common subsequence the argument is similar. If the last letters are equal, some longest common subsequence can end with that letter, so dp[i][j] = dp[i-1][j-1] + 1. If they differ, at most one of them can be in the last position of the common subsequence, so the answer is the larger of dp[i-1][j] and dp[i][j-1]. The matrix is monotone: moving right or down never decreases a cell, which is why you can reconstruct a witness by walking backwards.`,
      },
      {
        title: "A worked example",
        body: `Trace edit distance from horse to ros. Rows are prefixes of horse (empty, h, ho, hor, hors, horse), columns are prefixes of ros (empty, r, ro, ros).

Row for the empty prefix: 0 1 2 3, since turning nothing into r, ro, ros takes 1, 2, 3 insertions.
Row h: starts with 1. Against r the letters differ: min(replace 0 + 1, delete 1 + 1, insert 1 + 1) = 1. Against ro: min(1 + 1, 2 + 1, 1 + 1) = 2. Against ros: 3. Row: 1 1 2 3.
Row ho: starts with 2. Against r they differ: min(1 + 1, 1 + 1, 2 + 1) = 2. Against ro the last letters o and o are equal, so the value is the diagonal, 1. Against ros they differ: min(2 + 1, 3 + 1, 1 + 1) = 2. Row: 2 2 1 2.
Row hor: starts with 3. Against r the letters are equal, so the value is the diagonal, 2. Against ro they differ: min(2 + 1, 1 + 1, 2 + 1) = 2. Against ros: min(1 + 1, 2 + 1, 2 + 1) = 2. Row: 3 2 2 2.
Row hors: starts with 4. Against r: min(3 + 1, 2 + 1, 4 + 1) = 3. Against ro: min(2 + 1, 2 + 1, 3 + 1) = 3. Against ros the letters s and s are equal, so the diagonal, 2. Row: 4 3 3 2.
Row horse: starts with 5. Against r: 4. Against ro: 4. Against ros: min(3 + 1, 2 + 1, 4 + 1) = 3. Row: 5 4 4 3.

The answer is 3: replace h by r, delete r, delete e, which turns horse into ros. Reading the table backwards (at each cell, which neighbour gave the value) recovers exactly such a sequence of operations.`,
      },
      {
        title: "Implementation",
        body: `Edit distance with two rolling rows. Row i of the table depends only on row i - 1 and on the cell just to its left in the same row, so two arrays are enough. The variable previous holds the old row and current is being filled. After each row they are swapped. If the strings are long, put the shorter one in the columns to keep the arrays small. The function returns the corner cell of the final row.`,
        code: `int editDistance(const string& a, const string& b) {
    int n = a.size(), m = b.size();
    vector<int> previous(m + 1), current(m + 1);
    for (int j = 0; j <= m; j++) previous[j] = j;  // empty prefix of a: j insertions
    for (int i = 1; i <= n; i++) {
        current[0] = i;  // empty prefix of b: i deletions
        for (int j = 1; j <= m; j++) {
            if (a[i - 1] == b[j - 1]) current[j] = previous[j - 1];
            else current[j] = 1 + min({previous[j - 1], previous[j], current[j - 1]});
        }
        swap(previous, current);
    }
    return previous[m];
}`,
      },
      {
        title: "Implementation: the longest common subsequence and its text",
        body: `The full two-dimensional table is needed when you want the subsequence itself, because the backward walk reads cells from every row. Fill it with the match-or-take-the-larger rule, then start at the corner: if the two letters are equal, they belong to the answer and you move diagonally; otherwise you move towards the larger neighbour. The letters are collected backwards, so reverse them at the end.`,
        code: `string longestCommonSubsequence(const string& a, const string& b) {
    int n = a.size(), m = b.size();
    vector<vector<int>> lcs(n + 1, vector<int>(m + 1, 0));
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            if (a[i - 1] == b[j - 1]) lcs[i][j] = lcs[i - 1][j - 1] + 1;
            else lcs[i][j] = max(lcs[i - 1][j], lcs[i][j - 1]);
        }
    }
    string text;
    int i = n, j = m;
    while (i > 0 && j > 0) {
        if (a[i - 1] == b[j - 1]) {
            text.push_back(a[i - 1]);
            i--;
            j--;
        } else if (lcs[i - 1][j] >= lcs[i][j - 1]) {
            i--;
        } else {
            j--;
        }
    }
    reverse(text.begin(), text.end());
    return text;
}`,
      },
      {
        title: "Implementation: counting and wildcards",
        body: `Counting problems change the combination from a minimum to a sum. Distinct Subsequences counts how many times t appears as a subsequence of s: if the letters match, you can either use this letter of s for this letter of t or skip it; if they differ you must skip it. The pattern matching problem with a star works on a boolean table: a star can match nothing (look left, at j - 1) or one more letter (look up, at i - 1), and a question mark or an equal letter looks at the diagonal. Both functions below use a full table because the transitions read both the row above and the current row.`,
        code: `long long countDistinctSubsequences(const string& s, const string& t) {
    int n = s.size(), m = t.size();
    vector<vector<long long>> ways(n + 1, vector<long long>(m + 1, 0));
    for (int i = 0; i <= n; i++) ways[i][0] = 1;  // the empty t appears once in any prefix
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            ways[i][j] = ways[i - 1][j];  // skip s[i - 1]
            if (s[i - 1] == t[j - 1]) ways[i][j] += ways[i - 1][j - 1];  // or use it
        }
    }
    return ways[n][m];
}

bool wildcardMatches(const string& s, const string& pattern) {
    int n = s.size(), m = pattern.size();
    vector<vector<char>> ok(n + 1, vector<char>(m + 1, 0));
    ok[0][0] = 1;
    for (int j = 1; j <= m; j++) {
        if (pattern[j - 1] == '*') ok[0][j] = ok[0][j - 1];  // a star may match nothing
    }
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            if (pattern[j - 1] == '*') ok[i][j] = ok[i][j - 1] || ok[i - 1][j];
            else if (pattern[j - 1] == '?' || pattern[j - 1] == s[i - 1]) ok[i][j] = ok[i - 1][j - 1];
        }
    }
    return ok[n][m];
}`,
      },
      {
        title: "Variants",
        body: `The same grid answers a family of questions. The shortest common supersequence has length n + m minus the longest common subsequence. The longest palindromic subsequence is the longest common subsequence of a string and its reverse. The minimum number of deletions to make two strings equal is n + m minus twice the common subsequence. Regular expression matching with a dot and a star is the wildcard table with a more careful star rule: a star applies to the letter before it and may repeat it zero or more times. Interleaving strings, where the third string must be a merge of the first two, uses the two prefix lengths as the state, and the third prefix length is implied by their sum. Whenever you see two sequences and a question about aligning, matching or merging them, set up the pair-of-prefixes table first.`,
      },
      {
        title: "Complexity",
        body: `The table has (n + 1) * (m + 1) cells and each cell takes constant time, so the time is O(n * m). The memory is O(n * m) for the full table, or O(min(n, m)) with rolling rows when you only need the final number and not the reconstruction. For strings of a few thousand characters this is fast; for strings of a hundred thousand characters the quadratic table is far too large and you need a different technique, such as the bit-parallel longest common subsequence or a suffix automaton for specific questions. Counting problems can overflow quickly, so use a wide integer type or the modulus in the statement.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Use length plus one in both dimensions so that the empty prefix has a row and a column; most off-by-one errors come from mixing up a prefix length i with the index i - 1 of its last character. Initialise the first row and column according to the meaning of the problem: insertions and deletions for edit distance, zeros for the longest common subsequence, ones in the first column for counting subsequences. When using rolling rows, remember to reset the first element of the current row on every iteration. In wildcard matching, a leading star can match an empty string, so the first row needs its own pass. In regular expression matching, a star cannot appear first and refers to the previous letter, which makes the zero-repeat transition jump back two pattern positions. Finally, compare characters with the right index (a[i - 1] and b[j - 1], not a[i]); a one-off here silently reads the wrong letter or goes out of range.`,
      },
      {
        title: "Practice order",
        body: `Start with Longest Common Subsequence, the simplest recurrence, and reconstruct the string once the length is right. Then Edit Distance, where every transition has a meaning you can say in words (replace, delete, insert). Distinct Subsequences adds counting and a different base case. Wildcard Matching introduces a star and the boolean table, and Regular Expression Matching is its harder cousin, because the star modifies the previous letter. Do them in this order and check each table by hand on a short example before running the code.`,
      },
    ],
  },
};
