public class Solution {
    private int totalN;
    private long totalSum = 0;
    private long ans = Long.MAX_VALUE;

    private void dfs(int[] nums, int idx, int count, long currentSum) {
        if (count == totalN) {
            ans = Math.min(ans, Math.abs(totalSum - 2 * currentSum));
            return;
        }
        if (idx == nums.length) return;
        if (count + nums.length - idx < totalN) return;

        dfs(nums, idx + 1, count + 1, currentSum + nums[idx]);
        dfs(nums, idx + 1, count, currentSum);
    }

    public int minimumDifference(int[] nums) {
        totalN = nums.length / 2;
        totalSum = 0;
        for (int x : nums) totalSum += x;
        ans = Long.MAX_VALUE;
        dfs(nums, 0, 0, 0);
        return (int) ans;
    }
}
