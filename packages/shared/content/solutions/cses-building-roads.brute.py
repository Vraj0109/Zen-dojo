from typing import List

class Solution:
    def buildingRoads(self, n: int, roads: List[List[int]]) -> int:
        parent = list(range(n + 1))
        comps = n

        def find(i):
            if parent[i] == i:
                return i
            parent[i] = find(parent[i])
            return parent[i]

        def unite(i, j):
            nonlocal comps
            root_i, root_j = find(i), find(j)
            if root_i != root_j:
                parent[root_i] = root_j
                comps -= 1

        for u, v in roads:
            unite(u, v)

        return comps - 1
