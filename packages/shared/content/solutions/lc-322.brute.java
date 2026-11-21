class Solution {
    private int dfs(int[] coins, int amount) {
        if (amount == 0) return 0;
        if (amount < 0) return -1;
        int minCoins = -1;
        for (int c : coins) {
            int sub = dfs(coins, amount - c);
            if (sub >= 0) {
                if (minCoins == -1 || sub + 1 < minCoins) {
                    minCoins = sub + 1;
                }
            }
        }
        return minCoins;
    }

    public int coinChange(int[] coins, int amount) {
        return dfs(coins, amount);
    }
}
