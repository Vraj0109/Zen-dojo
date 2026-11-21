class BSTIterator:
    def __init__(self, root: TreeNode):
        self.vals = []
        self.idx = 0
        def inorder(node: TreeNode):
            if not node:
                return
            inorder(node.left)
            self.vals.append(node.val)
            inorder(node.right)
        inorder(root)

    def next(self) -> int:
        res = self.vals[self.idx]
        self.idx += 1
        return res

    def hasNext(self) -> bool:
        return self.idx < len(self.vals)
