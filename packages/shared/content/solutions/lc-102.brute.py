from typing import Optional, List

class Solution:
    def levelOrder(self, root: Optional[TreeNode]) -> List[List[int]]:
        def get_height(node):
            if not node:
                return 0
            return 1 + max(get_height(node.left), get_height(node.right))

        def collect(node, d, level):
            if not node:
                return
            if d == 0:
                level.append(node.val)
                return
            collect(node.left, d - 1, level)
            collect(node.right, d - 1, level)

        res = []
        h = get_height(root)
        for d in range(h):
            level = []
            collect(root, d, level)
            res.append(level)
        return res
