class Solution {
    public int twoSetsII(int n) {
        long total = 1L * n * (n + 1) / 2;
        if (total % 2 != 0) return 0;
        int target = (int) (total / 2);
        final int MOD = 1000000007;
        int[] dp = new int[target + 1];
        dp[0] = 1;
        for (int i = 1; i < n; i++) {
            for (int j = target; j >= i; j--) {
                dp[j] = (dp[j] + dp[j - i]) % MOD;
            }
        }
        return dp[target];
    }
}
