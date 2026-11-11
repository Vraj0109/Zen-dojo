class Solution:
    def fibonacciNumbers(self, n: int) -> int:
        if n == 0:
            return 0
        if n == 1:
            return 1
        MOD = 1000000007

        def multiply(A, B):
            C = [[0, 0], [0, 0]]
            for i in range(2):
                for j in range(2):
                    for k in range(2):
                        C[i][j] = (C[i][j] + A[i][k] * B[k][j]) % MOD
            return C

        res = [[1, 0], [0, 1]]
        base = [[1, 1], [1, 0]]
        exp = n
        while exp > 0:
            if exp & 1:
                res = multiply(res, base)
            base = multiply(base, base)
            exp >>= 1
        return res[0][1]
