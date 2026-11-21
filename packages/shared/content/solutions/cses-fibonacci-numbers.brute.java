class Solution {
    public int fibonacciNumbers(long n) {
        if (n == 0) return 0;
        if (n == 1) return 1;
        long MOD = 1000000007L;
        if (n > 50000000L) {
            long[][] res = {{1, 0}, {0, 1}};
            long[][] base = {{1, 1}, {1, 0}};
            long exp = n;
            while (exp > 0) {
                if ((exp & 1) == 1) res = mul(res, base, MOD);
                base = mul(base, base, MOD);
                exp >>= 1;
            }
            return (int)res[0][1];
        }
        long a = 0, b = 1;
        for (long i = 2; i <= n; i++) {
            long c = (a + b) % MOD;
            a = b;
            b = c;
        }
        return (int)b;
    }

    private long[][] mul(long[][] A, long[][] B, long mod) {
        long[][] C = new long[2][2];
        for (int i = 0; i < 2; i++) {
            for (int j = 0; j < 2; j++) {
                for (int k = 0; k < 2; k++) {
                    C[i][j] = (C[i][j] + A[i][k] * B[k][j]) % mod;
                }
            }
        }
        return C;
    }
}
