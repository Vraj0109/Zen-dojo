#include <vector>
#include <map>
#include <algorithm>

using namespace std;

class Solution {
    void dfs(TreeNode* node, int r, int c, map<int, map<int, vector<int>>>& grid) {
        if (!node) return;
        grid[c][r].push_back(node->val);
        dfs(node->left, r + 1, c - 1, grid);
        dfs(node->right, r + 1, c + 1, grid);
    }
public:
    vector<vector<int>> verticalTraversal(TreeNode* root) {
        map<int, map<int, vector<int>>> grid;
        dfs(root, 0, 0, grid);
        vector<vector<int>> res;
        for (auto& colPair : grid) {
            vector<int> colVals;
            for (auto& rowPair : colPair.second) {
                sort(rowPair.second.begin(), rowPair.second.end());
                for (int v : rowPair.second) colVals.push_back(v);
            }
            res.push_back(colVals);
        }
        return res;
    }
};
