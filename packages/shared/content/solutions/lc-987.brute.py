from collections import defaultdict

class Solution:
    def verticalTraversal(self, root: object) -> list[list[int]]:
        grid = defaultdict(lambda: defaultdict(list))

        def dfs(node: object, r: int, c: int) -> None:
            if not node:
                return
            grid[c][r].append(node.val)
            dfs(node.left, r + 1, c - 1)
            dfs(node.right, r + 1, c + 1)

        dfs(root, 0, 0)
        res = []
        for c in sorted(grid.keys()):
            col_vals = []
            for r in sorted(grid[c].keys()):
                col_vals.extend(sorted(grid[c][r]))
            res.append(col_vals)
        return res
