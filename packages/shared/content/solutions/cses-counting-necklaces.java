class Solution {
    private long power(long base, long exp, long mod) {
        long res = 1;
        base %= mod;
        while (exp > 0) {
            if ((exp & 1) != 0) res = (res * base) % mod;
            base = (base * base) % mod;
            exp >>= 1;
        }
        return res;
    }
    private long getPhi(long x) {
        long result = x;
        for (long p = 2; p * p <= x; p++) {
            if (x % p == 0) {
                while (x % p == 0) x /= p;
                result -= result / p;
            }
        }
        if (x > 1) result -= result / x;
        return result;
    }
    public int countingNecklaces(int n, int m) {
        long MOD = 1000000007L;
        long sum = 0;
        for (int d = 1; (long) d * d <= n; d++) {
            if (n % d == 0) {
                long phi1 = getPhi(n / d) % MOD;
                long term1 = (phi1 * power(m, d, MOD)) % MOD;
                sum = (sum + term1) % MOD;
                if (d * d != n) {
                    int d2 = n / d;
                    long phi2 = getPhi(n / d2) % MOD;
                    long term2 = (phi2 * power(m, d2, MOD)) % MOD;
                    sum = (sum + term2) % MOD;
                }
            }
        }
        long ans = (sum * power(n, MOD - 2, MOD)) % MOD;
        return (int) ans;
    }
}