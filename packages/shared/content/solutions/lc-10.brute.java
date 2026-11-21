class Solution {
    private boolean dfs(int i, int j, String s, String p) {
        if (j == p.length()) {
            return i == s.length();
        }

        boolean firstMatch = (i < s.length() && (p.charAt(j) == s.charAt(i) || p.charAt(j) == '.'));

        if (j + 1 < p.length() && p.charAt(j + 1) == '*') {
            return dfs(i, j + 2, s, p) || (firstMatch && dfs(i + 1, j, s, p));
        } else {
            return firstMatch && dfs(i + 1, j + 1, s, p);
        }
    }

    public boolean isMatch(String s, String p) {
        return dfs(0, 0, s, p);
    }
}
