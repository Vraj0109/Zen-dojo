public class Solution {
    private long best = Long.MAX_VALUE;

    private void dfs(int[] nums, int idx, long currentSum, int goal) {
        if (idx == nums.length) {
            best = Math.min(best, Math.abs(currentSum - goal));
            return;
        }
        dfs(nums, idx + 1, currentSum, goal);
        dfs(nums, idx + 1, currentSum + nums[idx], goal);
    }

    public int minAbsDifference(int[] nums, int goal) {
        best = Math.abs((long) goal);
        dfs(nums, 0, 0, goal);
        return (int) best;
    }
}
