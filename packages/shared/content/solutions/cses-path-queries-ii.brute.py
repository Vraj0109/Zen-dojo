from collections import deque

class Solution:
    def pathQueriesII(self, values: list[int], edges: list[list[int]], queries: list[list[int]]) -> list[int]:
        n = len(values)
        adj = [[] for _ in range(n + 1)]
        for u, v in edges:
            adj[u].append(v)
            adj[v].append(u)
        val = [0] + list(values)
        ans = []
        for qry in queries:
            if qry[0] == 1:
                s, x = qry[1], qry[2]
                val[s] = x
            else:
                a, b = qry[1], qry[2]
                prev = [0] * (n + 1)
                vis = [False] * (n + 1)
                vis[a] = True
                qu = deque([a])
                while qu:
                    u = qu.popleft()
                    if u == b:
                        break
                    for v in adj[u]:
                        if not vis[v]:
                            vis[v] = True
                            prev[v] = u
                            qu.append(v)
                cur = b
                max_val = val[b]
                while cur != a:
                    cur = prev[cur]
                    if val[cur] > max_val:
                        max_val = val[cur]
                ans.append(max_val)
        return ans
