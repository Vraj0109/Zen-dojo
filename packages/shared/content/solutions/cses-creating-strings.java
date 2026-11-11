import java.util.*;

class Solution {
    private List<String> out = new ArrayList<>();

    private void backtrack(char[] s, boolean[] used, StringBuilder cur) {
        if (cur.length() == s.length) {
            out.add(cur.toString());
            return;
        }
        for (int i = 0; i < s.length; i++) {
            if (used[i]) continue;
            if (i > 0 && s[i] == s[i - 1] && !used[i - 1]) continue;
            used[i] = true;
            cur.append(s[i]);
            backtrack(s, used, cur);
            cur.deleteCharAt(cur.length() - 1);
            used[i] = false;
        }
    }

    public String[] creatingStrings(String s) {
        char[] chars = s.toCharArray();
        Arrays.sort(chars);
        out.clear();
        boolean[] used = new boolean[chars.length];
        backtrack(chars, used, new StringBuilder());
        return out.toArray(new String[0]);
    }
}
