class Solution:
    def rightSideView(self, root: Optional[TreeNode]) -> List[int]:
        out: List[int] = []
        if not root:
            return out
        q = collections.deque([root])
        while q:
            n = len(q)
            for i in range(n):
                x = q.popleft()
                if i == n - 1:
                    out.append(x.val)
                if x.left:
                    q.append(x.left)
                if x.right:
                    q.append(x.right)
        return out
