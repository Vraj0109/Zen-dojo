#include <vector>
#include <algorithm>

class Solution {
    void collect(TreeNode* root, std::vector<int>& vals) {
        if (!root) return;
        vals.push_back(root->val);
        collect(root->left, vals);
        collect(root->right, vals);
    }
public:
    int kthSmallest(TreeNode* root, int k) {
        std::vector<int> vals;
        collect(root, vals);
        std::sort(vals.begin(), vals.end());
        return vals[k - 1];
    }
};
