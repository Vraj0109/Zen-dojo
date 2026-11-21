import java.util.*;

class Solution {
    public int[] calculateSpans(int[] prices) {
        int n = prices.length;
        int[] res = new int[n];
        for (int i = 0; i < n; i++) {
            int span = 0;
            for (int j = i; j >= 0; j--) {
                if (prices[j] <= prices[i]) span++;
                else break;
            }
            res[i] = span;
        }
        return res;
    }
}
