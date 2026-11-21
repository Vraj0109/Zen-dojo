#include <vector>

using namespace std;

class BSTIterator {
    vector<int> vals;
    int idx = 0;

    void inorder(TreeNode* node) {
        if (!node) return;
        inorder(node->left);
        vals.push_back(node->val);
        inorder(node->right);
    }

public:
    BSTIterator(TreeNode* root) {
        inorder(root);
    }

    int next() {
        return vals[idx++];
    }

    bool hasNext() {
        return idx < (int)vals.size();
    }
};
