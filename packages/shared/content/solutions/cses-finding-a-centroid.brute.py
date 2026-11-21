from collections import deque

class Solution:
    def findingACentroid(self, n: int, edges: list[list[int]]) -> int:
        adj = [[] for _ in range(n + 1)]
        for u, v in edges:
            adj[u].append(v)
            adj[v].append(u)
        for v in range(1, n + 1):
            vis = [False] * (n + 1)
            vis[v] = True
            ok = True
            for start in adj[v]:
                if vis[start]:
                    continue
                comp_size = 0
                q = deque([start])
                vis[start] = True
                while q:
                    u = q.popleft()
                    comp_size += 1
                    for nxt in adj[u]:
                        if not vis[nxt]:
                            vis[nxt] = True
                            q.append(nxt)
                if comp_size > n // 2:
                    ok = False
                    break
            if ok:
                return v
        return -1
