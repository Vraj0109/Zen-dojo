class Solution {
    public int maxProduct(int[] nums) {
        long curMax = nums[0], curMin = nums[0], best = nums[0];
        for (int i = 1; i < nums.length; i++) {
            long x = nums[i];
            long a = curMax * x, b = curMin * x;
            curMax = Math.max(x, Math.max(a, b));
            curMin = Math.min(x, Math.min(a, b));
            best = Math.max(best, curMax);
        }
        return (int) best;
    }
}