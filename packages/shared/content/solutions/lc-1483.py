from typing import List

class Solution:
    def kthAncestor(self, n: int, parent: List[int], queries: List[List[int]]) -> List[int]:
        LOG = 17
        up = [[-1] * LOG for _ in range(n)]
        for i in range(n):
            up[i][0] = parent[i]
        for j in range(1, LOG):
            for i in range(n):
                if up[i][j - 1] != -1:
                    up[i][j] = up[up[i][j - 1]][j - 1]

        res = []
        for node, k in queries:
            for j in range(LOG):
                if (k >> j) & 1:
                    node = up[node][j]
                    if node == -1:
                        break
            res.append(node)
        return res
