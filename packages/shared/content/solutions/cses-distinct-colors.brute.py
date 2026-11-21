from collections import deque

class Solution:
    def distinctColors(self, colors: list[int], edges: list[list[int]]) -> list[int]:
        n = len(colors)
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
        ans = [0] * n
        for i in range(1, n + 1):
            col = set()
            qu = deque([i])
            while qu:
                u = qu.popleft()
                col.add(colors[u - 1])
                for v in children[u]:
                    qu.append(v)
            ans[i - 1] = len(col)
        return ans
