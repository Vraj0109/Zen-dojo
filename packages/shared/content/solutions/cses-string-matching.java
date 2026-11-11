class Solution {
    public int stringMatching(String s, String pattern) {
        int n = s.length(), m = pattern.length();
        if (m == 0 || n < m) return 0;
        int[] pi = new int[m];
        for (int i = 1, j = 0; i < m; i++) {
            while (j > 0 && pattern.charAt(i) != pattern.charAt(j)) j = pi[j - 1];
            if (pattern.charAt(i) == pattern.charAt(j)) j++;
            pi[i] = j;
        }
        int count = 0;
        for (int i = 0, j = 0; i < n; i++) {
            while (j > 0 && s.charAt(i) != pattern.charAt(j)) j = pi[j - 1];
            if (s.charAt(i) == pattern.charAt(j)) j++;
            if (j == m) {
                count++;
                j = pi[j - 1];
            }
        }
        return count;
    }
}
