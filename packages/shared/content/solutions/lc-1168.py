from typing import List

class Solution:
    def minCostToSupplyWater(self, n: int, wells: List[int], pipes: List[List[int]]) -> int:
        parent = list(range(n + 1))

        def find_root(x: int) -> int:
            if parent[x] == x:
                return x
            parent[x] = find_root(parent[x])
            return parent[x]

        def unite(x: int, y: int) -> bool:
            rx, ry = find_root(x), find_root(y)
            if rx == ry:
                return False
            parent[rx] = ry
            return True

        edges = []
        for i in range(1, n + 1):
            edges.append((wells[i - 1], 0, i))
        for u, v, cost in pipes:
            edges.append((cost, u, v))
        edges.sort(key=lambda e: e[0])

        total_cost = 0
        edges_count = 0
        for cost, u, v in edges:
            if unite(u, v):
                total_cost += cost
                edges_count += 1
                if edges_count == n:
                    break
        return total_cost
