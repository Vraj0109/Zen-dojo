from collections import deque

class Solution:
    def distanceQueries(self, n: int, edges: list[list[int]], queries: list[list[int]]) -> list[int]:
        adj = [[] for _ in range(n + 1)]
        for u, v in edges:
            adj[u].append(v)
            adj[v].append(u)
        ans = []
        for a, b in queries:
            if a == b:
                ans.append(0)
                continue
            dist = [-1] * (n + 1)
            dist[a] = 0
            q = deque([a])
            while q:
                u = q.popleft()
                if u == b:
                    break
                for v in adj[u]:
                    if dist[v] == -1:
                        dist[v] = dist[u] + 1
                        q.append(v)
            ans.append(dist[b])
        return ans
