class Solution:
    def minimumTime(self, n: int, relations: list[list[int]], time: list[int]) -> int:
        g = [[] for _ in range(n + 1)]
        for u, v in relations:
            g[u].append(v)
        memo = [-1] * (n + 1)

        def dfs(u: int) -> int:
            if memo[u] != -1:
                return memo[u]
            max_child = 0
            for v in g[u]:
                c_time = dfs(v)
                if c_time > max_child:
                    max_child = c_time
            memo[u] = time[u - 1] + max_child
            return memo[u]

        return max(dfs(i) for i in range(1, n + 1))
