class Solution {
    private int dfs(int[] nums, int i) {
        if (i >= nums.length) return 0;
        int robThis = nums[i] + dfs(nums, i + 2);
        int skipThis = dfs(nums, i + 1);
        return Math.max(robThis, skipThis);
    }

    public int rob(int[] nums) {
        return dfs(nums, 0);
    }
}
