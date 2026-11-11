import java.util.*;

class Solution {
    private int lowerBound(int[] arr, int x) {
        int l = 0, r = arr.length;
        while (l < r) {
            int mid = (l + r) >>> 1;
            if (arr[mid] >= x) r = mid;
            else l = mid + 1;
        }
        return l;
    }
    public int[] movieFestivalQueries(int[][] movies, int[][] queries) {
        int m = movies.length;
        Integer[] order = new Integer[m];
        for (int i = 0; i < m; i++) order[i] = i;
        Arrays.sort(order, (a, b) -> {
            if (movies[a][0] != movies[b][0]) return Integer.compare(movies[a][0], movies[b][0]);
            return Integer.compare(movies[a][1], movies[b][1]);
        });
        int[] st = new int[m];
        int[] en = new int[m + 1];
        en[m] = Integer.MAX_VALUE;
        for (int i = 0; i < m; i++) {
            st[i] = movies[order[i]][0];
            en[i] = movies[order[i]][1];
        }
        int[] best = new int[m + 1];
        best[m] = m;
        for (int j = m - 1; j >= 0; j--) {
            best[j] = (en[j] < en[best[j + 1]]) ? j : best[j + 1];
        }
        final int LOG = 18;
        int[][] up = new int[LOG + 1][m + 1];
        for (int k = 0; k <= LOG; k++) Arrays.fill(up[k], m);
        for (int i = 0; i < m; i++) {
            int j = lowerBound(st, en[i]);
            up[0][i] = best[j];
        }
        for (int k = 1; k <= LOG; k++) {
            for (int i = 0; i <= m; i++) {
                up[k][i] = up[k - 1][up[k - 1][i]];
            }
        }
        int[] ans = new int[queries.length];
        for (int qi = 0; qi < queries.length; qi++) {
            int a = queries[qi][0], b = queries[qi][1];
            int j = lowerBound(st, a);
            int cur = best[j];
            if (cur == m || en[cur] > b) {
                ans[qi] = 0;
                continue;
            }
            int cnt = 1;
            for (int k = LOG; k >= 0; k--) {
                int nx = up[k][cur];
                if (nx != m && en[nx] <= b) {
                    cur = nx;
                    cnt += 1 << k;
                }
            }
            ans[qi] = cnt;
        }
        return ans;
    }
}
