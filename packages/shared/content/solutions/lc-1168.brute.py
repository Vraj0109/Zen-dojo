from typing import List

class Solution:
    def minCostToSupplyWater(self, n: int, wells: List[int], pipes: List[List[int]]) -> int:
        adj = [[] for _ in range(n + 1)]
        for i in range(1, n + 1):
            adj[0].append((i, wells[i - 1]))
            adj[i].append((0, wells[i - 1]))
        for u, v, w in pipes:
            adj[u].append((v, w))
            adj[v].append((u, w))

        visited = [False] * (n + 1)
        min_edge = [float('inf')] * (n + 1)
        min_edge[0] = 0
        total_cost = 0

        for _ in range(n + 1):
            u = -1
            for i in range(n + 1):
                if not visited[i] and (u == -1 or min_edge[i] < min_edge[u]):
                    u = i
            visited[u] = True
            total_cost += min_edge[u]

            for v, w in adj[u]:
                if not visited[v] and w < min_edge[v]:
                    min_edge[v] = w

        return int(total_cost)
