# verify: skip-stress
from typing import List

class Solution:
    def treeMatching(self, n: int, edges: List[List[int]]) -> int:
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
        used = [False] * (n + 1)
        ans = 0
        for i in range(n - 1, 0, -1):
            v = order[i]
            p = par[v]
            if not used[v] and not used[p]:
                used[v] = True
                used[p] = True
                ans += 1
        return ans
