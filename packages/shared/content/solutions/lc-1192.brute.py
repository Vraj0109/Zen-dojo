class Solution:
    def criticalConnections(self, n: int, connections: list[list[int]]) -> list[list[int]]:
        m = len(connections)
        g = [[] for _ in range(n)]
        for i, (u, v) in enumerate(connections):
            g[u].append((v, i))
            g[v].append((u, i))

        def dfs(u: int, skipped_edge: int, visited: list[bool]) -> None:
            visited[u] = True
            for v, edge_id in g[u]:
                if edge_id != skipped_edge and not visited[v]:
                    dfs(v, skipped_edge, visited)

        bridges = []
        for i in range(m):
            visited = [False] * n
            dfs(0, i, visited)
            if not all(visited):
                bridges.append(connections[i])

        return bridges
