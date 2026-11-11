# verify: skip-stress
from typing import List

class Solution:
    def distinctColors(self, colors: List[int], edges: List[List[int]]) -> List[int]:
        n = len(colors)
        adj = [[] for _ in range(n + 1)]
        for u, v in edges:
            adj[u].append(v)
            adj[v].append(u)
        par = [0] * (n + 1)
        tin = [0] * (n + 1)
        tout = [0] * (n + 1)
        it = [0] * (n + 1)
        st = [1]
        timer = 1
        tin[1] = 1
        while st:
            u = st[-1]
            if it[u] < len(adj[u]):
                v = adj[u][it[u]]
                it[u] += 1
                if v == par[u]:
                    continue
                par[v] = u
                timer += 1
                tin[v] = timer
                st.append(v)
            else:
                tout[u] = timer
                st.pop()

        arr = [0] * (n + 1)
        for v in range(1, n + 1):
            arr[tin[v]] = colors[v - 1]
        by_end = [[] for _ in range(n + 1)]
        for v in range(1, n + 1):
            by_end[tout[v]].append(v)

        bit = [0] * (n + 2)

        def add(i: int, x: int) -> None:
            while i <= n:
                bit[i] += x
                i += i & -i

        def psum(i: int) -> int:
            s = 0
            while i > 0:
                s += bit[i]
                i -= i & -i
            return s

        last = {}
        ans = [0] * n
        for r in range(1, n + 1):
            c = arr[r]
            if c in last:
                add(last[c], -1)
            add(r, 1)
            last[c] = r
            for v in by_end[r]:
                ans[v - 1] = psum(r) - psum(tin[v] - 1)
        return ans
