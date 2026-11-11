class Solution {
    public int coinCombinationsII(int[] coins, int target) {
        final int MOD = 1000000007;
        int[] dp = new int[target + 1];
        dp[0] = 1;
        for (int c : coins) {
            for (int i = c; i <= target; i++) {
                dp[i] = (dp[i] + dp[i - c]) % MOD;
            }
        }
        return dp[target];
    }
}
