# verify: skip-stress
from typing import List

class Solution:
    def companyQueriesII(self, n: int, bosses: List[int], queries: List[List[int]]) -> List[int]:
        adj = [[] for _ in range(n + 1)]
        for i in range(n - 1):
            b = bosses[i]
            c = i + 2
            adj[b].append(c)
            adj[c].append(b)
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

        ans = []
        for a, b in queries:
            if dep[a] < dep[b]:
                a, b = b, a
            diff = dep[a] - dep[b]
            for j in range(LOG):
                if (diff >> j) & 1:
                    a = up[j][a]
            if a == b:
                ans.append(a)
                continue
            for j in range(LOG - 1, -1, -1):
                if up[j][a] != up[j][b]:
                    a = up[j][a]
                    b = up[j][b]
            ans.append(up[0][a])
        return ans
