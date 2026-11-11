# verify: skip-stress
from typing import List

class Solution:
    def fixedLengthPathsII(self, n: int, k1: int, k2: int, edges: List[List[int]]) -> int:
        adj = [[] for _ in range(n + 1)]
        for u, v in edges:
            adj[u].append(v)
            adj[v].append(u)
        removed = [False] * (n + 1)
        par = [0] * (n + 1)
        sz = [0] * (n + 1)
        bit = [0] * (n + 3)

        def bit_add(i: int, x: int) -> None:
            i += 1
            while i <= n + 1:
                bit[i] += x
                i += i & -i

        def bit_sum(i: int) -> int:
            s = 0
            i += 1
            while i > 0:
                s += bit[i]
                i -= i & -i
            return s

        ans = 0
        stk = [1]
        while stk:
            start = stk.pop()
            comp = [start]
            par[start] = 0
            for u in comp:
                for v in adj[u]:
                    if not removed[v] and v != par[u]:
                        par[v] = u
                        comp.append(v)
            total = len(comp)
            for u in comp:
                sz[u] = 1
            for i in range(total - 1, 0, -1):
                sz[par[comp[i]]] += sz[comp[i]]
            c = start
            while True:
                nxt = 0
                for v in adj[c]:
                    if not removed[v] and v != par[c] and sz[v] * 2 > total:
                        nxt = v
                        break
                if not nxt:
                    break
                c = nxt
            bit_add(0, 1)
            added = [0]
            for child in adj[c]:
                if removed[child]:
                    continue
                nodes = [child]
                depth = [1]
                par[child] = c
                h = 0
                while h < len(nodes):
                    u = nodes[h]
                    d = depth[h]
                    for v in adj[u]:
                        if not removed[v] and v != par[u]:
                            par[v] = u
                            nodes.append(v)
                            depth.append(d + 1)
                    h += 1
                for d in depth:
                    lo = 0 if k1 - d < 0 else k1 - d
                    hi = k2 - d
                    if hi < 0:
                        continue
                    if hi > n:
                        hi = n
                    if lo > hi:
                        continue
                    ans += bit_sum(hi) - (bit_sum(lo - 1) if lo > 0 else 0)
                for d in depth:
                    bit_add(d, 1)
                    added.append(d)
            for d in added:
                bit_add(d, -1)
            removed[c] = True
            for v in adj[c]:
                if not removed[v]:
                    stk.append(v)
        return ans
