import type { PatternArticle } from "./types";

// Full pattern articles, group "Lists, stacks, heaps" (plan 0008, batch 3), second half. Format and rules: plan 0007.
// Code is C++17. Blocks of one article are concatenated and compiled together, so helper names are unique per article.

export const DSA_ARTICLES_D2: Record<string, PatternArticle> = {
  "stack-parsing": {
    intro:
      "A stack is the natural tool for anything nested or anything that must be undone in reverse order: matching brackets, evaluating expressions with precedence and parentheses, decoding strings like 3[a2[c]]. Each of these has the same shape. You read left to right, you meet something that opens a new level or defers a decision, you park the current state on the stack, and later you pop it and combine it with what you have computed since.",
    sections: [
      {
        title: "The intuition",
        body: `Brackets are the simplest case. In the text ( [ { } ] ), the first closing bracket you meet must close the most recent opening one that is still open. "The most recent thing still open" is exactly what the top of a stack gives you, so push every opener and, at every closer, check it against the top and pop.

Expressions are the same idea in disguise. When you read 2 + 3 * 4 from left to right you cannot add 2 + 3 yet, because the multiplication that follows binds tighter. You have to remember the 2 and the plus and carry on. When parentheses appear, the situation gets deeper: everything computed so far, and the operator waiting in front of the parenthesis, has to wait until the closing parenthesis is reached. The stack is where the waiting work lives.

String decoding follows the pattern too. In 3[a2[c]], reading the inner group 2[c] means you must first finish the outer group's prefix, remember how many times the outer group repeats, and come back to it. Each opening bracket starts a fresh context; each closing bracket ends it and splices the result into the context beneath.

The signal for this pattern is nesting, or a scan in which an element later in the input decides what to do with something earlier. The questions to ask are: what do I need to remember when I enter a new level, and how do I combine the finished level with the saved one when I leave?`,
        diagram: `flowchart TD
    A["Read the next character"] --> B{"What is it?"}
    B -- "opener or open parenthesis" --> C["Push the saved state: partial result, sign, text or count"]
    B -- "closer" --> D["Pop the saved state and combine it with the finished level"]
    B -- "other" --> E["Update the current level"]
    C --> F["Start a fresh level"]
    D --> G{"More input?"}
    E --> G
    F --> G
    G -- yes --> A
    G -- no --> H["Result is the current level, the stack should be empty"]`,
        diagramCaption: "The common loop: park the current level when one opens, combine when it closes.",
      },
      {
        title: "Why it works",
        body: `Nested structure is last in, first out. Whichever level opened last is the first one that must close, because levels do not interleave: if A opens, then B opens, then A closes before B does, the text is malformed. A stack mirrors this exactly, so the top is always the innermost level that is still open.

For bracket matching, the invariant is that the stack holds the openers that have not yet been closed, in the order they were opened. A closer is valid exactly when the stack is non-empty and its top is the matching opener. At the end the text is balanced exactly when the stack is empty: every opener was closed, none closed twice, and none was left over.

For arithmetic without parentheses the invariant is: the stack holds the terms of a sum, where each term is a product or quotient that has already been fully evaluated. When a plus or minus arrives it ends the current term, so we push the finished term (negated for a minus). When a star or slash arrives, the new number multiplies or divides the term at the top. This works because multiplication and division have higher precedence than addition and subtraction: they apply to the latest term and nothing earlier. At the end the answer is the sum of the stack.

With parentheses, the invariant extends. At each level we hold the running result and the sign that precedes it. Entering a parenthesis saves that result and sign; leaving it computes saved result + saved sign * level result. That uses the identity that a parenthesised group is a single number with a sign in front of it.

The cost of each of these is one push and one pop per character at most, so the scan is linear.`,
      },
      {
        title: "A worked example",
        body: `Valid Parentheses on { [ ] } ( : push {, push [. The next character ] matches the top [, pop. The next } matches the top {, pop. Then ( is pushed. The input ends with a non-empty stack, so the answer is false.

Basic Calculator II on 3+2*2. Keep the last operator seen (starting with +) and the number being read. At each operator or at the end, apply the last operator to the finished number.
Read 3, then + arrives: the last operator was + so push 3. The last operator is now +.
Read 2, then * arrives: apply the last operator + so push 2. The last operator is now *.
Read 2, then the end: apply the last operator *, so the top becomes 2 * 2 = 4. The stack is [3, 4], and the sum is 7.
For " 3/2 " the stack gets 3 and then 3 / 2 = 1 (the quotient truncates toward zero), the answer 1.

Basic Calculator on 2-(5-6). Keep result, sign (the sign applying to the next number), and a stack of saved pairs.
Read 2: number 2. Read -: result = 2, sign = -1.
Read (: push result 2 and sign -1, then reset result = 0 and sign = 1.
Read 5, then -: result = 5, sign = -1. Read 6, then ): result = 5 + (-1) * 6 = -1. Pop the saved sign -1 and result 2: result = 2 + (-1) * (-1) = 3. The answer is 3.

Decode String on 3[a2[c]].
Read 3: count 3. Read [: push (current text "", count 3). Reset text and count.
Read a: text "a". Read 2: count 2. Read [: push ("a", 2). Reset: text "".
Read c: text "c". Read ]: pop ("a", 2), text = "a" + "c" repeated 2 times = "acc".
Read ]: pop ("", 3), text = "" + "acc" repeated 3 times = "accaccacc". That is the answer.`,
      },
      {
        title: "Implementation",
        body: `Bracket matching is the first thing to write from memory. It needs three branches: an opener is pushed, a closer needs a non-empty stack and the right partner, and the string is valid only if the stack is empty at the end. A map from closer to opener keeps it short for many bracket types, and a plain comparison is enough for three.

Basic Calculator II shows the term stack. A sentinel plus at the end of the string flushes the last number without duplicating the code. Be careful about spaces, and about reading multi-digit numbers digit by digit. The division in C++ truncates toward zero, which is what the problem asks for.`,
        code: `// Valid Parentheses.
bool isValidParentheses(const string& s) {
    vector<char> st;
    for (char c : s) {
        if (c == '(' || c == '[' || c == '{') {
            st.push_back(c);
        } else {
            if (st.empty()) return false;
            char open = st.back();
            st.pop_back();
            if ((c == ')' && open != '(') || (c == ']' && open != '[') || (c == '}' && open != '{')) return false;
        }
    }
    return st.empty();
}

// Basic Calculator II: + - * / on non-negative integers, no parentheses.
int calculateII(const string& s) {
    vector<long long> terms;  // finished terms of the sum
    long long num = 0;
    char op = '+';            // the operator that came before num
    for (size_t i = 0; i <= s.size(); i++) {
        char c = i < s.size() ? s[i] : '+';  // sentinel flushes the last number
        if (isdigit((unsigned char)c)) {
            num = num * 10 + (c - '0');
            continue;
        }
        if (c == ' ') continue;
        if (op == '+') terms.push_back(num);
        else if (op == '-') terms.push_back(-num);
        else if (op == '*') terms.back() *= num;
        else terms.back() /= num;
        op = c;
        num = 0;
    }
    long long sum = 0;
    for (long long v : terms) sum += v;
    return (int)sum;
}`,
      },
      {
        title: "Implementation: parentheses, decoding and precedence",
        body: `Basic Calculator has plus, minus and parentheses but no multiplication. Instead of a term stack it keeps a running result and a sign, and uses the stack only to save them when a parenthesis opens. Unary minus, as in -(2+3), works without special handling because the sign is applied to the number or group that follows.

Decode String keeps a stack of pairs: the text built before the bracket, and the repeat count. Counts can have several digits, so accumulate them.

Basic Calculator III has everything: four operators, precedence and parentheses. A recursive descent parser is the cleanest answer. It has one function per precedence level: an expression is terms joined by plus and minus, a term is factors joined by times and divide, and a factor is a number, a negated factor or a parenthesised expression. The call stack plays the role of the explicit stack. It is the same algorithm in a different form, and it extends easily to exponents or functions.`,
        code: `// Basic Calculator: + - and parentheses.
int calculateI(const string& s) {
    long long result = 0, num = 0;
    int sign = 1;
    vector<long long> saved;  // pairs of (result, sign) pushed at each open parenthesis
    for (char c : s) {
        if (isdigit((unsigned char)c)) {
            num = num * 10 + (c - '0');
        } else if (c == '+' || c == '-') {
            result += sign * num;
            num = 0;
            sign = (c == '+') ? 1 : -1;
        } else if (c == '(') {
            saved.push_back(result);
            saved.push_back(sign);
            result = 0;
            sign = 1;
        } else if (c == ')') {
            result += sign * num;
            num = 0;
            long long prevSign = saved.back();
            saved.pop_back();
            long long prevResult = saved.back();
            saved.pop_back();
            result = prevResult + prevSign * result;
        }
    }
    return (int)(result + sign * num);
}

// Decode String: k[text] repeated, nested.
string decodeString(const string& s) {
    vector<pair<string, int>> saved;  // (text before the bracket, repeat count)
    string cur;
    int num = 0;
    for (char c : s) {
        if (isdigit((unsigned char)c)) {
            num = num * 10 + (c - '0');
        } else if (c == '[') {
            saved.push_back({cur, num});
            cur.clear();
            num = 0;
        } else if (c == ']') {
            pair<string, int> top = saved.back();
            saved.pop_back();
            string repeated;
            for (int i = 0; i < top.second; i++) repeated += cur;
            cur = top.first + repeated;
        } else {
            cur += c;
        }
    }
    return cur;
}

// Basic Calculator III: + - * / and parentheses, by recursive descent.
struct CalcParser {
    const string& s;
    size_t pos = 0;
    explicit CalcParser(const string& str) : s(str) {}
    void skip() { while (pos < s.size() && s[pos] == ' ') pos++; }
    long long factor() {
        skip();
        if (s[pos] == '(') {
            pos++;
            long long v = expr();
            skip();
            pos++;  // the closing parenthesis
            return v;
        }
        if (s[pos] == '-') {
            pos++;
            return -factor();
        }
        long long v = 0;
        while (pos < s.size() && isdigit((unsigned char)s[pos])) v = v * 10 + (s[pos++] - '0');
        return v;
    }
    long long term() {
        long long v = factor();
        while (true) {
            skip();
            if (pos < s.size() && (s[pos] == '*' || s[pos] == '/')) {
                char op = s[pos++];
                long long r = factor();
                v = (op == '*') ? v * r : v / r;
            } else {
                return v;
            }
        }
    }
    long long expr() {
        long long v = term();
        while (true) {
            skip();
            if (pos < s.size() && (s[pos] == '+' || s[pos] == '-')) {
                char op = s[pos++];
                long long r = term();
                v = (op == '+') ? v + r : v - r;
            } else {
                return v;
            }
        }
    }
};
int calculateIII(const string& s) {
    CalcParser p(s);
    return (int)p.expr();
}`,
      },
      {
        title: "Variants",
        body: `Matching. Valid Parentheses with several bracket types. Longest Valid Parentheses stores indices on the stack so it can compute lengths. Minimum Remove to Make Valid Parentheses marks the unmatched indices and drops them in a second pass. Generate Parentheses is the backtracking cousin, where the stack is the call stack.

Expressions. Basic Calculator (plus, minus, parentheses), Basic Calculator II (precedence, no parentheses), Basic Calculator III (both). Evaluate Reverse Polish Notation is the easiest: push numbers, and at each operator pop two, apply, and push the result. Infix to postfix conversion with the shunting-yard algorithm keeps an operator stack and pops operators of higher or equal precedence before pushing a new one.

Decoding and nesting. Decode String, Number of Atoms (counting elements in a chemical formula with nested groups and multipliers, using a stack of maps) and Evaluate the Bracket Pairs of a String all park the outer context on a stack.

Paths and text. Simplify Path pushes directory names, and pops on a double dot. Remove All Adjacent Duplicates In String pops when the new character equals the top. Both are stacks used to undo.

Undo-like behaviour. Backspace String Compare and Asteroid Collision pop elements that a later element cancels. These are close to a monotonic stack, but with a cancelling rule instead of an ordering rule.

Recursion or an explicit stack. Anything written with a stack can be written recursively and the other way round. The explicit stack avoids deep recursion on adversarial input such as a million open brackets.`,
      },
      {
        title: "Complexity",
        body: `All of these scans are O(n) in time. Each character is looked at once. Each push is matched by at most one pop, so the work on the stack is linear in the length of the input too. Reading a multi-digit number costs one step per digit, which is still within the same bound.

Space is O(n) in the worst case. A string of n opening brackets pushes n entries. For calculators the stack depth is bounded by the nesting depth of the parentheses plus the number of terms. Decode String is the one to watch: the output can be exponentially longer than the input (a short nested string can expand to a huge result), so the time and space of building the output are bounded by the output size, not by the input size. Say so if asked about complexity.

Basic Calculator II can be done in O(1) extra space by keeping the last term and the running sum instead of a stack of terms: when a plus or minus arrives, add the last term to the sum and start a new term; when a star or slash arrives, update the last term. That is a good follow-up to know.

A recursive descent parser uses call-stack space proportional to the nesting depth, which can be linear for adversarial input. For production use or very deep input an explicit stack is safer.

The shunting-yard approach is also O(n) and handles more operators and associativity rules, at the cost of more code.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Popping an empty stack. A closing bracket with nothing open is a plain false in the matcher, not a crash. Check for empty before reading the top.

Leftover openers. Returning true as soon as the loop ends is wrong for "(((". The answer is the stack being empty.

Multi-digit numbers and spaces. Read digits in a loop, and skip spaces without treating them as operators. A forgotten flush of the last number is the most common bug in calculators, and the sentinel operator at the end avoids it.

Division. Integer division truncates toward zero in C++ and Java, but floors in Python. Match the language the problem expects. Check negative operands.

Subtraction and the stack. A minus pushes the negated number, so that the final answer is a plain sum. Do not subtract at the end.

Unary minus. An expression can start with a minus, or have one right after an open parenthesis. The sign-based method handles it; a method that expects a number before every operator does not.

Sign when leaving a parenthesis. The sign saved at the open parenthesis must multiply the whole group, which is why the group result is combined as saved result + saved sign * group result.

Overflow. Use long long for intermediate values if the inputs are near the 32-bit limits.

Counts with several digits in Decode String. 10[a] is ten copies, not one copy followed by a zero.

Edge cases to test: empty string, a single closer, deeply nested input, all spaces, a number with leading zeros, a negative result, and division where the left operand is smaller than the right.`,
      },
      {
        title: "Practice order",
        body: `1. Valid Parentheses (easy). The foundation. Write it from memory, then add a map from closers to openers.
2. Basic Calculator II (medium). Precedence with a stack of terms. Trace 3+5/2*2 by hand before you code.
3. Basic Calculator (hard). Parentheses and unary minus with the saved result and sign. Work through 2-(5-6) and -(2+3) on paper.
4. Decode String (medium). Nested repeats with a stack of pairs. Test with numbers of two digits.
5. Basic Calculator III (hard). Combine everything. Try both a recursive descent version and an explicit-stack version.

After these, Longest Valid Parentheses and Evaluate Reverse Polish Notation round out the family, and the next article in this group, the monotonic stack, is the same data structure with a different rule for popping.`,
      },
    ],
  },

  "heap-top-k": {
    intro:
      "A heap gives you the smallest (or largest) element of a changing collection in O(log n) per insert or removal. That makes it the tool for anything that repeatedly needs the best remaining item: the k largest values of a stream, the next node among k sorted lists, the next task that is allowed to run. The standard trick for top-k is to keep a heap of size k that holds the best k so far, so that each new element costs O(log k) instead of sorting everything.",
    sections: [
      {
        title: "The intuition",
        body: `A heap is a bag from which you can always take the smallest item quickly. You can put things in at any time. You can look at the smallest in constant time, and remove it in logarithmic time. You cannot search for an arbitrary element or walk the elements in order, so a heap is for questions that only ever ask about the extreme.

Now take the problem of the k-th largest of n numbers. Sorting does it in O(n log n). But you only care about the top k, and the elements below the top k can be forgotten as soon as k better ones appear. Keep a small bag of size k holding the best k seen so far. When a new number arrives, put it in. If the bag now has k + 1 elements, the smallest of them is not among the top k and can go. Because you want to throw away the smallest, the bag should be a min-heap. The surprise to remember: to keep the largest k you use a min-heap, because the thing you need quick access to is the weakest member of the group, the one next in line to be evicted.

A second shape appears when you have many sorted sources and want them merged. At every step the next output is the smallest of the current heads. Put one head from each source in a heap, take out the smallest, and replace it with the next element of the same source.

A third shape is scheduling with a rule like "among the things available now, do the best one". Items become available over time, and the heap holds the ones that are available, ordered by the rule.`,
        diagram: `flowchart TD
    A["New element x"] --> B["Push x into a min-heap of size at most k"]
    B --> C{"Heap size above k?"}
    C -- yes --> D["Pop the smallest: it cannot be in the top k"]
    C -- no --> E["Keep everything"]
    D --> F["Heap holds the k largest seen so far"]
    E --> F
    F --> G["Top of the heap is the k-th largest"]`,
        diagramCaption: "Top-k with a min-heap of size k. The top is always the weakest of the best k, so it is the k-th largest.",
      },
      {
        title: "Why it works",
        body: `A binary heap is stored in an array as a complete binary tree: the children of index i are at 2i + 1 and 2i + 2. The heap property says each node is no larger than its children (for a min-heap). The smallest element is therefore at the root.

Insert puts the new value at the end and sifts it up: while it is smaller than its parent, swap them. The tree has height about log2(n), so this takes O(log n). Remove-min takes the last element, puts it at the root, and sifts it down: swap it with the smaller child until neither child is smaller. Again O(log n). Both operations keep the tree complete and restore the heap property along a single path.

For top-k the invariant is: after processing the first m elements, the heap contains the min(m, k) largest of them. Adding x and evicting the smallest when the size exceeds k keeps this true, because the smallest of the k + 1 candidates cannot be among the k largest of m + 1 elements. If x itself is the smallest, it is evicted at once, which is right.

Building a heap from n elements takes O(n), not O(n log n). Sift down every non-leaf node from the last parent to the root. A node at height h moves down at most h levels, and about n / 2^(h + 1) nodes have height h, so the total work is the sum over h of (n / 2^(h + 1)) * h, which is at most n times the sum of h / 2^h, and that series converges to a constant. Half of the nodes are leaves and cost nothing.

For merging k sorted lists the invariant is that the heap holds exactly the smallest unread element of each non-empty list, so its top is the smallest unread element overall. This is the greedy choice for the next output, and it is safe because every list is sorted.`,
      },
      {
        title: "A worked example",
        body: `Kth Largest Element in an Array: nums = [3, 2, 1, 5, 6, 4], k = 2. Keep a min-heap of size at most 2.
Push 3: heap {3}.
Push 2: heap {2, 3}.
Push 1: heap {1, 2, 3}, which is too big, pop the smallest 1: {2, 3}.
Push 5: {2, 3, 5}, pop 2: {3, 5}.
Push 6: {3, 5, 6}, pop 3: {5, 6}.
Push 4: {4, 5, 6}, pop 4: {5, 6}.
The top is 5, the second largest.

Merge k Sorted Lists: [1, 4, 5], [1, 3, 4], [2, 6]. The heap starts with the three heads 1, 1, 2.
Pop 1 (from the first list), push its next 4. Output 1.
Pop 1 (from the second list), push its next 3. Output 1, 1.
Pop 2 (third list), push 6. Output 1, 1, 2.
The heap holds 4, 3, 6. Pop 3 and push the next element of the second list, 4. Output so far: 1, 1, 2, 3.
The heap holds 4 (first list), 4 (second list) and 6. Pop the first list's 4 and push its next element 5. Pop the second list's 4, which has no next element. The heap holds 5 and 6, and they come out in that order.
Result: 1, 1, 2, 3, 4, 4, 5, 6.

Task Scheduler: tasks A A A B B B with cooldown n = 2 between equal tasks. The most frequent task A appears 3 times, and equal tasks must be 3 slots apart (the task itself plus two others or idle). That forces A _ _ A _ _ A, which is (3 - 1) * (2 + 1) + 1 = 7 slots, and B also appears 3 times so it fits into the gaps and needs one more slot at the end: A B _ A B _ A B, 8 slots in all. The formula (maxFreq - 1) * (n + 1) + (number of tasks with maxFreq) gives 2 * 3 + 2 = 8.

IPO: k = 2, w = 0, profits [1, 2, 3], capital needed [0, 1, 1]. At w = 0 only project 0 is affordable, so take it and w = 1. Now projects 1 and 2 are affordable with profits 2 and 3. The max-heap gives 3, so w = 4.`,
      },
      {
        title: "Implementation",
        body: `The standard library's priority_queue is a max-heap by default. For a min-heap, pass greater as the comparator. Always write the type once with a using statement so the declaration stays readable.

Top-k uses a min-heap with a size cap. Merge k lists uses a heap of node pointers with a custom comparator that orders by value. Remember that the comparator describes the reverse of the order you pop: to get the smallest value first, the comparator must say that a comes after b when a->val > b->val.

Task Scheduler has a counting solution that needs no heap. Count the frequency of each task. The busiest task forces a frame of maxFreq - 1 groups of size n + 1, followed by one slot for each task that reaches the maximum frequency. If the tasks are plentiful and fill every gap, no idle slots are needed and the answer is just the number of tasks, so the result is the maximum of the two.`,
        code: `// Kth Largest Element: min-heap of size k.
int findKthLargest(const vector<int>& nums, int k) {
    priority_queue<int, vector<int>, greater<int>> heap;
    for (int x : nums) {
        heap.push(x);
        if ((int)heap.size() > k) heap.pop();
    }
    return heap.top();
}

// Top K Frequent Elements: min-heap of (count, value) pairs, size k.
vector<int> topKFrequent(const vector<int>& nums, int k) {
    unordered_map<int, int> cnt;
    for (int x : nums) cnt[x]++;
    using CountValue = pair<int, int>;
    priority_queue<CountValue, vector<CountValue>, greater<CountValue>> heap;
    for (const auto& kv : cnt) {
        heap.push({kv.second, kv.first});
        if ((int)heap.size() > k) heap.pop();
    }
    vector<int> out;
    while (!heap.empty()) {
        out.push_back(heap.top().second);
        heap.pop();
    }
    return out;
}

struct ListNode {
    int val;
    ListNode* next;
    explicit ListNode(int v) : val(v), next(nullptr) {}
};

// Merge k Sorted Lists: the heap holds the current head of each list.
ListNode* mergeKLists(vector<ListNode*>& lists) {
    auto later = [](ListNode* a, ListNode* b) { return a->val > b->val; };
    priority_queue<ListNode*, vector<ListNode*>, decltype(later)> heap(later);
    for (ListNode* l : lists) if (l) heap.push(l);
    ListNode dummy(0);
    ListNode* tail = &dummy;
    while (!heap.empty()) {
        ListNode* node = heap.top();
        heap.pop();
        tail->next = node;
        tail = node;
        if (node->next) heap.push(node->next);
    }
    return dummy.next;
}

// Task Scheduler by counting.
int leastInterval(const vector<char>& tasks, int n) {
    vector<int> freq(26, 0);
    for (char c : tasks) freq[c - 'A']++;
    int maxFreq = *max_element(freq.begin(), freq.end());
    int atMax = (int)count(freq.begin(), freq.end(), maxFreq);
    return max((int)tasks.size(), (maxFreq - 1) * (n + 1) + atMax);
}`,
      },
      {
        title: "Implementation: a heap by hand, and scheduling with two phases",
        body: `Interviewers sometimes ask for the heap itself. It is a vector with two helpers. Insert pushes at the end and sifts up while the parent is larger. Remove-min moves the last element to the root and sifts down by swapping with the smaller child. The index arithmetic is the only thing to get right: the parent of i is (i - 1) / 2, the children are 2i + 1 and 2i + 2.

IPO shows the scheduling shape in two phases. Sort the projects by the capital they need. Then repeat k times: move every project whose capital is at most the current money into a max-heap keyed by profit, take the biggest profit, and add it to the money. The sorted list is a pointer that only moves forward, and the heap holds what is currently affordable. The same structure solves many "take the best available item, then more items unlock" problems.`,
        code: `// A min-heap written out, to show what priority_queue does.
struct MinHeapHT {
    vector<int> a;
    bool empty() const { return a.empty(); }
    int top() const { return a[0]; }
    void push(int x) {
        a.push_back(x);
        size_t i = a.size() - 1;
        while (i > 0) {
            size_t parent = (i - 1) / 2;
            if (a[parent] <= a[i]) break;
            swap(a[parent], a[i]);
            i = parent;
        }
    }
    void pop() {
        a[0] = a.back();
        a.pop_back();
        size_t i = 0, n = a.size();
        while (true) {
            size_t l = 2 * i + 1, r = l + 1, smallest = i;
            if (l < n && a[l] < a[smallest]) smallest = l;
            if (r < n && a[r] < a[smallest]) smallest = r;
            if (smallest == i) break;
            swap(a[i], a[smallest]);
            i = smallest;
        }
    }
};

// IPO: pick at most k projects to maximise the final capital.
int findMaximizedCapital(int k, int w, const vector<int>& profits, const vector<int>& capital) {
    int n = (int)profits.size();
    vector<pair<int, int>> projects(n);  // (capital needed, profit)
    for (int i = 0; i < n; i++) projects[i] = {capital[i], profits[i]};
    sort(projects.begin(), projects.end());
    priority_queue<int> affordable;      // max-heap of profits
    int next = 0;
    for (int round = 0; round < k; round++) {
        while (next < n && projects[next].first <= w) affordable.push(projects[next++].second);
        if (affordable.empty()) break;
        w += affordable.top();
        affordable.pop();
    }
    return w;
}`,
      },
      {
        title: "Variants",
        body: `K-th largest or smallest. A min-heap of size k for the largest, a max-heap of size k for the smallest. Quickselect gives O(n) on average without extra memory but changes the array; the heap works on streams.

Top-k by frequency or distance. Top K Frequent Elements, K Closest Points to Origin and Top K Frequent Words use the same size-k heap with a key other than the value. Bucket sort by count gives O(n) for frequencies.

Merging sorted sources. Merge k Sorted Lists, Smallest Range Covering Elements from K Lists, Find K Pairs with Smallest Sums and Kth Smallest Element in a Sorted Matrix all keep one candidate per source in the heap and replace it when it is taken.

Scheduling. Task Scheduler, IPO, Meeting Rooms II (a min-heap of end times), Course Schedule III and Reorganize String ask for the best available item at each step. Items enter the heap when they become available.

Streaming. Kth Largest Element in a Stream keeps the size-k heap alive between calls. Running medians need two heaps, covered in the next article.

Dijkstra and Prim. Both repeatedly take the closest unvisited vertex from a heap. The graph articles use the same tool.

Lazy deletion. When an item in the middle of the heap becomes invalid, do not search for it. Leave it, and when it reaches the top, discard it. Dijkstra with duplicate entries and sliding window medians use this.

Heapify. Building a heap from an existing array in O(n) is useful when you need the top few of a large array and can afford to modify it.`,
      },
      {
        title: "Complexity",
        body: `Push and pop on a binary heap each cost O(log n); peeking at the top is O(1). Building a heap from n items is O(n) by the sift-down argument above, but n pushes cost O(n log n).

Top-k with a heap capped at size k does n pushes and up to n pops, each on a heap of at most k + 1 elements, so O(n log k) time and O(k) space. When k is much smaller than n that is far better than sorting, and for a stream it is the only option, because the elements cannot be stored. When k is close to n, sorting or quickselect is simpler. Quickselect is O(n) on average and O(n squared) in the worst case with a poor pivot rule.

Merge k Sorted Lists with N total nodes costs O(N log k): each node enters and leaves a heap of at most k entries. Merging the lists pairwise, as in merge sort, also gives O(N log k) with O(1) extra space for linked lists, and is a good alternative to know.

Task Scheduler by counting is O(n + 26), which is O(n). A heap simulation is O(n log 26), also fine.

IPO costs O(n log n) for the sort plus O(k log n) for the heap operations. A heap on a typical machine is also slower in practice than its asymptotics suggest, because of poor cache behaviour on large arrays, so for very large inputs a linear selection method can win.

priority_queue gives no way to remove an arbitrary element or update a key. Where you need that, use a set or a map keyed by value, which costs the same O(log n) but is heavier.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Using the wrong heap type. For the k largest elements the heap is a min-heap, and for the k smallest it is a max-heap. Remember that the heap holds the group, and its top is the member you will evict.

Comparator direction. In C++ the comparator of priority_queue returns true when the first argument should come after the second. So greater gives a min-heap, and a custom comparator for a min-heap on a field uses a greater-than on that field. Mixing this up gives the largest value first.

Pushing everything and sorting. Building a heap of all n elements and popping k times is correct but O(n log n) time and O(n) space, which defeats the purpose in the follow-ups that ask for O(n log k) or streaming.

Empty containers. top and pop on an empty priority_queue are undefined. Check empty, and handle k larger than the number of elements.

Duplicates. A heap keeps duplicates. K-th largest counts them, so [1, 1] has a second largest of 1. If a problem says distinct, deduplicate first or use an ordered set.

Stale entries. When an element changes after being pushed (a better distance, a decremented count), the old copy is still in the heap. Compare against the current best when you pop and skip stale copies.

Integer overflow in sums and keys. Use long long for sums of values.

Edge cases to test: k = 1, k = n, k > n if allowed, all equal values, a single list, empty lists inside the merge input, and negative numbers.`,
      },
      {
        title: "Practice order",
        body: `1. Merge k Sorted Lists (hard). The cleanest example of a heap holding one candidate per source. Write the comparator carefully, then also try the pairwise merge.
2. Find Median from Data Stream (hard). It needs two heaps, so read the next article first, and then return here. It is the best test of whether you understand which heap keeps what.
3. Task Scheduler (medium). Do the counting solution and the heap simulation, and make sure you can derive the formula for AAABBB with a cooldown of 2.
4. IPO (hard). Sort by capital, move the affordable ones into a max-heap, repeat k times. This is the template for "available items unlock over time".

Before these, solve Kth Largest Element in an Array and Top K Frequent Elements with a size-k heap. After them, try Meeting Rooms II, K Closest Points to Origin and Reorganize String.`,
      },
    ],
  },

  "two-heaps": {
    intro:
      "Two heaps keep a collection split into a smaller half and a larger half, with the biggest of the small half in a max-heap and the smallest of the large half in a min-heap. The two tops are then always the middle of the data, so the median is available in O(1) and every insert costs O(log n). The pattern answers running-median problems and, with a way to remove elements, medians of sliding windows.",
    sections: [
      {
        title: "The intuition",
        body: `The median is the middle of the data once it is sorted. You do not need the whole data to be sorted to know it, only the dividing line: everything on the left of the line is smaller than or equal to everything on the right, and the two sides are about the same size. Inside each side the order does not matter.

Two heaps give you exactly that. Keep the lower half in a max-heap, so that its top is the largest value of the lower half. Keep the upper half in a min-heap, so that its top is the smallest value of the upper half. Those two tops sit on either side of the dividing line. If the halves are equal in size, the median is the average of the two tops. If the lower half has one more element, the median is its top.

When a new number arrives you must keep two promises: every element of the lower half is at most every element of the upper half, and the sizes differ by at most one. A simple way to do both at once is to push the new number into the lower half, then move the largest of the lower half to the upper half (which restores the ordering promise), and if the upper half became larger than the lower half, move its smallest back (which restores the size promise).

The pattern appears whenever a problem asks for the median or any middle statistic of a changing collection, and in problems that ask to balance two groups, such as splitting work between two machines while keeping the sums close, or maximising the minimum of one group and the maximum of another.`,
        diagram: `flowchart LR
    A["Lower half in a max-heap"] --> B["Top: largest of the lower half"]
    C["Upper half in a min-heap"] --> D["Top: smallest of the upper half"]
    B --> E["Median: the top of the lower half, or the average of both tops"]
    D --> E
    F["New value"] -->|"push into lower, move its top to upper, rebalance"| A`,
        diagramCaption: "The dividing line between the two heaps is the median. Only the tops matter.",
      },
      {
        title: "Why it works",
        body: `Two invariants are kept after every insert. Order: every element of the lower half is less than or equal to every element of the upper half. Balance: the lower half has the same number of elements as the upper half, or exactly one more.

Given both, the median is correct. With an odd count the lower half has one more element and its largest is the middle element: it is at least as big as everything else in the lower half, and at most as big as everything in the upper half, and there are as many elements on each side of it as there should be. With an even count the two middle elements are the largest of the lower half and the smallest of the upper half, and their average is the median.

The insert procedure maintains both. Call the largest element of the lower half after the push m. Every old upper-half element was at least as large as every old lower-half element, so the only new element that can break the order is x. If x is at least as large as some upper-half element, then x is the maximum of the lower half after the push, so m = x, and moving m up puts x in the half where it belongs. Otherwise m is an old lower-half element or x itself, and in both cases it is at most every upper-half element, so moving it up keeps the order. After the move the lower half has its old size and the upper half has grown by one, so the upper half is larger by at most one. If it is larger, we move its smallest back, which restores the balance and, because that element is the smallest of the upper half, keeps the order.

Each insert does three heap operations, so O(log n). Reading the median is O(1).

For sliding windows, the same invariants hold, but removal needs more care. A heap cannot delete an arbitrary element, so mark it for lazy deletion and count how many valid elements each half holds, discarding dead tops when they surface. A balanced tree or a multiset with an iterator on the median does the same job directly.`,
      },
      {
        title: "A worked example",
        body: `Find Median from Data Stream with the numbers 5, 15, 1, 3 arriving in order. L is the max-heap of the lower half, H is the min-heap of the upper half.
Add 5: push into L (L = {5}), move its top to H (L = {}, H = {5}), H is larger so move its top back (L = {5}, H = {}). Median 5.
Add 15: push into L (L = {5, 15}), move the top 15 to H (L = {5}, H = {15}). Sizes are equal. Median (5 + 15) / 2 = 10.
Add 1: push into L (L = {5, 1}), move its top 5 to H (L = {1}, H = {5, 15}). H is larger, so move its top 5 back (L = {5, 1}, H = {15}). Median 5.
Add 3: push into L (L = {5, 3, 1}), move its top 5 to H (L = {3, 1}, H = {5, 15}). Sizes are equal. Median (3 + 5) / 2 = 4.
The sorted data is 1, 3, 5, 15, whose median is (3 + 5) / 2 = 4. The medians along the way, 5, 10, 5, 4, match the sorted data at each step.

Sliding Window Median on [1, 3, -1, -3, 5, 3, 6, 7] with k = 3. The windows and their medians:
[1, 3, -1] sorted -1, 1, 3, median 1.
[3, -1, -3] sorted -3, -1, 3, median -1.
[-1, -3, 5] sorted -3, -1, 5, median -1.
[-3, 5, 3] sorted -3, 3, 5, median 3.
[5, 3, 6] sorted 3, 5, 6, median 5.
[3, 6, 7] sorted 3, 6, 7, median 6.
Answer: [1, -1, -1, 3, 5, 6]. The window changes by one element out and one in, and the median only moves a step or two in the sorted order, which is what the implementation below exploits.`,
      },
      {
        title: "Implementation",
        body: `Find Median from Data Stream is the textbook case. The class holds a max-heap for the lower half and a min-heap for the upper half. The three-step insert (push into lower, move the top up, move back if the upper half is larger) keeps both invariants without branching on where the new value belongs.

The median is the top of the lower half when it has an extra element, or the average of both tops when the sizes are equal. Compute the average as a double, and convert before adding, so that two large ints do not overflow.`,
        code: `// Find Median from Data Stream.
class MedianFinder {
    priority_queue<int> lower;                             // max-heap: the smaller half
    priority_queue<int, vector<int>, greater<int>> upper;  // min-heap: the larger half
public:
    void addNum(int x) {
        lower.push(x);
        upper.push(lower.top());  // the largest of the lower half moves up: keeps the order
        lower.pop();
        if (upper.size() > lower.size()) {  // keeps the sizes balanced
            lower.push(upper.top());
            upper.pop();
        }
    }
    double findMedian() const {
        if (lower.size() > upper.size()) return lower.top();
        return (lower.top() + (double)upper.top()) / 2.0;
    }
};`,
      },
      {
        title: "Implementation: a sliding window",
        body: `For a sliding window you need to remove an element that leaves the window. Two heaps with lazy deletion work, but the bookkeeping is long: a map of pending deletions, separate counts of live elements in each half, and a clean-up of dead tops after each move. In C++ there is a shorter and well-known route: one multiset, and an iterator that always points to the median.

The multiset keeps the window sorted. The iterator mid points to the element at position k / 2. When a new number is inserted, an element lands before mid if it is smaller than the element at mid (equal elements go after existing equals), so mid has to step back one to keep pointing at the same rank. Before erasing the outgoing number, if it sits at or before mid, mid steps forward one. Then erase one copy with lower_bound, never by value, because erasing by value would delete every copy.

The median is the element at mid for an odd window, and the average of mid and the element before it for an even window. Use double for the average.`,
        code: `// Sliding Window Median with a multiset and an iterator on the median.
vector<double> medianSlidingWindow(const vector<int>& nums, int k) {
    multiset<int> window(nums.begin(), nums.begin() + k);
    auto mid = next(window.begin(), k / 2);
    vector<double> out;
    for (int i = k;; i++) {
        if (k % 2 == 1) out.push_back(*mid);
        else out.push_back(((double)*mid + (double)*prev(mid)) / 2.0);
        if (i == (int)nums.size()) break;
        window.insert(nums[i]);
        if (nums[i] < *mid) --mid;                  // inserted before mid: step back to keep the rank
        if (nums[i - k] <= *mid) ++mid;             // the outgoing value is at or before mid
        window.erase(window.lower_bound(nums[i - k]));  // erase one copy only
    }
    return out;
}`,
      },
      {
        title: "Variants",
        body: `Running median. Find Median from Data Stream. The two-heap version is the standard answer. If values are small integers (say 0 to 100), counting buckets give O(1) inserts and a median in O(range).

Sliding window median. Two heaps with lazy deletion, or a multiset with a median iterator. Sliding Window Median is the problem; related is a sliding window that asks for the k-th smallest.

Other quantiles. Keep the heaps in the ratio you need, for example one third below and two thirds above to track the 33rd percentile. The invariants change but the idea does not.

Balancing two groups. IPO is partly this: one group is waiting (sorted by cost) and one group is available (a max-heap by profit). Maximise Capital and Maximise Sum of Two Groups do the same with two heaps with different keys.

Minimum cost to hire workers. Minimum Cost to Hire K Workers sorts by a ratio and keeps a max-heap of the k smallest qualities with their running sum, a close relative of top-k.

Median of a stream under deletion. Use an order-statistics tree or a pair of multisets, with the same balance rule. Some environments have a policy-based tree for this.

Two heaps for schedules. Meeting Rooms and Car Pooling use one heap for the active intervals and sorting for the starts. They are single-heap problems, but the thinking of splitting by a threshold is the same.

Average instead of median. For the mean of a window you need only a running sum. Reach for two heaps only when the order of the elements matters.`,
      },
      {
        title: "Complexity",
        body: `Find Median from Data Stream takes O(log n) per insert (three heap operations on heaps whose sizes add up to n) and O(1) per median query. Memory is O(n), because every number is stored. That is also the information-theoretic cost of an exact running median: you have to keep every value, since any of them can become the median later.

If the values are integers in a small range, a count array gives O(1) insert and O(range) query, which beats the heaps when the range is small, as in the follow-up "all numbers are between 0 and 100".

Sliding Window Median with a multiset costs O(log k) per insert and per erase, and O(1) to move the median iterator one step, so O(n log k) overall with O(k) memory. The two-heap version with lazy deletion has the same bound in amortised terms: each element is pushed once, dies once, and is discarded once, and the heaps can hold up to n dead entries before they surface, so the memory is O(n) in the worst case unless you rebuild.

A naive approach sorts every window: O(n * k log k). Insertion into a sorted array of size k is O(k) per step, which is O(n * k) in total, and is the right comparison to mention when you explain why the heaps are better for large k.

The multiset iterator trick depends on the multiset being a balanced tree, so that stepping an iterator is amortised O(1) and insert and erase are O(log k). A plain sorted vector would make erase and insert O(k).`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Which heap is which. The lower half is a max-heap and the upper half is a min-heap. Swapping them gives a structure that looks balanced and returns wrong medians. Check the first three numbers by hand.

Breaking the order invariant. Pushing straight into one heap based on a comparison with the current median is possible, but the rebalancing step then needs care. The push-move-rebalance routine above is easy to get right because it never compares the new value with anything.

Even and odd. Keep the extra element in the lower half and always read the odd case from the lower half. If you let the sizes differ in either direction, the median code needs a third branch.

Integer overflow in the average. Adding two ints near the limit overflows. Cast one to double (or to long long) before adding.

Erasing by value from a multiset. window.erase(value) removes all elements equal to value. Erase by an iterator, as lower_bound(value) gives, to remove a single copy.

Updating the median iterator in the wrong order. Insert and adjust for the new element, then adjust for the outgoing one, then erase. Doing the erase first when the outgoing element is the median invalidates the iterator.

Lazy deletion bookkeeping. Track how many valid elements each heap holds, not heap.size(), because dead entries inflate it.

Window of size one or two. A window of one has the median equal to the element. Test both parities of k.

Edge cases to test: a single number, two numbers, all equal values, descending input, ascending input, and negative values.`,
      },
      {
        title: "Practice order",
        body: `1. Find Median from Data Stream (hard). The core of the pattern. Do it with the three-step insert, and check the medians for 5, 15, 1, 3 against the trace above.
2. Sliding Window Median (hard). The same invariants with removal. Try the multiset iterator version first, then, if you want the full picture, the two-heap version with lazy deletion.

Before these, read the heap and top-k article, since it explains what a heap does and why top-k uses the opposite kind. After them, try IPO and Minimum Cost to Hire K Workers for other uses of a heap beside a sort.`,
      },
    ],
  },

  "lru-lfu": {
    intro:
      "Cache design questions ask you to build a container with O(1) get and put that throws away the right entry when it is full. LRU evicts the least recently used key, which needs a hash map plus a doubly linked list ordered by recency. LFU evicts the least frequently used key, breaking ties by recency, which needs a map of frequency to a list of keys and a running minimum frequency. Both are exercises in combining two simple structures so that each does what the other cannot.",
    sections: [
      {
        title: "The intuition",
        body: `A hash map finds a key in O(1) but knows nothing about order. A linked list keeps an order and can move an element to the front in O(1), if you already hold a pointer to it, but finding the element takes O(n). A cache needs both: find by key, and keep an order of use. So combine them. The list holds the entries in order of recency, most recent at the front. The map stores, for each key, a direct handle to its entry in the list.

With both, every operation is constant time. A get looks up the key, moves the entry to the front of the list, and returns the value. A put on a new key inserts at the front, and if the capacity is exceeded, removes the entry at the back (the least recently used) and also deletes its key from the map.

Why a doubly linked list? To remove an entry from the middle in O(1) you must update both its neighbours, and without a back pointer you would have to walk from the head to find the previous node. The map gives you the node, the double links let you unlink it at once.

LFU goes one step further. The victim is the key with the smallest use count. Keys with the same count are an LRU group. So keep one recency list per count, and a number minFreq telling you which list to evict from. Using a key moves it from the list of count c to the list of count c + 1. The bookkeeping is the whole difficulty.`,
        diagram: `flowchart LR
    M["Hash map: key to list entry"] --> E1["Entry for key a"]
    M --> E2["Entry for key b"]
    M --> E3["Entry for key c"]
    H["Front: most recently used"] --> E1
    E1 <--> E2
    E2 <--> E3
    E3 --> T["Back: least recently used, evicted first"]`,
        diagramCaption: "LRU: the map finds the entry, the doubly linked list orders the entries by recency. Use moves an entry to the front, eviction removes the back.",
      },
      {
        title: "Why it works",
        body: `The design is correct because of two invariants. First, the map and the list always hold exactly the same keys, and each map value is a valid handle to the entry for its key in the list. Second, the list is ordered by recency of use from front to back, with the most recent at the front.

Every operation preserves both. A get that finds the key moves its entry to the front, and nobody else's relative order changes, so the order stays right: this entry is now the most recent. A put of an existing key updates the value and moves the entry to the front for the same reason. A put of a new key inserts at the front, so it is the most recent. If the cache is over capacity, it removes the back entry, which by the invariant is the least recently used, and deletes the same key from the map, so the two structures still agree.

Each step is a constant number of pointer changes plus a hash lookup, so O(1) on average. The handle is what removes the search: with std::list, an iterator stays valid when other elements are inserted or erased, and splice moves a node without copying or invalidating anything.

For LFU the invariants are: each key is in exactly one frequency list, the list for frequency f holds the keys used exactly f times in order of recency (oldest at the front), and minFreq is the smallest f whose list is non-empty. Using a key moves it to the back of the list for f + 1. If the list for f is now empty and f was minFreq, then minFreq becomes f + 1, which is where the key just went, so the invariant holds. Inserting a new key puts it in list 1 and sets minFreq to 1, since nothing has a smaller count. Eviction takes the front of the list for minFreq, which is the least recently used among the least frequently used.`,
      },
      {
        title: "A worked example",
        body: `LRU Cache with capacity 2. The list is shown most recent first.
put(1, 1): list [1].
put(2, 2): list [2, 1].
get(1) returns 1: move 1 to the front, list [1, 2].
put(3, 3): the cache is full, so evict the back, which is 2. Insert 3 at the front: [3, 1].
get(2) returns -1, since 2 was evicted.
put(4, 4): full again. Evict the back, which is 1. Insert 4: [4, 3].
get(1) returns -1. get(3) returns 3 and moves it to the front: [3, 4]. get(4) returns 4 and moves it to the front: [4, 3].

LFU Cache with capacity 2.
put(1, 1): key 1 has count 1. put(2, 2): key 2 has count 1. The count-1 list is [1, 2] (oldest first), and minFreq = 1.
get(1) returns 1: key 1 moves to count 2. The count-1 list is [2], and the count-2 list is [1]. minFreq stays 1 because the count-1 list is not empty.
put(3, 3): the cache is full, so evict from the minFreq list, whose front is key 2. Insert key 3 with count 1. minFreq = 1.
get(2) returns -1, since key 2 was evicted.
get(3) returns 3: key 3 moves to count 2. The count-1 list is now empty and minFreq was 1, so minFreq = 2. The count-2 list is [1, 3], oldest first.
put(4, 4): the cache is full. Evict from the minFreq list, count 2, whose front is key 1 (used less recently than key 3). Insert key 4 with count 1 and set minFreq = 1.
get(1) returns -1, get(3) returns 3, get(4) returns 4.
The tie between keys 1 and 3, both with count 2, was broken by recency: key 1 was touched before key 3, so it went.`,
      },
      {
        title: "Implementation",
        body: `In C++ the shortest correct LRU uses std::list for the order and an unordered_map from key to list iterator. The splice call moves a node to the front without copying and keeps every other iterator valid, which is precisely what the design needs.

Interviewers often ask for the list written by hand. The standard layout uses two sentinel nodes, a head and a tail, so that every real node always has a neighbour on both sides and unlinking or inserting never needs a null check. A node stores its key as well as its value, because when you evict the back node you have to know which key to delete from the map.

Handle capacity zero, which makes every put a no-op. Without the guard, the eviction branch would try to remove the back of an empty list.`,
        code: `// LRU Cache with std::list and an iterator map.
class LRUCache {
    int cap;
    list<pair<int, int>> order;  // (key, value), front = most recently used
    unordered_map<int, list<pair<int, int>>::iterator> where;
public:
    explicit LRUCache(int capacity) : cap(capacity) {}
    int get(int key) {
        auto it = where.find(key);
        if (it == where.end()) return -1;
        order.splice(order.begin(), order, it->second);  // move to the front
        return it->second->second;
    }
    void put(int key, int value) {
        if (cap <= 0) return;
        auto it = where.find(key);
        if (it != where.end()) {
            it->second->second = value;
            order.splice(order.begin(), order, it->second);
            return;
        }
        if ((int)order.size() == cap) {
            where.erase(order.back().first);  // the key is stored in the entry for this reason
            order.pop_back();
        }
        order.emplace_front(key, value);
        where[key] = order.begin();
    }
};

// The same cache with the doubly linked list written out, using two sentinel nodes.
class LRUCacheManual {
    struct Node {
        int key, value;
        Node *prev, *next;
        Node(int k, int v) : key(k), value(v), prev(nullptr), next(nullptr) {}
    };
    int cap;
    unordered_map<int, Node*> table;
    Node *head, *tail;  // sentinels: head->next is the most recent, tail->prev the least recent
    void unlink(Node* n) {
        n->prev->next = n->next;
        n->next->prev = n->prev;
    }
    void pushFront(Node* n) {
        n->next = head->next;
        n->prev = head;
        head->next->prev = n;
        head->next = n;
    }
public:
    explicit LRUCacheManual(int capacity) : cap(capacity) {
        head = new Node(0, 0);
        tail = new Node(0, 0);
        head->next = tail;
        tail->prev = head;
    }
    ~LRUCacheManual() {
        Node* n = head;
        while (n) {
            Node* nx = n->next;
            delete n;
            n = nx;
        }
    }
    LRUCacheManual(const LRUCacheManual&) = delete;
    LRUCacheManual& operator=(const LRUCacheManual&) = delete;
    int get(int key) {
        auto it = table.find(key);
        if (it == table.end()) return -1;
        unlink(it->second);
        pushFront(it->second);
        return it->second->value;
    }
    void put(int key, int value) {
        if (cap <= 0) return;
        auto it = table.find(key);
        if (it != table.end()) {
            it->second->value = value;
            unlink(it->second);
            pushFront(it->second);
            return;
        }
        if ((int)table.size() == cap) {
            Node* victim = tail->prev;
            unlink(victim);
            table.erase(victim->key);
            delete victim;
        }
        Node* n = new Node(key, value);
        pushFront(n);
        table[key] = n;
    }
};`,
      },
      {
        title: "Implementation: LFU",
        body: `LFU keeps three things: a table from key to its value, its count and its position in a list; a map from count to a list of keys, oldest at the front; and minFreq. One helper, touch, does the shared part of get and put on an existing key: remove the key from its current list, drop that list if it became empty (and bump minFreq if it was the minimum), increase the count, and append the key to the list of the new count.

A put on a new key first evicts when the cache is full, taking the front of the minFreq list, and then inserts the new key with count 1, setting minFreq to 1. The order matters: evict before inserting, or you might evict the key you just added.

Take care that every iterator stored in the table stays valid. With std::list, erasing other elements does not invalidate an iterator, so the stored position remains good until the key itself is erased.`,
        code: `// LFU Cache: O(1) get and put.
class LFUCache {
    struct Entry {
        int value;
        int freq;
        list<int>::iterator pos;  // position in byFreq[freq]
    };
    int cap;
    int minFreq = 0;
    unordered_map<int, Entry> table;
    unordered_map<int, list<int>> byFreq;  // freq -> keys, least recently used at the front

    void touch(int key) {
        Entry& e = table[key];
        list<int>& old = byFreq[e.freq];
        old.erase(e.pos);
        if (old.empty()) {
            byFreq.erase(e.freq);
            if (minFreq == e.freq) minFreq++;
        }
        e.freq++;
        list<int>& next = byFreq[e.freq];
        next.push_back(key);
        e.pos = prev(next.end());
    }
public:
    explicit LFUCache(int capacity) : cap(capacity) {}
    int get(int key) {
        auto it = table.find(key);
        if (it == table.end()) return -1;
        touch(key);
        return it->second.value;
    }
    void put(int key, int value) {
        if (cap <= 0) return;
        auto it = table.find(key);
        if (it != table.end()) {
            it->second.value = value;
            touch(key);
            return;
        }
        if ((int)table.size() == cap) {
            list<int>& victims = byFreq[minFreq];
            int victim = victims.front();
            victims.pop_front();
            if (victims.empty()) byFreq.erase(minFreq);
            table.erase(victim);
        }
        list<int>& ones = byFreq[1];
        ones.push_back(key);
        table[key] = Entry{value, 1, prev(ones.end())};
        minFreq = 1;
    }
};`,
      },
      {
        title: "Variants",
        body: `Plain LRU. LRU Cache. The map plus doubly linked list in either of the two forms above. Python and Java both have an ordered map that does it directly (OrderedDict, LinkedHashMap with access order), which is worth mentioning but is not what the interviewer wants to see.

LFU. LFU Cache as above. The older alternative is a min-heap keyed by (count, last-use time), which gives O(log n) and is simpler to write. Say which one you built and what it costs.

Counts with a bucket list. All O-one Data Structure supports increment, decrement, get-max-key and get-min-key in O(1). Keep a doubly linked list of buckets ordered by count, where each bucket holds the set of keys with that count. An increment moves a key to the next bucket, creating it if needed, and the min and max keys are read at the two ends of the bucket list. It is LFU taken further.

Expiry. A cache with a time to live per entry adds a timestamp and either removes expired entries lazily on access or keeps a second ordered structure keyed by expiry time.

Other policies. FIFO is a queue plus a set. MRU is LRU with the other end evicted. A segmented LRU or a 2Q policy uses two lists to resist one-off scans. These are design discussions rather than coding questions.

Thread safety. A real cache is shared, and even a get changes the order, so it needs a lock. Mention striping by key range, or approximate recency, as the ways to scale.

Capacity in bytes. Size each entry and evict until the total fits; the data structure is the same.`,
      },
      {
        title: "Complexity",
        body: `LRU: get and put are O(1) on average, since each is a hash lookup plus a constant number of pointer changes. Space is O(capacity) for the map and the list. The hash map's worst case is O(n) for a pathological collision pattern, which interviewers do not usually count.

LFU: get and put are O(1) on average as well. Touch removes a node from one list (O(1) with its iterator), appends to another (O(1)), and updates minFreq in O(1). Eviction takes the front of one list. The tables are keyed by key and by frequency, so lookups are expected O(1). Space is O(capacity) for the entries, plus the frequency lists, which hold exactly the keys, so the total is O(capacity).

One detail often missed: minFreq only ever increases by one in touch, because the key that was just touched is now in the list for f + 1, so f + 1 is not empty. It resets to 1 on an insert, because a new key has count 1. It never needs a scan. That is why LFU is O(1) rather than O(log n).

The heap-based LFU is O(log n) per operation. It is easier to code and fine for small capacities, but it does not meet the O(1) requirement of LFU Cache.

All O-one is O(1) per operation by the same trick: the buckets form a list in sorted order of count, and a key only moves to the adjacent bucket, since counts change by one, so neither a search nor a sort is needed.

Cache behaviour on real hardware favours the array-based designs, since linked lists chase pointers, but for the interview the target is the asymptotic bound.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Forgetting to store the key in the list node. When the back entry is evicted you need its key to erase it from the map. A node that holds only the value cannot do that.

Updating the order on get as well as put. A get is a use. If it does not move the entry to the front, the cache evicts the wrong key.

Put on an existing key. It must update the value, count as a use, and not evict anything. A common bug evicts first and then finds the key is gone.

Evicting after the insertion. Check the size before adding the new key. Otherwise the new key can be the one evicted.

Dangling map entries. Erase the evicted key from the map as well as the list. If you forget, a later get on that key reads freed memory or returns stale data.

Capacity zero. Every put should do nothing. Guard it, or the eviction code touches an empty list.

LFU with minFreq. After touching a key, if its old list is now empty and it was the minimum, increase minFreq. After inserting a new key, set minFreq to 1. Forgetting either leaves minFreq pointing at an empty list, and the next eviction crashes.

LFU tie-breaking. Within one frequency the oldest use goes first, so the lists append at the back and evict at the front. Mixing these gives MRU within the group.

Iterator invalidation. Stored iterators survive other erases in std::list but not the erase of their own node. Update e.pos after every move to a new list.

Edge cases to test: capacity 1, repeated puts of the same key, get of a missing key, a put that updates the value of the least recently used key, and LFU where many keys share a count.`,
      },
      {
        title: "Practice order",
        body: `1. LRU Cache (medium). Write it with std::list and splice first, then with a hand-written list and two sentinels. The second version is the one to be able to produce on a whiteboard.
2. LFU Cache (hard). Do it after LRU is automatic. Trace the example in this article, including the moment minFreq changes from 1 to 2.
3. ` + "All O`one Data Structure" + ` (hard). The bucket list version of the same idea. Draw the buckets before writing code, and decide how a key moves when its count goes up and when it goes down.

Before these, solve Design HashMap and make sure a doubly linked list with sentinels feels easy. After them, think about how you would make the cache thread safe and how you would add expiry, since both are common follow-up questions.`,
      },
    ],
  },
};
