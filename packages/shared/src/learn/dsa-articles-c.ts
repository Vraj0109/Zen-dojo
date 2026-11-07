import type { PatternArticle } from "./types";

// Full pattern articles, group "Searching and sorting" (plan 0008, batch 2). Format and rules: plan 0007.
// Code is C++17. Blocks of one article are concatenated and compiled together, so helper names are unique per article.

export const DSA_ARTICLES_C: Record<string, PatternArticle> = {
  "bs-index": {
    intro:
      "Binary search finds a position in sorted, or sorted-then-rotated, data by throwing away half of the remaining range at every step. It turns a linear scan into about thirty steps for a billion elements. The difficulty is never the idea, it is writing the loop so that it terminates and does not skip the answer, and that is mostly a matter of choosing an invariant and keeping to it.",
    sections: [
      {
        title: "The intuition",
        body: `Looking for a name in a printed phone book, you do not start on page one. You open it in the middle, see that the names there come after the one you want, and ignore the second half. Then you repeat on the first half. Each look halves the pages left to check, so a book of a million pages needs about twenty looks.

That is binary search, and it works whenever one question can be answered by a single probe: "is the thing I want at or before this position, or after it?" In a sorted array the answer comes from comparing the probed value with the target. In a rotated sorted array it needs one more comparison, but the same kind of question still has an answer. In a mountain-shaped array it comes from comparing a position with its neighbour.

The beginner version of the idea searches for an exact value. The version worth learning searches for a boundary: the first position where some condition becomes true. Exact search is a special case, the first position where a[i] >= target, followed by a check that it really equals the target. Boundary search is more useful because it also answers "where would this go", "how many elements are less than x", and "what is the first bad version", all with one loop.

So the mental model is a line of positions where the condition is false, false, false, true, true, true. You are looking for the place where it flips. Every probe of position m tells you which side of the flip you are on, and you discard that whole side.`,
        diagram: `flowchart TD
    A["Range lo to hi holds the answer"] --> B["mid = lo + (hi - lo) / 2"]
    B --> C{"Is the condition true at mid?"}
    C -- yes --> D["hi = mid: the answer is mid or left of it"]
    C -- no --> E["lo = mid + 1: the answer is right of mid"]
    D --> F{"lo less than hi?"}
    E --> F
    F -- yes --> B
    F -- no --> G["lo is the first position where the condition holds"]`,
        diagramCaption: "The half-open template: the range always contains the answer, and it shrinks by at least one each step.",
      },
      {
        title: "Why it works",
        body: `A binary search is correct if three things hold: the invariant, progress, and the end condition. Write them down before the code and the off-by-one bugs disappear.

The invariant says what is always true about the range. In the template we use, the range is half-open: [lo, hi) with the extra allowance that hi may equal the size of the array, and the invariant is "the answer lies in [lo, hi]". The answer is the first position where the condition is true, and hi = n means that no position qualifies. Initially lo = 0 and hi = n, and the invariant holds trivially.

Progress says that the range gets strictly smaller each iteration, otherwise the loop never ends. With mid = lo + (hi - lo) / 2, mid is always at least lo and strictly less than hi when lo < hi. If the condition holds at mid, the answer is at mid or before it, so setting hi = mid keeps the invariant and shrinks the range because mid < hi. If it does not hold, the answer is after mid, so lo = mid + 1 keeps the invariant and shrinks the range. Both branches make progress.

The end condition is lo == hi. The invariant says the answer is in [lo, hi], which is a single value, so lo is the answer. That is why this template needs no special case for "not found": the answer n is a legal result.

Why the odd formula for mid? Writing (lo + hi) / 2 overflows when lo + hi exceeds the largest int, which is a real bug that sat in a famous library for years. lo + (hi - lo) / 2 never overflows. And why does it round down? Because rounding up with hi = mid would sometimes leave the range unchanged and loop forever; that is the mistake behind most infinite loops.

The condition must be monotone: false for a prefix and true for the rest. If it is not, binary search has no reason to work. Checking monotonicity is the first step of every use.`,
      },
      {
        title: "A worked example",
        body: `Lower bound on a = [1, 3, 3, 5, 8, 8, 10], target 5: the first index with a[i] >= 5.
lo = 0, hi = 7. mid = 3, a[3] = 5, which is >= 5, so hi = 3.
lo = 0, hi = 3. mid = 1, a[1] = 3 < 5, so lo = 2.
lo = 2, hi = 3. mid = 2, a[2] = 3 < 5, so lo = 3.
lo = 3 = hi. The answer is index 3. Three probes for seven elements.

Target 9, which is absent: lo = 0, hi = 7. mid = 3, 5 < 9, lo = 4. mid = 5, 8 < 9, lo = 6. mid = 6, 10 >= 9, hi = 6. The answer is 6, the place where 9 would be inserted. For target 11 the loop ends with lo = 7 = n: no element is large enough.

Now Search in Rotated Sorted Array on [4, 5, 6, 7, 0, 1, 2], target 0. A rotation cuts a sorted array and swaps the two parts, so at any probe one of the two halves is still sorted, and that half can be tested directly.
lo = 0, hi = 6, mid = 3, a[3] = 7. The left half [4..7] is sorted (a[lo] <= a[mid]). Is the target in [4, 7)? No, so go right: lo = 4.
lo = 4, hi = 6, mid = 5, a[5] = 1. The left part [0, 1] is sorted. Is 0 in [0, 1)? Yes: hi = 4.
lo = 4, hi = 4, mid = 4, a[4] = 0 equals the target. Found at index 4.

Find Peak Element on [1, 2, 1, 3, 5, 6, 4]: compare a[mid] with a[mid + 1]. If a[mid] < a[mid + 1], the slope goes up, so a peak exists to the right; otherwise one exists at mid or to the left. lo = 0, hi = 6: mid = 3, 3 < 5, lo = 4. mid = 5, 6 > 4, hi = 5. mid = 4, 5 < 6, lo = 5. Answer: index 5, the value 6. Any peak is accepted, and this finds one in logarithmic time because the array cannot go up forever.`,
      },
      {
        title: "Implementation",
        body: `The half-open template is worth memorising as a general function: give it a range and a predicate that is false then true, and it returns the first index where the predicate holds. Lower bound and upper bound then are one-liners on top of it.

Lower bound is the first index with a[i] >= x. Upper bound is the first index with a[i] > x. Their difference is the number of copies of x, and lower bound alone answers "does x exist" and "how many are smaller". The standard library has std::lower_bound and std::upper_bound with these exact meanings.`,
        code: `// First index in [lo, hi) where ok(i) is true, or hi when there is none.
// ok must be monotone: false, false, ..., true, true.
template <class Pred>
int firstTrue(int lo, int hi, Pred ok) {
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (ok(mid)) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}

// First index with a[i] >= x (n when none).
int lowerBound(const vector<int>& a, int x) {
    return firstTrue(0, (int)a.size(), [&](int i) { return a[i] >= x; });
}

// First index with a[i] > x.
int upperBound(const vector<int>& a, int x) {
    return firstTrue(0, (int)a.size(), [&](int i) { return a[i] > x; });
}

// Exact search built on top of it: index of x, or -1.
int binarySearchExact(const vector<int>& a, int x) {
    int i = lowerBound(a, x);
    return (i < (int)a.size() && a[i] == x) ? i : -1;
}`,
      },
      {
        title: "Implementation: rotated array, peaks and the median",
        body: `Search in Rotated Sorted Array uses the closed-range form [lo, hi], because it returns as soon as it sees the target. At every step one half is sorted; decide which, test whether the target is inside it, and discard accordingly. The comparison a[lo] <= a[mid] uses less-or-equal so that a one-element left half counts as sorted. This version assumes distinct values; with duplicates the sorted-half test can be ambiguous and worst-case time grows to linear.

Find Peak Element compares a probe with its right neighbour. The median of two sorted arrays is the hard case: binary search on how many elements the first array contributes to the left half of the merged order. The partition is correct when everything on the left is at most everything on the right, which only needs two comparisons across the cut.`,
        code: `// Search in Rotated Sorted Array (distinct values): index of target or -1.
int searchRotated(const vector<int>& a, int target) {
    int lo = 0, hi = (int)a.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) return mid;
        if (a[lo] <= a[mid]) {  // [lo, mid] is sorted
            if (a[lo] <= target && target < a[mid]) hi = mid - 1;
            else lo = mid + 1;
        } else {  // [mid, hi] is sorted
            if (a[mid] < target && target <= a[hi]) lo = mid + 1;
            else hi = mid - 1;
        }
    }
    return -1;
}

// Find Peak Element: any index whose value is larger than its neighbours (neighbours outside count as minus infinity).
int findPeakElement(const vector<int>& a) {
    int lo = 0, hi = (int)a.size() - 1;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] < a[mid + 1]) lo = mid + 1;  // uphill: a peak is to the right
        else hi = mid;                          // downhill or flat: a peak is at mid or to the left
    }
    return lo;
}

// Median of Two Sorted Arrays in O(log(min(m, n))): binary search on the cut in the shorter array.
double findMedianSortedArrays(const vector<int>& A, const vector<int>& B) {
    if (A.size() > B.size()) return findMedianSortedArrays(B, A);
    int m = (int)A.size(), n = (int)B.size();
    int lo = 0, hi = m, half = (m + n + 1) / 2;
    while (lo <= hi) {
        int i = lo + (hi - lo) / 2;  // elements taken from A into the left half
        int j = half - i;            // elements taken from B into the left half
        int aLeft = i > 0 ? A[i - 1] : INT_MIN, aRight = i < m ? A[i] : INT_MAX;
        int bLeft = j > 0 ? B[j - 1] : INT_MIN, bRight = j < n ? B[j] : INT_MAX;
        if (aLeft <= bRight && bLeft <= aRight) {
            if ((m + n) % 2 == 1) return max(aLeft, bLeft);
            return (max(aLeft, bLeft) + (double)min(aRight, bRight)) / 2.0;
        }
        if (aLeft > bRight) hi = i - 1;
        else lo = i + 1;
    }
    return 0.0;
}`,
      },
      {
        title: "Variants",
        body: `Boundaries. First and last position of a value is lowerBound(x) and upperBound(x) - 1. Insert position is lowerBound. Count of values in [x, y] is upperBound(y) - lowerBound(x). These are the building blocks of Find First and Last Position of Element in Sorted Array, Search Insert Position, and many counting problems.

Rotated arrays. Find Minimum in Rotated Sorted Array compares a[mid] with a[hi]: if a[mid] > a[hi] the minimum is to the right of mid, otherwise at mid or to the left. Once you know the rotation point you can run an ordinary search on either side. With duplicates, an equal pair a[mid] == a[hi] gives no information, and you can only shrink hi by one, so the worst case is linear.

Peaks and mountains. Peak Index in a Mountain Array and Find Peak Element use the neighbour comparison. A bitonic array can be searched by finding the peak first, then running a search in each monotone half.

Two arrays and order statistics. Median of Two Sorted Arrays generalises to the k-th element of two sorted arrays, by searching for the cut.

Implicit sorted structures. A matrix with sorted rows and columns, a function you can evaluate but not store, a range of integers from 1 to a billion: whenever there is an index space with a monotone property, you can search it without ever building it. That is the bridge to the next article, binary search on the answer.

Real numbers. For continuous ranges, loop a fixed number of times (100 is plenty for doubles) instead of until lo equals hi, because floating-point values may never meet.

The standard library. std::lower_bound, std::upper_bound, std::binary_search and std::equal_range all do this on sorted containers. In an interview write the loop; in production use the library.`,
      },
      {
        title: "Complexity",
        body: `Each iteration halves the range, so there are at most about log2(n) + 1 iterations: 20 for a million elements, 30 for a billion. Each iteration costs O(1), so the time is O(log n). Space is O(1) for the loop forms above. A recursive version costs O(log n) stack, which is fine but unnecessary.

The cost of the probe matters. If evaluating the condition costs O(f(n)), the total is O(f(n) * log n). That is the situation in the next article, where the probe is a linear scan. In this article the probe is an array access, so the cost is just the logarithm.

Binary search requires random access. On a linked list, reaching the middle costs O(n), so the search degenerates to linear. For a sorted linked list use a different approach, or copy to an array.

Binary search is only worth it if the data is already sorted or if you will query many times. Sorting once costs O(n log n), and then each query is O(log n); for a single query a linear scan is O(n) and wins. For a billion queries on a static array, binary search is the baseline, and a hash table would be O(1) per query for exact matches but cannot answer order questions such as the next larger element.

The median of two sorted arrays runs in O(log(min(m, n))) because the search is over the shorter array only; this is the answer that separates it from the easy O(m + n) merge.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Infinite loops. They come from a mismatch between the update and the rounding. If you write lo = mid (without the plus one) with mid rounded down, then when hi = lo + 1 the range never shrinks. Either use the half-open template above, where lo moves to mid + 1 and hi moves to mid, or round mid up whenever the update is lo = mid.

Skipping the answer. Writing hi = mid - 1 when the answer might be at mid throws it away. Decide, for each branch, whether mid itself can still be the answer, and keep it if so.

Overflow in the midpoint. Use lo + (hi - lo) / 2. If the bounds themselves are large, such as sums or products, use long long.

Mixing the closed and the half-open templates in one loop: while (lo < hi) with hi = n - 1, or while (lo <= hi) with hi = mid. Pick a template and use its conditions consistently. Searches that return as soon as they find the target use the closed range [lo, hi]; boundary searches use the half-open form.

Forgetting that the condition must be monotone. Before coding, state it: "false for the first k positions, then true".

Duplicates. Exact-match search returns any one of the equal elements; if the problem asks for the first or last, use lower bound or upper bound. Rotated arrays with duplicates need the worst-case warning above.

Empty input and one element. The templates handle n = 0 (the loop does not run, the answer is 0), but code that reads a[hi] with hi = n - 1 must guard against it.

Edge cases to test: empty array, a single element that matches and one that does not, target smaller than all, larger than all, all elements equal, and a rotation by zero or by n.`,
      },
      {
        title: "Practice order",
        body: `1. Search in Rotated Sorted Array (medium). Practise the half-sorted reasoning, then rewrite it as a boundary search for the rotation point plus an ordinary search. Both are worth knowing.
2. Find Peak Element (medium). The shortest example of a search that has no target at all, only a rule for choosing a side. If you can explain why it always terminates at a peak, you understand the invariant.
3. Median of Two Sorted Arrays (hard). The hardest classic. Do it after the others and after you can prove, in one sentence, why the left half must have (m + n + 1) / 2 elements.

Before these, write lowerBound and upperBound from memory until you can do it without thinking, and solve Search Insert Position and Find First and Last Position of Element in Sorted Array with them. Afterwards go to the next article, binary search on the answer, which uses the same loop on a space you never store.`,
      },
    ],
  },

  "bs-answer": {
    intro:
      "Some problems ask for the smallest value that is good enough, or the largest value that still works: the slowest eating speed that finishes in time, the smallest ship capacity that delivers in D days. You cannot compute that value directly, but you can test any candidate quickly, and the tests are monotone. Binary search then finds the boundary between failing and succeeding candidates.",
    sections: [
      {
        title: "The intuition",
        body: `Koko loves bananas and has h hours to eat several piles. At speed k she eats one pile at a time, taking ceil(pile / k) hours for each, and she must finish all piles in h hours. What is the smallest speed that works?

You could try speeds one, two, three, and so on until one works, which is slow when the biggest pile has a billion bananas. But notice something about the answer space. If Koko can finish at speed 7, she can certainly finish at speed 8, because faster never hurts. If she cannot finish at speed 7, she cannot at speed 6. So the speeds split cleanly into a block of failures followed by a block of successes, and we want the first success.

That is exactly the situation in the previous article: a line of false and true values with a single flip. The difference is that the line is not an array in memory. It is the range of possible answers, and "the value at position k" is computed on demand by a feasibility check: simulate eating at speed k and see whether it finishes in time.

So the pattern has two parts, and the rest is routine. Part one: recognise the shape, "minimise the maximum" or "maximise the minimum" or "find the smallest x such that something holds", and see that feasibility is monotone in x. Part two: write a function feasible(x) that checks one candidate, usually with a single linear pass, then binary search over the range of x.`,
        diagram: `flowchart LR
    R["Range of candidate answers, lo to hi"] --> M["Pick mid"]
    M --> F["feasible(mid): one pass over the input"]
    F -->|"works"| L["Keep the left half, mid might be the answer"]
    F -->|"fails"| H["Discard mid and everything below it"]
    L --> R
    H --> R`,
        diagramCaption: "The search is over answers, not over the input. The input is only read inside the feasibility check.",
      },
      {
        title: "Why it works",
        body: `Binary search needs a monotone predicate, so the whole proof is the proof of monotonicity. State it as a sentence for each problem and check it honestly.

Koko: if speed k finishes in at most h hours, then any larger speed also finishes in at most h hours, because every pile takes no longer at a higher speed. So feasible(k) is false up to some threshold and true afterwards.

Shipping: if a ship of capacity C can deliver all packages in D days in the given order, then a larger ship can too, because the same plan still fits. So feasible(C) is monotone.

Splitting an array into k parts to minimise the largest part sum is the same problem in different clothes: feasible(S) asks whether the array can be cut into at most k contiguous parts each with sum at most S. Larger S is easier.

Maximise the minimum is the mirror image. In Aggressive Cows, place c cows in stalls on a line to maximise the smallest distance between any two cows. feasible(d) asks whether c cows can be placed with every gap at least d. Smaller d is easier, so the predicate is true then false, and we look for the last true. The code simply flips which half is kept.

The feasibility check is usually a greedy: scan the input and make the locally best choice. Shipping: put packages on the current day until the next one does not fit, then start a new day. Taking as much as possible each day is optimal, because delaying a package never helps. A greedy check is itself a small correctness argument, and you should be able to say why it is optimal.

Finally, the bounds. The answer must lie within [lo, hi] where lo is the smallest value that could possibly work (for shipping, the heaviest single package, since a smaller ship cannot carry it at all) and hi is a value that surely works (the total weight). Tight, correct bounds are part of the correctness, not only of speed.`,
      },
      {
        title: "A worked example",
        body: `Koko Eating Bananas with piles [3, 6, 7, 11] and h = 8. The speed is between 1 and 11, the biggest pile.

lo = 1, hi = 11. mid = 6. Hours at speed 6: ceil(3/6) = 1, ceil(6/6) = 1, ceil(7/6) = 2, ceil(11/6) = 2, total 6 hours, which is at most 8. Feasible, so hi = 6.
lo = 1, hi = 6. mid = 3. Hours: 1 + 2 + 3 + 4 = 10 hours, more than 8. Not feasible, so lo = 4.
lo = 4, hi = 6. mid = 5. Hours: 1 + 2 + 2 + 3 = 8, feasible. hi = 5.
lo = 4, hi = 5. mid = 4. Hours: 1 + 2 + 2 + 3 = 8, feasible. hi = 4.
lo = hi = 4. The answer is 4.

Four feasibility checks of four piles each, instead of up to eleven.

Capacity To Ship Packages Within D Days on weights [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], D = 5. Bounds: lo = 10 (heaviest package), hi = 55 (total). Try capacity 32: day one carries 1 to 7 (sum 28; adding 8 would make 36), day two carries 8, 9 and 10 (sum 27). Two days is at most 5, so 32 is feasible and the search moves left. At capacity 15: [1..5] = 15, [6, 7] = 13, [8] (8 + 9 = 17 > 15), [9], [10]: five days, feasible. At capacity 14: [1..4] = 10 (adding 5 gives 15), [5, 6] = 11 (adding 7 gives 18), [7], [8], [9], [10]: six days, which is more than 5, so not feasible. So the answer is 15.

The point of the example is the shape: the checks are cheap and greedy, the answer is found in about six probes, and the bounds came from the problem itself.`,
      },
      {
        title: "Implementation",
        body: `Every solution has the same three lines: set the bounds, define feasible, run the loop. Keep them visibly separate in the code, so the loop never contains problem-specific logic.

For "minimise x such that feasible(x)" use the half-open template: while (lo < hi), mid rounded down, if feasible(mid) then hi = mid, else lo = mid + 1. For "maximise x such that feasible(x)" the roles flip, and mid must round up, otherwise lo = mid does not shrink the range: mid = lo + (hi - lo + 1) / 2, if feasible(mid) then lo = mid, else hi = mid - 1.

Use long long when sums can exceed 32 bits, and watch the types in the feasibility check as well as in the bounds.`,
        code: `// Koko Eating Bananas: the smallest speed that finishes within h hours.
int minEatingSpeed(const vector<int>& piles, int h) {
    int lo = 1, hi = *max_element(piles.begin(), piles.end());
    auto canFinish = [&](int speed) {
        long long hours = 0;
        for (int p : piles) hours += (p + speed - 1) / speed;  // ceil(p / speed)
        return hours <= h;
    };
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (canFinish(mid)) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}

// Capacity To Ship Packages Within D Days: the smallest ship capacity.
int shipWithinDays(const vector<int>& weights, int days) {
    int lo = *max_element(weights.begin(), weights.end());
    int hi = accumulate(weights.begin(), weights.end(), 0);
    auto fits = [&](int capacity) {
        int used = 1, load = 0;
        for (int w : weights) {
            if (load + w > capacity) {  // start a new day
                used++;
                load = 0;
            }
            load += w;
        }
        return used <= days;
    };
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (fits(mid)) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}

// Split Array Largest Sum: cut into k contiguous parts to minimise the largest part sum.
// It is the shipping problem again: parts are days, elements are packages.
int splitArray(const vector<int>& nums, int k) { return shipWithinDays(nums, k); }`,
      },
      {
        title: "Implementation: maximise the minimum, and real numbers",
        body: `Aggressive Cows asks for the largest minimum gap. The feasibility check places a cow in the first stall, then the next cow in the first stall at least d away from the previous one, and so on; if it places at least c cows, the gap d is achievable. Greedy placement as far left as possible is optimal for the same reason as before: leaving more room to the right can only help.

When the answer is a real number, the loop runs a fixed number of iterations instead of comparing lo and hi. Square root is the standard demonstration: the predicate mid * mid <= x is true then false, and one hundred halvings shrink any reasonable interval to the limit of double precision.`,
        code: `// Aggressive Cows: the largest possible minimum distance between c cows placed in the stalls.
int aggressiveCows(vector<int> stalls, int cows) {
    sort(stalls.begin(), stalls.end());
    int lo = 1, hi = stalls.back() - stalls.front();
    auto canPlace = [&](int gap) {
        int placed = 1, last = stalls[0];
        for (size_t i = 1; i < stalls.size(); i++) {
            if (stalls[i] - last >= gap) {
                placed++;
                last = stalls[i];
            }
        }
        return placed >= cows;
    };
    while (lo < hi) {
        int mid = lo + (hi - lo + 1) / 2;  // round UP: the update below is lo = mid
        if (canPlace(mid)) lo = mid;
        else hi = mid - 1;
    }
    return lo;
}

// Real-valued search: the square root of x by halving an interval a fixed number of times.
double sqrtBySearch(double x) {
    double lo = 0.0, hi = max(1.0, x);
    for (int step = 0; step < 100; step++) {
        double mid = (lo + hi) / 2.0;
        if (mid * mid <= x) lo = mid;
        else hi = mid;
    }
    return lo;
}`,
      },
      {
        title: "Variants",
        body: `The family is recognised by its wording.

"Minimise the maximum": Split Array Largest Sum, Capacity To Ship Packages, Minimise Max Distance to Gas Station, Painter's Partition, Allocate Books. The answer is the largest load, and feasibility asks whether the work can be divided so that nobody exceeds it.

"Maximise the minimum": Aggressive Cows, Magnetic Force Between Two Balls, Maximum Tastiness of Candy Basket. The answer is the smallest gap, and feasibility asks whether enough items can be placed with every gap at least that big.

"Smallest x such that": Koko Eating Bananas, Minimum Time to Complete Trips, Find the Smallest Divisor Given a Threshold, Kth Smallest Number in a Multiplication Table (feasibility counts how many products are at most x), and Kth Smallest Element in a Sorted Matrix. The last two are the useful trick: search over values, and use a count of "how many elements are at most x" as the predicate, to find a k-th value without sorting.

Searching over a derived quantity such as time or distance: Minimum Time to Repair Cars, Minimum Number of Days to Make m Bouquets.

Real-valued answers: square roots, cutting ropes into equal pieces, minimising the time for two robots to meet. Use a fixed number of iterations and be careful with tolerances.

A useful sanity rule: if you can write the brute force as "for x from small to large, if feasible(x) return x", and feasible is monotone, you have a binary search on the answer. The brute force often tells you the bounds as well.`,
      },
      {
        title: "Complexity",
        body: `The cost is the number of probes times the cost of one probe. The number of probes is log2 of the size of the answer range, not of the input size: for Koko it is about log2(max pile), for shipping it is log2(total weight), at most around 30 to 60 for 32 or 64-bit ranges. The cost of one probe is usually a linear scan, so the total is O(n log(range)).

Compare with the alternatives. Trying every candidate is O(n * range), which is hopeless for ranges of a billion. A dynamic programming solution for splitting an array into k parts is O(n^2 * k), while the search is O(n log sum). The search wins whenever the predicate is monotone.

Space is O(1) besides the input, since the feasibility check keeps only a few counters. For the kth-in-a-matrix variants the probe is O(n) or O(n + m) using a two-pointer walk along the sorted rows, and the whole algorithm is O((n + m) log(range)).

The bounds affect the constant, not the order, but loose bounds can overflow. Summing a hundred thousand values of a billion in a 32-bit int gives a wrong hi and a wrong answer, so use long long for the sum and cast carefully when you narrow it.

A real-valued search with 100 iterations costs 100 probes regardless of the input, which is usually fine, and you can lower it when the problem states a tolerance such as 1e-6.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Wrong bounds. The low bound must not exclude the answer: for shipping it is the heaviest package, not 1 (with 1 the check would try to place a package that never fits and loop or miscount). The high bound must be feasible: the total weight, or the largest pile.

Rounding of mid. For "maximise" problems where the update is lo = mid, mid must round up, or the loop sticks when hi = lo + 1. This single detail causes more infinite loops in this pattern than anything else.

A feasibility check that is not monotone. Check the claim with a tiny example before coding. A common trap is a check that counts something which can decrease as the candidate increases.

A greedy check that is not actually optimal. For shipping, packing in the given order is forced, so the greedy is exact. For problems where you may reorder items, a greedy might not be, and then the whole search is invalid.

Overflow in the check. Hours = sum of ceil(p / speed) can exceed 32 bits when there are many piles; accumulate in long long.

Off-by-one in ceil division. (p + speed - 1) / speed is the integer form, and it overflows if p + speed - 1 does; (p - 1) / speed + 1 avoids it for p at least 1.

Returning the wrong end. With the half-open template for minimisation the result is lo. If you wrote a closed-range loop, the answer might be lo or hi depending on the style; test both on a two-element range.

Edge cases to test: a single pile or package, h equal to the number of piles (speed must be the largest pile), h very large (speed 1), cows equal to stalls, and cows equal to two.`,
      },
      {
        title: "Practice order",
        body: `1. Koko Eating Bananas (medium). The cleanest example: a trivial feasibility check and obvious bounds. Write the brute force first, then convert it.
2. Capacity To Ship Packages Within D Days (medium). A greedy feasibility check, and bounds that need a moment of thought. Explain why the lower bound is the heaviest package.
3. Split Array Largest Sum (hard). The same problem in disguise. If you notice that it is the shipping problem, you have understood the pattern. If you reach for dynamic programming first, solve it that way too and compare the costs.
4. Aggressive Cows (SPOJ AGGRCOW). The maximise-the-minimum direction, with mid rounded up. A good test of the rounding rule.

Afterwards try Find the Smallest Divisor Given a Threshold, Magnetic Force Between Two Balls and Kth Smallest Element in a Sorted Matrix, where the probe counts elements. Then go on to quickselect, which finds the same kth values by a different route.`,
      },
    ],
  },

  quickselect: {
    intro:
      "Quickselect finds the k-th smallest element without sorting the whole array. It borrows the partition step from quicksort, but after each partition it follows only the side that contains the target, so the work shrinks geometrically and the average cost is linear. The same partition idea, with three groups instead of two, is the Dutch national flag algorithm used by Sort Colors.",
    sections: [
      {
        title: "The intuition",
        body: `Suppose you want the median of a million numbers. Sorting does it in O(n log n), about twenty million steps. But you do not need the whole order. You need one element, so surely there is a cheaper way.

Here is the idea. Pick any element as a pivot, and rearrange the array so that everything smaller than the pivot is on its left and everything larger is on its right. That is a partition, and it takes one pass. The pivot ends up in its final sorted position, say index p. Now compare p with the position you want, k. If p == k, the pivot is the answer. If p > k, the answer is in the left part, so ignore the right part. If p < k, the answer is in the right part.

So after one pass you have thrown away the pivot and one entire side. If the pivot is near the middle you have thrown away about half of the array. Then repeat on the half that remains. The passes cost n, then n/2, then n/4, and so on, and that series adds up to about 2n. That is the linear average time.

Compare with quicksort, which recurses into both sides and therefore costs n at every level of a log n deep tree. Quickselect recurses into one side only, which is why it is linear instead of n log n.

The partition step is also useful on its own. Separating an array into "less than", "equal to" and "greater than" groups in one pass is how Sort Colors sorts three values in place, and the same step is the heart of removing elements and of splitting by a predicate.`,
        diagram: `flowchart TD
    A["Pick a pivot, partition the range"] --> B{"Pivot index compared with k"}
    B -- "equal" --> C["Pivot is the answer"]
    B -- "pivot index greater than k" --> D["Continue on the left part"]
    B -- "pivot index less than k" --> E["Continue on the right part"]
    D --> A
    E --> A`,
        diagramCaption: "Unlike quicksort, only one side is explored after each partition.",
      },
      {
        title: "Why it works",
        body: `Correctness rests on the partition guarantee: after partitioning around a pivot, every element to its left is at most the pivot and every element to its right is at least the pivot, and the pivot sits at its final index. If the k-th smallest element in sorted order should be at index k, and the pivot is at index p, then the sorted order tells us exactly where it lies relative to p. Elements in the left part can only occupy indices below p in the final order, so the element that belongs at an index above p is inside the right part, and vice versa. Hence discarding the other side loses nothing, and the target keeps the same relative position (we keep absolute indices in the code, which avoids any shifting arithmetic).

The expected running time needs a probabilistic argument. With a random pivot, the pivot's rank is uniformly distributed, so with probability one half it falls in the middle half of the range, and then the remaining range is at most three quarters of the original. In expectation the range shrinks by a constant factor every two steps or so, so the total work is a geometric series dominated by its first term: O(n).

The worst case is quadratic. If the pivot is always the smallest or largest element, each pass removes only one element. Choosing the pivot at random makes this astronomically unlikely, for any input, which also protects against adversarial inputs such as an already sorted array (the pivot rule "take the first element" is the classic trap). There is a deterministic O(n) algorithm, median of medians, but its constant is large and it is rarely used in practice or asked for in interviews.

Duplicates are the other hazard. If many elements equal the pivot and the partition puts them all on one side, the pass makes almost no progress, and an array of equal values takes quadratic time. The cure is the three-way partition: elements smaller than, equal to and larger than the pivot. After a pass the whole equal block is in its final place, and if k falls inside the block, you are done at once.`,
      },
      {
        title: "A worked example",
        body: `Kth Largest Element in an Array on [3, 2, 1, 5, 6, 4] with k = 2. The 2nd largest is the element that would sit at index n - k = 4 in ascending order, so the target index is 4.

Take the last element, 4, as the pivot (we will swap a random choice into that position, here assume it happens to be 4). Partition the range [0, 5] with the Lomuto scheme: keep a store index at the left; scan from the left, and every element smaller than the pivot is swapped to the store position.
Start: [3, 2, 1, 5, 6, 4], store = 0.
3 < 4: swap with store 0 (same place), store = 1. 2 < 4: store = 2. 1 < 4: store = 3. 5 is not less. 6 is not less.
Finally swap the pivot into the store position: swap a[3] and a[5]. Array: [3, 2, 1, 4, 6, 5]. The pivot 4 is at index 3.

The target is index 4, which is greater than 3, so continue in [4, 5]. Pivot 5 (last element): 6 is not less than 5, so store stays 4, swap the pivot into index 4: [3, 2, 1, 4, 5, 6]. The pivot is at index 4, equal to the target. The answer is 5. Two passes of sizes 6 and 2, and the array was never fully sorted.

Now Sort Colors on [2, 0, 2, 1, 1, 0] with the three-way scheme, keeping three regions: zeros on the left, ones in the middle, twos on the right, and an unexamined region between. The pointers are lo (end of zeros), mid (current), hi (start of twos).
Start: lo = 0, mid = 0, hi = 5. a[0] is 2: swap with a[5], hi = 4: [0, 0, 2, 1, 1, 2]. Now a[0] is 0: swap with a[lo] (itself), lo = 1, mid = 1. a[1] is 0: lo = 2, mid = 2. a[2] is 2: swap with a[4], hi = 3: [0, 0, 1, 1, 2, 2]. a[2] is 1: mid = 3. a[3] is 1: mid = 4, which is past hi, so stop. Result [0, 0, 1, 1, 2, 2]. Each element was examined once, and each swap placed at least one element for good, so the whole sort is a single pass.`,
      },
      {
        title: "Implementation",
        body: `The core is a loop, not a recursion. Choose a random pivot, swap it to the end, partition with the Lomuto scheme, and narrow the range. Use a fixed-seed generator in examples so that runs are reproducible; in production a seeded random engine is fine as well. Copy the input if you do not want to reorder the caller's array: finding the k-th element is allowed to rearrange the array in the real library function (std::nth_element does), and the caller must know.

For arrays with many duplicates, use the three-way variant below. It is barely longer and removes the quadratic trap.`,
        code: `// Kth Largest Element in an Array: Lomuto partition with a random pivot. Average O(n).
int findKthLargest(vector<int> a, int k) {
    int target = (int)a.size() - k;  // index of the answer in ascending order
    int lo = 0, hi = (int)a.size() - 1;
    mt19937 rng(12345);
    while (lo < hi) {
        int p = lo + (int)(rng() % (unsigned)(hi - lo + 1));
        swap(a[p], a[hi]);
        int pivot = a[hi], store = lo;
        for (int i = lo; i < hi; i++) {
            if (a[i] < pivot) swap(a[i], a[store++]);
        }
        swap(a[store], a[hi]);  // the pivot is now in its final place
        if (store == target) return a[store];
        if (store < target) lo = store + 1;
        else hi = store - 1;
    }
    return a[lo];
}

// k-th smallest (0-based) with a three-way partition: safe when many elements are equal.
int quickselectThreeWay(vector<int> a, int k) {
    mt19937 rng(7);
    int lo = 0, hi = (int)a.size() - 1;
    while (lo <= hi) {
        int pivot = a[lo + (int)(rng() % (unsigned)(hi - lo + 1))];
        int lt = lo, i = lo, gt = hi;
        while (i <= gt) {
            if (a[i] < pivot) swap(a[lt++], a[i++]);
            else if (a[i] > pivot) swap(a[i], a[gt--]);
            else i++;
        }
        // now [lo, lt) < pivot, [lt, gt] == pivot, (gt, hi] > pivot
        if (k < lt) hi = lt - 1;
        else if (k > gt) lo = gt + 1;
        else return pivot;
    }
    return -1;
}`,
      },
      {
        title: "Implementation: Sort Colors in one pass",
        body: `The three-way partition with fixed pivot values is the Dutch national flag algorithm, named for the three bands of the Dutch flag. Keep three pointers. Everything before lo is 0, everything from lo up to (not including) mid is 1, everything after hi is 2, and mid scans the unknown region.

When a[mid] is 0, swap it with the element at lo, and advance both: the element that came from lo is a 1 (or the same element), so mid can move on. When a[mid] is 2, swap it with the element at hi and shrink hi, but do not advance mid, because the element that just arrived from hi is unexamined. When it is 1, just advance. That asymmetry, advancing mid in the zero case but not in the two case, is the detail to get right.`,
        code: `// Sort Colors: sort an array of 0, 1 and 2 in place with a single pass.
void sortColors(vector<int>& a) {
    int lo = 0, mid = 0, hi = (int)a.size() - 1;
    while (mid <= hi) {
        if (a[mid] == 0) swap(a[lo++], a[mid++]);
        else if (a[mid] == 2) swap(a[mid], a[hi--]);  // do not advance mid: the swapped-in value is unchecked
        else mid++;
    }
}`,
      },
      {
        title: "Variants",
        body: `Top K elements. The k largest or smallest elements, in any order, are everything on one side of the pivot position after the quickselect finishes. This gives O(n) average for "find the k closest points" or "top k frequent" (after counting), against O(n log k) with a heap. A heap is simpler to write and is better when the data arrives as a stream or when k is tiny; quickselect is better when the whole array is in memory and k is large.

Median and percentiles. The median is quickselect with k = n / 2. Weighted median and the k-th element of a union of ranges are small modifications.

Partition-based problems that never ask for a rank: Sort Colors, move zeroes, partition an array around a value, separate even and odd numbers, and the partition step of a custom quicksort. All of them are different uses of one pass with two or three pointers.

Hoare partition. The original scheme from quicksort uses two pointers moving towards each other and swaps pairs that are on the wrong side. It does fewer swaps than the Lomuto scheme used here and handles duplicates more gracefully, but its index bookkeeping is trickier. Learn the Lomuto version and the three-way version first.

Library support. std::nth_element in C++ is an introselect: quickselect that switches to a heap-based method if it recurses too deeply, giving O(n) average and O(n log n) worst case. Use it in real code.

When the answer is a value rather than an index, and the values are bounded, a counting approach or a binary search on the value (the previous article) can beat quickselect.`,
      },
      {
        title: "Complexity",
        body: `Average time O(n) with a random pivot: the passes cost about n + n/2 + n/4 + ..., which sums to less than 2n, though the exact constant depends on how lucky the pivots are. Expected comparisons are roughly 3.4n for the median.

Worst case O(n^2), when each pivot is an extreme element. A random pivot makes the probability of this negligible for any fixed input, and a three-way partition prevents the worst case caused by many equal elements. Median of medians gives a deterministic O(n) bound at the price of a large constant factor, so it is mostly of theoretical interest.

Space is O(1) extra for the iterative version, and the recursive version uses O(log n) expected stack depth. The array is modified in place, which is a side effect to document.

Compare with the alternatives. Sorting costs O(n log n) and gives the whole order. A heap of size k costs O(n log k) time and O(k) space, and works on streams. A binary search on the value costs O(n log range). Quickselect is the best choice for a single rank query on an in-memory array. If you need many ranks, sort once.

For the Sort Colors pass, the cost is O(n) time with every element examined once and at most n swaps, and O(1) space, which is optimal for three distinct values. Counting sort would take two passes; this is one.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Using the first or last element as the pivot without randomisation. On sorted or reverse sorted input, which tests love, the running time becomes quadratic and large inputs time out. Pick a random pivot (or the median of three).

Duplicates with a two-way partition. An array of a million equal numbers makes every pass remove one element. Use a three-way partition when duplicates are possible, which is nearly always.

Mixing up the rank. The k-th largest is at index n - k in ascending order, and at index k - 1 in descending order. Decide once, comment it, and test with k = 1 and k = n.

Off-by-one on the range. After partitioning, the pivot is in its final place, so the next range excludes it: lo = store + 1 or hi = store - 1. Including it again can cause an infinite loop.

Advancing mid after the swap with hi in the Dutch flag algorithm. The element that arrives from hi has not been examined, so mid must stay.

Changing the caller's array without saying so. The functions here take their input by value to keep the examples free of side effects; the library routine nth_element reorders in place, and you should document that.

Returning garbage for an invalid k. Decide what happens when k is zero or larger than n; the usual contract is that k is valid.

Edge cases to test: a single element, two elements, all equal, already sorted ascending, sorted descending, k = 1, k = n, negative numbers, and an array with only zeros and twos for Sort Colors.`,
      },
      {
        title: "Practice order",
        body: `1. Kth Largest Element in an Array (medium). Solve it three ways in this order: sort, heap, quickselect. Compare the costs, and be ready to say when each is the right answer.
2. Sort Colors (medium). The three-way partition in its smallest form. Write it without looking, and explain why mid is not advanced after swapping with hi.

There are only two problems here, so extend your practice: Top K Frequent Elements and K Closest Points to Origin with quickselect, Wiggle Sort II (which uses a median), and Move Zeroes. Then read about std::nth_element, and compare your function with it on random and on sorted inputs. When this is routine, go on to custom sorting, where the order itself is the idea.`,
      },
    ],
  },

  "custom-sort": {
    intro:
      "Many greedy problems are solved by sorting the items with a comparison that you invent, and then making one simple pass. The skill is finding that comparison: the rule that says which of two items must come first. A correct rule makes the whole problem collapse; a wrong rule looks plausible and fails on a handful of inputs.",
    sections: [
      {
        title: "The intuition",
        body: `Consider the list of numbers [3, 30, 34, 5, 9] and the task: arrange them to form the largest possible number when written one after the other. A first thought is to sort them in descending order: 9, 5, 34, 30, 3, giving 9534303. But 3 followed by 30 gives 330, which is bigger than 303, so the order of 30 and 3 is wrong. Comparing the numbers as numbers is the wrong question. The right question is: for two items a and b, which is better, "a then b" or "b then a"?

That is the heart of a custom sort. You rarely know the final arrangement, but you can often decide, for any two items, which one should come first. If that decision is consistent, in the sense that it describes a real ordering, then sorting with it produces the best overall arrangement, and the problem reduces to the sort followed by a trivial pass.

For the numbers, the pairwise rule is: a goes before b if the string a + b is larger than b + a. For 3 and 30, "330" beats "303", so 3 comes first. Sorting all the numbers by this rule gives 9, 5, 34, 3, 30 and the result 9534330, which is correct.

This is also a way of thinking about greedy algorithms in general. Many of them are "sort by some key and take items in order". The work is finding the key, and proving, with an exchange argument, that swapping two adjacent items that violate the key can never help. Once you have that argument, the algorithm is as good as proved.`,
      },
      {
        title: "Why it works",
        body: `A custom sort is correct under two conditions. The comparison must be a valid ordering (a strict weak ordering), so that sorting is well defined and the library does not misbehave. And the ordering must be the right one: sorted by that rule must be the best arrangement.

First the validity. A comparator comp(a, b), meaning "a goes before b", must be irreflexive (comp(a, a) is false), asymmetric (if comp(a, b) then not comp(b, a)), and transitive, and incomparability must also be transitive. Violating this is not merely wrong, it is undefined behaviour in C++: std::sort can crash or loop on an inconsistent comparator. The classic mistake is using less-or-equal, which makes comp(a, a) true.

For concatenation, transitivity is not obvious, because the rule compares strings built from the pair. The proof treats each number as a digit string and notes that a + b > b + a is equivalent to comparing a / (10^len(a) - 1) with b / (10^len(b) - 1), which is a comparison of real numbers and therefore transitive. You do not need to reproduce that in an interview, but you should know it is the reason the comparator is safe.

Then the optimality. The exchange argument: take any arrangement in which some adjacent pair (x, y) has y + x > x + y, so that swapping them would give a larger number. Swapping the pair increases the total (the prefix and suffix are unchanged and the middle part grows), so the arrangement was not optimal. Therefore an optimal arrangement has no such adjacent pair, which means every adjacent pair satisfies the rule, and by transitivity the arrangement equals the sorted order.

For Queue Reconstruction by Height, the argument is different: process people from tallest to shortest, and for equal heights from the smallest k to the largest. Insert each person at index k. When a person is inserted, only taller or equal people are already in the line, and k counts exactly those in front. People inserted later are shorter, so they never change the count of anyone already placed. That is why the order of insertion makes the insertion position correct.`,
      },
      {
        title: "A worked example",
        body: `Largest Number on [3, 30, 34, 5, 9]. Convert to strings and sort with a + b > b + a.

Compare "3" and "30": "330" vs "303": 330 is larger, so 3 before 30.
Compare "34" and "3": "343" vs "334": 343 is larger, so 34 before 3.
Compare "34" and "30": "3430" vs "3034": 3430 is larger, so 34 before 30.
Compare "5" and "34": "534" vs "345": 5 before 34. And "9" before "5": "95" vs "59".
Sorted: 9, 5, 34, 3, 30. Concatenated: "9534330". If the first string is "0", every number was zero and the answer is "0", not "000".

Queue Reconstruction by Height on [[7, 0], [4, 4], [7, 1], [5, 0], [6, 1], [5, 2]], where [h, k] means a person of height h with exactly k people of height at least h in front of them.
Sort by height descending, then by k ascending: [7, 0], [7, 1], [6, 1], [5, 0], [5, 2], [4, 4].
Insert each at index k:
[7, 0] at 0: [[7, 0]].
[7, 1] at 1: [[7, 0], [7, 1]].
[6, 1] at 1: [[7, 0], [6, 1], [7, 1]].
[5, 0] at 0: [[5, 0], [7, 0], [6, 1], [7, 1]].
[5, 2] at 2: [[5, 0], [7, 0], [5, 2], [6, 1], [7, 1]].
[4, 4] at 4: [[5, 0], [7, 0], [5, 2], [6, 1], [4, 4], [7, 1]].
Check [4, 4]: the people in front are 5, 7, 5, 6, which is four people at least as tall. Correct.

Notice that in the second example the sort is on two keys, and the greedy lives in the insertion. In the first example the sort contains the whole idea. Both start with: what is the order in which the decisions must be made?`,
      },
      {
        title: "Implementation",
        body: `The comparator is a lambda that returns true when its first argument must come before its second. Write it as a strict comparison, and when you sort by several keys, compare the first key and only look at the second when the first is equal.

Largest Number converts the numbers to strings, sorts with the concatenation rule, joins the strings, and handles the all-zeros case. Queue Reconstruction sorts by (height descending, k ascending), then inserts each person at position k. Inserting into a vector costs O(n) each, so the total is quadratic, which is acceptable for the usual limits; a balanced tree or a segment tree brings it down to O(n log n).`,
        code: `// Largest Number: order the numbers so that their concatenation is as large as possible.
string largestNumber(const vector<int>& nums) {
    vector<string> s;
    for (int x : nums) s.push_back(to_string(x));
    sort(s.begin(), s.end(), [](const string& a, const string& b) { return a + b > b + a; });
    if (s[0] == "0") return "0";  // every number was zero
    string out;
    for (const string& t : s) out += t;
    return out;
}

// Queue Reconstruction by Height: tallest first, then smaller k first; insert each person at index k.
vector<vector<int>> reconstructQueue(vector<vector<int>> people) {
    sort(people.begin(), people.end(), [](const vector<int>& a, const vector<int>& b) {
        if (a[0] != b[0]) return a[0] > b[0];
        return a[1] < b[1];
    });
    vector<vector<int>> out;
    for (const auto& p : people) out.insert(out.begin() + p[1], p);
    return out;
}`,
      },
      {
        title: "Implementation: sorting by a derived key",
        body: `A large share of custom sort problems do not need a clever pairwise rule, only a key you compute for each item: sort intervals by end time, tasks by deadline, jobs by profit per unit of time, words by length. Computing the key once and sorting pairs of (key, item) is cleaner than recomputing inside the comparator.

The second function below sorts task indices by the ratio of reward to duration, using a cross-multiplied comparison instead of dividing, so that no floating-point error creeps into the order. Comparing fractions a/b and c/d by comparing a * d with c * b is a good habit: it is exact for integers (watch for overflow, use long long).`,
        code: `// Sort job indices by reward per unit of time, highest first, without floating point.
// Job i has reward[i] and duration[i] (duration is positive). Ties keep the smaller index first.
vector<int> orderByRatio(const vector<long long>& reward, const vector<long long>& duration) {
    vector<int> order(reward.size());
    iota(order.begin(), order.end(), 0);
    sort(order.begin(), order.end(), [&](int i, int j) {
        long long left = reward[i] * duration[j];
        long long right = reward[j] * duration[i];
        if (left != right) return left > right;  // reward[i] / duration[i] > reward[j] / duration[j]
        return i < j;
    });
    return order;
}`,
      },
      {
        title: "Variants",
        body: `Sort by end, then greedy. Interval scheduling (the most meetings you can attend) sorts by end time, and Minimum Number of Arrows to Burst Balloons does too. The pairwise rule is "the one that ends first leaves the most room".

Sort by ratio. The fractional knapsack takes items by value per weight, and job scheduling with weights and durations (minimise the weighted completion time) sorts by weight divided by duration. The exchange argument is the same: if two adjacent jobs are in the wrong ratio order, swapping them lowers the cost.

Sort by deadline with a heap. Course Schedule III and Task Scheduler variants sort by deadline and use a heap to throw away the longest course when time runs out. The sort handles the order, the heap handles regret.

Sort and sweep. Many problems become easy after sorting: merge intervals, meeting rooms, the closest pair on a line, two sum on a sorted array with two pointers, and finding the maximum gap.

Sort by two keys. People by height and k above, versions by (major, minor), points by x then y. The standard tool is to compare the first key and fall back to the second.

Stable sorting. When equal keys must keep their original order, use std::stable_sort, or add the original index as the final key. Relying on the instability of std::sort is a bug waiting to happen.

Sorting strings by a custom alphabet (Verifying an Alien Dictionary) maps each character to its rank and compares the mapped strings.

When a sort will not do: if the best order depends on the items already chosen (a pairwise rule does not exist), the problem is usually dynamic programming or a heap-based greedy, not a plain sort.`,
      },
      {
        title: "Complexity",
        body: `Sorting dominates: O(n log n) comparisons. For Largest Number each comparison builds two strings of the combined length of the two numbers, so a comparison costs O(L), where L is the digit count, and the total is O(n L log n); with at most ten digits per number that is a small constant. The final concatenation is O(n L).

Queue Reconstruction is O(n log n) for the sort and O(n^2) for the repeated insertions into a vector, since each insertion shifts up to n elements. With n up to a few thousand that is fine. A faster version uses an order-statistics structure to find the k-th free slot, giving O(n log n) overall; that is the answer if the interviewer asks to improve it.

Space is O(n) for the strings or the output.

A custom comparator can make sorting slower in practice if it allocates, as the string concatenation does. Precomputing keys, such as digit strings or ratios, and sorting by them is faster than recomputing inside the comparator. A comparator that does a lot of work multiplies the cost of every one of the n log n comparisons, so keep it light.

Remember that std::sort is not stable and not guaranteed to preserve the order of equal elements; for stable behaviour at the same asymptotic cost, std::stable_sort uses extra memory.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `A comparator that is not a strict weak ordering. Using <= or >= instead of < or > makes comp(a, a) true, which is undefined behaviour in std::sort and can crash on inputs with equal elements. Always use strict comparisons, and test with duplicates.

A rule that is plausible but wrong. Sorting numbers by their numeric value, or strings alphabetically, fails for Largest Number. Before trusting a rule, try to break it with two small items, and write the exchange argument in one sentence.

An intransitive rule. If your pairwise comparison can say a before b, b before c, and c before a, there is no order and the sort is invalid. Check the concatenation rule once and trust it; check any new rule you invent.

All zeros. For Largest Number, the input [0, 0] must return "0", not "00". Handle it after sorting by checking the first string.

Integer overflow in a cross-multiplied comparison. Use long long, and check that the products fit.

Mutating the keys while sorting, or comparing floating-point numbers computed in different ways. Compute keys once and compare exactly.

Forgetting stability. If the problem needs equal items in their original order and you used std::sort, results can differ between platforms.

Insertion index out of range. In Queue Reconstruction, inserting at index k is valid only if there are at least k elements already; the sort order guarantees this for valid input, so an exception means the input is invalid.

Edge cases to test: a single element, all equal elements, duplicates that differ only in the second key, numbers ending in zero ("10" and "2"), and large digit counts.`,
      },
      {
        title: "Practice order",
        body: `1. Largest Number (medium). The pairwise comparator. Write down the exchange argument before coding, then check your comparator on [3, 30, 34, 5, 9] and [0, 0].
2. Queue Reconstruction by Height (medium). Two keys, and a greedy that lives in the insertion order. Explain why processing from tallest to shortest makes each insertion final.

Afterwards extend the practice: Non-overlapping Intervals and Minimum Number of Arrows to Burst Balloons (sort by end), Task Scheduler, Course Schedule III (sort by deadline, plus a heap), and Verifying an Alien Dictionary. For every one of them, say the comparison rule aloud before you write any code. That sentence is the solution.`,
      },
    ],
  },

  "merge-sort-count": {
    intro:
      "Merge sort sorts by splitting an array in half, sorting each half, and merging. The merge step does something extra for free: at the moment two elements from different halves are compared, you learn how many pairs are in the wrong order. That turns merge sort into a way of counting inversions, and of answering questions like how many smaller numbers lie to the right of each element, in O(n log n) instead of O(n^2).",
    sections: [
      {
        title: "The intuition",
        body: `An inversion is a pair of positions i < j with a[i] > a[j], a pair that is out of order. A sorted array has none. A reversed array of n elements has n(n - 1)/2. The number of inversions measures how far an array is from sorted, and the same counting idea answers many other questions: for each element, how many later elements are smaller? How many pairs (i, j) have a[i] > 2 * a[j]? How many subarrays have a sum in a given range?

The direct way checks every pair and costs O(n^2), too slow for n = 100,000. The faster way uses divide and conquer. Split the array into a left half and a right half. Every inversion is of one of three kinds: both elements in the left half, both in the right half, or one in each. The first two kinds are counted by recursion. The third kind, the cross pairs, is what we need to count cleverly.

Here is the key observation. If both halves are sorted, counting the cross inversions is easy. Walk through them with two pointers, as in merging. Whenever the next element of the right half is smaller than the current element of the left half, it is smaller than that element and than every element remaining in the left half, because the left half is sorted. So it forms an inversion with all of them at once, and you add the count of the remaining left elements in a single step. No pair is looked at individually.

That is why merge sort is the natural tool: it already sorts the halves and already walks through them in exactly this way. The counting costs nothing extra, the whole algorithm is O(n log n), and the sortedness that makes the counting cheap is produced by the recursion itself.`,
        diagram: `flowchart TD
    A["Count(range)"] --> B["Split into left and right halves"]
    B --> C["Count(left)"]
    B --> D["Count(right)"]
    C --> E["Merge: when a right element goes first, add the number of left elements still waiting"]
    D --> E
    E --> F["Sorted range and its inversion count"]`,
        diagramCaption: "Inversions inside each half come from the recursion; inversions across the halves are counted during the merge.",
      },
      {
        title: "Why it works",
        body: `Correctness follows from splitting the set of pairs into three disjoint groups and counting each exactly once. For a range [lo, hi) with midpoint mid, every pair (i, j) with i < j either has both indices in [lo, mid), both in [mid, hi), or i in the left half and j in the right half. The recursive calls count the first two groups. The merge counts the third. Nothing is counted twice, and nothing is missed.

Why does the merge count the cross inversions correctly? When the recursive calls return, each half is sorted. Whether a cross pair (x in the left half, y in the right half) is an inversion depends only on whether x > y, not on the positions inside the halves, because every element of the left half is before every element of the right half. So sorting the halves does not change the number of cross inversions, which is why we may count after sorting.

Now the merge. Pointer i walks the left half, pointer j walks the right half. If left[i] <= right[j], the left element goes to the output, and it is not larger than the current right element, so it forms no inversion with the current right element or any later one (they are at least as large). Otherwise right[j] < left[i]: the right element goes to the output first, and since the left half is sorted, right[j] is smaller than left[i] and all the elements after it in the left half. That is (mid - i) inversions, counted in one step. Each element is placed exactly once, so the merge costs linear time.

The comparison uses <= for the left element, so equal elements are not counted as inversions. That is the right choice when the definition is strict (a[i] > a[j]). Changing the comparison changes the meaning, and for variants with other conditions (such as a[i] > 2 * a[j]) the counting is done in a separate pass over the sorted halves, which is possible because the conditions are monotone along a sorted array, just as with a pair of pointers.`,
      },
      {
        title: "A worked example",
        body: `Count inversions in [8, 4, 2, 1]. Every pair is out of order, so the answer is 6.

Split into [8, 4] and [2, 1]. Recursively, [8, 4] has one inversion (8 > 4) and becomes [4, 8]. [2, 1] has one inversion and becomes [1, 2].
Merge [4, 8] with [1, 2]. mid - i is the number of left elements remaining.
Compare 4 and 1: 1 is smaller, so 1 goes first, and both 4 and 8 are larger: add 2. Output [1].
Compare 4 and 2: 2 is smaller, again 4 and 8 remain: add 2. Output [1, 2].
The right half is finished. The left elements 4 and 8 are appended. No more inversions.
Cross inversions: 4. Total: 1 + 1 + 4 = 6.

Now Count of Smaller Numbers After Self on [5, 2, 6, 1]. The answer is [2, 1, 1, 0]: after 5 there are two smaller numbers (2 and 1), after 2 one (1), after 6 one (1), after 1 none.

Sort pairs (value, original index) with merge sort. During a merge, whenever a left element is placed in the output, the number of right elements already placed before it is the number of smaller elements from the right half that were after it in the original array. Add that count to the answer at the left element's original index.

Take the split [5, 2] and [6, 1]. Sorted halves: [(2, 1), (5, 0)] and [(1, 3), (6, 2)]. Merge: compare 2 and 1: take 1 (right), now one right element is placed. Compare 2 and 6: take 2 (left), it has 1 smaller element from the right half: res[1] += 1. Compare 5 and 6: take 5, again 1: res[0] += 1. Then take 6. Combined with the counts from the inner merges (res[0] gets another 1 when 5 is merged with 2 in the left half, and res[2] gets 1 when 6 is merged with 1 in the right half), the result is [2, 1, 1, 0].`,
      },
      {
        title: "Implementation",
        body: `The recursion works on the half-open range [lo, hi) with a shared temporary buffer, so that no allocation happens inside the recursion. The merge loop takes from the left when left[i] <= right[j], which keeps equal elements from counting as inversions. After merging, copy the temporary range back so that the parent sees sorted data.

Use long long for the count: an array of 100,000 elements can have about five billion inversions, which does not fit in 32 bits.

Reverse Pairs counts i < j with a[i] > 2 * a[j]. The condition is not the same as the order used for sorting, so count it first, with two pointers across the sorted halves, and then merge normally. Cast to long long before doubling, since 2 * a[j] can overflow an int.`,
        code: `// Count inversions: pairs i < j with a[i] > a[j]. Sorts a[lo, hi) as a side effect.
long long countInversionsRec(vector<int>& a, vector<int>& tmp, int lo, int hi) {
    if (hi - lo < 2) return 0;
    int mid = lo + (hi - lo) / 2;
    long long count = countInversionsRec(a, tmp, lo, mid) + countInversionsRec(a, tmp, mid, hi);
    int i = lo, j = mid, k = lo;
    while (i < mid && j < hi) {
        if (a[i] <= a[j]) {
            tmp[k++] = a[i++];
        } else {
            count += mid - i;  // a[j] is smaller than a[i] and everything after it in the left half
            tmp[k++] = a[j++];
        }
    }
    while (i < mid) tmp[k++] = a[i++];
    while (j < hi) tmp[k++] = a[j++];
    copy(tmp.begin() + lo, tmp.begin() + hi, a.begin() + lo);
    return count;
}

long long countInversions(vector<int> a) {
    vector<int> tmp(a.size());
    return countInversionsRec(a, tmp, 0, (int)a.size());
}

// Reverse Pairs: i < j with a[i] > 2 * a[j]. Count across the halves first, then merge.
long long reversePairsRec(vector<int>& a, vector<int>& tmp, int lo, int hi) {
    if (hi - lo < 2) return 0;
    int mid = lo + (hi - lo) / 2;
    long long count = reversePairsRec(a, tmp, lo, mid) + reversePairsRec(a, tmp, mid, hi);
    int j = mid;
    for (int i = lo; i < mid; i++) {
        while (j < hi && (long long)a[i] > 2LL * a[j]) j++;
        count += j - mid;  // all of a[mid, j) are small enough for a[i]
    }
    merge(a.begin() + lo, a.begin() + mid, a.begin() + mid, a.begin() + hi, tmp.begin() + lo);
    copy(tmp.begin() + lo, tmp.begin() + hi, a.begin() + lo);
    return count;
}

long long reversePairs(vector<int> a) {
    vector<int> tmp(a.size());
    return reversePairsRec(a, tmp, 0, (int)a.size());
}`,
      },
      {
        title: "Implementation: Count of Smaller Numbers After Self",
        body: `This version needs the answer per element, not a single total, so the sort must carry each value's original index. Sort an array of pairs, and during the merge credit the left element with the number of right elements that went out before it.

The merge loop is written as a single loop with a clear rule: take from the left when the right half is exhausted, or when the left value is not larger than the right value. At that moment, (j - mid) right elements have been taken, and all of them were strictly smaller than the left value, because a right element is taken before a left one only when it is strictly smaller.

An alternative that is often shorter in practice uses a Fenwick tree (binary indexed tree) over the compressed values. Both are O(n log n). The merge sort version is worth knowing because it generalises to the range-sum counting problem below.`,
        code: `// Count of Smaller Numbers After Self: res[i] = number of j > i with nums[j] < nums[i].
void smallerRec(vector<pair<int, int>>& v, vector<pair<int, int>>& tmp, vector<int>& res, int lo, int hi) {
    if (hi - lo < 2) return;
    int mid = lo + (hi - lo) / 2;
    smallerRec(v, tmp, res, lo, mid);
    smallerRec(v, tmp, res, mid, hi);
    int i = lo, j = mid, k = lo;
    while (i < mid || j < hi) {
        if (j == hi || (i < mid && v[i].first <= v[j].first)) {
            res[v[i].second] += j - mid;  // right elements already placed are all strictly smaller
            tmp[k++] = v[i++];
        } else {
            tmp[k++] = v[j++];
        }
    }
    copy(tmp.begin() + lo, tmp.begin() + hi, v.begin() + lo);
}

vector<int> countSmaller(const vector<int>& nums) {
    int n = (int)nums.size();
    vector<pair<int, int>> v(n), tmp(n);
    vector<int> res(n, 0);
    for (int i = 0; i < n; i++) v[i] = {nums[i], i};
    smallerRec(v, tmp, res, 0, n);
    return res;
}`,
      },
      {
        title: "Variants",
        body: `Inversions with a different condition. Reverse Pairs counts a[i] > 2 * a[j]. Any condition of the form a[i] > f(a[j]) with f monotone can be counted with a two-pointer sweep over the sorted halves before the merge. Count the pairs, then merge as usual.

Per-element answers. Count of Smaller Numbers After Self, and its cousins (how many larger numbers before me, how many elements to my right are at most half of me) attach the count to the original index using the pair trick.

Range sum counting. Count of Range Sum asks for the number of subarrays whose sum lies in [lower, upper]. With prefix sums p, a subarray (i, j] has sum p[j] - p[i], so the question becomes counting pairs i < j with lower <= p[j] - p[i] <= upper. That is a merge sort over the prefix sums, where, for each left element, two pointers on the sorted right half find the window of values in range. This is the same mechanism once more, which is a good example of reducing a problem to the pattern.

Other tools for the same counting problems. A Fenwick tree or a segment tree over compressed coordinates counts "how many smaller elements so far" in O(log n) per element, processing from right to left. An ordered statistic tree does it too. The merge sort approach uses only arrays and recursion, which is an advantage when no tree structure is at hand, and it composes well with offline counting.

Related uses of merge sort itself. Sorting a linked list in O(n log n) and O(1) extra space, external sorting of data too large for memory (merge sorted runs), and stable sorting all rely on the merge step.

Number of swaps in bubble sort equals the number of inversions, which is a classic way to state the problem.`,
      },
      {
        title: "Complexity",
        body: `The recursion has log2(n) levels, and the merge work at each level, counting included, is linear in the total size. So the time is O(n log n). The counting loop for Reverse Pairs adds another linear pass per level, which keeps the total at O(n log n).

Space is O(n) for the temporary buffer, plus O(log n) for the recursion stack. Allocating one buffer up front, as in the code, avoids creating a new vector inside every call, which would multiply the allocation cost.

Compared with the brute force: for n = 100,000 the pairwise method performs about five billion comparisons, which is far too slow, while merge sort performs about 1.7 million. A Fenwick tree has the same asymptotic cost, O(n log n), with an extra coordinate compression step.

The count itself is large. The number of inversions can reach n(n - 1)/2, which is about 5 * 10^9 for 100,000 elements, so a 64-bit integer is required for the total. The per-element counts in Count of Smaller Numbers After Self are at most n, and fit in 32 bits.

Merge sort is stable and has a worst case equal to its average case, unlike quicksort, which is why it is the right base for counting problems: the sorted halves are guaranteed.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Counting equal elements as inversions. With a strict definition (a[i] > a[j]) the merge must take the left element when the two are equal. Taking the right one first would count equal pairs. Read the definition in the problem statement and match the comparison to it.

Counting before or after merging for conditions that differ from the sort order. For Reverse Pairs, the cross-pair count must happen while the halves are sorted and before they are merged. Counting after the merge would use the combined order and lose the left/right distinction.

Overflow. The total can exceed 32 bits, use long long. In Reverse Pairs, 2 * a[j] overflows an int for values near the limit, so cast to long long before doubling. In Count of Range Sum the prefix sums themselves need long long.

Losing the original indices. For per-element answers, sort pairs of (value, index), not bare values, or the counts cannot be attributed.

Using the wrong half-open boundaries. The recursion on [lo, mid) and [mid, hi) with mid = lo + (hi - lo) / 2 terminates because both parts are strictly shorter than the whole when the length is at least two. The base case is length less than two.

Forgetting to copy back. If the merged output stays in the temporary buffer, the parent reads unsorted data and the counts are wrong from the second level up.

Not restoring the input. The functions above sort a copy; if the caller's array matters, document that the recursion sorts it.

Edge cases to test: empty and single-element arrays, an already sorted array (zero inversions), a reversed array (n(n-1)/2), all equal elements (zero), negative numbers, and values near the integer limits for Reverse Pairs.`,
      },
      {
        title: "Practice order",
        body: `1. Count of Smaller Numbers After Self (hard). The index-carrying merge sort. Solve it first with a Fenwick tree over compressed values, then with merge sort, and compare which you find easier to get right.
2. Reverse Pairs (hard). The first problem where the counting condition differs from the sort order. Draw the two-pointer sweep on a small example before you code.
3. Count of Range Sum (hard). The reduction from subarray sums to pairs of prefix sums, and then the same merge sort with a window of two pointers. If you can do this one, you have the whole pattern.

Before these, write the plain inversion counter from scratch, and verify it against the brute force on random small arrays. Afterwards, look at the Fenwick tree and segment tree patterns, which solve the same counting questions online.`,
      },
    ],
  },
};
