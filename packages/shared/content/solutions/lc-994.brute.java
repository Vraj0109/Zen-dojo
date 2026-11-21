class Solution {
    public int orangesRotting(int[][] grid) {
        int r = grid.length, c = grid[0].length;
        int minutes = 0;
        int[] dx = {1, -1, 0, 0};
        int[] dy = {0, 0, 1, -1};
        while (true) {
            boolean rottedAny = false;
            int[][] nextGrid = new int[r][c];
            for (int i = 0; i < r; i++) {
                for (int j = 0; j < c; j++) nextGrid[i][j] = grid[i][j];
            }
            for (int i = 0; i < r; i++) {
                for (int j = 0; j < c; j++) {
                    if (grid[i][j] == 1) {
                        boolean touchesRotten = false;
                        for (int d = 0; d < 4; d++) {
                            int ni = i + dx[d], nj = j + dy[d];
                            if (ni >= 0 && ni < r && nj >= 0 && nj < c && grid[ni][nj] == 2) {
                                touchesRotten = true;
                                break;
                            }
                        }
                        if (touchesRotten) {
                            nextGrid[i][j] = 2;
                            rottedAny = true;
                        }
                    }
                }
            }
            if (!rottedAny) break;
            grid = nextGrid;
            minutes++;
        }
        for (int i = 0; i < r; i++) {
            for (int j = 0; j < c; j++) {
                if (grid[i][j] == 1) return -1;
            }
        }
        return minutes;
    }
}
