class Solution {
    public int maxCoins(int[] nums) {
        int[] a = new int[nums.length + 2];
        a[0] = 1;
        for (int i = 0; i < nums.length; i++) a[i + 1] = nums[i];
        a[nums.length + 1] = 1;
        int n = a.length;
        int[][] dp = new int[n][n];
        for (int len = 2; len < n; len++) {
            for (int i = 0; i + len < n; i++) {
                int j = i + len;
                for (int k = i + 1; k < j; k++) {
                    dp[i][j] = Math.max(dp[i][j], dp[i][k] + dp[k][j] + a[i] * a[k] * a[j]);
                }
            }
        }
        return dp[0][n - 1];
    }
}