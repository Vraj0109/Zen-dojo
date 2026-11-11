class Solution {
    private static final long MOD = 1000000007;

    private long[][] multiply(long[][] A, long[][] B) {
        long[][] C = new long[2][2];
        for (int i = 0; i < 2; i++) {
            for (int j = 0; j < 2; j++) {
                for (int k = 0; k < 2; k++) {
                    C[i][j] = (C[i][j] + A[i][k] * B[k][j]) % MOD;
                }
            }
        }
        return C;
    }

    public int fibonacciNumbers(long n) {
        if (n == 0) return 0;
        if (n == 1) return 1;
        long[][] res = {{1, 0}, {0, 1}};
        long[][] base = {{1, 1}, {1, 0}};
        long exp = n;
        while (exp > 0) {
            if ((exp & 1) == 1) res = multiply(res, base);
            base = multiply(base, base);
            exp >>= 1;
        }
        return (int) res[0][1];
    }
}
