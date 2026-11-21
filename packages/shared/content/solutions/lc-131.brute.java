import java.util.*;

class Solution {
    private boolean isPalindrome(String str, int l, int r) {
        while (l < r) {
            if (str.charAt(l++) != str.charAt(r--)) return false;
        }
        return true;
    }

    private void backtrack(String s, int start, List<String> cur, List<String[]> res) {
        if (start == s.length()) {
            res.add(cur.toArray(new String[0]));
            return;
        }
        for (int end = start; end < s.length(); end++) {
            if (isPalindrome(s, start, end)) {
                cur.add(s.substring(start, end + 1));
                backtrack(s, end + 1, cur, res);
                cur.remove(cur.size() - 1);
            }
        }
    }

    public String[][] partition(String s) {
        List<String[]> res = new ArrayList<>();
        backtrack(s, 0, new ArrayList<>(), res);
        return res.toArray(new String[0][]);
    }
}
