from typing import List

class Solution:
    def subordinates(self, n: int, bosses: List[int]) -> List[int]:
        adj = [[] for _ in range(n + 1)]
        for i in range(n - 1):
            emp = i + 2
            boss = bosses[i]
            adj[boss].append(emp)

        order = [1]
        for u in order:
            order.extend(adj[u])

        sub = [0] * n
        for u in reversed(order):
            for v in adj[u]:
                sub[u - 1] += 1 + sub[v - 1]
        return sub
