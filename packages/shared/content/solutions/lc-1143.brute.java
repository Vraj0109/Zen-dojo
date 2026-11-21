class Solution {
    private int dfs(String s1, String s2, int i, int j) {
        if (i == s1.length() || j == s2.length()) return 0;
        if (s1.charAt(i) == s2.charAt(j)) return 1 + dfs(s1, s2, i + 1, j + 1);
        return Math.max(dfs(s1, s2, i + 1, j), dfs(s1, s2, i, j + 1));
    }

    public int longestCommonSubsequence(String text1, String text2) {
        return dfs(text1, text2, 0, 0);
    }
}
