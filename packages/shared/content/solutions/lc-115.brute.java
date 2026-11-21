class Solution {
    private int dfs(int i, int j, String s, String t) {
        if (j == t.length()) {
            return 1;
        }
        if (i == s.length()) {
            return 0;
        }

        int ways = dfs(i + 1, j, s, t);
        if (s.charAt(i) == t.charAt(j)) {
            ways += dfs(i + 1, j + 1, s, t);
        }
        return ways;
    }

    public int numDistinct(String s, String t) {
        return dfs(0, 0, s, t);
    }
}
