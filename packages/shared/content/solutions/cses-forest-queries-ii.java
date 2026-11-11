import java.util.*;

class Solution {
    private int n;
    private int[][] t;
    private void upd(int y, int x, int v) {
        for (int i = y; i <= n; i += i & -i)
            for (int j = x; j <= n; j += j & -j)
                t[i][j] += v;
    }
    private int pre(int y, int x) {
        int s = 0;
        for (int i = y; i > 0; i -= i & -i)
            for (int j = x; j > 0; j -= j & -j)
                s += t[i][j];
        return s;
    }
    public int[] forestQueriesII(String[] forest, int[][] queries) {
        n = forest.length;
        t = new int[n + 1][n + 1];
        boolean[][] g = new boolean[n + 1][n + 1];
        for (int i = 1; i <= n; i++) {
            for (int j = 1; j <= n; j++) {
                g[i][j] = forest[i - 1].charAt(j - 1) == '*';
                t[i][j] = g[i][j] ? 1 : 0;
            }
        }
        for (int i = 1; i <= n; i++)
            for (int j = 1; j <= n; j++) {
                int jj = j + (j & -j);
                if (jj <= n) t[i][jj] += t[i][j];
            }
        for (int i = 1; i <= n; i++) {
            int ii = i + (i & -i);
            if (ii <= n)
                for (int j = 1; j <= n; j++) t[ii][j] += t[i][j];
        }
        List<Integer> ans = new ArrayList<>();
        for (int[] q : queries) {
            if (q[0] == 1) {
                int y = q[1], x = q[2];
                upd(y, x, g[y][x] ? -1 : 1);
                g[y][x] = !g[y][x];
            } else {
                int y1 = q[1], x1 = q[2], y2 = q[3], x2 = q[4];
                ans.add(pre(y2, x2) - pre(y1 - 1, x2) - pre(y2, x1 - 1) + pre(y1 - 1, x1 - 1));
            }
        }
        int[] res = new int[ans.size()];
        for (int i = 0; i < ans.size(); i++) res[i] = ans.get(i);
        return res;
    }
}
