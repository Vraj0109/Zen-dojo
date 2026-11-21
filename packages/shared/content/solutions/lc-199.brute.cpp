#include <vector>
#include <queue>

class Solution {
public:
    std::vector<int> rightSideView(TreeNode* root) {
        if (!root) return {};
        std::vector<std::vector<int>> levels;
        std::queue<TreeNode*> q;
        q.push(root);
        while (!q.empty()) {
            int sz = q.size();
            std::vector<int> lvl;
            for (int i = 0; i < sz; i++) {
                TreeNode* node = q.front();
                q.pop();
                lvl.push_back(node->val);
                if (node->left) q.push(node->left);
                if (node->right) q.push(node->right);
            }
            levels.push_back(lvl);
        }
        std::vector<int> res;
        for (const auto& lvl : levels) {
            res.push_back(lvl.back());
        }
        return res;
    }
};
