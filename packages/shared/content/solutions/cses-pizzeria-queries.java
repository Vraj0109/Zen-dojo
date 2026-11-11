import java.util.*;

class Solution {
    private static final long INF = Long.MAX_VALUE / 4;
    private int n;
    private void setv(long[] t, int p, long v) {
        p += n;
        t[p] = v;
        for (p >>= 1; p >= 1; p >>= 1) {
            t[p] = Math.min(t[2 * p], t[2 * p + 1]);
        }
    }
    private long get(long[] t, int l, int r) {
        long res = INF;
        for (l += n, r += n; l < r; l >>= 1, r >>= 1) {
            if ((l & 1) == 1) res = Math.min(res, t[l++]);
            if ((r & 1) == 1) res = Math.min(res, t[--r]);
        }
        return res;
    }
    public int[] pizzeriaQueries(int[] prices, int[][] queries) {
        n = prices.length;
        long[] A = new long[2 * n];
        long[] B = new long[2 * n];
        Arrays.fill(A, INF);
        Arrays.fill(B, INF);
        for (int i = 0; i < n; i++) {
            A[n + i] = (long) prices[i] - (i + 1);
            B[n + i] = (long) prices[i] + (i + 1);
        }
        for (int i = n - 1; i >= 1; i--) {
            A[i] = Math.min(A[2 * i], A[2 * i + 1]);
            B[i] = Math.min(B[2 * i], B[2 * i + 1]);
        }
        List<Integer> ans = new ArrayList<>();
        for (int[] q : queries) {
            if (q[0] == 1) {
                int k = q[1];
                long x = q[2];
                setv(A, k - 1, x - k);
                setv(B, k - 1, x + k);
            } else {
                int k = q[1];
                long left = get(A, 0, k) + k;
                long right = get(B, k - 1, n) - k;
                ans.add((int) Math.min(left, right));
            }
        }
        int[] res = new int[ans.size()];
        for (int i = 0; i < ans.size(); i++) res[i] = ans.get(i);
        return res;
    }
}
