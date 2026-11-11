from typing import List

class Solution:
    def roundTrip(self, n: int, roads: List[List[int]]) -> bool:
        parent = list(range(n + 1))

        def find(i: int) -> int:
            if parent[i] == i:
                return i
            parent[i] = find(parent[i])
            return parent[i]

        def unite(i: int, j: int) -> bool:
            ri, rj = find(i), find(j)
            if ri == rj:
                return False
            parent[ri] = rj
            return True

        for u, v in roads:
            if not unite(u, v):
                return True
        return False
