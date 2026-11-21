import java.util.ArrayList;
import java.util.List;

class Solution {
    public int[] forestQueriesII(String[] forest, int[][] queries) {
        int n = forest.length;
        char[][] g = new char[n][];
        for (int i = 0; i < n; i++) g[i] = forest[i].toCharArray();
        List<Integer> ansList = new ArrayList<>();
        for (int[] q : queries) {
            if (q[0] == 1) {
                int y = q[1] - 1, x = q[2] - 1;
                g[y][x] = (g[y][x] == '*') ? '.' : '*';
            } else {
                int y1 = q[1] - 1, x1 = q[2] - 1;
                int y2 = q[3] - 1, x2 = q[4] - 1;
                int count = 0;
                for (int r = y1; r <= y2; r++) {
                    for (int c = x1; c <= x2; c++) {
                        if (g[r][c] == '*') count++;
                    }
                }
                ansList.add(count);
            }
        }
        int[] ans = new int[ansList.size()];
        for (int i = 0; i < ansList.size(); i++) ans[i] = ansList.get(i);
        return ans;
    }
}
