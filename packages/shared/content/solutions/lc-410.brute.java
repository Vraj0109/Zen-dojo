import java.util.Arrays;

class Solution {
    public int splitArray(int[] nums, int k) {
        int n = nums.length;
        long[] prefix = new long[n + 1];
        for (int i = 0; i < n; i++) prefix[i + 1] = prefix[i] + nums[i];

        long[][] dp = new long[k + 1][n + 1];
        for (int j = 0; j <= k; j++) {
            Arrays.fill(dp[j], (long) 1e18);
        }
        dp[0][0] = 0;

        for (int j = 1; j <= k; j++) {
            for (int i = 1; i <= n; i++) {
                for (int p = 0; p < i; p++) {
                    long partSum = prefix[i] - prefix[p];
                    dp[j][i] = Math.min(dp[j][i], Math.max(dp[j - 1][p], partSum));
                }
            }
        }
        return (int) dp[k][n];
    }
}
