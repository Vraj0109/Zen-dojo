import java.util.*;

class Solution {
    public int[] kthAncestor(int n, int[] parent, int[][] queries) {
        int[] res = new int[queries.length];
        for (int i = 0; i < queries.length; i++) {
            int node = queries[i][0];
            int k = queries[i][1];
            while (k > 0 && node != -1) {
                node = parent[node];
                k--;
            }
            res[i] = node;
        }
        return res;
    }
}
