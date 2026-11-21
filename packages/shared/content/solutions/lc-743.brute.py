class Solution:
    def networkDelayTime(self, times: list[list[int]], n: int, k: int) -> int:
        g = [[] for _ in range(n + 1)]
        for u, v, w in times:
            g[u].append((v, w))
        dist = [float('inf')] * (n + 1)

        def dfs(u: int, current_dist: int) -> None:
            if current_dist >= dist[u]:
                return
            dist[u] = current_dist
            for v, w in g[u]:
                dfs(v, current_dist + w)

        dfs(k, 0)
        ans = max(dist[1:])
        return -1 if ans == float('inf') else ans
