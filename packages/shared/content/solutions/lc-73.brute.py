class Solution:
    def setZeroes(self, matrix: list[list[int]]) -> list[list[int]]:
        r, c = len(matrix), len(matrix[0])
        copy_mat = [row[:] for row in matrix]
        for i in range(r):
            for j in range(c):
                if matrix[i][j] == 0:
                    for k in range(c):
                        copy_mat[i][k] = 0
                    for k in range(r):
                        copy_mat[k][j] = 0
        return copy_mat
