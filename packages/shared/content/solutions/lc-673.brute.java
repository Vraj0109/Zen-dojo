class Solution {
    private int maxLen = 0;
    private int count = 0;

    private void dfs(int[] nums, int idx, int lastVal, int curLen) {
        if (idx == nums.length) {
            if (curLen > maxLen) {
                maxLen = curLen;
                count = 1;
            } else if (curLen == maxLen && curLen > 0) {
                count++;
            }
            return;
        }
        dfs(nums, idx + 1, lastVal, curLen);
        if (curLen == 0 || nums[idx] > lastVal) {
            dfs(nums, idx + 1, nums[idx], curLen + 1);
        }
    }

    public int findNumberOfLIS(int[] nums) {
        if (nums.length == 0) return 0;
        maxLen = 0;
        count = 0;
        dfs(nums, 0, 0, 0);
        return count;
    }
}
