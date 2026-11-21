import java.util.ArrayList;
import java.util.List;

class Solution {
    public long[] rangeUpdateQueries(int[] arr, int[][] queries) {
        long[] a = new long[arr.length];
        for (int i = 0; i < arr.length; i++) a[i] = arr[i];
        List<Long> ansList = new ArrayList<>();
        for (int[] q : queries) {
            if (q[0] == 1) {
                int l = q[1] - 1;
                int r = q[2] - 1;
                long u = q[3];
                for (int i = l; i <= r; i++) {
                    a[i] += u;
                }
            } else {
                int k = q[1] - 1;
                ansList.add(a[k]);
            }
        }
        long[] ans = new long[ansList.size()];
        for (int i = 0; i < ansList.size(); i++) ans[i] = ansList.get(i);
        return ans;
    }
}
