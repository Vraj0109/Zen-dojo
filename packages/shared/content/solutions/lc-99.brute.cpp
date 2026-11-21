#include <vector>
#include <algorithm>

using namespace std;

class Solution {
    void inorder(TreeNode* node, vector<TreeNode*>& nodes, vector<int>& vals) {
        if (!node) return;
        inorder(node->left, nodes, vals);
        nodes.push_back(node);
        vals.push_back(node->val);
        inorder(node->right, nodes, vals);
    }
public:
    TreeNode* recoverTree(TreeNode* root) {
        vector<TreeNode*> nodes;
        vector<int> vals;
        inorder(root, nodes, vals);
        sort(vals.begin(), vals.end());
        for (size_t i = 0; i < nodes.size(); i++) {
            nodes[i]->val = vals[i];
        }
        return root;
    }
};
