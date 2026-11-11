class Solution {
    public String longestPalindrome(String s) {
        if (s == null || s.isEmpty()) return "";
        StringBuilder sb = new StringBuilder("^");
        for (int i = 0; i < s.length(); i++) {
            sb.append('#');
            sb.append(s.charAt(i));
        }
        sb.append("#$");
        String t = sb.toString();

        int m = t.length();
        int[] p = new int[m];
        int c = 0, r = 0;
        int maxLen = 0, centerIndex = 0;

        for (int i = 1; i < m - 1; i++) {
            int iMirror = 2 * c - i;
            if (r > i) p[i] = Math.min(r - i, p[iMirror]);
            while (t.charAt(i + 1 + p[i]) == t.charAt(i - 1 - p[i])) p[i]++;
            if (i + p[i] > r) {
                c = i;
                r = i + p[i];
            }
            if (p[i] > maxLen) {
                maxLen = p[i];
                centerIndex = i;
            }
        }

        int start = (centerIndex - maxLen) / 2;
        return s.substring(start, start + maxLen);
    }
}
