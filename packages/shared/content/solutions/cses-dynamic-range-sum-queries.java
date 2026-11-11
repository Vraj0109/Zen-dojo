import java.util.*;

class Solution {
    private int n;
    private long[] bit;

    private void add(int idx, long val) {
        for (; idx <= n; idx += idx & -idx) bit[idx] += val;
    }

    private long query(int idx) {
        long s = 0;
        for (; idx > 0; idx -= idx & -idx) s += bit[idx];
        return s;
    }

    public long[] dynamicRangeSumQueries(int[] arr, int[][] queries) {
        n = arr.length;
        bit = new long[n + 1];
        long[] a = new long[n];
        for (int i = 0; i < n; i++) {
            a[i] = arr[i];
            add(i + 1, a[i]);
        }
        List<Long> ans = new ArrayList<>();
        for (int[] q : queries) {
            if (q[0] == 1) {
                int k = q[1];
                long u = q[2];
                long delta = u - a[k - 1];
                a[k - 1] = u;
                add(k, delta);
            } else if (q[0] == 2) {
                int l = q[1], r = q[2];
                ans.add(query(r) - query(l - 1));
            }
        }
        long[] out = new long[ans.size()];
        for (int i = 0; i < ans.size(); i++) out[i] = ans.get(i);
        return out;
    }
}
