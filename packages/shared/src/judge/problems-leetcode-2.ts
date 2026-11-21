import type { ProblemSpec } from "./types";

// Batch 2 of the roadmap problems you can run: linked lists, trees, arrays, intervals, DP and grids.
// Written for this app (see problems-leetcode.ts). Lists are JSON arrays like [1,2,3]; trees are level-order
// arrays with null for a missing child, like [1,null,2,3].

const TREE_NOTE = "A tree is given level by level, with null for a missing child: [1,null,2,3] is a root 1 with no left child, a right child 2, and 3 as the left child of 2.";

export const LEETCODE_SPECS_2: ProblemSpec[] = [
  {
    id: "lc-92",
    source: "leetcode",
    title: "Reverse Linked List II",
    statement: [
      "Given the head of a singly linked list and two positions left and right (counting from 1, with left <= right), reverse the nodes from position left to position right and return the head of the list.",
      "Nodes outside that range stay where they are.",
    ],
    constraints: ["1 <= list length <= 500", "-500 <= node value <= 500", "1 <= left <= right <= list length"],
    fn: { name: "reverseBetween", params: [{ name: "head", type: "list" }, { name: "left", type: "int" }, { name: "right", type: "int" }], returns: "list" },
    examples: [
      { input: [[1, 2, 3, 4, 5], 2, 4], output: [1, 4, 3, 2, 5], explanation: "Positions 2 to 4 hold 2,3,4. Reversed they are 4,3,2." },
      { input: [[5], 1, 1], output: [5] },
    ],
    tests: [
      { input: [[1, 2], 1, 2], output: [2, 1] },
      { input: [[1, 2, 3], 1, 3], output: [3, 2, 1] },
      { input: [[1, 2, 3], 2, 2], output: [1, 2, 3] },
      { input: [[1, 2, 3, 4, 5], 1, 2], output: [2, 1, 3, 4, 5] },
      { input: [[1, 2, 3, 4, 5], 4, 5], output: [1, 2, 3, 5, 4] },
      { input: [[3, 5], 1, 1], output: [3, 5] },
      { input: [[1, 2, 3, 4, 5, 6], 3, 6], output: [1, 2, 6, 5, 4, 3] },
    ],
    hints: [
      "Reversing the whole list is easy. Here only a middle part changes, so what must you locate first?",
      "The node just before the section. A dummy node placed in front of the head means that node always exists, even when the section starts at the first node.",
      "Standing on the node before the section, repeatedly pull the node after the current first node of the section and move it to the front of the section. Do this the right number of times.",
    ],
    solution: {
      idea: [
        "Put a dummy node before the head. Walk prev to the node just before position left. Let cur be the node after prev; it starts as the first node of the section and ends as the last.",
        "Repeat right - left times: take the node after cur, unlink it, and insert it right after prev. Each step grows the reversed block by one node. Nothing outside the section is touched, and the dummy makes left = 1 need no special case.",
      ],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    ListNode* reverseBetween(ListNode* head, int left, int right) {
        ListNode dummy(0, head);
        ListNode* prev = &dummy;
        for (int i = 1; i < left; i++) prev = prev->next;
        ListNode* cur = prev->next;
        for (int i = 0; i < right - left; i++) {
            ListNode* nxt = cur->next;
            cur->next = nxt->next;
            nxt->next = prev->next;
            prev->next = nxt;
        }
        return dummy.next;
    }
};
`,
    },
  },
  {
    id: "lc-25",
    source: "leetcode",
    title: "Reverse Nodes in k-Group",
    statement: [
      "Given the head of a linked list and a number k, reverse the nodes of the list k at a time and return the new head.",
      "If the number of nodes left at the end is less than k, leave those nodes as they are. You may change only the links between nodes, not the values stored in them.",
    ],
    constraints: ["1 <= k <= list length <= 5000", "0 <= node value <= 1000"],
    fn: { name: "reverseKGroup", params: [{ name: "head", type: "list" }, { name: "k", type: "int" }], returns: "list" },
    examples: [
      { input: [[1, 2, 3, 4, 5], 2], output: [2, 1, 4, 3, 5], explanation: "Pairs 1,2 and 3,4 are reversed; the lone 5 stays." },
      { input: [[1, 2, 3, 4, 5], 3], output: [3, 2, 1, 4, 5] },
    ],
    tests: [
      { input: [[1], 1], output: [1] },
      { input: [[1, 2], 2], output: [2, 1] },
      { input: [[1, 2, 3, 4], 4], output: [4, 3, 2, 1] },
      { input: [[1, 2, 3, 4, 5, 6], 3], output: [3, 2, 1, 6, 5, 4] },
      { input: [[1, 2, 3], 1], output: [1, 2, 3] },
      { input: [[1, 2, 3, 4, 5, 6, 7], 3], output: [3, 2, 1, 6, 5, 4, 7] },
      { input: [[1, 2, 3], 3], output: [3, 2, 1] },
    ],
    hints: [
      "Work on one group at a time. Before reversing a group, what must you know about the nodes ahead?",
      "Check that a full group of k nodes exists ahead, without changing anything. If the list runs out first, leave the rest as it is.",
      "Reverse each full group in place, then reconnect it to the end of the previous group. The old first node of the group becomes its end, which is the anchor for the next group.",
      "A dummy node before the head handles the first group. Count carefully so a partial last group is not reversed.",
    ],
    solution: {
      idea: [
        "Use a dummy head. For each group, find its k-th node; if there is none, stop. Remember the node after the group, then reverse the k nodes with the usual three-pointer loop, starting with prev set to that node-after so the old first node ends up pointing at it.",
        "Then connect the node before the group to the old k-th node (new first), and move on with the old first node as the new node-before.",
      ],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    ListNode* reverseKGroup(ListNode* head, int k) {
        ListNode dummy(0, head);
        ListNode* groupPrev = &dummy;
        while (true) {
            ListNode* kth = groupPrev;
            for (int i = 0; i < k && kth; i++) kth = kth->next;
            if (!kth) break;
            ListNode* groupNext = kth->next;
            ListNode* prev = groupNext;
            ListNode* cur = groupPrev->next;
            while (cur != groupNext) {
                ListNode* nx = cur->next;
                cur->next = prev;
                prev = cur;
                cur = nx;
            }
            ListNode* oldFirst = groupPrev->next;
            groupPrev->next = kth;
            groupPrev = oldFirst;
        }
        return dummy.next;
    }
};
`,
    },
  },
  {
    id: "lc-98",
    source: "leetcode",
    title: "Validate Binary Search Tree",
    statement: [
      "Given the root of a binary tree, decide whether it is a valid binary search tree.",
      "In a valid one, for every node, all values in its left subtree are strictly smaller than the node's value and all values in its right subtree are strictly larger. " + TREE_NOTE,
    ],
    constraints: ["1 <= number of nodes <= 10000", "-2147483648 <= node value <= 2147483647"],
    fn: { name: "isValidBST", params: [{ name: "root", type: "tree" }], returns: "bool" },
    examples: [
      { input: [[2, 1, 3]], output: true },
      { input: [[5, 1, 4, null, null, 3, 6]], output: false, explanation: "The 3 is in the right subtree of 5, but 3 is smaller than 5." },
    ],
    tests: [
      { input: [[1]], output: true },
      { input: [[2, 2, 2]], output: false },
      { input: [[5, 4, 6, null, null, 3, 7]], output: false },
      { input: [[3, 1, 5, 0, 2, 4, 6]], output: true },
      { input: [[1, 1]], output: false },
      { input: [[0, -1]], output: true },
      { input: [[2147483647]], output: true },
      { input: [[10, 5, 15, null, null, 6, 20]], output: false },
      { input: [[-2147483648, null, 2147483647]], output: true },
    ],
    hints: [
      "Checking each node only against its direct children is not enough. What should a node really be compared against?",
      "Every node must fall in a range set by all its ancestors, not just its parent. Think about what range a left child and a right child each inherit.",
      "Pass a lower and an upper bound down with each node. Going left lowers the upper bound to the parent's value; going right raises the lower bound. Use 64-bit bounds for extreme values.",
    ],
    solution: {
      idea: [
        "Pass down an open interval of allowed values. Start with (-infinity, +infinity). A node must lie strictly inside its interval; its left child gets (low, node.val) and its right child gets (node.val, high).",
        "Use long long for the bounds: with int bounds a node holding the minimum int would be rejected by a sentinel. An in-order traversal that checks the values are strictly increasing works too.",
      ],
      complexity: "O(n) time, O(h) space for the recursion (h = tree height).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    bool ok(TreeNode* n, long long low, long long high) {
        if (!n) return true;
        if (n->val <= low || n->val >= high) return false;
        return ok(n->left, low, n->val) && ok(n->right, n->val, high);
    }
public:
    bool isValidBST(TreeNode* root) {
        return ok(root, LLONG_MIN, LLONG_MAX);
    }
};
`,
    },
  },
  {
    id: "lc-543",
    source: "leetcode",
    title: "Diameter of Binary Tree",
    statement: [
      "The diameter of a binary tree is the number of edges on the longest path between any two nodes. The path may or may not pass through the root.",
      "Given the root of a tree, return its diameter. " + TREE_NOTE,
    ],
    constraints: ["1 <= number of nodes <= 10000", "-100 <= node value <= 100"],
    fn: { name: "diameterOfBinaryTree", params: [{ name: "root", type: "tree" }], returns: "int" },
    examples: [
      { input: [[1, 2, 3, 4, 5]], output: 3, explanation: "The path 4 -> 2 -> 1 -> 3 (or 5 -> 2 -> 1 -> 3) has 3 edges." },
      { input: [[1, 2]], output: 1 },
    ],
    tests: [
      { input: [[1]], output: 0 },
      { input: [[1, 2, 3]], output: 2 },
      { input: [[1, 2, null, 3, null, 4]], output: 3 },
      { input: [[1, null, 2, null, 3]], output: 2 },
      { input: [[1, 2, 3, 4, 5, 6, 7]], output: 4 },
      { input: [[1, 2, 3, 4, null, null, 5, 6, null, null, 7]], output: 6 },
    ],
    hints: [
      "Look at the highest node on any longest path. Where do the two arms of that path go from there?",
      "The longest path through a node is the depth of its left side plus the depth of its right side. The answer is the best such value over all nodes.",
      "Compute depths bottom-up in one depth-first pass. At each node, record left depth plus right depth in a running best, and return one plus the larger depth to the parent. Empty subtrees have depth 0.",
    ],
    solution: {
      idea: [
        "One post-order DFS returns each subtree's height and, as a side effect, updates the best diameter seen so far with the sum of the two child heights.",
        "Counting heights in nodes and a path in edges lines up: a node with a left subtree of height 2 and a right subtree of height 1 gives a path of 3 edges through it.",
      ],
      complexity: "O(n) time, O(h) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    int best = 0;
    int height(TreeNode* n) {
        if (!n) return 0;
        int l = height(n->left), r = height(n->right);
        best = max(best, l + r);
        return 1 + max(l, r);
    }
public:
    int diameterOfBinaryTree(TreeNode* root) {
        best = 0;
        height(root);
        return best;
    }
};
`,
    },
  },
  {
    id: "lc-102",
    source: "leetcode",
    title: "Binary Tree Level Order Traversal",
    statement: [
      "Given the root of a binary tree, return its values level by level, from left to right: first the root, then its children, then their children, and so on. Return a list of lists, one per level.",
      TREE_NOTE,
    ],
    constraints: ["0 <= number of nodes <= 2000", "-1000 <= node value <= 1000"],
    fn: { name: "levelOrder", params: [{ name: "root", type: "tree" }], returns: "int[][]" },
    examples: [
      { input: [[3, 9, 20, null, null, 15, 7]], output: [[3], [9, 20], [15, 7]] },
      { input: [[1]], output: [[1]] },
      { input: [[]], output: [], explanation: "An empty tree has no levels." },
    ],
    tests: [
      { input: [[1, 2, 3, 4, 5, 6, 7]], output: [[1], [2, 3], [4, 5, 6, 7]] },
      { input: [[1, 2, null, 3]], output: [[1], [2], [3]] },
      { input: [[1, null, 2]], output: [[1], [2]] },
      { input: [[1, 2, 3, null, 4, null, 5]], output: [[1], [2, 3], [4, 5]] },
      { input: [[0, -1, 1]], output: [[0], [-1, 1]] },
      { input: [[5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1]], output: [[5], [4, 8], [11, 13, 4], [7, 2, 1]] },
    ],
    hints: [
      "You want nodes grouped by their distance from the root. Which kind of structure hands out items in the order they were added?",
      "A queue. Start with the root, then repeatedly remove a node and add its children to the back.",
      "Before processing a round, note how many nodes are in the queue. Process exactly that many; together they form one level.",
    ],
    solution: {
      idea: [
        "Breadth-first search with a queue. At the start of each round, the queue holds exactly one level. Read its size, pop that many nodes into a list, and push their children for the next round.",
        "Return an empty list for an empty tree.",
      ],
      complexity: "O(n) time, O(w) space where w is the widest level.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<vector<int>> levelOrder(TreeNode* root) {
        vector<vector<int>> out;
        if (!root) return out;
        queue<TreeNode*> q;
        q.push(root);
        while (!q.empty()) {
            int n = (int)q.size();
            vector<int> level;
            for (int i = 0; i < n; i++) {
                TreeNode* x = q.front();
                q.pop();
                level.push_back(x->val);
                if (x->left) q.push(x->left);
                if (x->right) q.push(x->right);
            }
            out.push_back(level);
        }
        return out;
    }
};
`,
    },
  },
  {
    id: "lc-199",
    source: "leetcode",
    title: "Binary Tree Right Side View",
    statement: [
      "Imagine standing on the right side of a binary tree. Return the values of the nodes you can see, from top to bottom.",
      "In other words, for each level, the rightmost node's value. " + TREE_NOTE,
    ],
    constraints: ["0 <= number of nodes <= 100", "-100 <= node value <= 100"],
    fn: { name: "rightSideView", params: [{ name: "root", type: "tree" }], returns: "int[]" },
    examples: [
      { input: [[1, 2, 3, null, 5, null, 4]], output: [1, 3, 4] },
      { input: [[1, null, 3]], output: [1, 3] },
      { input: [[]], output: [] },
    ],
    tests: [
      { input: [[1]], output: [1] },
      { input: [[1, 2]], output: [1, 2] },
      { input: [[1, 2, 3, null, 5]], output: [1, 3, 5] },
      { input: [[1, 2, 3, 4]], output: [1, 3, 4] },
      { input: [[1, 2, 3, 4, 5, 6, 7]], output: [1, 3, 7] },
      { input: [[1, 2, 3, null, null, 4]], output: [1, 3, 4] },
    ],
    hints: [
      "Imagine the tree seen from its right side. Which node on each level would you see?",
      "The last node of each level when the level is read from left to right.",
      "Do a level-by-level pass and keep only the last node of each level. A depth-first pass that visits the right child first also works.",
    ],
    solution: {
      idea: [
        "Level-order BFS. Process the queue one level at a time; when you reach the last node of the level (index size - 1), add its value to the answer.",
        "The mirror approach is DFS going right first: the first time you see a depth you have not recorded, that node is the one visible from the right.",
      ],
      complexity: "O(n) time, O(w) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> rightSideView(TreeNode* root) {
        vector<int> out;
        if (!root) return out;
        queue<TreeNode*> q;
        q.push(root);
        while (!q.empty()) {
            int n = (int)q.size();
            for (int i = 0; i < n; i++) {
                TreeNode* x = q.front();
                q.pop();
                if (i == n - 1) out.push_back(x->val);
                if (x->left) q.push(x->left);
                if (x->right) q.push(x->right);
            }
        }
        return out;
    }
};
`,
    },
  },
  {
    id: "lc-230",
    source: "leetcode",
    title: "Kth Smallest Element in a BST",
    statement: [
      "Given the root of a binary search tree and a number k, return the k-th smallest value among all the nodes, counting from 1.",
      TREE_NOTE,
    ],
    constraints: ["1 <= k <= number of nodes <= 10000", "0 <= node value <= 10000", "The tree is a valid binary search tree"],
    fn: { name: "kthSmallest", params: [{ name: "root", type: "tree" }, { name: "k", type: "int" }], returns: "int" },
    examples: [
      { input: [[3, 1, 4, null, 2], 1], output: 1 },
      { input: [[5, 3, 6, 2, 4, null, null, 1], 3], output: 3 },
    ],
    tests: [
      { input: [[1], 1], output: 1 },
      { input: [[2, 1, 3], 2], output: 2 },
      { input: [[2, 1, 3], 3], output: 3 },
      { input: [[5, 3, 6, 2, 4, null, null, 1], 6], output: 6 },
      { input: [[3, 1, 4, null, 2], 4], output: 4 },
      { input: [[4, 2, 6, 1, 3, 5, 7], 5], output: 5 },
    ],
    hints: [
      "In a binary search tree, which order of visiting nodes lists the values from smallest to largest?",
      "In-order: left subtree, then the node, then right subtree. The k-th node visited is the answer.",
      "Walk in-order with an explicit stack and count the visited nodes. Stop as soon as the count reaches k, so you never visit more than needed.",
    ],
    solution: {
      idea: [
        "In-order traversal visits a BST in increasing order. Use an explicit stack: push the left spine, pop a node (that is the next smallest), then continue with its right subtree. Decrement k each time you pop; when it hits 0, return that node's value.",
        "This stops after k pops, so it costs O(h + k) instead of walking the whole tree.",
      ],
      complexity: "O(h + k) time, O(h) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int kthSmallest(TreeNode* root, int k) {
        vector<TreeNode*> st;
        TreeNode* cur = root;
        while (cur || !st.empty()) {
            while (cur) {
                st.push_back(cur);
                cur = cur->left;
            }
            cur = st.back();
            st.pop_back();
            if (--k == 0) return cur->val;
            cur = cur->right;
        }
        return -1;
    }
};
`,
    },
  },
  {
    id: "lc-105",
    source: "leetcode",
    title: "Construct Binary Tree from Preorder and Inorder Traversal",
    statement: [
      "You are given two lists that describe the same binary tree of distinct values: its preorder traversal (node, left subtree, right subtree) and its inorder traversal (left subtree, node, right subtree).",
      "Rebuild the tree and return its root. " + TREE_NOTE.replace("A tree is given", "The result is written the same way; a tree is given"),
    ],
    constraints: ["1 <= length <= 3000", "-3000 <= value <= 3000", "All values are distinct", "Both lists describe the same tree"],
    fn: { name: "buildTree", params: [{ name: "preorder", type: "int[]" }, { name: "inorder", type: "int[]" }], returns: "tree" },
    examples: [
      { input: [[3, 9, 20, 15, 7], [9, 3, 15, 20, 7]], output: [3, 9, 20, null, null, 15, 7] },
      { input: [[-1], [-1]], output: [-1] },
    ],
    tests: [
      { input: [[1, 2], [2, 1]], output: [1, 2] },
      { input: [[1, 2], [1, 2]], output: [1, null, 2] },
      { input: [[1, 2, 3], [2, 1, 3]], output: [1, 2, 3] },
      { input: [[1, 2, 4, 5, 3], [4, 2, 5, 1, 3]], output: [1, 2, 3, 4, 5] },
      { input: [[1, 2, 3], [3, 2, 1]], output: [1, 2, null, 3] },
      { input: [[1, 2, 3], [1, 2, 3]], output: [1, null, 2, null, 3] },
    ],
    hints: [
      "The first preorder value is always a root. Where does it sit in the inorder list, and what does that split tell you?",
      "Everything left of the root in inorder belongs to the left subtree, and everything right of it belongs to the right subtree. The same sizes split the preorder list too.",
      "Recurse on each part. Store each value's inorder position in a lookup table so the split point is found quickly. Build the left subtree before the right, taking preorder values in order.",
    ],
    solution: {
      idea: [
        "Keep a pointer into the preorder list. The value at the pointer is the root of the current range of inorder. Look up its inorder position; the range to its left builds the left subtree, the range to its right builds the right subtree.",
        "Because preorder visits the whole left subtree before the right one, advancing the single pointer as you go gives each recursive call exactly the right root. The map avoids searching the inorder list each time.",
      ],
      complexity: "O(n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    unordered_map<int, int> pos;
    int next = 0;
    TreeNode* build(vector<int>& pre, int lo, int hi) {
        if (lo > hi) return nullptr;
        int v = pre[next++];
        TreeNode* node = new TreeNode(v);
        int mid = pos[v];
        node->left = build(pre, lo, mid - 1);
        node->right = build(pre, mid + 1, hi);
        return node;
    }
public:
    TreeNode* buildTree(vector<int>& preorder, vector<int>& inorder) {
        pos.clear();
        next = 0;
        for (int i = 0; i < (int)inorder.size(); i++) pos[inorder[i]] = i;
        return build(preorder, 0, (int)inorder.size() - 1);
    }
};
`,
    },
  },
  {
    id: "lc-337",
    source: "leetcode",
    title: "House Robber III",
    statement: [
      "A thief finds a neighbourhood where the houses form a binary tree. Each node holds the money in that house. If the thief robs a house, the alarm goes off if he also robs a house directly connected to it (its parent or one of its children).",
      "Given the root, return the largest amount he can take without triggering the alarm. " + TREE_NOTE,
    ],
    constraints: ["1 <= number of nodes <= 10000", "0 <= node value <= 10000"],
    fn: { name: "rob", params: [{ name: "root", type: "tree" }], returns: "int" },
    examples: [
      { input: [[3, 2, 3, null, 3, null, 1]], output: 7, explanation: "Rob 3 + 3 + 1 = 7 (the root and the two lowest nodes)." },
      { input: [[3, 4, 5, 1, 3, null, 1]], output: 9, explanation: "Rob 4 + 5 = 9." },
    ],
    tests: [
      { input: [[1]], output: 1 },
      { input: [[2, 1, 3, null, 4]], output: 7 },
      { input: [[4, 1, null, 2, null, 3]], output: 7 },
      { input: [[1, 2, 3]], output: 5 },
      { input: [[10, 1, 1]], output: 10 },
      { input: [[5, 4, 6, 1, 1, null, 10]], output: 17 },
    ],
    hints: [
      "For each house you can rob it or skip it. If you rob it, what does that force for the houses directly connected to it?",
      "Robbing a house forces both of its children to be skipped. Skipping it leaves each child free to be robbed or skipped, whichever is better.",
      "Return two totals from each subtree: the best if its root is robbed and the best if its root is skipped. Combine the children's pairs at the parent, then take the better of the top pair.",
    ],
    solution: {
      idea: [
        "For a node, rob = node.val + skip(left) + skip(right), and skip = max(rob, skip) of the left child + max(rob, skip) of the right child. Return the pair from a post-order DFS and take the larger of the two at the root.",
        "Returning a pair means each node is computed once. Recursing with a plain 'best of this subtree' function repeats work and is exponential.",
      ],
      complexity: "O(n) time, O(h) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
    // first = best if this node is robbed, second = best if it is skipped
    pair<int, int> go(TreeNode* n) {
        if (!n) return {0, 0};
        auto l = go(n->left), r = go(n->right);
        int robbed = n->val + l.second + r.second;
        int skipped = max(l.first, l.second) + max(r.first, r.second);
        return {robbed, skipped};
    }
public:
    int rob(TreeNode* root) {
        auto p = go(root);
        return max(p.first, p.second);
    }
};
`,
    },
  },
  {
    id: "lc-238",
    source: "leetcode",
    title: "Product of Array Except Self",
    statement: [
      "Given a list of integers nums, return a list answer where answer[i] is the product of all the elements of nums except nums[i].",
      "Do it without using division, in O(n) time. The product of any prefix or suffix fits in a 32-bit integer.",
    ],
    constraints: ["2 <= nums.length <= 100000", "-30 <= nums[i] <= 30", "Any prefix or suffix product fits in a 32-bit integer"],
    fn: { name: "productExceptSelf", params: [{ name: "nums", type: "int[]" }], returns: "int[]" },
    examples: [
      { input: [[1, 2, 3, 4]], output: [24, 12, 8, 6] },
      { input: [[-1, 1, 0, -3, 3]], output: [0, 0, 9, 0, 0] },
    ],
    tests: [
      { input: [[2, 3]], output: [3, 2] },
      { input: [[1, 1, 1]], output: [1, 1, 1] },
      { input: [[0, 0]], output: [0, 0] },
      { input: [[5, 0, 2]], output: [0, 10, 0] },
      { input: [[-1, -1]], output: [-1, -1] },
      { input: [[2, 2, 2, 2]], output: [8, 8, 8, 8] },
    ],
    hints: [
      "The answer at each position is everything to its left multiplied by everything to its right. Can you collect those two parts separately?",
      "Compute the product of everything to the left of every position in one pass, and the product of everything to the right in another. Division is not allowed.",
      "Write the left products into the output array. Then walk from the right with one running product of everything to the right, multiplying it into each output value.",
    ],
    solution: {
      idea: [
        "Pass 1 (left to right): answer[i] = product of nums[0..i-1], using a running product that starts at 1.",
        "Pass 2 (right to left): multiply answer[i] by the running product of nums[i+1..n-1], which also starts at 1. Zeros need no special handling because no division is used.",
      ],
      complexity: "O(n) time, O(1) extra space besides the output.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> productExceptSelf(vector<int>& nums) {
        int n = (int)nums.size();
        vector<int> ans(n, 1);
        int left = 1;
        for (int i = 0; i < n; i++) {
            ans[i] = left;
            left *= nums[i];
        }
        int right = 1;
        for (int i = n - 1; i >= 0; i--) {
            ans[i] *= right;
            right *= nums[i];
        }
        return ans;
    }
};
`,
    },
  },
  {
    id: "lc-15",
    source: "leetcode",
    title: "3Sum",
    statement: [
      "Given a list of integers nums, return all the different triplets [a, b, c] of values (taken from three different positions) that add up to 0.",
      "The answer must not contain the same triplet twice, even if the numbers appear several times in the input. The order of the triplets, and the order inside each triplet, do not matter.",
    ],
    constraints: ["3 <= nums.length <= 3000", "-100000 <= nums[i] <= 100000"],
    fn: { name: "threeSum", params: [{ name: "nums", type: "int[]" }], returns: "int[][]" },
    unordered: true,
    examples: [
      { input: [[-1, 0, 1, 2, -1, -4]], output: [[-1, -1, 2], [-1, 0, 1]] },
      { input: [[0, 1, 1]], output: [] },
      { input: [[0, 0, 0]], output: [[0, 0, 0]] },
    ],
    tests: [
      { input: [[0, 0, 0, 0]], output: [[0, 0, 0]] },
      { input: [[-2, 0, 1, 1, 2]], output: [[-2, 0, 2], [-2, 1, 1]] },
      { input: [[1, 2, -2, -1]], output: [] },
      { input: [[-1, 0, 1]], output: [[-1, 0, 1]] },
      { input: [[3, 0, -2, -1, 1, 2]], output: [[-2, -1, 3], [-2, 0, 2], [-1, 0, 1]] },
      { input: [[-1, -1, -1, 2]], output: [[-1, -1, 2]] },
    ],
    hints: [
      "Fixing one number reduces the problem to one you already know. What is it?",
      "It is Two Sum on the rest of the list, aiming for the negative of the fixed number. Sorting the list turns this into a two-pointer scan.",
      "Sort first. Skip repeated first numbers, and after finding a triplet, skip repeated values on both pointers so the same triplet is not reported twice.",
    ],
    solution: {
      idea: [
        "Sort. For each index i (skipping repeated values), run a two-pointer scan on the sorted rest. When the three numbers sum to 0, record them and move both pointers past any equal neighbours so the same triplet is not recorded again.",
        "You can also stop early once nums[i] > 0, because the numbers after it are not smaller.",
      ],
      complexity: "O(n^2) time, O(1) extra space besides the output (sorting aside).",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<vector<int>> threeSum(vector<int>& nums) {
        sort(nums.begin(), nums.end());
        vector<vector<int>> out;
        int n = (int)nums.size();
        for (int i = 0; i + 2 < n && nums[i] <= 0; i++) {
            if (i > 0 && nums[i] == nums[i - 1]) continue;
            int l = i + 1, r = n - 1;
            while (l < r) {
                long long s = (long long)nums[i] + nums[l] + nums[r];
                if (s < 0) l++;
                else if (s > 0) r--;
                else {
                    out.push_back({nums[i], nums[l], nums[r]});
                    l++;
                    r--;
                    while (l < r && nums[l] == nums[l - 1]) l++;
                    while (l < r && nums[r] == nums[r + 1]) r--;
                }
            }
        }
        return out;
    }
};
`,
    },
  },
  {
    id: "lc-49",
    source: "leetcode",
    title: "Group Anagrams",
    statement: [
      "Given a list of strings, group together the strings that are anagrams of each other (they use exactly the same letters the same number of times).",
      "Return the groups in any order, with the strings inside a group in any order.",
    ],
    constraints: ["1 <= strs.length <= 10000", "0 <= strs[i].length <= 100", "strs[i] has only lowercase letters"],
    fn: { name: "groupAnagrams", params: [{ name: "strs", type: "string[]" }], returns: "string[][]" },
    unordered: true,
    examples: [
      { input: [["eat", "tea", "tan", "ate", "nat", "bat"]], output: [["bat"], ["nat", "tan"], ["ate", "eat", "tea"]] },
      { input: [[""]], output: [[""]] },
      { input: [["a"]], output: [["a"]] },
    ],
    tests: [
      { input: [["ab", "ba"]], output: [["ab", "ba"]] },
      { input: [["abc", "def"]], output: [["abc"], ["def"]] },
      { input: [["a", "b", "a"]], output: [["a", "a"], ["b"]] },
      { input: [["aab", "aba", "baa", "abb"]], output: [["aab", "aba", "baa"], ["abb"]] },
      { input: [["", ""]], output: [["", ""]] },
      { input: [["cab", "abc", "bca", "xyz", "zyx"]], output: [["cab", "abc", "bca"], ["xyz", "zyx"]] },
    ],
    hints: [
      "Two words are anagrams exactly when they contain the same letters in the same counts. What could you use as a shared label for each group?",
      "The sorted letters of a word make a label. Counting the 26 letters is faster than sorting each word.",
      "Use the label as a key in a lookup table that maps each label to a list of words. Put each word under its label, then output the lists.",
    ],
    solution: {
      idea: [
        "Map from a canonical count signature to the list of words sharing it. For each string, count the frequencies of characters 'a' through 'z' and format into a delimiter-separated key.",
        "Grouping by character frequency takes O(k) time per word of length k, achieving an optimal O(n * k) time without sorting.",
      ],
      complexity: "O(n * k) time, O(n * k) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<vector<string>> groupAnagrams(vector<string>& strs) {
        unordered_map<string, vector<string>> groups;
        for (const string& s : strs) {
            int count[26] = {0};
            for (char c : s) count[c - 'a']++;
            string key;
            for (int i = 0; i < 26; i++) {
                key += to_string(count[i]) + "#";
            }
            groups[key].push_back(s);
        }
        vector<vector<string>> out;
        for (auto& g : groups) out.push_back(move(g.second));
        return out;
    }
};
`,
    },
  },
  {
    id: "lc-56",
    source: "leetcode",
    title: "Merge Intervals",
    statement: [
      "Given a list of intervals [start, end], merge all the intervals that overlap and return the resulting list of non-overlapping intervals that cover the same points.",
      "Intervals that only touch (like [1,4] and [4,5]) count as overlapping. Return the result sorted by start.",
    ],
    constraints: ["1 <= intervals.length <= 10000", "intervals[i].length == 2", "0 <= start <= end <= 10000"],
    fn: { name: "merge", params: [{ name: "intervals", type: "int[][]" }], returns: "int[][]" },
    examples: [
      { input: [[[1, 3], [2, 6], [8, 10], [15, 18]]], output: [[1, 6], [8, 10], [15, 18]], explanation: "[1,3] and [2,6] overlap and become [1,6]." },
      { input: [[[1, 4], [4, 5]]], output: [[1, 5]] },
    ],
    tests: [
      { input: [[[1, 4], [0, 4]]], output: [[0, 4]] },
      { input: [[[1, 4], [2, 3]]], output: [[1, 4]] },
      { input: [[[1, 2]]], output: [[1, 2]] },
      { input: [[[2, 3], [4, 5], [6, 7]]], output: [[2, 3], [4, 5], [6, 7]] },
      { input: [[[1, 4], [0, 0]]], output: [[0, 0], [1, 4]] },
      { input: [[[5, 6], [1, 3], [2, 4]]], output: [[1, 4], [5, 6]] },
      { input: [[[1, 10], [2, 3], [4, 5], [6, 7]]], output: [[1, 10]] },
    ],
    hints: [
      "If the intervals are ordered by where they start, which earlier intervals can the current one still touch?",
      "Only the most recent merged interval. Once the intervals are sorted by start, overlaps can be checked against the last result.",
      "Sort by start. Extend the last merged interval when the next one starts at or before its end; otherwise start a new one. Touching intervals count as overlapping.",
    ],
    solution: {
      idea: [
        "Sort by start. Keep an output list; for each interval, compare its start with the end of the last output interval. If it is not past that end, merge by taking the larger end. Otherwise push it as a new interval.",
        "Taking the maximum of the two ends matters: a long interval can swallow a shorter one that comes after it, as in [1,10] and [2,3].",
      ],
      complexity: "O(n log n) time for the sort, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<vector<int>> merge(vector<vector<int>>& intervals) {
        sort(intervals.begin(), intervals.end());
        vector<vector<int>> out;
        for (auto& iv : intervals) {
            if (!out.empty() && iv[0] <= out.back()[1]) out.back()[1] = max(out.back()[1], iv[1]);
            else out.push_back(iv);
        }
        return out;
    }
};
`,
    },
  },
  {
    id: "lc-739",
    source: "leetcode",
    title: "Daily Temperatures",
    statement: [
      "Given a list of daily temperatures, return a list where answer[i] is the number of days you have to wait after day i to get a warmer temperature.",
      "If there is no future day that is warmer, answer[i] is 0.",
    ],
    constraints: ["1 <= temperatures.length <= 100000", "30 <= temperatures[i] <= 100"],
    fn: { name: "dailyTemperatures", params: [{ name: "temperatures", type: "int[]" }], returns: "int[]" },
    examples: [
      { input: [[73, 74, 75, 71, 69, 72, 76, 73]], output: [1, 1, 4, 2, 1, 1, 0, 0] },
      { input: [[30, 40, 50, 60]], output: [1, 1, 1, 0] },
      { input: [[30, 60, 90]], output: [1, 1, 0] },
    ],
    tests: [
      { input: [[90, 80, 70]], output: [0, 0, 0] },
      { input: [[50]], output: [0] },
      { input: [[70, 70, 70]], output: [0, 0, 0] },
      { input: [[80, 70, 90]], output: [2, 1, 0] },
      { input: [[60, 50, 70, 40, 80]], output: [2, 1, 2, 1, 0] },
      { input: [[55, 38, 53, 81, 61, 93, 97, 32, 43, 78]], output: [3, 1, 1, 2, 1, 1, 0, 1, 1, 0] },
    ],
    hints: [
      "For each day, you want to know how far away the next warmer day is. Which earlier days are still waiting for a warmer day?",
      "The days still waiting form a pile. The most recent waiting day is the one most likely to be resolved next.",
      "Keep a stack of days still waiting. When a day is warmer than the day on top, pop that waiting day and record the gap. Then push today.",
    ],
    solution: {
      idea: [
        "A monotonic stack of day indices whose temperatures are non-increasing from bottom to top. A new, warmer day resolves every day on top of the stack that is colder than it, so pop them and record the distance.",
        "Each index is pushed and popped at most once, so the whole scan is linear even though there is a loop inside the loop.",
      ],
      complexity: "O(n) time, O(n) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> dailyTemperatures(vector<int>& temperatures) {
        int n = (int)temperatures.size();
        vector<int> ans(n, 0);
        vector<int> st;
        for (int i = 0; i < n; i++) {
            while (!st.empty() && temperatures[st.back()] < temperatures[i]) {
                ans[st.back()] = i - st.back();
                st.pop_back();
            }
            st.push_back(i);
        }
        return ans;
    }
};
`,
    },
  },
  {
    id: "lc-198",
    source: "leetcode",
    title: "House Robber",
    statement: [
      "Houses stand in a row, and nums[i] is the money in house i. You cannot rob two houses that are next to each other.",
      "Return the largest amount you can rob.",
    ],
    constraints: ["1 <= nums.length <= 100", "0 <= nums[i] <= 400"],
    fn: { name: "rob", params: [{ name: "nums", type: "int[]" }], returns: "int" },
    examples: [
      { input: [[1, 2, 3, 1]], output: 4, explanation: "Rob house 0 and house 2: 1 + 3." },
      { input: [[2, 7, 9, 3, 1]], output: 12, explanation: "Rob houses 0, 2 and 4: 2 + 9 + 1." },
    ],
    tests: [
      { input: [[2, 1, 1, 2]], output: 4 },
      { input: [[5]], output: 5 },
      { input: [[1, 2]], output: 2 },
      { input: [[0]], output: 0 },
      { input: [[10, 1, 1, 10]], output: 20 },
      { input: [[3, 10, 3, 1, 2]], output: 12 },
      { input: [[100, 1, 1, 100, 1]], output: 200 },
      { input: [[4, 1, 2, 7, 5, 3, 1]], output: 14 },
    ],
    hints: [
      "Think about the last house. Either you rob it or you do not. What does each choice allow for the houses before it?",
      "If you rob it, you add its money to the best total up to two houses back. If you skip it, the best total is the one up to the previous house.",
      "Only the last two best totals matter, so two variables are enough. Update them as you walk along the row.",
    ],
    solution: {
      idea: [
        "Let best(i) be the most you can get from the first i houses. For house i you either skip it (best(i-1)) or rob it and use best(i-2): the maximum of the two.",
        "Roll two variables forward through the list. A single house returns its own value; an empty prefix is worth 0.",
      ],
      complexity: "O(n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int rob(vector<int>& nums) {
        int prev2 = 0, prev1 = 0;
        for (int x : nums) {
            int cur = max(prev1, prev2 + x);
            prev2 = prev1;
            prev1 = cur;
        }
        return prev1;
    }
};
`,
    },
  },
  {
    id: "lc-322",
    source: "leetcode",
    title: "Coin Change",
    statement: [
      "You have coins of several values (an unlimited supply of each) and a target amount of money.",
      "Return the smallest number of coins that add up to exactly the amount, or -1 if it cannot be done. An amount of 0 needs 0 coins.",
    ],
    constraints: ["1 <= coins.length <= 12", "1 <= coins[i] <= 2147483647", "0 <= amount <= 10000"],
    fn: { name: "coinChange", params: [{ name: "coins", type: "int[]" }, { name: "amount", type: "int" }], returns: "int" },
    examples: [
      { input: [[1, 2, 5], 11], output: 3, explanation: "5 + 5 + 1." },
      { input: [[2], 3], output: -1 },
      { input: [[1], 0], output: 0 },
    ],
    tests: [
      { input: [[1], 2], output: 2 },
      { input: [[1, 3, 4], 6], output: 2 },
      { input: [[5, 10], 3], output: -1 },
      { input: [[2, 4], 7], output: -1 },
      { input: [[1, 5, 6, 9], 11], output: 2 },
      { input: [[7, 2, 3], 11], output: 3 },
      { input: [[2, 5, 10, 1], 27], output: 4 },
    ],
    hints: [
      "Taking the biggest coin first is tempting. Does that always give the fewest coins? Try a small example to see.",
      "Build the fewest-coins answer for an amount from the answers for smaller amounts. The last coin added could be any of the coin values.",
      "Fill a table from 0 up to the target. For each amount, try each coin and take one plus the table value at the amount minus that coin. Use a large value for impossible amounts and return -1 if the target stays impossible.",
    ],
    solution: {
      idea: [
        "Bottom-up DP over amounts from 0 to amount. Start with fewest[0] = 0 and everything else 'infinity' (amount + 1 is enough). For each amount and each coin that fits, try fewest[a - coin] + 1.",
        "At the end, if fewest[amount] is still 'infinity', no combination works, so return -1. Skip coins larger than the amount; they can also overflow when subtracted in 32-bit arithmetic.",
      ],
      complexity: "O(amount * coins) time, O(amount) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int coinChange(vector<int>& coins, int amount) {
        vector<int> fewest(amount + 1, amount + 1);
        fewest[0] = 0;
        for (int a = 1; a <= amount; a++) {
            for (int c : coins) {
                if (c <= a) fewest[a] = min(fewest[a], fewest[a - c] + 1);
            }
        }
        return fewest[amount] > amount ? -1 : fewest[amount];
    }
};
`,
    },
  },
  {
    id: "lc-33",
    source: "leetcode",
    title: "Search in Rotated Sorted Array",
    statement: [
      "A sorted list of distinct integers was rotated at some unknown point, so [0,1,2,4,5,6,7] could become [4,5,6,7,0,1,2].",
      "Given the rotated list and a target, return the position of the target, or -1 if it is not there. Your solution must run in O(log n) time.",
    ],
    constraints: ["1 <= nums.length <= 5000", "-10000 <= nums[i] <= 10000", "All values are distinct", "nums is a sorted list rotated some number of times (possibly zero)"],
    fn: { name: "search", params: [{ name: "nums", type: "int[]" }, { name: "target", type: "int" }], returns: "int" },
    examples: [
      { input: [[4, 5, 6, 7, 0, 1, 2], 0], output: 4 },
      { input: [[4, 5, 6, 7, 0, 1, 2], 3], output: -1 },
      { input: [[1], 0], output: -1 },
    ],
    tests: [
      { input: [[1], 1], output: 0 },
      { input: [[3, 1], 1], output: 1 },
      { input: [[3, 1], 3], output: 0 },
      { input: [[5, 1, 3], 5], output: 0 },
      { input: [[5, 1, 3], 3], output: 2 },
      { input: [[6, 7, 0, 1, 2, 4, 5], 4], output: 5 },
      { input: [[1, 3], 3], output: 1 },
      { input: [[2, 3, 4, 5, 6, 7, 8, 9, 1], 9], output: 7 },
    ],
    hints: [
      "Plain binary search needs a sorted list. After the rotation, is any part of the list still sorted around the middle?",
      "At least one half around the middle is always in sorted order. Comparing the outer value with the middle tells you which half that is.",
      "If the target lies within the sorted half's range, search there; otherwise search the other half. Be careful at the boundaries when a range has only one element.",
    ],
    solution: {
      idea: [
        "Binary search with an extra question at each step: which half is sorted? If nums[lo] <= nums[mid], the left half is sorted; otherwise the right half is. Check whether the target lies within the sorted half's range. If it does, keep that half; if not, keep the other.",
        "Because the values are distinct, the comparisons are never ambiguous. Each step discards half the list.",
      ],
      complexity: "O(log n) time, O(1) space.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int search(vector<int>& nums, int target) {
        int lo = 0, hi = (int)nums.size() - 1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] == target) return mid;
            if (nums[lo] <= nums[mid]) {
                if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
                else lo = mid + 1;
            } else {
                if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
                else hi = mid - 1;
            }
        }
        return -1;
    }
};
`,
    },
  },
  {
    id: "lc-200",
    source: "leetcode",
    title: "Number of Islands",
    statement: [
      "You get a grid of characters, where '1' is land and '0' is water. An island is a group of land cells connected up, down, left or right (not diagonally). Count the islands.",
      "In the tests the grid is a list of rows, each a list of the strings \"1\" and \"0\".",
    ],
    constraints: ["1 <= rows, columns <= 300", "Each cell is the string 1 or the string 0"],
    fn: { name: "numIslands", params: [{ name: "grid", type: "string[][]" }], returns: "int" },
    examples: [
      {
        input: [[["1", "1", "1", "1", "0"], ["1", "1", "0", "1", "0"], ["1", "1", "0", "0", "0"], ["0", "0", "0", "0", "0"]]],
        output: 1,
      },
      {
        input: [[["1", "1", "0", "0", "0"], ["1", "1", "0", "0", "0"], ["0", "0", "1", "0", "0"], ["0", "0", "0", "1", "1"]]],
        output: 3,
      },
    ],
    tests: [
      { input: [[["1"]]], output: 1 },
      { input: [[["0"]]], output: 0 },
      { input: [[["1", "0", "1"], ["0", "1", "0"], ["1", "0", "1"]]], output: 5 },
      { input: [[["1", "1", "1"], ["0", "1", "0"], ["1", "1", "1"]]], output: 1 },
      { input: [[["1", "0", "1", "1", "0", "1", "1"]]], output: 3 },
      { input: [[["1"], ["0"], ["1"]]], output: 2 },
    ],
    hints: [
      "When you find a land cell you have not seen before, you have found a new island. How do you avoid counting the rest of that island again?",
      "Explore everything connected to it, moving up, down, left and right, and mark every land cell you reach as seen.",
      "Count each new starting cell once. Marking cells as seen by changing them to water avoids needing a separate visited record.",
    ],
    solution: {
      idea: [
        "Scan every cell. When you meet a '1', add one to the count and flood-fill the island from there, setting each land cell you touch to '0' so it is never counted again. The flood fill visits the four neighbours of each cell.",
        "An explicit stack or queue instead of recursion avoids deep recursion on a 300 by 300 grid of land.",
      ],
      complexity: "O(rows * columns) time, O(rows * columns) worst-case space for the stack.",
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int numIslands(vector<vector<string>>& grid) {
        int rows = (int)grid.size(), cols = (int)grid[0].size(), count = 0;
        const int dr[4] = {1, -1, 0, 0}, dc[4] = {0, 0, 1, -1};
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (grid[r][c] != "1") continue;
                count++;
                vector<pair<int, int>> st = {{r, c}};
                grid[r][c] = "0";
                while (!st.empty()) {
                    auto [x, y] = st.back();
                    st.pop_back();
                    for (int d = 0; d < 4; d++) {
                        int nx = x + dr[d], ny = y + dc[d];
                        if (nx >= 0 && nx < rows && ny >= 0 && ny < cols && grid[nx][ny] == "1") {
                            grid[nx][ny] = "0";
                            st.push_back({nx, ny});
                        }
                    }
                }
            }
        }
        return count;
    }
};
`,
    },
  },
];
