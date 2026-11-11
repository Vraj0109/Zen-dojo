import java.util.*;

class Solution {
    public int[] companyQueriesI(int n, int[] bosses, int[][] queries) {
        int[] par = new int[n + 1];
        for (int i = 0; i + 1 < n; i++) par[i + 2] = bosses[i];
        int LOG = 1;
        while ((1 << LOG) <= n) LOG++;
        int[][] up = new int[LOG][n + 1];
        for (int v = 1; v <= n; v++) up[0][v] = par[v];
        for (int j = 1; j < LOG; j++) {
            for (int v = 1; v <= n; v++) {
                up[j][v] = up[j - 1][up[j - 1][v]];
            }
        }
        int[] ans = new int[queries.length];
        for (int i = 0; i < queries.length; i++) {
            int v = queries[i][0];
            long k = queries[i][1];
            for (int j = 0; j < LOG && v != 0; j++) {
                if (((k >> j) & 1) != 0) v = up[j][v];
            }
            if ((k >> LOG) != 0) v = 0;
            ans[i] = (v == 0 ? -1 : v);
        }
        return ans;
    }
}
