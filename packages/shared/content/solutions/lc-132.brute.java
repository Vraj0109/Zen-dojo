class Solution {
    private boolean isPalindrome(String s, int l, int r) {
        while (l < r) {
            if (s.charAt(l++) != s.charAt(r--)) return false;
        }
        return true;
    }

    private int backtrack(String s, int start) {
        int n = s.length();
        if (isPalindrome(s, start, n - 1)) return 0;

        int minCuts = n - start - 1;
        for (int end = start; end < n; end++) {
            if (isPalindrome(s, start, end)) {
                minCuts = Math.min(minCuts, 1 + backtrack(s, end + 1));
            }
        }
        return minCuts;
    }

    public int minCut(String s) {
        return backtrack(s, 0);
    }
}
