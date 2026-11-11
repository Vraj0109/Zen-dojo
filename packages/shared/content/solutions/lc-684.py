# verify: skip-stress
from typing import List

class Solution:
    def findRedundantConnection(self, edges: List[List[int]]) -> List[int]:
        n = len(edges)
        par = list(range(n + 1))
        def find(x):
            if par[x] != x:
                par[x] = find(par[x])
            return par[x]
        for u, v in edges:
            a, b = find(u), find(v)
            if a == b:
                return [u, v]
            par[a] = b
        return []