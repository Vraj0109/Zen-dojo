import java.util.*;

class Solution {
    private List<String> res = new ArrayList<>();

    private void dfs(int open, int close, int n, StringBuilder cur) {
        if (cur.length() == 2 * n) {
            res.add(cur.toString());
            return;
        }
        if (open < n) {
            cur.append('(');
            dfs(open + 1, close, n, cur);
            cur.deleteCharAt(cur.length() - 1);
        }
        if (close < open) {
            cur.append(')');
            dfs(open, close + 1, n, cur);
            cur.deleteCharAt(cur.length() - 1);
        }
    }

    public String[] generateParenthesis(int n) {
        res.clear();
        dfs(0, 0, n, new StringBuilder());
        return res.toArray(new String[0]);
    }
}
