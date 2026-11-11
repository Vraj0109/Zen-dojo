import java.util.*;

class Solution {
    public int minimizingCoins(int[] coins, int target) {
        int INF = 1000000000;
        int[] dp = new int[target + 1];
        Arrays.fill(dp, INF);
        dp[0] = 0;
        for (int i = 1; i <= target; i++) {
            for (int c : coins) {
                if (i >= c && dp[i - c] != INF) {
                    dp[i] = Math.min(dp[i], dp[i - c] + 1);
                }
            }
        }
        return dp[target] >= INF ? -1 : dp[target];
    }
}
