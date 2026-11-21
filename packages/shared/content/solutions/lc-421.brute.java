class Solution {
    public int findMaximumXOR(int[] nums) {
        int maxVal = 0;
        int n = nums.length;
        for (int i = 0; i < n; i++) {
            for (int j = i; j < n; j++) {
                maxVal = Math.max(maxVal, nums[i] ^ nums[j]);
            }
        }
        return maxVal;
    }
}
