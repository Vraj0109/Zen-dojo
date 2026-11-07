import type { PatternArticle } from "./types";

// Full pattern articles, group "Arrays and strings" (plan 0008, batch 1). Format and rules: plan 0007.
// Code is C++17. Blocks of one article are concatenated and compiled together, so helper names are unique per article.

export const DSA_ARTICLES_B: Record<string, PatternArticle> = {
  "prefix-sums": {
    intro:
      "A prefix sum array stores the running total of an array so that the sum of any range can be read with one subtraction. The same idea in reverse, the difference array, lets you add a value to a whole range in constant time. Reach for them when a problem asks many range questions about a fixed array, or many range updates followed by one read of the final values.",
    sections: [
      {
        title: "The intuition",
        body: `Suppose you are given an array of a million numbers and ten thousand questions of the form: what is the sum of the numbers from index l to index r? The direct answer loops from l to r for every question. In the worst case that is a million steps per question and ten billion steps in total. Almost all of that work is repeated, because the questions overlap heavily.

The trick is to do the repeated work once. Walk through the array a single time and write down the running total at every position. Call the result p, where p[i] is the sum of the first i elements. Now the sum from l to r is the total up to r minus the total before l. Two lookups and one subtraction, no loop.

Think of a road with kilometre markers. If the marker at your house says 12 and the marker at the shop says 19, the distance is 7. You never walk the road to find that out. A prefix sum array is the list of markers, and a range sum is the distance between two of them.

The second half of the pattern is the mirror image. If you must add 5 to every element from l to r, many times over, looping each time is slow. Instead record only the two places where the change starts and stops: add 5 at l and subtract 5 just after r. After all updates, one prefix sum pass over those marks rebuilds every final value. This is the difference array. Prefix sums and difference arrays are inverse operations: one turns an array into its running totals, the other turns running totals back into the changes.`,
        diagram: `flowchart LR
    A["Array a"] -->|"build once, O(n)"| P["Prefix array p"]
    P -->|"p[r+1] - p[l], O(1)"| Q["Range sum"]
    U["Range updates"] -->|"mark start and end, O(1) each"| D["Difference array d"]
    D -->|"prefix sum once, O(n)"| F["Final array"]`,
        diagramCaption: "Two directions of one idea: prefix sums answer range questions, difference arrays absorb range updates.",
      },
      {
        title: "Why it works",
        body: `Define p[0] = 0 and p[i] = a[0] + a[1] + ... + a[i-1]. The extra zero at the front is deliberate and it removes the special case for ranges that start at index 0.

The sum of a[l..r] (both ends included) is a[l] + ... + a[r]. The total up to and including r is p[r+1], which equals a[0] + ... + a[r]. The total before l is p[l], which equals a[0] + ... + a[l-1]. Subtracting cancels the shared part a[0..l-1] and leaves exactly a[l..r]. That is the entire proof, and it works because addition is associative and has an inverse, subtraction.

The difference array rests on the same algebra. Let d be an array of the same length as a with a[i] = d[0] + d[1] + ... + d[i]. In words, a is the prefix sum of d. If you add v to d[l], every a[i] with i >= l grows by v, because each of them includes d[l] in its running total. If you then subtract v from d[r+1], every a[i] with i >= r+1 shrinks by v and the net effect is that only positions l through r changed. One range update became two point updates, and reading the final array is one prefix sum pass.

This also tells you when the pattern does not apply. It needs an operation that can be undone. Sums, counts, xor and products of non-zero numbers can be subtracted or divided out. Maximum and minimum cannot: knowing the maximum of the first r elements and of the first l-1 elements tells you nothing about the maximum of the elements between. For those you need a sparse table or a segment tree, which are separate patterns.

Prefix sums also extend to two dimensions. Let p[i][j] be the sum of the rectangle from the top left corner to cell (i-1, j-1). A rectangle sum is then four lookups combined by inclusion and exclusion: big rectangle, minus the strip above, minus the strip to the left, plus the corner that was subtracted twice.`,
      },
      {
        title: "A worked example",
        body: `Take a = [3, 1, 4, 1, 5, 9, 2, 6] and build the prefix array by hand. Start with p[0] = 0. Then p[1] = 3, p[2] = 4, p[3] = 8, p[4] = 9, p[5] = 14, p[6] = 23, p[7] = 25, p[8] = 31.

Question: what is the sum from index 2 to index 5? That is 4 + 1 + 5 + 9 = 19. With the array: p[6] - p[2] = 23 - 4 = 19. Correct. Question: the sum of the first three elements, indices 0 to 2? p[3] - p[0] = 8 - 0 = 8, which is 3 + 1 + 4. The leading zero made the range starting at index 0 work without a special case.

Now the difference array. Start with an array of five zeros and apply two updates: add 10 to indices 1 through 3, then add 5 to indices 2 through 4. The difference array d has length six so that d[r+1] always exists. After the first update: d[1] += 10 and d[4] -= 10, so d = [0, 10, 0, 0, -10, 0]. After the second: d[2] += 5 and d[5] -= 5, so d = [0, 10, 5, 0, -10, -5].

Now take the running total: 0, 10, 15, 15, 5, 0. Drop the last element, which only existed to absorb the end of a range that reaches the final index. The answer is [0, 10, 15, 15, 5]. Check by hand: index 1 got only the first update, so 10. Indices 2 and 3 got both, so 15. Index 4 got only the second, so 5. Index 0 got nothing. It matches, and no update ever looped over its range.`,
      },
      {
        title: "Implementation",
        body: `The range sum structure is short. Use long long for the totals: a thousand values of a million overflow a 32-bit int in total even though each value fits. Build once in the constructor, then answer queries in constant time.

Keep the interface in terms of inclusive indices l and r, because that matches how problems are written, and keep the offset by one hidden inside the class so callers never think about it.`,
        code: `// Range sum query on an immutable array.
struct PrefixSum {
    vector<long long> p;  // p[i] = sum of the first i elements, p[0] = 0

    explicit PrefixSum(const vector<int>& a) : p(a.size() + 1, 0) {
        for (size_t i = 0; i < a.size(); i++) p[i + 1] = p[i] + a[i];
    }

    // Sum of a[l..r], both ends included. Requires 0 <= l <= r < a.size().
    long long range(int l, int r) const { return p[r + 1] - p[l]; }
};

// Difference array: add v to every index in [l, r], then read the final array once.
struct RangeAdd {
    vector<long long> d;  // one spare slot so that r + 1 is always valid

    explicit RangeAdd(int n) : d(n + 1, 0) {}

    void add(int l, int r, long long v) {
        d[l] += v;
        d[r + 1] -= v;
    }

    vector<long long> result() const {
        vector<long long> out(d.size() - 1);
        long long run = 0;
        for (size_t i = 0; i + 1 < d.size(); i++) {
            run += d[i];
            out[i] = run;
        }
        return out;
    }
};`,
      },
      {
        title: "Implementation: Product of Array Except Self",
        body: `Prefix products are the same idea with a different operation, and this problem shows the one place where prefix sums get subtle: you cannot divide by zero, so you cannot compute the total product and divide out each element. Instead, the answer for position i is the product of everything to its left times the product of everything to its right. Both are prefix-style running products, one from each end.

The code below does it in one output array. The first pass stores, at each position, the product of everything to its left. The second pass walks from the right keeping a running product of everything to the right and multiplies it in. No division, and the only extra memory is the output.`,
        code: `// Product of Array Except Self without division.
vector<int> productExceptSelf(const vector<int>& a) {
    int n = (int)a.size();
    vector<int> out(n, 1);
    for (int i = 1; i < n; i++) out[i] = out[i - 1] * a[i - 1];  // product of everything left of i
    int right = 1;
    for (int i = n - 1; i >= 0; i--) {
        out[i] *= right;  // multiply by the product of everything right of i
        right *= a[i];
    }
    return out;
}`,
      },
      {
        title: "Variants",
        body: `Prefix sums combine with a hash map to answer questions about subarrays with a target property rather than a given range. If the prefix before l and the prefix after r differ by exactly k, the subarray has sum k. So while scanning, keep a map from each prefix value to how many times it has occurred, and at every step look up how many earlier prefixes equal the current one minus k. This is the Subarray Sum Equals K trick from the hash map article, and it works with negative numbers, which sliding windows cannot handle.

Replace sums with other quantities and the same shape handles more problems. Store the count of vowels, or the count of ones minus the count of zeros, or the xor, or the sum modulo m. A subarray has sum divisible by m exactly when two prefix sums share the same remainder, which turns a quadratic search into one pass with an array of m counters.

Difference arrays appear whenever the problem lists intervals and asks for something about the overlap. Car Pooling asks whether the number of passengers ever exceeds the capacity: add the passengers at the pick-up stop, subtract them at the drop-off stop, and check the running total. Corporate Flight Bookings is the textbook range-add problem. For problems where the coordinates are huge but the number of events is small, replace the array with a sorted map of changes and sweep through it in order; that is the line sweep, a close relative.

The two-dimensional version stores p[i][j] for rectangles. It answers any rectangle sum in constant time after a quadratic build, and its difference-array twin supports adding to a rectangle with four point updates.`,
      },
      {
        title: "Complexity",
        body: `Building a prefix array costs O(n) time and O(n) space. Each range query then costs O(1). With q queries the total is O(n + q), against O(n * q) for the naive loop. That is the whole benefit, and it matters most when q is large.

A difference array costs O(1) per range update and O(n) once to read the result. With q updates the total is O(n + q). If you interleave updates and reads, so that you need the current value of an element between updates, the difference array stops being enough: each read needs a prefix sum over the differences, which is O(n) again. In that situation use a Fenwick tree or a segment tree, which handle both in O(log n).

The space can sometimes be reduced. Product of Array Except Self shows one way: reuse the output as the prefix array. Another is to keep only a running total when the problem needs a single pass and does not need arbitrary ranges. But the moment you need arbitrary ranges, you need the stored array.

Mind the size of the numbers. The prefix sum of n values each up to v is up to n * v, and with n = 100,000 and v = 1,000,000,000 that does not fit in 32 bits. Use long long for the prefix array by default.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `The most common bug is an off-by-one between inclusive and exclusive ends. Decide once whether your ranges are [l, r] or [l, r), write it in a comment, and derive the formula from it. With inclusive ends and p[0] = 0 the formula is p[r+1] - p[l]. If you ever find yourself writing p[r] - p[l-1], check what happens at l = 0, because p[-1] does not exist.

The second is the missing spare slot in a difference array. The update d[r+1] -= v writes one past the end when r is the last index. Allocate n + 1 entries, and remember to ignore the last one when you read the result.

Third, overflow, as above. The intermediate p[r+1] may be large even when the answer p[r+1] - p[l] is small. Using a 32-bit int can give wrong answers on large inputs that pass every small test.

Fourth, a prefix sum is a snapshot. If the array changes between queries, a prefix array built earlier is stale. Either rebuild, or switch to a Fenwick tree. Read the problem statement for the word immutable, as in Range Sum Query - Immutable, which tells you a plain prefix array is enough.

Fifth, applying the pattern to operations that cannot be undone. A range maximum cannot be recovered by subtracting two prefix maxima. If you catch yourself trying it, the right tool is different.

Edge cases to test: an empty array, a single element, a query covering the whole array, a query of length one, all negative numbers, and a range update touching the first and the last index.`,
      },
      {
        title: "Practice order",
        body: `1. Range Sum Query - Immutable (easy). The structure in its purest form. Write the class from memory, including the leading zero, and be able to say why it is there.
2. Product of Array Except Self (medium). The same shape with products and a ban on division. Do it with two arrays first, then with the output reused.
3. Car Pooling (medium). Your first difference array: passengers get on at one stop and off at another, and you check that the running total never goes over the capacity.
4. Corporate Flight Bookings (medium). Pure range add. If you can solve it in a few lines you have the pattern.

Afterwards, revisit Subarray Sum Equals K from the hash map article, and try a problem where the target is a remainder rather than a sum. Those two problems are where prefix sums turn into the strongest tool in this group.`,
      },
    ],
  },

  kadane: {
    intro:
      "Kadane's algorithm finds the best contiguous subarray in one pass by asking a single question at each position: is it better to extend the best subarray that ends just before this element, or to start fresh here? It is the smallest dynamic programming problem there is, and the way of thinking carries over to every problem that asks for an optimal contiguous stretch.",
    sections: [
      {
        title: "The intuition",
        body: `Given an array that may contain negative numbers, find the contiguous subarray with the largest sum. For [-2, 1, -3, 4, -1, 2, 1, -5, 4] the answer is 6, from the subarray [4, -1, 2, 1].

The direct approach tries every start and every end and sums them: cubic, or quadratic with prefix sums. We want one pass.

Think about walking along the array and standing at index i. Every subarray ending at i is "some subarray ending at i-1, extended by a[i]" or "just a[i] on its own". There is no third option. So the best subarray ending at i is a[i] plus the best subarray ending at i-1, but only if that one is helping. If the best sum ending at i-1 is negative, attaching it to a[i] can only make things worse, and you are better off dropping it and starting again at i.

That is the entire algorithm. Keep one number, the best sum of a subarray that ends exactly at the current position. At each step either add the current element to it or reset it to the current element. Separately keep the best value ever seen, because the winning subarray might end earlier than the last index.

A useful mental picture is a bank balance. You walk through the array adding and subtracting. Whenever the balance falls below zero, the history is a debt that no future gain wants to inherit, so you forgive it and start from zero. The answer is the highest the balance ever reaches.`,
        diagram: `flowchart TD
    S["At index i: cur = best sum ending at i-1"] --> Q{"cur is negative?"}
    Q -- yes --> R["Drop it: cur = a[i]"]
    Q -- no --> E["Extend it: cur = cur + a[i]"]
    R --> B["best = max(best, cur)"]
    E --> B`,
        diagramCaption: "One decision per element: extend the running subarray or start a new one.",
      },
      {
        title: "Why it works",
        body: `This is dynamic programming in its simplest form, so it is worth stating the state and the transition as a proof.

Let f(i) be the maximum sum of a subarray that ends exactly at index i and contains at least one element. Then f(0) = a[0], and for i > 0, f(i) = max(a[i], f(i-1) + a[i]). The first option is the one-element subarray, the second extends the best one ending at i-1. Every subarray ending at i falls in one of those two groups, and in the second group the best choice is to extend the best subarray ending at i-1, because adding a fixed a[i] preserves the order of the sums. This is the optimal substructure property.

The answer to the problem is the maximum of f(i) over all i, because the best subarray overall ends somewhere, and f at that position is its sum or better.

Now notice that f(i) depends only on f(i-1). So the array of f values never needs to be stored; one variable that is overwritten at each step is enough. That is where the O(1) space comes from.

The condition f(i-1) + a[i] versus a[i] simplifies to: is f(i-1) greater than zero? That is why people describe the algorithm as "reset when the running sum goes negative". The two descriptions are the same statement.

The all-negative case deserves a remark. If every number is negative, the best subarray is the single largest element. The version above handles it because it never lets the current sum start from an imaginary zero: it starts from a[0] and takes max(a[i], ...). A version that initialises best to 0 and returns it when every element is negative returns the wrong answer, an empty subarray, which the problem does not allow.`,
      },
      {
        title: "A worked example",
        body: `Trace a = [-2, 1, -3, 4, -1, 2, 1, -5, 4], writing cur (best sum ending here) and best (best seen so far).

Index 0, value -2: cur = -2, best = -2.
Index 1, value 1: the old cur is -2, which is negative, so reset: cur = 1. best = 1.
Index 2, value -3: cur = 1 + (-3) = -2. best stays 1.
Index 3, value 4: the old cur is -2, negative, so reset: cur = 4. best = 4.
Index 4, value -1: cur = 4 - 1 = 3. best stays 4.
Index 5, value 2: cur = 3 + 2 = 5. best = 5.
Index 6, value 1: cur = 5 + 1 = 6. best = 6.
Index 7, value -5: cur = 6 - 5 = 1. best stays 6.
Index 8, value 4: cur = 1 + 4 = 5. best stays 6.

The answer is 6. To recover the subarray, remember where the current run started: it was set to index 3 at the last reset, and best was last improved at index 6, so the subarray is indices 3 through 6, which is [4, -1, 2, 1]. Track a start index that moves to i on every reset, and when best improves record the pair (start, i).

Now the circular variant, with a = [5, -3, 5]. The ordinary Kadane gives 5. But a circular subarray may wrap around the end: taking the last 5 and the first 5 gives 10. The trick: a wrapping subarray is the total sum minus a non-wrapping subarray in the middle that was left out. To maximise the wrapped sum, minimise the middle part. The minimum subarray sum here is -3, the total is 7, and 7 - (-3) = 10. The answer is the larger of the ordinary maximum and the total minus the minimum.`,
      },
      {
        title: "Implementation",
        body: `The basic version keeps the two variables from the story. The loop starts at index 1 so that the first element seeds both values, which handles the all-negative array without a special case.

The second function also returns the start and end indices. It is the same loop with one extra variable, and it is what an interviewer asks for as a follow-up.`,
        code: `// Maximum Subarray: best sum of a non-empty contiguous subarray.
int maxSubArray(const vector<int>& a) {
    int cur = a[0], best = a[0];
    for (size_t i = 1; i < a.size(); i++) {
        cur = max(a[i], cur + a[i]);  // extend, or start fresh here
        best = max(best, cur);
    }
    return best;
}

// Same, but also report which subarray: returns {sum, startIndex, endIndex}.
struct KadaneResult {
    long long sum;
    int from, to;
};

KadaneResult maxSubArrayWithRange(const vector<int>& a) {
    long long cur = a[0], best = a[0];
    int start = 0, bestFrom = 0, bestTo = 0;
    for (int i = 1; i < (int)a.size(); i++) {
        if (cur < 0) {  // the history is a debt: start again at i
            cur = a[i];
            start = i;
        } else {
            cur += a[i];
        }
        if (cur > best) {
            best = cur;
            bestFrom = start;
            bestTo = i;
        }
    }
    return {best, bestFrom, bestTo};
}`,
      },
      {
        title: "Variants",
        body: `Maximum Product Subarray changes the operation and breaks the simple version, because a negative number flips the sign: a very negative running product becomes the largest after multiplying by another negative. The fix is to carry two values, the maximum and the minimum product ending at the current position, and at each step consider the element alone, the element times the old maximum, and the element times the old minimum. A zero resets both.

Maximum Sum Circular Subarray allows the subarray to wrap around, as in the worked example. The answer is the larger of the ordinary Kadane maximum and the total sum minus the minimum subarray sum. One edge case: if every element is negative, the minimum subarray is the entire array and total minus minimum is zero, which would mean an empty subarray. In that case return the ordinary maximum.

Other versions of the same state machine: the minimum subarray (flip the comparison), the longest subarray with sum at least zero, the maximum sum with at most one deletion (carry a state with and without a deletion used), and the best sum of a subarray with length at least k (combine Kadane with a prefix sum). Stock buying with one transaction is Kadane in disguise: the daily price differences form an array and the best profit is the maximum subarray sum of it.

In two dimensions, the maximum sum rectangle fixes a pair of rows, collapses the columns between them into one array of column sums, and runs Kadane on that array: cubic overall.`,
        code: `// Maximum Product Subarray: keep both the largest and the smallest product ending here.
int maxProductSubarray(const vector<int>& a) {
    int hi = a[0], lo = a[0], best = a[0];
    for (size_t i = 1; i < a.size(); i++) {
        int x = a[i];
        int cand1 = hi * x, cand2 = lo * x;
        hi = max({x, cand1, cand2});
        lo = min({x, cand1, cand2});
        best = max(best, hi);
    }
    return best;
}

// Maximum Sum Circular Subarray.
int maxSubarraySumCircular(const vector<int>& a) {
    int total = 0, curMax = 0, curMin = 0;
    int best = a[0], worst = a[0];
    for (int x : a) {
        total += x;
        curMax = max(x, curMax + x);
        best = max(best, curMax);
        curMin = min(x, curMin + x);
        worst = min(worst, curMin);
    }
    if (best < 0) return best;  // every element negative: the empty wrap is not allowed
    return max(best, total - worst);
}`,
      },
      {
        title: "Complexity",
        body: `One pass, constant work per element: O(n) time and O(1) extra space. Nothing can beat O(n) because every element can matter and must be read at least once.

Compare with the alternatives so that you can explain the gain. Trying all pairs of endpoints and summing is O(n^3). With prefix sums each sum is O(1), giving O(n^2). A divide and conquer solution splits the array in half and combines the best of the left, the best of the right, and the best crossing the middle, for O(n log n). Kadane's algorithm is the linear one, and the divide and conquer version is worth knowing because it is the natural starting point for segment trees, where you want to answer the same question on arbitrary ranges with updates.

Overflow: with n up to 100,000 and values up to 10,000 the total fits in 32 bits, but when the constraints are larger use long long. The range version above uses it.

The product variant is O(n) time and O(1) space as well, though the intermediate products can overflow quickly. Most statements promise that the final answer fits in a 32-bit integer, but intermediate products in a pessimistic order may not. Read the constraints.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `The most common error is initialising best to zero. If the array is all negative the correct answer is negative, and zero is not a valid answer because the subarray must contain at least one element. Seed both variables with a[0], or with the smallest possible integer value, never with 0. If a problem explicitly allows the empty subarray, zero is correct, and you should say so in your clarifying questions.

The second error is resetting at the wrong moment. The reset condition is that the running sum before adding the current element is negative, not that the running sum after adding it is negative. In the compact form cur = max(a[i], cur + a[i]) the question answers itself, so prefer that form.

Third, forgetting that the best subarray may end before the last index. If you return cur instead of best, you get the best subarray ending at the end of the array, which is a different problem.

Fourth, for the product version, forgetting that a zero resets the state and that a negative number swaps the roles of the maximum and the minimum. The formula with three candidates, the element alone, the element times the old maximum, and the element times the old minimum, handles both without extra branches.

Fifth, in the circular version, the all-negative array: total minus minimum equals zero, which is not a legal answer.

Edge cases to test: a single element, all negative, all positive, all zeros, a zero in the middle of a product array, and an alternating sign array.`,
      },
      {
        title: "Practice order",
        body: `1. Maximum Subarray (medium). The base case. Write it from memory with the all-negative case in mind, then add start and end indices.
2. Maximum Product Subarray (medium). The same state machine with two values. This is the problem that shows whether you understand why the simple version works, because the simple version fails here.
3. Maximum Sum Circular Subarray (medium). Reduce a circular problem to two linear ones: the maximum and total minus the minimum. Test it on an all-negative array.

After these, try Best Time to Buy and Sell Stock and rewrite it as a maximum subarray of the daily differences, and then look at the dynamic programming group, where the same state and transition thinking is applied to harder problems.`,
      },
    ],
  },

  intervals: {
    intro:
      "Interval problems give you ranges, such as meetings, bookings or segments, and ask you to merge them, insert one, count how many overlap, or choose the most you can keep. Almost all of them become simple after one decision: sort the intervals by their start, or by their end, and then sweep through them once.",
    sections: [
      {
        title: "The intuition",
        body: `An interval is a pair [start, end]. Two intervals overlap when each one starts before the other ends. Drawn on a number line they are bars, and the problems ask questions about how the bars cover the line: merge the ones that touch, find a gap, count the most bars stacked at one point, remove the fewest bars to leave none overlapping.

The unsorted input is the difficulty. If the bars arrive in a random order you would have to compare each one with every other one, which is quadratic. If you sort them by start, a powerful fact appears: when you walk through them in order, an interval can only overlap with the ones just before it, and in fact only with the running union of everything before it. You carry along the last merged bar, and each new bar either overlaps it, in which case you extend it, or starts after it ends, in which case you finish the old one and begin a new one.

Which end to sort by depends on the question. Sorting by start suits merging, inserting and sweeping for gaps. Sorting by end suits the scheduling problems, where you want to keep as many intervals as possible: the interval that ends earliest leaves the most room for the rest, so you take it greedily.

So the thought process for any interval problem is short. First sort. Then decide what to carry while sweeping: the last merged interval, the earliest end seen so far, or a count of how many are active. The rest is a few lines of code.`,
        diagram: `flowchart LR
    I["Unsorted intervals"] --> S["Sort by start (merge, insert, gaps) or by end (max non-overlapping)"]
    S --> W["Sweep once, carrying one summary"]
    W --> M["Last merged interval"]
    W --> H["Min-heap of end times"]
    W --> C["Count of active intervals"]`,
        diagramCaption: "The sort is the key step; what you carry through the sweep depends on the question.",
      },
      {
        title: "Why it works",
        body: `Why is sorting by start enough for merging? Suppose the intervals are sorted by start and we have merged the first k of them into a list of disjoint intervals. Take the next interval, X. Its start is at least as large as every start before it, so X cannot reach back and overlap anything except the last merged interval. Any earlier merged interval ends before the last one starts, and the last one starts at or before X starts. So only the last merged interval needs checking. If X.start <= last.end they overlap and the merged interval becomes [last.start, max(last.end, X.end)]. The maximum matters because X may be fully inside the last interval. Otherwise X starts a new merged interval. By induction the list stays disjoint and sorted.

For the scheduling question, choosing the maximum number of non-overlapping intervals, the exchange argument is what makes the greedy rule correct. Sort by end. Take the interval that ends first. Claim: some optimal solution contains it. Take any optimal solution and look at its first interval. It ends no earlier than our choice does, because ours ends first overall. Swapping it for our choice cannot create an overlap with the rest of the solution, since our interval ends at or before the one it replaces. So the swapped solution is still valid and the same size. Repeat on the remaining intervals that start after our choice ends.

For counting how many intervals overlap at the same time, sort the start times and the end times separately, or use a min-heap of end times. When a new interval starts, free every room whose meeting has already ended, then take a room. The size of the heap is the number of rooms in use, and its maximum is the answer.

The line sweep generalises this: turn each interval into two events, a +1 at the start and a -1 at the end, sort the events by position, and the running sum is the number of overlapping intervals at that point.`,
      },
      {
        title: "A worked example",
        body: `Merge Intervals on [[8, 10], [1, 3], [2, 6], [15, 18]].

Sort by start: [[1, 3], [2, 6], [8, 10], [15, 18]]. Start the merged list with [1, 3].
Next is [2, 6]. Its start 2 is at most the last end 3, so they overlap. The merged interval becomes [1, max(3, 6)] = [1, 6].
Next is [8, 10]. Its start 8 is greater than the last end 6, so there is a gap. Close [1, 6] and start [8, 10].
Next is [15, 18]. 15 is greater than 10, so another gap. The result is [[1, 6], [8, 10], [15, 18]].

Now Meeting Rooms II on [[0, 30], [5, 10], [15, 20]], the minimum number of rooms. Sort by start; they already are. Keep a min-heap of end times.
Meeting [0, 30]: heap is empty, so take a room. Heap: {30}.
Meeting [5, 10]: the earliest end is 30, which is later than 5, so no room is free. Take another. Heap: {10, 30}.
Meeting [15, 20]: the earliest end is 10, which is at most 15, so that room is free. Pop it and push 20. Heap: {20, 30}.
The heap peaked at size 2, so two rooms are needed.

Finally Non-overlapping Intervals on [[1, 2], [2, 3], [3, 4], [1, 3]], the minimum number to remove. Sort by end: [1, 2], [2, 3], [1, 3], [3, 4] (ties in any order). Keep [1, 2] and set lastEnd = 2. [2, 3] starts at 2, which is not before lastEnd, so keep it and set lastEnd = 3. [1, 3] starts at 1, before lastEnd 3, so it overlaps: remove it. [3, 4] starts at 3, so keep it. One removal. Intervals that merely touch at an endpoint do not overlap here; the problem statement decides that, so read it.`,
      },
      {
        title: "Implementation",
        body: `Merging is the template. Sort, keep the output list, and compare each interval only with its last element. Use a vector of two-element vectors, because that is how the inputs usually arrive.

Insert Interval needs no sort when the list is already sorted and disjoint. Split the work into three phases in one pass: copy everything that ends before the new interval starts, merge everything that overlaps the new interval into it, then copy the rest.`,
        code: `// Merge Intervals.
vector<vector<int>> mergeIntervals(vector<vector<int>> v) {
    sort(v.begin(), v.end());  // by start, then end
    vector<vector<int>> out;
    for (auto& cur : v) {
        if (!out.empty() && cur[0] <= out.back()[1]) {
            out.back()[1] = max(out.back()[1], cur[1]);  // overlap: extend
        } else {
            out.push_back(cur);  // gap: start a new interval
        }
    }
    return out;
}

// Insert Interval into a sorted list of disjoint intervals.
vector<vector<int>> insertInterval(const vector<vector<int>>& v, vector<int> add) {
    vector<vector<int>> out;
    size_t i = 0, n = v.size();
    while (i < n && v[i][1] < add[0]) out.push_back(v[i++]);  // entirely before
    while (i < n && v[i][0] <= add[1]) {                       // overlaps: absorb
        add[0] = min(add[0], v[i][0]);
        add[1] = max(add[1], v[i][1]);
        i++;
    }
    out.push_back(add);
    while (i < n) out.push_back(v[i++]);                       // entirely after
    return out;
}`,
      },
      {
        title: "Implementation: Meeting Rooms II and Non-overlapping Intervals",
        body: `Meeting Rooms II uses a min-heap of end times, as in the worked example. An equivalent version sorts starts and ends separately and walks two pointers; the heap version is easier to get right, and it extends to problems that ask which room each meeting gets.

Non-overlapping Intervals is the greedy by end. Count how many to keep, and the number to remove is the total minus that. Compare with lastEnd using a strict less than, because intervals that touch at a point are allowed to coexist in this problem.`,
        code: `// Meeting Rooms II: the minimum number of rooms.
int minMeetingRooms(vector<vector<int>> v) {
    sort(v.begin(), v.end());
    priority_queue<int, vector<int>, greater<int>> ends;  // end times of meetings in progress
    for (auto& m : v) {
        if (!ends.empty() && ends.top() <= m[0]) ends.pop();  // reuse a room that is free
        ends.push(m[1]);
    }
    return (int)ends.size();
}

// Non-overlapping Intervals: the minimum number to remove.
int eraseOverlapIntervals(vector<vector<int>> v) {
    if (v.empty()) return 0;
    sort(v.begin(), v.end(), [](const vector<int>& x, const vector<int>& y) { return x[1] < y[1]; });
    int kept = 1, lastEnd = v[0][1];
    for (size_t i = 1; i < v.size(); i++) {
        if (v[i][0] >= lastEnd) {  // does not overlap what we kept
            kept++;
            lastEnd = v[i][1];
        }
    }
    return (int)v.size() - kept;
}`,
      },
      {
        title: "Variants",
        body: `The family is large, but each member is one of three shapes.

Merge-shaped problems: Merge Intervals, Insert Interval, Interval List Intersections, Employee Free Time. The last one gives you a list of working intervals per employee and asks for the gaps when everyone is free. Flatten all the intervals, sort by start, merge, and read off the gaps between the merged intervals. For intersections of two sorted lists, use two pointers: the intersection of the current pair is [max of starts, min of ends] if that is valid, and you advance the pointer whose interval ends first.

Scheduling-shaped problems: Non-overlapping Intervals, Minimum Number of Arrows to Burst Balloons, Meeting Rooms. They sort by end and take greedily. The arrows problem is the same program with the question phrased as the minimum number of points that hit every interval.

Counting-shaped problems: Meeting Rooms II, Car Pooling, My Calendar. They count how many intervals are active at once, with a heap, with sorted events, or with a difference array when the coordinates are small. My Calendar asks whether adding a booking would cause a conflict, and the answer is an ordered set lookup by start.

A related problem asks for the maximum weight set of non-overlapping intervals, where each has a profit. The greedy rule fails there, and the solution is dynamic programming over intervals sorted by end, with a binary search for the last compatible interval.

When coordinates are huge but the number of intervals is small, never allocate an array over the coordinates; sort the events instead.`,
      },
      {
        title: "Complexity",
        body: `The sort dominates: O(n log n) time for n intervals. The sweep afterwards is O(n). The merged output needs O(n) space in the worst case, when nothing overlaps. Meeting Rooms II with a heap is O(n log n) time and O(n) space in the worst case, because every meeting may be in progress at once.

The insert-interval problem is O(n) because the list is already sorted: three phases, each element touched once. If the list were not sorted, you would pay for the sort.

Two details are worth saying out loud. First, sorting a vector of vectors compares element by element, so the default sort orders by start and then by end, which is what you want for merging. Second, because an interval of length zero is allowed in some problems, the strictness of every comparison matters. A comparison of start <= last end treats touching intervals as overlapping, so [1, 2] and [2, 3] merge into [1, 3]. Change it to < and they stay separate. The right choice is whatever the problem says, so confirm the definition of overlap before coding.

If many queries follow a single set of intervals, build the merged list once and answer each query by binary search, which is O(log n) per query. If intervals are inserted and removed between queries, use an ordered set keyed by start.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Forgetting the max when merging is the classic bug. When the new interval lies entirely inside the last merged one, for example [1, 10] followed by [2, 5], setting the end to the new interval's end shrinks the result to [1, 5]. Always take the larger of the two ends.

Sorting by the wrong key. Merging needs the sort by start. The maximum non-overlapping set needs the sort by end. Sorting by start for the scheduling problem gives wrong answers: a long interval that starts first blocks many short ones.

Touching intervals. Decide whether [1, 2] and [2, 3] overlap and keep that decision consistent in the comparison. Meeting rooms treat a meeting ending at 10 and another starting at 10 as compatible, which is why the heap pops when the top is less than or equal to the new start.

Modifying the input. Sorting the caller's array in place may be unacceptable in a real code review. Taking the vector by value, as above, makes a copy and is the simple fix.

Empty input. Most of the code above indexes the first element, so guard against an empty list.

Integer overflow when computing lengths or midpoints with large coordinates; use long long when the coordinates can reach a billion.

Edge cases to test: no intervals, one interval, all identical intervals, one interval that contains all the others, intervals that only touch, already sorted input, and reverse sorted input.`,
      },
      {
        title: "Practice order",
        body: `1. Merge Intervals (medium). The template. Write it until you never forget the max.
2. Insert Interval (medium). The three-phase sweep that needs no sort. Draw the cases on a number line before you code.
3. Meeting Rooms II (medium). The first problem where you carry a heap instead of one interval. Solve it with the heap, then think about the two-pointer version.
4. Non-overlapping Intervals (medium). The greedy by end and its exchange argument. Explain why sorting by start would be wrong.
5. Employee Free Time (hard). Several sorted lists, merged, with the gaps reported. A good test that you can flatten, sort and merge without help.

If time allows, add Interval List Intersections and Minimum Number of Arrows to Burst Balloons, then Car Pooling from the prefix sum article to see the sweep done with a difference array.`,
      },
    ],
  },

  "cyclic-sort": {
    intro:
      "When an array holds numbers from a known small range, usually 1 to n, the array itself can act as the hash table: each value has a natural home index, and you can put every value in its home by swapping. Afterwards the positions that hold the wrong value reveal what is missing or duplicated, with no extra memory. It is the pattern behind the classic find-the-missing-number and find-the-duplicate questions.",
    sections: [
      {
        title: "The intuition",
        body: `Take an array of n numbers where every value is between 1 and n. If the array were a perfect permutation, the number 1 would sit at index 0, 2 at index 1, and so on: value v lives at index v - 1. That is the home of v.

Now suppose the array is not a permutation: some value is missing and another is repeated. A hash set would solve it with O(n) extra memory. But we have an array of exactly the right size, so we can use it as the hash table itself. Walk through the array and, for each position, send the value standing there to its home by swapping with whatever is at that home. Keep doing that at the same position until the value in it is either already home or cannot go home.

When the pass is over, every value that could be placed is in its home. The positions where the value is not what it should be are exactly the interesting ones. If position i holds something other than i + 1, then i + 1 is missing, and the value sitting there is a duplicate of one that is already home somewhere else.

This is where the name comes from: a cyclic sort follows the cycles of a permutation, putting each element where it belongs. The point of the pattern is not to sort in the usual sense. It is to use the range of the values as an index, which is why it is also called using the index as a hash.

You recognise the pattern by the constraints. Look for the phrase "the numbers are in the range 1 to n" together with a demand for O(1) extra space, or for a missing, repeated or misplaced element.`,
      },
      {
        title: "Why it works",
        body: `Each swap puts at least one value in its home, permanently. Take position i holding value v where 1 <= v <= n and the position v - 1 does not already hold v. Swap them: now v is at v - 1, its home, and it stays there, because we never move a value out of a position that already holds its own home value. The loop condition guards that: we swap only if the target does not already contain v.

That gives the time bound. Each swap fixes one value for good, so there can be at most n swaps in total, even though there is a while loop inside the for loop. The for loop advances n times and the swaps add at most n more: O(n) overall. This is the same amortised argument as in the two pointers and sliding window articles: count the total moves, not the moves per iteration.

Why does the loop terminate for duplicates? If v is already at home and another copy of v arrives at position i, the check a[v-1] != a[i] fails, and we stop working on position i, leaving the duplicate there. Without that check two equal values would swap forever.

What about values that do not belong to the range, such as zero, negatives or values larger than n? They have no home. The loop ignores them and leaves them where they are. In First Missing Positive that is exactly right: such values cannot be the answer, and the first position that does not hold its own index plus one gives the smallest positive integer missing. The answer is always between 1 and n + 1, because n slots can hold at most n different values, and if all of 1 to n are present the answer is n + 1.

A second technique reaches the same end differently: mark visited values by flipping the sign of the element at their home. It keeps the order of the array and is sometimes simpler, but it needs the values to be positive and it temporarily destroys the data.`,
      },
      {
        title: "A worked example",
        body: `First Missing Positive on a = [3, 4, -1, 1], so n = 4.

Position 0 holds 3. Its home is index 2, which holds -1, not 3, so swap: [-1, 4, 3, 1]. Position 0 now holds -1, which is outside 1..4, so move on.
Position 1 holds 4. Its home is index 3, which holds 1, so swap: [-1, 1, 3, 4]. Position 1 now holds 1, whose home is index 0, which holds -1, so swap: [1, -1, 3, 4]. Position 1 holds -1: move on.
Position 2 holds 3, already home. Position 3 holds 4, already home.

The array is [1, -1, 3, 4]. Scan for the first index where a[i] != i + 1: index 1 holds -1, so the answer is 2. The scan finds it without any extra memory.

Now Find All Duplicates in an Array on [4, 3, 2, 7, 8, 2, 3, 1], where each value appears once or twice. Use the sign marking technique. Read 4: negate the element at index 3 (value 7 becomes -7). Read 3: index 2 becomes -2. Read 2: index 1 becomes -3. Read 7 (take absolute value of the element at the current position when it is already negative): index 6 becomes -3. Read 8: index 7 becomes -1. Now read 2 again, at position 5: the element at index 1 is already negative, so we have seen 2 before: record 2. Read 3 again: the element at index 2 is already negative, so record 3. The answer is [2, 3].

For each element, the only question asked was whether its home was already marked. That is the hash set lookup, done in the array itself.`,
      },
      {
        title: "Implementation",
        body: `The template is a while loop inside the scan. Be careful with the order of the conditions: check the range first, then compare with the home position, and only then swap. The swap puts the value at its home, and the same position is examined again because a new value now stands there.

The second function shows the sign marking variant for Find All Duplicates. Read with an absolute value because earlier steps may have flipped the sign of the element you are looking at.`,
        code: `// First Missing Positive: O(n) time, O(1) extra space (the input copy is the working array).
int firstMissingPositive(vector<int> a) {
    int n = (int)a.size();
    for (int i = 0; i < n; i++) {
        while (a[i] >= 1 && a[i] <= n && a[a[i] - 1] != a[i]) {
            swap(a[i], a[a[i] - 1]);  // send a[i] to its home index a[i] - 1
        }
    }
    for (int i = 0; i < n; i++) {
        if (a[i] != i + 1) return i + 1;
    }
    return n + 1;
}

// Find All Duplicates in an Array (values in 1..n, each appears once or twice).
vector<int> findDuplicates(vector<int> a) {
    vector<int> out;
    for (size_t i = 0; i < a.size(); i++) {
        int v = abs(a[i]);
        if (a[v - 1] < 0) out.push_back(v);  // home already marked: v was seen
        else a[v - 1] = -a[v - 1];           // mark v as seen
    }
    return out;
}`,
      },
      {
        title: "Variants",
        body: `The same loop, with small changes in the range or the question, solves a family of problems.

Missing Number: the array holds n distinct numbers from 0 to n, so one is missing. The home of v is index v itself. After placing every value that is less than n, the first index i where a[i] != i is the answer, or n if none. A sum or xor trick does the same without modifying the array, and is simpler for this one problem.

Find the Duplicate Number: n + 1 values in the range 1 to n, exactly one value repeated, and the array must not be modified. If modification is allowed, run the cyclic loop and return the value you were about to place when its home already holds it. If it is not allowed, treat the array as a linked list where index i points to a[i], and use the slow and fast pointer cycle detection from the linked list article. That is a lovely connection: the duplicate is the entrance of the cycle.

Set Mismatch: one number is duplicated and another is missing. After the cyclic placement, the single position where a[i] != i + 1 gives both: the value there is the duplicate and i + 1 is the missing one.

Find All Numbers Disappeared in an Array: place the values, then every index that holds the wrong value reports its missing number i + 1.

When the range is not 1 to n but, say, 0 to n - 1, change the home to v. When the values can be arbitrary but are within a small known window, shift them by the minimum.`,
        code: `// Find the Duplicate Number (n + 1 values in 1..n): cyclic placement, stop when the home is taken.
int findDuplicate(vector<int> a) {
    int i = 0;
    while (i < (int)a.size()) {
        if (a[i] != i + 1) {
            int home = a[i] - 1;
            if (a[i] == a[home]) return a[i];  // the home already has this value: a duplicate
            swap(a[i], a[home]);
        } else {
            i++;
        }
    }
    return -1;
}

// Missing Number (n distinct values from 0..n): the home of v is index v.
int missingNumber(vector<int> a) {
    int n = (int)a.size(), i = 0;
    while (i < n) {
        if (a[i] < n && a[a[i]] != a[i]) swap(a[i], a[a[i]]);
        else i++;
    }
    for (int j = 0; j < n; j++) {
        if (a[j] != j) return j;
    }
    return n;
}`,
      },
      {
        title: "Complexity",
        body: `Time is O(n). The for loop makes n steps, and each swap in the inner while loop sends one value to its permanent home, so there are at most n swaps in total. Space is O(1) beyond the array, or O(n) if you copy the input as the code above does for safety; the copy is only there so the examples are free of side effects.

Compare with the alternatives. A hash set or a boolean array of n entries is O(n) time and O(n) space: simpler, and often the right answer when memory is not constrained. Sorting is O(n log n) time. The cyclic placement is the one that achieves linear time and constant space, and that combination is the reason the pattern is asked in interviews.

The sign marking variant also runs in O(n) time with O(1) space, and does not reorder the array, but only works if the values are positive and it modifies the input temporarily; you can undo the marks with a final pass if the array must be left unchanged.

The Floyd cycle approach for Find the Duplicate Number is O(n) time and O(1) space without modifying the array at all. It is the strongest answer when the problem forbids changes, at the cost of being harder to explain.

If the interviewer asks what happens when the input may not be modified, mention the linked list view, and if they ask about memory, say you are using the array as the table.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `The most dangerous bug is an infinite loop. It happens when the swap condition does not check that the home is already correct. If two positions hold the same value and you swap them without testing equality, you swap forever. Always test a[home] != a[i] before swapping.

The second is the range check. Values outside the range 1 to n, such as zero, negative numbers and very large numbers, must be skipped, and the check must come before using the value as an index. Writing a[a[i] - 1] with a[i] = -1 or a[i] = 10^9 is an out-of-bounds read.

Third, advancing the index too early. After a swap, the new value at position i has not been placed yet, so you must examine position i again. A for loop that always advances after one swap leaves misplaced values behind. Either use a while loop inside the for loop, or advance only when the value is home.

Fourth, confusing the two kinds of range. With values 1 to n the home is v - 1. With values 0 to n the home is v, and the array has one value too few for an exact permutation. Write the home formula in a comment and double-check it with the smallest example.

Fifth, the answer after placement. In First Missing Positive the answer can be n + 1 when the array holds exactly 1 to n. Forgetting the final return gives a wrong answer for an input like [1, 2, 3].

Edge cases to test: an empty array, a single element, all values out of range, all duplicates, the array already sorted, and values at the extremes of the allowed range.`,
      },
      {
        title: "Practice order",
        body: `1. First Missing Positive (hard). The central problem of the pattern. It looks hard until you notice that the answer lies between 1 and n + 1, and then it is a direct application. Write it from memory and trace the example [3, 4, -1, 1].
2. Find All Duplicates in an Array (medium). The same index-as-hash idea with sign marking. Do it once with the cyclic placement and once with negation, and compare how each treats the input array.

There are only two problems on this pattern in the list, so extend your practice with the well-known cousins: Missing Number, Find the Duplicate Number, Set Mismatch and Find All Numbers Disappeared in an Array. If you can solve the five of them in O(n) time and O(1) space without looking, you own the pattern.`,
      },
    ],
  },

  "string-matching": {
    intro:
      "Substring search asks where a pattern occurs inside a longer text. The naive method restarts from scratch after every mismatch and can take time proportional to the product of the two lengths. Three classic tools do it in linear time: the prefix function (KMP), the Z-function, and rolling hashes (Rabin-Karp). They also answer related questions about borders, periods and repeated strings.",
    sections: [
      {
        title: "The intuition",
        body: `The brute force check slides the pattern along the text and, at each starting position, compares character by character until a mismatch. Searching for "aaab" in "aaaaaaaaab" shows the cost: at every starting position it matches three letters and fails on the fourth, and then starts again one position later, redoing most of the same comparisons. In the worst case that is O(n * m).

Look at what the failed comparison already told us. If the pattern is "abcabd" and we matched "abcab" before failing on the next character, then we know the last five text characters are "abcab". We know it for free, because we just read them. A smart search uses that knowledge to jump ahead instead of restarting. After the failure we know the text ends with "abcab", and the longest suffix of that which is also a prefix of the pattern is "ab". So we can continue as if we had just matched "ab", with no need to go back in the text at all.

That is the idea of KMP, named after Knuth, Morris and Pratt. The text pointer never moves backwards. All of the cleverness is in a table, computed from the pattern alone, that says: if I have matched k characters and then fail, how many characters can I still count as matched?

The Z-function offers a different angle on the same information: for each position, how long is the common prefix between the whole string and the suffix starting there? Rabin-Karp takes an altogether different route: compare fingerprints instead of letters. If the fingerprint of a window of the text equals the fingerprint of the pattern, check the letters; otherwise skip the window at once, and compute the next fingerprint from the previous one in constant time.`,
        diagram: `flowchart TD
    A["Compare text[i] with pattern[k]"] --> B{"Equal?"}
    B -- yes --> C["k = k + 1, move on in the text"]
    C --> D{"k equals the pattern length?"}
    D -- yes --> E["Match found"]
    D -- no --> A
    B -- no --> F{"k greater than 0?"}
    F -- yes --> G["k = pi[k-1], keep the same text position"]
    G --> A
    F -- no --> H["Move on in the text"]
    H --> A`,
        diagramCaption: "KMP never moves back in the text; on a mismatch it only shortens the matched length using the prefix table.",
      },
      {
        title: "Why it works",
        body: `The prefix function of a string s is an array pi, where pi[i] is the length of the longest proper prefix of s[0..i] that is also a suffix of it. Proper means shorter than the whole string. For s = "abcabd", pi = [0, 0, 0, 1, 2, 0]. At index 4 the string "abcab" has the border "ab", so pi[4] = 2. A border is a string that is both a prefix and a suffix.

Computing pi is itself a matching process of the pattern against itself. To compute pi[i], start from k = pi[i-1], the length of the previous border. If s[i] equals s[k], the border grows: pi[i] = k + 1. If not, try a shorter border of the previous prefix, which is pi[k-1], and repeat. If k reaches 0 and still no match, pi[i] = 0. The shorter border is itself a border of the longer one, and the borders of a string form a chain: each is a border of the next longer one. That is why falling back through pi[k-1] visits every candidate in decreasing order, without missing any.

Why is it linear? Every time k falls back, it decreases, and k increases by at most one per character. So the total number of fallbacks over the whole run cannot exceed the total number of increments, which is at most n. This is the amortised argument that appears in every linear-time two-pointer algorithm.

Searching uses exactly the same loop, with the pattern's table and a text pointer that only goes forward. A trick that avoids a separate function is to run the prefix function on pattern + '#' + text, with a separator that appears in neither; every position where pi equals the pattern length marks a match.

The Z-function z[i] is the length of the longest common prefix of s and s[i..]. Computing it keeps a window [l, r) with the rightmost match found so far, because inside this window the text copies a prefix of s, so z[i] can start from min(r - i, z[i - l]) and only extend beyond r. Each extension moves r forward, so the total is linear as well. The two arrays carry equivalent information and can be converted into each other.

Rabin-Karp treats a string as a number in some base, modulo a prime. Sliding the window by one character removes the leading digit, shifts and adds the new one, all in O(1). Two different strings can have the same hash, a collision, so a matching hash must be confirmed by comparing letters.`,
      },
      {
        title: "A worked example",
        body: `Build the prefix function for "abcabd" step by step.
i = 0: pi[0] = 0 by definition.
i = 1, character b: k = pi[0] = 0. s[1] = b differs from s[0] = a, and k is already 0, so pi[1] = 0.
i = 2, character c: k = 0, c differs from a, so pi[2] = 0.
i = 3, character a: k = 0, a equals s[0], so k becomes 1 and pi[3] = 1.
i = 4, character b: k = pi[3] = 1, s[4] = b equals s[1] = b, so k becomes 2 and pi[4] = 2.
i = 5, character d: k = pi[4] = 2, s[5] = d differs from s[2] = c, so fall back: k = pi[1] = 0. Then d differs from a, so pi[5] = 0.
Result: [0, 0, 0, 1, 2, 0].

Now search for "abcabd" in "abcabcabd". Walk through the text with k = number of matched characters.
Text a, b, c, a, b: all match, k = 5. Text index 5 is c, and the pattern's next character is d: mismatch. Fall back to k = pi[4] = 2: we still know "ab" matches, which is true, since the text just before ended with "abcab".
Now compare text c against the pattern's character at position 2, which is c: match, k = 3. Next, text a matches a: k = 4. Text b matches b: k = 5. Text d matches d: k = 6, the full length. A match ends at text index 8 and starts at 8 - 6 + 1 = 3.

The text pointer moved from 0 to 8 once, without ever stepping back, and k fell back once. The brute force would have returned to index 1 after the failure and compared again.

For Z, take "aabcaab": z = [7, 1, 0, 0, 3, 1, 0] (the first entry, the whole string, is conventionally 7 or left as 0). z[4] = 3 says the suffix "aab" matches the prefix "aab" for three characters. That reads off the border "aab" immediately.`,
      },
      {
        title: "Implementation",
        body: `The prefix function and the KMP search share the same inner loop. Note that the search function keeps k across the text and, on a full match, returns at once; to list all matches instead of the first one, record the start index and continue with k = pi[k - 1].

The Z-function uses a half-open window [l, r). Copy the algorithm exactly rather than reinventing it; the conditions are easy to get wrong by one.`,
        code: `// Prefix function: pi[i] = length of the longest proper prefix of s[0..i] that is also a suffix.
vector<int> prefixFunction(const string& s) {
    int n = (int)s.size();
    vector<int> pi(n, 0);
    for (int i = 1; i < n; i++) {
        int k = pi[i - 1];
        while (k > 0 && s[i] != s[k]) k = pi[k - 1];  // shorten the border
        if (s[i] == s[k]) k++;
        pi[i] = k;
    }
    return pi;
}

// First index where pat occurs in text, or -1. This is Find the Index of the First Occurrence in a String.
int kmpFind(const string& text, const string& pat) {
    if (pat.empty()) return 0;
    vector<int> pi = prefixFunction(pat);
    int k = 0;  // characters of pat matched so far
    for (int i = 0; i < (int)text.size(); i++) {
        while (k > 0 && text[i] != pat[k]) k = pi[k - 1];
        if (text[i] == pat[k]) k++;
        if (k == (int)pat.size()) return i - k + 1;
    }
    return -1;
}

// Z-function: z[i] = length of the longest common prefix of s and s[i..]. z[0] is left as 0.
vector<int> zFunction(const string& s) {
    int n = (int)s.size();
    vector<int> z(n, 0);
    for (int i = 1, l = 0, r = 0; i < n; i++) {
        if (i < r) z[i] = min(r - i, z[i - l]);
        while (i + z[i] < n && s[z[i]] == s[i + z[i]]) z[i]++;
        if (i + z[i] > r) {
            l = i;
            r = i + z[i];
        }
    }
    return z;
}`,
      },
      {
        title: "Implementation: Rabin-Karp and two problems that reduce to KMP",
        body: `Rabin-Karp needs a base and a modulus. Use a large prime modulus and a base that is not tiny. The window hash is updated by removing the contribution of the leading character, which is its value times base to the power m - 1, then shifting and adding the new character. Always confirm a hash match by comparing the real strings; that makes the result exact and the hash only a filter.

Longest Happy Prefix is a direct read of the prefix function: the longest border of the whole string is pi of the last index. Repeated String Match asks for the smallest number of copies of a so that b is a substring; repeat a until it is at least as long as b, test, and test once more with one extra copy, because the match may start in the middle of the first copy and run into the next.`,
        code: `// Rabin-Karp: rolling hash of a window, confirmed by a real comparison.
int rabinKarpFind(const string& text, const string& pat) {
    int n = (int)text.size(), m = (int)pat.size();
    if (m == 0) return 0;
    if (m > n) return -1;
    const long long MOD = 1000000007LL, BASE = 911382323LL;
    long long hp = 0, ht = 0, power = 1;  // power ends up as BASE^(m-1)
    for (int i = 0; i < m; i++) {
        hp = (hp * BASE + pat[i]) % MOD;
        ht = (ht * BASE + text[i]) % MOD;
        if (i > 0) power = power * BASE % MOD;
    }
    for (int i = 0;; i++) {
        if (hp == ht && text.compare(i, m, pat) == 0) return i;
        if (i + m >= n) break;
        ht = (ht - text[i] * power % MOD + MOD) % MOD;  // drop text[i]
        ht = (ht * BASE + text[i + m]) % MOD;           // add text[i + m]
    }
    return -1;
}

// Longest Happy Prefix: the longest proper prefix that is also a suffix.
string longestHappyPrefix(const string& s) {
    return s.substr(0, prefixFunction(s).back());
}

// Repeated String Match: fewest copies of a so that b is a substring, or -1.
int repeatedStringMatch(const string& a, const string& b) {
    string s;
    int times = 0;
    while (s.size() < b.size()) {
        s += a;
        times++;
    }
    if (kmpFind(s, b) != -1) return times;
    s += a;
    times++;
    return kmpFind(s, b) != -1 ? times : -1;
}`,
      },
      {
        title: "Variants",
        body: `Borders and periods. A string s has period p if s[i] = s[i + p] for all valid i. The smallest period is n - pi[n - 1]. If that number divides n, the string is a repetition of a shorter block, which solves Repeated Substring Pattern: check whether n is divisible by n - pi[n - 1] and pi[n - 1] is positive. The same idea tells you the shortest string that can be repeated to make s.

Counting occurrences and listing all matches. Run the search without returning on the first match, and after a match set k = pi[k - 1] to allow overlapping occurrences.

Searching many patterns at once. The Aho-Corasick automaton extends KMP to a trie with failure links, and finds all occurrences of a dictionary of words in one pass. It is the next step if a problem has many patterns.

Searching for a pattern in a rotation, or checking whether one string is a rotation of another: search for the first string inside the second concatenated with itself.

Comparing substrings quickly. A polynomial hash with prefix hashes lets you compare any two substrings in O(1) after O(n) preprocessing, which is the engine behind longest repeated substring (binary search on the length plus hashing), longest duplicate substring, and checking palindromes quickly. Pair two moduli, or use a random base, when anti-hash tests are possible.

Palindromes have their own tool, Manacher's algorithm, which is a close cousin of the Z-function: it also reuses a window of the string that is already known.

When to choose which. KMP gives a guaranteed O(n + m) with no probability and is the default for single-pattern search. The Z-function is handier when the question is about prefixes of the string itself. Rabin-Karp shines when you need to compare or count many substrings, or to search for several patterns of the same length, or to handle a two-dimensional pattern.`,
      },
      {
        title: "Complexity",
        body: `KMP: O(n + m) time, where n is the text length and m the pattern length, and O(m) space for the table. The argument is the amortised one above: k falls back at most as many times as it has grown. The Z-function is also O(n + m) when applied to the concatenation, and O(n) space.

Rabin-Karp: O(n + m) expected time with a good hash, and O(n * m) in the worst case when many windows collide, which a random or double hash makes extremely unlikely. A deterministic guarantee requires the full comparison on every hash match and an adversary could still force many collisions with a fixed known base and modulus.

The naive search is O(n * m) in the worst case, though it is fast on random text because mismatches usually come early. Library functions such as std::string::find are often implemented with tuned versions of the naive approach and perform very well in practice; the linear algorithms matter when the worst case matters or when you need the table for other reasons, such as borders and periods.

Choose by the question rather than by speed alone. If you need borders or periods, the prefix function is the natural fit. If you need to compare arbitrary substrings, a prefix hash. If you need to find one pattern once, any of them is fine, and the library call is acceptable in practice, but an interview wants the algorithm.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Falling back with the wrong index. After a mismatch the new k is pi[k - 1], not pi[k]. The table is indexed by the last matched character, and k is the count, so the last matched index is k - 1. Using pi[k] reads the wrong entry or goes out of range.

Not looping on the fallback. A single fallback may not be enough; the while loop must continue until the characters match or k reaches zero. Using an if instead of a while is a typical bug that passes small tests and fails on strings like "aaab".

Forgetting the empty pattern. By convention the answer for an empty pattern is index 0. Handle it before building the table; the table of an empty string has no last element.

Rabin-Karp pitfalls: subtracting the leading term without adding the modulus back gives a negative number; a base of 26 or 31 with a small modulus produces collisions that are easy to hit; skipping the confirmation step gives wrong answers on collisions; and char is signed on many platforms, so for non-ASCII input cast to unsigned char before hashing.

Using a separator for the concatenation trick that also appears in the strings, which merges matches across the boundary. Pick a character outside the alphabet.

Mixing up the Z-function convention for z[0]. Some write n, others write 0. Decide and be consistent.

Edge cases to test: pattern longer than text, pattern equal to text, pattern at the very start and at the very end, a text made of one repeated letter, a pattern that overlaps itself like "aaa" inside "aaaaa", and an empty pattern.`,
      },
      {
        title: "Practice order",
        body: `1. Find the Index of the First Occurrence in a String (easy). The base problem. Write the naive version first, then the KMP version, and explain in words why the text pointer never goes back.
2. Longest Happy Prefix (hard). A direct reading of the prefix function. If you can compute the table from memory, this is five lines; it checks that you really know what pi means.
3. Repeated String Match (medium). A small reduction to the search: how many copies are enough, and why one extra copy is the limit.
4. Z-function (reference). Implement it, and then use it to solve the search by building z on pattern + separator + text.
5. Rabin-Karp (reference). Implement the rolling hash with a confirmation step, then use hashing to solve Longest Duplicate Substring with a binary search on the length.

After these, go through Repeated Substring Pattern with the period formula n - pi[n - 1], and read the cp-algorithms articles on the prefix function and the Z-function in the Reference tab for further variants.`,
      },
    ],
  },

  matrix: {
    intro:
      "Matrix problems give you a grid and ask you to walk it in an unusual order, transform it, or mark cells in place. There is rarely a clever algorithm: the work is in choosing coordinates and boundaries so that the loops are short and correct. Most of the difficulty is bookkeeping, and the bookkeeping has a few reliable techniques.",
    sections: [
      {
        title: "The intuition",
        body: `A matrix is a table with R rows and C columns, and a cell is addressed by a pair (r, c). Nearly every matrix problem reduces to one of three activities: visiting cells in a special order, such as a spiral or a diagonal; moving every cell to a new place, such as rotating the whole image; or using the matrix's own cells as scratch space, such as marking which rows to clear.

The first rule is to name your boundaries. In the spiral, four numbers, top, bottom, left and right, describe the rectangle that has not been visited yet. Each pass walks along one side and then shrinks that side by one. If you keep the four boundaries correct, you never need to think about corners again.

The second rule is to look for a decomposition into simpler operations. Rotating an image by 90 degrees clockwise looks like a complicated rearrangement of four cells at a time, but it is the same as two easy operations: transpose the matrix (swap the cell at (i, j) with the cell at (j, i)), and then reverse each row. Each is a short loop, and a reader can check each one on its own.

The third rule is that, when memory is limited, the matrix can store information in itself. In Set Matrix Zeroes you must clear a whole row and column whenever a cell is zero. Storing a list of rows and columns to clear takes O(R + C) extra space. But the first row and the first column can serve as that list, which brings the extra space to O(1), at the price of handling those two lines carefully.

Everything else is care with indices. Draw a three by four example on paper, number the rows and columns, and trace your loops on it before you trust them.`,
        diagram: `flowchart LR
    A["Rotate 90 degrees clockwise"] --> B["Transpose: swap m[i][j] with m[j][i]"]
    B --> C["Reverse each row"]
    C --> D["Rotated matrix"]`,
        diagramCaption: "A rotation is two simple steps. Splitting the task makes each step easy to verify.",
      },
      {
        title: "Why it works",
        body: `Start with the transpose and reverse decomposition. In an n by n matrix, the cell at (i, j) must end up at (j, n - 1 - i) after a clockwise rotation: the top row becomes the right column, and the first element of the top row, at (0, 0), goes to (0, n - 1). The transpose sends (i, j) to (j, i). Reversing a row sends the column index j' to n - 1 - j'. Together: (i, j) goes to (j, i) and then to (j, n - 1 - i). That is exactly the rotation. For a counter-clockwise rotation reverse the order: reverse each row first and then transpose, or transpose and reverse each column.

For the spiral, the invariant is that the unvisited cells always form a rectangle bounded by the four numbers. Walking the top row, then the right column, then the bottom row and the left column consumes the outer ring of that rectangle. After each of the four sides we shrink the corresponding boundary. The loop stops when the boundaries cross. The two checks before walking the bottom row and the left column are needed because, when the rectangle has shrunk to a single row or a single column, the top row and the bottom row are the same row, and walking it twice would visit cells a second time.

For Set Matrix Zeroes with constant space, the idea is a standard one: store the marker in the data that you are about to overwrite anyway. Row i should be cleared if any cell in it is zero; record this in the first cell of that row, m[i][0]. Column j should be cleared if any cell in it is zero; record this in m[0][j]. The only conflict is the cell m[0][0], which would serve both as the marker of row 0 and of column 0, and the first row and column themselves might contain zeros that must be remembered separately. So remember with two booleans whether the first row and the first column contained a zero originally, then use them at the very end.

The common thread is that you state precisely what a variable or a boundary means, and preserve that meaning at every step.`,
      },
      {
        title: "A worked example",
        body: `Spiral Matrix on a 3 by 4 matrix with rows [1, 2, 3, 4], [5, 6, 7, 8] and [9, 10, 11, 12].

Start with top = 0, bottom = 2, left = 0, right = 3.
Walk the top row from left to right: 1, 2, 3, 4. top becomes 1.
Walk the right column from top to bottom: rows 1 to 2 of column 3: 8, 12. right becomes 2.
Top (1) is at most bottom (2), so walk the bottom row from right to left: columns 2 down to 0 of row 2: 11, 10, 9. bottom becomes 1.
Left (0) is at most right (2), so walk the left column from bottom to top: rows 1 down to 1 of column 0: 5. left becomes 1.
Now top = 1, bottom = 1, left = 1, right = 2. Walk the top row: columns 1 to 2 of row 1: 6, 7. top becomes 2.
The right column loop covers rows 2 to 1, which is empty; right becomes 1.
Top (2) is greater than bottom (1), so the bottom row is skipped. The left column loop runs from row 1 down to row 2, which is also empty, and left becomes 2. Now left is greater than right and the loop ends.
Result: 1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7. Twelve cells, each visited once. The check "top <= bottom" before the bottom row is what prevented walking row 1 a second time.

Rotate Image on [[1, 2, 3], [4, 5, 6], [7, 8, 9]]. Transpose: [[1, 4, 7], [2, 5, 8], [3, 6, 9]]. Reverse each row: [[7, 4, 1], [8, 5, 2], [9, 6, 3]]. The top row 1 2 3 is now the right column, read top to bottom. That is a clockwise rotation.

Set Matrix Zeroes on [[1, 1, 1], [1, 0, 1], [1, 1, 1]]: the first row and column have no zeros, so both flags are false. The scan of the inner cells finds the zero at (1, 1) and marks m[1][0] = 0 and m[0][1] = 0. The second pass clears every inner cell whose row marker or column marker is zero: that is row 1 and column 1. The result is [[1, 0, 1], [0, 0, 0], [1, 0, 1]], where the markers in the first row and column are now the correct zeros as well.`,
      },
      {
        title: "Implementation",
        body: `The spiral uses four boundaries and one loop of four sides. Keep the checks for the last two sides. The rotation is the two-step version, in place for a square matrix. Set Matrix Zeroes follows the plan above: flags first, markers second, apply third, and the first row and column last. The order of the last two steps is the part that most often goes wrong.`,
        code: `// Spiral Matrix: visit cells in clockwise spiral order.
vector<int> spiralOrder(const vector<vector<int>>& m) {
    vector<int> out;
    if (m.empty() || m[0].empty()) return out;
    int top = 0, bottom = (int)m.size() - 1, left = 0, right = (int)m[0].size() - 1;
    while (top <= bottom && left <= right) {
        for (int j = left; j <= right; j++) out.push_back(m[top][j]);
        top++;
        for (int i = top; i <= bottom; i++) out.push_back(m[i][right]);
        right--;
        if (top <= bottom) {
            for (int j = right; j >= left; j--) out.push_back(m[bottom][j]);
            bottom--;
        }
        if (left <= right) {
            for (int i = bottom; i >= top; i--) out.push_back(m[i][left]);
            left++;
        }
    }
    return out;
}

// Rotate Image 90 degrees clockwise, in place (square matrix): transpose, then reverse each row.
void rotateImage(vector<vector<int>>& m) {
    int n = (int)m.size();
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) swap(m[i][j], m[j][i]);
    }
    for (auto& row : m) reverse(row.begin(), row.end());
}

// Set Matrix Zeroes in O(1) extra space: the first row and column store the markers.
void setZeroes(vector<vector<int>>& m) {
    int R = (int)m.size(), C = (int)m[0].size();
    bool firstRow = false, firstCol = false;
    for (int j = 0; j < C; j++) {
        if (m[0][j] == 0) firstRow = true;
    }
    for (int i = 0; i < R; i++) {
        if (m[i][0] == 0) firstCol = true;
    }
    for (int i = 1; i < R; i++) {
        for (int j = 1; j < C; j++) {
            if (m[i][j] == 0) {
                m[i][0] = 0;
                m[0][j] = 0;
            }
        }
    }
    for (int i = 1; i < R; i++) {
        for (int j = 1; j < C; j++) {
            if (m[i][0] == 0 || m[0][j] == 0) m[i][j] = 0;
        }
    }
    if (firstRow) {
        for (int j = 0; j < C; j++) m[0][j] = 0;
    }
    if (firstCol) {
        for (int i = 0; i < R; i++) m[i][0] = 0;
    }
}`,
      },
      {
        title: "Variants",
        body: `Directions arrays. Most grid code is easier with two small arrays of row and column offsets, one entry per direction: up, right, down, left. A spiral can then be written with a single loop that keeps walking in the current direction and turns right when the next cell is out of range or already visited. The same arrays power flood fill, island counting and shortest paths on a grid, which are covered in the graph articles. Always write a helper that tells whether (r, c) is inside the grid, and use it everywhere.

Diagonals. Cells on the same diagonal share r - c, and cells on the same anti-diagonal share r + c. Group by one of these to traverse diagonals, to check the Toeplitz property, or to place queens without conflicts. The number of diagonals in an R by C matrix is R + C - 1.

Other transformations. Rotating counter-clockwise, flipping horizontally or vertically, and transposing a non-square matrix (which needs a new matrix) are small variations. For a rotation of a non-square matrix, allocate a result of size C by R, and map (i, j) to (j, R - 1 - i).

Layer-by-layer rotation. An alternative to transpose and reverse rotates the matrix ring by ring, moving four cells at a time in a cycle. It uses the same memory but is harder to get right, and the two-step version is preferable unless the interviewer asks for the single-pass approach.

Search in a sorted matrix. If rows and columns are both sorted, start from the top right corner: move left when the cell is too large, move down when it is too small, in O(R + C). If every row is sorted and the first element of a row exceeds the last of the previous row, treat the matrix as one long sorted array and binary search with index arithmetic: row = k / C, column = k % C.

Game of Life and other in-place updates encode the old and the new state in one integer, for example using two bits, so that a single pass can update every cell without a copy.`,
        code: `// Direction arrays: up, right, down, left.
const int DR[4] = {-1, 0, 1, 0};
const int DC[4] = {0, 1, 0, -1};

bool insideGrid(int r, int c, int R, int C) { return r >= 0 && r < R && c >= 0 && c < C; }

// Spiral by turning: walk straight, turn right when blocked. Same answer as spiralOrder.
vector<int> spiralByTurning(const vector<vector<int>>& m) {
    int R = (int)m.size(), C = R ? (int)m[0].size() : 0;
    vector<int> out;
    vector<vector<bool>> seen(R, vector<bool>(C, false));
    int r = 0, c = 0, d = 1;  // start moving right
    for (int step = 0; step < R * C; step++) {
        out.push_back(m[r][c]);
        seen[r][c] = true;
        int nr = r + DR[d], nc = c + DC[d];
        if (!insideGrid(nr, nc, R, C) || seen[nr][nc]) {
            d = (d + 1) % 4;  // turn right
            nr = r + DR[d];
            nc = c + DC[d];
        }
        r = nr;
        c = nc;
    }
    return out;
}`,
      },
      {
        title: "Complexity",
        body: `Spiral traversal is O(R * C) time, since each cell is visited once, and O(1) extra space apart from the output. The turning version needs a visited grid, so O(R * C) extra space, in exchange for simpler reasoning.

Rotating in place is O(n^2) time for an n by n matrix, because each of the two steps touches each cell a constant number of times. It uses O(1) extra space. Creating a new matrix instead is also O(n^2) time and costs O(n^2) extra space; interviewers typically ask for the in-place form.

Set Matrix Zeroes takes O(R * C) time. The naive solution that copies the matrix uses O(R * C) space; the version with two arrays of flags uses O(R + C); the marker version uses O(1). Mention all three and explain the trade: the simplest correct version is a good first answer, and the O(1) version is the improvement.

Search in a row and column sorted matrix by the staircase walk is O(R + C), and the single-binary-search version for a fully ordered matrix is O(log(R * C)).

When the matrix is large, memory access matters in practice. Row-major loops, with the inner loop over columns, walk memory sequentially and are much faster than column-major loops, because of the cache. Transposition is the classic case where one of the two sides must jump through memory; blocked transposition improves it. This does not change the asymptotic cost, but it explains observed timings.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Walking the same row or column twice in a spiral when the remaining rectangle has one row or one column. The two guards before the bottom row and the left column prevent it. Test the spiral on a single row, a single column, and a matrix of size 1 by 1.

Mixing up rows and columns. A matrix with R rows and C columns is indexed m[r][c], and its dimensions are m.size() for rows and m[0].size() for columns. Writing m[0].size() when the matrix is empty is undefined behaviour; guard against it.

In Set Matrix Zeroes, clearing the first row and the first column too early. If you zero them before using their markers to clear the inner cells, you wipe out the markers, and every inner cell is cleared. Process the inner cells first, and the first row and column last. Likewise, the flags must be computed before any marker is written, since the markers would otherwise be mistaken for original zeros.

Rotation in place on a non-square matrix is impossible, because the dimensions change; the problem normally guarantees a square. If it does not, build a new matrix.

Off-by-one in the transpose loop. The inner loop must start at i + 1, not at 0, or each pair is swapped twice and the matrix returns to its original state.

Modifying a matrix while reading cells that you have yet to examine. In Game of Life you need the old values of the neighbours, so write the new state in a way that keeps the old state readable, such as extra bits.

Edge cases to test: an empty matrix, one row, one column, a single cell, a matrix of all zeros, a matrix with zeros in the first row or the first column only, and a 2 by 2 rotation.`,
      },
      {
        title: "Practice order",
        body: `1. Spiral Matrix (medium). The boundary technique. Trace it on the 3 by 4 example and on a single row before submitting.
2. Rotate Image (medium). The decomposition into transpose and reverse. After solving it, derive the counter-clockwise version yourself.
3. Set Matrix Zeroes (medium). Solve it first with extra arrays, then with O(1) space by using the first row and column. Explain the ordering of the last steps.

When these feel routine, try Spiral Matrix II (generate the spiral), Diagonal Traverse, Search a 2D Matrix, and Game of Life. Then move on to the graph articles, where the same direction arrays are used for flood fill and shortest paths on grids.`,
      },
    ],
  },
};
