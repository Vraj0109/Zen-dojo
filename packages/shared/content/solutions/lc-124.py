# verify: skip-stress
from typing import Optional

class Solution:
    def maxPathSum(self, root: Optional[TreeNode]) -> int:
        best = -float('inf')
        def gain(n):
            nonlocal best
            if not n:
                return 0
            l = max(0, gain(n.left))
            r = max(0, gain(n.right))
            best = max(best, n.val + l + r)
            return n.val + max(l, r)
        gain(root)
        return best