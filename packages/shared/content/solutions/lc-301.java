import java.util.*;

class Solution {
    private List<String> res = new ArrayList<>();

    private void dfs(String s, int idx, int open, int remL, int remR, StringBuilder cur) {
        if (idx == s.length()) {
            if (open == 0 && remL == 0 && remR == 0) res.add(cur.toString());
            return;
        }
        char c = s.charAt(idx);
        // Option 1: remove parenthesis if needed
        if (c == '(' && remL > 0) {
            int j = idx;
            while (j < s.length() && s.charAt(j) == '(') j++;
            int count = j - idx;
            for (int k = 1; k <= Math.min(remL, count); k++) {
                dfs(s, idx + k, open, remL - k, remR, cur);
            }
        }
        if (c == ')' && remR > 0) {
            int j = idx;
            while (j < s.length() && s.charAt(j) == ')') j++;
            int count = j - idx;
            for (int k = 1; k <= Math.min(remR, count); k++) {
                dfs(s, idx + k, open, remL, remR - k, cur);
            }
        }
        // Option 2: keep character
        cur.append(c);
        if (c == '(') {
            dfs(s, idx + 1, open + 1, remL, remR, cur);
        } else if (c == ')') {
            if (open > 0) dfs(s, idx + 1, open - 1, remL, remR, cur);
        } else {
            dfs(s, idx + 1, open, remL, remR, cur);
        }
        cur.deleteCharAt(cur.length() - 1);
    }

    public String[] removeInvalidParentheses(String s) {
        int remL = 0, remR = 0;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '(') remL++;
            else if (c == ')') {
                if (remL > 0) remL--;
                else remR++;
            }
        }
        res.clear();
        dfs(s, 0, 0, remL, remR, new StringBuilder());
        TreeSet<String> unique = new TreeSet<>(res);
        if (unique.isEmpty()) return new String[]{""};
        return unique.toArray(new String[0]);
    }
}
