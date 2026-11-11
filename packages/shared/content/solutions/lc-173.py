from typing import Optional

class BSTIterator:
    def __init__(self, root: Optional[TreeNode]):
        self.st = []
        self._push_left(root)

    def _push_left(self, node: Optional[TreeNode]) -> None:
        while node:
            self.st.append(node)
            node = node.left

    def next(self) -> int:
        curr = self.st.pop()
        self._push_left(curr.right)
        return curr.val

    def hasNext(self) -> bool:
        return len(self.st) > 0
