class Solution:
    def rob(self, root: Optional[TreeNode]) -> int:
        def go(n: Optional[TreeNode]) -> tuple:
            if not n:
                return (0, 0)
            l = go(n.left)
            r = go(n.right)
            robbed = n.val + l[1] + r[1]
            skipped = max(l[0], l[1]) + max(r[0], r[1])
            return (robbed, skipped)
        p = go(root)
        return max(p[0], p[1])
