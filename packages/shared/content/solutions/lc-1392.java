class Solution {
    public String longestPrefix(String s) {
        int n = s.length();
        int[] pi = new int[n];
        for (int i = 1; i < n; i++) {
            int k = pi[i - 1];
            while (k > 0 && s.charAt(i) != s.charAt(k)) k = pi[k - 1];
            if (s.charAt(i) == s.charAt(k)) k++;
            pi[i] = k;
        }
        return s.substring(0, pi[n - 1]);
    }
}