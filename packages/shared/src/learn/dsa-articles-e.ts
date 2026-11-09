import type { PatternArticle } from "./types";

// Full pattern articles, group "Trees" (plan 0008, batch 4): tree-dfs, tree-bfs, tree-construct, bst, tree-dp,
// binary-lifting, trie. Format and rules: plan 0007. Code is C++17. Blocks of one article are concatenated and
// compiled together, so helper names are unique per article.

export const DSA_ARTICLES_E: Record<string, PatternArticle> = {
  "tree-dfs": {
    intro:
      "Depth-first recursion on a binary tree turns a question about the whole tree into the same question about each node and its two subtrees. You reach for it when the answer is a depth, a path, a validity check, or the lowest node with some property, and the work at a node needs only what its children report back, or what its parent passes down.",
    sections: [
      {
        title: "The intuition",
        body: `A binary tree is defined recursively: it is empty, or it is a node with a left tree and a right tree. A function that follows that definition needs only two parts: what to answer for an empty tree (the base case), and how to combine the node with the answers for its two subtrees. If you can say those two sentences, the code is five lines.

There are three moments at which a recursive visit can do work. Before the recursive calls (pre-order), the node knows what its ancestors told it: a lower and upper bound, a running sum, the depth so far. Between the two calls (in-order), the left subtree is finished and the right is not, which for a binary search tree means the values come out sorted. After both calls (post-order), the node knows everything about both subtrees and can combine it: heights, sizes, sums, whether each side is valid.

So the first decision in every tree problem is the direction of information. Does the node need something from above (pass it down as a parameter) or something from below (return it up)? Validate BST needs bounds from above. Diameter needs heights from below. Lowest common ancestor needs a report from below. Some need both, and then you pass parameters down and return values up in the same function.

The second decision is what the function returns, versus what it records on the side. A recurring trick is that the value you return to the parent is not the answer you are looking for. In Diameter of Binary Tree you return the height of the subtree (the parent needs it), but you update a global best with the longest path that bends at this node. Keeping those two apart removes most of the confusion in the hard problems, such as Binary Tree Maximum Path Sum.`,
      },
      {
        title: "Why it works",
        body: `The recursion is correct by induction on the structure of the tree. Assume the function gives the right answer for every subtree smaller than the current one. The node's own answer is a fixed function of its value and those two smaller answers, so it is right too. The base case anchors the induction. Nothing else is needed, which is why tree recursion is so reliable once the two parts are stated correctly.

The cost argument is just as short. Every node is visited once, and the work at a node is constant (a comparison, an addition, a max), so the total is O(n). The extra space is the call stack, whose depth is the height of the tree: O(log n) for a balanced tree and O(n) for a chain.

For problems that need a path, the key fact is that every path in a tree has a unique highest node, its top. A path that goes down-left and then down-right bends exactly at that node. So the best path overall is the best over all nodes of the best path that has that node as its top. At a node the best bent path is the node plus the best downward path into the left plus the best downward path into the right, and the best downward path is what you return to your parent: the node plus the better of its two downward paths. That is the whole trick behind Diameter and Maximum Path Sum.

Validation problems use the same idea from above. A node in a binary search tree must lie strictly between the largest value that must be smaller than it and the smallest value that must be larger. Going left tightens the upper bound to the node's value, going right tightens the lower bound. Comparing a node only with its parent is not enough, and the bounds are the minimal information that makes it enough.`,
      },
      {
        title: "A worked example",
        body: `Take Diameter of Binary Tree on this tree. Node 1 has left child 2 and right child 3, and node 2 has children 4 and 5. The diameter is the number of edges on the longest path between any two nodes.

The function height(node) returns the height of the subtree in nodes (0 for empty), and before returning it updates best = max(best, left + right), which is the number of edges on the longest path that bends at this node.

Trace, in the order the calls finish (post-order):
node 4: left 0, right 0. best = max(0, 0) = 0. returns 1.
node 5: left 0, right 0. best stays 0. returns 1.
node 2: left 1, right 1. best = max(0, 2) = 2. returns 2.
node 3: left 0, right 0. best stays 2. returns 1.
node 1: left 2, right 1. best = max(2, 3) = 3. returns 3.

The answer is 3: the path 4, 2, 1, 3 has three edges (so does 5, 2, 1, 3). Notice that the returned value at node 1 is 3, which is a height, and that the answer 3 is the same number only by coincidence of this small tree. In a tree where the longest path avoids the root, the two differ, and that is exactly why the answer lives in a variable outside the recursion.

For Validate BST on the tree with root 5, left child 1, right child 6 whose left child is 3 and right child is 7, the calls carry bounds. Node 5 gets (-inf, +inf). Node 1 gets (-inf, 5): fine. Node 6 gets (5, +inf): fine. Node 3 gets (5, 6) because it is the left child of 6: 3 is not greater than 5, so the tree is invalid, although 3 is smaller than its parent 6. A check against the parent alone would have accepted it.`,
      },
      {
        title: "Implementation",
        body: `The four classic functions, each a few lines. They share one node type.

Diameter keeps the best in a reference and returns the height. Validate BST passes long long bounds so that a node holding INT_MIN or INT_MAX is handled; with int bounds the sentinels would collide with real values. The lowest common ancestor returns the node itself when it finds p or q, returns null for an empty tree, and the first node that receives a non-null answer from both sides is the answer. Maximum Path Sum clamps negative downward gains to zero: a path never has to take a branch that makes it worse.`,
        code: `struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int v) : val(v), left(nullptr), right(nullptr) {}
};

// Diameter in edges. height() returns nodes on the longest downward path.
int diameterHeight(TreeNode* node, int& best) {
    if (!node) return 0;
    int l = diameterHeight(node->left, best);
    int r = diameterHeight(node->right, best);
    best = max(best, l + r);              // longest path that bends at this node
    return 1 + max(l, r);                 // what the parent can use
}
int diameterOfBinaryTree(TreeNode* root) {
    int best = 0;
    diameterHeight(root, best);
    return best;
}

// Validate BST: bounds come down, strictly between lo and hi.
bool validBst(TreeNode* node, long long lo, long long hi) {
    if (!node) return true;
    if (node->val <= lo || node->val >= hi) return false;
    return validBst(node->left, lo, node->val) && validBst(node->right, node->val, hi);
}
bool isValidBST(TreeNode* root) { return validBst(root, LLONG_MIN, LLONG_MAX); }

// Lowest common ancestor of p and q (both exist in the tree).
TreeNode* lowestCommonAncestor(TreeNode* root, TreeNode* p, TreeNode* q) {
    if (!root || root == p || root == q) return root;
    TreeNode* l = lowestCommonAncestor(root->left, p, q);
    TreeNode* r = lowestCommonAncestor(root->right, p, q);
    if (l && r) return root;              // p and q are on different sides
    return l ? l : r;
}

// Maximum path sum: gain() is the best downward path starting at node.
int pathGain(TreeNode* node, int& best) {
    if (!node) return 0;
    int l = max(0, pathGain(node->left, best));    // drop a branch that hurts
    int r = max(0, pathGain(node->right, best));
    best = max(best, node->val + l + r);           // path bending at node
    return node->val + max(l, r);
}
int maxPathSum(TreeNode* root) {
    int best = INT_MIN;
    pathGain(root, best);
    return best;
}`,
      },
      {
        title: "Implementation: depth without recursion, and root-to-leaf paths",
        body: `Recursion depth equals the height of the tree, which for a linked-list-shaped tree of 100,000 nodes will overflow the stack. The iterative forms use an explicit stack and are worth knowing. Iterative in-order is the standard one: go left as far as possible pushing nodes, pop one, visit it, then move to its right child.

Problems that ask for all root-to-leaf paths with some property (Path Sum II, Binary Tree Paths) use backtracking on top of the same traversal: push the node on a shared vector before recursing, pop it after, and copy the vector only at a leaf. The pop is what keeps the vector equal to the current path as the recursion unwinds.`,
        code: `// Iterative in-order traversal with an explicit stack.
vector<int> inorderIterative(TreeNode* root) {
    vector<int> out;
    stack<TreeNode*> st;
    TreeNode* cur = root;
    while (cur || !st.empty()) {
        while (cur) { st.push(cur); cur = cur->left; }
        cur = st.top(); st.pop();
        out.push_back(cur->val);
        cur = cur->right;
    }
    return out;
}

// All root-to-leaf paths whose values add up to target (backtracking on a shared path).
void collectPaths(TreeNode* node, int remaining, vector<int>& path, vector<vector<int>>& out) {
    if (!node) return;
    path.push_back(node->val);
    remaining -= node->val;
    if (!node->left && !node->right && remaining == 0) out.push_back(path);
    collectPaths(node->left, remaining, path, out);
    collectPaths(node->right, remaining, path, out);
    path.pop_back();                       // undo before returning to the parent
}`,
      },
      {
        title: "Variants",
        body: `Parameters down, values up, or both: the same function shape covers most problems. Max Depth returns a value up. Path Sum passes the remaining sum down. Count Good Nodes passes the maximum so far down and returns a count up.

Parent pointers or a parent map turn the tree into an undirected graph, which you need when a problem asks about distance from a target node (All Nodes Distance K): a plain DFS cannot go upward, so you record parents in one pass and then search outwards.

Euler tour and tin/tout times record when each node is entered and left. They answer "is u an ancestor of v" in O(1) after one DFS, and are the basis of the binary lifting article.

Morris traversal visits all nodes in-order with O(1) extra space by temporarily threading the tree, at the price of modifying and then restoring it. It is rare in interviews but is the right answer to "do it without a stack and without recursion".

Serialising the result of a DFS, for instance as the string of a subtree, lets you find duplicate subtrees with a hash map, which is the post-order idea used to build a canonical form from the bottom up.`,
      },
      {
        title: "Complexity",
        body: `Time is O(n) for every function above: each node is visited once with constant work. A traversal that copies a path at every leaf, as in the path-collecting version, costs O(n) per output path in the worst case, so the total can be O(n log n) for a balanced tree and O(n^2) for a skewed one when many leaves match.

Space is O(h) for the call stack or the explicit stack, with h the height: about log2 n for a balanced tree, n for a chain. Morris traversal is the only variant that uses O(1). Say which of the two cases you mean, because interviewers listen for it.

The memory for the results is separate. A list of all paths is output-sensitive, and it is fair to state the answer's size next to the running time.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `The empty tree. Every function above has a base case for a null node, and the answer for it must be chosen deliberately: height 0, validity true, sum 0 (but for Maximum Path Sum the answer for a tree of one negative node is that node's value, which is why best starts at INT_MIN and not at 0).

Bounds in Validate BST. Use long long so that a node holding INT_MIN or INT_MAX is not confused with the sentinel, and use strict comparisons, because a binary search tree has no duplicates in the usual definition. The most common wrong solution compares each node with its parent only.

Height in nodes versus edges. Diameter asks for edges, and the code above gets it as the sum of two heights counted in nodes below. Decide the unit once and write it in a comment.

Returning the wrong thing. If you return the best bent path to the parent, the parent can build a path with a fork in the middle of its branch, which is not a path. Return the best downward path and record the bent one.

LCA when one of the nodes may be missing. The code above assumes both exist. If not, count how many of p and q were found and only trust a result when both were.

Stack depth. Tell the interviewer that recursion on a degenerate tree of 10^5 or more nodes needs an iterative version, then write it if asked.`,
      },
      {
        title: "Practice order",
        body: `Start with Diameter of Binary Tree, which isolates the idea that the returned value and the answer are different things. Then Validate Binary Search Tree, to feel information flowing downward as bounds. Then Lowest Common Ancestor of a Binary Tree, where the return value is a node that the first ancestor to see two reports keeps. Finish with Binary Tree Maximum Path Sum, which is Diameter with values, negative numbers and the clamp.

After those four, redo each from memory with the other direction of information: write Diameter with an explicit stack, and Validate BST as an in-order check that every value is greater than the previous one. Being able to write both versions is what shows you understand the pattern and did not memorise a template.`,
      },
    ],
  },

  "tree-bfs": {
    intro:
      "Breadth-first search on a tree visits nodes level by level using a queue. It is the tool when the answer is organised by depth: the nodes of each level, the rightmost node of each level, the shortest distance from the root, or an ordering by column and row. A queue gives you the levels for free because nodes leave it in the order they were discovered.",
    sections: [
      {
        title: "The intuition",
        body: `A queue is first in, first out. If you start with the root, and every time you take a node out you put its children in, then the queue always holds a contiguous stretch of the tree: the rest of the current level followed by the beginning of the next. Nodes come out level by level, left to right, without any bookkeeping about depth.

Most problems need to know where a level ends. The cleanest way is to freeze the size of the queue at the start of each round: that many nodes are exactly the current level. Process that many, and whatever the queue holds when you finish is the next level. The code is a loop inside a loop, and the inner loop is one level.

Once you see levels as a unit, the problems become small variations. Level Order Traversal collects the values of each round. Right Side View takes the last node of each round. Zigzag reverses every second round. Averages and maximums per level fold the values of a round. Minimum Depth stops at the first round that contains a leaf.

The harder variation, Vertical Order Traversal, organises nodes by column instead of by depth. You still do a traversal that carries extra coordinates with each node (row and column), but then you need to group and sort by them. The queue is there only to reach every node with its coordinates; the interesting data structure is the map from column to the list of rows and values.`,
      },
      {
        title: "Why it works",
        body: `The invariant is that at the start of each round the queue contains exactly the nodes at depth d, in left-to-right order, and nothing else. It is true for d = 0 with the root alone. During the round, each node at depth d is removed and its children, which are at depth d + 1, are appended. Because the nodes of depth d were in left-to-right order, their children are appended in left-to-right order too (left child before right child of each node, nodes in order). When the round ends, the queue holds exactly the nodes of depth d + 1, so the invariant continues.

This is also why BFS finds shortest paths in an unweighted graph, and a tree is the special case where there is only one path anyway. The first time you reach a node is at the smallest possible depth, because all nodes of smaller depth were taken out before it.

The cost is easy to see. Each node is added once and removed once, with constant work for each, so time is O(n). The queue holds at most one level plus part of the next, so space is O(w), where w is the maximum width of the tree. For a complete binary tree that is about n / 2, which is larger than the O(log n) of a depth-first recursion, and it is the reason to prefer DFS when the problem does not need levels.

For the vertical order problem, correctness depends on the tie-break rule. Nodes with the same row and column are ordered by value; nodes in the same column are ordered by row first. Sorting the triples (column, row, value) gives exactly this, and it does not matter in which order the traversal found them.`,
      },
      {
        title: "A worked example",
        body: `Level Order Traversal on the tree with root 3, left child 9, and right child 20 which has children 15 and 7.

The queue starts as [3]. Round 1: size is 1. Take 3, record 3, append 9 and 20. Level is [3], queue is [9, 20].
Round 2: size is 2. Take 9, record 9 (no children). Take 20, record 20, append 15 and 7. Level is [9, 20], queue is [15, 7].
Round 3: size is 2. Take 15 and 7, record both, no children. Level is [15, 7], queue is empty. The loop ends.
Result: [[3], [9, 20], [15, 7]].

Right Side View on the same tree takes the last value of each round: 3, then 20, then 7. The answer is [3, 20, 7].

Vertical Order Traversal on the same tree carries (row, column). The root 3 is at (0, 0). Its left child 9 is at (1, -1) and the right child 20 at (1, 1). The children of 20: 15 at (2, 0) and 7 at (2, 2). Group by column, and within a column sort by row, then value: column -1 has 9. Column 0 has 3 at row 0 and 15 at row 2, so [3, 15]. Column 1 has 20. Column 2 has 7. Reading the columns from left to right gives [[9], [3, 15], [20], [7]].

Notice that 15 lands in the same column as the root although it is two levels below. A level-by-level view cannot show that, and this is the reason the problem is rated hard.`,
      },
      {
        title: "Implementation",
        body: `The level loop with a frozen size is the core. Right Side View and the other per-level problems only change what is done inside the inner loop. The vertical order function stores, for each column, a list of (row, value) pairs in an ordered map, then sorts each list.`,
        code: `struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int v) : val(v), left(nullptr), right(nullptr) {}
};

// Level order: one inner loop per level, using the queue size frozen at the start of the round.
vector<vector<int>> levelOrder(TreeNode* root) {
    vector<vector<int>> out;
    if (!root) return out;
    queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        int size = q.size();                 // exactly the nodes of this level
        vector<int> level;
        for (int i = 0; i < size; i++) {
            TreeNode* node = q.front(); q.pop();
            level.push_back(node->val);
            if (node->left) q.push(node->left);
            if (node->right) q.push(node->right);
        }
        out.push_back(level);
    }
    return out;
}

// Right side view: the last node of each level.
vector<int> rightSideView(TreeNode* root) {
    vector<int> out;
    if (!root) return out;
    queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        int size = q.size();
        for (int i = 0; i < size; i++) {
            TreeNode* node = q.front(); q.pop();
            if (i == size - 1) out.push_back(node->val);
            if (node->left) q.push(node->left);
            if (node->right) q.push(node->right);
        }
    }
    return out;
}

// Vertical order: carry (row, col), group by column, sort each column by (row, value).
vector<vector<int>> verticalTraversal(TreeNode* root) {
    map<int, vector<pair<int, int>>> columns;       // col -> (row, value)
    queue<tuple<TreeNode*, int, int>> q;
    if (root) q.push({root, 0, 0});
    while (!q.empty()) {
        auto [node, row, col] = q.front(); q.pop();
        columns[col].push_back({row, node->val});
        if (node->left) q.push({node->left, row + 1, col - 1});
        if (node->right) q.push({node->right, row + 1, col + 1});
    }
    vector<vector<int>> out;
    for (auto& [col, items] : columns) {
        sort(items.begin(), items.end());           // by row, then by value
        vector<int> values;
        for (auto& item : items) values.push_back(item.second);
        out.push_back(values);
    }
    return out;
}`,
      },
      {
        title: "Implementation: shortest distance and zigzag",
        body: `When the problem asks for the minimum depth or the number of steps to reach a node, BFS can stop as soon as it finds what it wants, which is faster than a full depth-first scan: the first leaf found in BFS order is a leaf at the minimum depth. Count rounds instead of storing levels.

Zigzag level order keeps the same loop and flips a flag after each round. Instead of reversing, write the values into the right place of a pre-sized vector: index i for a left-to-right level and size - 1 - i for a right-to-left level.`,
        code: `// Minimum depth in nodes: the first round that contains a leaf.
int minDepth(TreeNode* root) {
    if (!root) return 0;
    queue<TreeNode*> q;
    q.push(root);
    int depth = 0;
    while (!q.empty()) {
        depth++;
        int size = q.size();
        for (int i = 0; i < size; i++) {
            TreeNode* node = q.front(); q.pop();
            if (!node->left && !node->right) return depth;
            if (node->left) q.push(node->left);
            if (node->right) q.push(node->right);
        }
    }
    return depth;
}

// Zigzag level order: fill each level from the left, then from the right, alternately.
vector<vector<int>> zigzagLevelOrder(TreeNode* root) {
    vector<vector<int>> out;
    if (!root) return out;
    queue<TreeNode*> q;
    q.push(root);
    bool leftToRight = true;
    while (!q.empty()) {
        int size = q.size();
        vector<int> level(size);
        for (int i = 0; i < size; i++) {
            TreeNode* node = q.front(); q.pop();
            level[leftToRight ? i : size - 1 - i] = node->val;
            if (node->left) q.push(node->left);
            if (node->right) q.push(node->right);
        }
        out.push_back(level);
        leftToRight = !leftToRight;
    }
    return out;
}`,
      },
      {
        title: "Variants",
        body: `Multi-source BFS starts with several nodes in the queue at once, for example all rotten oranges or all 0 cells. The level loop then measures distance to the nearest source. It is the graph version of the same idea and appears in the graph articles.

BFS on a tree turned into a graph, with parent pointers, lets you search outward from any node: All Nodes Distance K Apart and Amount of Time for a Binary Tree to Be Infected use it. Build the parent map in one DFS, then run a BFS from the target with a visited set.

Bottom-up level order is the same loop with the list of levels reversed at the end. Level averages, maximums and widths fold each round. The width of a tree counts the gap between the leftmost and rightmost node of a level including nulls, so you number the nodes as in a heap (child of i is 2i and 2i + 1) and subtract the first and last index of each round; use unsigned or normalised indices to avoid overflow.

An N-ary tree uses the same code with a loop over children instead of left and right.

DFS can also compute per-level results by passing the depth as a parameter and writing into out[depth]. It uses less memory on a wide tree, and it is worth mentioning when the interviewer asks for O(h) space.`,
      },
      {
        title: "Complexity",
        body: `Time is O(n): every node enters and leaves the queue once. The vertical order version adds the sort: O(n log n) in the worst case, when most nodes share a column.

Space is O(w) for the queue, where w is the widest level. That is up to n / 2 for a complete tree and 1 for a chain. The output is separate and has n values.

If the interviewer asks to reduce the space on a wide tree, the DFS with a depth parameter uses O(h) for the recursion plus the output, which is better when h is much smaller than w.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Reading q.size() inside the loop condition. The size changes as you push children, so a loop written as for i < q.size() processes more than one level. Copy the size into a variable before the loop.

The empty tree. Return an empty result before you push a null root, or the first pop will dereference null.

Level order with null children. Do not push null children unless the problem needs the positions of the nulls (width of a tree, serialisation). Pushing them everywhere makes the queue grow and breaks the size logic.

Vertical order ties. When two nodes share a row and a column they must be sorted by value, which is why the pair (row, value) is sorted and not just the order of arrival. A solution that relies on BFS order alone passes many tests and fails on this one.

Integer overflow in the width problem. The heap-style index doubles at every level and overflows int at depth 31. Subtract the first index of each level from all others to keep the numbers small.

Using BFS where DFS is simpler. For a plain depth or a path property, recursion is shorter and uses less memory. Use BFS when the problem is about levels or the nearest of something.`,
      },
      {
        title: "Practice order",
        body: `Start with Binary Tree Level Order Traversal until you can write the frozen-size loop without thinking. Then Binary Tree Right Side View, which changes one line. Then Vertical Order Traversal of a Binary Tree, which is the same traversal feeding a map and a sort, and is where the coordinates and the tie-break rule matter.

Then redo Right Side View with a DFS that visits the right child first and records the first node seen at each depth. Comparing the two solutions shows what the queue gives you and what a depth parameter gives you, which is the question an interviewer will ask.`,
      },
    ],
  },

  "tree-construct": {
    intro:
      "A binary tree is not determined by one traversal, but it is determined by two of the right kind, for example pre-order with in-order, and by one traversal if the missing children are written down. Constructing a tree from its traversals, and serialising and rebuilding it, are the same recursion in two directions: find the root, split the rest into a left part and a right part, and recurse on each part.",
    sections: [
      {
        title: "The intuition",
        body: `Look at what each traversal tells you. Pre-order lists the root first, then the whole left subtree, then the whole right subtree. In-order lists the whole left subtree, then the root, then the whole right subtree. Alone, neither is enough: many different trees have the same pre-order. But together they pin the tree down. The first element of the pre-order is the root. Find that value in the in-order, and everything to its left is the left subtree, everything to its right is the right subtree. Now you know how many nodes the left subtree has, so you know exactly which block of the pre-order belongs to the left subtree and which to the right. Recurse with those two pairs of blocks.

The whole algorithm is: pick the root from one traversal, use the other traversal to find where it splits, and recurse. The cost of the split is finding the root in the in-order, which a hash map from value to index makes constant, as long as the values are distinct.

Serialisation reverses the direction. To store a tree as text, write a pre-order traversal and put an explicit marker for every missing child, for example #. The marker removes the ambiguity that made one traversal insufficient: reading the string left to right, each token is either a marker (an empty subtree, done) or a value (a node, and the next tokens describe its left subtree and then its right). The deserialiser is a recursive function that consumes tokens from a stream.`,
      },
      {
        title: "Why it works",
        body: `For the two-traversal construction, correctness follows from the shapes of the sequences. In a pre-order sequence of a tree, the root is first and the left subtree occupies the next L positions, where L is the size of the left subtree. In the in-order sequence, the root sits at index L (counting from the start of the block) with the left subtree before it. Finding the root in the in-order gives L, and with L the pre-order block splits into [root], [L nodes], [the rest]. Each of the three parts is the traversal of a smaller tree, so the recursion is well founded, and every node is placed exactly once.

Why distinct values matter. If a value repeated, finding the root in the in-order would be ambiguous: two positions would be possible, and different trees fit the same pair of traversals. Problems state that values are unique for this reason.

Why pre-order and post-order are not enough without extra information. They say who the root is, but not where the left subtree ends, since neither separates left from right. If every internal node has exactly two children (a full tree) there is a unique tree; otherwise there are several. In-order is the traversal that carries the split point, which is why it is in every pair.

The serialisation is correct because the pre-order with markers is a prefix code: a complete description of a tree ends exactly when its two subtrees are described, so no description is a proper prefix of another, and a left-to-right parse is unambiguous. The deserialiser never needs to look ahead more than one token.

Time is O(n): each node is created once and each hash lookup is O(1). Without the hash map, searching the in-order for the root costs O(n) per node and the whole construction is O(n^2) on a skewed tree.`,
      },
      {
        title: "A worked example",
        body: `Construct the tree from pre-order [3, 9, 20, 15, 7] and in-order [9, 3, 15, 20, 7].

Build a map from value to in-order index: 9 to 0, 3 to 1, 15 to 2, 20 to 3, 7 to 4.

Call build over pre-order position 0 with in-order range [0, 4]. The root is pre[0] = 3, at in-order index 1. The left part is in-order [0, 0] (one node), so the left subtree has 1 node; the right part is in-order [2, 4] (three nodes).
Left call: next pre-order element (position 1) is 9, at index 0. Range [0, -1] on the left and [1, 0] on the right are both empty, so 9 is a leaf.
Right call: next pre-order element (position 2) is 20, at index 3. Its left part is in-order [2, 2] and its right part is [4, 4].
Left of 20: the next element (position 3) is 15, at index 2, a leaf. Right of 20: the next element (position 4) is 7, at index 4, a leaf.

The tree is 3 with left 9 and right 20, and 20 has children 15 and 7. Notice that the pre-order position only moves forward by one for each node created, and the in-order range is what tells each call when to stop: a range with low greater than high means an empty subtree.

Serialising this tree in pre-order with markers gives 3,9,#,#,20,15,#,#,7,#,#. Reading it back: 3 is a node; then parse the left subtree: 9 is a node, its left is #, its right is #, done; then parse the right subtree: 20, its left is 15 with two markers, its right is 7 with two markers. The tokens are used up exactly when the tree is complete.`,
      },
      {
        title: "Implementation",
        body: `The builder keeps a single moving index into the pre-order, and each call is defined by an in-order range. The order of the two recursive calls matters: the left subtree must be built first, because the pre-order lists it first and the index advances as nodes are created.

The serialiser writes tokens separated by commas, and the deserialiser reads them with a string stream. Values may be negative or have several digits, so tokens are split by the separator and not by character.`,
        code: `struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int v) : val(v), left(nullptr), right(nullptr) {}
};

// Rebuild from pre-order and in-order (values are distinct).
TreeNode* buildFrom(const vector<int>& pre, int& next, int lo, int hi, const unordered_map<int, int>& where) {
    if (lo > hi) return nullptr;
    TreeNode* node = new TreeNode(pre[next++]);      // the next pre-order value is the root of this range
    int mid = where.at(node->val);                   // where it splits the in-order range
    node->left = buildFrom(pre, next, lo, mid - 1, where);    // left first: pre-order lists it first
    node->right = buildFrom(pre, next, mid + 1, hi, where);
    return node;
}
TreeNode* buildTree(const vector<int>& preorder, const vector<int>& inorder) {
    unordered_map<int, int> where;
    for (int i = 0; i < (int)inorder.size(); i++) where[inorder[i]] = i;
    int next = 0;
    return buildFrom(preorder, next, 0, (int)inorder.size() - 1, where);
}

// Serialise with markers for missing children, then parse it back.
void writeTree(TreeNode* node, string& out) {
    if (!node) { out += "#,"; return; }
    out += to_string(node->val) + ",";
    writeTree(node->left, out);
    writeTree(node->right, out);
}
string serialize(TreeNode* root) {
    string out;
    writeTree(root, out);
    return out;
}
TreeNode* readTree(istringstream& in) {
    string token;
    if (!getline(in, token, ',')) return nullptr;
    if (token == "#") return nullptr;
    TreeNode* node = new TreeNode(stoi(token));
    node->left = readTree(in);
    node->right = readTree(in);
    return node;
}
TreeNode* deserialize(const string& data) {
    istringstream in(data);
    return readTree(in);
}`,
      },
      {
        title: "Implementation: in-order and post-order, and level order serialisation",
        body: `Building from in-order and post-order is the mirror image. The root is the last element of the post-order, and the right subtree comes just before it, so consume the post-order from the back and build the right subtree first.

Level-order serialisation is what LeetCode itself uses for its tree format. Write nodes level by level with a marker for missing children, using a queue. The reader pops a node, reads two tokens, and attaches children that are not markers. It is the BFS version of the same idea, and it needs no recursion, which is useful for very deep trees.`,
        code: `// Build from in-order and post-order: consume post-order from the back, right subtree first.
TreeNode* buildPost(const vector<int>& post, int& next, int lo, int hi, const unordered_map<int, int>& pos) {
    if (lo > hi) return nullptr;
    TreeNode* node = new TreeNode(post[next--]);
    int mid = pos.at(node->val);
    node->right = buildPost(post, next, mid + 1, hi, pos);
    node->left = buildPost(post, next, lo, mid - 1, pos);
    return node;
}
TreeNode* buildTreePost(const vector<int>& inorder, const vector<int>& postorder) {
    unordered_map<int, int> pos;
    for (int i = 0; i < (int)inorder.size(); i++) pos[inorder[i]] = i;
    int next = (int)postorder.size() - 1;
    return buildPost(postorder, next, 0, (int)inorder.size() - 1, pos);
}

// Level-order serialisation with a queue, no recursion.
string serializeLevels(TreeNode* root) {
    string out;
    queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        TreeNode* node = q.front(); q.pop();
        if (!node) { out += "#,"; continue; }
        out += to_string(node->val) + ",";
        q.push(node->left);
        q.push(node->right);
    }
    return out;
}
TreeNode* deserializeLevels(const string& data) {
    istringstream in(data);
    string token;
    getline(in, token, ',');
    if (token == "#") return nullptr;
    TreeNode* root = new TreeNode(stoi(token));
    queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        TreeNode* node = q.front(); q.pop();
        for (int side = 0; side < 2; side++) {
            if (!getline(in, token, ',') || token == "#") continue;
            TreeNode* child = new TreeNode(stoi(token));
            (side == 0 ? node->left : node->right) = child;
            q.push(child);
        }
    }
    return root;
}`,
      },
      {
        title: "Variants",
        body: `Which pairs of traversals determine a tree: pre-order with in-order, post-order with in-order, and level-order with in-order (find the root as the first level-order element that lies in the current in-order range). Pre-order with post-order determines a unique tree only if it is a full binary tree; Construct Binary Tree from Preorder and Postorder Traversal accepts any valid answer and uses the second pre-order element as the left child.

Constructing a binary search tree is easier: a BST is determined by its pre-order alone. The root is the first value, and the left subtree is the run of values smaller than it. You can do it in O(n) with the same moving-index trick and an upper bound instead of an in-order range: build the left subtree while the next value is below the node's value, then the right subtree while it is below the node's bound.

A sorted array becomes a height-balanced BST by taking the middle element as the root and recursing on each half.

Serialising an N-ary tree writes the number of children after each value, or a marker after the last child.

Finding duplicate subtrees serialises every subtree bottom-up and counts the strings in a hash map. The string is the canonical form, and the construction idea (a complete description with markers) is what makes it unambiguous.`,
      },
      {
        title: "Complexity",
        body: `Building from two traversals with a hash map: O(n) time, because each node is created once and each lookup is constant, and O(n) space for the map plus O(h) for the recursion. Without the map the lookup is a linear scan and the time becomes O(n^2) in the worst case, which is the usual reason this problem is asked: to see whether you reach for the map.

Serialisation and deserialisation are O(n) in time and in the size of the string. The string has about 2n + 1 tokens, one per node and one per missing child.

Recursion depth is the height of the tree. For a very skewed tree of 10^5 nodes the recursive versions can overflow the stack, and the level-order versions avoid the problem. The queue-based serialiser holds at most one level, O(w) nodes.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Building the right subtree before the left in the pre-order version. The moving index advances in pre-order, so the left subtree must consume its nodes first. In the post-order version it is the opposite, and the right subtree is built first.

Empty input. A range with low greater than high is the base case, so an empty array gives a null tree without any special handling. In the deserialiser, an empty string must not be parsed as a number.

Negative numbers and multi-digit values. Do not split the serialised string by character. Use an explicit separator and parse tokens with stoi. A value such as -12 contains the separator-free character -, which is why a comma and a marker that is not a digit (#) are used.

Duplicate values. The two-traversal construction is only unique when values are distinct. If an interviewer allows duplicates, ask what is expected, because the answer is no longer unique.

The extra comma at the end of the serialised string. It is harmless for the readers above, which stop when the stream ends, but compare strings only after normalising it.

Memory ownership. The code allocates nodes with new and never frees them; mention that in a real project you would use unique pointers or a node arena, and that for an interview setting the tests do not check it.`,
      },
      {
        title: "Practice order",
        body: `Start with Construct Binary Tree from Preorder and Inorder Traversal. Do it first with a linear search for the root, to see the O(n^2) shape, then with the hash map. Draw the two arrays and the ranges on paper for the example above before writing code.

Then do Serialize and Deserialize Binary Tree with the pre-order markers, and after that the level-order version. Both are the same idea, and LeetCode's own format is the second one, so you will recognise its input.

When these are easy, try the two variants in the previous sections: the in-order and post-order construction, and building a BST from its pre-order alone with a bound. If you can write all of them without looking, you have the pattern: choose the root from one sequence, find the split from the other, and recurse on the two parts.`,
      },
    ],
  },

  bst: {
    intro:
      "A binary search tree structures elements so that every node's key is strictly greater than all keys in its left subtree and strictly less than all keys in its right subtree. This ordering invariant turns an unstructured collection of nodes into a dynamic searchable set. It provides logarithmic search, insertion, and deletion on balanced trees, while an in-order traversal yields elements in sorted order. You reach for a binary search tree when problems require ordered queries, such as predecessor, successor, floor, ceiling, k-th smallest element, or maintaining a sliding window of ordered elements.",
    sections: [
      {
        title: "The intuition",
        body: `The core intuition behind a binary search tree is binary search applied to a tree structure. In a sorted array, comparing the target against the middle element immediately halves the search space. A binary search tree makes this same decision dynamically: at each node, comparing the search key against the node's value tells you unequivocally whether the target lies in the left subtree, the right subtree, or is right at the current node. You never need to explore both branches. This directional guarantee is the foundation of all tree-based ordered sets and maps.

The second foundational intuition is that an in-order traversal (visiting the left subtree, then the current node, then the right subtree) visits all values in strictly non-decreasing sorted order. This property bridges the gap between tree traversals and array algorithms. Any question asking for the k-th smallest element, the median, elements within a range, or verifying whether a stream of items is sorted can be answered by walking the tree in-order.

Furthermore, an explicit iterator over a binary search tree does not need to flatten the entire tree into an array in advance. By maintaining only the current search path (the left spine of the subtree) on an explicit stack, an iterator can yield elements one by one in sorted order with O(h) auxiliary memory, where h is the tree height. Each step takes amortized O(1) time because every tree edge is traversed at most twice.

Finally, the ordered property makes local structural repairs tractable. If two nodes in a binary search tree have been swapped accidentally, their misplaced values create visible drops or inversions in the in-order sequence. Locating these anomalies allows identifying the corrupted nodes and restoring the tree to valid sorted order without rebuilding the pointers from scratch.`,
      },
      {
        title: "Why it works",
        body: `Correctness rests on the global binary search tree invariant. Let T be a binary search tree. For any node u with key k, every node v in the left subtree of u satisfies key(v) < k, and every node w in the right subtree satisfies key(w) > k. We prove by structural induction that in-order traversal produces a strictly increasing sequence. If T is empty, the sequence is trivially sorted. Otherwise, the in-order traversal visits the left subtree, then u, then the right subtree. By induction, the left traversal is strictly increasing and its maximum element is strictly less than k. Then u is visited. Then the right traversal is strictly increasing and its minimum element is strictly greater than k. Concatenating these three pieces yields a strictly increasing sequence.

A critical subtlety that trips up many beginners is that verifying a BST cannot be done by checking only local relationships. Checking that node->left->val < node->val < node->right->val at each node is insufficient. A node deep in the left subtree could have a value larger than an ancestor. The in-order sequence guarantees the global condition because an ancestor separates its left subtree from its right subtree across the entire traversal order.

For the BST Iterator, the invariant is that the top of the stack always points to the next smallest unvisited node. Initializing the iterator pushes the root and all its left descendants. When next() is called, the smallest node is popped. Its left subtree has already been fully processed. Any remaining nodes smaller than the rest of the tree must reside in its right subtree, specifically along the left spine of that right child. Pushing the right child and its left descendants preserves the invariant for the subsequent call.

For the problem of recovering a tree where exactly two nodes were swapped, consider the in-order traversal of the corrupted tree. In a sorted array of distinct elements, swapping two elements a and b (with a < b) creates either one or two inversions where an element is strictly greater than its successor. If the swapped nodes were non-adjacent, two inversions occur: the first drop occurs when a larger element appears too early (prev > cur, where prev is the misplaced large node), and the second drop occurs when a smaller element appears too late (prev > cur, where cur is the misplaced small node). If the swapped nodes were adjacent, only a single drop occurs, where prev is the first node and cur is the second. Handled carefully, this logic identifies both nodes in a single in-order pass.`,
      },
      {
        title: "A worked example",
        body: `Let us trace Kth Smallest Element in a BST on the following tree with k = 3. The root is 5. Node 5 has a left child 3 and right child 6. Node 3 has a left child 2 and right child 4. Node 2 has a left child 1.

We perform an iterative in-order traversal using an explicit stack:
Initial state: stack is empty. We push 5 and walk all the way left: push 3, push 2, push 1.
Stack from bottom to top: [5, 3, 2, 1].

Step 1: Pop 1. Remaining k = 3 - 1 = 2. Node 1 has no right child. Stack: [5, 3, 2].
Step 2: Pop 2. Remaining k = 2 - 1 = 1. Node 2 has no right child. Stack: [5, 3].
Step 3: Pop 3. Remaining k = 1 - 1 = 0. We have reached k = 0, so the 3rd smallest value is 3! We return 3 immediately. Notice that we never visited nodes 4, 5, or 6, pruning unnecessary work.

Now consider Recover Binary Search Tree on the tree: root 3, left child 1, right child 4, where node 4 has a left child 2. The in-order values of this tree are [1, 3, 2, 4]. Here nodes 3 and 2 are swapped.
We trace the in-order walk maintaining prev and watching for drops (prev->val > cur->val):
Visit 1: prev is null. prev becomes 1.
Visit 3: prev (1) < cur (3). No drop. prev becomes 3.
Visit 2: prev (3) > cur (2)! This is a drop. Because first is null, we assign first = prev (node 3) and second = cur (node 2). prev becomes 2.
Visit 4: prev (2) < cur (4). No drop. prev becomes 4.
The traversal finishes. Exactly one drop occurred, so first is node 3 and second is node 2. We swap their values: first->val becomes 2 and second->val becomes 3. The tree is now fully restored to [1, 2, 3, 4].`,
      },
      {
        title: "Implementation",
        body: `The core BST iterator uses an explicit stack storing nodes along the current left spine. Finding the k-th smallest element walks this iterator until k elements have been consumed.`,
        code: `struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int v) : val(v), left(nullptr), right(nullptr) {}
};

// BST Iterator: maintains the left spine on a stack, yielding sorted values in amortized O(1).
class BSTIterator {
    stack<TreeNode*> st;
    void pushLeft(TreeNode* node) {
        while (node) {
            st.push(node);
            node = node->left;
        }
    }
public:
    BSTIterator(TreeNode* root) {
        pushLeft(root);
    }
    bool hasNext() {
        return !st.empty();
    }
    int next() {
        TreeNode* top = st.top();
        st.pop();
        pushLeft(top->right);
        return top->val;
    }
};

// Find kth smallest element (1-indexed) in BST using iterative inorder.
int kthSmallest(TreeNode* root, int k) {
    stack<TreeNode*> st;
    TreeNode* cur = root;
    while (cur || !st.empty()) {
        while (cur) {
            st.push(cur);
            cur = cur->left;
        }
        cur = st.top();
        st.pop();
        if (--k == 0) return cur->val;
        cur = cur->right;
    }
    return -1;
}`,
      },
      {
        title: "Implementation: recovering swapped nodes and deletion",
        body: `Recovering a corrupted tree diagnoses drops during in-order traversal and swaps the offending values. Node deletion handles cases with zero, one, or two children by substituting the in-order successor.`,
        code: `// Recover Binary Search Tree: two nodes swapped by mistake, restore tree without changing structure.
void recoverTree(TreeNode* root) {
    TreeNode *first = nullptr, *second = nullptr, *prev = nullptr;
    stack<TreeNode*> st;
    TreeNode* cur = root;
    while (cur || !st.empty()) {
        while (cur) {
            st.push(cur);
            cur = cur->left;
        }
        cur = st.top();
        st.pop();
        if (prev && prev->val > cur->val) {
            if (!first) first = prev;
            second = cur;
        }
        prev = cur;
        cur = cur->right;
    }
    if (first && second) swap(first->val, second->val);
}

// Delete a key from BST and maintain BST invariants.
TreeNode* deleteNode(TreeNode* root, int key) {
    if (!root) return nullptr;
    if (key < root->val) {
        root->left = deleteNode(root->left, key);
    } else if (key > root->val) {
        root->right = deleteNode(root->right, key);
    } else {
        if (!root->left) {
            TreeNode* r = root->right;
            delete root;
            return r;
        }
        if (!root->right) {
            TreeNode* l = root->left;
            delete root;
            return l;
        }
        // Node has two children: find inorder successor (smallest in right subtree)
        TreeNode* succ = root->right;
        while (succ->left) succ = succ->left;
        root->val = succ->val;
        root->right = deleteNode(root->right, succ->val);
    }
    return root;
}`,
      },
      {
        title: "Variants",
        body: `Augmented Binary Search Trees: In an Order Statistic Tree, each node maintains an additional size field storing the count of nodes in its subtree (1 + left->size + right->size). With this information, finding the k-th smallest element or computing the rank of a value takes O(h) time directly by comparing k against left->size + 1, eliminating the need to traverse from the smallest element upward.

Morris In-Order Traversal: A standard iterative in-order traversal uses O(h) memory on the call stack or an explicit stack. Morris traversal achieves O(1) auxiliary space by temporarily threading the tree: for each node with a left child, find its in-order predecessor (the rightmost node of its left subtree) and link that predecessor's right child to the current node. On the second visit, the thread is removed and the original tree structure is restored. This allows solving Recover Binary Search Tree in O(n) time and strict O(1) extra space.

Range Queries and Pruning: When asked to compute the sum of values within a range [low, high] (as in Range Sum of BST) or trim nodes falling outside the range, we exploit the BST property to prune entire subtrees. If node->val < low, we can completely discard the left subtree and only recurse on the right. If node->val > high, we discard the right subtree and only recurse on the left.

Floor and Ceiling Queries: To find the floor of x (largest key <= x), walk down the tree. If node->val == x, return node->val. If node->val > x, the floor must lie in the left subtree. If node->val < x, the current node is a candidate for the floor, but a closer candidate might exist in the right subtree; record the current value and search right.`,
      },
      {
        title: "Complexity",
        body: `Time complexity for basic operations (search, insert, delete, floor, ceiling) is O(h), where h is the height of the tree. For balanced trees (such as AVL trees, red-black trees, or balanced BSTs constructed from sorted arrays), h is O(log n), making operations take O(log n) time. For degenerate, unbalanced trees (such as inserting elements in strictly increasing order), h is O(n), and operations degrade to O(n) linear scans.

BST Iterator complexity: Initializing the iterator takes O(h) time to push the left spine. Each call to next() pops a node and may push another left spine. Across a full traversal of all n nodes, each node is pushed onto the stack exactly once and popped exactly once. Therefore, n calls to next() take O(n) total time, which gives an amortized time of O(1) per call. The worst-case time for a single next() call is O(h). The auxiliary memory of the iterator is O(h) to store the stack, which is bounded by O(log n) on balanced trees.

Recover BST takes O(n) time to traverse all nodes in-order and identify the inversion points. Auxiliary space is O(h) for the recursion or explicit stack, or O(1) if implemented with Morris traversal.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Adjacent swapped nodes in Recover BST: If two adjacent nodes in the in-order traversal are swapped, only a single inversion drop (prev->val > cur->val) occurs. If your code assumes that two separate drops will always occur, the second pointer will remain unassigned. To avoid this, always set second = cur on every detected drop. If two drops occur, second will be updated to the second drop's node; if only one drop occurs, second remains the node from the first drop.

Deletion of a node with two children: Deleting a node with two children requires replacing it with either its in-order predecessor (maximum in left subtree) or in-order successor (minimum in right subtree). A frequent bug is copying the successor value to the node and simply freeing the successor pointer without disconnecting it from its parent or handling its potential right child. Always recursively invoke deleteNode(root->right, successor->val) to properly unlink the successor.

Duplicate values: Standard binary search trees assume strictly distinct keys. If duplicate values are allowed, decide whether duplicates go strictly to the left or right, or whether each node stores a frequency counter. Inconsistency in duplicate handling corrupts the in-order sorted invariant.

Integer overflow on bound sentinels: When validating or searching against bounds, avoid using INT_MIN and INT_MAX as integer sentinels because valid nodes may contain those exact values. Use 64-bit integers (long long) initialized to LLONG_MIN and LLONG_MAX to avoid spurious comparisons.`,
      },
      {
        title: "Practice order",
        body: `Start with Kth Smallest Element in a BST to master stopping an in-order traversal early once k elements have been visited. Then solve Binary Search Tree Iterator to understand how an explicit stack maintains the active search path and achieves amortized O(1) step time with O(h) memory. Follow this with Recover Binary Search Tree to practice diagnosing and repairing structural anomalies through in-order drops, paying close attention to both adjacent and non-adjacent swap cases. Finally, implement BST deletion and range-based pruning to gain full command over tree restructuring and branch elimination.`,
      },
    ],
  },

  "tree-dp": {
    intro:
      "Tree dynamic programming computes optimal values over subtrees by leveraging the inductive, acyclic structure of trees. Because cutting any edge partitions a tree into two independent components, optimal solutions to subtrees can be combined bottom-up without cyclic dependencies. The rerooting technique extends this paradigm: by performing an initial bottom-up pass followed by a top-down pass that slides the root across tree edges in constant time, it calculates the answer for every node as the root in linear time. You reach for tree dynamic programming when solving constraint optimization problems on trees, such as choosing non-adjacent nodes or minimizing cameras, and whenever an aggregated tree metric must be reported for all possible roots.",
    sections: [
      {
        title: "The intuition",
        body: `On linear sequences, dynamic programming transitions from left to right: subproblems depend on smaller prefixes or suffixes. On trees, the natural ordering is topological from leaves to root, which is post-order traversal. Each node u acts as the root of its own subtree. Because a tree contains no cycles, the subtrees rooted at the children of u share no vertices other than through u. This structural independence guarantees optimal substructure: the best decision for the subtree rooted at u can be computed purely by aggregating the optimal decisions reported by its children.

In many tree DP problems, each node must make a discrete choice subject to local neighborhood constraints. For example, in House Robber III, an edge between parent and child means both cannot be robbed simultaneously. To resolve this constraint, the DP state returned by each subtree is not a single number, but a small tuple representing the conditional outcomes. For a node u, we return a pair: the maximum profit if u is robbed, and the maximum profit if u is skipped. The parent can then make its choice cleanly based on those two values.

A common challenge arises when a problem asks for an answer for every node in the tree as if it were the root. For example, in Sum of Distances in Tree, we must calculate the sum of distances from every vertex to all other vertices. Running a fresh depth-first search from each of the n nodes takes O(n^2) time, which is too slow for trees with 10^5 nodes.

The rerooting technique (also known as all-roots DP) resolves this in O(n) total time. The central intuition is that when you shift the root from a node u to an adjacent neighbor v across edge (u, v), the vast majority of the tree's structure does not change. Node v becomes the new root, and u becomes one of its children. By mathematically determining how the answer changes when crossing this single edge, we can derive the answer for v from the answer for u in O(1) time. A second top-down traversal pushes this transition down the tree, computing the answer for all n roots in a single pass.`,
      },
      {
        title: "Why it works",
        body: `We formalize the state transitions and prove their correctness. First consider the discrete state DP exemplified by House Robber III. Let u be a tree node with left child L and right child R. Let rob(u) be the maximum loot from the subtree of u given that u is robbed, and skip(u) be the maximum loot given that u is skipped.
If u is robbed, neither L nor R can be robbed due to the adjacency constraint. Hence, we must take the skip values from both children:
rob(u) = val(u) + skip(L) + skip(R).
If u is skipped, u does not constrain its children. Therefore, L and R can each be independently robbed or skipped to maximize profit:
skip(u) = max(rob(L), skip(L)) + max(rob(R), skip(R)).
Since the subtrees rooted at L and R are disjoint, their optimal decisions do not interfere with each other. By induction on subtree height, these transitions compute the globally optimal value for the subtree at u.

Now consider the rerooting transition for Sum of Distances in Tree. Let ans[u] denote the sum of distances from node u to all other nodes in the tree. Suppose we have already computed ans[u] for root u, along with the size of every subtree size[v] (the number of nodes in the subtree rooted at v with respect to root u).
When we shift the root from u to an adjacent child v across edge (u, v):
1. Every node in the subtree of v is now 1 edge closer to the new root v. There are size[v] such nodes, so the distance sum decreases by size[v].
2. Every node in the rest of the tree (all nodes outside v's subtree) is now 1 edge farther from the new root v. There are n - size[v] such nodes, so the distance sum increases by n - size[v].

Combining these two changes gives the exact algebraic transition:
ans[v] = ans[u] - size[v] + (n - size[v]) = ans[u] + n - 2 * size[v].
This transition requires only the scalar subtraction and addition of precomputed quantities and executes in O(1) time. Because any tree with n nodes can be traversed from root to all leaves along the directed edges of a spanning tree, visiting each directed edge once in a pre-order pass computes ans[v] for every node v in O(n) total time.`,
      },
      {
        title: "A worked example",
        body: `Let us trace House Robber III on a binary tree. The root is node 3. Node 3 has a left child 2 (which has a right child 3) and a right child 3 (which has a right child 1).
We compute the {rob, skip} pairs post-order from leaves up:
Leaf 3 (right child of 2): rob = 3, skip = 0.
Leaf 1 (right child of right 3): rob = 1, skip = 0.
Node 2 (left child of root): left is null, right is leaf 3.
  rob(2) = 2 + skip(null) + skip(leaf 3) = 2 + 0 + 0 = 2.
  skip(2) = max(0, 0) + max(rob(leaf 3), skip(leaf 3)) = 0 + max(3, 0) = 3.
  Returns {rob: 2, skip: 3}.
Node 3 (right child of root): left is null, right is leaf 1.
  rob(3) = 3 + skip(null) + skip(leaf 1) = 3 + 0 + 0 = 3.
  skip(3) = 0 + max(rob(leaf 1), skip(leaf 1)) = 0 + max(1, 0) = 1.
  Returns {rob: 3, skip: 1}.
Root 3:
  rob(root) = 3 + skip(2) + skip(3) = 3 + 3 + 1 = 7.
  skip(root) = max(rob(2), skip(2)) + max(rob(3), skip(3)) = max(2, 3) + max(3, 1) = 3 + 3 = 6.
Result is max(rob(root), skip(root)) = max(7, 6) = 7.
The optimal robbery takes root 3, leaf 3, and leaf 1: 3 + 3 + 1 = 7.

Now trace Sum of Distances in Tree for n = 6 with edges: (0, 1), (0, 2), (2, 3), (2, 4), (2, 5).
Pass 1 (Bottom-up post-order rooted at 0):
Sizes: count[1]=1, count[3]=1, count[4]=1, count[5]=1.
At node 2: count[2] = 1 + count[3] + count[4] + count[5] = 1 + 1 + 1 + 1 = 4.
ans[2] = (ans[3] + count[3]) + (ans[4] + count[4]) + (ans[5] + count[5]) = (0+1) + (0+1) + (0+1) = 3.
At root 0: count[0] = 1 + count[1] + count[2] = 1 + 1 + 4 = 6.
ans[0] = (ans[1] + count[1]) + (ans[2] + count[2]) = (0+1) + (3+4) = 1 + 7 = 8.
So sum of distances from 0 is 8.

Pass 2 (Top-down pre-order rerooting):
From 0 to child 1:
ans[1] = ans[0] - count[1] + (6 - count[1]) = 8 - 1 + 5 = 12.
From 0 to child 2:
ans[2] = ans[0] - count[2] + (6 - count[2]) = 8 - 4 + 2 = 6.
From 2 to child 3:
ans[3] = ans[2] - count[3] + (6 - count[3]) = 6 - 1 + 5 = 10.
Similarly for children 4 and 5:
ans[4] = 10, ans[5] = 10.
Final array: [8, 12, 6, 10, 10, 10]. Exactly 6 evaluations in linear time.`,
      },
      {
        title: "Implementation",
        body: `The discrete state problem returns pairs from post-order visits. The rerooting solver uses two DFS passes: one bottom-up to compute subtree sizes and base answer, and one top-down to propagate answers.`,
        code: `struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int v) : val(v), left(nullptr), right(nullptr) {}
};

// House Robber III: returns {rob this node, skip this node}
pair<int, int> robSubtree(TreeNode* root) {
    if (!root) return {0, 0};
    auto [leftRob, leftSkip] = robSubtree(root->left);
    auto [rightRob, rightSkip] = robSubtree(root->right);
    int robCurrent = root->val + leftSkip + rightSkip;
    int skipCurrent = max(leftRob, leftSkip) + max(rightRob, rightSkip);
    return {robCurrent, skipCurrent};
}

int rob(TreeNode* root) {
    auto [robVal, skipVal] = robSubtree(root);
    return max(robVal, skipVal);
}

// Sum of Distances in Tree (rerooting technique on undirected tree)
vector<int> sumOfDistancesInTree(int n, vector<vector<int>>& edges) {
    vector<vector<int>> adj(n);
    for (const auto& e : edges) {
        adj[e[0]].push_back(e[1]);
        adj[e[1]].push_back(e[0]);
    }
    vector<int> count(n, 1);
    vector<int> ans(n, 0);

    // Pass 1: Post-order DFS to compute subtree sizes and root distance sum for node 0
    function<void(int, int)> dfs1 = [&](int u, int p) {
        for (int v : adj[u]) {
            if (v != p) {
                dfs1(v, u);
                count[u] += count[v];
                ans[u] += ans[v] + count[v];
            }
        }
    };

    // Pass 2: Pre-order DFS to reroot to each child
    function<void(int, int)> dfs2 = [&](int u, int p) {
        for (int v : adj[u]) {
            if (v != p) {
                ans[v] = ans[u] - count[v] + (n - count[v]);
                dfs2(v, u);
            }
        }
    };

    dfs1(0, -1);
    dfs2(0, -1);
    return ans;
}`,
      },
      {
        title: "Implementation: binary tree cameras",
        body: `Monitoring nodes with the minimum number of cameras uses a 3-state post-order classification: state 0 represents an uncovered node, state 1 represents a node covered without a camera, and state 2 represents a node with a camera installed.`,
        code: `// Binary Tree Cameras: minimum cameras to monitor all nodes
// State: 0 = not covered, 1 = covered without camera, 2 = has camera
int cameraDfs(TreeNode* node, int& cameras) {
    if (!node) return 1; // null nodes are considered covered
    int leftState = cameraDfs(node->left, cameras);
    int rightState = cameraDfs(node->right, cameras);
    if (leftState == 0 || rightState == 0) {
        cameras++;
        return 2; // place camera at current node
    }
    if (leftState == 2 || rightState == 2) {
        return 1; // covered by child's camera
    }
    return 0; // uncovered, parent must cover this node
}

int minCameraCover(TreeNode* root) {
    int cameras = 0;
    if (cameraDfs(root, cameras) == 0) cameras++;
    return cameras;
}`,
      },
      {
        title: "Variants",
        body: `Subtree knapsack DP: When choosing a subset of nodes with a budget constraint (such as knapsack on trees where selecting a node requires picking its parent), each node maintains a vector dp[w] representing the best value achievable with weight budget w. Naively, merging children looks like O(n^3), but by bounding the loop over child subtrees by their actual subtree sizes, the total complexity across the entire tree collapses to O(n * W) or O(n^2).

Binary Tree Cameras: A classic 3-state greedy/DP problem. Each node can be in one of three states: 0 (uncovered, needs a camera from parent), 1 (covered without camera), or 2 (has a camera). Post-order traversal greedily places a camera at a node if either of its children is uncovered (state 0). If either child has a camera (state 2), the current node becomes covered (state 1). Otherwise, the current node remains uncovered (state 0), leaving it to the parent to cover.

Tree Diameter and Center: Finding the longest path in a tree can be viewed as 1D tree DP. At each node u, return the longest downward branch into any child. The longest path bending at u is the sum of the two longest downward branches from its children. The center of a tree (nodes minimizing the maximum distance to any vertex) can be found either by repeatedly trimming leaf nodes or by finding the midpoint of the diameter.

Maximum Weight Independent Set on Trees: The general independent set problem is NP-hard on arbitrary graphs, but on trees it is solved in O(n) using the exact same two-state DP as House Robber III.`,
      },
      {
        title: "Complexity",
        body: `Time complexity:
For House Robber III and Binary Tree Cameras, each node is visited once during a single post-order traversal. At each node, combining the results from left and right children takes O(1) time. Thus, the total time complexity is strictly O(n), where n is the number of nodes in the tree.
For Sum of Distances in Tree, the first DFS pass visits all n nodes and n - 1 edges bottom-up in O(n) time. The second DFS pass visits all n nodes and n - 1 edges top-down in O(n) time. The total time complexity is O(n), vastly outperforming the naive O(n^2) approach.

Space complexity:
For House Robber III, auxiliary memory is dominated by the recursion call stack, which is O(h), where h is the tree height (O(log n) on balanced trees, O(n) on chains).
For Sum of Distances in Tree on general trees, storing the adjacency list takes O(n) space. The subtree size array and distance answer array each take O(n) space. The call stack for recursion takes O(n) space in the worst case. The total auxiliary memory is O(n).`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Exponential recursion without tuples: A common mistake in House Robber III is writing helper functions rob(root) that separately invoke rob(root->left->left) and rob(root->left->right). Without memoization, this recalculates subproblems exponentially (O(2^n)), causing Time Limit Exceeded. Always return a pair or tuple from the recursive step so that each subtree is evaluated exactly once.

Uncovered root in camera problems: When using post-order state classification for Binary Tree Cameras, the root node has no parent to place a camera for it. If the post-order traversal finishes and the root is left in state 0 (uncovered), an additional camera must be placed at the root. Forgetting this edge case fails trees consisting of a single node or small chains.

Rerooting off-by-one formula: When deriving the rerooting formula ans[v] = ans[u] - count[v] + (n - count[v]), verify the sign and node counts on a two-node tree (n = 2). If root 0 is connected to 1, count[1] = 1. ans[1] = ans[0] - 1 + (2 - 1) = ans[0]. Since both nodes are symmetrical, ans[0] = ans[1] = 1, confirming the formula.

Deep chain trees and recursion stack: On LeetCode, tree problems can have trees of up to 10^5 nodes structured as a single linked list. A recursive DFS will consume 10^5 stack frames, which can trigger stack overflow on systems with small default stack sizes. Mention converting to iterative order or using BFS when needed.`,
      },
      {
        title: "Practice order",
        body: `Begin with House Robber III to master returning multi-state tuples from a post-order traversal to satisfy local adjacency constraints. Next, solve Sum of Distances in Tree to learn the rerooting technique, specifically how to compute subtree aggregates in an initial bottom-up pass and propagate global adjustments top-down in a second pass. After completing these, practice Binary Tree Cameras to see how state-based post-order decisions can yield a greedy choice that minimizes global placements on trees.`,
      },
    ],
  },

  "binary-lifting": {
    intro:
      "Binary lifting is a dynamic programming technique on trees that precomputes ancestors at power-of-two heights, allowing arbitrary ancestor lookups in logarithmic time. By writing any jump distance k as a sum of powers of two, a query that would take linear time by walking edge-by-edge is answered in O(log n) steps. It forms the standard backbone for finding the Lowest Common Ancestor (LCA) of two nodes and, when combined with an Euler tour that timestamps node visits, enables flattening subtrees into contiguous array intervals for fast range queries. You reach for binary lifting when handling numerous ancestor queries, finding paths between nodes in static trees, or performing point updates and range queries over subtrees.",
    sections: [
      {
        title: "The intuition",
        body: `Imagine you are at the bottom of a tall skyscraper and need to reach the 37th floor. Instead of pressing the button for each individual floor one by one, an express elevator offers jump buttons for powers of two: 1 floor, 2 floors, 4 floors, 8 floors, 16 floors, and 32 floors. To reach floor 37, you press 32, then 4, then 1 (32 + 4 + 1 = 37). In just 3 jumps, you arrive at your destination.

This is the exact intuition of binary lifting. For every node v in a tree and every integer power k, we precalculate up[k][v], which represents the 2^k-th ancestor of v. Because any non-negative integer k has a unique binary representation with at most floor(log2(n)) + 1 set bits, jumping k levels upward is decomposed into at most O(log n) precalculated power-of-two hops.

Binary lifting solves the Lowest Common Ancestor (LCA) problem with the same speed. Given two nodes u and v at different depths, we first use binary lifting to lift the deeper node upward until both nodes are at identical depths. If they are now the same node, one was an ancestor of the other and we are done. Otherwise, they reside in different branches of their common ancestor. We test power-of-two jumps from the largest power down to zero: if their 2^k-th ancestors are different, we know the LCA lies strictly above that jump, so we safely jump both nodes upward simultaneously. When no more jumps can be made without overshooting, both nodes sit directly below their LCA, and taking one final step reveals the answer.

Euler tour flattening provides a complementary view of tree structure. By recording entry and exit timestamps during a depth-first search, the entire subtree rooted at node u maps to a single contiguous slice of time: [tin[u], tout[u]]. Any query about all descendants of u transforms from a complex tree traversal into a standard range query over an array, which can be answered or updated with a Binary Indexed Tree (Fenwick tree) or Segment Tree in O(log n) time.`,
      },
      {
        title: "Why it works",
        body: `Correctness relies on the composition property of ancestor jumps and the binary number system.
Define up[k][v] as the ancestor of node v at distance 2^k. The base case is the direct parent:
up[0][v] = parent[v].
For k > 0, jumping 2^k steps is equivalent to taking a jump of 2^(k-1) steps, followed by another jump of 2^(k-1) steps from that intermediate ancestor:
up[k][v] = up[k-1][ up[k-1][v] ].
Because each power-of-two row k depends only on row k-1, the entire jump table of size O(n log n) can be computed iteratively in O(n log n) time after a single initial DFS determines depths and immediate parents.

For the k-th ancestor lookup, let k = sum_{j=0}^{m} b_j * 2^j be the binary representation of k, where b_j in {0, 1}. By inspecting each bit j from 0 to m, if b_j == 1, we replace node by up[j][node]. Because integer addition is associative, the sequence of jumps reaches exactly the sum of powers, which is distance k. If at any point the jump attempts to access an ancestor beyond the root, a sentinel value (-1) terminates the query.

For the LCA algorithm, correctness has two phases:
Phase 1: Equalizing depths. Let depth[u] >= depth[v]. The difference diff = depth[u] - depth[v] is lifted using the k-th ancestor procedure. Because the tree is a directed forest toward the root, lifting u by diff steps brings it to the unique ancestor of u at depth equal to depth[v].
Phase 2: Simultaneous lifting. If u == v after Phase 1, v was an ancestor of u, so v is the LCA. Otherwise, let d be the depth of LCA(u, v), where d < depth[u]. For any jump 2^j >= depth[u] - d, up[j][u] equals up[j][v] because both jump beyond or onto the LCA into common ancestors. Conversely, for any jump 2^j < depth[u] - d, up[j][u] != up[j][v] because both remain strictly below the LCA in distinct subtrees. By iterating j from LOG-1 down to 0 and jumping whenever up[j][u] != up[j][v], we greedily add all powers of two that sum to (depth[u] - d - 1). When the loop finishes, u and v are at distance 1 below the LCA. Therefore, up[0][u] is the exact LCA.

For the Euler tour, a depth-first search maintains a monotonic counter timer. Upon entering node u, we record tin[u] = ++timer. The DFS recursively explores all descendants of u. Upon finishing u, we record tout[u] = timer. For any descendant w of u, the DFS must enter w after entering u and must leave w before leaving u. Therefore, tin[u] <= tin[w] <= tout[w] <= tout[u]. Conversely, any node outside u's subtree is either entered before u and finished before u, or entered after u is already finished. Hence, the set of nodes belonging to the subtree of u is in one-to-one correspondence with the interval [tin[u], tout[u]] in the flattened array.`,
      },
      {
        title: "A worked example",
        body: `Let us trace binary lifting on a tree of 8 nodes (0 to 7) rooted at 0.
Tree structure:
Root 0 has children 1 and 2.
Node 1 has children 3 and 4.
Node 3 has child 5.
Node 2 has children 6 and 7.
Depths: depth[0]=0; depth[1]=1, depth[2]=1; depth[3]=2, depth[4]=2, depth[6]=2, depth[7]=2; depth[5]=3.
Here n = 8, so LOG = ceil(log2(8)) + 1 = 4 (powers 2^0=1, 2^1=2, 2^2=4, 2^3=8).

Precomputed up[k][v] table:
Parents (k = 0):
up[0] = [0, 0, 0, 1, 1, 3, 2, 2] (using 0 as root's parent).
k = 1 (jump of 2):
up[1][5] = up[0][up[0][5]] = up[0][3] = 1.
up[1][3] = up[0][up[0][3]] = up[0][1] = 0.
up[1][4] = up[0][up[0][4]] = up[0][1] = 0.
up[1][6] = up[0][up[0][6]] = up[0][2] = 0.
k = 2 (jump of 4):
up[2][5] = up[1][up[1][5]] = up[1][1] = 0.

Now trace LCA query for node 5 and node 4:
depth[5] = 3, depth[4] = 2.
Phase 1: depth[5] > depth[4], difference = 3 - 2 = 1 (binary 0001).
Bit 0 is 1: lift 5 by 2^0 = 1 step. 5 becomes up[0][5] = 3.
Now depth[3] = 2 == depth[4] = 2.
Are they equal? 3 != 4, continue to Phase 2.
Phase 2: j from 3 down to 0:
j = 3: up[3][3]=0, up[3][4]=0. Equal, do not jump.
j = 2: up[2][3]=0, up[2][4]=0. Equal, do not jump.
j = 1: up[1][3]=0, up[1][4]=0. Equal, do not jump.
j = 0: up[0][3]=1, up[0][4]=1. Equal, do not jump.
Loop terminates. Nodes are directly below LCA.
Return up[0][3] = 1.
Indeed, the Lowest Common Ancestor of 5 and 4 is node 1.

Now trace Euler tour on subtree queries:
DFS visits: enter 0 (tin=1), enter 1 (tin=2), enter 3 (tin=3), enter 5 (tin=4, tout=4), exit 3 (tout=4), enter 4 (tin=5, tout=5), exit 1 (tout=5)...
Subtree of 1 spans [tin[1], tout[1]] = [2, 5].
Nodes inside [2, 5] are: node 1 (tin 2), node 3 (tin 3), node 5 (tin 4), node 4 (tin 5).
Every descendant of node 1 is neatly captured in the contiguous array segment [2, 5] without gaps.`,
      },
      {
        title: "Implementation",
        body: `The jump table up[j][i] is initialized by a DFS and built row-by-row. Querying kth ancestor uses bit manipulation; finding LCA lifts to equal depths and steps up in tandem.`,
        code: `// Kth Ancestor of a Tree Node using binary lifting jump table.
class TreeAncestor {
    int LOG;
    vector<vector<int>> up;
public:
    TreeAncestor(int n, vector<int>& parent) {
        LOG = 0;
        while ((1 << LOG) <= n) LOG++;
        up.assign(LOG, vector<int>(n, -1));
        for (int i = 0; i < n; i++) {
            up[0][i] = parent[i];
        }
        for (int j = 1; j < LOG; j++) {
            for (int i = 0; i < n; i++) {
                if (up[j - 1][i] != -1) {
                    up[j][i] = up[j - 1][up[j - 1][i]];
                }
            }
        }
    }
    int getKthAncestor(int node, int k) {
        for (int j = 0; j < LOG; j++) {
            if ((k >> j) & 1) {
                node = up[j][node];
                if (node == -1) break;
            }
        }
        return node;
    }
};

// Binary lifting for Lowest Common Ancestor (LCA) queries in O(log n).
struct TreeLCA {
    int n, LOG;
    vector<int> depth;
    vector<vector<int>> up;

    TreeLCA(int n, const vector<vector<int>>& adj, int root = 0) : n(n) {
        LOG = 0;
        while ((1 << LOG) <= n) LOG++;
        depth.assign(n, 0);
        up.assign(LOG, vector<int>(n, root));

        function<void(int, int, int)> dfs = [&](int u, int p, int d) {
            depth[u] = d;
            up[0][u] = p;
            for (int v : adj[u]) {
                if (v != p) dfs(v, u, d + 1);
            }
        };
        dfs(root, root, 0);

        for (int j = 1; j < LOG; j++) {
            for (int i = 0; i < n; i++) {
                up[j][i] = up[j - 1][up[j - 1][i]];
            }
        }
    }

    int lca(int u, int v) {
        if (depth[u] < depth[v]) swap(u, v);
        // Equalize depths
        int diff = depth[u] - depth[v];
        for (int j = 0; j < LOG; j++) {
            if ((diff >> j) & 1) u = up[j][u];
        }
        if (u == v) return u;
        // Lift both simultaneously
        for (int j = LOG - 1; j >= 0; j--) {
            if (up[j][u] != up[j][v]) {
                u = up[j][u];
                v = up[j][v];
            }
        }
        return up[0][u];
    }
};`,
      },
      {
        title: "Implementation: Euler tour and subtree queries",
        body: `Euler tour timestamps assign each node an entry and exit index during depth-first traversal. Subtree range queries and point updates then map cleanly to a Fenwick tree (Binary Indexed Tree) over the contiguous interval [tin, tout].`,
        code: `// Fenwick tree (Binary Indexed Tree) for point update and prefix range sum queries.
struct FenwickTree {
    int n;
    vector<long long> tree;
    FenwickTree(int n) : n(n), tree(n + 1, 0) {}
    void add(int i, long long delta) {
        for (; i <= n; i += i & -i) tree[i] += delta;
    }
    long long query(int i) {
        long long sum = 0;
        for (; i > 0; i -= i & -i) sum += tree[i];
        return sum;
    }
    long long queryRange(int l, int r) {
        return query(r) - query(l - 1);
    }
};

// Euler tour flattening: subtrees become contiguous intervals [tin[u], tout[u]].
struct SubtreeQueries {
    int timer = 0;
    vector<int> tin, tout;
    FenwickTree bit;

    SubtreeQueries(int n, const vector<vector<int>>& adj, const vector<int>& values, int root = 0)
        : tin(n), tout(n), bit(n) {
        function<void(int, int)> dfs = [&](int u, int p) {
            tin[u] = ++timer;
            for (int v : adj[u]) {
                if (v != p) dfs(v, u);
            }
            tout[u] = timer;
        };
        dfs(root, -1);
        for (int i = 0; i < n; i++) {
            bit.add(tin[i], values[i]);
        }
    }

    void updateNode(int u, long long delta) {
        bit.add(tin[u], delta);
    }

    long long querySubtree(int u) {
        return bit.queryRange(tin[u], tout[u]);
    }
};`,
      },
      {
        title: "Variants",
        body: `Path Max / Min queries with Binary Lifting: In addition to jumping ancestors, we can compute aggregated values along the path. By maintaining max_edge[k][v] as the maximum edge weight encountered during the 2^k jump from v, any path query between u and v decomposes into lifting u to LCA and v to LCA while accumulating the maximum of the jumps in O(log n) time.

Ancestorship Check in O(1): With an Euler tour, testing whether u is an ancestor of v does not require binary lifting at all. Node u is an ancestor of v if and only if tin[u] <= tin[v] && tout[v] <= tout[u]. This runs in strict O(1) time after O(n) preprocessing.

Heavy-Light Decomposition (HLD) comparison: While binary lifting handles static trees and point updates in subtrees effectively, Heavy-Light Decomposition decomposes tree edges into heavy and light chains. HLD supports updating all nodes along a path between arbitrary nodes u and v in O(log^2 n) time using a segment tree, which binary lifting cannot easily do.

Tree Distance Calculation: The distance (number of edges or sum of edge weights) between any two nodes u and v on a tree can be computed directly using LCA:
dist(u, v) = depth[u] + depth[v] - 2 * depth[lca(u, v)].
This formula allows answering pairwise tree distance queries in O(log n) time without searching.`,
      },
      {
        title: "Complexity",
        body: `Preprocessing time and space:
Building the binary lifting table requires computing up[k][v] for k from 0 up to LOG - 1 across all n nodes. Since LOG = floor(log2(n)) + 1, there are O(n log n) entries in the table. Computing each entry takes O(1) time. Therefore, preprocessing time is O(n log n) and space is O(n log n).
The Euler tour requires a single DFS visiting every node and edge once, taking O(n) time and O(n) space. Initializing the Fenwick tree on the flattened array takes O(n) time.

Query time:
A k-th ancestor query checks each bit of k up to LOG, taking O(log n) time in the worst case.
An LCA query takes O(log n) time to equalize depths, followed by O(log n) steps of simultaneous lifting, resulting in O(log n) query time.
A subtree sum query using the Euler tour interval [tin[u], tout[u]] queries the Fenwick tree twice, taking O(log n) time. A point update takes O(log n) time.`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Overshooting the tree root: When querying the k-th ancestor, k may be larger than the depth of the node. If the root's parent is represented as -1, reading up[k][-1] will cause an out-of-bounds memory access. Either explicitly check if (node == -1) break; inside the loop, or set the root's parent to the root itself and stop when depth reaches zero.

LOG dimension sizing: Setting LOG too small causes segmentation faults when jumping on tall, degenerate trees. For n = 10^5, log2(10^5) is approximately 16.6, so LOG must be at least 18. A safe rule is LOG = 0; while ((1 << LOG) <= n) LOG++;.

LCA equality check after depth equalization: If lifting the deeper node causes u == v, one node was the direct ancestor of the other. You must return u immediately. If you proceed into the simultaneous lifting loop, the condition up[j][u] != up[j][v] will never be true because u and v are already identical, and the code would incorrectly return up[0][u], which is the parent of the actual LCA!

1-indexed vs 0-indexed Euler tour: Fenwick trees are conventionally 1-indexed (due to the i & -i bit manipulation). Ensure that timer begins at 1 or that the Fenwick tree size accommodates the maximum timestamp tout[root] to prevent off-by-one errors.`,
      },
      {
        title: "Practice order",
        body: `Start with Kth Ancestor of a Tree Node to implement the basic binary lifting table, focusing on how power-of-two jumps decompose arbitrary distances and how to safely handle out-of-bounds queries. Next, build a full Lowest Common Ancestor solver using depth equalization and simultaneous lifting to internalize the two-phase query. Finally, tackle Subtree range queries (Euler tour) to learn tree flattening, seeing how recording entry and exit timestamps turns subtree aggregation into standard range queries on a Fenwick tree.`,
      },
    ],
  },

  trie: {
    intro:
      "A trie, or prefix tree, is an ordered tree data structure where edges represent characters and paths from the root represent string prefixes. Rather than storing entire strings as separate entries, a trie collapses common prefixes into shared branches, decoupling search performance from the total number of words in the dictionary. Lookups, insertions, and prefix validations run in time proportional strictly to the length of the query string. You reach for a trie when implementing autocomplete, searching for prefixes, pruning exhaustive grid searches such as Boggle or word finders, and maximizing bitwise XOR values using binary tries.",
    sections: [
      {
        title: "The intuition",
        body: `Consider looking up words in a traditional printed dictionary. If you are looking for 'cart', you do not scan through all 100,000 words sequentially, nor do you compute a cryptographic hash. You turn to the section starting with 'c', follow to the sub-block starting with 'ca', then 'car', and finally find 'cart'. Words with the same prefix naturally share the same path.

A trie implements this exact dictionary indexing. The root node represents an empty prefix. Each node has child edges labeled by characters of the alphabet (such as 'a' through 'z'). A sequence of characters spells out a path down the tree. A boolean flag isEnd at each node indicates whether the prefix ending at that node constitutes a complete, valid word.

This design gives tries two profound advantages over hash tables. First, while a hash table requires computing a hash over the entire query string and cannot easily answer 'are there any words starting with prefix P?', a trie answers prefix existence in O(L) time by walking down the path for P. If the path exists, at least one word shares that prefix; if any character edge is missing, no such word can possibly exist.

Second, tries excel when paired with backtracking. In Word Search II (finding words on a 2D character grid), a naive search checks all paths against a dictionary, which explodes exponentially. But by traversing the grid and the trie simultaneously, the trie acts as an active search guide. If moving to an adjacent cell creates a character sequence that does not exist in the trie, the entire branch of exploration is pruned immediately. Millions of fruitless grid paths are aborted before they begin.

The binary trie applies this same structural intuition to integers. By viewing a 32-bit integer as a sequence of 32 bits from most significant to least significant, a trie with branching factor 2 stores numbers. To find the number in the trie that maximizes the XOR with a given value x, we greedily choose the opposite bit at each step (preferring 1 ^ 0 = 1). Because higher bits outweigh all lower bits combined, this greedy choice is provably optimal.`,
      },
      {
        title: "Why it works",
        body: `Correctness rests on the prefix tree invariant: a string s = c_0 c_1 ... c_{L-1} is stored in the trie if and only if starting from root and following edges c_0, c_1, ..., c_{L-1} terminates at a node marked isEnd = true. Every ancestor of this terminal node represents a valid prefix of s.

We prove the time complexity of insertion and search by construction. At each step of insert(s), we check if child edge s[i] exists. If not, allocate it; then advance to the child node. This loop runs exactly L times, where L is the length of s. Each step involves an array indexing c - 'a', which is O(1). Thus, insertion takes O(L) time. Similarly, search(s) and startsWith(prefix) inspect at most L character edges, taking O(L) time. Notice that the runtime is completely independent of the dictionary size N. Whether the trie holds 10 words or 10,000,000 words, searching for a 5-letter word takes exactly 5 pointer hops.

For the Maximum XOR problem on integers, let x be an integer and let the trie contain a set of integers S. We want to find y in S maximizing x XOR y.
Consider the bits of x from bit 31 down to bit 0. Suppose we have successfully matched the top k bits. At bit position b, the value of x is bit_x in {0, 1}. The opposite bit is opp = 1 - bit_x.
If the current trie node has a child along opp, choosing this child guarantees that the b-th bit of x XOR y will be 1, contributing 2^b to the XOR sum.
If the current trie node lacks a child along opp, we have no choice but to follow the child along bit_x, yielding 0 at the b-th bit of x XOR y.

Why is the greedy choice optimal? In binary arithmetic:
2^b > sum_{i=0}^{b-1} 2^i = 2^b - 1.
This fundamental inequality means that securing a 1 at bit position b yields a value strictly greater than obtaining 1s at all remaining lower positions combined. Therefore, no future combination of choices can ever compensate for missing a 1 at bit b. The greedy path is guaranteed to find the global maximum XOR.`,
      },
      {
        title: "A worked example",
        body: `Let us trace inserting the words 'app', 'apple', and 'bat' into an alphabet trie, followed by a search query:
1. Insert 'app':
   Root -> create 'a' -> create 'p' -> create 'p' (mark isEnd = true).
2. Insert 'apple':
   Root -> follows existing 'a' -> follows existing 'p' -> follows existing 'p' -> create 'l' -> create 'e' (mark isEnd = true).
   Notice 'app' and 'apple' share the first 3 nodes.
3. Insert 'bat':
   Root -> create 'b' -> create 'a' -> create 't' (mark isEnd = true).

Queries:
- search('app'): Walk 'a' -> 'p' -> 'p'. Node exists and isEnd is true. Returns true.
- startsWith('appl'): Walk 'a' -> 'p' -> 'p' -> 'l'. Path exists. Returns true (even though 'appl' is not a full word).
- search('ap'): Walk 'a' -> 'p'. Node exists, but isEnd is false. Returns false.
- search('bad'): Walk 'b' -> 'a' -> 'd'. 'd' does not exist under 'a'. Returns false.

Now trace Maximum XOR of Two Numbers on array [3, 10, 5, 25]:
Expressed in 5-bit binary:
3  = 00011
10 = 01010
5  = 00101
25 = 11001

Build the binary trie with 25 (11001):
Root -> 1 -> 1 -> 0 -> 0 -> 1.
Insert 10 (01010):
Root -> 0 -> 1 -> 0 -> 1 -> 0.
Insert 5 (00101):
Root -> 0 (shares with 10) -> 0 -> 1 -> 0 -> 1.
Insert 3 (00011):
Root -> 0 -> 0 (shares with 5) -> 0 -> 1 -> 1.

Query for 5 (00101):
bit 4 (value 0): want 1. Child 1 exists (from 25)! Take 1. Contribution = 16. Current node is 25's prefix 1.
bit 3 (value 0): want 1. From 1, child 1 exists (from 25)! Take 1. Contribution = 8.
bit 2 (value 1): want 0. From 11, child 0 exists (from 25)! Take 0. Contribution = 4.
bit 1 (value 0): want 1. From 110, only child 0 exists. Must take 0. Contribution = 0.
bit 0 (value 1): want 0. From 1100, only child 1 exists. Must take 1. Contribution = 0.
Total XOR = 16 + 8 + 4 + 0 + 0 = 28 (5 XOR 25 = 28).
Checking all numbers, the maximum XOR found across all pairs is 28.`,
      },
      {
        title: "Implementation",
        body: `The alphabet trie uses an array of 26 child pointers per node. The dictionary structure supports '.' wildcard matching using recursive depth-first search.`,
        code: `// Trie (Prefix Tree) implementation with array of child pointers.
class Trie {
    struct TrieNode {
        array<TrieNode*, 26> next;
        bool isEnd;
        TrieNode() : isEnd(false) {
            next.fill(nullptr);
        }
    };
    TrieNode* root;

    TrieNode* findPrefix(const string& prefix) {
        TrieNode* cur = root;
        for (char c : prefix) {
            int idx = c - 'a';
            if (!cur->next[idx]) return nullptr;
            cur = cur->next[idx];
        }
        return cur;
    }

public:
    Trie() {
        root = new TrieNode();
    }

    void insert(const string& word) {
        TrieNode* cur = root;
        for (char c : word) {
            int idx = c - 'a';
            if (!cur->next[idx]) {
                cur->next[idx] = new TrieNode();
            }
            cur = cur->next[idx];
        }
        cur->isEnd = true;
    }

    bool search(const string& word) {
        TrieNode* node = findPrefix(word);
        return node && node->isEnd;
    }

    bool startsWith(const string& prefix) {
        return findPrefix(prefix) != nullptr;
    }
};

// Design Add and Search Words Data Structure with '.' wildcard support.
class WordDictionary {
    struct Node {
        array<Node*, 26> children;
        bool isTerminal;
        Node() : isTerminal(false) {
            children.fill(nullptr);
        }
    };
    Node* root;

    bool matchDfs(const string& word, int idx, Node* cur) {
        if (!cur) return false;
        if (idx == (int)word.size()) return cur->isTerminal;
        char c = word[idx];
        if (c != '.') {
            return matchDfs(word, idx + 1, cur->children[c - 'a']);
        }
        for (int i = 0; i < 26; i++) {
            if (cur->children[i] && matchDfs(word, idx + 1, cur->children[i])) {
                return true;
            }
        }
        return false;
    }

public:
    WordDictionary() {
        root = new Node();
    }
    void addWord(const string& word) {
        Node* cur = root;
        for (char c : word) {
            int i = c - 'a';
            if (!cur->children[i]) cur->children[i] = new Node();
            cur = cur->children[i];
        }
        cur->isTerminal = true;
    }
    bool search(const string& word) {
        return matchDfs(word, 0, root);
    }
};`,
      },
      {
        title: "Implementation: Word Search II and Maximum XOR",
        body: `The binary trie inserts integers bit-by-bit from the most significant bit down to the least significant bit. Querying the maximum XOR runs in linear time by greedily branching toward the opposite bit whenever possible.`,
        code: `// Maximum XOR of Two Numbers in an Array using a binary bitwise trie.
struct BinaryTrieNode {
    BinaryTrieNode* child[2];
    BinaryTrieNode() {
        child[0] = child[1] = nullptr;
    }
};

int findMaximumXOR(vector<int>& nums) {
    BinaryTrieNode* root = new BinaryTrieNode();
    // Insert each number into the binary trie (31 bits from MSB to LSB)
    for (int num : nums) {
        BinaryTrieNode* cur = root;
        for (int i = 31; i >= 0; i--) {
            int bit = (num >> i) & 1;
            if (!cur->child[bit]) {
                cur->child[bit] = new BinaryTrieNode();
            }
            cur = cur->child[bit];
        }
    }

    int maxXor = 0;
    // Query maximum XOR for each number
    for (int num : nums) {
        BinaryTrieNode* cur = root;
        int currentXor = 0;
        for (int i = 31; i >= 0; i--) {
            int bit = (num >> i) & 1;
            int opposite = 1 - bit;
            if (cur->child[opposite]) {
                currentXor |= (1 << i);
                cur = cur->child[opposite];
            } else {
                cur = cur->child[bit];
            }
        }
        maxXor = max(maxXor, currentXor);
    }
    return maxXor;
}`,
      },
      {
        title: "Variants",
        body: `Word Search II (Trie + 2D Backtracking): Insert all target words into a trie. For each cell in the board, initiate a DFS. At each cell (r, c), check if the character matches a child in the current trie node. If not, backtrack immediately. If a match occurs, walk to that child. If child->word is non-empty, record the found word and set child->word = "" to prevent duplicate findings. Mark the cell visited during recursion and restore it on backtrack.

Design Add and Search Words Data Structure (Wildcard Search): When searching for a word containing '.' wildcards, '.' matches any character. At each '.', the search branches into all non-null children of the current node using recursive DFS. If any branch returns true, the search succeeds.

Bitwise Trie for Maximum XOR with Constraints: In problems like Maximum XOR with an Element from Array (queries asking for max XOR with x using only numbers <= m), sort numbers and queries offline. Insert numbers into the binary trie incrementally as long as they satisfy the constraint <= m, then query the trie.

Radix Tree (Compressed Trie): In a standard trie, long single-child chains waste memory. A compressed trie (Patricia trie) collapses non-branching paths into single edges storing substrings. This guarantees that a trie storing N strings has at most 2N nodes, drastically reducing space.`,
      },
      {
        title: "Complexity",
        body: `Time complexity:
For standard string operations (insert, search, startsWith), time is strictly O(L), where L is the length of the string. It is independent of the number of words stored.
For Add and Search Words, regular searches take O(L). In the worst case where every character is '.', the search explores 26^L paths, though realistic dictionaries with pruning run much faster.
For Maximum XOR of Two Numbers, inserting each number takes O(B) where B is the number of bits (typically 32). Querying each number takes O(B). With n numbers, total time is O(n * B), which is O(32 * n) = O(n), completely eliminating the naive O(n^2) pairwise comparisons.

Space complexity:
For an alphabet trie, each node contains an array of size sigma (26 for lowercase English letters). In the worst case with no common prefixes, storing N words of length L takes O(N * L * sigma) memory.
For a binary trie, sigma = 2. Storing n numbers with B bits uses at most O(n * B) nodes, each containing only 2 pointers, taking negligible memory (at most a few megabytes for n = 10^5).`,
      },
      {
        title: "Pitfalls and edge cases",
        body: `Memory explosion with raw pointer nodes: Allocating new TrieNode() with TrieNode* children[26] consumes 26 * 8 = 208 bytes per node on 64-bit platforms. For a large dictionary with 10^6 nodes, this requires over 200MB of memory and causes heap fragmentation. In competitive programming and interviews, consider using flat vectors of nodes (vector<Node>) with integer indices, or std::unordered_map<char, TrieNode*> if branching is sparse.

Duplicate words in Word Search II: A target word can often be formed along multiple distinct paths on the grid. If you simply append words to a result vector whenever a terminal node is reached, the result will contain duplicates. The cleanest solution is to store the actual string inside the terminal node (node->word = word), and upon finding it, push it to the output and clear node->word = "" in-place.

Wildcard search base condition: In Add and Search Words, reaching the end of the query string (idx == word.size()) must return cur->isTerminal. Returning true unconditionally would incorrectly match prefixes rather than complete words.

Unreleased heap memory: Interview solutions frequently use raw pointers with new without implementing destructors. While accepted in coding interviews where processes terminate immediately after test runs, note to the interviewer that production code requires std::unique_ptr or an arena allocator to prevent memory leaks.`,
      },
      {
        title: "Practice order",
        body: `Begin with Implement Trie (Prefix Tree) to build the fundamental node structure, pointer links, and prefix search operations from scratch. Next, solve Design Add and Search Words Data Structure to practice handling wildcard branching with recursive DFS over trie children. Then tackle Word Search II to combine the trie with 2D grid backtracking, observing how trie pruning turns an intractable exponential search into an efficient crawl. Finally, master Maximum XOR of Two Numbers in an Array to see how binary tries apply prefix logic to integers to make provably optimal greedy bit choices in linear time.`,
      },
    ],
  },
};

export const DSA_ARTICLES_E1 = DSA_ARTICLES_E;
