from typing import List
import heapq

class Solution:
    def flightDiscount(self, n: int, flights: List[List[int]]) -> int:
        adj = [[] for _ in range(n + 1)]
        for u, v, c in flights:
            adj[u].append((v, c))
        INF = 4 * 10**18
        dist = [[INF, INF] for _ in range(n + 1)]
        dist[1][0] = 0
        pq = [(0, 1, 0)]
        while pq:
            d, u, used = heapq.heappop(pq)
            if d > dist[u][used]:
                continue
            for v, c in adj[u]:
                if used == 0:
                    if dist[u][0] + c < dist[v][0]:
                        dist[v][0] = dist[u][0] + c
                        heapq.heappush(pq, (dist[v][0], v, 0))
                    discounted = c // 2
                    if dist[u][0] + discounted < dist[v][1]:
                        dist[v][1] = dist[u][0] + discounted
                        heapq.heappush(pq, (dist[v][1], v, 1))
                else:
                    if dist[u][1] + c < dist[v][1]:
                        dist[v][1] = dist[u][1] + c
                        heapq.heappush(pq, (dist[v][1], v, 1))
        return dist[n][1]
