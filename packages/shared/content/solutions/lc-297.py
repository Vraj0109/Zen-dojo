from typing import Optional

class Codec:
    def serialize(self, root: Optional[TreeNode]) -> str:
        res = []
        def dfs(node: Optional[TreeNode]) -> None:
            if not node:
                res.append("#")
                return
            res.append(str(node.val))
            dfs(node.left)
            dfs(node.right)
        dfs(root)
        return ",".join(res)

    def deserialize(self, data: str) -> Optional[TreeNode]:
        tokens = data.split(",")
        ptr = 0
        def decode() -> Optional[TreeNode]:
            nonlocal ptr
            if ptr >= len(tokens):
                return None
            val = tokens[ptr]
            ptr += 1
            if val == "#":
                return None
            node = TreeNode(int(val))
            node.left = decode()
            node.right = decode()
            return node
        return decode()
