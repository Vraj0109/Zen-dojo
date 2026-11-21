#include <algorithm>

class Solution {
public:
    int rob(TreeNode* root) {
        if (!root) return 0;
        int rob_root = root->val;
        if (root->left) {
            rob_root += rob(root->left->left) + rob(root->left->right);
        }
        if (root->right) {
            rob_root += rob(root->right->left) + rob(root->right->right);
        }
        int skip_root = rob(root->left) + rob(root->right);
        return std::max(rob_root, skip_root);
    }
};
