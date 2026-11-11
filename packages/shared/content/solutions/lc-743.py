# verify: skip-stress
from typing import List
import heapq

class Solution:
    def networkDelayTime(self, times: List[List[int]], n: int, k: int) -> int:
        g = [[] for _ in range(n + 1)]
        for u, v, w in times:
            g[u].append((v, w))
        dist = [float('inf')] * (n + 1)
        dist[k] = 0
        pq = [(0, k)]
        while pq:
            d, u = heapq.heappop(pq)
            if d > dist[u]:
                continue
            for v, w in g[u]:
                if d + w < dist[v]:
                    dist[v] = d + w
                    heapq.heappush(pq, (dist[v], v))
        best = 0
        for i in range(1, n + 1):
            if dist[i] == float('inf'):
                return -1
            best = max(best, dist[i])
        return best