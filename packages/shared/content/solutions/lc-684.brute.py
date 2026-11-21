from collections import defaultdict

class Solution:
    def findRedundantConnection(self, edges: list[list[int]]) -> list[int]:
        n = len(edges)
        adj = defaultdict(list)

        def dfs(src: int, target: int, visited: set) -> bool:
            if src == target:
                return True
            visited.add(src)
            for nxt in adj[src]:
                if nxt not in visited:
                    if dfs(nxt, target, visited):
                        return True
            return False

        for u, v in edges:
            if dfs(u, v, set()):
                return [u, v]
            adj[u].append(v)
            adj[v].append(u)
        return []
