from collections import deque

class Solution:
    def treeDistancesI(self, n: int, edges: list[list[int]]) -> list[int]:
        if n == 1:
            return [0]
        adj = [[] for _ in range(n + 1)]
        for u, v in edges:
            adj[u].append(v)
            adj[v].append(u)
        ans = [0] * n
        for i in range(1, n + 1):
            dist = [-1] * (n + 1)
            dist[i] = 0
            q = deque([i])
            max_d = 0
            while q:
                u = q.popleft()
                if dist[u] > max_d:
                    max_d = dist[u]
                for v in adj[u]:
                    if dist[v] == -1:
                        dist[v] = dist[u] + 1
                        q.append(v)
            ans[i - 1] = max_d
        return ans
