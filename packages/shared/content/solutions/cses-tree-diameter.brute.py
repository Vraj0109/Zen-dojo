from collections import deque

class Solution:
    def treeDiameter(self, n: int, edges: list[list[int]]) -> int:
        if n <= 1:
            return 0
        adj = [[] for _ in range(n + 1)]
        for u, v in edges:
            adj[u].append(v)
            adj[v].append(u)
        max_dist = 0
        for i in range(1, n + 1):
            dist = [-1] * (n + 1)
            dist[i] = 0
            q = deque([i])
            while q:
                u = q.popleft()
                if dist[u] > max_dist:
                    max_dist = dist[u]
                for v in adj[u]:
                    if dist[v] == -1:
                        dist[v] = dist[u] + 1
                        q.append(v)
        return max_dist
