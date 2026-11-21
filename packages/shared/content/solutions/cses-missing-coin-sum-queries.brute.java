import java.util.Arrays;

class Solution {
    public long[] missingCoinSumQueries(int[] coins, int[][] queries) {
        long[] ans = new long[queries.length];
        for (int q = 0; q < queries.length; q++) {
            int a = queries[q][0] - 1;
            int b = queries[q][1] - 1;
            int len = b - a + 1;
            long[] sub = new long[len];
            for (int i = 0; i < len; i++) sub[i] = coins[a + i];
            Arrays.sort(sub);
            long s = 0;
            for (long c : sub) {
                if (c > s + 1) break;
                s += c;
            }
            ans[q] = s + 1;
        }
        return ans;
    }
}
