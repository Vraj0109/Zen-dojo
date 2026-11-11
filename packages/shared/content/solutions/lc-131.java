import java.util.*;

class Solution {
    private String s;
    private boolean[][] pal;
    private List<String[]> out;
    private List<String> cur;
    private void go(int start) {
        if (start == s.length()) {
            out.add(cur.toArray(new String[cur.size()]));
            return;
        }
        for (int end = start; end < s.length(); end++) {
            if (!pal[start][end]) continue;
            cur.add(s.substring(start, end + 1));
            go(end + 1);
            cur.remove(cur.size() - 1);
        }
    }
    public String[][] partition(String str) {
        s = str;
        int n = s.length();
        pal = new boolean[n][n];
        for (int i = n - 1; i >= 0; i--) {
            for (int j = i; j < n; j++) {
                pal[i][j] = (s.charAt(i) == s.charAt(j)) && (j - i < 2 || pal[i + 1][j - 1]);
            }
        }
        out = new ArrayList<>();
        cur = new ArrayList<>();
        go(0);
        return out.toArray(new String[out.size()][]);
    }
}