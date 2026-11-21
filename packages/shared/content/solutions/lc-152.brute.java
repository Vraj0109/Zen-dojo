class Solution {
    public int maxProduct(int[] nums) {
        int n = nums.length;
        int best = nums[0];
        for (int i = 0; i < n; i++) {
            long prod = 1;
            for (int j = i; j < n; j++) {
                prod *= nums[j];
                if (prod > best) best = (int) prod;
                if (prod > 1e14 || prod < -1e14) break;
            }
        }
        return best;
    }
}
