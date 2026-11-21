class Solution {
    private boolean dfs(int[] nums, int i, int target) {
        if (target == 0) return true;
        if (target < 0 || i >= nums.length) return false;
        return dfs(nums, i + 1, target - nums[i]) || dfs(nums, i + 1, target);
    }

    public boolean canPartition(int[] nums) {
        int total = 0;
        for (int x : nums) total += x;
        if (total % 2 != 0) return false;
        return dfs(nums, 0, total / 2);
    }
}
