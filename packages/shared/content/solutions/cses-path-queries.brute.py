from collections import deque

class Solution:
    def pathQueries(self, values: list[int], edges: list[list[int]], queries: list[list[int]]) -> list[int]:
        n = len(values)
        adj = [[] for _ in range(n + 1)]
        for u, v in edges:
            adj[u].append(v)
            adj[v].append(u)
        par = [0] * (n + 1)
        q = deque([1])
        while q:
            u = q.popleft()
            for v in adj[u]:
                if v == par[u]:
                    continue
                par[v] = u
                q.append(v)
        val = [0] + list(values)
        ans = []
        for qry in queries:
            if qry[0] == 1:
                s, x = qry[1], qry[2]
                val[s] = x
            else:
                s = qry[1]
                cur = s
                total = 0
                while cur != 0:
                    total += val[cur]
                    cur = par[cur]
                ans.append(total)
        return ans
