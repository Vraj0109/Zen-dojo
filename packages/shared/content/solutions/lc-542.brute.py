class Solution:
    def updateMatrix(self, mat: list[list[int]]) -> list[list[int]]:
        r, c = len(mat), len(mat[0])
        zeros = [(i, j) for i in range(r) for j in range(c) if mat[i][j] == 0]
        res = [[0] * c for _ in range(r)]
        for i in range(r):
            for j in range(c):
                if mat[i][j] == 1:
                    res[i][j] = min(abs(i - zx) + abs(j - zy) for zx, zy in zeros)
        return res
