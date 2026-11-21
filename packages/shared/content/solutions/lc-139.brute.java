import java.util.*;

class Solution {
    private boolean check(String s, int idx, Set<String> dict) {
        if (idx == s.length()) return true;
        for (int end = idx + 1; end <= s.length(); end++) {
            if (dict.contains(s.substring(idx, end))) {
                if (check(s, end, dict)) return true;
            }
        }
        return false;
    }

    public boolean wordBreak(String s, String[] wordDict) {
        Set<String> dict = new HashSet<>(Arrays.asList(wordDict));
        return check(s, 0, dict);
    }
}
