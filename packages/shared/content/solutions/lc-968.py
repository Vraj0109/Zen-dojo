# verify: skip-stress
from typing import Optional

class Solution:
    def minCameraCover(self, root: Optional[TreeNode]) -> int:
        cameras = 0
        def go(n):
            nonlocal cameras
            if not n:
                return 2
            l, r = go(n.left), go(n.right)
            if l == 0 or r == 0:
                cameras += 1
                return 1
            if l == 1 or r == 1:
                return 2
            return 0
        if go(root) == 0:
            cameras += 1
        return cameras