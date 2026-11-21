#include <vector>
#include <algorithm>

class Solution {
    int getHeight(TreeNode* root) {
        if (!root) return 0;
        return 1 + std::max(getHeight(root->left), getHeight(root->right));
    }

    void collectLevel(TreeNode* root, int d, std::vector<int>& level) {
        if (!root) return;
        if (d == 0) {
            level.push_back(root->val);
            return;
        }
        collectLevel(root->left, d - 1, level);
        collectLevel(root->right, d - 1, level);
    }
public:
    std::vector<std::vector<int>> levelOrder(TreeNode* root) {
        std::vector<std::vector<int>> res;
        int h = getHeight(root);
        for (int d = 0; d < h; d++) {
            std::vector<int> level;
            collectLevel(root, d, level);
            res.push_back(level);
        }
        return res;
    }
};
