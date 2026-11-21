class Solution {
    public int maxSubarraySumCircular(int[] nums) {
        int n = nums.length;
        int best = nums[0];
        for (int i = 0; i < n; i++) {
            int sum = 0;
            for (int len = 1; len <= n; len++) {
                sum += nums[(i + len - 1) % n];
                best = Math.max(best, sum);
            }
        }
        return best;
    }
}
