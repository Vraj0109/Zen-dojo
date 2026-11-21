#include <vector>

using namespace std;

class Solution {
    bool findPath(TreeNode* root, int target, vector<int>& path) {
        if (!root) return false;
        path.push_back(root->val);
        if (root->val == target) return true;
        if (findPath(root->left, target, path) || findPath(root->right, target, path)) {
            return true;
        }
        path.pop_back();
        return false;
    }
public:
    int lowestCommonAncestor(TreeNode* root, int p, int q) {
        vector<int> pathP, pathQ;
        findPath(root, p, pathP);
        findPath(root, q, pathQ);
        int lca = root->val;
        for (size_t i = 0; i < pathP.size() && i < pathQ.size(); i++) {
            if (pathP[i] == pathQ[i]) lca = pathP[i];
            else break;
        }
        return lca;
    }
};
