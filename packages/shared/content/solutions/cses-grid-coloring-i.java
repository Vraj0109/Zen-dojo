class Solution {
    public String[] gridColoring(String[] grid) {
        int r = grid.length, c = grid[0].length();
        char[][] out = new char[r][c];
        for (int i = 0; i < r; i++) {
            for (int j = 0; j < c; j++) {
                for (char ch = 'A'; ch <= 'D'; ch++) {
                    if (ch == grid[i].charAt(j)) continue;
                    if (j > 0 && out[i][j - 1] == ch) continue;
                    if (i > 0 && out[i - 1][j] == ch) continue;
                    out[i][j] = ch;
                    break;
                }
            }
        }
        String[] res = new String[r];
        for (int i = 0; i < r; i++) res[i] = new String(out[i]);
        return res;
    }
}
