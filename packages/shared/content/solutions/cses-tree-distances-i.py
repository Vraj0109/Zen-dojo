# verify: skip-stress
from typing import List

class Solution:
    def treeDistancesI(self, n: int, edges: List[List[int]]) -> List[int]:
        adj = [[] for _ in range(n + 1)]
        for u, v in edges:
            adj[u].append(v)
            adj[v].append(u)

        def dist(s: int) -> List[int]:
            d = [-1] * (n + 1)
            d[s] = 0
            q = [s]
            for u in q:
                for v in adj[u]:
                    if d[v] < 0:
                        d[v] = d[u] + 1
                        q.append(v)
            return d

        d1 = dist(1)
        a = 1
        for v in range(1, n + 1):
            if d1[v] > d1[a]:
                a = v
        da = dist(a)
        b = a
        for v in range(1, n + 1):
            if da[v] > da[b]:
                b = v
        db = dist(b)
        return [da[v] if da[v] > db[v] else db[v] for v in range(1, n + 1)]
