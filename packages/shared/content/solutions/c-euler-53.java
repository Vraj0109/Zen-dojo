class Solution {
    public long countLargeBinomials(int maxN, long threshold) {
        long cap = threshold + 1;
        long[] row = new long[maxN + 2];
        row[0] = 1;
        long total = 0;
        for (int n = 1; n <= maxN; n++) {
            for (int r = n; r >= 1; r--) {
                row[r] = Math.min(cap, row[r] + row[r - 1]);
            }
            for (int r = 0; r <= n; r++) {
                if (row[r] > threshold) total++;
            }
        }
        return total;
    }
}
