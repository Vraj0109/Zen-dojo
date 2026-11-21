class Solution {
    public int shortestSubarray(int[] nums, int k) {
        int n = nums.length;
        int best = n + 1;
        for (int i = 0; i < n; i++) {
            long sum = 0;
            for (int j = i; j < n; j++) {
                sum += nums[j];
                if (sum >= k) {
                    best = Math.min(best, j - i + 1);
                    break;
                }
            }
        }
        return best <= n ? best : -1;
    }
}
