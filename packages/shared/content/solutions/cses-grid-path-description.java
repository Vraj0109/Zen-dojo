class Solution {
    private String d;
    private boolean[][] vis = new boolean[9][9];
    private int[] dr = {-1, 1, 0, 0};
    private int[] dc = {0, 0, -1, 1};
    private static final String NAMES = "UDLR";

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
        for (int k = 0; k < 4; k++) {
            if (d.charAt(step) != '?' && d.charAt(step) != NAMES.charAt(k)) continue;
            int nr = r + dr[k], nc = c + dc[k];
            if (freeCell(nr, nc)) total += go(step + 1, nr, nc);
        }
        vis[r][c] = false;
        return total;
    }

    public int gridPathDescription(String description) {
        d = description;
        vis = new boolean[9][9];
        return (int) go(0, 0, 0);
    }
}
