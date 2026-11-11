class Solution {
    public int maxSubarraySumCircular(int[] nums) {
        int total = 0, curMax = 0, best = nums[0], curMin = 0, worst = nums[0];
        for (int x : nums) {
            total += x;
            curMax = Math.max(curMax + x, x);
            best = Math.max(best, curMax);
            curMin = Math.min(curMin + x, x);
            worst = Math.min(worst, curMin);
        }
        return best < 0 ? best : Math.max(best, total - worst);
    }
}