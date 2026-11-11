# verify: skip-stress
from typing import List
from collections import deque

class Solution:
    def minimumTime(self, n: int, relations: List[List[int]], time: List[int]) -> int:
        g = [[] for _ in range(n + 1)]
        indeg = [0] * (n + 1)
        start = [0] * (n + 1)
        for u, v in relations:
            g[u].append(v)
            indeg[v] += 1
        q = deque(i for i in range(1, n + 1) if indeg[i] == 0)
        best = 0
        while q:
            u = q.popleft()
            fin = start[u] + time[u - 1]
            best = max(best, fin)
            for v in g[u]:
                start[v] = max(start[v], fin)
                indeg[v] -= 1
                if indeg[v] == 0:
                    q.append(v)
        return best