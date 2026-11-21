class Solution:
    def lowestCommonAncestor(self, root: object, p: int, q: int) -> int:
        path_p = []
        path_q = []

        def find_path(node: object, target: int, path: list) -> bool:
            if not node:
                return False
            path.append(node.val)
            if node.val == target:
                return True
            if find_path(node.left, target, path) or find_path(node.right, target, path):
                return True
            path.pop()
            return False

        find_path(root, p, path_p)
        find_path(root, q, path_q)
        lca = root.val
        for u, v in zip(path_p, path_q):
            if u == v:
                lca = u
            else:
                break
        return lca
