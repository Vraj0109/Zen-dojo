#include <algorithm>

class Solution {
    int depth(TreeNode* root) {
        if (!root) return 0;
        return 1 + std::max(depth(root->left), depth(root->right));
    }
public:
    int diameterOfBinaryTree(TreeNode* root) {
        if (!root) return 0;
        int through_root = depth(root->left) + depth(root->right);
        int left_dia = diameterOfBinaryTree(root->left);
        int right_dia = diameterOfBinaryTree(root->right);
        return std::max(through_root, std::max(left_dia, right_dia));
    }
};
