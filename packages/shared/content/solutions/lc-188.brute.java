class Solution {
    private int dfs(int day, int k, boolean holding, int[] prices) {
        if (day == prices.length || (k == 0 && !holding)) {
            return 0;
        }

        int res = dfs(day + 1, k, holding, prices);

        if (holding) {
            res = Math.max(res, prices[day] + dfs(day + 1, k, false, prices));
        } else if (k > 0) {
            res = Math.max(res, -prices[day] + dfs(day + 1, k - 1, true, prices));
        }
        return res;
    }

    public int maxProfit(int k, int[] prices) {
        return dfs(0, k, false, prices);
    }
}
