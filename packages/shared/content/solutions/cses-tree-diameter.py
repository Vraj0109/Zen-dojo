from typing import List
from collections import deque

class Solution:
    def treeDiameter(self, n: int, edges: List[List[int]]) -> int:
        if n <= 1:
            return 0
        adj = [[] for _ in range(n + 1)]
        for u, v in edges:
            adj[u].append(v)
            adj[v].append(u)

        def bfs(start: int):
            dist = [-1] * (n + 1)
            dist[start] = 0
            q = deque([start])
            farthest = start
            while q:
                u = q.popleft()
                if dist[u] > dist[farthest]:
                    farthest = u
                for v in adj[u]:
                    if dist[v] == -1:
                        dist[v] = dist[u] + 1
                        q.append(v)
            return farthest, dist[farthest]

        p1, _ = bfs(1)
        _, d = bfs(p1)
        return d
