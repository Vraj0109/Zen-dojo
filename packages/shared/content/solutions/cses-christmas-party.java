class Solution {
    public int christmasParty(int n) {
        if (n <= 1) return 0;
        if (n == 2) return 1;
        long MOD = 1000000007L;
        long prev2 = 0;
        long prev1 = 1;
        for (int i = 3; i <= n; i++) {
            long cur = ((long) (i - 1) * (prev1 + prev2)) % MOD;
            prev2 = prev1;
            prev1 = cur;
        }
        return (int) prev1;
    }
}