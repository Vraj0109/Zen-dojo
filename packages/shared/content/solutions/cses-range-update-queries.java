import java.util.*;

class Solution {
    private int n;
    private long[] bit;

    private void add(int i, long v) {
        for (; i <= n; i += i & -i) bit[i] += v;
    }

    private long pref(int i) {
        long s = 0;
        for (; i > 0; i -= i & -i) s += bit[i];
        return s;
    }

    public long[] rangeUpdateQueries(int[] arr, int[][] queries) {
        n = arr.length;
        bit = new long[n + 2];
        List<Long> ans = new ArrayList<>();
        for (int[] q : queries) {
            if (q[0] == 1) {
                add(q[1], q[3]);
                if (q[2] + 1 <= n) add(q[2] + 1, -(long) q[3]);
            } else {
                ans.add((long) arr[q[1] - 1] + pref(q[1]));
            }
        }
        long[] out = new long[ans.size()];
        for (int i = 0; i < ans.size(); i++) out[i] = ans.get(i);
        return out;
    }
}
