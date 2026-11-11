from typing import List
from collections import deque

class Solution:
    def gameRoutes(self, n: int, teleporters: List[List[int]]) -> int:
        MOD = 1000000007
        adj = [[] for _ in range(n + 1)]
        indeg = [0] * (n + 1)
        for u, v in teleporters:
            adj[u].append(v)
            indeg[v] += 1
        q = deque([i for i in range(1, n + 1) if indeg[i] == 0])
        ways = [0] * (n + 1)
        ways[1] = 1
        while q:
            u = q.popleft()
            for v in adj[u]:
                ways[v] = (ways[v] + ways[u]) % MOD
                indeg[v] -= 1
                if indeg[v] == 0:
                    q.append(v)
        return ways[n]
