class Solution {
    public int countRangeSum(int[] nums, int lower, int upper) {
        int n = nums.length;
        int count = 0;
        for (int i = 0; i < n; i++) {
            long sum = 0;
            for (int j = i; j < n; j++) {
                sum += nums[j];
                if (sum >= lower && sum <= upper) {
                    count++;
                }
            }
        }
        return count;
    }
}
