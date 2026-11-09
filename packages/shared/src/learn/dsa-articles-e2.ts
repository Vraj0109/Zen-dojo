import type { PatternArticle } from "./types";

// Full pattern articles, group "Trees", second half (plan 0008, batch 4): bst, tree-dp, binary-lifting, trie.
// Format and rules: plan 0007. Code is C++17. Blocks of one article are concatenated and compiled together, so helper
// names are unique per article.

export const DSA_ARTICLES_E2: Record<string, PatternArticle> = {
  bst: {
    intro:
      "A binary search tree keeps every value in a node larger than everything in its left subtree and smaller than everything in its right subtree. That one rule makes searches follow a single path, makes the in-order traversal come out sorted, and turns questions about order (the k-th smallest, the next larger value, two swapped nodes) into questions about the sorted sequence hidden in the tree.",
    sections: [
      {
        title: "The intuition",
        body: `The defining property is global, not local. It is not enough that a node is greater than its left child and smaller than its right child: every value in the whole left subtree must be smaller, and every value in the whole right subtree larger. From that rule two consequences follow, and nearly every BST problem uses one of them.

The first is that search needs one path. At each node you compare and go left or right, never both, so a lookup, an insert or a delete costs the height of the tree. The second is that an in-order traversal (left, node, right) visits the values in increasing order. The tree is a sorted array stored as a hierarchy, and anything you can do on a sorted array you can do on the in-order sequence.

So there are two families of problems. Path problems use the first consequence: find a value, find the lowest common ancestor of two values by walking down until they split, insert, delete. Order problems use the second: the k-th smallest is the k-th node of the in-order, an iterator is a paused in-order traversal, a tree with two swapped values has exactly one or two places where the in-order sequence goes down instead of up.

When an interviewer gives you a BST, they are telling you the data is ordered. Do not treat it as an ordinary binary tree and visit everything: use the order to skip half of the tree at each step, or traverse in-order and stop as soon as you have the answer.`,
      },
      {
        title: "Why it works",
        body: `In-order traversal is sorted because of how it is defined. It lists the left subtree, then the node, then the right subtree. By the BST rule everything in the left subtree is smaller than the node, and everything in the right subtree is larger, and by induction each subtree's own in-order listing is sorted. Concatenating sorted left, then the node, then sorted right gives a sorted sequence, because each part is bounded by the node.

That is why iterating in-order solves Kth Smallest in O(h + k): the stack holds the path to the current node, and you stop after k pops. It is also why the iterator is O(h) memory and amortised O(1) per call: every node is pushed once and popped once, so n calls cost O(n) in total, even though a single call may push up to h nodes.

For Recover Binary Search Tree, two nodes had their values swapped. In a sorted sequence, swapping two elements creates one descent (a larger value before a smaller one) if they were adjacent, or two descents if they were not. The first element of the first descent and the second element of the last descent are the two wrong values. Swapping them back restores the order. The proof is a short case analysis: before the first wrong position the sequence is correct, so the first descent starts at the larger of the swapped values, and after the second wrong position it is correct again, so the last descent ends at the smaller one.

Deletion preserves the rule by replacing the node with its in-order successor (the smallest value of the right subtree) or predecessor, which are the two values that are adjacent to it in the sorted order, so no ordering is broken.`,
      },
      {
        title: "A worked example",
        body: `Recover Binary Search Tree on the tree with root 3, left child 1, right child 4, and 4 has a left child 2. The values 2 and 3 were swapped by mistake: a valid tree would have 2 at the root and 3 below the 4.

In-order traversal reads 1, 3, 2, 4. Walk the sequence keeping the previous value and look for a descent (previous greater than current).
Visit 1: previous is none.
Visit 3: previous 1 is smaller, fine.
Visit 2: previous 3 is larger than 2, a descent. This is the first descent, so first = the node with 3 and second = the node with 2.
Visit 4: previous 2 is smaller, fine. There is no second descent.

Swap the values of first and second. The root now holds 2 and the node under 4 holds 3, and the in-order is 1, 2, 3, 4. If there had been a second descent, say at pair (a, b), then second would have been updated to b and first would have stayed at the start of the first descent.

Kth Smallest with k = 2 on a correct tree with root 2, left 1 and right 3 takes the stack through the left spine: push 2, push 1; pop 1 (count 1); then move to its right child (none); pop 2 (count 2). The answer is 2, and the node 3 was never touched. That early exit is the benefit of the in-order stack over copying all values into an array.`,
      },
      {
        title: "Implementation",
        body: `The in-order walk with an explicit stack is the building block for the three problems: Kth Smallest stops after k pops, the iterator exposes next() and hasNext() on top of the same stack, and the recovery function remembers the previous node. The recovery version uses a simple recursive in-order for clarity and tracks the two wrong nodes in member variables.

A BST iterator pushes the left spine on construction. next() pops a node, pushes the left spine of its right child, and returns the node's value.`,
        code: `struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int v) : val(v), left(nullptr), right(nullptr) {}
};

// Kth smallest: stop the in-order traversal after k nodes.
int kthSmallest(TreeNode* root, int k) {
    stack<TreeNode*> st;
    TreeNode* cur = root;
    while (cur || !st.empty()) {
        while (cur) { st.push(cur); cur = cur->left; }
        cur = st.top(); st.pop();
        if (--k == 0) return cur->val;
        cur = cur->right;
    }
    return -1;
}

// In-order iterator: O(h) memory, amortised O(1) per call.
class BSTIterator {
    stack<TreeNode*> st;
    void pushLeft(TreeNode* node) {
        while (node) { st.push(node); node = node->left; }
    }
public:
    BSTIterator(TreeNode* root) { pushLeft(root); }
    int next() {
        TreeNode* node = st.top(); st.pop();
        pushLeft(node->right);
        return node->val;
    }
    bool hasNext() { return !st.empty(); }
};

// Recover a BST with two swapped values: find the descents in the in-order sequence.
struct Recoverer {
    TreeNode *prev = nullptr, *first = nullptr, *second = nullptr;
    void walk(TreeNode* node) {
        if (!node) return;
        walk(node->left);
        if (prev && prev->val > node->val) {
            if (!first) first = prev;      // start of the first descent
            second = node;                 // end of the last descent
        }
        prev = node;
        walk(node->right);
    }
};
void recoverTree(TreeNode* root) {
    Recoverer r;
    r.walk(root);
    swap(r.first->val, r.second->val);
}`,
      },
      {
        title: "Implementation: search, insert, delete and range queries",
        body: `Search and insert follow one path. Delete has three cases: a leaf is removed, a node with one child is replaced by that child, and a node with two children takes the value of its in-order successor (the leftmost node of its right subtree), and then that successor is deleted from the right subtree, where it has at most one child.

Lowest common ancestor in a BST needs no search of both sides: walk down from the root, and the first node whose value lies between p and q (inclusive) is the answer, because p and q are on different sides of it or one of them is it. Range sum and range counting skip whole subtrees that are outside the range.`,
        code: `TreeNode* bstInsert(TreeNode* node, int v) {
    if (!node) return new TreeNode(v);
    if (v < node->val) node->left = bstInsert(node->left, v);
    else node->right = bstInsert(node->right, v);
    return node;
}

TreeNode* bstDelete(TreeNode* node, int v) {
    if (!node) return nullptr;
    if (v < node->val) { node->left = bstDelete(node->left, v); return node; }
    if (v > node->val) { node->right = bstDelete(node->right, v); return node; }
    if (!node->left) return node->right;           // zero or one child
    if (!node->right) return node->left;
    TreeNode* succ = node->right;                  // two children: in-order successor
    while (succ->left) succ = succ->left;
    node->val = succ->val;
    node->right = bstDelete(node->right, succ->val);
    return node;
}

// Lowest common ancestor in a BST: the first node that separates p and q.
TreeNode* bstLca(TreeNode* root, int p, int q) {
    while (root) {
        if (p < root->val && q < root->val) root = root->left;
        else if (p > root->val && q > root->val) root = root->right;
        else return root;
    }
    return nullptr;
}

// Sum of the values in [lo, hi], skipping subtrees that cannot contain any.
int rangeSum(TreeNode* node, int lo, int hi) {
    if (!node) return 0;
    if (node->val < lo) return rangeSum(node->right, lo, hi);
    if (node->val > hi) return rangeSum(node->left, lo, hi);
    return node->val + rangeSum(node->left, lo, hi) + rangeSum(node->right, lo, hi);
}`,
      },
      {
        title: "Variants",
        body: `Floor and ceiling: the largest value not above x and the smallest not below x. Walk down, remember the last node that qualified, and go left or right accordingly. The successor and predecessor of a node are the same walk.

Kth smallest with updates: if the tree changes often, store the size of each subtree in the node. Then the k-th element is found in O(h) by comparing k with the size of the left subtree, without any traversal.

Validate BST and convert between a sorted array and a balanced BST use the same rule from the other side. Two Sum IV uses an in-order iterator going forward and one going backward, which is the two-pointer technique on the tree.

Self-balancing trees (AVL, red-black, treap) keep the height logarithmic with rotations. You are rarely asked to implement one, but you should say that an ordinary BST degrades to a linked list on sorted input, and that std::set and std::map are balanced trees.

An augmented BST can answer rank and range counts, and with an order-statistic tree you can count smaller elements to the right, which is also a Fenwick tree problem.`,
      },
      {
        title: "Complexity",
        body: `Search, insert and delete cost O(h), with h the height: O(log n) for a balanced tree and O(n) for a degenerate one. A traversal costs O(n). The iterator costs O(h) memory and O(1) amortised per call, O(n) for the full pass.

Kth Smallest by the stack is O(h + k) time. With subtree sizes stored it is O(h) per query.

Recover BST by in-order is O(n) time, and O(h) space for the recursion. The constant-space version uses Morris traversal, and it is worth naming when asked how to remove the stack.

Space for all these functions is the height, because of recursion or the explicit stack.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Treating the BST as a plain tree. Visiting both children at every node throws away the point of the data structure. Use the comparison to go one way.

Duplicates. The rule says strictly smaller on the left and strictly larger on the right unless the problem defines otherwise. Ask where equal values go, because it changes insert, delete and validation.

Deleting a node with two children. Replace the value, then delete the successor from the right subtree. Forgetting the second step leaves a duplicate.

Recover BST with adjacent swapped nodes: there is only one descent, so second must be set at the first descent too. The code above handles it because second is assigned at every descent and first only at the first.

Reading the iterator after the end. Calling next() without checking hasNext() pops an empty stack.

Using a recursive in-order on a tree of 10^5 nodes built from sorted input. It is a chain, and recursion will overflow the stack. Use the explicit stack.

Integer overflow in validation. When checking bounds use long long, as in the DFS article.`,
      },
      {
        title: "Practice order",
        body: `Start with Kth Smallest Element in a BST, in the stack form that stops early. Then Binary Search Tree Iterator, which is that same stack turned into a class and teaches amortised analysis. Then Recover Binary Search Tree, where the swapped-pair argument is the whole problem.

After these, write search, insert and delete from memory, and the LCA walk. Then try Two Sum IV with two iterators to feel the two-pointer technique on a tree.`,
      },
    ],
  },

  "tree-dp": {
    intro:
      "Tree DP computes, for every node, a small summary of its subtree and combines the summaries of the children into the parent's. It is the right tool when the answer for a node depends on choices inside its subtree, such as which nodes are selected, and the choices interact only along the edges. Rerooting extends it to give the answer for every node as the root, in linear time.",
    sections: [
      {
        title: "The intuition",
        body: `In a tree, every node splits the problem into independent parts: its children's subtrees do not interact except through the node itself. That is exactly the condition for dynamic programming. You define a state for each node, you compute it from the states of the children after they are finished, and the answer is the state of the root, or a combination over all nodes.

The state usually records the decisions that matter at the boundary. In House Robber III, a robber cannot take two adjacent nodes. The parent only needs to know two numbers from each child: the best total if the child is robbed, and the best total if it is not. With those two numbers the parent can compute its own two numbers, and nothing deeper is ever needed. Choosing the smallest set of numbers that makes the parent's computation possible is the real skill in tree DP.

The second kind of problem asks for something at every node as if it were the root, for example the sum of distances from each node to all the others. Running a DFS from every node costs O(n^2). Rerooting avoids it: compute the answer for one root, then derive the answer of each child from its parent's answer by adjusting only the part that changes when the root moves across one edge.

Both techniques have the same shape: a post-order pass that collects information from below, and for rerooting a pre-order pass that pushes information from above.`,
      },
      {
        title: "Why it works",
        body: `The correctness of the bottom-up pass is the induction of every tree recursion. If the states of the children are right, the state of the parent, which is defined as a function of the node and those states, is right. The states are chosen so that the function is complete: it considers all valid choices at the node, and the choices in different subtrees do not constrain each other beyond what the state records.

For House Robber III the two states are rob[v] = value[v] + the sum of skip over the children, since robbing v forbids robbing its children, and skip[v] = the sum over the children of the better of rob and skip, since each child is free to choose. These cover every valid selection of nodes in the subtree, so the maximum of the two at the root is the optimum.

Rerooting works because moving the root from a node p to its child c changes the distances in a simple way. The nodes in c's subtree (there are size[c] of them) get one step closer to the root, and all the other n - size[c] nodes get one step further. So ans[c] = ans[p] - size[c] + (n - size[c]). Each answer follows from the parent's in constant time. The proof is the observation that a path from the new root to any node in c's subtree no longer passes through the edge (p, c), and a path to any node outside does pass through it.

In general, rerooting needs the combination to be reversible, or at least needs prefix and suffix combinations over the children, so that the contribution of one child can be removed from the parent's total. For sums that is a subtraction. For maximums it takes the two largest values or prefix and suffix arrays.`,
      },
      {
        title: "A worked example",
        body: `House Robber III on the tree with root 3, left child 2 (whose right child is 3), and right child 3 (whose right child is 1). The values are the node values.

Post-order, each node gives the pair (rob, skip):
Leaf with value 3 under node 2: rob = 3, skip = 0.
Node 2 (only a right child, the leaf 3): rob = 2 + skip of its children = 2 + 0 = 2. skip = max(rob, skip) of the leaf = 3. So (2, 3).
Leaf with value 1 under the right 3: (1, 0).
Right node 3: rob = 3 + 0 = 3. skip = max(1, 0) = 1. So (3, 1).
Root 3: rob = 3 + skip(left) + skip(right) = 3 + 3 + 1 = 7. skip = max(2, 3) + max(3, 1) = 3 + 3 = 6. So (7, 6).
The answer is max(7, 6) = 7: rob the root, the leaf 3 under node 2, and the leaf 1.

Sum of Distances in Tree with n = 6 and edges 0-1, 0-2, 2-3, 2-4, 2-5. Root at 0. The sizes are: size[3] = size[4] = size[5] = size[1] = 1, size[2] = 4, size[0] = 6. The sum of distances from 0 is 1 + 1 + 2 + 2 + 2 = 8.
Reroot to 1: ans[1] = 8 - 1 + (6 - 1) = 12.
Reroot to 2: ans[2] = 8 - 4 + (6 - 4) = 6.
Reroot to 3, from 2: ans[3] = 6 - 1 + 5 = 10, and the same for 4 and 5.
The result is [8, 12, 6, 10, 10, 10], which matches a brute force check from each node.`,
      },
      {
        title: "Implementation",
        body: `House Robber III returns a pair from each call. The recursion is on the structure of the tree and needs no visited array.

For general trees given as edge lists, build an adjacency list and pass the parent in the recursion to avoid going back. Rerooting is two passes: the first computes subtree sizes and the sum of distances inside each subtree from the root, the second walks down and applies the formula. For very deep trees use an iterative order (an explicit stack or the BFS order processed in reverse) to avoid overflowing the call stack.`,
        code: `struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int v) : val(v), left(nullptr), right(nullptr) {}
};

// House Robber III: pair (best if this node is robbed, best if it is not).
pair<int, int> robPair(TreeNode* node) {
    if (!node) return {0, 0};
    auto l = robPair(node->left);
    auto r = robPair(node->right);
    int robbed = node->val + l.second + r.second;          // children must be skipped
    int skipped = max(l.first, l.second) + max(r.first, r.second);
    return {robbed, skipped};
}
int rob(TreeNode* root) {
    auto p = robPair(root);
    return max(p.first, p.second);
}

// Sum of distances from every node to all others, by rerooting.
struct DistanceSums {
    int n;
    vector<vector<int>> adj;
    vector<int> size;
    vector<long long> down, ans;      // down[v]: sum of distances inside v's subtree
    DistanceSums(int n_, const vector<vector<int>>& edges) : n(n_), adj(n_), size(n_, 1), down(n_, 0), ans(n_, 0) {
        for (auto& e : edges) { adj[e[0]].push_back(e[1]); adj[e[1]].push_back(e[0]); }
    }
    void collect(int v, int parent) {
        for (int c : adj[v]) {
            if (c == parent) continue;
            collect(c, v);
            size[v] += size[c];
            down[v] += down[c] + size[c];             // every node under c is one step further from v
        }
    }
    void push(int v, int parent) {
        for (int c : adj[v]) {
            if (c == parent) continue;
            ans[c] = ans[v] - size[c] + (n - size[c]);  // c's subtree gets closer, the rest gets further
            push(c, v);
        }
    }
    vector<long long> run() {
        collect(0, -1);
        ans[0] = down[0];
        push(0, -1);
        return ans;
    }
};`,
      },
      {
        title: "Implementation: diameter and independent sets on a general tree",
        body: `Two more shapes show the same idea on a tree given as an adjacency list. The longest path (diameter) keeps the two best child depths at each node. The maximum independent set is the House Robber recurrence with an arbitrary number of children: if the node is chosen, none of its children are; if not, each child chooses freely.

Both use an iterative post-order obtained from a DFS order, which avoids the recursion limit. The order is built by a stack, and processing it in reverse guarantees that every child is handled before its parent.`,
        code: `// Longest path in edges, on a tree given by adjacency lists, without recursion.
int treeDiameter(int n, const vector<vector<int>>& g) {
    vector<int> order, parent(n, -1), depth(n, 0);
    vector<int> st = {0};
    while (!st.empty()) {                         // DFS order, parents before children
        int v = st.back(); st.pop_back();
        order.push_back(v);
        for (int c : g[v]) if (c != parent[v]) { parent[c] = v; st.push_back(c); }
    }
    int best = 0;
    vector<int> top1(n, 0), top2(n, 0);           // two deepest child depths per node
    for (int i = n - 1; i >= 0; i--) {            // children before parents
        int v = order[i];
        best = max(best, top1[v] + top2[v]);
        int p = parent[v];
        if (p < 0) continue;
        int d = top1[v] + 1;
        if (d > top1[p]) { top2[p] = top1[p]; top1[p] = d; }
        else if (d > top2[p]) top2[p] = d;
    }
    return best;
}

// Maximum weight independent set: no two chosen nodes are adjacent.
long long maxIndependentSet(int n, const vector<vector<int>>& g, const vector<int>& weight) {
    vector<int> order, parent(n, -1);
    vector<int> st = {0};
    while (!st.empty()) {
        int v = st.back(); st.pop_back();
        order.push_back(v);
        for (int c : g[v]) if (c != parent[v]) { parent[c] = v; st.push_back(c); }
    }
    vector<long long> take(n), skip(n, 0);
    for (int i = n - 1; i >= 0; i--) {
        int v = order[i];
        take[v] += weight[v];
        int p = parent[v];
        if (p < 0) continue;
        take[p] += skip[v];                       // parent chosen: child must be skipped
        skip[p] += max(take[v], skip[v]);         // parent skipped: child is free
    }
    return max(take[0], skip[0]);
}`,
      },
      {
        title: "Variants",
        body: `Counting problems use the same bottom-up pass with sums and products: the number of ways to colour a tree so that adjacent nodes differ, the number of subtrees with a given property, the number of paths with a given sum.

Knapsack on a tree gives each node a table indexed by how many nodes are chosen in its subtree, and merges children tables like knapsack items, which costs O(n^2) in total by a classic size argument.

Choosing at most one of two states per node is the minimum vertex cover and the maximum independent set. The minimum number of cameras to monitor a tree adds a third state, covered but without a camera.

Rerooting also solves the farthest node from each node, the number of nodes at each distance, and the sum of subtree sizes, whenever you can combine children contributions with the parent's side. For maximums, keep the best two values among the children so that the child that provided the maximum can be excluded.

Centroid decomposition, Euler tours and binary lifting answer path queries when you need more than one value per node.`,
      },
      {
        title: "Complexity",
        body: `The bottom-up pass is O(n): each node is visited once and combines a constant amount of data from each child, so the total over all children is O(n) edges. Rerooting adds a second O(n) pass, so the whole solution is linear, against O(n^2) for repeating a DFS from every node.

Space is O(n) for the states and the adjacency list, and O(h) for the recursion. For a chain of 10^5 or more nodes switch to the iterative order shown above.

Tree knapsack is O(n * k) when the table is capped at k, and O(n^2) uncapped. State the bound with its reason: merging two tables of sizes a and b costs a * b, and summed over the tree that is at most the number of pairs of nodes.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `A state that is too small. If the parent needs a fact that the child state does not record, the recurrence is wrong. Write down what the parent needs from each child before you code.

Forgetting the parent in an undirected tree. Without the parent check the recursion walks back up and never ends.

Rerooting with a formula that is not reversible. Subtracting works for sums, but maximums need the best two or prefix and suffix combinations.

Overflow. Sums of distances reach n^2 / 2, which exceeds int for n around 10^5. Use long long.

Recursion depth on chains. Convert to an iterative order, or run the recursion in a thread with a big stack, if the judge allows it.

Single node and empty tree. The robber on an empty tree gets 0, and the distance sum for n = 1 is [0]. Check them.

Mixing nodes and edges. The diameter counted in edges is the sum of the two best child depths measured in edges.`,
      },
      {
        title: "Practice order",
        body: `Start with House Robber III, which has the cleanest two-number state. Write the pair version first, then the version that returns nothing and stores the pair in arrays. Then Sum of Distances in Tree, which is rerooting: write the two passes and test the formula on the five-node example by hand before coding.

Afterwards write the diameter and the maximum independent set from the second code block on a tree given as an edge list. They show that the same two-pass skeleton fits many problems, and that is the pattern.`,
      },
    ],
  },

  "binary-lifting": {
    intro:
      "Binary lifting precomputes, for every node, its 1st, 2nd, 4th, 8th ancestor and so on. Any ancestor query then breaks into a few jumps whose sizes are powers of two, so the k-th ancestor and the lowest common ancestor are answered in O(log n) after an O(n log n) setup. An Euler tour gives each subtree a contiguous range, which turns subtree questions into range queries.",
    sections: [
      {
        title: "The intuition",
        body: `Imagine a tree with a million nodes and a million questions of the form "who is the 900,000th ancestor of node v?" Walking up one step at a time costs up to a million steps per question. But you can write 900,000 in binary as a sum of at most 20 powers of two, and if you already know where a 2^j jump from every node lands, you only need one jump per set bit.

The table is simple to build. Let up[0][v] be the parent of v. A jump of 2^j steps is two jumps of 2^(j-1) steps, so up[j][v] = up[j-1][ up[j-1][v] ]. With about 20 rows (log2 of the maximum depth), the table has n * 20 entries and is built in O(n log n).

To find the k-th ancestor, go through the bits of k and apply the matching jump for each bit that is set. To find the lowest common ancestor of u and v, first lift the deeper node until both are at the same depth. If they are now equal, that node is the answer. Otherwise lift both nodes together, from the largest jump to the smallest, taking a jump only if it lands on different nodes. At the end the two nodes are children of the answer, which is their common parent.

The second tool in this article is the Euler tour. Do a DFS and record the time tin[v] when you enter a node and tout[v] when you leave it. The nodes of the subtree of v are exactly those with times in the interval of v, so a subtree is a contiguous range of the tour, and ancestor questions are interval containment.`,
      },
      {
        title: "Why it works",
        body: `The jump table is correct by induction on j. The row j = 0 holds parents. If up[j-1] is right, a jump of 2^j steps is a jump of 2^(j-1) steps followed by another, which is what the recurrence says. Nodes whose ancestor does not exist point to a sentinel (the root itself, or -1), and every query must treat the sentinel consistently.

Any non-negative integer has a unique binary representation, so k steps equal the sum of the powers of two in k, and the jumps can be applied in any order. That is why the loop over bits works.

The LCA procedure is a binary search on the answer. After the depths are equal, the predicate "the 2^j-th ancestors of u and v are different" is monotone in the number of steps: it holds while you are below the LCA and fails at and above it. Taking the largest jumps first that keep the two nodes distinct finds the highest pair of distinct ancestors, which is the pair of children of the LCA. This is the same reasoning as binary search on the answer, applied to a path of ancestors.

For the Euler tour, a DFS enters and leaves every node once, and the subtree of v is visited entirely between entering and leaving v. So u is in the subtree of v exactly when tin[v] <= tin[u] and tout[u] <= tout[v]. If you number only the entry times and record the size of each subtree, the subtree of v is the range [tin[v], tin[v] + size[v] - 1] of the entry order, which is what a Fenwick tree or a segment tree can sum or update.`,
      },
      {
        title: "A worked example",
        body: `Take a chain-like tree with nodes 0 to 6: parent of 1 is 0, of 2 is 1, of 3 is 1, of 4 is 2, of 5 is 4, of 6 is 3. So depth is 0, 1, 2, 2, 3, 4, 3 for nodes 0 to 6.

Build up[0] = parents, with the root pointing at itself: up[0] = [0, 0, 1, 1, 2, 4, 3].
up[1][v] = up[0][up[0][v]]: for 5, up[0][5] = 4 and up[0][4] = 2, so up[1][5] = 2. For 4: up[0][4] = 2, up[0][2] = 1, so 1. For 6: 3 then 1, so 1. For 3: 1 then 0, so 0.
up[2][v] = up[1][up[1][v]]: for 5, up[1][5] = 2 and up[1][2] = up[0][up[0][2]] = up[0][1] = 0, so up[2][5] = 0, the 4th ancestor of 5, which is the root (depth 4).

Query: the 3rd ancestor of node 5. 3 is 11 in binary: apply jump 1 (2 steps) then jump 0 (1 step). From 5: up[1][5] = 2, then up[0][2] = 1. The answer is 1. Check by walking up: 5 to 4 to 2 to 1. Three steps, node 1.

LCA of 5 and 6: depths 4 and 3. Lift 5 by 1 to node 4 (depth 3). 4 and 6 differ. Now try the largest jump that keeps them different. With j = 1: up[1][4] = 1 and up[1][6] = 1, equal, so skip. With j = 0: up[0][4] = 2 and up[0][6] = 3, different, so move: 4 becomes 2 and 6 becomes 3. The loop ends. The parents of 2 and 3 are the LCA: up[0][2] = 1. So LCA(5, 6) = 1.`,
      },
      {
        title: "Implementation",
        body: `The class below builds the table from a parent array given in an order where parents come before children, as in Kth Ancestor of a Tree Node. For a general tree, run a DFS from the root first to fill the parents and depths.

The sentinel is the root pointing at itself for LCA problems, which makes jumps past the root land on the root. For the k-th ancestor problem a missing ancestor must return -1, so use -1 as the sentinel and stop at the first -1.`,
        code: `// Kth ancestor and LCA by binary lifting. Nodes 0..n-1, parent[0] = -1.
class TreeAncestor {
    int LOG;
    vector<vector<int>> up;     // up[j][v] = 2^j-th ancestor, or -1
    vector<int> depth;
public:
    TreeAncestor(int n, const vector<int>& parent) {
        LOG = 1;
        while ((1 << LOG) < n) LOG++;
        up.assign(LOG, vector<int>(n, -1));
        depth.assign(n, 0);
        up[0] = parent;
        for (int v = 1; v < n; v++) depth[v] = depth[parent[v]] + 1;   // parents come first
        for (int j = 1; j < LOG; j++)
            for (int v = 0; v < n; v++) {
                int mid = up[j - 1][v];
                up[j][v] = mid < 0 ? -1 : up[j - 1][mid];
            }
    }
    int kthAncestor(int v, int k) {
        for (int j = 0; j < LOG && v >= 0; j++)
            if (k >> j & 1) v = up[j][v];
        return k >> LOG ? -1 : v;       // k at least 2^LOG is deeper than any node
    }
    int lca(int a, int b) {
        if (depth[a] < depth[b]) swap(a, b);
        a = kthAncestor(a, depth[a] - depth[b]);        // lift the deeper node
        if (a == b) return a;
        for (int j = LOG - 1; j >= 0; j--)
            if (up[j][a] != up[j][b]) { a = up[j][a]; b = up[j][b]; }
        return up[0][a];
    }
    int distance(int a, int b) { return depth[a] + depth[b] - 2 * depth[lca(a, b)]; }
};`,
      },
      {
        title: "Implementation: Euler tour with a Fenwick tree for subtree queries",
        body: `Subtree range queries (the CSES problem) ask to update the value of a node, or to sum the values of a whole subtree. After an Euler tour numbers the nodes so that every subtree is a contiguous block, both become standard operations on a Fenwick tree (binary indexed tree): a point update at tin[v], and a range sum over [tin[v], tin[v] + size[v] - 1].

The DFS is written with an explicit stack so that a path of 200,000 nodes does not overflow the call stack. It assigns entry numbers in pre-order and accumulates sizes when it leaves a node.`,
        code: `struct Fenwick {
    int n;
    vector<long long> t;
    Fenwick(int n_) : n(n_), t(n_ + 1, 0) {}
    void add(int i, long long delta) { for (i++; i <= n; i += i & -i) t[i] += delta; }
    long long prefix(int i) { long long s = 0; for (i++; i > 0; i -= i & -i) s += t[i]; return s; }   // sum of [0, i]
    long long range(int l, int r) { return prefix(r) - (l ? prefix(l - 1) : 0); }
};

struct SubtreeQueries {
    vector<int> tin, sz;
    Fenwick fen;
    SubtreeQueries(int n, const vector<vector<int>>& g, const vector<long long>& value) : tin(n), sz(n, 1), fen(n) {
        vector<int> parent(n, -1), order;
        vector<int> st = {0};
        int timer = 0;
        while (!st.empty()) {                       // pre-order numbering
            int v = st.back(); st.pop_back();
            tin[v] = timer++;
            order.push_back(v);
            for (int c : g[v]) if (c != parent[v]) { parent[c] = v; st.push_back(c); }
        }
        for (int i = n - 1; i > 0; i--) sz[parent[order[i]]] += sz[order[i]];   // sizes, children first
        for (int v = 0; v < n; v++) fen.add(tin[v], value[v]);
    }
    void update(int v, long long oldValue, long long newValue) { fen.add(tin[v], newValue - oldValue); }
    long long subtreeSum(int v) { return fen.range(tin[v], tin[v] + sz[v] - 1); }
    bool isAncestor(int u, int v) { return tin[u] <= tin[v] && tin[v] < tin[u] + sz[u]; }
};`,
      },
      {
        title: "Variants",
        body: `Lowest common ancestor by the Euler tour and a sparse table: record the depth of every node at every visit in a tour of length 2n - 1, and the LCA of two nodes is the shallowest node between their first visits. A sparse table answers the minimum in O(1), so the queries cost O(1) after O(n log n) setup, a better bound than binary lifting.

Offline LCA with Tarjan's algorithm uses union-find during one DFS and answers all queries together in nearly linear time.

Binary lifting with weights stores, next to each jump, the maximum edge weight (or the sum) along it, so a path query such as the heaviest edge on the path between two nodes is the combination of the jumps used. It is how some minimum spanning tree problems are solved.

The k-th ancestor can also be done offline with a DFS that keeps the current root-to-node path in an array and reads index depth - k. It uses less memory when all the queries are known in advance.

Heavy-light decomposition cuts the tree into chains so that every path crosses O(log n) of them, and answers path updates and queries with a segment tree. It is the next step when you need updates, which binary lifting does not support.`,
      },
      {
        title: "Complexity",
        body: `Building the table is O(n log n) time and space, with log n about 17 to 20 for the usual limits. Each k-th ancestor and each LCA query is O(log n). The distance between two nodes follows from the LCA in the same time.

The Euler tour is O(n) to build. With a Fenwick tree, a point update and a subtree query are O(log n) each. A sparse table over the tour makes LCA queries O(1) with O(n log n) memory.

The memory of the lifting table is the usual concern: 20 rows for 10^6 nodes is 20 million integers. Reduce it by lifting only to the needed depth, or use the offline approach.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `The number of rows. It must cover the largest possible depth: with a chain of n nodes you need ceil(log2 n) rows. Too few rows silently give wrong answers for deep nodes.

The sentinel for a missing ancestor. For the k-th ancestor, jumping past the root must give -1 and every later jump must keep it. For LCA the root pointing to itself is convenient, but then the loop condition up[j][a] != up[j][b] still works only if the depths were equalised first.

Lifting in the wrong order in LCA. Try the largest jump first and go down. Going up in j can skip the right jump.

Order of construction. The table is filled row by row, and a row needs the previous one to be complete for every node, so the loop over j is outside the loop over nodes.

Recursion depth on a chain. A recursive DFS of 10^5 or more nodes can overflow. Use the explicit stack.

An Euler tour that numbers nodes after the traversal rather than on entry. The subtree range [tin, tin + size - 1] needs pre-order numbering.

Updates. Binary lifting is static. If edges or parents change, the table is stale; use link-cut trees or rebuild.`,
      },
      {
        title: "Practice order",
        body: `Start with Kth Ancestor of a Tree Node, which is the table and the bit loop and nothing more. Then add the LCA and the distance, and test them on the seven-node example above, checking the table entries by hand.

Then do the subtree range queries problem from the CSES set: build the Euler tour, a Fenwick tree and the two operations. Together these show the two ideas of the pattern: jump by powers of two, and flatten the tree into an array so that its subtrees become ranges.`,
      },
    ],
  },

  trie: {
    intro:
      "A trie stores strings as paths in a tree, one character per edge, so that all strings sharing a prefix share the beginning of their path. It answers prefix questions in time proportional to the length of the query, independent of how many words are stored, and the same structure over the bits of numbers answers maximum XOR queries.",
    sections: [
      {
        title: "The intuition",
        body: `A hash set can tell you whether a word is present, but it cannot tell you cheaply whether any word starts with a given prefix. Sorting the words and binary searching can, at O(m log n) for a prefix of length m. A trie does it in O(m), because the prefix is a path from the root: walk it, and if you can follow every character, some word has that prefix.

Each node represents a prefix. It has a child for each possible next character (an array of 26 for lowercase letters, or a map for a larger alphabet) and a flag that says that a stored word ends here. Inserting a word walks down creating missing nodes and sets the flag at the end. Searching walks down and checks the flag. Prefix search walks down and ignores the flag.

The trie pays off in two ways. It shares storage between words with common prefixes, and it lets you explore many words at once. Word Search II is the best example: instead of searching the board once for each word, you search the board once with the trie, following only paths that are prefixes of some word, and pruning as soon as the current path is not a prefix of anything.

Replace letters with bits and the idea carries over to numbers. A trie of the binary representations of numbers lets you pick, for each number, the stored number that is farthest in XOR: at each bit try to go to the child with the opposite bit, because a 1 in a higher bit is worth more than everything below it.`,
      },
      {
        title: "Why it works",
        body: `The path from the root to a node spells exactly one string, the prefix that the node represents, and two words that share a prefix share the corresponding nodes. So the words with a given prefix are exactly the words stored under the node at the end of that prefix's path. Insert, search and prefix queries each follow one path of at most m edges and do constant work per edge, so each costs O(m) whatever the number of words.

For the maximum XOR the argument is greedy and exact. Consider the bits from the most significant down. The XOR of two numbers is larger if it has a 1 at the highest bit where the candidates differ, whatever the lower bits are, because a single higher bit outweighs all lower bits together (2^k is greater than 2^k - 1, the sum of every lower bit). So at each level, if a child with the opposite bit exists, taking it is never worse than any alternative, and the result is optimal bit by bit. If it does not exist, there is no choice: you must follow the same bit.

The trie for Word Search II prunes correctly because any word found along a board path must have the path's string as a prefix, and the trie has a node for that prefix if and only if some word has it. If the node is missing, no extension of the path can ever match, so abandoning the path loses nothing.

Memory is the cost: up to 26 pointers per node and up to as many nodes as the total number of characters. For a large alphabet or sparse prefixes use a map or a sorted array in each node, or a compressed trie.`,
      },
      {
        title: "A worked example",
        body: `Insert the words "app", "apple" and "apt". The root has one child a. Under a one child p. Under p two children: p (towards app and apple) and t. The node for "app" has the end flag; it also has a child l, then p, then l, then e with the end flag ("apple"). The node for "apt" has the end flag.

Search "app": follow a, p, p, and the flag is set: found. Search "ap": the path exists but the flag at the second p is not set (the node for "ap" is not the end of a word): not found as a word, but startsWith("ap") is true. Search "apx": after a, p there is no child x: false.

Maximum XOR of Two Numbers in an Array with [3, 10, 5, 25, 2, 8] (the answer is 28 = 5 xor 25). With 5 bits, the numbers are 00011, 01010, 00101, 11001, 00010, 01000. Insert them all into a bit trie.
Query with 5 = 00101: the best partner has bits 11010 (the complement). At bit 4 the complement is 1, and 25 (11001) provides a 1: go there, XOR bit 1. At bit 3 the complement is 1, and 25 has a 1: go there, XOR bit 1. At bit 2 the bit of 5 is 1, so we want 0: 25 has 0 there: good, XOR bit 1. At bit 1 the bit of 5 is 0, so we want 1: 25 has 0, only that child exists: take it, XOR bit 0. At bit 0 the bit of 5 is 1, we want 0, 25 has 1: take it, XOR bit 0. The result is 11100 = 28.

The other numbers give at most 28 as well, so the maximum is 28.`,
      },
      {
        title: "Implementation",
        body: `The trie uses an array of 26 children per node stored in a pool, with indices as pointers, which is fast and avoids the cost of many small allocations. A node index of 0 is the root and also serves as the null child (nothing points back to the root).

Insert and the two queries are the same loop with different ending conditions. Add and Search Words with a wildcard dot needs recursion at each dot: try every child.`,
        code: `struct Trie {
    struct Node {
        int next[26];
        bool end = false;
        Node() { fill(next, next + 26, 0); }       // 0 means no child, the root is never a child
    };
    vector<Node> nodes;
    Trie() : nodes(1) {}
    void insert(const string& word) {
        int cur = 0;
        for (char ch : word) {
            int c = ch - 'a';
            if (!nodes[cur].next[c]) {
                nodes[cur].next[c] = nodes.size();
                nodes.emplace_back();
            }
            cur = nodes[cur].next[c];
        }
        nodes[cur].end = true;
    }
    int walk(const string& s) const {              // node after following s, or -1
        int cur = 0;
        for (char ch : s) {
            cur = nodes[cur].next[ch - 'a'];
            if (!cur) return -1;
        }
        return cur;
    }
    bool search(const string& word) const { int v = walk(word); return v >= 0 && nodes[v].end; }
    bool startsWith(const string& prefix) const { return walk(prefix) >= 0; }
};

// Search with '.' matching any single letter.
bool searchPattern(const Trie& t, int node, const string& pat, int i) {
    if (i == (int)pat.size()) return t.nodes[node].end;
    if (pat[i] == '.') {
        for (int c = 0; c < 26; c++) {
            int child = t.nodes[node].next[c];
            if (child && searchPattern(t, child, pat, i + 1)) return true;
        }
        return false;
    }
    int child = t.nodes[node].next[pat[i] - 'a'];
    return child && searchPattern(t, child, pat, i + 1);
}`,
      },
      {
        title: "Implementation: maximum XOR and Word Search II",
        body: `The bit trie has two children per node and uses 31 levels for non-negative ints. For each number, query the best partner among the numbers already inserted, then insert the number.

Word Search II builds a trie of the words and runs a DFS from every cell, descending the trie in step with the board. A word is recorded when the current node has the end flag, and to avoid reporting it twice the flag is cleared (or the word is stored in the node and then removed). Marking cells as visited by overwriting them with a sentinel character and restoring them after the recursion keeps the memory constant.`,
        code: `// Maximum XOR of two numbers, with a trie over the bits (most significant first).
struct BitTrie {
    vector<array<int, 2>> next;
    BitTrie() : next(1, array<int, 2>{0, 0}) {}
    void insert(int x) {
        int cur = 0;
        for (int b = 30; b >= 0; b--) {
            int bit = x >> b & 1;
            if (!next[cur][bit]) {
                next[cur][bit] = next.size();
                next.push_back({0, 0});
            }
            cur = next[cur][bit];
        }
    }
    int bestXor(int x) const {                      // the largest x xor y over stored y
        int cur = 0, result = 0;
        for (int b = 30; b >= 0; b--) {
            int want = (x >> b & 1) ^ 1;            // the opposite bit gives a 1 in the result
            if (next[cur][want]) { result |= 1 << b; cur = next[cur][want]; }
            else cur = next[cur][want ^ 1];
        }
        return result;
    }
};
int findMaximumXOR(const vector<int>& nums) {
    BitTrie t;
    int best = 0;
    for (int x : nums) {
        if (t.next.size() > 1) best = max(best, t.bestXor(x));
        t.insert(x);
    }
    return best;
}

// Word Search II: walk the board and the trie together.
struct BoardNode {
    int next[26];
    int wordId = -1;
    BoardNode() { fill(next, next + 26, -1); }
};
void boardDfs(vector<vector<char>>& board, int r, int c, int node, vector<BoardNode>& trie, vector<int>& found) {
    char ch = board[r][c];
    if (ch == '#') return;
    int nxt = trie[node].next[ch - 'a'];
    if (nxt < 0) return;                            // no word has this prefix: prune
    if (trie[nxt].wordId >= 0) { found.push_back(trie[nxt].wordId); trie[nxt].wordId = -1; }
    board[r][c] = '#';                              // mark as used on this path
    static const int dr[] = {1, -1, 0, 0}, dc[] = {0, 0, 1, -1};
    for (int d = 0; d < 4; d++) {
        int nr = r + dr[d], nc = c + dc[d];
        if (nr >= 0 && nr < (int)board.size() && nc >= 0 && nc < (int)board[0].size()) boardDfs(board, nr, nc, nxt, trie, found);
    }
    board[r][c] = ch;                               // undo
}
vector<string> findWords(vector<vector<char>> board, const vector<string>& words) {
    vector<BoardNode> trie(1);
    for (int id = 0; id < (int)words.size(); id++) {
        int cur = 0;
        for (char ch : words[id]) {
            int c = ch - 'a';
            if (trie[cur].next[c] < 0) { trie[cur].next[c] = trie.size(); trie.emplace_back(); }
            cur = trie[cur].next[c];
        }
        trie[cur].wordId = id;
    }
    vector<int> found;
    for (int r = 0; r < (int)board.size(); r++)
        for (int c = 0; c < (int)board[0].size(); c++) boardDfs(board, r, c, 0, trie, found);
    vector<string> out;
    for (int id : found) out.push_back(words[id]);
    return out;
}`,
      },
      {
        title: "Variants",
        body: `Storing counts in each node (how many words pass through it) answers how many words have a given prefix, and with a delete operation decrements the counts and frees nodes that reach zero.

Autocomplete keeps, at each node, the best few completions, or does a DFS below the node of the prefix and collects words in alphabetical order, which is natural because children are visited in letter order.

A trie over reversed words handles suffix queries. Two tries together handle prefix and suffix (Prefix and Suffix Search).

The compressed trie (radix tree) merges chains of single-child nodes into one edge labelled with a string, and the suffix trie and the Aho-Corasick automaton add links that let you find many patterns in a text in one pass.

For number problems the bit trie also handles the maximum XOR of a subarray with prefix XORs, the maximum XOR with a query value, and the count of pairs with XOR below a limit by walking the bits of the limit.

Using a hash set of prefixes is a lighter alternative when the only query is a prefix test, at the price of hashing each prefix.`,
      },
      {
        title: "Complexity",
        body: `Insert, search and prefix query are O(m) for a word of length m. Building a trie of all the words costs the total number of characters, L. Memory is O(L * alphabet) with arrays and O(L) with maps.

Maximum XOR is O(n * B) with B the number of bits (31), which is effectively linear, against O(n^2) for trying all pairs.

Word Search II costs O(cells * 4 * 3^(L - 1)) in the worst case for a longest word of length L, since the path never goes back to the cell it came from, but pruning on the trie makes it much faster in practice: every path that is not a prefix of some word stops at once. Removing words from the trie once they are found prunes further.

Be careful with memory for large dictionaries: a trie of 10^6 characters with 26 ints per node needs about 100 MB. Use maps or compress if limits are tight.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Confusing a prefix with a word. search needs the end flag and startsWith does not. Forgetting the flag makes "app" appear as a word when only "apple" was inserted.

The root as null. In the array version a child index of 0 means missing, which works only because the root is never a child. If you use -1 or pointers, be consistent.

Empty strings. Inserting "" sets the end flag at the root. Decide whether the problem allows it.

Character sets. The arrays above assume lowercase letters. For other characters map them first, or use a map in each node.

Word Search II reporting duplicates. If a word can be reached by two paths, clear its marker the first time, or collect results in a set.

Not restoring the board. Every recursive call that marks a cell must unmark it before returning, otherwise later paths see a damaged board.

Maximum XOR with the first element. Querying an empty trie returns garbage; the code above skips the query for the first insertion. Using 31 bit levels is right for values below 2^31.

Deep recursion for patterns with many wildcards is bounded by the pattern length, which is small, so recursion is fine there.`,
      },
      {
        title: "Practice order",
        body: `Start with Implement Trie (Prefix Tree), until insert, search and startsWith are automatic. Then Design Add and Search Words Data Structure, which adds the wildcard recursion. Then Maximum XOR of Two Numbers in an Array, where the trie is over bits and the greedy argument carries the solution. Finish with Word Search II, the hardest, where a trie and a backtracking search work together and pruning is what makes it pass.

When you finish, solve Maximum XOR again by a different method (sorting and checking bit prefixes with a hash set), and compare. Knowing that both exist, and why the trie is the more direct one, is what an interviewer wants to hear.`,
      },
    ],
  },
};
