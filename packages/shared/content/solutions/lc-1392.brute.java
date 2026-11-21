class Solution {
    public String longestPrefix(String s) {
        int n = s.length();
        for (int len = n - 1; len >= 1; len--) {
            if (s.startsWith(s.substring(n - len))) {
                return s.substring(0, len);
            }
        }
        return "";
    }
}
