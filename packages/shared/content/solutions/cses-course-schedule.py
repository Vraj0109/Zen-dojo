from typing import List
from collections import deque

class Solution:
    def courseSchedule(self, n: int, requirements: List[List[int]]) -> bool:
        adj = [[] for _ in range(n + 1)]
        indeg = [0] * (n + 1)
        for u, v in requirements:
            adj[u].append(v)
            indeg[v] += 1
        q = deque([i for i in range(1, n + 1) if indeg[i] == 0])
        count = 0
        while q:
            u = q.popleft()
            count += 1
            for v in adj[u]:
                indeg[v] -= 1
                if indeg[v] == 0:
                    q.append(v)
        return count == n
