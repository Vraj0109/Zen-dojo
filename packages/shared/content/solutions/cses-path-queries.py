# verify: skip-stress
from typing import List

class Solution:
    def pathQueries(self, values: List[int], edges: List[List[int]], queries: List[List[int]]) -> List[int]:
        n = len(values)
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

        def range_add(l: int, r: int, x: int) -> None:
            add(l, x)
            if r + 1 <= n:
                add(r + 1, -x)

        cur = [0] * (n + 1)
        for v in range(1, n + 1):
            cur[v] = values[v - 1]
            range_add(tin[v], tout[v], cur[v])

        ans = []
        for q in queries:
            if q[0] == 1:
                range_add(tin[q[1]], tout[q[1]], q[2] - cur[q[1]])
                cur[q[1]] = q[2]
            else:
                ans.append(psum(tin[q[1]]))
        return ans
