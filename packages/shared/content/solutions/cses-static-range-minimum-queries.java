import java.util.*;

class Solution {
    public int[] staticRangeMinimumQueries(int[] arr, int[][] queries) {
        int n = arr.length;
        if (n == 0) return new int[0];
        int maxLog = 32 - Integer.numberOfLeadingZeros(n);
        int[][] st = new int[maxLog][n];
        for (int i = 0; i < n; i++) st[0][i] = arr[i];
        for (int k = 1; k < maxLog; k++) {
            int len = 1 << (k - 1);
            for (int i = 0; i + (1 << k) <= n; i++) {
                st[k][i] = Math.min(st[k - 1][i], st[k - 1][i + len]);
            }
        }
        int[] ans = new int[queries.length];
        for (int i = 0; i < queries.length; i++) {
            int l = queries[i][0] - 1;
            int r = queries[i][1] - 1;
            int len = r - l + 1;
            int k = 31 - Integer.numberOfLeadingZeros(len);
            ans[i] = Math.min(st[k][l], st[k][r - (1 << k) + 1]);
        }
        return ans;
    }
}
