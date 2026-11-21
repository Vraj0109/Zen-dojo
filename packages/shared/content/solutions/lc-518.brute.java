class Solution {
    private int dfs(int amount, int[] coins, int idx) {
        if (amount == 0) return 1;
        if (amount < 0 || idx >= coins.length) return 0;
        return dfs(amount - coins[idx], coins, idx) + dfs(amount, coins, idx + 1);
    }

    public int change(int amount, int[] coins) {
        return dfs(amount, coins, 0);
    }
}
