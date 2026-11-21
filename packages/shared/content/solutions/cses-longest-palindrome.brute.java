import java.util.*;

public class Solution {
    private int maxLen = 0;
    private int bestStart = 0;

    private void expand(String s, int l, int r, int n) {
        while (l >= 0 && r < n && s.charAt(l) == s.charAt(r)) {
            l--;
            r++;
        }
        int len = r - l - 1;
        if (len > maxLen) {
            maxLen = len;
            bestStart = l + 1;
        }
    }

    public String longestPalindrome(String s) {
        int n = s.length();
        if (n <= 1) return s;
        maxLen = 0;
        bestStart = 0;

        for (int i = 0; i < n; i++) {
            expand(s, i, i, n);
            expand(s, i, i + 1, n);
        }
        return s.substring(bestStart, bestStart + maxLen);
    }
}
