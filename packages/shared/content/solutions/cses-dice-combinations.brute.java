class Solution {
    public int diceCombinations(int n) {
        final int MOD = 1000000007;
        int[] dp = new int[n + 1];
        dp[0] = 1;
        for (int i = 1; i <= n; i++) {
            for (int d = 1; d <= 6; d++) {
                if (i >= d) {
                    dp[i] = (dp[i] + dp[i - d]) % MOD;
                }
            }
        }
        return dp[n];
    }
}
