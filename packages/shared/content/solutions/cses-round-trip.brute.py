from typing import List

class Solution:
    def roundTrip(self, n: int, roads: List[List[int]]) -> bool:
        parent = list(range(n + 1))

        def find(i):
            if parent[i] == i:
                return i
            parent[i] = find(parent[i])
            return parent[i]

        def unite(i, j):
            root_i, root_j = find(i), find(j)
            if root_i != root_j:
                parent[root_i] = root_j
                return True
            return False

        for u, v in roads:
            if not unite(u, v):
                return True
        return False
