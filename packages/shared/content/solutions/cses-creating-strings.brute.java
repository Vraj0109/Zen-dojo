import java.util.*;

class Solution {
    public String[] creatingStrings(String s) {
        char[] chars = s.toCharArray();
        Arrays.sort(chars);
        List<String> list = new ArrayList<>();
        boolean[] used = new boolean[chars.length];
        backtrack(chars, used, new StringBuilder(), list);
        return list.toArray(new String[0]);
    }

    private void backtrack(char[] chars, boolean[] used, StringBuilder sb, List<String> list) {
        if (sb.length() == chars.length) {
            list.add(sb.toString());
            return;
        }
        for (int i = 0; i < chars.length; i++) {
            if (used[i]) continue;
            if (i > 0 && chars[i] == chars[i - 1] && !used[i - 1]) continue;
            used[i] = true;
            sb.append(chars[i]);
            backtrack(chars, used, sb, list);
            sb.deleteCharAt(sb.length() - 1);
            used[i] = false;
        }
    }
}
