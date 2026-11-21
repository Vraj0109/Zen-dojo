class Solution {
    private boolean dfs(int i, int j, String s, String p) {
        if (j == p.length()) {
            return i == s.length();
        }
        if (i == s.length()) {
            for (int k = j; k < p.length(); k++) {
                if (p.charAt(k) != '*') return false;
            }
            return true;
        }

        if (p.charAt(j) == '*') {
            return dfs(i, j + 1, s, p) || dfs(i + 1, j, s, p);
        } else if (p.charAt(j) == '?' || p.charAt(j) == s.charAt(i)) {
            return dfs(i + 1, j + 1, s, p);
        }
        return false;
    }

    public boolean isMatch(String s, String p) {
        return dfs(0, 0, s, p);
    }
}
