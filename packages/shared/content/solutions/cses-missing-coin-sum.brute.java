import java.util.Arrays;

class Solution {
    public long missingCoinSum(int[] coins) {
        Arrays.sort(coins);
        long reach = 0;
        for (int c : coins) {
            if (c > reach + 1) break;
            reach += c;
        }
        return reach + 1;
    }
}
