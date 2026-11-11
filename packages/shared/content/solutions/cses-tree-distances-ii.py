# verify: skip-stress
from typing import List

class Solution:
    def treeDistancesII(self, n: int, edges: List[List[int]]) -> List[int]:
        adj = [[] for _ in range(n + 1)]
        for u, v in edges:
            adj[u].append(v)
            adj[v].append(u)
        par = [0] * (n + 1)
        dep = [0] * (n + 1)
        order = [1]
        for u in order:
            for v in adj[u]:
                if v == par[u]:
                    continue
                par[v] = u
                dep[v] = dep[u] + 1
                order.append(v)
        sz = [1] * (n + 1)
        for i in range(n - 1, 0, -1):
            sz[par[order[i]]] += sz[order[i]]
        ans = [0] * (n + 1)
        ans[1] = sum(dep[1:])
        for i in range(1, n):
            c = order[i]
            ans[c] = ans[par[c]] + n - 2 * sz[c]
        return ans[1:]
