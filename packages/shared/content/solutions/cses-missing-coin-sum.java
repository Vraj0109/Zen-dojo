import java.util.*;

class Solution {
    public long missingCoinSum(int[] coins) {
        Arrays.sort(coins);
        long reach = 1;
        for (int c : coins) {
            if (c > reach) break;
            reach += c;
        }
        return reach;
    }
}
