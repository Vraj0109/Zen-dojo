class Solution {
    public int[] dynamicRangeMinimumQueries(int[] arr, int[][] queries) {
        int n = arr.length;
        int[] t = new int[2 * n];
        for (int i = 0; i < n; i++) t[n + i] = arr[i];
        for (int i = n - 1; i >= 1; i--) t[i] = Math.min(t[2 * i], t[2 * i + 1]);

        int qCount = 0;
        for (int[] q : queries) if (q[0] == 2) qCount++;
        int[] ans = new int[qCount];
        int ansIdx = 0;

        for (int[] q : queries) {
            if (q[0] == 1) {
                int p = q[1] - 1 + n;
                t[p] = q[2];
                for (p >>= 1; p >= 1; p >>= 1) t[p] = Math.min(t[2 * p], t[2 * p + 1]);
            } else {
                int l = q[1] - 1 + n, r = q[2] + n;
                int res = Integer.MAX_VALUE;
                for (; l < r; l >>= 1, r >>= 1) {
                    if ((l & 1) == 1) res = Math.min(res, t[l++]);
                    if ((r & 1) == 1) res = Math.min(res, t[--r]);
                }
                ans[ansIdx++] = res;
            }
        }
        return ans;
    }
}
