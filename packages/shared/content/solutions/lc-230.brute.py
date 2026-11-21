from typing import Optional

class Solution:
    def kthSmallest(self, root: Optional[TreeNode], k: int) -> int:
        vals = []
        def collect(node):
            if not node:
                return
            vals.append(node.val)
            collect(node.left)
            collect(node.right)
        collect(root)
        vals.sort()
        return vals[k - 1]
