class Solution {
    public int maxSubArray(int[] nums) {
        int n = nums.length;
        int best = nums[0];
        for (int i = 0; i < n; i++) {
            int sum = 0;
            for (int j = i; j < n; j++) {
                sum += nums[j];
                best = Math.max(best, sum);
            }
        }
        return best;
    }
}
