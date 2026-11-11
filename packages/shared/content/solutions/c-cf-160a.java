import java.util.Arrays;

class Solution {
    public int twinsCoins(int[] coins) {
        Arrays.sort(coins);
        int total = 0;
        for (int c : coins) total += c;
        int mine = 0, count = 0;
        for (int i = coins.length - 1; i >= 0; i--) {
            mine += coins[i];
            count++;
            if (2 * mine > total) break;
        }
        return count;
    }
}
