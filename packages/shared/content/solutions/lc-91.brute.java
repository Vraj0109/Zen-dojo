class Solution {
    private int dfs(String s, int i) {
        if (i == s.length()) return 1;
        if (s.charAt(i) == '0') return 0;
        int ways = dfs(s, i + 1);
        if (i + 1 < s.length()) {
            int two = (s.charAt(i) - '0') * 10 + (s.charAt(i + 1) - '0');
            if (two >= 10 && two <= 26) {
                ways += dfs(s, i + 2);
            }
        }
        return ways;
    }

    public int numDecodings(String s) {
        if (s.isEmpty()) return 0;
        return dfs(s, 0);
    }
}
