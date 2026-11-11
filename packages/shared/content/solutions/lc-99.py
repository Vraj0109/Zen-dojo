# verify: skip-stress
from typing import Optional

class Solution:
    def recoverTree(self, root: Optional[TreeNode]) -> Optional[TreeNode]:
        prev = first = second = None
        def walk(n):
            nonlocal prev, first, second
            if not n:
                return
            walk(n.left)
            if prev and prev.val > n.val:
                if not first:
                    first = prev
                second = n
            prev = n
            walk(n.right)
        walk(root)
        if first and second:
            first.val, second.val = second.val, first.val
        return root