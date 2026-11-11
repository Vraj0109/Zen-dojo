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
    public int[] exponentiationII(int[][] queries) {
        long MOD = 1000000007L;
        long PHI = 1000000006L;
        int[] ans = new int[queries.length];
        for (int i = 0; i < queries.length; i++) {
            long a = queries[i][0], b = queries[i][1], c = queries[i][2];
            long exp = power(b, c, PHI);
            long res = power(a, exp, MOD);
            ans[i] = (int) res;
        }
        return ans;
    }
}