class Solution {
    public int stringMatching(String s, String pattern) {
        int n = s.length();
        int m = pattern.length();
        if (m == 0 || n < m) return 0;
        int count = 0;
        for (int i = 0; i <= n - m; i++) {
            boolean ok = true;
            for (int j = 0; j < m; j++) {
                if (s.charAt(i + j) != pattern.charAt(j)) {
                    ok = false;
                    break;
                }
            }
            if (ok) count++;
        }
        return count;
    }
}
