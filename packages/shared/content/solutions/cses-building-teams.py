from typing import List
from collections import deque

class Solution:
    def buildingTeams(self, n: int, friendships: List[List[int]]) -> bool:
        adj = [[] for _ in range(n + 1)]
        for u, v in friendships:
            adj[u].append(v)
            adj[v].append(u)
        color = [0] * (n + 1)
        q = deque()
        for i in range(1, n + 1):
            if color[i] != 0:
                continue
            color[i] = 1
            q.append(i)
            while q:
                u = q.popleft()
                for v in adj[u]:
                    if color[v] == 0:
                        color[v] = 3 - color[u]
                        q.append(v)
                    elif color[v] == color[u]:
                        return False
        return True
