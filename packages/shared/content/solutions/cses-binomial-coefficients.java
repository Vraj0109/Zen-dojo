class Solution {
    public int[] binomialCoefficients(int[][] queries) {
        final long MOD = 1000000007;
        int maxA = 0;
        for (int[] q : queries) {
            if (q[0] > maxA) maxA = q[0];
        }
        if (maxA < 1) maxA = 1;
        long[] fact = new long[maxA + 1];
        fact[0] = 1;
        fact[1] = 1;
        for (int i = 2; i <= maxA; i++) {
            fact[i] = (fact[i - 1] * i) % MOD;
        }

        long[] invFact = new long[maxA + 1];
        invFact[maxA] = power(fact[maxA], MOD - 2, MOD);
        for (int i = maxA - 1; i >= 0; i--) {
            invFact[i] = (invFact[i + 1] * (i + 1)) % MOD;
        }

        int[] ans = new int[queries.length];
        for (int i = 0; i < queries.length; i++) {
            int a = queries[i][0], b = queries[i][1];
            if (b < 0 || b > a) {
                ans[i] = 0;
            } else {
                long cur = fact[a] * invFact[b] % MOD;
                cur = cur * invFact[a - b] % MOD;
                ans[i] = (int) cur;
            }
        }
        return ans;
    }

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
}
