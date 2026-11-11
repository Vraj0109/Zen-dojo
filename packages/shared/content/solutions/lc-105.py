class Solution:
    def buildTree(self, preorder: List[int], inorder: List[int]) -> Optional[TreeNode]:
        pos = {v: i for i, v in enumerate(inorder)}
        self.idx = 0
        def build(lo: int, hi: int) -> Optional[TreeNode]:
            if lo > hi:
                return None
            v = preorder[self.idx]
            self.idx += 1
            node = TreeNode(v)
            mid = pos[v]
            node.left = build(lo, mid - 1)
            node.right = build(mid + 1, hi)
            return node
        return build(0, len(inorder) - 1)
