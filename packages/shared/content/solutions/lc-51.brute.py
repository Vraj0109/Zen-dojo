import itertools

class Solution:
    def solveNQueens(self, n: int) -> list[list[str]]:
        def is_valid(p: tuple[int, ...]) -> bool:
            for i in range(n):
                for j in range(i + 1, n):
                    if abs(p[i] - p[j]) == abs(i - j):
                        return False
            return True

        res = []
        for p in itertools.permutations(range(n)):
            if is_valid(p):
                board = ["." * col + "Q" + "." * (n - col - 1) for col in p]
                res.append(board)
        return res
