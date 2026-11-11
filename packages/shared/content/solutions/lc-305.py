from typing import List

class Solution:
    def numIslands2(self, m: int, n: int, positions: List[List[int]]) -> List[int]:
        parent = [-1] * (m * n)

        def find_root(i: int) -> int:
            if parent[i] == i:
                return i
            parent[i] = find_root(parent[i])
            return parent[i]

        def unite(i: int, j: int) -> bool:
            r1, r2 = find_root(i), find_root(j)
            if r1 == r2:
                return False
            parent[r1] = r2
            return True

        count = 0
        res = []
        dr = [1, -1, 0, 0]
        dc = [0, 0, 1, -1]

        for r, c in positions:
            idx = r * n + c
            if parent[idx] != -1:
                res.append(count)
                continue
            parent[idx] = idx
            count += 1
            for i in range(4):
                nr, nc = r + dr[i], c + dc[i]
                if 0 <= nr < m and 0 <= nc < n:
                    nidx = nr * n + nc
                    if parent[nidx] != -1:
                        if unite(idx, nidx):
                            count -= 1
            res.append(count)
        return res
