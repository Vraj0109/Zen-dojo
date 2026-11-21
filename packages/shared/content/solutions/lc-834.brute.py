from collections import deque

class Solution:
    def sumOfDistancesInTree(self, n: int, edges: list[list[int]]) -> list[int]:
        g = [[] for _ in range(n)]
        for u, v in edges:
            g[u].append(v)
            g[v].append(u)
        ans = [0] * n
        for i in range(n):
            dist = [-1] * n
            dist[i] = 0
            q = deque([i])
            total_dist = 0
            while q:
                u = q.popleft()
                total_dist += dist[u]
                for v in g[u]:
                    if dist[v] == -1:
                        dist[v] = dist[u] + 1
                        q.append(v)
            ans[i] = total_dist
        return ans
