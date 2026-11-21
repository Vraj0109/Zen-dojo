from collections import deque

class Solution:
    def fixedLengthPathsI(self, n: int, k: int, edges: list[list[int]]) -> int:
        adj = [[] for _ in range(n + 1)]
        for u, v in edges:
            adj[u].append(v)
            adj[v].append(u)
        count = 0
        for i in range(1, n + 1):
            dist = [-1] * (n + 1)
            dist[i] = 0
            q = deque([i])
            while q:
                u = q.popleft()
                if dist[u] == k:
                    count += 1
                if dist[u] < k:
                    for v in adj[u]:
                        if dist[v] == -1:
                            dist[v] = dist[u] + 1
                            q.append(v)
        return count // 2
