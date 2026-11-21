class Solution:
    def maximalSquare(self, matrix: list[list[int]]) -> int:
        if not matrix:
            return 0
        R, C = len(matrix), len(matrix[0])
        max_side = 0
        for r in range(R):
            for c in range(C):
                if matrix[r][c] == 1:
                    max_side = max(max_side, 1)
                    max_k = min(R - r, C - c)
                    for k in range(2, max_k + 1):
                        all_ones = True
                        for i in range(k):
                            for j in range(k):
                                if matrix[r + i][c + j] != 1:
                                    all_ones = False
                                    break
                            if not all_ones:
                                break
                        if all_ones:
                            max_side = max(max_side, k)
                        else:
                            break
        return max_side * max_side
