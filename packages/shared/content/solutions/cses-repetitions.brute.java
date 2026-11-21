class Solution {
    public int repetitions(String s) {
        int n = s.length();
        int best = 0;
        for (int i = 0; i < n; i++) {
            for (int j = i; j < n; j++) {
                boolean allSame = true;
                for (int k = i; k <= j; k++) {
                    if (s.charAt(k) != s.charAt(i)) {
                        allSame = false;
                        break;
                    }
                }
                if (allSame) {
                    best = Math.max(best, j - i + 1);
                }
            }
        }
        return best;
    }
}
