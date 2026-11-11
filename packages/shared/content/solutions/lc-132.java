class Solution {
    public int minCut(String s) {
        int n = s.length();
        boolean[][] pal = new boolean[n][n];
        for (int i = n - 1; i >= 0; i--) {
            for (int j = i; j < n; j++) {
                pal[i][j] = (s.charAt(i) == s.charAt(j)) && (j - i < 2 || pal[i + 1][j - 1]);
            }
        }
        int[] cut = new int[n];
        for (int j = 0; j < n; j++) {
            if (pal[0][j]) {
                cut[j] = 0;
                continue;
            }
            cut[j] = j;
            for (int i = 1; i <= j; i++) {
                if (pal[i][j]) cut[j] = Math.min(cut[j], cut[i - 1] + 1);
            }
        }
        return cut[n - 1];
    }
}