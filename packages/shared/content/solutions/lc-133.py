from typing import Optional

class Solution:
    def cloneGraph(self, node: Optional['Node']) -> Optional['Node']:
        if not node:
            return None
        copies = {}

        def dfs(n: 'Node') -> 'Node':
            if n in copies:
                return copies[n]
            copy = Node(n.val)
            copies[n] = copy
            for neighbor in n.neighbors:
                copy.neighbors.append(dfs(neighbor))
            return copy

        return dfs(node)
