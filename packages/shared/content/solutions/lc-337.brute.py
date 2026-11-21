from typing import Optional

class Solution:
    def rob(self, root: Optional[TreeNode]) -> int:
        if not root:
            return 0
        rob_root = root.val
        if root.left:
            rob_root += self.rob(root.left.left) + self.rob(root.left.right)
        if root.right:
            rob_root += self.rob(root.right.left) + self.rob(root.right.right)
        skip_root = self.rob(root.left) + self.rob(root.right)
        return max(rob_root, skip_root)
