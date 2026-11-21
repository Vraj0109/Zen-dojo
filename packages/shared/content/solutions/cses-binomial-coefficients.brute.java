class Solution {
    private long power(long base, long exp, long mod) {
        long res = 1;
        base %= mod;
        while (exp > 0) {
            if ((exp & 1) == 1) res = (res * base) % mod;
            base = (base * base) % mod;
            exp >>= 1;
        }
        return res;
    }

    public int[] binomialCoefficients(int[][] queries) {
        long MOD = 1000000007L;
        int[] ans = new int[queries.length];
        for (int q = 0; q < queries.length; q++) {
            int a = queries[q][0];
            int b = queries[q][1];
            if (b < 0 || b > a) {
                ans[q] = 0;
                continue;
            }
            long factA = 1, factB = 1, factAB = 1;
            for (int i = 1; i <= a; i++) factA = (factA * i) % MOD;
            for (int i = 1; i <= b; i++) factB = (factB * i) % MOD;
            for (int i = 1; i <= a - b; i++) factAB = (factAB * i) % MOD;
            long denom = (factB * factAB) % MOD;
            long invDenom = power(denom, MOD - 2, MOD);
            long res = (factA * invDenom) % MOD;
            ans[q] = (int)res;
        }
        return ans;
    }
}
