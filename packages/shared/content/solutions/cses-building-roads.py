from typing import List

class Solution:
    def buildingRoads(self, n: int, roads: List[List[int]]) -> int:
        parent = list(range(n + 1))
        comps = n

        def find(i: int) -> int:
            if parent[i] == i:
                return i
            parent[i] = find(parent[i])
            return parent[i]

        def unite(i: int, j: int) -> None:
            nonlocal comps
            ri, rj = find(i), find(j)
            if ri != rj:
                parent[ri] = rj
                comps -= 1

        for u, v in roads:
            unite(u, v)
        return comps - 1
