from typing import List

class Solution:
    def maximalRectangle(self, matrix: List[List[str]]) -> int:
        if not matrix or not matrix[0]:
            return 0
        m, n = len(matrix), len(matrix[0])
        max_area = 0

        for r1 in range(m):
            for c1 in range(n):
                if matrix[r1][c1] != "1":
                    continue
                for r2 in range(r1, m):
                    for c2 in range(c1, n):
                        all_ones = True
                        for r in range(r1, r2 + 1):
                            for c in range(c1, c2 + 1):
                                if matrix[r][c] != "1":
                                    all_ones = False
                                    break
                            if not all_ones:
                                break
                        if all_ones:
                            area = (r2 - r1 + 1) * (c2 - c1 + 1)
                            if area > max_area:
                                max_area = area
        return max_area
