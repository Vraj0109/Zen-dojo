class Solution {
    public int numDecodings(String s) {
        int n = s.length();
        long prev2 = 1, prev1 = (s.charAt(0) == '0') ? 0 : 1;
        for (int i = 2; i <= n; i++) {
            long cur = 0;
            if (s.charAt(i - 1) != '0') cur += prev1;
            int two = (s.charAt(i - 2) - '0') * 10 + (s.charAt(i - 1) - '0');
            if (two >= 10 && two <= 26) cur += prev2;
            prev2 = prev1;
            prev1 = cur;
        }
        return (int) prev1;
    }
}