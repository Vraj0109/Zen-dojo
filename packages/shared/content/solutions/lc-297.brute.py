from collections import deque
from typing import Optional

class Codec:
    def serialize(self, root: Optional[TreeNode]) -> str:
        if not root:
            return ""
        res = []
        q = deque([root])
        while q:
            cur = q.popleft()
            if not cur:
                res.append("#")
            else:
                res.append(str(cur.val))
                q.append(cur.left)
                q.append(cur.right)
        return ",".join(res)

    def deserialize(self, data: str) -> Optional[TreeNode]:
        if not data:
            return None
        tokens = data.split(",")
        if not tokens or tokens[0] == "#" or not tokens[0]:
            return None
        root = TreeNode(int(tokens[0]))
        q = deque([root])
        idx = 1
        while q and idx < len(tokens):
            cur = q.popleft()
            if idx < len(tokens) and tokens[idx] != "#":
                cur.left = TreeNode(int(tokens[idx]))
                q.append(cur.left)
            idx += 1
            if idx < len(tokens) and tokens[idx] != "#":
                cur.right = TreeNode(int(tokens[idx]))
                q.append(cur.right)
            idx += 1
        return root
