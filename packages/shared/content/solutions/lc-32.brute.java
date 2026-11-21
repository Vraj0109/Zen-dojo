import java.util.*;

class Solution {
    private boolean isValid(String s, int start, int end) {
        int bal = 0;
        for (int i = start; i <= end; i++) {
            if (s.charAt(i) == '(') bal++;
            else bal--;
            if (bal < 0) return false;
        }
        return bal == 0;
    }

    public int longestValidParentheses(String s) {
        int n = s.length();
        int maxLen = 0;
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j += 2) {
                if (j - i + 1 > maxLen && isValid(s, i, j)) {
                    maxLen = j - i + 1;
                }
            }
        }
        return maxLen;
    }
}
