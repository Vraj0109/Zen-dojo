class Solution:
    def recoverTree(self, root: object) -> object:
        nodes = []
        vals = []

        def inorder(node: object) -> None:
            if not node:
                return
            inorder(node.left)
            nodes.append(node)
            vals.append(node.val)
            inorder(node.right)

        inorder(root)
        vals.sort()
        for node, val in zip(nodes, vals):
            node.val = val
        return root
