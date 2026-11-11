# verify: skip-stress
from typing import List
from collections import deque

class Solution:
    def shortestPathLength(self, graph: List[List[int]]) -> int:
        n = len(graph)
        full = (1 << n) - 1
        dist = [[-1] * (1 << n) for _ in range(n)]
        q = deque()
        for i in range(n):
            dist[i][1 << i] = 0
            q.append((i, 1 << i))
        while q:
            u, mask = q.popleft()
            if mask == full:
                return dist[u][mask]
            for v in graph[u]:
                nm = mask | (1 << v)
                if dist[v][nm] == -1:
                    dist[v][nm] = dist[u][mask] + 1
                    q.append((v, nm))
        return 0