class Solution {
    public long maximumSubarraySum(int[] arr) {
        int n = arr.length;
        long best = arr[0];
        for (int i = 0; i < n; i++) {
            long currentSum = 0;
            for (int j = i; j < n; j++) {
                currentSum += arr[j];
                best = Math.max(best, currentSum);
            }
        }
        return best;
    }
}
