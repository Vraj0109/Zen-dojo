from typing import List

class Solution:
    def maxPathTriangle(self, triangle: List[List[int]]) -> int:
        n = len(triangle)
        d = list(triangle[n - 1])
        for i in range(n - 2, -1, -1):
            for j in range(i + 1):
                d[j] = triangle[i][j] + max(d[j], d[j + 1])
        return d[0]
