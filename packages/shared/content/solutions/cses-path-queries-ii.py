# verify: skip-stress
from typing import List

class Solution:
    def pathQueriesII(self, values: List[int], edges: List[List[int]], queries: List[List[int]]) -> List[int]:
        n = len(values)
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
        heavy = [0] * (n + 1)
        for i in range(n - 1, 0, -1):
            sz[par[order[i]]] += sz[order[i]]
        for i in range(n - 1, 0, -1):
            v = order[i]
            p = par[v]
            if heavy[p] == 0 or sz[v] > sz[heavy[p]]:
                heavy[p] = v

        head = [0] * (n + 1)
        pos = [0] * (n + 1)
        cnt = 0
        for u in order:
            if u == 1 or heavy[par[u]] != u:
                v = u
                while v != 0:
                    head[v] = u
                    pos[v] = cnt
                    cnt += 1
                    v = heavy[v]

        seg = [0] * (2 * n)
        for v in range(1, n + 1):
            seg[n + pos[v]] = values[v - 1]
        for i in range(n - 1, 0, -1):
            seg[i] = seg[2 * i] if seg[2 * i] > seg[2 * i + 1] else seg[2 * i + 1]

        def query(l: int, r: int) -> int:
            res = 0
            l += n
            r += n + 1
            while l < r:
                if l & 1:
                    if seg[l] > res:
                        res = seg[l]
                    l += 1
                if r & 1:
                    r -= 1
                    if seg[r] > res:
                        res = seg[r]
                l >>= 1
                r >>= 1
            return res

        ans = []
        for q in queries:
            if q[0] == 1:
                i = pos[q[1]] + n
                seg[i] = q[2]
                i >>= 1
                while i >= 1:
                    seg[i] = seg[2 * i] if seg[2 * i] > seg[2 * i + 1] else seg[2 * i + 1]
                    i >>= 1
            else:
                a, b = q[1], q[2]
                res = 0
                while head[a] != head[b]:
                    if dep[head[a]] < dep[head[b]]:
                        a, b = b, a
                    sub = query(pos[head[a]], pos[a])
                    if sub > res:
                        res = sub
                    a = par[head[a]]
                if pos[a] > pos[b]:
                    a, b = b, a
                sub = query(pos[a], pos[b])
                if sub > res:
                    res = sub
                ans.append(res)
        return ans
