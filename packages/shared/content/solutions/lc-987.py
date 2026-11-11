# verify: skip-stress
from typing import List, Optional

class Solution:
    def verticalTraversal(self, root: Optional[TreeNode]) -> List[List[int]]:
        items = []
        def dfs(n, row, col):
            if not n:
                return
            items.append((col, row, n.val))
            dfs(n.left, row + 1, col - 1)
            dfs(n.right, row + 1, col + 1)
        dfs(root, 0, 0)
        items.sort()
        out = []
        prev = float('-inf')
        for c, r, v in items:
            if c != prev:
                out.append([])
                prev = c
            out[-1].append(v)
        return out