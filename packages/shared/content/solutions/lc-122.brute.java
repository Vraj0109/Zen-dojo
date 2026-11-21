class Solution {
    private int dfs(int[] prices, int i, boolean holding) {
        if (i >= prices.length) return 0;
        int best = dfs(prices, i + 1, holding);
        if (holding) {
            best = Math.max(best, prices[i] + dfs(prices, i + 1, false));
        } else {
            best = Math.max(best, -prices[i] + dfs(prices, i + 1, true));
        }
        return best;
    }

    public int maxProfit(int[] prices) {
        return dfs(prices, 0, false);
    }
}
