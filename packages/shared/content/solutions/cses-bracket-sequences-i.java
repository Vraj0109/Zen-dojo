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
    public int bracketSequencesI(int n) {
        if (n % 2 != 0) return 0;
        int k = n / 2;
        if (k == 0) return 1;
        long MOD = 1000000007L;
        long[] fact = new long[2 * k + 1];
        fact[0] = 1;
        for (int i = 1; i <= 2 * k; i++) {
            fact[i] = (fact[i - 1] * i) % MOD;
        }
        long denom = (fact[k] * fact[k]) % MOD;
        denom = (denom * (k + 1)) % MOD;
        long ans = fact[2 * k] * power(denom, MOD - 2, MOD) % MOD;
        return (int) ans;
    }
}