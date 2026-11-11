# verify: skip-stress
from typing import List

class Solution:
    def setZeroes(self, matrix: List[List[int]]) -> List[List[int]]:
        r, c = len(matrix), len(matrix[0])
        row = [False] * r
        col = [False] * c
        for i in range(r):
            for j in range(c):
                if matrix[i][j] == 0:
                    row[i] = col[j] = True
        for i in range(r):
            for j in range(c):
                if row[i] or col[j]:
                    matrix[i][j] = 0
        return matrix