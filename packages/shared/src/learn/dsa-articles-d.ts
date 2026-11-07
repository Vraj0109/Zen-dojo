import type { PatternArticle } from "./types";

// Full pattern articles, group "Lists, stacks, heaps" (plan 0008, batch 3), first half. Format and rules: plan 0007.
// Code is C++17. Blocks of one article are concatenated and compiled together, so helper names are unique per article.

export const DSA_ARTICLES_D1: Record<string, PatternArticle> = {
  "fast-slow": {
    intro:
      "Fast and slow pointers walk the same sequence at different speeds. Because the two speeds differ, their meeting or their gap tells you something you could not see from one pointer: whether the sequence loops, where the loop starts, where the middle is, or which node is k places from the end. It needs O(1) memory where a hash set would need O(n), and it works on any sequence defined by a next function, not only linked lists.",
    sections: [
      {
        title: "The intuition",
        body: `Picture two runners on a track. If the track is a straight road, the faster runner reaches the end first and they never meet again. If the track is a circle, the faster runner laps the slower one and they must meet. So "do they ever meet" is the same question as "is there a loop". Nobody needs to remember where they have been.

The same two runners also find the middle of a straight road. When the fast runner, who moves twice as quickly, reaches the end, the slow runner has covered half the distance. That is the midpoint, found in one pass without counting the length first.

A third use is a fixed gap. Start one pointer k steps ahead of the other and move both at the same speed. When the front one falls off the end, the back one is exactly k nodes from the end. Here the two speeds are equal and the difference is in the starting position, but it is the same family of ideas: two pointers on one list whose relationship gives the answer.

The pattern is easy to spot. The input is a linked list or a function that maps a value to the next value, the problem asks about a cycle, the middle, or a position counted from the end, and the statement either forbids extra memory or mentions O(1) space. A hash set of visited nodes always works. Fast and slow pointers are the answer when you are asked to do the same with constant space.`,
        diagram: `flowchart LR
    A["Head"] --> B["Tail part: mu nodes"]
    B --> C["Cycle entry"]
    C --> D["Cycle: lambda nodes"]
    D --> C
    E["slow: 1 step"] -.-> D
    F["fast: 2 steps"] -.-> D`,
        diagramCaption: "A list with a tail of mu nodes and a cycle of lambda nodes. Both pointers end up inside the cycle, and fast gains one node on slow every step.",
      },
      {
        title: "Why it works",
        body: `Cycle detection first. Say the tail has mu nodes before the cycle begins and the cycle has lambda nodes. Once both pointers are inside the cycle, the fast one gains exactly one node on the slow one per step, because it moves two while the slow one moves one. The gap, measured around the cycle, is therefore reduced by one each step, so it reaches zero within lambda steps. They meet. If there is no cycle, the fast pointer reaches the null at the end, so the loop ends. The cycle check is correct in both directions.

Now the start of the cycle. Suppose slow has taken k steps when they first meet. Fast has taken 2k. Both are inside the cycle, and fast has gone around some whole number of extra laps, so 2k - k = k is a multiple of lambda. Write k = m * lambda. The meeting point is k - mu steps past the cycle entry, taken around the loop. How far is it from the meeting point forward to the entry? A full lap is lambda, and we are (k - mu) mod lambda past the entry, so the distance forward is lambda - ((k - mu) mod lambda). Since k is a multiple of lambda, (k - mu) mod lambda equals (-mu) mod lambda, and the distance forward works out to mu mod lambda. In plain words: from the meeting point, walking mu steps lands you on the entry, possibly after some whole laps.

That is the key. A pointer that starts at the head and walks mu steps lands on the entry. A pointer that starts at the meeting point and walks mu steps also lands on the entry. So move one from the head and one from the meeting point, one step at a time, and they meet exactly at the entry. We never needed to know mu.

The midpoint needs no proof beyond arithmetic: fast covers twice the distance, so it is at the end when slow is halfway. The k-from-the-end trick is just the statement that two pointers a fixed gap apart stay a fixed gap apart.`,
      },
      {
        title: "A worked example",
        body: `A list with values 3, 2, 0, -4 where the last node points back to the node holding 2. Call the nodes n0..n3. The tail is mu = 1 node (n0), the cycle has lambda = 3 nodes (n1, n2, n3).
Both pointers start at n0.
Step 1: slow moves to n1, fast moves two to n2.
Step 2: slow moves to n2, fast goes n2 to n3 to n1, so fast is at n1.
Step 3: slow moves to n3, fast goes n1 to n2 to n3, so fast is at n3. They meet at n3.
Phase two: put one pointer at the head n0 and keep the other at n3. Move both one step: n0 to n1 and n3 to n1. They meet at n1, the node holding 2. That is the start of the cycle, as the proof says (mu = 1 step).

Find the Duplicate Number on [1, 3, 4, 2, 2] treats the array as a function: index i points to a[i]. Starting at index 0 the path is 0, 1, 3, 2, 4, 2, 4, ... Index 2 is reached from both 3 and 4, which is what a duplicate value means, so the cycle starts at 2. Phase one: slow = a[0] = 1, fast = a[a[0]] = 3. Then slow = 3, fast = a[a[3]] = a[2] = 4. Then slow = a[3] = 2 and fast = a[a[4]] = a[2] = 4. Then slow = a[2] = 4 and fast = a[a[4]] = a[2] = 4. They meet at 4. Phase two: p = 0, slow = 4. Step: p = 1, slow = 2. Step: p = 3, slow = 4. Step: p = 2, slow = 2. They meet at 2, the duplicate.

Reorder List on 1, 2, 3, 4, 5 asks for 1, 5, 2, 4, 3. Find the middle: slow ends at 3. Cut after it and reverse the second half 4, 5 into 5, 4. Merge by alternating: 1, 5, 2, 4, 3. For 1, 2, 3, 4 the middle (stopping early) is 2, the second half 3, 4 reverses to 4, 3, and the merge gives 1, 4, 2, 3.`,
      },
      {
        title: "Implementation",
        body: `Four short functions cover the whole pattern. For cycle detection, loop while fast and fast's next both exist. The start of the cycle uses the two phases from the proof. The middle node comes from the same loop without any cycle logic.

Two details matter in the middle-of-list loop. With the condition fast and fast->next, an even-length list ends with slow on the second of the two middle nodes. With the condition fast->next and fast->next->next, it ends on the first. Reorder List and palindrome checks want the first middle, so that the first half is the longer or equal half. Decide which one the problem needs before writing the loop.`,
        code: `struct ListNode {
    int val;
    ListNode* next;
    explicit ListNode(int v) : val(v), next(nullptr) {}
};

// Does the list contain a cycle?
bool hasCycle(ListNode* head) {
    ListNode *slow = head, *fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) return true;
    }
    return false;
}

// First node of the cycle, or nullptr when there is none.
ListNode* detectCycle(ListNode* head) {
    ListNode *slow = head, *fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) {
            ListNode* entry = head;
            while (entry != slow) {
                entry = entry->next;
                slow = slow->next;
            }
            return entry;
        }
    }
    return nullptr;
}

// Second middle for even lengths (1,2,3,4 gives 3).
ListNode* middleNode(ListNode* head) {
    ListNode *slow = head, *fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
    }
    return slow;
}

// Remove the n-th node from the end with a fixed gap of n.
ListNode* removeNthFromEnd(ListNode* head, int n) {
    ListNode dummy(0);
    dummy.next = head;
    ListNode *front = &dummy, *back = &dummy;
    for (int i = 0; i < n; i++) front = front->next;
    while (front->next) {
        front = front->next;
        back = back->next;
    }
    ListNode* gone = back->next;
    back->next = gone->next;
    delete gone;
    return dummy.next;
}`,
      },
      {
        title: "Implementation: arrays as linked lists, and Reorder List",
        body: `Find the Duplicate Number has n + 1 values in the range 1 to n. Read the array as a function, index to value. Because every value is between 1 and n, starting at index 0 never leaves the array, and since there are n + 1 slots pointing into n targets, two slots point to the same place. That place is the entry of a cycle. The code is the cycle-start algorithm with a[x] in place of x->next. It uses no extra space and does not modify the array, which are the two conditions of the problem.

Reorder List combines three list techniques: find the middle with fast and slow pointers, reverse the second half in place, and merge two lists by alternating. Each step is simple. The risk is in the joins, so cut the first half off (set its last next to null) before merging, and merge until the second half is exhausted.`,
        code: `// Find the Duplicate Number: nums has n + 1 values in 1..n, exactly one value repeats.
int findDuplicate(const vector<int>& nums) {
    int slow = nums[0], fast = nums[nums[0]];
    while (slow != fast) {
        slow = nums[slow];
        fast = nums[nums[fast]];
    }
    int entry = 0;
    while (entry != slow) {
        entry = nums[entry];
        slow = nums[slow];
    }
    return entry;
}

static ListNode* reverseTail(ListNode* head) {
    ListNode* prev = nullptr;
    while (head) {
        ListNode* nx = head->next;
        head->next = prev;
        prev = head;
        head = nx;
    }
    return prev;
}

// Reorder List: L0, L1, ..., Ln becomes L0, Ln, L1, Ln-1, ...
void reorderList(ListNode* head) {
    if (!head || !head->next) return;
    ListNode *slow = head, *fast = head;
    while (fast->next && fast->next->next) {  // stops on the first middle
        slow = slow->next;
        fast = fast->next->next;
    }
    ListNode* second = reverseTail(slow->next);
    slow->next = nullptr;                      // cut the first half off
    ListNode* first = head;
    while (second) {
        ListNode* a = first->next;
        ListNode* b = second->next;
        first->next = second;
        second->next = a;
        first = a;
        second = b;
    }
}

// Happy Number: the digit-square map is a function, so the same two-pointer idea applies.
static int digitSquares(int x) {
    int s = 0;
    for (; x > 0; x /= 10) s += (x % 10) * (x % 10);
    return s;
}
bool isHappy(int n) {
    int slow = n, fast = digitSquares(n);
    while (fast != 1 && slow != fast) {
        slow = digitSquares(slow);
        fast = digitSquares(digitSquares(fast));
    }
    return fast == 1;
}`,
      },
      {
        title: "Variants",
        body: `Cycle length. After the pointers meet, keep one still and walk the other until it returns; the number of steps is lambda. The length of the tail follows from the entry search: mu is the number of steps from the head to the entry.

Palindrome Linked List. Find the middle, reverse the second half, compare the halves, and (if you must leave the input unchanged) reverse it back. O(n) time, O(1) space.

Intersection of Two Linked Lists. Two pointers that walk list A then list B, and list B then list A, travel equal total distances and meet at the intersection or both reach null together. This is the same "equalise the gap" idea.

Remove N-th Node From End and its relatives. A pointer n steps ahead, then both move together. Use a dummy head so that removing the first node needs no special case.

Sequences that are functions. Happy Number, Find the Duplicate Number, and Circular Array Loop have no list at all, only a rule for the next value. Cycle detection works on any deterministic next function, which is also how Pollard's rho finds factors of integers.

Brent's variant. It moves a single pointer in power-of-two stretches and compares it against a saved position. It does fewer function evaluations than Floyd's version, which matters when the next function is expensive. It is rarely needed in interviews.

Hash set instead. Storing visited nodes is simpler and needs O(n) memory. Mention it first, then offer the constant-space version if asked.`,
      },
      {
        title: "Complexity",
        body: `Cycle detection runs in O(mu + lambda) time, which is O(n) in the length of the list, and O(1) extra space. The slow pointer enters the cycle after mu steps. After that the gap closes by one per step and starts below lambda, so the meeting happens within lambda more steps. The second phase takes mu steps. The total is a small constant times n.

Finding the middle takes n / 2 steps for the slow pointer, so O(n) time and O(1) space. Remove N-th From End makes a single pass of n steps plus the gap setup. Reorder List is three linear passes, still O(n) time and O(1) extra space, because the reversal is in place.

Compare with the hash set version: the same O(n) time but O(n) memory, and a hash set operation is slower than a pointer move. For tiny lists the set is fine. The pointer technique pays off for long lists and for problems that state a space limit.

Find the Duplicate Number deserves one extra sentence. Its competing solutions are sorting (O(n log n), modifies the array), a hash set (O(n) space), a counting binary search (O(n log n), O(1) space, read-only), and Floyd's cycle method (O(n), O(1), read-only). That last combination is why it is the standard answer.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Null checks. The loop condition must test fast and fast->next, in that order, before moving two steps. Testing only fast->next crashes on an empty list. Writing fast->next->next without checking fast->next crashes on odd lengths.

Comparing the wrong things. Compare node pointers, not values. Two different nodes can hold the same value and that is not a cycle.

Starting both pointers on the same node and checking equality before moving. If you test slow == fast right at the start you report a cycle for every list. Move first, then compare. The array version avoids this by starting fast one step ahead, which is the same thing.

Forgetting the second phase. Meeting inside the cycle only proves a cycle exists. The start of the cycle needs the reset-one-pointer-to-head step. Many wrong answers return the meeting node.

First or second middle. A palindrome check or Reorder List done with the wrong middle drops or duplicates a node in even-length lists. Test with lengths 1, 2, 3 and 4.

Cutting the list. After reversing the second half, the first half still ends in the old middle node, which now points into the reversed part. Set the cut next to null or the merge loop never ends.

Deleting the head. Without a dummy node, removing the first node needs a special branch. A dummy node removes it.

Edge cases to test: empty list, one node (with and without a self loop), two nodes, a cycle that includes the head, a cycle of length one, and the n-th from the end equal to the list length.`,
      },
      {
        title: "Practice order",
        body: `1. Linked List Cycle II (medium). Do it with a hash set first, then with the two-phase pointers, and write the proof of the second phase in your own words. If you can explain why the reset pointer meets the other one at the entry, the pattern is yours.
2. Find the Duplicate Number (medium). The same algorithm on an array, which tests whether you understand that the pattern is about a next function and not about nodes. Be ready to name the other solutions and why Floyd's wins under the problem's constraints.
3. Reorder List (medium). Three techniques in one problem: the middle, an in-place reversal, and an alternating merge. Draw each pointer change before coding it.

Before these, do Linked List Cycle, Middle of the Linked List and Remove Nth Node From End of List until the null checks are automatic. After them, try Palindrome Linked List and Happy Number, then move on to in-place reversal, which Reorder List already used.`,
      },
    ],
  },

  "list-reversal": {
    intro:
      "Reversing a linked list in place means rewiring next pointers so the list runs the other way, using O(1) extra memory. The whole pattern is one loop with three pointers, plus a careful way to splice the reversed piece back. It appears directly (reverse a whole list), on a sub-range (positions left to right), and in groups of k, and it is a building block for palindromes and for Reorder List.",
    sections: [
      {
        title: "The intuition",
        body: `A linked list is a chain of one-way arrows. To reverse it, turn every arrow around. The trouble is that once you turn the arrow out of a node, you lose the way to the node after it, so you must save that node first. That single observation is the whole algorithm: before changing a pointer, keep a handle on whatever it currently points to.

Think of three people holding hands in a line, each holding the next person's hand. To reverse the line, take one person at a time from the front: remember who they were holding, make them hold the person who is already reversed, then move on to the one you remembered. You always need to remember three things: the person you are turning (cur), the person who is already turned and now stands behind them (prev), and the person you will do next (the saved next).

The same three-pointer loop reverses a whole list, or a middle section of it. For a section, the only extra work is at the two ends: the node before the section must point to the new first node of the section, and the old first node, which is now the last, must point to whatever came after the section. Get those two joins right and the interior takes care of itself.

You reach for this pattern when a problem says "reverse", "in place", "without extra space", or "k at a time", and it is a part of many other list problems: to compare the two halves of a list, or to interleave them, you first reverse one half.`,
        diagram: `flowchart LR
    P["prev: already reversed part"] --> C["cur: node being turned"]
    C --> N["next: saved before turning"]
    C -.->|"cur.next = prev"| P
    N -.->|"becomes cur"| C`,
        diagramCaption: "One step: save next, point cur back at prev, then slide prev and cur one node forward.",
      },
      {
        title: "Why it works",
        body: `Use a loop invariant. At the start of every iteration, prev is the head of a correctly reversed list made of the nodes already processed, and cur is the head of the untouched remainder. Nothing else is reachable from the pointers we hold, and every original node is in exactly one of the two lists.

Initially prev is null (the reversed part is empty) and cur is the head (the remainder is the whole list). The invariant holds.

One iteration saves cur's next, which is the head of the rest of the remainder. It then points cur at prev. Now cur is the head of a reversed list that is the old reversed part with one more node in front. That is exactly what prev should be next, so prev becomes cur, and cur becomes the saved next. The invariant holds again, and the remainder is one node shorter, so the loop makes progress.

When cur is null the remainder is empty, so prev is the head of the full reversed list. That is the return value.

For a sub-range, the same argument works on the range, with the two outer joins added. Let before be the node preceding the range and after be the node following it. Run the loop for exactly right - left + 1 nodes, starting with prev set to after rather than null. Then the new last node of the range already points at after, which saves the second join, and the only remaining step is before->next = prev (the new first node). For groups of k, the same range reversal is applied to each block in turn, and it is skipped for the final block if fewer than k nodes remain.`,
      },
      {
        title: "A worked example",
        body: `Reverse 1, 2, 3, 4, 5 with prev = null and cur = node 1.
Iteration 1: save next = 2. 1 now points to null. prev = 1, cur = 2.
Iteration 2: save next = 3. 2 points to 1. prev = 2, cur = 3.
Iteration 3: save next = 4. 3 points to 2. prev = 3, cur = 4.
Iteration 4: save next = 5. 4 points to 3. prev = 4, cur = 5.
Iteration 5: save next = null. 5 points to 4. prev = 5, cur = null. Done: 5, 4, 3, 2, 1.

Reverse Linked List II on 1, 2, 3, 4, 5 with left = 2 and right = 4 expects 1, 4, 3, 2, 5. Use the move-to-front technique: let before be node 1 and cur be node 2 (the node that will end up last in the range). Repeat right - left = 2 times: take the node after cur and move it right after before.
Round 1: the node after cur is 3. cur (2) now points to 4. 3 points to 2. before points to 3. List: 1, 3, 2, 4, 5.
Round 2: the node after cur (2) is 4. cur now points to 5. 4 points to 3. before points to 4. List: 1, 4, 3, 2, 5. Correct.

Reverse Nodes in k-Group with k = 3 on 1, 2, 3, 4, 5. First check that three nodes exist from the group start: yes (1, 2, 3). Reverse them, giving 3, 2, 1, and link the old first node 1 to the next group start, node 4. The second group has only 4, 5, which is fewer than 3 nodes, so it stays unchanged. Result: 3, 2, 1, 4, 5. With k = 2 the result is 2, 1, 4, 3, 5: two full groups and the lone 5 left as it is.`,
      },
      {
        title: "Implementation",
        body: `The iterative whole-list reversal is the one to know cold. The recursive version is shorter and shows the structure well, but it uses O(n) stack, and a list of a million nodes will overflow it, so mention that if you write it.

For the sub-range, a dummy node in front of the head removes the special case where left is 1 and the head itself changes. The move-to-front loop below does not need a separate reversal loop: each round lifts one node out of the range and drops it directly after the node before the range.`,
        code: `struct ListNode {
    int val;
    ListNode* next;
    explicit ListNode(int v) : val(v), next(nullptr) {}
};

// Iterative reversal of the whole list.
ListNode* reverseList(ListNode* head) {
    ListNode* prev = nullptr;
    while (head) {
        ListNode* nx = head->next;  // save the way forward
        head->next = prev;          // turn the arrow around
        prev = head;
        head = nx;
    }
    return prev;
}

// Recursive version: reverse the rest, then hang the head at the end of it.
ListNode* reverseListRec(ListNode* head) {
    if (!head || !head->next) return head;
    ListNode* newHead = reverseListRec(head->next);
    head->next->next = head;
    head->next = nullptr;
    return newHead;
}

// Reverse positions left..right (1-based, left <= right).
ListNode* reverseBetween(ListNode* head, int left, int right) {
    ListNode dummy(0);
    dummy.next = head;
    ListNode* before = &dummy;
    for (int i = 1; i < left; i++) before = before->next;
    ListNode* cur = before->next;  // will end up as the last node of the range
    for (int i = 0; i < right - left; i++) {
        ListNode* moved = cur->next;
        cur->next = moved->next;      // unlink moved
        moved->next = before->next;   // put it in front of the range
        before->next = moved;
    }
    return dummy.next;
}`,
      },
      {
        title: "Implementation: groups of k",
        body: `Reverse Nodes in k-Group is the same range reversal done repeatedly, with a safety check that k nodes are really there before touching anything. Write it as a loop over groups.

For each group: walk k steps from the node before the group to find the last node of the group, called kth. If the walk hits null, fewer than k nodes remain and we stop without changing them. Otherwise remember the node after the group, reverse the group with prev initially set to that node, and reconnect: the node before the group now points to kth, and the old first node of the group (now its last) becomes the new node before the next group.

Swap Nodes in Pairs is the special case k = 2, and a simple recursive version is also a valid answer to it.`,
        code: `ListNode* reverseKGroup(ListNode* head, int k) {
    ListNode dummy(0);
    dummy.next = head;
    ListNode* groupPrev = &dummy;
    while (true) {
        ListNode* kth = groupPrev;
        for (int i = 0; i < k && kth; i++) kth = kth->next;
        if (!kth) break;                       // fewer than k nodes left: keep them as they are
        ListNode* groupNext = kth->next;
        ListNode* prev = groupNext;            // the new last node will point past the group
        ListNode* cur = groupPrev->next;
        while (cur != groupNext) {
            ListNode* nx = cur->next;
            cur->next = prev;
            prev = cur;
            cur = nx;
        }
        ListNode* oldFirst = groupPrev->next;  // now the last node of the reversed group
        groupPrev->next = kth;                 // kth is the new first node
        groupPrev = oldFirst;
    }
    return dummy.next;
}

// Swap Nodes in Pairs: k = 2.
ListNode* swapPairs(ListNode* head) {
    if (!head || !head->next) return head;
    ListNode* second = head->next;
    head->next = swapPairs(second->next);
    second->next = head;
    return second;
}

// Palindrome check: reverse the second half, compare, put it back.
bool isPalindromeList(ListNode* head) {
    if (!head || !head->next) return true;
    ListNode *slow = head, *fast = head;
    while (fast->next && fast->next->next) {
        slow = slow->next;
        fast = fast->next->next;
    }
    ListNode* second = reverseList(slow->next);
    ListNode *a = head, *b = second;
    bool ok = true;
    while (b) {
        if (a->val != b->val) { ok = false; break; }
        a = a->next;
        b = b->next;
    }
    slow->next = reverseList(second);  // restore the input
    return ok;
}`,
      },
      {
        title: "Variants",
        body: `Whole list. The iterative loop is the answer, and the recursive version is a good second way to explain it.

Sub-range. Reverse Linked List II. Two equivalent techniques: the move-to-front loop used above, or cutting the range out, reversing it as a whole list, and sewing both ends back. The first keeps the pointer updates local.

Groups of k. Reverse Nodes in k-Group. A variant reverses alternate groups, or reverses the leftover group too (then skip the length check and reverse whatever remains).

Pairs. Swap Nodes in Pairs, with the recursive form being three lines.

Halves. Palindrome Linked List and Reorder List reverse the second half after finding the middle with fast and slow pointers.

Add Two Numbers II. The digits arrive most significant first. Reverse both lists, add as in the easy version, reverse the result. A stack is the alternative when the inputs may not be changed.

Rotate List. Not a reversal, but it uses the same cut-and-reconnect thinking: find the new tail with a gap pointer, cut, and join the old tail to the old head.

Doubly linked lists. Reversal swaps next and prev on every node and then swaps head and tail. Because the previous pointer is already there, no saved-next trick is needed for the walk, though the swap still has to be done before moving on.`,
      },
      {
        title: "Complexity",
        body: `Reversing the whole list visits each node once: O(n) time, O(1) extra space for the iterative form. The recursive form is O(n) time but O(n) stack depth, which is a real limit for long lists.

The sub-range version walks left - 1 steps to find the node before the range and then does right - left rounds of constant work: O(right) time, at most O(n), and O(1) space.

The k-group version looks like it might be quadratic because each group first walks k steps to check its length and then walks k steps to reverse. That is two passes of k over each group, so about 2n steps in total across all groups. The time is O(n) and space is O(1).

Palindrome check: finding the middle is n / 2 steps, reversing half is n / 2 steps, comparing is n / 2 steps, and restoring is n / 2 steps. Still O(n) and O(1) space, in contrast to the O(n) memory of copying the values into an array. The array copy is much simpler to write, and is a fine answer when memory is not constrained and the interviewer has not asked for in-place.

All of these assume the usual cost model where following one pointer is O(1). They do not need random access, which is the reason to prefer linked-list techniques over indexing.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Losing the rest of the list. Writing cur->next = prev before saving cur->next throws the tail away. Save first. This is the most common mistake and the quickest to fix.

Forgetting to return prev. After the loop cur is null. The new head is prev.

Not cutting the old head. In the simple loop the old head points to null after the first iteration, so the result ends correctly. In range and half reversals, a node that used to be in the middle can keep pointing into the old order and make a cycle. Draw the final pointers of the two boundary nodes and check each one.

Using the head directly in range problems. When left is 1 the head changes. Use a dummy node whose next is the head and return dummy.next.

Off-by-one in the range. The move-to-front loop runs right - left times, not right - left + 1, because the first node of the range is already in place at the end.

Groups with fewer than k nodes. Check that k nodes exist before reversing, or you reverse a short tail by mistake. Walk the check separately from the reversal.

Recursion depth. A recursive reversal of a very long list overflows the stack. Prefer the loop unless the list is known to be short.

Edge cases to test: empty list, one node, two nodes, left equal to right (nothing changes), left = 1, right = n, k = 1 (nothing changes), k equal to the length, and k larger than the length.`,
      },
      {
        title: "Practice order",
        body: `1. Reverse Linked List II (medium). Write the move-to-front loop and then draw the list after each round. This is the foundation for everything else here, and a dummy head is part of the answer.
2. Reverse Nodes in k-Group (hard). Reuse the reversal loop on each block, check for k nodes first, and keep the join pointers straight. If you can trace k = 3 on five nodes by hand, you have it.

Before these, do Reverse Linked List both iteratively and recursively, and Swap Nodes in Pairs. After them, solve Palindrome Linked List and Reorder List (the latter is in the fast and slow pointer article, and it uses a reversal).`,
      },
    ],
  },

  "monotonic-stack": {
    intro:
      "A monotonic stack keeps its contents in sorted order while you scan an array, popping any element that can no longer be the answer to anything. It answers questions like the next greater element, the previous smaller element, spans, and the largest rectangle in a histogram in a single pass. Each element is pushed once and popped once, so the total work is O(n) even though there is a loop inside the loop.",
    sections: [
      {
        title: "The intuition",
        body: `Many problems ask, for every element, about the nearest element on one side that is bigger or smaller: how many days until a warmer temperature, how far back is the last higher price, how wide can a bar stretch before meeting a shorter one. The direct way is to scan outward from each element, which is O(n) per element and O(n squared) overall.

The monotonic stack avoids the rescanning with one observation. Suppose you walk the array from left to right and want each element's next greater element. While you have not yet seen the answer for an element, that element is waiting. Elements that are waiting form a stack, and they have a nice property: from bottom to top, their values are non-increasing. Why? If a newer element were larger than one below it, it would have already settled that older one, because it is the next greater element for it. So anything still waiting is at least as large as everything pushed after it.

When a new value x arrives, it is the answer for every waiting element smaller than x. Those are exactly the elements on top of the stack, so pop them while they are smaller, record the answer for each, and then push x. The stack stays sorted by construction.

That is the pattern: a stack that keeps a sorted order by popping the elements that the new one makes obsolete, and the popped elements are the ones whose question has just been answered. Flip the comparison for next smaller, scan from the right for the previous element, and the same shape handles all four variants.`,
        diagram: `flowchart TD
    A["Read next element x"] --> B{"Stack not empty and top is smaller than x?"}
    B -- yes --> C["Pop top: x is its next greater element"]
    C --> B
    B -- no --> D["Push x"]
    D --> E{"More elements?"}
    E -- yes --> A
    E -- no --> F["Whatever is left has no greater element"]`,
        diagramCaption: "Next greater element with a stack that holds values in non-increasing order from bottom to top.",
      },
      {
        title: "Why it works",
        body: `Correctness has two halves. First, every popped element gets the right answer. An element e sits on the stack until some later element x is larger than it, and that is the first moment this happens: if an earlier element y between them had been larger than e, then y would have popped e earlier. So x is the first element to the right of e that is greater than e, which is exactly its next greater element. Elements still on the stack at the end never met a larger one, so they have no answer.

Second, no useful element is discarded early. An element is popped only when it has received its answer, and it will never be needed again as a candidate for anything else, because any later element that would have used it as a barrier is stopped by x, which is at least as large. For the histogram problem this reads as: a bar that has been popped cannot limit anything further right, since the bar that popped it is shorter or equal and gets to limit instead.

Now the cost. It looks like a while loop inside a for loop, which suggests O(n squared). But each index is pushed exactly once and popped at most once. The total number of pops over the whole run is at most n, so the inner loop's total work across all iterations is at most n. Add the n pushes and the total is at most 2n operations. This is called an amortised argument: a single iteration may do many pops, but the total is bounded by the number of pushes. It is the same counting idea as in the sliding window and the deque.

For sums of subarray minimums the same facts give a counting argument. The element a[i] is the minimum of exactly the subarrays that start after the previous smaller element and end before the next smaller one, so its contribution is a[i] times the product of the two gap lengths.`,
      },
      {
        title: "A worked example",
        body: `Daily Temperatures on [73, 74, 75, 71, 69, 72, 76, 73]: for each day, how many days until a warmer one, or 0. The stack holds indices whose answers are still pending.
i = 0 (73): stack empty, push. Stack [0].
i = 1 (74): 74 > 73, pop 0, answer[0] = 1 - 0 = 1. Push 1. Stack [1].
i = 2 (75): 75 > 74, pop 1, answer[1] = 1. Push 2. Stack [2].
i = 3 (71): 71 < 75, push. Stack [2, 3].
i = 4 (69): push. Stack [2, 3, 4].
i = 5 (72): 72 > 69, pop 4, answer[4] = 1. 72 > 71, pop 3, answer[3] = 2. 72 < 75, stop. Push 5. Stack [2, 5].
i = 6 (76): pop 5, answer[5] = 1. Pop 2, answer[2] = 4. Push 6. Stack [6].
i = 7 (73): 73 < 76, push. Stack [6, 7].
The remaining indices 6 and 7 stay at 0. Answers: [1, 1, 4, 2, 1, 1, 0, 0].

Largest Rectangle in Histogram on [2, 1, 5, 6, 2, 3]. Here the stack holds indices of increasing heights, and a bar's rectangle is computed when it is popped: its height is that bar, its right edge is the current index (exclusive), and its left edge is the index below it on the stack (exclusive), or the start when the stack is empty.
i = 0 (2): push. [0].
i = 1 (1): pop 0 (height 2), stack empty so width = 1, area 2. Push 1. [1].
i = 2 (5): push. [1, 2]. i = 3 (6): push. [1, 2, 3].
i = 4 (2): pop 3 (height 6), left is index 2, width = 4 - 2 - 1 = 1, area 6. Pop 2 (height 5), left is index 1, width = 4 - 1 - 1 = 2, area 10. Top is index 1 (height 1) which is smaller, so push 4. [1, 4].
i = 5 (3): push. [1, 4, 5].
End, with a virtual height 0 at index 6: pop 5 (height 3), left 4, width 1, area 3. Pop 4 (height 2), left 1, width 4, area 8. Pop 1 (height 1), stack empty, width 6, area 6.
The largest area is 10 (the bars 5 and 6 at height 5).`,
      },
      {
        title: "Implementation",
        body: `The template stores indices, not values, so that you can compute distances and widths, and can read the value as a[index]. Which comparison to use decides the variant: pop while the top is smaller than the new element for next greater, pop while it is larger for next smaller. For the previous element, you can either scan from the right or read it off the stack as the element below the one you are pushing, which is what the histogram code does.

The histogram code appends a sentinel height of 0 at the end so that every bar is popped before the loop ends, and no clean-up loop is needed. Because heights are non-negative, the sentinel is smaller than or equal to every real bar and forces the stack to empty.`,
        code: `// Daily Temperatures: days until a strictly warmer temperature, else 0.
vector<int> dailyTemperatures(const vector<int>& t) {
    int n = (int)t.size();
    vector<int> answer(n, 0);
    vector<int> st;  // indices, temperatures non-increasing from bottom to top
    for (int i = 0; i < n; i++) {
        while (!st.empty() && t[st.back()] < t[i]) {
            answer[st.back()] = i - st.back();
            st.pop_back();
        }
        st.push_back(i);
    }
    return answer;
}

// Largest Rectangle in Histogram.
int largestRectangleArea(vector<int> h) {
    h.push_back(0);  // sentinel: pops everything at the end
    vector<int> st;  // indices, heights increasing from bottom to top
    int best = 0;
    for (int i = 0; i < (int)h.size(); i++) {
        while (!st.empty() && h[st.back()] >= h[i]) {
            int height = h[st.back()];
            st.pop_back();
            int left = st.empty() ? -1 : st.back();  // nearest smaller bar on the left
            best = max(best, height * (i - left - 1));
        }
        st.push_back(i);
    }
    return best;
}`,
      },
      {
        title: "Implementation: counting contributions and spans",
        body: `Sum of Subarray Minimums asks for the sum of min(subarray) over all subarrays. Instead of enumerating subarrays, ask for each element how many subarrays it is the minimum of. For a[i] that is the number of choices of a start times the number of choices of an end. Let left be the index of the previous element strictly smaller than a[i] (or -1) and right the index of the next element smaller than or equal to a[i] (or n). Starts can be any of left + 1 through i, so there are i - left choices, and ends any of i through right - 1, so there are right - i choices. The asymmetry, strictly on one side and non-strictly on the other, assigns each subarray with equal minimums to exactly one element so nothing is counted twice.

Online Stock Span is the streaming version. Keep a stack of pairs (price, span) and, for each new price, absorb the spans of all smaller or equal prices on top into the new span.`,
        code: `// Sum of Subarray Minimums, modulo 1e9 + 7.
int sumSubarrayMins(const vector<int>& a) {
    const long long MOD = 1000000007LL;
    int n = (int)a.size();
    vector<int> left(n), right(n);
    vector<int> st;
    for (int i = 0; i < n; i++) {  // previous strictly smaller
        while (!st.empty() && a[st.back()] >= a[i]) st.pop_back();
        left[i] = st.empty() ? -1 : st.back();
        st.push_back(i);
    }
    st.clear();
    for (int i = n - 1; i >= 0; i--) {  // next smaller or equal
        while (!st.empty() && a[st.back()] > a[i]) st.pop_back();
        right[i] = st.empty() ? n : st.back();
        st.push_back(i);
    }
    long long total = 0;
    for (int i = 0; i < n; i++) {
        long long ways = (long long)(i - left[i]) * (right[i] - i) % MOD;
        total = (total + a[i] * ways) % MOD;
    }
    return (int)total;
}

// Online Stock Span.
class StockSpanner {
    vector<pair<int, int>> st;  // (price, span), prices strictly decreasing from bottom to top
public:
    int next(int price) {
        int span = 1;
        while (!st.empty() && st.back().first <= price) {
            span += st.back().second;
            st.pop_back();
        }
        st.push_back({price, span});
        return span;
    }
};`,
      },
      {
        title: "Variants",
        body: `Next greater, next smaller, previous greater, previous smaller. Four combinations of comparison and direction. Pick the comparison from what you pop, and the direction from where the answer lies. Next Greater Element I and II belong here; the second is circular, handled by looping over indices 0 to 2n - 1 and using i mod n.

Spans and distances. Daily Temperatures and Online Stock Span store indices or accumulated spans.

Rectangles. Largest Rectangle in Histogram is the base case. Maximal Rectangle in a binary matrix builds a histogram of heights row by row and runs the same routine on each row.

Contribution counting. Sum of Subarray Minimums, Sum of Subarray Ranges and Sum of Total Strength of Wizards count how many subarrays each element decides. Always use a strict comparison on one side and a non-strict one on the other to handle ties.

Lexicographic minimum by deleting. Remove K Digits and Remove Duplicate Letters use the stack to drop a previous element when a smaller one arrives, as long as the budget allows. The stack is monotone and the pop condition has an extra clause about how many removals remain.

Trapping Rain Water has a stack solution that pops a bar when a taller one closes a basin. The two-pointer solution is shorter, but the stack solution is a good test of understanding.

Stack of values versus stack of indices. Use values when only comparisons matter and indices when you need a distance or a width.`,
      },
      {
        title: "Complexity",
        body: `Time is O(n) for every problem above. The justification is the amortised argument: each element is pushed once and popped at most once, so the total number of stack operations is at most 2n, whatever the shape of the input. A sorted input makes every pop happen in one iteration at the very end, or never, while a worst-case input for a single step can pop n - 1 elements in one iteration. Those two cannot happen at the same time, which is the point.

Space is O(n) in the worst case, for the stack and for the answer array. A strictly decreasing input for next greater keeps every index on the stack at once. For Sum of Subarray Minimums as written, there are two extra arrays of size n. They can be merged into a single pass that computes both sides when an element is popped, at the cost of a little more care.

Compare with the brute-force approaches. Scanning outward from every element is O(n squared) in the worst case. A segment tree or a sparse table with binary search gives O(n log n), more code, and nothing the stack does not do for these problems. When the problem asks about an arbitrary range rather than the nearest element, the stack is the wrong tool and a segment tree is the right one.

Online Stock Span has amortised O(1) per call, but a single call can take O(n). If the problem demands a worst-case bound per call, say so; it is rarely required.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Strict versus non-strict comparisons. Daily Temperatures wants a strictly warmer day, so pop while the top is strictly smaller. Histogram popping with greater-or-equal merges equal bars, which is fine because the last of equal bars computes the full width. For counting problems the choice decides whether equal elements are counted once or twice. Test with all elements equal.

Storing values when you needed indices. A width or a distance needs positions. Store indices and read values through them.

Forgetting what is left on the stack. For next greater, the leftover elements have no answer and keep the default (0 or -1). For histograms the leftover bars extend to the end, which the sentinel handles. Without the sentinel, process the stack after the loop with the right edge equal to n.

Computing the left edge incorrectly. After popping, the left boundary of the rectangle is the new top of the stack, not the popped index. If the stack is empty the rectangle reaches the start, so the width uses -1 as the left boundary.

Overflow. Sums of subarray minimums and areas can exceed 32 bits. Use long long and reduce modulo as the problem states.

Circular arrays. Iterate twice over the array, but only push in the first pass or you will answer some indices twice.

Edge cases to test: empty input, one element, strictly increasing, strictly decreasing, all equal, a single valley, and a single peak.`,
      },
      {
        title: "Practice order",
        body: `1. Daily Temperatures (medium). The cleanest next-greater problem. Trace the stack on paper for the example in this article until the pops feel obvious.
2. Online Stock Span (medium). The same idea over a stream, with spans accumulated on the stack. Check that you can say why each call is amortised O(1).
3. Largest Rectangle in Histogram (hard). The classic. Make sure you can explain the width formula (the right edge is the current index, the left edge is the element below on the stack) before looking at code.
4. Sum of Subarray Minimums (medium). The contribution-counting version. Work out the tie-breaking rule on [2, 2] by hand.

Before these, solve Next Greater Element I and Valid Parentheses to get used to stack mechanics. After them, Maximal Rectangle, Trapping Rain Water and Remove K Digits are the natural next problems.`,
      },
    ],
  },

  "monotonic-deque": {
    intro:
      "A monotonic deque is a monotonic stack that you can also pop from the front. That second end lets elements expire as a window slides forward, so it answers the minimum or maximum of every window of size k in O(n) total, and it also supports DP transitions that take the best value over a sliding range of earlier states. Use it when a window both moves and has to report an extreme value.",
    sections: [
      {
        title: "The intuition",
        body: `Take the problem of the maximum in every window of k consecutive numbers. A heap works, but old elements have to be removed lazily and each operation costs a logarithm. Scanning each window costs O(n * k). A monotonic deque does it in O(n).

Look at a window and ask which elements could ever become its maximum. Suppose a later element is at least as large as an earlier one in the same window. The earlier one can never be the maximum again: the later one is bigger, and it also stays in the window longer, because the window slides right and drops the oldest elements first. So the earlier element is useless and can be thrown away at once.

What remains is a list in which each element is larger than everything after it, which is a decreasing sequence from front to back. Its front is the maximum of the window. That list is the deque. New elements join at the back after removing everything smaller than them. Old elements leave from the front when they slide out of the window. The two ends of the deque do the two jobs: the back keeps the order, the front handles expiry.

The shape of the problem to look for is a window that moves in one direction, with a query for a minimum or maximum, or a transition of the form "best of the previous k states". If the window can also shrink from the right, or if you need a median or a k-th value, a deque is not enough.`,
        diagram: `flowchart LR
    A["Front: oldest, largest"] --> B["..."]
    B --> C["Back: newest, smallest"]
    D["New element x"] -->|"pop back while back is not larger than x"| C
    E["Window moves right"] -->|"pop front when its index leaves the window"| A`,
        diagramCaption: "The deque holds indices whose values decrease from front to back. Expiry happens at the front, order is kept at the back.",
      },
      {
        title: "Why it works",
        body: `Two invariants hold after processing index i. First, the deque holds indices in increasing order and their values are strictly decreasing from front to back. Second, the deque contains every index in the current window that could still be the maximum of this window or of a later one, which means every window element that is greater than all elements after it.

Why dropping the others is safe is the argument from the intuition. An element a[j] with a later a[i] greater than or equal to it in the same window can never be a maximum again. Window membership depends on the index, and i is later than j, so i leaves the window after j does. For as long as j is in a window, i is in it too (once i has arrived), and a[i] is at least as large.

The front is the maximum. The indices are in increasing order, so the front is the oldest remaining index, and values are decreasing, so the front has the largest value among the candidates. Every window element that is not a candidate was dropped because something larger and later covered it. So the front is the window maximum. To keep it inside the window, pop the front while its index is less than i - k + 1.

The cost is amortised. Every index is added once and removed once, from either the back (dominated) or the front (expired). A single step may pop several elements, but the total number of removals cannot exceed n. So the whole sweep takes O(n).

For the minimum, flip the comparison, so that values increase from front to back. For the Shortest Subarray with Sum at Least K problem the reasoning is about prefix sums instead of values, and is covered in the worked example.`,
      },
      {
        title: "A worked example",
        body: `Sliding Window Maximum on [1, 3, -1, -3, 5, 3, 6, 7] with k = 3. The deque holds indices; values are in brackets.
i = 0 (1): deque empty, push. [0].
i = 1 (3): 1 <= 3, pop back 0. Push 1. [1].
i = 2 (-1): -1 < 3, push. [1, 2]. The window 0..2 is complete. Maximum is a[1] = 3.
i = 3 (-3): push. [1, 2, 3]. Front index 1 is still in the window 1..3. Maximum 3.
i = 4 (5): pop back 3, 2, 1 since each is at most 5. Push 4. [4]. Window 2..4, maximum 5.
i = 5 (3): push. [4, 5]. Maximum 5.
i = 6 (6): pop back 5 and 4. Push 6. [6]. Maximum 6.
i = 7 (7): pop 6. Push 7. [7]. Maximum 7.
Output: [3, 3, 5, 5, 6, 7].

An example where the front expires: [4, 3, 2, 1] with k = 3. After i = 2 the deque is [0, 1, 2] and the maximum is a[0] = 4. At i = 3 the window is 1..3, so index 0 is out of range and is popped from the front. Push 3. The deque is [1, 2, 3], and the maximum is a[1] = 3. Output [4, 3].

Shortest Subarray with Sum at Least K, on [2, -1, 2] with K = 3. Negative numbers rule out an ordinary window, so use prefix sums P = [0, 2, 1, 3] and look for the closest pair i < j with P[j] - P[i] >= K. Keep a deque of indices with increasing prefix values.
j = 0: deque [0].
j = 1 (P = 2): 2 - P[0] = 2 < 3. Back P[0] = 0 is below 2, so just push. [0, 1].
j = 2 (P = 1): 1 - 0 = 1 < 3. The back has P[1] = 2 >= 1, so pop it (a later index with a smaller prefix is a better start). Push 2. [0, 2].
j = 3 (P = 3): 3 - P[0] = 3 >= 3, so record length 3 - 0 = 3, and pop the front, since any later j would only give a longer subarray with that start. Next 3 - P[2] = 2 < 3, stop. Push 3. [2, 3].
Answer: 3.`,
      },
      {
        title: "Implementation",
        body: `The maximum version stores indices in a std::deque. For each i: drop expired indices from the front, drop dominated indices from the back, push i, and once i >= k - 1 report the front. Dropping expired first or dominated first does not change the result; the order shown keeps the deque size smallest.

Storing indices rather than values is what makes expiry possible, because the index tells you whether the element is still inside the window. Values are read back through the array.`,
        code: `// Sliding Window Maximum.
vector<int> maxSlidingWindow(const vector<int>& a, int k) {
    deque<int> dq;  // indices, a[] decreasing from front to back
    vector<int> out;
    for (int i = 0; i < (int)a.size(); i++) {
        if (!dq.empty() && dq.front() <= i - k) dq.pop_front();        // left the window
        while (!dq.empty() && a[dq.back()] <= a[i]) dq.pop_back();     // dominated by a[i]
        dq.push_back(i);
        if (i >= k - 1) out.push_back(a[dq.front()]);
    }
    return out;
}

// Same thing for the minimum: the comparison flips.
vector<int> minSlidingWindow(const vector<int>& a, int k) {
    deque<int> dq;  // a[] increasing from front to back
    vector<int> out;
    for (int i = 0; i < (int)a.size(); i++) {
        if (!dq.empty() && dq.front() <= i - k) dq.pop_front();
        while (!dq.empty() && a[dq.back()] >= a[i]) dq.pop_back();
        dq.push_back(i);
        if (i >= k - 1) out.push_back(a[dq.front()]);
    }
    return out;
}`,
      },
      {
        title: "Implementation: prefix sums with negatives, and DP over a window",
        body: `Shortest Subarray with Sum at Least K combines prefix sums with a deque, because with negative numbers the ordinary shrinking window is not valid (removing an element from the left can increase the sum). Use prefix sums P with P[0] = 0 and ask for the smallest j - i with P[j] - P[i] >= K. The deque holds indices with increasing P. Two rules keep it correct. Pop from the front while P[j] - P[front] >= K, recording the length, because a later j will only produce longer subarrays with that start. Pop from the back while P[back] >= P[j], because j is later and has a smaller or equal prefix, so it is at least as good a start for everything to come.

The same container speeds up DP that has the form dp[i] = a[i] + the best of dp[i - k..i - 1]. Jump Game VI is an example. Computing the best of the last k states by scanning is O(k) per step, and the deque brings it to amortised O(1).`,
        code: `// Shortest Subarray with Sum at Least K (the array may contain negative numbers).
int shortestSubarray(const vector<int>& a, long long K) {
    int n = (int)a.size();
    vector<long long> P(n + 1, 0);
    for (int i = 0; i < n; i++) P[i + 1] = P[i] + a[i];
    deque<int> dq;  // indices with increasing prefix sums
    int best = n + 1;
    for (int j = 0; j <= n; j++) {
        while (!dq.empty() && P[j] - P[dq.front()] >= K) {
            best = min(best, j - dq.front());
            dq.pop_front();
        }
        while (!dq.empty() && P[dq.back()] >= P[j]) dq.pop_back();
        dq.push_back(j);
    }
    return best == n + 1 ? -1 : best;
}

// Jump Game VI: from i you can jump to i+1..i+k, collect a[i] on every landing, maximise the total at the end.
int maxResult(const vector<int>& a, int k) {
    int n = (int)a.size();
    vector<int> dp(n);
    deque<int> dq;  // indices, dp[] decreasing from front to back
    dp[0] = a[0];
    dq.push_back(0);
    for (int i = 1; i < n; i++) {
        while (!dq.empty() && dq.front() < i - k) dq.pop_front();
        dp[i] = a[i] + dp[dq.front()];
        while (!dq.empty() && dp[dq.back()] <= dp[i]) dq.pop_back();
        dq.push_back(i);
    }
    return dp[n - 1];
}`,
      },
      {
        title: "Variants",
        body: `Minimum and maximum windows. Sliding Window Maximum and Minimum differ only by the comparison. If you need both, keep two deques.

Longest subarray with a bounded range. Longest Continuous Subarray With Absolute Diff Less Than or Equal to Limit keeps a max deque and a min deque over a two-pointer window and shrinks from the left while max - min exceeds the limit. This pairs the deque with the sliding window article.

Prefix sums with negatives. Shortest Subarray with Sum at Least K as above. Related: the longest subarray with sum at most K when negatives are allowed needs a similar structure.

DP optimisation. Jump Game VI, Constrained Subsequence Sum and Maximum Number of Points with Cost use a window maximum over earlier DP values. Whenever a transition says "best over the last k states", think of the deque.

Fixed versus variable window. For fixed size k the front expires by index. For a variable window driven by two pointers, expire elements whose index is below the left pointer.

Min stack and queue with min. A related structure is a queue that supports get-min in O(1): keep a deque of candidate minimums beside the queue. Max Queue problems use the same trick.

Not for medians or the k-th value. Those need two heaps or an ordered set, covered in the two heaps article.`,
      },
      {
        title: "Complexity",
        body: `Time is O(n) for a single pass: each index enters the deque once and leaves once, either from the back when dominated or from the front when expired. A step may remove many elements, but the total number of removals cannot be more than the total number of insertions, which is n. That is the amortised argument from the monotonic stack, with a second exit at the front.

Space is O(k) for the deque in sliding window problems, because the deque never holds more indices than the window, plus O(n - k + 1) for the output. In the prefix sum version the deque can reach O(n) and the prefix array is O(n).

Compare with other approaches. Scanning each window is O(n * k). A max-heap with lazy deletion is O(n log n): each index is pushed once, and stale tops are popped when they surface. A balanced tree or a multiset is also O(n log n). A sparse table answers any range query in O(1) after an O(n log n) build, which is overkill for windows that only move right. Another well-known O(n) approach splits the array into blocks of size k and uses prefix and suffix maxima, which is easy to get right and a good second solution to know.

The deque is the best choice when the window moves in one direction and the query is the extreme value. It is the wrong choice when you need the window median, or a different statistic, or random queries.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Storing values instead of indices. You cannot tell whether a stored value has left the window. Keep indices.

The expiry test. For indices 0-based and a window of size k ending at i, the window is i - k + 1 through i. Index j is expired when j <= i - k, or equivalently when j < i - k + 1. An off-by-one here shows up as a window that is one element too long or too short. Check with k = 1, where every window has one element and the deque should always be exactly [i].

Strict versus non-strict domination. Popping while a[back] <= a[i] keeps only the newest of equal values, which is correct for the maximum because the newest stays longest. Popping only on strictly smaller also works but leaves duplicates in the deque. Either is fine as long as you are consistent.

Reporting before the first window is full. Only output once i >= k - 1.

Prefix sums and overflow. Prefix sums of a large array need long long. K itself can be large.

Using the shrinking-window technique with negatives. A plain two-pointer window fails when numbers can be negative because the sum is not monotone in the window size. That is the reason for the prefix-sum deque.

Wrong pop order in the prefix-sum version. Pop the front first while the condition is met, then pop the back for domination, then push. Swapping them can drop a valid start.

Edge cases to test: k = 1, k equal to the array length, k larger than the array length (handle it or reject it), all equal elements, strictly increasing, strictly decreasing, and negative numbers.`,
      },
      {
        title: "Practice order",
        body: `1. Sliding Window Maximum (hard). The reference problem. Do the example in this article by hand, then write the code from memory. Solve it once with a heap to feel the difference.
2. Shortest Subarray with Sum at Least K (hard). The prefix-sum version. First convince yourself that an ordinary two-pointer window fails on a small input with a negative number, then derive the two popping rules in your own words.

Before these, finish the monotonic stack article, since the deque is that idea with a second exit. After them, try Longest Continuous Subarray With Absolute Diff Less Than or Equal to Limit, Jump Game VI and Constrained Subsequence Sum for the DP flavour.`,
      },
    ],
  },
};
