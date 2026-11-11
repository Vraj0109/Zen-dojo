import java.util.*;

class Solution {
    public int maxProfit(int k, int[] prices) {
        int n = prices.length;
        if (k >= n / 2) {
            int total = 0;
            for (int i = 1; i < n; i++) if (prices[i] > prices[i - 1]) total += prices[i] - prices[i - 1];
            return total;
        }
        int[] buy = new int[k + 1];
        Arrays.fill(buy, Integer.MIN_VALUE / 2);
        int[] sell = new int[k + 1];
        for (int p : prices) {
            for (int t = 1; t <= k; t++) {
                buy[t] = Math.max(buy[t], sell[t - 1] - p);
                sell[t] = Math.max(sell[t], buy[t] + p);
            }
        }
        return sell[k];
    }
}