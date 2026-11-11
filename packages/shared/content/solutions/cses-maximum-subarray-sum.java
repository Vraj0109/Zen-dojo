class Solution {
    public long maximumSubarraySum(int[] arr) {
        long maxSoFar = arr[0];
        long cur = arr[0];
        for (int i = 1; i < arr.length; i++) {
            cur = Math.max((long) arr[i], cur + arr[i]);
            maxSoFar = Math.max(maxSoFar, cur);
        }
        return maxSoFar;
    }
}
