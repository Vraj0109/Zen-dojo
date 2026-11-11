# verify: skip-stress
from typing import List

class Solution:
    def findCheapestPrice(self, n: int, flights: List[List[int]], src: int, dst: int, k: int) -> int:
        INF = 10**9
        dist = [INF] * n
        dist[src] = 0
        for _ in range(k + 1):
            nxt = list(dist)
            for u, v, w in flights:
                if dist[u] < INF:
                    nxt[v] = min(nxt[v], dist[u] + w)
            dist = nxt
        return -1 if dist[dst] >= INF else dist[dst]