import heapq

class Solution:
    def findTheCity(self, n: int, edges: list[list[int]], distanceThreshold: int) -> int:
        g = [[] for _ in range(n)]
        for u, v, w in edges:
            g[u].append((v, w))
            g[v].append((u, w))

        def dijkstra_count(src: int) -> int:
            dist = [float('inf')] * n
            dist[src] = 0
            pq = [(0, src)]

            while pq:
                d, u = heapq.heappop(pq)
                if d > dist[u]:
                    continue
                for v, w in g[u]:
                    if d + w < dist[v]:
                        dist[v] = d + w
                        heapq.heappush(pq, (d + w, v))

            return sum(1 for i in range(n) if i != src and dist[i] <= distanceThreshold)

        best_city = -1
        min_reachable = float('inf')

        for i in range(n):
            reachable = dijkstra_count(i)
            if reachable <= min_reachable:
                min_reachable = reachable
                best_city = i

        return best_city
