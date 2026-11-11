class Solution:
    def levelOrder(self, root: Optional[TreeNode]) -> List[List[int]]:
        out: List[List[int]] = []
        if not root:
            return out
        q = collections.deque([root])
        while q:
            n = len(q)
            level: List[int] = []
            for _ in range(n):
                x = q.popleft()
                level.append(x.val)
                if x.left:
                    q.append(x.left)
                if x.right:
                    q.append(x.right)
            out.append(level)
        return out
