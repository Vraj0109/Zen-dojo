class Solution {
    public int findTargetSumWays(int[] nums, int target) {
        int total = 0;
        for (int x : nums) total += x;
        if (Math.abs(target) > total || (total + target) % 2 != 0) return 0;
        int need = (total + target) / 2;
        int[] dp = new int[need + 1];
        dp[0] = 1;
        for (int x : nums) {
            for (int s = need; s >= x; s--) {
                dp[s] += dp[s - x];
            }
        }
        return dp[need];
    }
}