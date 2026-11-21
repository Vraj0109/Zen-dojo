class Solution {
    public int[] maxSlidingWindow(int[] nums, int k) {
        int n = nums.length;
        int[] ans = new int[n - k + 1];
        for (int i = 0; i <= n - k; i++) {
            int mx = nums[i];
            for (int j = 1; j < k; j++) {
                mx = Math.max(mx, nums[i + j]);
            }
            ans[i] = mx;
        }
        return ans;
    }
}
