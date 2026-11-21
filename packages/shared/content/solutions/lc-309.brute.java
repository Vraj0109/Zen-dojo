class Solution {
    private int dfs(int[] prices, int i, int state) {
        if (i >= prices.length) return 0;
        int ans = 0;
        if (state == 0) {
            ans = Math.max(dfs(prices, i + 1, 0), -prices[i] + dfs(prices, i + 1, 1));
        } else if (state == 1) {
            ans = Math.max(dfs(prices, i + 1, 1), prices[i] + dfs(prices, i + 1, 2));
        } else if (state == 2) {
            ans = dfs(prices, i + 1, 0);
        }
        return ans;
    }

    public int maxProfit(int[] prices) {
        return dfs(prices, 0, 0);
    }
}
