from typing import List, Optional

class Solution:
    def buildTree(self, preorder: List[int], inorder: List[int]) -> Optional[TreeNode]:
        if not preorder or not inorder:
            return None
        root_val = preorder[0]
        root = TreeNode(root_val)
        mid = inorder.index(root_val)
        root.left = self.buildTree(preorder[1 : 1 + mid], inorder[:mid])
        root.right = self.buildTree(preorder[1 + mid :], inorder[mid + 1 :])
        return root
