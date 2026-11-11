# verify: skip-stress
from typing import List

class Solution:
    def countingPaths(self, n: int, edges: List[List[int]], paths: List[List[int]]) -> List[int]:
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
        LOG = 1
        while (1 << LOG) <= n:
            LOG += 1
        up = [[0] * (n + 1) for _ in range(LOG)]
        for v in range(1, n + 1):
            up[0][v] = par[v]
        for j in range(1, LOG):
            uj1 = up[j - 1]
            uj = up[j]
            for v in range(1, n + 1):
                uj[v] = uj1[uj1[v]]

        mark = [0] * (n + 1)
        for orig_u, orig_v in paths:
            a, b = orig_u, orig_v
            if dep[a] < dep[b]:
                a, b = b, a
            diff = dep[a] - dep[b]
            for j in range(LOG):
                if (diff >> j) & 1:
                    a = up[j][a]
            if a == b:
                lca = a
            else:
                for j in range(LOG - 1, -1, -1):
                    if up[j][a] != up[j][b]:
                        a = up[j][a]
                        b = up[j][b]
                lca = up[0][a]
            mark[orig_u] += 1
            mark[orig_v] += 1
            mark[lca] -= 1
            if par[lca] != 0:
                mark[par[lca]] -= 1

        for i in range(n - 1, 0, -1):
            mark[par[order[i]]] += mark[order[i]]
        return mark[1:]
