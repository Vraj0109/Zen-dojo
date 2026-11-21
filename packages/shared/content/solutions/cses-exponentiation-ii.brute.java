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

    public int[] exponentiationII(int[][] queries) {
        long MOD = 1000000007L;
        long PHI = 1000000006L;
        int[] ans = new int[queries.length];
        for (int q = 0; q < queries.length; q++) {
            long a = queries[q][0];
            long b = queries[q][1];
            long c = queries[q][2];
            long exp = power(b, c, PHI);
            long res = power(a, exp, MOD);
            ans[q] = (int)res;
        }
        return ans;
    }
}
