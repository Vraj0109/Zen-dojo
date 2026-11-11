from typing import List
import heapq

class Solution:
    def shortestRoutesI(self, n: int, flights: List[List[int]]) -> List[int]:
        adj = [[] for _ in range(n + 1)]
        for u, v, w in flights:
            adj[u].append((v, w))
        INF = 4 * 10**18
        dist = [INF] * (n + 1)
        dist[1] = 0
        pq = [(0, 1)]
        while pq:
            d, u = heapq.heappop(pq)
            if d > dist[u]:
                continue
            for v, w in adj[u]:
                if dist[u] + w < dist[v]:
                    dist[v] = dist[u] + w
                    heapq.heappush(pq, (dist[v], v))
        return [(-1 if dist[i] == INF else dist[i]) for i in range(1, n + 1)]
