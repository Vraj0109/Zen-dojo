class Solution {
    public int longestNonDecreasingRun(int[] a) {
        int n = a.length;
        int maxLen = 0;
        for (int i = 0; i < n; i++) {
            for (int j = i; j < n; j++) {
                boolean ok = true;
                for (int k = i; k < j; k++) {
                    if (a[k] > a[k + 1]) {
                        ok = false;
                        break;
                    }
                }
                if (ok) {
                    maxLen = Math.max(maxLen, j - i + 1);
                }
            }
        }
        return maxLen;
    }
}
