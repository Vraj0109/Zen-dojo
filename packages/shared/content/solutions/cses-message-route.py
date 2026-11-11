from typing import List
from collections import deque

class Solution:
    def messageRoute(self, n: int, connections: List[List[int]]) -> int:
        adj = [[] for _ in range(n + 1)]
        for u, v in connections:
            adj[u].append(v)
            adj[v].append(u)
        dist = [-1] * (n + 1)
        dist[1] = 0
        q = deque([1])
        while q:
            u = q.popleft()
            if u == n:
                return dist[u] + 1
            for v in adj[u]:
                if dist[v] == -1:
                    dist[v] = dist[u] + 1
                    q.append(v)
        return -1
