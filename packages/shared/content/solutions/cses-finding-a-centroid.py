# verify: skip-stress
from typing import List

class Solution:
    def findingACentroid(self, n: int, edges: List[List[int]]) -> int:
        adj = [[] for _ in range(n + 1)]
        for u, v in edges:
            adj[u].append(v)
            adj[v].append(u)
        par = [0] * (n + 1)
        order = [1]
        for u in order:
            for v in adj[u]:
                if v == par[u]:
                    continue
                par[v] = u
                order.append(v)
        sz = [1] * (n + 1)
        big = [0] * (n + 1)
        for i in range(n - 1, 0, -1):
            v = order[i]
            p = par[v]
            sz[p] += sz[v]
            if sz[v] > big[p]:
                big[p] = sz[v]
        limit = n // 2
        for v in range(1, n + 1):
            rem = n - sz[v]
            mx = big[v] if big[v] > rem else rem
            if mx <= limit:
                return v
        return -1
