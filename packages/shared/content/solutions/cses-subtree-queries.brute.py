from collections import deque

class Solution:
    def subtreeQueries(self, values: list[int], edges: list[list[int]], queries: list[list[int]]) -> list[int]:
        n = len(values)
        adj = [[] for _ in range(n + 1)]
        for u, v in edges:
            adj[u].append(v)
            adj[v].append(u)
        children = [[] for _ in range(n + 1)]
        par = [0] * (n + 1)
        q = deque([1])
        while q:
            u = q.popleft()
            for v in adj[u]:
                if v == par[u]:
                    continue
                par[v] = u
                children[u].append(v)
                q.append(v)
        val = [0] + list(values)
        ans = []
        for qry in queries:
            if qry[0] == 1:
                s, x = qry[1], qry[2]
                val[s] = x
            else:
                s = qry[1]
                total = 0
                qu = deque([s])
                while qu:
                    u = qu.popleft()
                    total += val[u]
                    for v in children[u]:
                        qu.append(v)
                ans.append(total)
        return ans
