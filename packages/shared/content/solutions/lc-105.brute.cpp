#include <vector>

class Solution {
    TreeNode* build(std::vector<int>& preorder, int preStart, int preEnd,
                    std::vector<int>& inorder, int inStart, int inEnd) {
        if (preStart > preEnd || inStart > inEnd) return nullptr;
        int rootVal = preorder[preStart];
        TreeNode* root = new TreeNode(rootVal);
        int mid = inStart;
        while (mid <= inEnd && inorder[mid] != rootVal) {
            mid++;
        }
        int leftSize = mid - inStart;
        root->left = build(preorder, preStart + 1, preStart + leftSize, inorder, inStart, mid - 1);
        root->right = build(preorder, preStart + leftSize + 1, preEnd, inorder, mid + 1, inEnd);
        return root;
    }
public:
    TreeNode* buildTree(std::vector<int>& preorder, std::vector<int>& inorder) {
        return build(preorder, 0, preorder.size() - 1, inorder, 0, inorder.size() - 1);
    }
};
