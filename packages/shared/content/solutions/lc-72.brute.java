class Solution {
    private int dfs(String s1, String s2, int i, int j) {
        if (i == 0) return j;
        if (j == 0) return i;
        if (s1.charAt(i - 1) == s2.charAt(j - 1)) return dfs(s1, s2, i - 1, j - 1);
        int replaceOp = dfs(s1, s2, i - 1, j - 1);
        int deleteOp = dfs(s1, s2, i - 1, j);
        int insertOp = dfs(s1, s2, i, j - 1);
        return 1 + Math.min(replaceOp, Math.min(deleteOp, insertOp));
    }

    public int minDistance(String word1, String word2) {
        return dfs(word1, word2, word1.length(), word2.length());
    }
}
