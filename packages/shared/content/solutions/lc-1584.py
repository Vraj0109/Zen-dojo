# verify: skip-stress
from typing import List

class Solution:
    def minCostConnectPoints(self, points: List[List[int]]) -> int:
        n = len(points)
        best = [float('inf')] * n
        best[0] = 0
        in_tree = [False] * n
        total = 0
        for _ in range(n):
            u = -1
            for i in range(n):
                if not in_tree[i] and (u == -1 or best[i] < best[u]):
                    u = i
            in_tree[u] = True
            total += best[u]
            for v in range(n):
                if not in_tree[v]:
                    d = abs(points[u][0] - points[v][0]) + abs(points[u][1] - points[v][1])
                    if d < best[v]:
                        best[v] = d
        return total