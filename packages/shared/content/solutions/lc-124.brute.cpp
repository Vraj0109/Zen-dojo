#include <algorithm>
#include <climits>

using namespace std;

class Solution {
    int maxArm(TreeNode* node) {
        if (!node) return 0;
        int l = max(0, maxArm(node->left));
        int r = max(0, maxArm(node->right));
        return node->val + max(l, r);
    }

    void dfsAll(TreeNode* node, int& best) {
        if (!node) return;
        int l = max(0, maxArm(node->left));
        int r = max(0, maxArm(node->right));
        best = max(best, node->val + l + r);
        dfsAll(node->left, best);
        dfsAll(node->right, best);
    }
public:
    int maxPathSum(TreeNode* root) {
        int best = INT_MIN;
        dfsAll(root, best);
        return best;
    }
};
