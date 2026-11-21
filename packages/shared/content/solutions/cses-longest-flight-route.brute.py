from typing import List
from collections import deque

class Solution:
    def longestFlightRoute(self, n: int, flights: List[List[int]]) -> int:
        adj = [[] for _ in range(n + 1)]
        indeg = [0] * (n + 1)
        for u, v in flights:
            adj[u].append(v)
            indeg[v] += 1
        q = deque([i for i in range(1, n + 1) if indeg[i] == 0])
        topo = []
        while q:
            u = q.popleft()
            topo.append(u)
            for v in adj[u]:
                indeg[v] -= 1
                if indeg[v] == 0:
                    q.append(v)
        dp = [-1] * (n + 1)
        dp[1] = 1
        for u in topo:
            if dp[u] == -1:
                continue
            for v in adj[u]:
                if dp[u] + 1 > dp[v]:
                    dp[v] = dp[u] + 1
        return dp[n]
