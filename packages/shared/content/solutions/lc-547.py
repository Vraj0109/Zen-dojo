# verify: skip-stress
from typing import List

class Solution:
    def findCircleNum(self, isConnected: List[List[int]]) -> int:
        n = len(isConnected)
        seen = [False] * n
        def dfs(u):
            seen[u] = True
            for v in range(n):
                if isConnected[u][v] == 1 and not seen[v]:
                    dfs(v)
        count = 0
        for i in range(n):
            if not seen[i]:
                count += 1
                dfs(i)
        return count