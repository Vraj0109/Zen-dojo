class Solution:
    def maxPathSum(self, root: object) -> int:
        def max_arm(node: object) -> int:
            if not node:
                return 0
            l = max(0, max_arm(node.left))
            r = max(0, max_arm(node.right))
            return node.val + max(l, r)

        best = float("-inf")

        def dfs_all(node: object) -> None:
            nonlocal best
            if not node:
                return
            l = max(0, max_arm(node.left))
            r = max(0, max_arm(node.right))
            if node.val + l + r > best:
                best = node.val + l + r
            dfs_all(node.left)
            dfs_all(node.right)

        dfs_all(root)
        return int(best)
