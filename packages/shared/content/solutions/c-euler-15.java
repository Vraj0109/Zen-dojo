class Solution {
    private static final long MOD = 1000000007;

    private long power(long b, long e) {
        long r = 1;
        b %= MOD;
        while (e > 0) {
            if ((e & 1) == 1) r = r * b % MOD;
            b = b * b % MOD;
            e >>= 1;
        }
        return r;
    }

    public int latticePaths(int h, int w) {
        int n = h + w;
        long[] fact = new long[n + 1];
        fact[0] = 1;
        for (int i = 1; i <= n; i++) fact[i] = fact[i - 1] * i % MOD;
        return (int)(fact[n] * power(fact[h], MOD - 2) % MOD * power(fact[w], MOD - 2) % MOD);
    }
}
