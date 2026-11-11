from typing import List

class Solution:
    def cycleFinding(self, n: int, edges: List[List[int]]) -> bool:
        dist = [0] * (n + 1)
        any_relaxed = False
        for _ in range(n):
            any_relaxed = False
            for u, v, w in edges:
                if dist[u] + w < dist[v]:
                    dist[v] = dist[u] + w
                    any_relaxed = True
            if not any_relaxed:
                break
        return any_relaxed
