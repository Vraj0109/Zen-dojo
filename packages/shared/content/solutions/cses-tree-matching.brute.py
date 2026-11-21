from collections import deque

class Solution:
    def treeMatching(self, n: int, edges: list[list[int]]) -> int:
        if n <= 1:
            return 0
        adj = [[] for _ in range(n + 1)]
        for u, v in edges:
            adj[u].append(v)
            adj[v].append(u)
        par = [0] * (n + 1)
        order = [1]
        head = 0
        while head < len(order):
            u = order[head]
            head += 1
            for v in adj[u]:
                if v == par[u]:
                    continue
                par[v] = u
                order.append(v)
        used = [False] * (n + 1)
        ans = 0
        for i in range(len(order) - 1, 0, -1):
            v = order[i]
            p = par[v]
            if not used[v] and p != 0 and not used[p]:
                used[v] = used[p] = True
                ans += 1
        return ans
