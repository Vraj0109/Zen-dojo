class Solution:
    def isValidBST(self, root: Optional[TreeNode]) -> bool:
        def ok(n: Optional[TreeNode], low: float, high: float) -> bool:
            if not n:
                return True
            if n.val <= low or n.val >= high:
                return False
            return ok(n.left, low, n.val) and ok(n.right, n.val, high)
        return ok(root, float('-inf'), float('inf'))
