import java.util.ArrayList;
import java.util.List;

class Solution {
    public long[] prefixSumQueries(int[] arr, int[][] queries) {
        int[] a = arr.clone();
        List<Long> ansList = new ArrayList<>();
        for (int[] q : queries) {
            if (q[0] == 1) {
                int k = q[1] - 1;
                int u = q[2];
                a[k] = u;
            } else {
                int l = q[1] - 1;
                int r = q[2] - 1;
                long cur = 0, maxPref = 0;
                for (int i = l; i <= r; i++) {
                    cur += a[i];
                    if (cur > maxPref) maxPref = cur;
                }
                ansList.add(maxPref);
            }
        }
        long[] ans = new long[ansList.size()];
        for (int i = 0; i < ansList.size(); i++) ans[i] = ansList.get(i);
        return ans;
    }
}
