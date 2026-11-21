class Solution:
    def rotate(self, matrix: list[list[int]]) -> list[list[int]]:
        n = len(matrix)
        res = [[0] * n for _ in range(n)]
        for i in range(n):
            for j in range(n):
                res[j][n - 1 - i] = matrix[i][j]
        return res
