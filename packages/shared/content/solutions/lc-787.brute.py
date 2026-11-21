class Solution:
    def findCheapestPrice(self, n: int, flights: list[list[int]], src: int, dst: int, k: int) -> int:
        g = [[] for _ in range(n)]
        for u, v, price in flights:
            g[u].append((v, price))

        min_cost = float('inf')
        visited = [False] * n

        def dfs(u: int, stops_left: int, cost: int) -> None:
            nonlocal min_cost
            if u == dst:
                min_cost = min(min_cost, cost)
                return
            if stops_left < 0 or cost >= min_cost:
                return

            visited[u] = True
            for v, price in g[u]:
                if not visited[v]:
                    dfs(v, stops_left - 1, cost + price)
            visited[u] = False

        dfs(src, k, 0)
        return -1 if min_cost == float('inf') else int(min_cost)
