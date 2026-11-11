class Solution {
    public int longestNonDecreasingRun(int[] a) {
        int best = 1, run = 1;
        for (int i = 1; i < a.length; i++) {
            run = a[i] >= a[i - 1] ? run + 1 : 1;
            best = Math.max(best, run);
        }
        return best;
    }
}
