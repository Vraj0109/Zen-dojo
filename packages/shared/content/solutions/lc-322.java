import java.util.*;

class Solution {
    public int coinChange(int[] coins, int amount) {
        int[] fewest = new int[amount + 1];
        Arrays.fill(fewest, amount + 1);
        fewest[0] = 0;
        for (int a = 1; a <= amount; a++) {
            for (int c : coins) {
                if (c <= a) {
                    fewest[a] = Math.min(fewest[a], fewest[a - c] + 1);
                }
            }
        }
        return fewest[amount] > amount ? -1 : fewest[amount];
    }
}