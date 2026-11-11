# verify: skip-stress
from typing import List
from collections import deque

class Solution:
    def possibleBipartition(self, n: int, dislikes: List[List[int]]) -> bool:
        g = [[] for _ in range(n + 1)]
        for u, v in dislikes:
            g[u].append(v)
            g[v].append(u)
        color = [-1] * (n + 1)
        for s in range(1, n + 1):
            if color[s] != -1:
                continue
            color[s] = 0
            q = deque([s])
            while q:
                u = q.popleft()
                for v in g[u]:
                    if color[v] == -1:
                        color[v] = color[u] ^ 1
                        q.append(v)
                    elif color[v] == color[u]:
                        return False
        return True