# verify: skip-stress
from typing import List

class Solution:
    def fixedLengthPathsI(self, n: int, k: int, edges: List[List[int]]) -> int:
        adj = [[] for _ in range(n + 1)]
        for u, v in edges:
            adj[u].append(v)
            adj[v].append(u)
        removed = [False] * (n + 1)
        par = [0] * (n + 1)
        sz = [0] * (n + 1)
        cnt = [0] * (n + 2)
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
            cnt[0] = 1
            max_seen = 0
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
                    rem = k - d
                    if 0 <= rem <= max_seen:
                        ans += cnt[rem]
                for d in depth:
                    cnt[d] += 1
                    if d > max_seen:
                        max_seen = d
            for d in range(max_seen + 1):
                cnt[d] = 0
            removed[c] = True
            for v in adj[c]:
                if not removed[v]:
                    stk.append(v)
        return ans
