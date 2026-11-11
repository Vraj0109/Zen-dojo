class Solution:
    def diameterOfBinaryTree(self, root: Optional[TreeNode]) -> int:
        self.best = 0
        def height(n: Optional[TreeNode]) -> int:
            if not n:
                return 0
            l = height(n.left)
            r = height(n.right)
            self.best = max(self.best, l + r)
            return 1 + max(l, r)
        height(root)
        return self.best
