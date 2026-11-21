from typing import Optional, List
from collections import deque

class Solution:
    def rightSideView(self, root: Optional[TreeNode]) -> List[int]:
        if not root:
            return []
        levels = []
        q = deque([root])
        while q:
            sz = len(q)
            lvl = []
            for _ in range(sz):
                node = q.popleft()
                lvl.append(node.val)
                if node.left:
                    q.append(node.left)
                if node.right:
                    q.append(node.right)
            levels.append(lvl)
        return [lvl[-1] for lvl in levels]
