from collections import deque

class Solution:
    def countingPaths(self, n: int, edges: list[list[int]], paths: list[list[int]]) -> list[int]:
        adj = [[] for _ in range(n + 1)]
        for u, v in edges:
            adj[u].append(v)
            adj[v].append(u)
        count = [0] * n
        for a, b in paths:
            prev = [0] * (n + 1)
            q = deque([a])
            vis = [False] * (n + 1)
            vis[a] = True
            while q:
                u = q.popleft()
                if u == b:
                    break
                for v in adj[u]:
                    if not vis[v]:
                        vis[v] = True
                        prev[v] = u
                        q.append(v)
            cur = b
            while cur != 0:
                count[cur - 1] += 1
                if cur == a:
                    break
                cur = prev[cur]
        return count
