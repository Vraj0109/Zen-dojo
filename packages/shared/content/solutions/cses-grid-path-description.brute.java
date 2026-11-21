class Solution {
    private String d;
    private boolean[][] vis = new boolean[9][9];
    private int[] dr = {-1, 1, 0, 0};
    private int[] dc = {0, 0, -1, 1};
    private char[] names = {'U', 'D', 'L', 'R'};

    private boolean freeCell(int r, int c) {
        return r >= 0 && r < 7 && c >= 0 && c < 7 && !vis[r][c];
    }

    private long go(int step, int r, int c) {
        if (r == 6 && c == 0) return step == 48 ? 1 : 0;
        if (step == 48) return 0;
        if (!freeCell(r - 1, c) && !freeCell(r + 1, c) && freeCell(r, c - 1) && freeCell(r, c + 1)) return 0;
        if (!freeCell(r, c - 1) && !freeCell(r, c + 1) && freeCell(r - 1, c) && freeCell(r + 1, c)) return 0;

        long total = 0;
        vis[r][c] = true;
        char req = d.charAt(step);
        for (int k = 0; k < 4; k++) {
            if (req != '?' && req != names[k]) continue;
            int nr = r + dr[k], nc = c + dc[k];
            if (freeCell(nr, nc)) total += go(step + 1, nr, nc);
        }
        vis[r][c] = false;
        return total;
    }

    public int gridPathDescription(String description) {
        d = description;
        for (int i = 0; i < 9; i++) {
            for (int j = 0; j < 9; j++) vis[i][j] = false;
        }
        return (int) go(0, 0, 0);
    }
}
