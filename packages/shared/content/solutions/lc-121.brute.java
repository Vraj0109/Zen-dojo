class Solution {
    public int maxProfit(int[] prices) {
        int n = prices.length;
        int best = 0;
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                best = Math.max(best, prices[j] - prices[i]);
            }
        }
        return best;
    }
}
