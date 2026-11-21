import java.util.*;

public class Solution {
    private int n;
    private final int[] dr = {1, -1, 0, 0};
    private final int[] dc = {0, 0, 1, -1};

    private void dfs(int[][] g, int r, int c, List<int[]> island) {
        if (r < 0 || r >= n || c < 0 || c >= n || g[r][c] != 1) return;
        g[r][c] = 2;
        island.add(new int[]{r, c});
        for (int i = 0; i < 4; i++) {
            dfs(g, r + dr[i], c + dc[i], island);
        }
    }

    public int shortestBridge(int[][] grid) {
        n = grid.length;
        List<int[]> island1 = new ArrayList<>();
        List<int[]> island2 = new ArrayList<>();
        boolean foundFirst = false;

        for (int r = 0; r < n; r++) {
            for (int c = 0; c < n; c++) {
                if (grid[r][c] == 1) {
                    if (!foundFirst) {
                        dfs(grid, r, c, island1);
                        foundFirst = true;
                    } else {
                        dfs(grid, r, c, island2);
                    }
                }
            }
        }

        int ans = Integer.MAX_VALUE;
        for (int[] p1 : island1) {
            for (int[] p2 : island2) {
                ans = Math.min(ans, Math.abs(p1[0] - p2[0]) + Math.abs(p1[1] - p2[1]) - 1);
            }
        }
        return ans;
    }
}
