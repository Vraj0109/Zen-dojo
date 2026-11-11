class Solution {
    public int coinCombinationsI(int[] coins, int target) {
        final int MOD = 1000000007;
        int[] dp = new int[target + 1];
        dp[0] = 1;
        for (int i = 1; i <= target; i++) {
            for (int c : coins) {
                if (i >= c) {
                    dp[i] = (dp[i] + dp[i - c]) % MOD;
                }
            }
        }
        return dp[target];
    }
}
