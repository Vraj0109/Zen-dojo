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
    public int distributingApples(int n, int m) {
        long MOD = 1000000007L;
        int total = n + m - 1;
        long[] fact = new long[total + 1];
        fact[0] = 1;
        for (int i = 1; i <= total; i++) {
            fact[i] = (fact[i - 1] * i) % MOD;
        }
        long denom = (fact[n - 1] * fact[m]) % MOD;
        long ans = fact[total] * power(denom, MOD - 2, MOD) % MOD;
        return (int) ans;
    }
}