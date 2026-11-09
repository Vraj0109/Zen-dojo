import type { PatternArticle } from "./types";

// Full pattern articles, group "Trees", first half (plan 0008, batch 4): tree-dfs, tree-bfs, tree-construct.
// Format and rules: plan 0007. Code is C++17. Blocks of one article are concatenated and compiled together, so helper
// names are unique per article.

export const DSA_ARTICLES_E1: Record<string, PatternArticle> = {
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
};
