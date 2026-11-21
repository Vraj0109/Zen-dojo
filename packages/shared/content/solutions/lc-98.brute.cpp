#include <vector>

class Solution {
    void inorder(TreeNode* root, std::vector<int>& vals) {
        if (!root) return;
        inorder(root->left, vals);
        vals.push_back(root->val);
        inorder(root->right, vals);
    }
public:
    bool isValidBST(TreeNode* root) {
        std::vector<int> vals;
        inorder(root, vals);
        for (size_t i = 1; i < vals.size(); i++) {
            if (vals[i] <= vals[i - 1]) return false;
        }
        return true;
    }
};
