import java.util.*;

class Solution {
    public int numIslands(String[][] grid) {
        int rows = grid.length, cols = grid[0].length, count = 0;
        int[] dr = {1, -1, 0, 0};
        int[] dc = {0, 0, 1, -1};
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (!grid[r][c].equals("1")) continue;
                count++;
                Deque<int[]> st = new ArrayDeque<>();
                st.push(new int[]{r, c});
                grid[r][c] = "0";
                while (!st.isEmpty()) {
                    int[] curr = st.pop();
                    int x = curr[0], y = curr[1];
                    for (int d = 0; d < 4; d++) {
                        int nr = x + dr[d], nc = y + dc[d];
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc].equals("1")) {
                            grid[nr][nc] = "0";
                            st.push(new int[]{nr, nc});
                        }
                    }
                }
            }
        }
        return count;
    }
}