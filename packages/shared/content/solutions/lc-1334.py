# verify: skip-stress
from typing import List

class Solution:
    def findTheCity(self, n: int, edges: List[List[int]], distanceThreshold: int) -> int:
        INF = float('inf')
        d = [[INF] * n for _ in range(n)]
        for i in range(n):
            d[i][i] = 0
        for u, v, w in edges:
            d[u][v] = d[v][u] = w
        for k in range(n):
            for i in range(n):
                for j in range(n):
                    if d[i][k] + d[k][j] < d[i][j]:
                        d[i][j] = d[i][k] + d[k][j]
        best = -1
        best_count = float('inf')
        for i in range(n):
            cnt = sum(1 for j in range(n) if i != j and d[i][j] <= distanceThreshold)
            if cnt <= best_count:
                best_count = cnt
                best = i
        return best