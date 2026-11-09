import { designProblem, seq } from "./design";
import type { ProblemSpec } from "./types";

const CALLS = "Each test gives the operations in order (the class name first, then method names) and their arguments; the expected answer has one entry per operation, with null for the constructor and for methods that return nothing.";

export const SPECIAL_SPECS: ProblemSpec[] = [
  // 1. lc-297: Serialize and Deserialize Binary Tree
  {
    id: "lc-297",
    source: "leetcode",
    title: "Serialize and Deserialize Binary Tree",
    statement: [
      "Serialization is the process of converting a data structure or object into a sequence of bits so that it can be stored in a file or memory buffer, or transmitted across a network connection link to be reconstructed later in the same or another computer environment.",
      "Design an algorithm to serialize and deserialize a binary tree. There is no restriction on how your serialization and deserialization algorithm should work. You just need to ensure that a binary tree can be serialized to a string and this string can be deserialized to the original tree structure.",
      "Clarification: The input and output format matches how binary trees are serialized in test cases (level-order traversal with null for empty children). Your Codec class does not need to use this exact string format internally, as long as deserialize(serialize(root)) reconstructs the identical tree structure and values.",
    ],
    constraints: [
      "The number of nodes in the tree is in the range [0, 10000].",
      "-1000 <= Node.val <= 1000",
    ],
    fn: { name: "serialize", params: [{ name: "root", type: "tree" }], returns: "tree" },
    examples: [
      {
        input: [[1, 2, 3, null, null, 4, 5]],
        output: [1, 2, 3, null, null, 4, 5],
        explanation: "The tree [1, 2, 3, null, null, 4, 5] is serialized to a string by serialize and reconstructed by deserialize to the exact same tree structure.",
      },
      {
        input: [[]],
        output: [],
        explanation: "An empty tree serializes and deserializes back to an empty tree.",
      },
    ],
    tests: [
      { input: [[1]], output: [1] },
      { input: [[1, 2]], output: [1, 2] },
      { input: [[1, null, 2]], output: [1, null, 2] },
      { input: [[1, null, 2, null, 3, null, 4]], output: [1, null, 2, null, 3, null, 4] },
      { input: [[4, 3, null, 2, null, 1]], output: [4, 3, null, 2, null, 1] },
      { input: [[1, 2, 3, 4, 5, 6, 7]], output: [1, 2, 3, 4, 5, 6, 7] },
      { input: [[-10, 5, -20, null, 8, -30, 40]], output: [-10, 5, -20, null, 8, -30, 40] },
      { input: [[0, 0, 0, null, null, 0]], output: [0, 0, 0, null, null, 0] },
    ],
    hints: [
      "You can use pre-order traversal (DFS) or level-order traversal (BFS) to represent the tree as a string.",
      "When serializing with pre-order traversal, record a special delimiter (like '#') for null nodes and commas between values.",
      "Deserialization can then read tokens one by one: if a token is '#', return null; otherwise construct a TreeNode and recursively deserialize its left and right subtrees.",
    ],
    solution: {
      idea: [
        "Use pre-order traversal with a delimiter to serialize the tree. Record null pointers as a sentinel token like '#'.",
        "During deserialization, read the tokens in the same pre-order sequence. A non-sentinel value creates a node, whose left and right children are recursively reconstructed from the subsequent tokens.",
      ],
      complexity: "O(n) time and O(n) space where n is the number of nodes.",
      cpp: `class Codec {
public:
    Codec() {}

    // Encodes a tree to a single string.
    string serialize(TreeNode* root) {
        if (!root) return "#";
        return to_string(root->val) + "," + serialize(root->left) + "," + serialize(root->right);
    }

    // Decodes your encoded data to tree.
    TreeNode* deserialize(string data) {
        stringstream ss(data);
        return decode(ss);
    }

private:
    TreeNode* decode(stringstream& ss) {
        string item;
        if (!getline(ss, item, ',')) return nullptr;
        if (item == "#") return nullptr;
        TreeNode* node = new TreeNode(stoi(item));
        node->left = decode(ss);
        node->right = decode(ss);
        return node;
    }
};
`,
    },
  },

  // 2. lc-173: Binary Search Tree Iterator
  designProblem({
    id: "lc-173",
    title: "Binary Search Tree Iterator",
    statement: [
      "Implement the BSTIterator class that represents an iterator over the in-order traversal of a binary search tree (BST).",
      "BSTIterator(root) initializes an object of the BSTIterator class. The root of the BST is given as part of the constructor. The pointer should be initialized to a non-existent number smaller than any element in the BST.",
      "next() moves the pointer to the right, then returns the number at the pointer.",
      "hasNext() returns true if there exists a number in the traversal to the right of the pointer, otherwise returns false.",
      "Notice that by initializing the pointer to a non-existent smallest number, the first call to next() returns the smallest element in the BST.",
      CALLS,
    ],
    constraints: [
      "The number of nodes in the tree is in the range [1, 100000].",
      "0 <= Node.val <= 1000000",
      "At most 100000 calls will be made to hasNext and next.",
    ],
    design: {
      className: "BSTIterator",
      ctor: [{ name: "root", type: "tree" }],
      methods: [
        { name: "next", params: [], returns: "int" },
        { name: "hasNext", params: [], returns: "bool" },
      ],
    },
    examples: [
      {
        ...seq(
          "BSTIterator([7,3,15,null,null,9,20]) next() next() hasNext() next() hasNext() next() hasNext() next() hasNext()",
          [null, 3, 7, true, 9, true, 15, true, 20, false]
        ),
        explanation: "next() repeatedly yields the next smallest in-order element: 3, 7, 9, 15, 20.",
      },
    ],
    tests: [
      seq("BSTIterator([1]) hasNext() next() hasNext()", [null, true, 1, false]),
      seq("BSTIterator([2,1]) next() hasNext() next() hasNext()", [null, 1, true, 2, false]),
      seq("BSTIterator([1,null,2]) hasNext() next() next() hasNext()", [null, true, 1, 2, false]),
      seq("BSTIterator([5,3,6,2,4,null,null,1]) next() next() next() next() next() next() hasNext()", [null, 1, 2, 3, 4, 5, 6, false]),
      seq("BSTIterator([4,2,6,1,3,5,7]) next() next() next() next() next() next() next() hasNext()", [null, 1, 2, 3, 4, 5, 6, 7, false]),
      seq("BSTIterator([3,1,4,null,2]) next() hasNext() next() hasNext() next() hasNext() next() hasNext()", [null, 1, true, 2, true, 3, true, 4, false]),
    ],
    hints: [
      "An in-order traversal of a binary search tree visits nodes in ascending order.",
      "Instead of flattening the entire tree into an array in O(n) space, simulate the call stack of the recursion using an explicit stack to achieve O(h) memory where h is the tree height.",
      "Push the root and all its left descendants onto the stack in the constructor. In next(), pop the top node, push all left descendants of its right child, and return the popped node's value.",
    ],
    solution: {
      idea: [
        "Maintain an explicit stack of TreeNode pointers simulating the call stack of an in-order traversal.",
        "A helper function pushes a node and all of its left descendants onto the stack. The constructor calls this on root.",
        "next pops the top node, pushes all left descendants of its right child, and returns the popped node's value. hasNext simply checks whether the stack is non-empty.",
      ],
      complexity: "next and hasNext run in O(1) amortized time, using O(h) space where h is tree height.",
      cpp: `class BSTIterator {
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

    int next() {
        TreeNode* curr = st.top();
        st.pop();
        pushLeft(curr->right);
        return curr->val;
    }

    bool hasNext() {
        return !st.empty();
    }
};
`,
    },
  }),

  // 3. lc-133: Clone Graph
  {
    id: "lc-133",
    source: "leetcode",
    title: "Clone Graph",
    statement: [
      "Given a reference of a node in a connected undirected graph, return a deep copy (clone) of the graph.",
      "Each node in the graph contains a value (int) and a list (List[Node]) of its neighbors.",
      "Test case format: For simplicity, each node's value is the same as the node's 1-based index (node 1 has val = 1, node 2 has val = 2, and so on). The graph is represented in the test case using an adjacency list.",
      "The given node will always be the first node with val = 1. You must return the copy of the given node as a reference to the cloned graph. All nodes and edges in the returned graph must be new objects.",
    ],
    constraints: [
      "The number of nodes in the graph is in the range [0, 100].",
      "1 <= Node.val <= 100",
      "Node.val is unique for each node.",
      "There are no repeated edges and no self-loops in the graph.",
      "The Graph is connected and all nodes can be visited starting from the given node.",
    ],
    fn: { name: "cloneGraph", params: [{ name: "adjList", type: "int[][]" }], returns: "int[][]" },
    examples: [
      {
        input: [[[2, 4], [1, 3], [2, 4], [1, 3]]],
        output: [[2, 4], [1, 3], [2, 4], [1, 3]],
        explanation: "There are 4 nodes in the graph. 1 is connected to 2 and 4. 2 is connected to 1 and 3. 3 is connected to 2 and 4. 4 is connected to 1 and 3.",
      },
      {
        input: [[[]]],
        output: [[]],
        explanation: "Graph consists of a single node with val = 1 and no neighbors.",
      },
      {
        input: [[]],
        output: [],
        explanation: "The graph is empty (null node pointer).",
      },
    ],
    tests: [
      { input: [[[2], [1]]], output: [[2], [1]] },
      { input: [[[2, 3], [1, 3], [1, 2]]], output: [[2, 3], [1, 3], [1, 2]] },
      { input: [[[2], [1, 3], [2, 4], [3]]], output: [[2], [1, 3], [2, 4], [3]] },
      { input: [[[2, 3, 4], [1], [1], [1]]], output: [[2, 3, 4], [1], [1], [1]] },
      { input: [[[2, 5], [1, 3], [2, 4], [3, 5], [1, 4]]], output: [[2, 5], [1, 3], [2, 4], [3, 5], [1, 4]] },
      { input: [[[2, 3, 4], [1, 3, 4], [1, 2, 4], [1, 2, 3]]], output: [[2, 3, 4], [1, 3, 4], [1, 2, 4], [1, 2, 3]] },
    ],
    hints: [
      "Traverse the original graph using DFS or BFS starting from the given node.",
      "Keep a hash map from original node pointers to their cloned counterparts to avoid cycles and redundant cloning.",
      "For each neighbor of the current node, if it has not been cloned yet, clone it and recurse. Add the clone to the current node's cloned neighbor list.",
    ],
    solution: {
      idea: [
        "Use depth-first search or breadth-first search with a hash table mapping original Node pointers to newly allocated cloned Node pointers.",
        "If the input node is null, return null. If the node is already in the map, return the existing clone.",
        "Otherwise, create a new Node with the same value, record it in the map, and recursively clone each neighbor, adding the resulting cloned nodes to the new node's neighbors list.",
      ],
      complexity: "O(V + E) time and O(V) space where V is the number of nodes and E is the number of edges.",
      cpp: `class Solution {
    unordered_map<Node*, Node*> copies;
public:
    Node* cloneGraph(Node* node) {
        if (!node) return nullptr;
        if (copies.find(node) != copies.end()) return copies[node];
        Node* copy = new Node(node->val);
        copies[node] = copy;
        for (Node* neighbor : node->neighbors) {
            copy->neighbors.push_back(cloneGraph(neighbor));
        }
        return copy;
    }
};
`,
    },
  },

  // 4. lc-528: Random Pick with Weight
  designProblem({
    id: "lc-528",
    title: "Random Pick with Weight",
    statement: [
      "You are given a 0-indexed array of positive integers w where w[i] describes the weight of the ith index.",
      "You need to implement the function pickIndex(), which randomly picks an index in the range [0, w.length - 1] (inclusive) and returns it. The probability of picking an index i is w[i] / sum(w).",
      "For example, if w = [1, 3], the probability of picking index 0 is 1 / (1 + 3) = 0.25 (i.e., 25%), and the probability of picking index 1 is 3 / (1 + 3) = 0.75 (i.e., 75%).",
      "The judge tests pickIndex on single-weight arrays so that the answer is uniquely determined (index 0). Write your solution to handle arbitrary weights using prefix sums and binary search.",
      CALLS,
    ],
    constraints: [
      "1 <= w.length <= 10000",
      "1 <= w[i] <= 100000",
      "pickIndex will be called at most 10000 times.",
    ],
    design: {
      className: "Solution",
      ctor: [{ name: "w", type: "int[]" }],
      methods: [{ name: "pickIndex", params: [], returns: "int" }],
    },
    examples: [
      seq("Solution([1]) pickIndex()", [null, 0]),
    ],
    tests: [
      seq("Solution([1]) pickIndex() pickIndex()", [null, 0, 0]),
      seq("Solution([10]) pickIndex()", [null, 0]),
      seq("Solution([100000]) pickIndex() pickIndex()", [null, 0, 0]),
      seq("Solution([5]) pickIndex() pickIndex() pickIndex()", [null, 0, 0, 0]),
      seq("Solution([42]) pickIndex()", [null, 0]),
      seq("Solution([999]) pickIndex() pickIndex()", [null, 0, 0]),
    ],
    hints: [
      "Think of the weights as contiguous intervals on a line from 1 to sum(w).",
      "Compute prefix sums of w: prefix[i] is the sum of weights up to index i.",
      "Generate a random integer in [1, totalSum], then use binary search (std::lower_bound) on the prefix sums array to find the corresponding index in O(log n) time.",
    ],
    solution: {
      idea: [
        "Compute running prefix sums of the weight array w during construction. The total sum is prefix.back().",
        "To pick an index, generate a random target integer uniformly in the range [1, total].",
        "Use binary search (std::lower_bound) to locate the smallest index whose prefix sum is greater than or equal to the target. This index corresponds to the interval containing target, yielding the exact probability w[i] / sum(w).",
      ],
      complexity: "Constructor O(n) time and O(n) space; pickIndex runs in O(log n) time.",
      cpp: `class Solution {
    vector<int> prefix;
public:
    Solution(vector<int>& w) {
        int sum = 0;
        for (int x : w) {
            sum += x;
            prefix.push_back(sum);
        }
    }

    int pickIndex() {
        int total = prefix.back();
        int val = (rand() % total) + 1;
        return lower_bound(prefix.begin(), prefix.end(), val) - prefix.begin();
    }
};
`,
    },
  }),

  // 5. lc-382: Linked List Random Node
  designProblem({
    id: "lc-382",
    title: "Linked List Random Node",
    statement: [
      "Given a singly linked list, return a random node's value from the linked list. Each node must have the same probability of being chosen.",
      "Implement the Solution class:",
      "Solution(head) initializes the object with the head of the singly-linked list head.",
      "getRandom() chooses a node randomly from the list and returns its value. All the nodes of the list should be equally likely to be chosen.",
      "The judge tests getRandom on single-element lists so that the chosen node's value is uniquely determined. Write your solution to handle arbitrary length lists using reservoir sampling (O(1) memory) or storage.",
      CALLS,
    ],
    constraints: [
      "The number of nodes in the linked list will be in the range [1, 10000].",
      "-10000 <= Node.val <= 10000",
      "At most 10000 calls will be made to getRandom.",
    ],
    design: {
      className: "Solution",
      ctor: [{ name: "head", type: "list" }],
      methods: [{ name: "getRandom", params: [], returns: "int" }],
    },
    examples: [
      seq("Solution([1]) getRandom()", [null, 1]),
    ],
    tests: [
      seq("Solution([1]) getRandom() getRandom()", [null, 1, 1]),
      seq("Solution([42]) getRandom()", [null, 42]),
      seq("Solution([-10]) getRandom() getRandom()", [null, -10, -10]),
      seq("Solution([1000000]) getRandom()", [null, 1000000]),
      seq("Solution([0]) getRandom() getRandom() getRandom()", [null, 0, 0, 0]),
      seq("Solution([-500]) getRandom()", [null, -500]),
    ],
    hints: [
      "If you can store all elements in a dynamic array, you can pick a random index in O(1) time and O(n) memory.",
      "If the list is extremely large or arriving as a stream, use Reservoir Sampling to achieve O(1) extra space.",
      "With reservoir sampling: set the reservoir to head->val. For the ith node (1-indexed, i >= 2), replace the reservoir with probability 1/i (e.g. rand() % i == 0). At the end of the list, every node has been chosen with probability exactly 1/n.",
    ],
    solution: {
      idea: [
        "Use Reservoir Sampling to select a random node with uniform probability while using O(1) extra memory.",
        "Initialize the result with the head node's value. Traverse subsequent nodes: for the i-th node visited (1-based), replace the chosen value with node->val with probability 1/i (using rand() % i == 0).",
        "By induction, after n nodes, each node has probability (1/k) * (k/(k+1)) * ... * ((n-1)/n) = 1/n of being the final result.",
      ],
      complexity: "O(n) time per call with O(1) extra space, or O(1) time with O(n) space.",
      cpp: `class Solution {
    ListNode* head;
public:
    Solution(ListNode* h) : head(h) {}

    int getRandom() {
        int ans = head->val;
        ListNode* curr = head->next;
        int i = 2;
        while (curr) {
            if (rand() % i == 0) ans = curr->val;
            curr = curr->next;
            i++;
        }
        return ans;
    }
};
`,
    },
  }),

  // 6. lc-362: Design Hit Counter
  designProblem({
    id: "lc-362",
    title: "Design Hit Counter",
    statement: [
      "Design a hit counter which counts the number of hits received in the past 5 minutes (i.e., the past 300 seconds).",
      "Your system should accept a timestamp parameter (in seconds granularity), and you may assume that calls are being made to the system in chronological order (i.e., timestamp is monotonically increasing). Several hits may arrive roughly at the same time.",
      "Implement the HitCounter class:",
      "HitCounter() initializes the object of the hit counter system.",
      "hit(timestamp) records a hit that happened at timestamp (in seconds). Several hits may happen at the same timestamp.",
      "getHits(timestamp) returns the number of hits in the past 5 minutes from timestamp (i.e., past 300 seconds, timestamp - 300 < t <= timestamp).",
      CALLS,
    ],
    constraints: [
      "1 <= timestamp <= 2 * 10^9",
      "All the calls are being made to the system in chronological order (i.e., timestamp is monotonically increasing).",
      "At most 300000 calls will be made to hit and getHits.",
    ],
    design: {
      className: "HitCounter",
      ctor: [],
      methods: [
        { name: "hit", params: [{ name: "timestamp", type: "int" }], returns: "void" },
        { name: "getHits", params: [{ name: "timestamp", type: "int" }], returns: "int" },
      ],
    },
    examples: [
      {
        ...seq(
          "HitCounter() hit(1) hit(2) hit(3) getHits(4) hit(300) getHits(300) getHits(301)",
          [null, null, null, null, 3, null, 4, 3]
        ),
        explanation: "At t=4, hits within [0, 4] are 1, 2, 3 (count 3). At t=300, hits within [0, 300] are 1, 2, 3, 300 (count 4). At t=301, hit at 1 has expired (> 300 seconds old), remaining are 2, 3, 300 (count 3).",
      },
    ],
    tests: [
      seq("HitCounter() getHits(1) getHits(300)", [null, 0, 0]),
      seq("HitCounter() hit(10) hit(10) hit(10) getHits(10) getHits(309) getHits(310)", [null, null, null, null, 3, 3, 0]),
      seq("HitCounter() hit(1) hit(2) hit(300) getHits(300) hit(301) getHits(301) getHits(600) getHits(601)", [null, null, null, null, 3, null, 3, 1, 0]),
      seq("HitCounter() hit(100) hit(200) hit(300) hit(400) hit(500) getHits(500) getHits(600) getHits(700) getHits(800) getHits(900)", [null, null, null, null, null, null, 3, 2, 1, 0, 0]),
      seq("HitCounter() hit(1) hit(2) hit(3) hit(4) hit(5) getHits(5) getHits(304) getHits(305)", [null, null, null, null, null, null, 5, 1, 0]),
      seq("HitCounter() hit(1) hit(1) getHits(1) hit(300) getHits(300) getHits(301) getHits(302)", [null, null, null, 2, null, 3, 1, 1]),
    ],
    hints: [
      "Since timestamps arrive in chronological order, a FIFO queue can store incoming timestamps.",
      "On getHits(timestamp), pop all timestamps from the front of the queue that are <= timestamp - 300.",
      "For high concurrency with multiple hits at the same second, you can also use a fixed-size circular buffer of 300 buckets storing pairs of (timestamp, count) to guarantee O(1) memory.",
    ],
    solution: {
      idea: [
        "Because timestamps arrive in non-decreasing order, keep a queue of hit timestamps.",
        "hit pushes timestamp onto the queue.",
        "getHits evicts all elements from the front of the queue whose timestamp is less than or equal to timestamp - 300, and returns the remaining queue size.",
      ],
      complexity: "hit is O(1) amortized, getHits is O(1) amortized, space is O(k) where k is the number of hits within the 300-second window.",
      cpp: `class HitCounter {
    queue<int> q;
public:
    HitCounter() {}

    void hit(int timestamp) {
        q.push(timestamp);
    }

    int getHits(int timestamp) {
        while (!q.empty() && q.front() <= timestamp - 300) {
            q.pop();
        }
        return q.size();
    }
};
`,
    },
  }),
];
