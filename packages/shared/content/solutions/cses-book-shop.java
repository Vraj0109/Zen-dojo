class Solution {
    public int bookShop(int[] prices, int[] pages, int maxPrice) {
        int[] dp = new int[maxPrice + 1];
        int n = prices.length;
        for (int i = 0; i < n; i++) {
            int p = prices[i], pg = pages[i];
            for (int j = maxPrice; j >= p; j--) {
                dp[j] = Math.max(dp[j], dp[j - p] + pg);
            }
        }
        return dp[maxPrice];
    }
}
