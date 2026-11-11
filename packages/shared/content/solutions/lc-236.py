# verify: skip-stress
from typing import Optional

class Solution:
    def lowestCommonAncestor(self, root: Optional[TreeNode], p: int, q: int) -> int:
        def go(node):
            if not node:
                return None
            if node.val == p or node.val == q:
                return node
            l = go(node.left)
            r = go(node.right)
            if l and r:
                return node
            return l if l else r
        return go(root).val