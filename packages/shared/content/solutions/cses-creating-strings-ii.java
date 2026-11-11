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
    public int creatingStringsII(String s) {
        long MOD = 1000000007L;
        int n = s.length();
        long[] fact = new long[n + 1];
        fact[0] = 1;
        for (int i = 1; i <= n; i++) {
            fact[i] = (fact[i - 1] * i) % MOD;
        }
        int[] cnt = new int[26];
        for (int i = 0; i < n; i++) cnt[s.charAt(i) - 'a']++;
        long denom = 1;
        for (int i = 0; i < 26; i++) {
            if (cnt[i] > 1) {
                denom = (denom * fact[cnt[i]]) % MOD;
            }
        }
        long ans = fact[n] * power(denom, MOD - 2, MOD) % MOD;
        return (int) ans;
    }
}