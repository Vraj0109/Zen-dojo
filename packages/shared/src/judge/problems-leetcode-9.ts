import type { ProblemSpec } from "./types";

// Batch 9: remaining roadmap problems. Written for this app.

export const LEETCODE_SPECS_9: ProblemSpec[] = [
  {
    id: "lc-37",
    source: "leetcode",
    title: "Sudoku Solver",
    statement: [
      "Write a program to solve a Sudoku puzzle by filling the empty cells.",
      "A sudoku solution must satisfy all of the following rules: each of the digits 1-9 must occur exactly once in each row, each of the digits 1-9 must occur exactly once in each column, and each of the digits 1-9 must occur exactly once in each of the 9 3x3 sub-boxes of the grid.",
      "The '.' character indicates empty cells. It is guaranteed that the input board has a unique solution. Return the completed 9x9 board."
],
    constraints: [
      "board.length == 9",
      "board[i].length == 9",
      "board[i][j] is a digit 1-9 or '.'",
      "It is guaranteed that the input puzzle has exactly one solution"
],
    fn: {"name":"solveSudoku","params":[{"name":"board","type":"string[][]"}],"returns":"string[][]"},
    examples: [
      { input: [[["5","3",".",".","7",".",".",".","."],["6",".",".","1","9","5",".",".","."],[".","9","8",".",".",".",".","6","."],["8",".",".",".","6",".",".",".","3"],["4",".",".","8",".","3",".",".","1"],["7",".",".",".","2",".",".",".","6"],[".","6",".",".",".",".","2","8","."],[".",".",".","4","1","9",".",".","5"],[".",".",".",".","8",".",".","7","9"]]], output: [["5","3","4","6","7","8","9","1","2"],["6","7","2","1","9","5","3","4","8"],["1","9","8","3","4","2","5","6","7"],["8","5","9","7","6","1","4","2","3"],["4","2","6","8","5","3","7","9","1"],["7","1","3","9","2","4","8","5","6"],["9","6","1","5","3","7","2","8","4"],["2","8","7","4","1","9","6","3","5"],["3","4","5","2","8","6","1","7","9"]], explanation: "The puzzle is solved with digits 1 through 9 placed such that each row, column, and 3x3 box contains no duplicates." },
      { input: [[[".",".","9","7","4","8",".",".","."],["7",".",".",".",".",".",".",".","."],[".","2",".","1",".","9",".",".","."],[".",".","7",".",".",".","2","4","."],[".","6","4",".","1",".","5","9","."],[".","9","8",".",".",".","3",".","."],[".",".",".","8",".","3",".","2","."],[".",".",".",".",".",".",".",".","6"],[".",".",".","2","7","5","9",".","."]]], output: [["5","1","9","7","4","8","6","3","2"],["7","8","3","6","5","2","4","1","9"],["4","2","6","1","3","9","8","7","5"],["3","5","7","9","8","6","2","4","1"],["2","6","4","3","1","7","5","9","8"],["1","9","8","5","2","4","3","6","7"],["9","7","5","8","6","3","1","2","4"],["8","3","2","4","9","1","7","5","6"],["6","4","1","2","7","5","9","8","3"]], explanation: "Each missing digit is determined by constraint propagation and backtracking." },
    ],
    tests: [
      { input: [[["1","2","3","4","5","6","7","8","."],["4","5","6","7","8","9","1","2","3"],["7","8","9","1","2","3","4","5","6"],["2","3","4","5","6","7","8","9","1"],["5","6","7","8","9","1","2","3","4"],["8","9","1","2","3","4","5","6","7"],["3","4","5","6","7","8","9","1","2"],["6","7","8","9","1","2","3","4","5"],["9","1","2","3","4","5","6","7","8"]]], output: [["1","2","3","4","5","6","7","8","9"],["4","5","6","7","8","9","1","2","3"],["7","8","9","1","2","3","4","5","6"],["2","3","4","5","6","7","8","9","1"],["5","6","7","8","9","1","2","3","4"],["8","9","1","2","3","4","5","6","7"],["3","4","5","6","7","8","9","1","2"],["6","7","8","9","1","2","3","4","5"],["9","1","2","3","4","5","6","7","8"]] },
      { input: [[[".","2","3","4","5","6","7","8","9"],["4","5","6","7","8","9","1","2","3"],["7","8","9","1","2","3","4","5","6"],["2","3","4","5","6","7","8","9","1"],["5","6","7","8","9","1","2","3","4"],["8","9","1","2","3","4","5","6","7"],["3","4","5","6","7","8","9","1","2"],["6","7","8","9","1","2","3","4","5"],["9","1","2","3","4","5","6","7","8"]]], output: [["1","2","3","4","5","6","7","8","9"],["4","5","6","7","8","9","1","2","3"],["7","8","9","1","2","3","4","5","6"],["2","3","4","5","6","7","8","9","1"],["5","6","7","8","9","1","2","3","4"],["8","9","1","2","3","4","5","6","7"],["3","4","5","6","7","8","9","1","2"],["6","7","8","9","1","2","3","4","5"],["9","1","2","3","4","5","6","7","8"]] },
      { input: [[["5","1","7","6",".",".","3","4","."],["2","8",".",".",".","5",".",".","."],[".","9",".",".",".",".","4",".","."],["3",".",".",".","1",".","9",".","."],[".",".","4",".",".",".","8",".","."],[".",".","1",".","7",".",".",".","4"],[".",".","8",".",".",".",".","3","."],[".",".",".","4",".",".",".","5","2"],[".","3","2",".",".","6","1","9","7"]]], output: [["5","1","7","6",".",".","3","4","."],["2","8",".",".",".","5",".",".","."],[".","9",".",".",".",".","4",".","."],["3",".",".",".","1",".","9",".","."],[".",".","4",".",".",".","8",".","."],[".",".","1",".","7",".",".",".","4"],[".",".","8",".",".",".",".","3","."],[".",".",".","4",".",".",".","5","2"],[".","3","2",".",".","6","1","9","7"]] },
      { input: [[[".",".",".","2","6",".","7",".","1"],["6","8",".",".","7",".",".","9","."],["1","9",".",".",".","4","5",".","."],["8","2",".","1",".",".",".","4","."],[".",".","4","6",".","2","9",".","."],[".","5",".",".",".","3",".","2","8"],[".",".","9","3",".",".",".","7","4"],[".","4",".",".","5",".",".","3","6"],["7",".","3",".","1","8",".",".","."]]], output: [["4","3","5","2","6","9","7","8","1"],["6","8","2","5","7","1","4","9","3"],["1","9","7","8","3","4","5","6","2"],["8","2","6","1","9","5","3","4","7"],["3","7","4","6","8","2","9","1","5"],["9","5","1","7","4","3","6","2","8"],["5","1","9","3","2","6","8","7","4"],["2","4","8","9","5","7","1","3","6"],["7","6","3","4","1","8","2","5","9"]] },
      { input: [[["1",".",".",".","7",".",".","3","."],["8","3",".","6",".",".",".",".","."],[".",".","2","9",".",".","6",".","8"],["6",".",".",".",".","4","9",".","7"],[".","9",".",".",".",".",".","5","."],["3",".","7","5",".",".",".",".","4"],["2",".","3",".",".","9","1",".","."],[".",".",".",".",".","2",".","4","3"],[".","4",".",".","8",".",".",".","9"]]], output: [["1","6","9","8","7","5","4","3","2"],["8","3","4","6","2","1","7","9","5"],["5","7","2","9","4","3","6","1","8"],["6","2","5","1","3","4","9","8","7"],["4","9","8","2","6","7","3","5","1"],["3","1","7","5","9","8","2","6","4"],["2","8","3","4","5","9","1","7","6"],["9","5","6","7","1","2","8","4","3"],["7","4","1","3","8","6","5","2","9"]] },
      { input: [[[".",".","5","3",".",".",".",".","."],["8",".",".",".",".",".",".","2","."],[".","7",".",".","1",".","5",".","."],["4",".",".",".",".","5","3",".","."],[".","1",".",".","7",".",".",".","6"],[".",".","3","2",".",".",".","8","."],[".","6",".","5",".",".",".",".","9"],[".",".","4",".",".",".",".","3","."],[".",".",".",".",".","9","7",".","."]]], output: [["1","4","5","3","2","7","6","9","8"],["8","3","9","6","5","4","1","2","7"],["6","7","2","9","1","8","5","4","3"],["4","9","6","1","8","5","3","7","2"],["2","1","8","4","7","3","9","5","6"],["7","5","3","2","9","6","4","8","1"],["3","6","7","5","4","2","8","1","9"],["9","8","4","7","6","1","2","3","5"],["5","2","1","8","3","9","7","6","4"]] },
    ],
    hints: [
      "Find an empty cell, try placing digits '1' through '9', and check whether the placement violates Sudoku rules.",
      "Keep track of numbers present in each row, column, and 3x3 box using bitmasks or boolean arrays for fast validation.",
      "Use backtracking: place a valid digit, recurse to the next empty cell, and if no solution is found, undo the placement and try the next digit."
],
    solution: {
      idea: [
        "Use backtracking to fill empty cells one by one. Maintain bitmasks for digits used in each of the 9 rows, 9 columns, and 9 3x3 subgrids. For each empty cell, iterate over candidate digits from 1 to 9 that are not yet used in its row, column, or box. Place the digit, update bitmasks, and recursively attempt to solve the remaining cells. If all cells are filled, return true; otherwise, backtrack by clearing the digit and bitmask bits."
],
      complexity: "O(9^(empty_cells)) worst-case time with aggressive bitmask pruning; O(1) space beyond the recursion stack.",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\n    int rowMask[9]{}, colMask[9]{}, boxMask[9]{};\n    bool solve(vector<vector<string>>& b) {\n        for (int r = 0; r < 9; r++) {\n            for (int c = 0; c < 9; c++) {\n                if (b[r][c] != \".\") continue;\n                int bIdx = (r / 3) * 3 + (c / 3);\n                for (int d = 1; d <= 9; d++) {\n                    int bit = 1 << d;\n                    if ((rowMask[r] & bit) || (colMask[c] & bit) || (boxMask[bIdx] & bit)) continue;\n                    rowMask[r] |= bit;\n                    colMask[c] |= bit;\n                    boxMask[bIdx] |= bit;\n                    b[r][c] = to_string(d);\n                    if (solve(b)) return true;\n                    b[r][c] = \".\";\n                    rowMask[r] &= ~bit;\n                    colMask[c] &= ~bit;\n                    boxMask[bIdx] &= ~bit;\n                }\n                return false;\n            }\n        }\n        return true;\n    }\npublic:\n    vector<vector<string>> solveSudoku(vector<vector<string>>& board) {\n        for (int r = 0; r < 9; r++) {\n            for (int c = 0; c < 9; c++) {\n                if (!board[r][c].empty() && board[r][c][0] != '.') {\n                    int d = board[r][c][0] - '0';\n                    int bit = 1 << d;\n                    rowMask[r] |= bit;\n                    colMask[c] |= bit;\n                    boxMask[(r / 3) * 3 + (c / 3)] |= bit;\n                }\n            }\n        }\n        solve(board);\n        return board;\n    }\n};\n",
    },
  },
  {
    id: "lc-212",
    source: "leetcode",
    title: "Word Search II",
    statement: [
      "Given an m x n board of characters and a list of strings words, return all words on the board.",
      "Each word must be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once in a word.",
      "The returned list of words can be in any order."
],
    constraints: [
      "m == board.length",
      "n == board[i].length",
      "1 <= m, n <= 12",
      "board[i][j] is a lowercase English letter",
      "1 <= words.length <= 3 * 10^4",
      "1 <= words[i].length <= 10",
      "words[i] consists of lowercase English letters",
      "All words in words are unique"
],
    fn: {"name":"findWords","params":[{"name":"board","type":"string[][]"},{"name":"words","type":"string[]"}],"returns":"string[]"},
    examples: [
      { input: [[["o","a","a","n"],["e","t","a","e"],["i","h","k","r"],["i","f","l","v"]],["oath","pea","eat","rain"]], output: ["oath","eat"], explanation: "The words 'oath' and 'eat' can be formed by traversing adjacent cells." },
      { input: [[["a","b"],["c","d"]],["abcb"]], output: [], explanation: "The word 'abcb' cannot be formed because cell 'b' cannot be visited twice in the same word." },
    ],
    tests: [
      { input: [[["a"]],["a"]], output: ["a"] },
      { input: [[["a"]],["b"]], output: [] },
      { input: [[["a","b"],["c","d"]],["ab","ac","bd","ca"]], output: ["ac","ab","bd","ca"] },
      { input: [[["o","a","b","n"],["o","t","a","e"],["a","h","k","r"],["a","f","l","v"]],["oa","oath"]], output: ["oa","oath"] },
      { input: [[["a","a","a"],["a","a","a"],["a","a","a"]],["a","aa","aaa","aaaa","aaaaa"]], output: ["a","aa","aaa","aaaa","aaaaa"] },
      { input: [[["z","x"],["y","w"]],["zxwy","zxyw","wzyx","none"]], output: ["zxwy"] },
    ],
    unordered: true,
    hints: [
      "Instead of searching for each word individually on the board, search all words at once by building a prefix tree (Trie).",
      "Insert all dictionary words into the Trie. Start a DFS traversal from each cell on the board, following branches in the Trie.",
      "When a Trie node corresponds to a complete word, record it and mark it as visited or remove it from the Trie to prevent duplicates."
],
    solution: {
      idea: [
        "Construct a Trie containing all given words. Then, run a depth-first search starting at each cell of the grid. As the search moves to adjacent cells, it follows matching edges in the Trie. When a node marked as a complete word is reached, the word is added to the result set and cleared in the node to avoid duplicate inclusions. Backtracking restores grid characters upon return."
],
      complexity: "O(m * n * 4^(L)) worst-case where L is maximum word length; O(total word characters) space for the Trie.",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nstruct TrieNode {\n    TrieNode* children[26]{};\n    string word = \"\";\n};\n\nclass Solution {\n    TrieNode* root = nullptr;\n    vector<string> result;\n    int rows = 0, cols = 0;\n\n    void insertWord(const string& w) {\n        TrieNode* cur = root;\n        for (char c : w) {\n            int idx = c - 'a';\n            if (!cur->children[idx]) cur->children[idx] = new TrieNode();\n            cur = cur->children[idx];\n        }\n        cur->word = w;\n    }\n\n    void dfs(vector<vector<string>>& b, int r, int c, TrieNode* node) {\n        if (r < 0 || r >= rows || c < 0 || c >= cols) return;\n        string cell = b[r][c];\n        if (cell == \"#\" || cell.empty()) return;\n        char ch = cell[0];\n        int idx = ch - 'a';\n        if (idx < 0 || idx >= 26 || !node->children[idx]) return;\n\n        TrieNode* nextNode = node->children[idx];\n        if (!nextNode->word.empty()) {\n            result.push_back(nextNode->word);\n            nextNode->word = \"\";\n        }\n\n        b[r][c] = \"#\";\n        dfs(b, r + 1, c, nextNode);\n        dfs(b, r - 1, c, nextNode);\n        dfs(b, r, c + 1, nextNode);\n        dfs(b, r, c - 1, nextNode);\n        b[r][c] = cell;\n    }\n\npublic:\n    vector<string> findWords(vector<vector<string>>& board, vector<string>& words) {\n        root = new TrieNode();\n        for (const string& w : words) insertWord(w);\n        rows = board.size();\n        cols = board[0].size();\n        result.clear();\n        for (int r = 0; r < rows; r++) {\n            for (int c = 0; c < cols; c++) {\n                dfs(board, r, c, root);\n            }\n        }\n        return result;\n    }\n};\n",
    },
  },
  {
    id: "lc-934",
    source: "leetcode",
    title: "Shortest Bridge",
    statement: [
      "You are given an n x n binary matrix grid where 1 represents land and 0 represents water.",
      "An island is a 4-directionally connected group of 1s not connected to any other 1s. There are exactly two islands in grid.",
      "You may change 0s to 1s to connect the two islands to form one island. Return the smallest number of 0s you must flip to connect the two islands."
],
    constraints: [
      "n == grid.length == grid[i].length",
      "2 <= n <= 100",
      "grid[i][j] is either 0 or 1",
      "There are exactly two islands in grid"
],
    fn: {"name":"shortestBridge","params":[{"name":"grid","type":"int[][]"}],"returns":"int"},
    examples: [
      { input: [[[0,1],[1,0]]], output: 1, explanation: "Flipping one 0 at (0, 0) or (1, 1) connects the two islands." },
      { input: [[[0,1,0],[0,0,0],[0,0,1]]], output: 2, explanation: "Connecting the islands requires flipping 2 water cells." },
    ],
    tests: [
      { input: [[[1,1,1,1,1],[1,0,0,0,1],[1,0,1,0,1],[1,0,0,0,1],[1,1,1,1,1]]], output: 1 },
      { input: [[[1,0],[0,1]]], output: 1 },
      { input: [[[1,0,0],[0,0,0],[0,0,1]]], output: 3 },
      { input: [[[0,0,0,0],[1,1,0,0],[0,0,0,1],[0,0,0,1]]], output: 2 },
      { input: [[[1,1,0,0,0],[1,0,0,0,0],[0,0,0,0,0],[0,0,0,0,1],[0,0,0,1,1]]], output: 5 },
      { input: [[[1,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,1]]], output: 7 },
    ],
    hints: [
      "Use depth-first search to find the entire first island, and mark all its cells so you can distinguish them from the second island.",
      "Enqueue all boundary cells of the first island into a queue for multi-source breadth-first search.",
      "Expand BFS outward into the water level by level; the number of expansion steps taken to first reach any cell of the second island is the answer."
],
    solution: {
      idea: [
        "First, scan the matrix to find any cell containing 1. Run DFS from this cell to discover all cells belonging to the first island. Mark these cells with a special marker (such as 2) and push all of them into a BFS queue initialized with distance 0.",
        "Next, run multi-source BFS expanding level by level into water cells (0s). When a neighbor with value 1 is encountered, it belongs to the second island; return the current expansion distance as the minimal flips needed."
],
      complexity: "O(n^2) time since each cell is visited at most once; O(n^2) space for the BFS queue and recursion.",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\n    int n;\n    int dr[4] = {1, -1, 0, 0};\n    int dc[4] = {0, 0, 1, -1};\n\n    void dfs(vector<vector<int>>& g, int r, int c, queue<pair<int, int>>& q) {\n        if (r < 0 || r >= n || c < 0 || c >= n || g[r][c] != 1) return;\n        g[r][c] = 2;\n        q.push({r, c});\n        for (int i = 0; i < 4; i++) {\n            dfs(g, r + dr[i], c + dc[i], q);\n        }\n    }\n\npublic:\n    int shortestBridge(vector<vector<int>>& grid) {\n        n = grid.size();\n        queue<pair<int, int>> q;\n        bool found = false;\n        for (int r = 0; r < n && !found; r++) {\n            for (int c = 0; c < n && !found; c++) {\n                if (grid[r][c] == 1) {\n                    dfs(grid, r, c, q);\n                    found = true;\n                }\n            }\n        }\n\n        int steps = 0;\n        while (!q.empty()) {\n            int sz = q.size();\n            while (sz--) {\n                auto [r, c] = q.front();\n                q.pop();\n                for (int i = 0; i < 4; i++) {\n                    int nr = r + dr[i], nc = c + dc[i];\n                    if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;\n                    if (grid[nr][nc] == 1) return steps;\n                    if (grid[nr][nc] == 0) {\n                        grid[nr][nc] = 2;\n                        q.push({nr, nc});\n                    }\n                }\n            }\n            steps++;\n        }\n        return -1;\n    }\n};\n",
    },
  },
  {
    id: "lc-1434",
    source: "leetcode",
    title: "Number of Ways to Wear Different Hats to Each Other",
    statement: [
      "There are n people and 40 types of hats labeled from 1 to 40.",
      "Given a 2D integer array hats where hats[i] is a list of all hats preferred by the ith person (0-indexed).",
      "Return the number of ways that the n people wear different hats from each other. Since the answer may be too large, return it modulo 10^9 + 7."
],
    constraints: [
      "n == hats.length",
      "1 <= n <= 10",
      "1 <= hats[i].length <= 40",
      "1 <= hats[i][j] <= 40",
      "hats[i] contains a list of unique integers"
],
    fn: {"name":"numberWays","params":[{"name":"hats","type":"int[][]"}],"returns":"int"},
    examples: [
      { input: [[[3,4],[4,5],[5]]], output: 1, explanation: "Person 1 can wear hat 3, person 2 hat 4, and person 3 hat 5." },
      { input: [[[3,5,1],[3,5]]], output: 4, explanation: "Person 1 wears hat 1 and person 2 wears hat 3 or 5; or person 1 wears hat 5 and person 2 wears 3; or person 1 wears 3 and person 2 wears 5. Total 4 ways." },
    ],
    tests: [
      { input: [[[1,2,3,4],[1,2,3,4],[1,2,3,4],[1,2,3,4]]], output: 24 },
      { input: [[[1,2,3],[2,3,4],[3,4,5]]], output: 14 },
      { input: [[[1]]], output: 1 },
      { input: [[[1],[1]]], output: 0 },
      { input: [[[1,2],[2,3],[3,4],[4,5],[5,6]]], output: 6 },
      { input: [[[1,2,3,4,5],[6,7,8,9,10]]], output: 25 },
    ],
    hints: [
      "Since n <= 10 while hats are up to 40, assigning people to hats is much smaller than assigning hats to people.",
      "Invert the mapping: for each hat from 1 to 40, find all people who like this hat.",
      "Use dynamic programming with bitmask: dp[mask] is the number of ways to assign a subset of hats so that the subset of people represented by mask each have a hat."
],
    solution: {
      idea: [
        "Invert the input to create a list of interested people for each hat from 1 to 40. Since the number of people n is at most 10, the subset of people who have received hats can be encoded as a bitmask of size 2^n.",
        "We iterate hat by hat from 1 to 40. For each hat, we can either skip it or assign it to any person who likes it and has not yet received a hat (a bit that is 0 in the current mask). This updates the DP table in O(40 * n * 2^n) time."
],
      complexity: "O(40 * n * 2^n) time; O(2^n) space for the DP state table.",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int numberWays(vector<vector<int>>& hats) {\n        int n = hats.size();\n        const int MOD = 1e9 + 7;\n        vector<vector<int>> hatToPeople(41);\n        for (int p = 0; p < n; p++) {\n            for (int h : hats[p]) {\n                hatToPeople[h].push_back(p);\n            }\n        }\n\n        int targetMask = (1 << n) - 1;\n        vector<int> dp(1 << n, 0);\n        dp[0] = 1;\n\n        for (int h = 1; h <= 40; h++) {\n            vector<int> nextDp = dp;\n            for (int p : hatToPeople[h]) {\n                int pBit = 1 << p;\n                for (int mask = 0; mask <= targetMask; mask++) {\n                    if ((mask & pBit) == 0 && dp[mask] > 0) {\n                        nextDp[mask | pBit] = (nextDp[mask | pBit] + dp[mask]) % MOD;\n                    }\n                }\n            }\n            dp = move(nextDp);\n        }\n\n        return dp[targetMask];\n    }\n};\n",
    },
  },
  {
    id: "lc-1755",
    source: "leetcode",
    title: "Closest Subsequence Sum",
    statement: [
      "You are given an integer array nums and an integer goal.",
      "You want to choose a subsequence of nums such that the sum of its elements is the closest possible to goal. That is, if the sum of the subsequence is s, you want to minimize |s - goal|.",
      "Return the minimum possible value of |s - goal|. Note that an empty subsequence has sum 0."
],
    constraints: [
      "1 <= nums.length <= 40",
      "-10^7 <= nums[i] <= 10^7",
      "-10^9 <= goal <= 10^9"
],
    fn: {"name":"minAbsDifference","params":[{"name":"nums","type":"int[]"},{"name":"goal","type":"int"}],"returns":"int"},
    examples: [
      { input: [[5,-7,3,5],6], output: 0, explanation: "Choosing subsequence [5, 3] gives sum 8, with difference |8 - 6| = 2." },
      { input: [[7,-9,15,-2],-5], output: 1, explanation: "Choosing subsequence [-2, -9, 7] gives sum -4, with difference |-4 - (-5)| = 1." },
    ],
    tests: [
      { input: [[1,2,3],-7], output: 7 },
      { input: [[0],0], output: 0 },
      { input: [[10000000],10000000], output: 0 },
      { input: [[-5,-3,-1],-4], output: 0 },
      { input: [[1,-2,3,-4,5,-6],0], output: 0 },
      { input: [[10,20,30,40,50],35], output: 5 },
      { input: [[-10000000,10000000],1], output: 1 },
    ],
    hints: [
      "nums has length up to 40, which is too large for O(2^n) brute force, but small enough for meet-in-the-middle.",
      "Split nums into two halves of size up to 20, and generate all possible subset sums for each half.",
      "Sort the subset sums of the second half. For each sum in the first half, use binary search (lower_bound) to find the closest element in the second half."
],
    solution: {
      idea: [
        "Divide the array into two halves of sizes n1 and n2 (at most 20 elements each). Compute all 2^n1 subset sums of the first half and all 2^n2 subset sums of the second half.",
        "Sort the second half of subset sums. For each sum x in the first half, the ideal matching sum from the second half is goal - x. Use std::lower_bound to locate the closest sum in O(log(2^n2)), checking both the lower bound and the predecessor to find the minimum absolute difference."
],
      complexity: "O(2^(n/2) * (n/2)) time; O(2^(n/2)) space.",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\n    void getSums(const vector<int>& v, vector<long long>& out) {\n        out.push_back(0);\n        for (int x : v) {\n            int sz = out.size();\n            for (int i = 0; i < sz; i++) {\n                out.push_back(out[i] + x);\n            }\n        }\n    }\npublic:\n    int minAbsDifference(vector<int>& nums, int goal) {\n        int n = nums.size();\n        int mid = n / 2;\n        vector<int> left(nums.begin(), nums.begin() + mid);\n        vector<int> right(nums.begin() + mid, nums.end());\n\n        vector<long long> s1, s2;\n        getSums(left, s1);\n        getSums(right, s2);\n\n        sort(s2.begin(), s2.end());\n        s2.erase(unique(s2.begin(), s2.end()), s2.end());\n\n        long long best = llabs(goal);\n        for (long long x : s1) {\n            long long target = goal - x;\n            auto it = lower_bound(s2.begin(), s2.end(), target);\n            if (it != s2.end()) best = min(best, llabs(x + *it - goal));\n            if (it != s2.begin()) best = min(best, llabs(x + *prev(it) - goal));\n        }\n\n        return (int)best;\n    }\n};\n",
    },
  },
  {
    id: "lc-2035",
    source: "leetcode",
    title: "Partition Array Into Two Arrays to Minimize Sum Difference",
    statement: [
      "You are given an integer array nums of 2 * n integers.",
      "You want to partition nums into two arrays of length n to minimize the absolute difference of their sums: |sum1 - sum2|.",
      "Return the minimum absolute difference."
],
    constraints: [
      "1 <= n <= 15",
      "nums.length == 2 * n",
      "-10^7 <= nums[i] <= 10^7"
],
    fn: {"name":"minimumDifference","params":[{"name":"nums","type":"int[]"}],"returns":"int"},
    examples: [
      { input: [[3,9,7,3]], output: 2, explanation: "Partition into [3, 9] and [7, 3] gives sums 12 and 10 with difference |12 - 10| = 2." },
      { input: [[-36,36]], output: 72, explanation: "Partition into [-36] and [36] with difference |-36 - 36| = 72." },
    ],
    tests: [
      { input: [[2,-1,0,4,-2,-9]], output: 0 },
      { input: [[1,2,3,4]], output: 0 },
      { input: [[0,0,0,0]], output: 0 },
      { input: [[100,-100,50,-50]], output: 0 },
      { input: [[1,1,1,1,1,1]], output: 0 },
      { input: [[10,20,30,40,50,60]], output: 10 },
    ],
    hints: [
      "2 * n is at most 30, so n is at most 15. This suggests a meet-in-the-middle approach.",
      "Divide nums into two halves of size n. For each half, generate all subset sums grouped by the number of elements chosen k (from 0 to n).",
      "If we choose k elements from the first half, we must choose n - k elements from the second half. Sort each group of sums in the second half and binary search for the value closest to total_sum / 2 - first_sum."
],
    solution: {
      idea: [
        "Let total be the sum of all 2n elements. We want to pick n elements whose sum is as close to total / 2 as possible.",
        "Split nums into left and right halves of size n. Compute all subset sums of left, grouped by count of elements chosen: left[k] contains all sums of k elements. Similarly, compute right[k].",
        "Sort each right[k] list. For each sum s in left[k], we need a sum in right[n - k] close to total / 2 - s. Binary search via std::lower_bound yields the closest values."
],
      complexity: "O(n * 2^n) time to generate and search; O(2^n) space.",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int minimumDifference(vector<int>& nums) {\n        int n2 = nums.size();\n        int n = n2 / 2;\n        long long total = accumulate(nums.begin(), nums.end(), 0LL);\n\n        vector<vector<long long>> left(n + 1), right(n + 1);\n        for (int mask = 0; mask < (1 << n); mask++) {\n            int cnt = __builtin_popcount(mask);\n            long long s1 = 0, s2 = 0;\n            for (int i = 0; i < n; i++) {\n                if (mask & (1 << i)) {\n                    s1 += nums[i];\n                    s2 += nums[n + i];\n                }\n            }\n            left[cnt].push_back(s1);\n            right[cnt].push_back(s2);\n        }\n\n        for (int k = 0; k <= n; k++) {\n            sort(right[k].begin(), right[k].end());\n        }\n\n        long long ans = LLONG_MAX;\n        for (int k = 0; k <= n; k++) {\n            int need = n - k;\n            for (long long s1 : left[k]) {\n                long long target = (total - 2 * s1) / 2;\n                auto it = lower_bound(right[need].begin(), right[need].end(), target);\n                if (it != right[need].end()) {\n                    long long s2 = *it;\n                    ans = min(ans, llabs(total - 2 * (s1 + s2)));\n                }\n                if (it != right[need].begin()) {\n                    long long s2 = *prev(it);\n                    ans = min(ans, llabs(total - 2 * (s1 + s2)));\n                }\n            }\n        }\n\n        return (int)ans;\n    }\n};\n",
    },
  },
  {
    id: "lc-301",
    source: "leetcode",
    title: "Remove Invalid Parentheses",
    statement: [
      "Given a string s containing parentheses and letters, remove the minimum number of invalid parentheses to make the input string valid.",
      "Return a list of unique strings that are valid. The results may be returned in any order."
],
    constraints: [
      "1 <= s.length <= 25",
      "s consists of lowercase English letters and parentheses '(' and ')'",
      "There will be at most 20 parentheses in s"
],
    fn: {"name":"removeInvalidParentheses","params":[{"name":"s","type":"string"}],"returns":"string[]"},
    examples: [
      { input: ["()())()"], output: ["(())()","()()()"], explanation: "Removing one ')' yields ['(())()', '()()()']." },
      { input: ["(a)())()"], output: ["(a())()","(a)()()"], explanation: "Removing one ')' yields ['(a())()', '(a)()()']." },
    ],
    tests: [
      { input: [")("], output: [""] },
      { input: [""], output: [""] },
      { input: ["abc"], output: ["abc"] },
      { input: ["((("], output: [""] },
      { input: [")()("], output: ["()"] },
      { input: ["(r(()()("], output: ["(r())","(r)()","r(())","r()()"] },
    ],
    unordered: true,
    hints: [
      "First determine the exact minimum number of left and right parentheses that must be removed by scanning the string.",
      "Use depth-first search or BFS to explore removing parentheses, skipping adjacent duplicate parentheses to prevent duplicate answers.",
      "Validate the parenthesis balance along the way and ensure only valid strings with the target removals are recorded."
],
    solution: {
      idea: [
        "First, scan the string to count the minimum misplaced left and right parentheses, remL and remR.",
        "Then run backtracking. At each index, we can either include the character or, if it is a parenthesis and we still have remaining removals of that type, skip it. To avoid duplicate valid strings, if multiple consecutive identical parentheses appear, only remove the first one at this level."
],
      complexity: "O(2^(remL + remR)) time; O(n) space.",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\n    vector<string> res;\n    void dfs(const string& s, int idx, int open, int remL, int remR, string& cur) {\n        if (idx == (int)s.size()) {\n            if (open == 0 && remL == 0 && remR == 0) res.push_back(cur);\n            return;\n        }\n        char c = s[idx];\n        // Option 1: remove parenthesis if needed\n        if (c == '(' && remL > 0) {\n            int j = idx;\n            while (j < (int)s.size() && s[j] == '(') j++;\n            int count = j - idx;\n            for (int k = 1; k <= min(remL, count); k++) {\n                dfs(s, idx + k, open, remL - k, remR, cur);\n            }\n        }\n        if (c == ')' && remR > 0) {\n            int j = idx;\n            while (j < (int)s.size() && s[j] == ')') j++;\n            int count = j - idx;\n            for (int k = 1; k <= min(remR, count); k++) {\n                dfs(s, idx + k, open, remL, remR - k, cur);\n            }\n        }\n        // Option 2: keep character\n        cur.push_back(c);\n        if (c == '(') dfs(s, idx + 1, open + 1, remL, remR, cur);\n        else if (c == ')') {\n            if (open > 0) dfs(s, idx + 1, open - 1, remL, remR, cur);\n        } else {\n            dfs(s, idx + 1, open, remL, remR, cur);\n        }\n        cur.pop_back();\n    }\npublic:\n    vector<string> removeInvalidParentheses(string s) {\n        int remL = 0, remR = 0;\n        for (char c : s) {\n            if (c == '(') remL++;\n            else if (c == ')') {\n                if (remL > 0) remL--;\n                else remR++;\n            }\n        }\n        res.clear();\n        string cur = \"\";\n        dfs(s, 0, 0, remL, remR, cur);\n        sort(res.begin(), res.end());\n        res.erase(unique(res.begin(), res.end()), res.end());\n        if (res.empty()) return {\"\"};\n        return res;\n    }\n};\n",
    },
  },
  {
    id: "lc-253",
    source: "leetcode",
    title: "Meeting Rooms II",
    statement: [
      "Given an array of meeting time intervals intervals where intervals[i] = [starti, endi], return the minimum number of conference rooms required."
],
    constraints: [
      "1 <= intervals.length <= 10^4",
      "0 <= starti < endi <= 10^6"
],
    fn: {"name":"minMeetingRooms","params":[{"name":"intervals","type":"int[][]"}],"returns":"int"},
    examples: [
      { input: [[[0,30],[5,10],[15,20]]], output: 2, explanation: "Meeting [0, 30] overlaps with [5, 10] and [15, 20], requiring at least 2 conference rooms." },
      { input: [[[7,10],[2,4]]], output: 1, explanation: "The meetings do not overlap, so only 1 room is needed." },
    ],
    tests: [
      { input: [[[1,5],[5,10]]], output: 1 },
      { input: [[[1,10],[2,9],[3,8],[4,7]]], output: 4 },
      { input: [[[1,2],[3,4],[5,6]]], output: 1 },
      { input: [[[1,100]]], output: 1 },
      { input: [[[0,10],[1,5],[6,12],[8,15],[14,20]]], output: 3 },
      { input: [[[2,15],[36,45],[9,29],[16,23],[4,9]]], output: 2 },
    ],
    hints: [
      "Think about meetings as events in time: a start event adds a room requirement, and an end event frees a room.",
      "Sort start times and end times independently.",
      "Iterate through start times. If the next start time is before the earliest end time, an additional room is required; otherwise, a room was freed up and can be reused."
],
    solution: {
      idea: [
        "Separate all start times and end times into two arrays and sort both in ascending order.",
        "Use two pointers, one for starts and one for ends. When the current start time is less than the current end time, a meeting starts before any existing meeting ends, so we allocate a room. When the start time is greater than or equal to the end time, a meeting has finished, so we reuse the room and advance the end pointer."
],
      complexity: "O(n log n) time to sort; O(n) space.",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int minMeetingRooms(vector<vector<int>>& intervals) {\n        if (intervals.empty()) return 0;\n        int n = intervals.size();\n        vector<int> starts(n), ends(n);\n        for (int i = 0; i < n; i++) {\n            starts[i] = intervals[i][0];\n            ends[i] = intervals[i][1];\n        }\n        sort(starts.begin(), starts.end());\n        sort(ends.begin(), ends.end());\n\n        int rooms = 0, endIdx = 0;\n        for (int i = 0; i < n; i++) {\n            if (starts[i] < ends[endIdx]) {\n                rooms++;\n            } else {\n                endIdx++;\n            }\n        }\n        return rooms;\n    }\n};\n",
    },
  },
  {
    id: "lc-759",
    source: "leetcode",
    title: "Employee Free Time",
    statement: [
      "We are given a list of non-overlapping work intervals for employees in the form of a flattened array where each element is [start, end].",
      "Return the list of finite intervals representing common, positive-length free time for all employees, sorted in increasing order of start time.",
      "Any gap between disjoint busy intervals counts as free time."
],
    constraints: [
      "1 <= intervals.length <= 10^4",
      "0 <= intervals[i][0] < intervals[i][1] <= 10^8"
],
    fn: {"name":"employeeFreeTime","params":[{"name":"intervals","type":"int[][]"}],"returns":"int[][]"},
    examples: [
      { input: [[[1,2],[5,6],[1,3],[4,10]]], output: [[3,4]], explanation: "Merging overlapping intervals gives [1, 3] and [4, 10]. The only free time gap between them is [3, 4]." },
      { input: [[[1,3],[6,7],[2,4],[2,5],[9,12]]], output: [[5,6],[7,9]], explanation: "Merged intervals are [1, 5], [6, 7], [9, 12]. Common free intervals are [5, 6] and [7, 9]." },
    ],
    tests: [
      { input: [[[1,5]]], output: [] },
      { input: [[[1,2],[2,3],[3,4]]], output: [] },
      { input: [[[1,10],[2,5],[6,8]]], output: [] },
      { input: [[[1,3],[5,7],[9,11]]], output: [[3,5],[7,9]] },
      { input: [[[10,20],[30,40],[15,25],[26,29]]], output: [[25,26],[29,30]] },
      { input: [[[0,1],[2,3],[4,5],[6,7],[8,9]]], output: [[1,2],[3,4],[5,6],[7,8]] },
    ],
    hints: [
      "Collect all work intervals together regardless of employee, since a time is free only if no employee is working.",
      "Sort the intervals by their start times and merge overlapping intervals.",
      "Any positive gap between the end of one merged interval and the start of the next merged interval is common free time."
],
    solution: {
      idea: [
        "Sort all working intervals by start time. Maintain a running merged interval [curStart, curEnd].",
        "For each subsequent interval [s, e], if s <= curEnd, extend curEnd = max(curEnd, e). Otherwise, a gap exists between curEnd and s; add [curEnd, s] to the free time result and update [curStart, curEnd] = [s, e]."
],
      complexity: "O(n log n) time to sort; O(n) space.",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<vector<int>> employeeFreeTime(vector<vector<int>>& intervals) {\n        if (intervals.empty()) return {};\n        sort(intervals.begin(), intervals.end(), [](const vector<int>& a, const vector<int>& b) {\n            if (a[0] != b[0]) return a[0] < b[0];\n            return a[1] < b[1];\n        });\n\n        vector<vector<int>> res;\n        int curEnd = intervals[0][1];\n        for (size_t i = 1; i < intervals.size(); i++) {\n            if (intervals[i][0] > curEnd) {\n                res.push_back({curEnd, intervals[i][0]});\n                curEnd = intervals[i][1];\n            } else {\n                curEnd = max(curEnd, intervals[i][1]);\n            }\n        }\n        return res;\n    }\n};\n",
    },
  },
  {
    id: "lc-269",
    source: "leetcode",
    title: "Alien Dictionary",
    statement: [
      "There is a new alien language that uses the English alphabet. However, the order among the letters is unknown to you.",
      "You are given a list of strings words from the alien language's dictionary, where the strings are claimed to be sorted lexicographically by the rules of this new language.",
      "Derive the order of letters in this language. If the order is invalid (contains a cycle or violates prefix order), return \"\". If multiple valid orders exist, return the lexicographically smallest valid topological order."
],
    constraints: [
      "1 <= words.length <= 100",
      "1 <= words[i].length <= 100",
      "words[i] consists of only lowercase English letters"
],
    fn: {"name":"alienOrder","params":[{"name":"words","type":"string[]"}],"returns":"string"},
    examples: [
      { input: [["wrt","wrf","er","ett","rftt"]], output: "wertf", explanation: "Pairwise comparisons reveal the order 'wertf'." },
      { input: [["z","x"]], output: "zx", explanation: "Comparing 'z' and 'x' shows 'z' comes before 'x'." },
    ],
    tests: [
      { input: [["z","x","z"]], output: "" },
      { input: [["abc","ab"]], output: "" },
      { input: [["z"]], output: "z" },
      { input: [["zy","zx"]], output: "yxz" },
      { input: [["a","b","ca","cc"]], output: "abc" },
      { input: [["baa","abcd","abca","cab","cad"]], output: "bdac" },
    ],
    hints: [
      "The order between characters is determined by comparing adjacent pairs of words in the dictionary.",
      "Find the first differing character between words[i] and words[i + 1]: this establishes a directed edge u -> v.",
      "If words[i] is longer than words[i + 1] and words[i + 1] is a prefix of words[i], the dictionary is invalid. Use Kahn's algorithm with a min-heap to find the lexicographically smallest topological sort."
],
    solution: {
      idea: [
        "Collect all unique characters present across all words.",
        "Compare adjacent words words[i] and words[i+1]. If words[i+1] is a strict prefix of words[i], then the input is invalid and we return \"\". Otherwise, find the first position where characters differ: add a directed edge from words[i][k] to words[i+1][k].",
        "Perform Kahn's topological sort using a min-heap priority queue. If the resulting topological order contains all unique characters, return it; otherwise, a cycle exists, so return \"\"."
],
      complexity: "O(total characters + distinct letters log(distinct letters)) time; O(distinct letters) space.",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    string alienOrder(vector<string>& words) {\n        unordered_set<char> allChars;\n        for (const string& w : words) {\n            for (char c : w) allChars.insert(c);\n        }\n\n        unordered_map<char, unordered_set<char>> adj;\n        unordered_map<char, int> inDegree;\n        for (char c : allChars) inDegree[c] = 0;\n\n        for (size_t i = 0; i + 1 < words.size(); i++) {\n            const string& w1 = words[i];\n            const string& w2 = words[i + 1];\n            if (w1.size() > w2.size() && w1.compare(0, w2.size(), w2) == 0) return \"\";\n            for (size_t j = 0; j < min(w1.size(), w2.size()); j++) {\n                if (w1[j] != w2[j]) {\n                    if (!adj[w1[j]].count(w2[j])) {\n                        adj[w1[j]].insert(w2[j]);\n                        inDegree[w2[j]]++;\n                    }\n                    break;\n                }\n            }\n        }\n\n        priority_queue<char, vector<char>, greater<char>> pq;\n        for (char c : allChars) {\n            if (inDegree[c] == 0) pq.push(c);\n        }\n\n        string order = \"\";\n        while (!pq.empty()) {\n            char u = pq.top();\n            pq.pop();\n            order += u;\n            for (char v : adj[u]) {\n                if (--inDegree[v] == 0) pq.push(v);\n            }\n        }\n\n        if (order.size() < allChars.size()) return \"\";\n        return order;\n    }\n};\n",
    },
  },
  {
    id: "lc-305",
    source: "leetcode",
    title: "Number of Islands II",
    statement: [
      "You are given an empty 2D binary grid of size m x n. The grid represents a map where 0 is water and 1 is land.",
      "An array positions is given where positions[i] = [ri, ci] is the position at which we add land at step i.",
      "Return an array of integers answer where answer[i] is the number of islands after adding land at positions[i]. Repeated additions to an existing land cell have no effect on the count."
],
    constraints: [
      "1 <= m, n <= 10^4",
      "1 <= m * n <= 10^4",
      "1 <= positions.length <= 10^4",
      "0 <= ri < m",
      "0 <= ci < n"
],
    fn: {"name":"numIslands2","params":[{"name":"m","type":"int"},{"name":"n","type":"int"},{"name":"positions","type":"int[][]"}],"returns":"int[]"},
    examples: [
      { input: [3,3,[[0,0],[0,1],[1,2],[2,1]]], output: [1,1,2,3], explanation: "Adding (0, 0) gives 1 island; adding (0, 1) merges with (0, 0) keeping 1; adding (1, 2) gives 2; adding (2, 1) gives 3." },
      { input: [1,1,[[0,0]]], output: [1], explanation: "1 land cell added into a 1x1 grid gives 1 island." },
    ],
    tests: [
      { input: [3,3,[[0,0],[0,1],[2,2],[2,2]]], output: [1,1,2,2] },
      { input: [1,4,[[0,0],[0,2],[0,1],[0,3]]], output: [1,2,1,1] },
      { input: [3,3,[[0,0],[0,2],[2,0],[2,2],[1,1]]], output: [1,2,3,4,5] },
      { input: [2,2,[[0,0],[1,1],[0,1],[1,0]]], output: [1,2,1,1] },
      { input: [3,3,[[0,1],[1,0],[1,2],[2,1],[1,1]]], output: [1,2,3,4,1] },
      { input: [5,5,[[2,2],[2,3],[2,1],[1,2],[3,2]]], output: [1,1,1,1,1] },
    ],
    hints: [
      "Represent the dynamic grid cells with a Disjoint Set Union (Union-Find) data structure.",
      "When adding land at (r, c), check if it is already land. If not, treat it as a new island (increment count) and check its 4 adjacent neighbors.",
      "For every neighboring cell that is already land, union the two components; each successful union decreases the island count by 1."
],
    solution: {
      idea: [
        "Flatten 2D coordinates (r, c) into 1D indices r * n + c. Initialize a parent array with -1 to indicate water.",
        "For each position: if the cell already contains land, append the current count. Otherwise, mark it as land with parent[idx] = idx and increment the island count. Inspect all 4 cardinal neighbors; if a neighbor is land, union the two components and decrement the island count whenever they were not already connected."
],
      complexity: "O(k * alpha(m * n)) time where k is positions.length; O(m * n) space.",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\n    vector<int> parent;\n    int findRoot(int i) {\n        if (parent[i] == i) return i;\n        return parent[i] = findRoot(parent[i]);\n    }\n    bool unite(int i, int j) {\n        int r1 = findRoot(i), r2 = findRoot(j);\n        if (r1 == r2) return false;\n        parent[r1] = r2;\n        return true;\n    }\npublic:\n    vector<int> numIslands2(int m, int n, vector<vector<int>>& positions) {\n        parent.assign(m * n, -1);\n        int count = 0;\n        vector<int> res;\n        int dr[4] = {1, -1, 0, 0};\n        int dc[4] = {0, 0, 1, -1};\n\n        for (const auto& p : positions) {\n            int r = p[0], c = p[1];\n            int idx = r * n + c;\n            if (parent[idx] != -1) {\n                res.push_back(count);\n                continue;\n            }\n            parent[idx] = idx;\n            count++;\n            for (int i = 0; i < 4; i++) {\n                int nr = r + dr[i], nc = c + dc[i];\n                if (nr < 0 || nr >= m || nc < 0 || nc >= n) continue;\n                int nidx = nr * n + nc;\n                if (parent[nidx] != -1) {\n                    if (unite(idx, nidx)) count--;\n                }\n            }\n            res.push_back(count);\n        }\n        return res;\n    }\n};\n",
    },
  },
  {
    id: "lc-1168",
    source: "leetcode",
    title: "Optimize Water Distribution in a Village",
    statement: [
      "There are n houses in a village numbered 1 to n. We want to supply water to all houses by building wells and laying pipes.",
      "For each house i, we can either build a well directly inside the house with cost wells[i - 1], or pipe water from an existing water source or another house.",
      "The pipes are given as an array pipes where each pipes[j] = [house1, house2, cost] represents the cost to connect house1 and house2. Return the minimum total cost to supply water to all houses."
],
    constraints: [
      "2 <= n <= 10^4",
      "wells.length == n",
      "0 <= wells[i] <= 10^5",
      "1 <= pipes.length <= 10^4",
      "pipes[j].length == 3",
      "1 <= house1, house2 <= n",
      "0 <= cost <= 10^5",
      "house1 != house2"
],
    fn: {"name":"minCostToSupplyWater","params":[{"name":"n","type":"int"},{"name":"wells","type":"int[]"},{"name":"pipes","type":"int[][]"}],"returns":"int"},
    examples: [
      { input: [3,[1,2,2],[[1,2,1],[2,3,1]]], output: 3, explanation: "Build a well at house 1 (cost 1), pipe 1 to 2 (cost 1), and pipe 2 to 3 (cost 1), totaling 3." },
      { input: [2,[1,1],[[1,2,1]]], output: 2, explanation: "Build wells at both houses (cost 1 + 1 = 2) or build one well and pipe (1 + 1 = 2). Cost is 2." },
    ],
    tests: [
      { input: [3,[3,3,3],[[1,2,1],[2,3,1],[1,3,2]]], output: 5 },
      { input: [4,[5,4,3,2],[[1,2,10],[2,3,10],[3,4,10]]], output: 14 },
      { input: [2,[100,100],[[1,2,5]]], output: 105 },
      { input: [3,[10,10,10],[]], output: 30 },
      { input: [4,[1,1,1,1],[[1,2,2],[2,3,2],[3,4,2],[4,1,2]]], output: 4 },
      { input: [5,[1,2,3,4,5],[[1,2,1],[2,3,1],[3,4,1],[4,5,1]]], output: 5 },
    ],
    hints: [
      "Building a well inside house i can be viewed as connecting house i to a virtual water source node 0 with weight wells[i - 1].",
      "With virtual node 0, supplying water to every house is equivalent to connecting all houses 1..n to node 0.",
      "This is exactly the Minimum Spanning Tree (MST) problem on n + 1 nodes. Use Kruskal's or Prim's algorithm."
],
    solution: {
      idea: [
        "Introduce a virtual node 0 representing the global water reservoir. Building a well at house i (1-indexed) corresponds to an undirected edge between node 0 and house i with weight wells[i - 1].",
        "Add all given pipes as edges between their respective houses. The minimum cost to provide water to every house is the weight of the Minimum Spanning Tree spanning nodes 0 through n. We apply Kruskal's algorithm using Disjoint Set Union."
],
      complexity: "O(E log E) time where E = n + pipes.length; O(n) space.",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\n    vector<int> parent;\n    int findRoot(int x) {\n        if (parent[x] == x) return x;\n        return parent[x] = findRoot(parent[x]);\n    }\n    bool unite(int x, int y) {\n        int rx = findRoot(x), ry = findRoot(y);\n        if (rx == ry) return false;\n        parent[rx] = ry;\n        return true;\n    }\npublic:\n    int minCostToSupplyWater(int n, vector<int>& wells, vector<vector<int>>& pipes) {\n        vector<vector<int>> edges;\n        for (int i = 1; i <= n; i++) {\n            edges.push_back({wells[i - 1], 0, i});\n        }\n        for (const auto& p : pipes) {\n            edges.push_back({p[2], p[0], p[1]});\n        }\n        sort(edges.begin(), edges.end(), [](const vector<int>& a, const vector<int>& b) {\n            return a[0] < b[0];\n        });\n\n        parent.resize(n + 1);\n        iota(parent.begin(), parent.end(), 0);\n\n        int totalCost = 0, edgesCount = 0;\n        for (const auto& e : edges) {\n            int cost = e[0], u = e[1], v = e[2];\n            if (unite(u, v)) {\n                totalCost += cost;\n                edgesCount++;\n                if (edgesCount == n) break;\n            }\n        }\n        return totalCost;\n    }\n};\n",
    },
  },
  {
    id: "lc-772",
    source: "leetcode",
    title: "Basic Calculator III",
    statement: [
      "Implement a basic calculator to evaluate a simple expression string.",
      "The expression string contains non-negative integers, '+', '-', '*', '/' operators, and open '(' and closing ')' parentheses.",
      "The integer division should truncate toward zero. You may assume that the given expression is always valid and will not cause integer overflow."
],
    constraints: [
      "1 <= s.length <= 10^4",
      "s consists of digits, '+', '-', '*', '/', '(', ')' and ' '",
      "s is a valid expression"
],
    fn: {"name":"calculate","params":[{"name":"s","type":"string"}],"returns":"int"},
    examples: [
      { input: ["1+1"], output: 2, explanation: "1 + 1 = 2." },
      { input: ["6-4/2"], output: 4, explanation: "Division precedes subtraction: 4 / 2 = 2, then 6 - 2 = 4." },
    ],
    tests: [
      { input: ["2*(5+5*2)/3+(6/2+8)"], output: 21 },
      { input: ["(2+6* 3+5- (3*14/7+2)*5)+3"], output: -12 },
      { input: ["0"], output: 0 },
      { input: ["(1)"], output: 1 },
      { input: [" 3/2 "], output: 1 },
      { input: ["(100 - (20 + 30) * 2) / 5"], output: 0 },
    ],
    hints: [
      "Handle parentheses by either using recursion whenever an open parenthesis '(' is encountered, or using two stacks for values and operators.",
      "Assign precedence: '*' and '/' have higher precedence (2) than '+' and '-' (1).",
      "When encountering an operator, evaluate previous operators on the stack that have greater or equal precedence before pushing the new one."
],
    solution: {
      idea: [
        "Use a recursive parsing function or two stacks (numbers and operators) with standard precedence rules.",
        "When an opening parenthesis is met, recursively evaluate the sub-expression up to the matching closing parenthesis. Maintain a running number and sign/operator; for '*' and '/', apply the operation directly to the top of the local stack. Finally, sum all numbers on the stack to obtain the result."
],
      complexity: "O(n) time; O(n) space.",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\n    int parse(const string& s, size_t& i) {\n        vector<long long> nums;\n        char op = '+';\n        long long cur = 0;\n        while (i < s.size()) {\n            char c = s[i++];\n            if (isdigit(c)) {\n                cur = cur * 10 + (c - '0');\n            } else if (c == '(') {\n                cur = parse(s, i);\n            }\n            if ((!isdigit(c) && c != ' ') || i == s.size()) {\n                if (op == '+') nums.push_back(cur);\n                else if (op == '-') nums.push_back(-cur);\n                else if (op == '*') {\n                    long long top = nums.back();\n                    nums.pop_back();\n                    nums.push_back(top * cur);\n                } else if (op == '/') {\n                    long long top = nums.back();\n                    nums.pop_back();\n                    nums.push_back(top / cur);\n                }\n                op = c;\n                cur = 0;\n            }\n            if (c == ')') break;\n        }\n        long long sum = 0;\n        for (long long x : nums) sum += x;\n        return (int)sum;\n    }\npublic:\n    int calculate(string s) {\n        size_t i = 0;\n        return parse(s, i);\n    }\n};\n",
    },
  },
  {
    id: "lc-901",
    source: "leetcode",
    title: "Online Stock Span",
    statement: [
      "Given a series of daily price quotes for a stock represented as an integer array prices, calculate the span of each day's price.",
      "The span of the stock's price in day i is the maximum number of consecutive days (starting from day i and going backward) for which the stock price was less than or equal to prices[i].",
      "Return an integer array containing the span for each day."
],
    constraints: [
      "1 <= prices.length <= 10^5",
      "1 <= prices[i] <= 10^5"
],
    fn: {"name":"calculateSpans","params":[{"name":"prices","type":"int[]"}],"returns":"int[]"},
    examples: [
      { input: [[100,80,60,70,60,75,85]], output: [1,1,1,2,1,4,6], explanation: "The spans are [1, 1, 1, 2, 1, 4, 6]. For instance, on the last day with price 85, previous consecutive prices <= 85 were 80, 60, 70, 60, 75, giving span 6." },
      { input: [[31,41,48,59,79]], output: [1,2,3,4,5], explanation: "Each day's price is greater than all previous days, so spans increase as [1, 2, 3, 4, 5]." },
    ],
    tests: [
      { input: [[100]], output: [1] },
      { input: [[100,90,80,70]], output: [1,1,1,1] },
      { input: [[10,10,10,10]], output: [1,2,3,4] },
      { input: [[28,14,28,35,46,53,66,80,87,88]], output: [1,1,3,4,5,6,7,8,9,10] },
      { input: [[50,40,30,20,60]], output: [1,1,1,1,5] },
      { input: [[1,5,2,4,3,6]], output: [1,2,1,2,1,6] },
    ],
    hints: [
      "A naive search backward takes O(n) per day, resulting in O(n^2) overall time.",
      "Notice that if prices[j] <= prices[i] (where j < i), any future price greater than prices[i] will also cover everything prices[j] covered.",
      "Use a monotonic decreasing stack of pairs (price, span). Pop smaller or equal prices and accumulate their spans."
],
    solution: {
      idea: [
        "Maintain a monotonic stack storing pairs of (price, span).",
        "For each day's price, initialize span to 1. While the stack is not empty and the top element's price is less than or equal to the current price, pop the top element and add its span to the current span. Then push (current price, span) onto the stack and append span to the result."
],
      complexity: "O(n) time since each price is pushed and popped at most once; O(n) space for the stack.",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> calculateSpans(vector<int>& prices) {\n        vector<int> res;\n        stack<pair<int, int>> st;\n        for (int p : prices) {\n            int span = 1;\n            while (!st.empty() && st.top().first <= p) {\n                span += st.top().second;\n                st.pop();\n            }\n            st.push({p, span});\n            res.push_back(span);\n        }\n        return res;\n    }\n};\n",
    },
  },
  {
    id: "lc-1483",
    source: "leetcode",
    title: "Kth Ancestor of a Tree Node",
    statement: [
      "You are given a tree with n nodes numbered from 0 to n - 1 in the form of a parent array, where parent[i] is the parent of the ith node. The root of the tree is node 0.",
      "Given a list of queries where each queries[j] = [node, k], find the kth ancestor of the given node. The kth ancestor is the node that is k steps up the path towards the root.",
      "Return an integer array containing the answer for each query in order, or -1 if no such ancestor exists."
],
    constraints: [
      "1 <= n <= 5 * 10^4",
      "parent[0] == -1",
      "0 <= parent[i] < n for i != 0",
      "1 <= queries.length <= 5 * 10^4",
      "queries[j] = [node, k]",
      "0 <= node < n",
      "1 <= k <= n"
],
    fn: {"name":"kthAncestor","params":[{"name":"n","type":"int"},{"name":"parent","type":"int[]"},{"name":"queries","type":"int[][]"}],"returns":"int[]"},
    examples: [
      { input: [7,[-1,0,0,1,1,2,2],[[3,1],[5,2],[6,3]]], output: [1,0,-1], explanation: "Node 3's 1st ancestor is 1; node 5's 2nd ancestor is 0; node 6 has only 2 ancestors (2 and 0), so its 3rd ancestor is -1." },
      { input: [5,[-1,0,1,2,3],[[4,2],[4,4],[4,5]]], output: [2,0,-1], explanation: "In a straight line 0-1-2-3-4, 2 steps up from 4 is 2; 4 steps up is 0; 5 steps up is outside the tree (-1)." },
    ],
    tests: [
      { input: [4,[-1,0,1,2],[[3,1],[3,2],[3,3],[3,4]]], output: [2,1,0,-1] },
      { input: [3,[-1,0,0],[[1,1],[2,1],[0,1]]], output: [0,0,-1] },
      { input: [1,[-1],[[0,1]]], output: [-1] },
      { input: [6,[-1,0,0,1,2,2],[[3,2],[4,2],[5,1]]], output: [0,0,2] },
      { input: [5,[-1,0,0,0,0],[[1,1],[2,1],[3,1],[4,1]]], output: [0,0,0,0] },
      { input: [7,[-1,0,1,2,3,4,5],[[6,6],[6,7],[1,1]]], output: [0,-1,0] },
    ],
    hints: [
      "Climbing up one parent at a time takes O(k) per query, which is too slow for 50,000 queries.",
      "Use binary lifting: precompute the 2^j-th ancestor for every node and power of two j.",
      "Any integer k can be decomposed into powers of two; jumping using the set bits of k answers each query in O(log k) time."
],
    solution: {
      idea: [
        "Precompute a binary lifting table up[node][j], which stores the 2^j-th ancestor of node. up[node][0] is parent[node], and up[node][j] = up[up[node][j-1]][j-1].",
        "To answer query [node, k], examine the binary representation of k. For each bit j that is 1, jump to up[node][j]. If node becomes -1 at any step, the ancestor does not exist."
],
      complexity: "O(n log n) preprocessing; O(log k) time per query; O(n log n) space.",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> kthAncestor(int n, vector<int>& parent, vector<vector<int>>& queries) {\n        int LOG = 17;\n        vector<vector<int>> up(n, vector<int>(LOG, -1));\n        for (int i = 0; i < n; i++) up[i][0] = parent[i];\n        for (int j = 1; j < LOG; j++) {\n            for (int i = 0; i < n; i++) {\n                if (up[i][j - 1] != -1) {\n                    up[i][j] = up[up[i][j - 1]][j - 1];\n                }\n            }\n        }\n\n        vector<int> res;\n        res.reserve(queries.size());\n        for (const auto& q : queries) {\n            int node = q[0], k = q[1];\n            for (int j = 0; j < LOG; j++) {\n                if ((k >> j) & 1) {\n                    node = up[node][j];\n                    if (node == -1) break;\n                }\n            }\n            res.push_back(node);\n        }\n        return res;\n    }\n};\n",
    },
  },
  {
    id: "lc-303",
    source: "leetcode",
    title: "Range Sum Query - Immutable",
    statement: [
      "Given an integer array nums and an array of queries where queries[i] = [left, right].",
      "Calculate the sum of the elements of nums between indices left and right inclusive (i.e. nums[left] + nums[left + 1] + ... + nums[right]) for each query.",
      "Return an integer array containing the results of each query in order."
],
    constraints: [
      "1 <= nums.length <= 10^4",
      "-10^5 <= nums[i] <= 10^5",
      "1 <= queries.length <= 10^4",
      "queries[i].length == 2",
      "0 <= left <= right < nums.length"
],
    fn: {"name":"rangeSumQuery","params":[{"name":"nums","type":"int[]"},{"name":"queries","type":"int[][]"}],"returns":"int[]"},
    examples: [
      { input: [[-2,0,3,-5,2,-1],[[0,2],[2,5],[0,5]]], output: [1,-1,-3], explanation: "Sum [0, 2] is (-2)+0+3 = 1; sum [2, 5] is 3+(-5)+2+(-1) = -1; sum [0, 5] is -3." },
      { input: [[1,2,3,4],[[1,2],[0,3]]], output: [5,10], explanation: "Sum [1, 2] is 2+3 = 5; sum [0, 3] is 1+2+3+4 = 10." },
    ],
    tests: [
      { input: [[5],[[0,0]]], output: [5] },
      { input: [[0,0,0],[[0,1],[1,2]]], output: [0,0] },
      { input: [[-1,-1,-1],[[0,2]]], output: [-3] },
      { input: [[10,-10,10,-10],[[0,1],[1,2],[0,3]]], output: [0,0,0] },
      { input: [[1,1,1,1,1],[[0,4],[2,3],[1,1]]], output: [5,2,1] },
      { input: [[1000,2000,3000],[[0,1],[1,2],[0,2]]], output: [3000,5000,6000] },
    ],
    hints: [
      "Precomputing prefix sums allows calculating any range sum in O(1) time.",
      "Build prefix[k] = nums[0] + nums[1] + ... + nums[k - 1] with prefix[0] = 0.",
      "The sum from index left to right is simply prefix[right + 1] - prefix[left]."
],
    solution: {
      idea: [
        "Compute the prefix sum array pref of size n + 1 where pref[i] represents the sum of the first i elements.",
        "For each query [left, right], the sum of elements from left to right inclusive is given directly by pref[right + 1] - pref[left]."
],
      complexity: "O(n + q) time; O(n) space.",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> rangeSumQuery(vector<int>& nums, vector<vector<int>>& queries) {\n        int n = nums.size();\n        vector<long long> pref(n + 1, 0);\n        for (int i = 0; i < n; i++) pref[i + 1] = pref[i] + nums[i];\n\n        vector<int> res;\n        res.reserve(queries.size());\n        for (const auto& q : queries) {\n            int l = q[0], r = q[1];\n            res.push_back((int)(pref[r + 1] - pref[l]));\n        }\n        return res;\n    }\n};\n",
    },
  },
  {
    id: "lc-307",
    source: "leetcode",
    title: "Range Sum Query - Mutable",
    statement: [
      "Given an integer array nums and a list of queries.",
      "Each query is either [1, index, val] indicating an update to nums[index] = val, or [2, left, right] requesting the sum of elements from index left to right inclusive.",
      "Return an array containing the results of all type 2 sum queries in order."
],
    constraints: [
      "1 <= nums.length <= 3 * 10^4",
      "-100 <= nums[i] <= 100",
      "0 <= index < nums.length",
      "-100 <= val <= 100",
      "0 <= left <= right < nums.length",
      "At most 3 * 10^4 queries of type 1 and 2"
],
    fn: {"name":"rangeSumMutable","params":[{"name":"nums","type":"int[]"},{"name":"queries","type":"int[][]"}],"returns":"int[]"},
    examples: [
      { input: [[1,3,5],[[2,0,2],[1,1,2],[2,0,2]]], output: [9,8], explanation: "Sum [0, 2] is 1+3+5 = 9. After updating index 1 to 2, array is [1, 2, 5], sum [0, 2] is 1+2+5 = 8." },
      { input: [[7,2,7,2,0],[[2,0,2],[1,4,6],[2,0,2],[2,0,4]]], output: [16,16,24], explanation: "Initial sum [0, 2] = 16. After setting index 4 to 6, sum [0, 2] = 16 and sum [0, 4] = 24." },
    ],
    tests: [
      { input: [[1],[[2,0,0],[1,0,10],[2,0,0]]], output: [1,10] },
      { input: [[0,0,0],[[1,1,5],[2,0,2],[1,0,3],[2,0,1]]], output: [5,8] },
      { input: [[5,10,15],[[1,0,0],[1,1,0],[1,2,0],[2,0,2]]], output: [0] },
      { input: [[-1,-2,-3],[[2,0,2],[1,1,2],[2,0,2]]], output: [-6,-2] },
      { input: [[1,2,3,4,5],[[2,1,3],[1,2,10],[2,1,3]]], output: [9,16] },
      { input: [[10,20,30],[[2,0,0],[2,1,1],[2,2,2]]], output: [10,20,30] },
    ],
    hints: [
      "A simple array gives O(1) update but O(n) query; a prefix sum array gives O(1) query but O(n) update.",
      "A Binary Indexed Tree (Fenwick tree) or Segment Tree balances both operations in O(log n) time.",
      "When updating nums[index] = val, compute delta = val - nums[index], update the tree with delta, and set nums[index] = val."
],
    solution: {
      idea: [
        "Implement a Binary Indexed Tree (BIT) / Fenwick Tree of size n + 1.",
        "Initialize the tree with nums. For an update query [1, index, val], calculate delta = val - nums[index], add delta to the BIT at 1-based index index + 1, and update nums[index] = val.",
        "For a range query [2, left, right], compute queryBIT(right + 1) - queryBIT(left) and record the result."
],
      complexity: "O(n + q log n) time; O(n) space.",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\n    int n;\n    vector<long long> tree;\n    void add(int i, long long delta) {\n        for (; i <= n; i += i & -i) tree[i] += delta;\n    }\n    long long query(int i) {\n        long long sum = 0;\n        for (; i > 0; i -= i & -i) sum += tree[i];\n        return sum;\n    }\npublic:\n    vector<int> rangeSumMutable(vector<int>& nums, vector<vector<int>>& queries) {\n        n = nums.size();\n        tree.assign(n + 1, 0);\n        for (int i = 0; i < n; i++) add(i + 1, nums[i]);\n\n        vector<int> res;\n        for (const auto& q : queries) {\n            int type = q[0];\n            if (type == 1) {\n                int idx = q[1], val = q[2];\n                long long delta = val - nums[idx];\n                nums[idx] = val;\n                add(idx + 1, delta);\n            } else {\n                int l = q[1], r = q[2];\n                res.push_back((int)(query(r + 1) - query(l)));\n            }\n        }\n        return res;\n    }\n};\n",
    },
  },
  {
    id: "lc-32",
    source: "leetcode",
    title: "Longest Valid Parentheses",
    statement: [
      "Given a string s containing just the characters '(' and ')', return the length of the longest valid (well-formed) parentheses substring."
],
    constraints: [
      "0 <= s.length <= 3 * 10^4",
      "s[i] is '(', or ')'"
],
    fn: {"name":"longestValidParentheses","params":[{"name":"s","type":"string"}],"returns":"int"},
    examples: [
      { input: ["(()"], output: 2, explanation: "The longest valid parentheses substring is '()', with length 2." },
      { input: [")()())"], output: 4, explanation: "The longest valid parentheses substring is '()()', with length 4." },
    ],
    tests: [
      { input: [""], output: 0 },
      { input: ["("], output: 0 },
      { input: [")"], output: 0 },
      { input: ["()()"], output: 4 },
      { input: ["((()))"], output: 6 },
      { input: [")()((()()))())("], output: 12 },
    ],
    hints: [
      "A stack can track the indices of unmatched parentheses.",
      "Push -1 onto the stack initially as a baseline reference for valid substrings starting from index 0.",
      "For '(', push its index. For ')', pop the top index; if the stack becomes empty, push the current index as the new baseline, otherwise the valid length ending here is current_index - stack.top()."
],
    solution: {
      idea: [
        "Use a stack to keep indices. Initialize the stack with -1, which acts as the boundary before the first character.",
        "Iterate through the string: when encountering '(', push its index onto the stack. When encountering ')', pop the top element. If the stack is now empty, push the current index as the new baseline; otherwise, the length of the valid parentheses substring ending at the current index is current_index - stack.top(). Track the maximum length."
],
      complexity: "O(n) time with a single pass; O(n) space for the stack.",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int longestValidParentheses(string s) {\n        stack<int> st;\n        st.push(-1);\n        int maxLen = 0;\n        for (int i = 0; i < (int)s.size(); i++) {\n            if (s[i] == '(') {\n                st.push(i);\n            } else {\n                st.pop();\n                if (st.empty()) {\n                    st.push(i);\n                } else {\n                    maxLen = max(maxLen, i - st.top());\n                }\n            }\n        }\n        return maxLen;\n    }\n};\n",
    },
  },
  {
    id: "lc-85",
    source: "leetcode",
    title: "Maximal Rectangle",
    statement: [
      "Given a rows x cols binary matrix filled with '0's and '1's, find the largest rectangle containing only 1's and return its area."
],
    constraints: [
      "rows == matrix.length",
      "cols == matrix[i].length",
      "1 <= row, cols <= 200",
      "matrix[i][j] is '0' or '1'"
],
    fn: {"name":"maximalRectangle","params":[{"name":"matrix","type":"string[][]"}],"returns":"int"},
    examples: [
      { input: [[["1","0","1","0","0"],["1","0","1","1","1"],["1","1","1","1","1"],["1","0","0","1","0"]]], output: 6, explanation: "The maximal rectangle has area 6 (width 3, height 2)." },
      { input: [[["0"]]], output: 0, explanation: "No 1s, area is 0." },
    ],
    tests: [
      { input: [[["1"]]], output: 1 },
      { input: [[["1","1"],["1","1"]]], output: 4 },
      { input: [[["0","0"],["0","0"]]], output: 0 },
      { input: [[["1","1","1","1"],["1","1","1","1"]]], output: 8 },
      { input: [[["1","0"],["0","1"]]], output: 1 },
      { input: [[["0","1","1"],["1","1","1"],["0","1","0"]]], output: 4 },
    ],
    hints: [
      "Treat each row of the matrix as the base of a histogram.",
      "Maintain a height array: if matrix[r][c] is '1', increment height[c]; if it is '0', reset height[c] to 0.",
      "For each row, calculate the largest rectangle in the resulting histogram using a monotonic stack (like LeetCode 84)."
],
    solution: {
      idea: [
        "Maintain a height array of length cols, where height[c] represents the number of consecutive '1's ending at the current row in column c.",
        "For each row, update the heights. Then use the monotonic stack algorithm from Largest Rectangle in Histogram: push column indices onto a stack maintaining non-decreasing heights. When a smaller height is seen, pop and calculate the rectangle with the popped height as the minimum."
],
      complexity: "O(rows * cols) time; O(cols) space.",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\n    int largestRectangleArea(const vector<int>& heights) {\n        vector<int> h = heights;\n        h.push_back(0);\n        stack<int> st;\n        int maxArea = 0;\n        for (int i = 0; i < (int)h.size(); i++) {\n            while (!st.empty() && h[st.top()] >= h[i]) {\n                int height = h[st.top()];\n                st.pop();\n                int width = st.empty() ? i : i - st.top() - 1;\n                maxArea = max(maxArea, height * width);\n            }\n            st.push(i);\n        }\n        return maxArea;\n    }\npublic:\n    int maximalRectangle(vector<vector<string>>& matrix) {\n        if (matrix.empty() || matrix[0].empty()) return 0;\n        int cols = matrix[0].size();\n        vector<int> heights(cols, 0);\n        int maxArea = 0;\n        for (const auto& row : matrix) {\n            for (int c = 0; c < cols; c++) {\n                if (!row[c].empty() && row[c][0] == '1') heights[c]++;\n                else heights[c] = 0;\n            }\n            maxArea = max(maxArea, largestRectangleArea(heights));\n        }\n        return maxArea;\n    }\n};\n",
    },
  },
  {
    id: "lc-22",
    source: "leetcode",
    title: "Generate Parentheses",
    statement: [
      "Given n pairs of parentheses, write a function to generate all combinations of well-formed parentheses.",
      "The result strings can be returned in any order."
],
    constraints: [
      "1 <= n <= 8"
],
    fn: {"name":"generateParenthesis","params":[{"name":"n","type":"int"}],"returns":"string[]"},
    examples: [
      { input: [3], output: ["((()))","(()())","(())()","()(())","()()()"], explanation: "All 5 valid combinations for n = 3: ['((()))', '(()())', '(())()', '()(())', '()()()']." },
      { input: [1], output: ["()"], explanation: "Only 1 valid combination for n = 1: ['()']." },
    ],
    tests: [
      { input: [2], output: ["(())","()()"] },
      { input: [4], output: ["(((())))","((()()))","((())())","((()))()","(()(()))","(()()())","(()())()","(())(())","(())()()","()((()))","()(()())","()(())()","()()(())","()()()()"] },
      { input: [5], output: ["((((()))))","(((()())))","(((())()))","(((()))())","(((())))()","((()(())))","((()()()))","((()())())","((()()))()","((())(()))","((())()())","((())())()","((()))(())","((()))()()","(()((())))","(()(()()))","(()(())())","(()(()))()","(()()(()))","(()()()())","(()()())()","(()())(())","(()())()()","(())((()))","(())(()())","(())(())()","(())()(())","(())()()()","()(((())))","()((()()))","()((())())","()((()))()","()(()(()))","()(()()())","()(()())()","()(())(())","()(())()()","()()((()))","()()(()())","()()(())()","()()()(())","()()()()()"] },
      { input: [1], output: ["()"] },
      { input: [3], output: ["((()))","(()())","(())()","()(())","()()()"] },
      { input: [6], output: ["(((((())))))","((((()()))))","((((())())))","((((()))()))","((((())))())","((((()))))()","(((()(()))))","(((()()())))","(((()())()))","(((()()))())","(((()())))()","(((())(())))","(((())()()))","(((())())())","(((())()))()","(((()))(()))","(((()))()())","(((()))())()","(((())))(())","(((())))()()","((()((()))))","((()(()())))","((()(())()))","((()(()))())","((()(())))()","((()()(())))","((()()()()))","((()()())())","((()()()))()","((()())(()))","((()())()())","((()())())()","((()()))(())","((()()))()()","((())((())))","((())(()()))","((())(())())","((())(()))()","((())()(()))","((())()()())","((())()())()","((())())(())","((())())()()","((()))((()))","((()))(()())","((()))(())()","((()))()(())","((()))()()()","(()(((()))))","(()((()())))","(()((())()))","(()((()))())","(()((())))()","(()(()(())))","(()(()()()))","(()(()())())","(()(()()))()","(()(())(()))","(()(())()())","(()(())())()","(()(()))(())","(()(()))()()","(()()((())))","(()()(()()))","(()()(())())","(()()(()))()","(()()()(()))","(()()()()())","(()()()())()","(()()())(())","(()()())()()","(()())((()))","(()())(()())","(()())(())()","(()())()(())","(()())()()()","(())(((())))","(())((()()))","(())((())())","(())((()))()","(())(()(()))","(())(()()())","(())(()())()","(())(())(())","(())(())()()","(())()((()))","(())()(()())","(())()(())()","(())()()(())","(())()()()()","()((((()))))","()(((()())))","()(((())()))","()(((()))())","()(((())))()","()((()(())))","()((()()()))","()((()())())","()((()()))()","()((())(()))","()((())()())","()((())())()","()((()))(())","()((()))()()","()(()((())))","()(()(()()))","()(()(())())","()(()(()))()","()(()()(()))","()(()()()())","()(()()())()","()(()())(())","()(()())()()","()(())((()))","()(())(()())","()(())(())()","()(())()(())","()(())()()()","()()(((())))","()()((()()))","()()((())())","()()((()))()","()()(()(()))","()()(()()())","()()(()())()","()()(())(())","()()(())()()","()()()((()))","()()()(()())","()()()(())()","()()()()(())","()()()()()()"] },
    ],
    unordered: true,
    hints: [
      "Use backtracking to construct valid combinations character by character.",
      "At any point, we can add an open parenthesis '(' if we have used fewer than n open parentheses.",
      "We can add a closing parenthesis ')' only if the number of closing parentheses used is strictly less than the number of opening parentheses used."
],
    solution: {
      idea: [
        "Backtrack by tracking the count of open '(' and close ')' parentheses used so far.",
        "If open < n, we can append '(' and recurse with open + 1. If close < open, we can append ')' and recurse with close + 1. When the current string length reaches 2 * n, a valid well-formed combination has been completed."
],
      complexity: "O(4^n / sqrt(n)) time (proportional to the nth Catalan number); O(n) space for recursion stack.",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\n    vector<string> res;\n    void dfs(int open, int close, int n, string& cur) {\n        if ((int)cur.size() == 2 * n) {\n            res.push_back(cur);\n            return;\n        }\n        if (open < n) {\n            cur.push_back('(');\n            dfs(open + 1, close, n, cur);\n            cur.pop_back();\n        }\n        if (close < open) {\n            cur.push_back(')');\n            dfs(open, close + 1, n, cur);\n            cur.pop_back();\n        }\n    }\npublic:\n    vector<string> generateParenthesis(int n) {\n        res.clear();\n        string cur = \"\";\n        dfs(0, 0, n, cur);\n        return res;\n    }\n};\n",
    },
  },
  {
    id: "lc-128",
    source: "leetcode",
    title: "Longest Consecutive Sequence",
    statement: [
      "Given an unsorted array of integers nums, return the length of the longest consecutive elements sequence.",
      "You must write an algorithm that runs in O(n) time."
],
    constraints: [
      "0 <= nums.length <= 10^5",
      "-10^9 <= nums[i] <= 10^9"
],
    fn: {"name":"longestConsecutive","params":[{"name":"nums","type":"int[]"}],"returns":"int"},
    examples: [
      { input: [[100,4,200,1,3,2]], output: 4, explanation: "The longest consecutive sequence is [1, 2, 3, 4], which has length 4." },
      { input: [[0,3,7,2,5,8,4,6,0,1]], output: 9, explanation: "The sequence [0, 1, 2, 3, 4, 5, 6, 7, 8] has length 9." },
    ],
    tests: [
      { input: [[]], output: 0 },
      { input: [[7]], output: 1 },
      { input: [[1,2,0,1]], output: 3 },
      { input: [[-1,-2,-3,0,1]], output: 5 },
      { input: [[10,5,12,3,55,30,4,11,2]], output: 4 },
      { input: [[9,1,4,7,3,-1,0,5,8,-1,6]], output: 7 },
    ],
    hints: [
      "Inserting all elements into a hash set allows O(1) average-time lookups.",
      "To avoid duplicate work, only start counting a streak from a number x if x - 1 is not in the set.",
      "If x - 1 is absent, x is the beginning of a streak; check for x + 1, x + 2, and so on."
],
    solution: {
      idea: [
        "Insert all numbers into an unordered_set to achieve O(1) lookups and eliminate duplicates.",
        "Iterate over numbers in the set. If x - 1 is present in the set, skip x because it belongs to a sequence that was (or will be) counted starting from a smaller number. If x - 1 is not present, x is the start of a consecutive sequence; count how many subsequent numbers x + 1, x + 2, ... exist in the set."
],
      complexity: "O(n) time on average since each number is visited at most twice; O(n) space for the set.",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int longestConsecutive(vector<int>& nums) {\n        unordered_set<int> s(nums.begin(), nums.end());\n        int best = 0;\n        for (int x : s) {\n            if (!s.count(x - 1)) {\n                int len = 1;\n                while (s.count(x + len)) len++;\n                best = max(best, len);\n            }\n        }\n        return best;\n    }\n};\n",
    },
  },
  {
    id: "lc-139",
    source: "leetcode",
    title: "Word Break",
    statement: [
      "Given a string s and a dictionary of strings wordDict, return true if s can be segmented into a space-separated sequence of one or more dictionary words.",
      "Note that the same word in the dictionary may be reused multiple times in the segmentation."
],
    constraints: [
      "1 <= s.length <= 300",
      "1 <= wordDict.length <= 1000",
      "1 <= wordDict[i].length <= 20",
      "s and wordDict[i] consist of only lowercase English letters",
      "All the strings of wordDict are unique"
],
    fn: {"name":"wordBreak","params":[{"name":"s","type":"string"},{"name":"wordDict","type":"string[]"}],"returns":"bool"},
    examples: [
      { input: ["leetcode",["leet","code"]], output: true, explanation: "'leetcode' can be segmented into 'leet' and 'code'." },
      { input: ["applepenapple",["apple","pen"]], output: true, explanation: "'applepenapple' can be segmented into 'apple', 'pen', 'apple'." },
    ],
    tests: [
      { input: ["catsandog",["cats","dog","sand","and","cat"]], output: false },
      { input: ["a",["a"]], output: true },
      { input: ["a",["b"]], output: false },
      { input: ["bb",["a","b","bbb","bbbb"]], output: true },
      { input: ["cars",["car","ca","rs"]], output: true },
      { input: ["goalspecial",["go","goal","goals","special"]], output: true },
    ],
    hints: [
      "Define dp[i] as whether the prefix s[0..i - 1] can be segmented using dictionary words.",
      "Base case: dp[0] = true for an empty prefix.",
      "For each i from 1 to n, dp[i] is true if there exists some j < i such that dp[j] is true and the substring s[j..i - 1] exists in wordDict."
],
    solution: {
      idea: [
        "Store the words in an unordered_set for O(1) average lookup.",
        "Let dp[i] be true if s[0..i - 1] can be segmented into dictionary words. Initialize dp[0] = true. For each i from 1 to n, iterate over j from 0 to i - 1; if dp[j] is true and s[j..i - 1] is in the dictionary, mark dp[i] = true and break."
],
      complexity: "O(n^2 * k) time where k is max word length; O(n + total dictionary characters) space.",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool wordBreak(string s, vector<string>& wordDict) {\n        unordered_set<string> dict(wordDict.begin(), wordDict.end());\n        int n = s.size();\n        vector<bool> dp(n + 1, false);\n        dp[0] = true;\n\n        for (int i = 1; i <= n; i++) {\n            for (int j = 0; j < i; j++) {\n                if (dp[j] && dict.count(s.substr(j, i - j))) {\n                    dp[i] = true;\n                    break;\n                }\n            }\n        }\n        return dp[n];\n    }\n};\n",
    },
  },
  {
    id: "lc-329",
    source: "leetcode",
    title: "Longest Increasing Path in a Matrix",
    statement: [
      "Given an m x n integers matrix, return the length of the longest strictly increasing path in matrix.",
      "From each cell, you can either move in four directions: left, right, up, or down. You may not move diagonally or move outside the boundary."
],
    constraints: [
      "m == matrix.length",
      "n == matrix[i].length",
      "1 <= m, n <= 200",
      "0 <= matrix[i][j] <= 2^31 - 1"
],
    fn: {"name":"longestIncreasingPath","params":[{"name":"matrix","type":"int[][]"}],"returns":"int"},
    examples: [
      { input: [[[9,9,4],[6,6,8],[2,1,1]]], output: 4, explanation: "The longest increasing path is [1, 2, 6, 9] with length 4." },
      { input: [[[3,4,5],[3,2,6],[2,2,1]]], output: 4, explanation: "The longest increasing path is [3, 4, 5, 6] with length 4." },
    ],
    tests: [
      { input: [[[1]]], output: 1 },
      { input: [[[1,2],[2,3]]], output: 3 },
      { input: [[[7,8,9],[6,1,2],[5,4,3]]], output: 9 },
      { input: [[[1,2,3,4]]], output: 4 },
      { input: [[[5],[4],[3],[2],[1]]], output: 5 },
      { input: [[[0,1,2,3],[7,6,5,4]]], output: 8 },
    ],
    hints: [
      "Since the path must be strictly increasing, there can never be any cycles in the movement graph.",
      "This forms a Directed Acyclic Graph (DAG), meaning we can solve it using depth-first search with memoization.",
      "memo[r][c] caches the length of the longest increasing path starting at cell (r, c)."
],
    solution: {
      idea: [
        "Because path transitions must strictly increase in cell value, the grid forms a Directed Acyclic Graph (DAG) with no cycles.",
        "We apply depth-first search with memoization: dfs(r, c) computes and caches in memo[r][c] the length of the longest increasing path starting from (r, c). It explores the four neighboring cells that have values strictly greater than matrix[r][c]. The answer is the maximum over all starting cells."
],
      complexity: "O(m * n) time since each cell is computed once; O(m * n) space for the memoization table.",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\n    int m, n;\n    int memo[201][201];\n    int dr[4] = {1, -1, 0, 0};\n    int dc[4] = {0, 0, 1, -1};\n\n    int dfs(const vector<vector<int>>& mat, int r, int c) {\n        if (memo[r][c] != 0) return memo[r][c];\n        int best = 1;\n        for (int i = 0; i < 4; i++) {\n            int nr = r + dr[i], nc = c + dc[i];\n            if (nr >= 0 && nr < m && nc >= 0 && nc < n && mat[nr][nc] > mat[r][c]) {\n                best = max(best, 1 + dfs(mat, nr, nc));\n            }\n        }\n        return memo[r][c] = best;\n    }\npublic:\n    int longestIncreasingPath(vector<vector<int>>& matrix) {\n        if (matrix.empty() || matrix[0].empty()) return 0;\n        m = matrix.size();\n        n = matrix[0].size();\n        memset(memo, 0, sizeof(memo));\n        int ans = 0;\n        for (int r = 0; r < m; r++) {\n            for (int c = 0; c < n; c++) {\n                ans = max(ans, dfs(matrix, r, c));\n            }\n        }\n        return ans;\n    }\n};\n",
    },
  },
  {
    id: "lc-78",
    source: "leetcode",
    title: "Subsets",
    statement: [
      "Given an integer array nums of unique elements, return all possible subsets (the power set).",
      "The solution set must not contain duplicate subsets. Return the solution in any order."
],
    constraints: [
      "1 <= nums.length <= 10",
      "-10 <= nums[i] <= 10",
      "All the numbers of nums are unique"
],
    fn: {"name":"subsets","params":[{"name":"nums","type":"int[]"}],"returns":"int[][]"},
    examples: [
      { input: [[1,2,3]], output: [[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]], explanation: "All 8 subsets: [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]]." },
      { input: [[0]], output: [[],[0]], explanation: "The subsets of [0] are [[]] and [[0]]." },
    ],
    tests: [
      { input: [[]], output: [[]] },
      { input: [[1]], output: [[],[1]] },
      { input: [[1,2]], output: [[],[1],[2],[1,2]] },
      { input: [[-1,3]], output: [[],[-1],[3],[-1,3]] },
      { input: [[4,5,6,7]], output: [[],[4],[5],[4,5],[6],[4,6],[5,6],[4,5,6],[7],[4,7],[5,7],[4,5,7],[6,7],[4,6,7],[5,6,7],[4,5,6,7]] },
      { input: [[-10,0,10]], output: [[],[-10],[0],[-10,0],[10],[-10,10],[0,10],[-10,0,10]] },
    ],
    unordered: true,
    hints: [
      "For each element in nums, we have two choices: include it in the current subset or exclude it.",
      "You can generate all subsets using recursion / backtracking, or by iterating over all bitmasks from 0 to 2^n - 1.",
      "With a bitmask, the ith bit indicates whether nums[i] is part of the subset."
],
    solution: {
      idea: [
        "Iterate through all binary numbers from 0 to 2^n - 1.",
        "For each bitmask, create a subset containing the elements nums[i] where the ith bit is set. Since all elements in nums are unique, every generated subset is unique and all 2^n subsets are produced."
],
      complexity: "O(n * 2^n) time to construct all subsets; O(n * 2^n) space.",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<vector<int>> subsets(vector<int>& nums) {\n        int n = nums.size();\n        int total = 1 << n;\n        vector<vector<int>> res;\n        res.reserve(total);\n        for (int mask = 0; mask < total; mask++) {\n            vector<int> cur;\n            for (int i = 0; i < n; i++) {\n                if (mask & (1 << i)) cur.push_back(nums[i]);\n            }\n            res.push_back(cur);\n        }\n        return res;\n    }\n};\n",
    },
  },
  {
    id: "lc-46",
    source: "leetcode",
    title: "Permutations",
    statement: [
      "Given an array nums of distinct integers, return all the possible permutations.",
      "You can return the answer in any order."
],
    constraints: [
      "1 <= nums.length <= 6",
      "-10 <= nums[i] <= 10",
      "All the integers of nums are unique"
],
    fn: {"name":"permute","params":[{"name":"nums","type":"int[]"}],"returns":"int[][]"},
    examples: [
      { input: [[1,2,3]], output: [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,2,1],[3,1,2]], explanation: "All 6 permutations: [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]." },
      { input: [[0,1]], output: [[0,1],[1,0]], explanation: "Permutations: [[0, 1], [1, 0]]." },
    ],
    tests: [
      { input: [[1]], output: [[1]] },
      { input: [[-1,2]], output: [[-1,2],[2,-1]] },
      { input: [[1,2,3,4]], output: [[1,2,3,4],[1,2,4,3],[1,3,2,4],[1,3,4,2],[1,4,3,2],[1,4,2,3],[2,1,3,4],[2,1,4,3],[2,3,1,4],[2,3,4,1],[2,4,3,1],[2,4,1,3],[3,2,1,4],[3,2,4,1],[3,1,2,4],[3,1,4,2],[3,4,1,2],[3,4,2,1],[4,2,3,1],[4,2,1,3],[4,3,2,1],[4,3,1,2],[4,1,3,2],[4,1,2,3]] },
      { input: [[0,5,-5]], output: [[0,5,-5],[0,-5,5],[5,0,-5],[5,-5,0],[-5,5,0],[-5,0,5]] },
      { input: [[1,3,5,7]], output: [[1,3,5,7],[1,3,7,5],[1,5,3,7],[1,5,7,3],[1,7,5,3],[1,7,3,5],[3,1,5,7],[3,1,7,5],[3,5,1,7],[3,5,7,1],[3,7,5,1],[3,7,1,5],[5,3,1,7],[5,3,7,1],[5,1,3,7],[5,1,7,3],[5,7,1,3],[5,7,3,1],[7,3,5,1],[7,3,1,5],[7,5,3,1],[7,5,1,3],[7,1,5,3],[7,1,3,5]] },
      { input: [[2,4,6]], output: [[2,4,6],[2,6,4],[4,2,6],[4,6,2],[6,4,2],[6,2,4]] },
    ],
    unordered: true,
    hints: [
      "Use backtracking: place each available number in the first position, then permute the remaining numbers.",
      "An in-place approach swaps the current element with each subsequent element, recurses, and then swaps back.",
      "When the recursion reaches the end of the array, add the current permutation to the result."
],
    solution: {
      idea: [
        "Use recursive backtracking with element swapping.",
        "A helper function backtrack(index) fixes the element at index by swapping nums[index] with nums[i] for each i from index to n - 1, recursing to index + 1, and swapping back to restore order. When index reaches n, nums is recorded as a complete permutation."
],
      complexity: "O(n * n!) time to generate all n! permutations; O(n) recursion stack space.",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\n    vector<vector<int>> res;\n    void backtrack(vector<int>& nums, int idx) {\n        if (idx == (int)nums.size()) {\n            res.push_back(nums);\n            return;\n        }\n        for (int i = idx; i < (int)nums.size(); i++) {\n            swap(nums[idx], nums[i]);\n            backtrack(nums, idx + 1);\n            swap(nums[idx], nums[i]);\n        }\n    }\npublic:\n    vector<vector<int>> permute(vector<int>& nums) {\n        res.clear();\n        backtrack(nums, 0);\n        return res;\n    }\n};\n",
    },
  },
];
