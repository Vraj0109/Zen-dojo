import java.util.*;

class Solution {
    public int[] kthAncestor(int n, int[] parent, int[][] queries) {
        int LOG = 17;
        int[][] up = new int[n][LOG];
        for (int i = 0; i < n; i++) Arrays.fill(up[i], -1);
        for (int i = 0; i < n; i++) up[i][0] = parent[i];
        for (int j = 1; j < LOG; j++) {
            for (int i = 0; i < n; i++) {
                if (up[i][j - 1] != -1) {
                    up[i][j] = up[up[i][j - 1]][j - 1];
                }
            }
        }

        int[] res = new int[queries.length];
        for (int q = 0; q < queries.length; q++) {
            int node = queries[q][0], k = queries[q][1];
            for (int j = 0; j < LOG; j++) {
                if (((k >> j) & 1) == 1) {
                    node = up[node][j];
                    if (node == -1) break;
                }
            }
            res[q] = node;
        }
        return res;
    }
}
